import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import {
  fetchTransactionHistory,
  detectNetwork,
} from '@/lib/transaction-service';
import { Transaction } from '@/types/transaction';

export async function POST(request: NextRequest) {
  try {
    const { address, userId } = await request.json();

    if (!address || !userId) {
      return NextResponse.json(
        { error: 'Address and userId are required' },
        { status: 400 }
      );
    }

    console.log(
      `[SYNC TRANSACTIONS] Starting sync for user ${userId}, address ${address}`
    );

    // Verify user exists and owns this wallet (case insensitive)
    const { data: walletData, error: walletError } = await supabase
      .from('wallets')
      .select(
        `
        *,
        users (id, username)
      `
      )
      .ilike('address', address)
      .eq('user_id', userId)
      .single();

    if (walletError || !walletData) {
      return NextResponse.json(
        { error: 'Wallet not found or access denied' },
        { status: 404 }
      );
    }

    // Detect network (BSC for your case)
    const network = detectNetwork(address, walletData.network || 'BSC_MAINNET');
    console.log(`[SYNC TRANSACTIONS] Using network: ${network}`);

    // Get the latest block number from existing transactions to avoid duplicates
    const { data: latestTx } = await supabase
      .from('user_transactions')
      .select('block_number')
      .eq('user_id', userId)
      .order('block_number', { ascending: false })
      .limit(1)
      .single();

    const startBlock = latestTx ? latestTx.block_number + 1 : 0;
    console.log(`[SYNC TRANSACTIONS] Starting sync from block: ${startBlock}`);

    // Fetch transactions from blockchain (only new ones)
    let transactions, total;
    try {
      const result = await fetchTransactionHistory(
        address,
        network,
        1,
        100,
        startBlock
      );
      transactions = result.transactions;
      total = result.total;
      console.log(
        `[SYNC TRANSACTIONS] Fetched ${transactions.length} new transactions from blockchain (from block ${startBlock})`
      );

      // Early exit if no new transactions
      if (transactions.length === 0) {
        console.log(
          `[SYNC TRANSACTIONS] No new transactions found since block ${startBlock}`
        );
        return NextResponse.json({
          success: true,
          message: 'No new transactions to sync',
          stats: {
            totalTransactions: 0,
            savedTransactions: 0,
            duplicateTransactions: 0,
            errors: [],
          },
        });
      }
    } catch (fetchError) {
      if (
        fetchError instanceof Error &&
        fetchError.message.includes('Missing')
      ) {
        return NextResponse.json(
          {
            error: 'BSCScan API key required',
            message:
              'Please add BSCSCAN_API_KEY to your .env.local file. Get a free API key from bscscan.com',
            details: fetchError.message,
          },
          { status: 400 }
        );
      }
      throw fetchError;
    }

    let savedCount = 0;
    let duplicateCount = 0;
    const errors: string[] = [];

    // Process each transaction
    for (const tx of transactions) {
      try {
        // Check if transaction already exists (duplicate protection)
        const { data: existingTx } = await supabase
          .from('user_transactions')
          .select('id')
          .eq('transaction_hash', tx.hash)
          .eq('user_id', userId)
          .single();

        if (existingTx) {
          duplicateCount++;
          continue; // Skip duplicate
        }

        // Map transaction types to match schema constraints - ONLY INCOMING TRANSACTIONS
        let transactionType: string | null = null;
        const userWalletAddress = await getUserWalletAddress(userId);

        if (
          tx.type === 'deposit' &&
          userWalletAddress &&
          tx.to.toLowerCase() === userWalletAddress.toLowerCase()
        ) {
          transactionType = 'deposit';
        } else if (
          tx.type === 'token_transfer' &&
          userWalletAddress &&
          tx.to.toLowerCase() === userWalletAddress.toLowerCase()
        ) {
          transactionType = 'token_in';
        }

        // Skip outgoing transactions (withdraw, token_out)
        if (!transactionType) {
          console.log(
            `[SYNC TRANSACTIONS] Skipping outgoing transaction: ${tx.hash}`
          );
          continue;
        }

        // Prepare transaction data for insertion (matching existing schema)
        const transactionData = {
          user_id: userId,
          wallet_address: userWalletAddress || address,
          transaction_hash: tx.hash,
          transaction_type: transactionType,
          amount:
            tx.type === 'token_transfer'
              ? parseFloat(tx.tokenAmount || '0')
              : parseFloat(tx.value),
          token_symbol:
            tx.type === 'token_transfer'
              ? tx.tokenSymbol
              : network === 'bsc'
                ? 'BNB'
                : 'ETH',
          token_address:
            tx.type === 'token_transfer'
              ? (tx as Transaction & { tokenAddress?: string }).tokenAddress ||
                null
              : null,
          network: network === 'bsc' ? 'BSC_MAINNET' : 'ETHEREUM',
          block_number: tx.blockNumber,
          transaction_date: tx.timestamp,
        };

        // Insert transaction
        const { error: insertError } = await supabase
          .from('user_transactions')
          .insert(transactionData);

        if (insertError) {
          console.error(
            `[SYNC TRANSACTIONS] Error inserting tx ${tx.hash}:`,
            insertError
          );
          errors.push(
            `Failed to save transaction ${tx.hash}: ${insertError.message}`
          );
          continue;
        }

        savedCount++;

        // Update user balances for incoming transactions only (deposit, token_in)
        await updateUserBalanceIncoming(userId, tx, network, transactionType);
      } catch (error) {
        console.error(
          `[SYNC TRANSACTIONS] Error processing tx ${tx.hash}:`,
          error
        );
        errors.push(
          `Error processing transaction ${tx.hash}: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
      }
    }

    console.log(
      `[SYNC TRANSACTIONS] Sync completed: ${savedCount} saved, ${duplicateCount} duplicates, ${errors.length} errors`
    );

    return NextResponse.json({
      success: true,
      message: `Sync completed successfully`,
      stats: {
        totalTransactions: total,
        savedTransactions: savedCount,
        duplicateTransactions: duplicateCount,
        errors,
      },
    });
  } catch (error) {
    console.error('[SYNC TRANSACTIONS] API error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

// Helper function to update user balances for incoming transactions only
async function updateUserBalanceIncoming(
  userId: string,
  tx: Transaction,
  network: string,
  transactionType: string
) {
  try {
    // Only process incoming transactions (deposit, token_in)
    if (transactionType !== 'deposit' && transactionType !== 'token_in') {
      return;
    }

    // Handle native currency deposits (BNB/ETH)
    if (transactionType === 'deposit') {
      const tokenSymbol = network === 'bsc' ? 'BNB' : 'ETH';
      const amount = parseFloat(tx.value);

      if (amount > 0) {
        console.log(
          `[SYNC TRANSACTIONS] Processing incoming native currency: ${tokenSymbol} amount: ${amount}`
        );
        await incrementUserBalance(
          userId,
          tokenSymbol,
          amount,
          network === 'bsc' ? 'BSC_MAINNET' : 'ETHEREUM',
          null
        );
      }
    }

    // Handle incoming token transfers (like BSC-USD, ETH, etc.)
    if (transactionType === 'token_in' && tx.tokenSymbol && tx.tokenAmount) {
      const amount = parseFloat(tx.tokenAmount);
      const tokenAddress =
        (tx as Transaction & { tokenAddress?: string }).tokenAddress || null;

      if (amount > 0) {
        console.log(
          `[SYNC TRANSACTIONS] Processing incoming token transfer: ${tx.tokenSymbol} amount: ${amount} address: ${tokenAddress}`
        );
        await incrementUserBalance(
          userId,
          tx.tokenSymbol,
          amount,
          network === 'bsc' ? 'BSC_MAINNET' : 'ETHEREUM',
          tokenAddress
        );
      }
    }
  } catch (error) {
    console.error('[SYNC TRANSACTIONS] Error updating balance:', error);
  }
}

// Helper function to get user wallet address
async function getUserWalletAddress(userId: string): Promise<string | null> {
  const { data } = await supabase
    .from('wallets')
    .select('address')
    .eq('user_id', userId)
    .single();

  return data?.address || null;
}

// Helper function to increment user balance
async function incrementUserBalance(
  userId: string,
  tokenSymbol: string,
  amount: number,
  network: string,
  tokenAddress?: string | null
) {
  const { data: existingBalance } = await supabase
    .from('user_balances')
    .select('*')
    .eq('user_id', userId)
    .eq('token_symbol', tokenSymbol)
    .eq('network', network)
    .single();

  if (existingBalance) {
    const newBalance = parseFloat(existingBalance.balance) + amount;
    console.log(
      `[SYNC TRANSACTIONS] Incrementing ${tokenSymbol} balance: ${existingBalance.balance} + ${amount} = ${newBalance}`
    );

    await supabase
      .from('user_balances')
      .update({
        balance: newBalance.toString(),
        last_updated: new Date().toISOString(),
        ...(tokenAddress && { token_address: tokenAddress }),
      })
      .eq('id', existingBalance.id);
  } else {
    const walletAddress = await getUserWalletAddress(userId);
    console.log(
      `[SYNC TRANSACTIONS] Creating new ${tokenSymbol} balance: ${amount}`
    );

    await supabase.from('user_balances').insert({
      user_id: userId,
      wallet_address: walletAddress || '',
      token_symbol: tokenSymbol,
      token_address: tokenAddress,
      balance: amount.toString(),
      network: network,
      last_updated: new Date().toISOString(),
    });
  }
}

// GET endpoint to check sync status
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { error: 'userId is required' },
        { status: 400 }
      );
    }

    console.log(`[SYNC TRANSACTIONS] Getting status for user ${userId}`);

    // Get user's current balances and transaction count
    const { data: balances, error: balanceError } = await supabase
      .from('user_balances')
      .select('*')
      .eq('user_id', userId);

    const {
      data: transactions,
      count: transactionCount,
      error: transactionError,
    } = await supabase
      .from('user_transactions')
      .select('id, transaction_date', { count: 'exact' })
      .eq('user_id', userId)
      .order('transaction_date', { ascending: false });

    if (balanceError) {
      console.error('[SYNC TRANSACTIONS] Balance error:', balanceError);
    }

    if (transactionError) {
      console.error('[SYNC TRANSACTIONS] Transaction error:', transactionError);
    }

    const balanceCount = balances?.length || 0;
    const totalTransactions = transactionCount || 0;
    const lastSync = transactions?.[0]?.transaction_date || null;

    const balanceList =
      balances?.map(b => ({
        token: b.token_symbol,
        balance: parseFloat(b.balance).toFixed(6),
        network: b.network,
      })) || [];

    console.log(
      `[SYNC TRANSACTIONS] Status: ${balanceCount} balances, ${totalTransactions} transactions`
    );

    return NextResponse.json({
      balanceCount,
      transactionCount: totalTransactions,
      lastSync,
      balances: balanceList,
    });
  } catch (error) {
    console.error('[SYNC TRANSACTIONS] GET API error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
