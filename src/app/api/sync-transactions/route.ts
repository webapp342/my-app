import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { fetchTransactionHistory, detectNetwork } from '@/lib/transaction-service'
import { Transaction } from '@/types/transaction'

export async function POST(request: NextRequest) {
  try {
    const { address, userId } = await request.json()

    if (!address || !userId) {
      return NextResponse.json(
        { error: 'Address and userId are required' },
        { status: 400 }
      )
    }

    console.log(`[SYNC TRANSACTIONS] Starting sync for user ${userId}, address ${address}`)

    // Verify user exists and owns this wallet (case insensitive)
    const { data: walletData, error: walletError } = await supabase
      .from('wallets')
      .select(`
        *,
        users (id, username)
      `)
      .ilike('address', address)
      .eq('user_id', userId)
      .single()

    if (walletError || !walletData) {
      return NextResponse.json(
        { error: 'Wallet not found or access denied' },
        { status: 404 }
      )
    }

    // Detect network (BSC for your case)
    const network = detectNetwork(address, walletData.network || 'BSC_MAINNET')
    console.log(`[SYNC TRANSACTIONS] Using network: ${network}`)

    // Fetch transactions from blockchain
    let transactions, total
    try {
      const result = await fetchTransactionHistory(address, network, 1, 100)
      transactions = result.transactions
      total = result.total
      console.log(`[SYNC TRANSACTIONS] Fetched ${transactions.length} transactions from blockchain`)
    } catch (fetchError) {
      if (fetchError instanceof Error && fetchError.message.includes('Missing')) {
        return NextResponse.json({
          error: 'BSCScan API key required',
          message: 'Please add BSCSCAN_API_KEY to your .env.local file. Get a free API key from bscscan.com',
          details: fetchError.message
        }, { status: 400 })
      }
      throw fetchError
    }

    let savedCount = 0
    let duplicateCount = 0
    const errors: string[] = []

    // Process each transaction
    for (const tx of transactions) {
      try {
        // Check if transaction already exists (duplicate protection)
        const { data: existingTx } = await supabase
          .from('user_transactions')
          .select('id')
          .eq('transaction_hash', tx.hash)
          .eq('user_id', userId)
          .single()

        if (existingTx) {
          duplicateCount++
          continue // Skip duplicate
        }

        // Map transaction types to match schema constraints
        let transactionType: string = tx.type
        if (tx.type === 'deposit') {
          transactionType = 'deposit'
        } else if (tx.type === 'withdraw') {
          transactionType = 'withdraw'
        } else if (tx.type === 'token_transfer') {
          // Check if it's incoming or outgoing
          const userWalletAddress = await getUserWalletAddress(userId)
          if (userWalletAddress && tx.to.toLowerCase() === userWalletAddress.toLowerCase()) {
            transactionType = 'token_in'
          } else {
            transactionType = 'token_out'
          }
        }

        // Prepare transaction data for insertion (matching existing schema)
        const transactionData = {
          user_id: userId,
          wallet_address: await getUserWalletAddress(userId) || address,
          transaction_hash: tx.hash,
          transaction_type: transactionType,
          amount: tx.type === 'token_transfer' ? parseFloat(tx.tokenAmount || '0') : parseFloat(tx.value),
          token_symbol: tx.type === 'token_transfer' ? tx.tokenSymbol : (network === 'bsc' ? 'BNB' : 'ETH'),
          token_address: tx.type === 'token_transfer' ? (tx as Transaction & { tokenAddress?: string }).tokenAddress || null : null,
          network: network === 'bsc' ? 'BSC_MAINNET' : 'ETHEREUM',
          block_number: tx.blockNumber,
          transaction_date: tx.timestamp
        }

        // Insert transaction
        const { error: insertError } = await supabase
          .from('user_transactions')
          .insert(transactionData)

        if (insertError) {
          console.error(`[SYNC TRANSACTIONS] Error inserting tx ${tx.hash}:`, insertError)
          errors.push(`Failed to save transaction ${tx.hash}: ${insertError.message}`)
          continue
        }

        savedCount++

        // Update user balances for relevant tokens
        await updateUserBalance(userId, tx, network)

      } catch (error) {
        console.error(`[SYNC TRANSACTIONS] Error processing tx ${tx.hash}:`, error)
        errors.push(`Error processing transaction ${tx.hash}: ${error instanceof Error ? error.message : 'Unknown error'}`)
      }
    }

    console.log(`[SYNC TRANSACTIONS] Sync completed: ${savedCount} saved, ${duplicateCount} duplicates, ${errors.length} errors`)

    return NextResponse.json({
      success: true,
      message: `Sync completed successfully`,
      stats: {
        totalTransactions: total,
        savedTransactions: savedCount,
        duplicateTransactions: duplicateCount,
        errors
      }
    })

  } catch (error) {
    console.error('[SYNC TRANSACTIONS] API error:', error)
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

// Helper function to update user balances
async function updateUserBalance(userId: string, tx: Transaction, network: string) {
  try {
    const userAddress = await getUserWalletAddress(userId)
    if (!userAddress) return

    const isIncoming = tx.to.toLowerCase() === userAddress.toLowerCase()
    const isOutgoing = tx.from.toLowerCase() === userAddress.toLowerCase()

    if (!isIncoming && !isOutgoing) return

    // Handle native currency (BNB/ETH)
    if (tx.type === 'deposit' || tx.type === 'withdraw') {
      const tokenSymbol = network === 'bsc' ? 'BNB' : 'ETH'
      const amount = parseFloat(tx.value)
      
      if (amount > 0) {
        if (isIncoming) {
          await incrementUserBalance(userId, tokenSymbol, amount, network === 'bsc' ? 'BSC_MAINNET' : 'ETHEREUM')
        } else if (isOutgoing) {
          await decrementUserBalance(userId, tokenSymbol, amount, network === 'bsc' ? 'BSC_MAINNET' : 'ETHEREUM')
        }
      }
    }

    // Handle token transfers (like BSC-USD)
    if (tx.type === 'token_transfer' && tx.tokenSymbol && tx.tokenAmount) {
      const amount = parseFloat(tx.tokenAmount)
      
      if (amount > 0) {
        if (isIncoming) {
          await incrementUserBalance(userId, tx.tokenSymbol, amount, network === 'bsc' ? 'BSC_MAINNET' : 'ETHEREUM')
        } else if (isOutgoing) {
          await decrementUserBalance(userId, tx.tokenSymbol, amount, network === 'bsc' ? 'BSC_MAINNET' : 'ETHEREUM')
        }
      }
    }

  } catch (error) {
    console.error('[SYNC TRANSACTIONS] Error updating balance:', error)
  }
}

// Helper function to get user wallet address
async function getUserWalletAddress(userId: string): Promise<string | null> {
  const { data } = await supabase
    .from('wallets')
    .select('address')
    .eq('user_id', userId)
    .single()
  
  return data?.address || null
}

// Helper function to increment user balance
async function incrementUserBalance(userId: string, tokenSymbol: string, amount: number, network: string) {
  const { data: existingBalance } = await supabase
    .from('user_balances')
    .select('*')
    .eq('user_id', userId)
    .eq('token_symbol', tokenSymbol)
    .eq('network', network)
    .single()

  if (existingBalance) {
    const newBalance = parseFloat(existingBalance.balance) + amount
    await supabase
      .from('user_balances')
      .update({ 
        balance: newBalance.toString(),
        last_updated: new Date().toISOString()
      })
      .eq('id', existingBalance.id)
  } else {
    const walletAddress = await getUserWalletAddress(userId)
    await supabase
      .from('user_balances')
      .insert({
        user_id: userId,
        wallet_address: walletAddress || '',
        token_symbol: tokenSymbol,
        balance: amount.toString(),
        network: network,
        last_updated: new Date().toISOString()
      })
  }
}

// Helper function to decrement user balance
async function decrementUserBalance(userId: string, tokenSymbol: string, amount: number, network: string) {
  const { data: existingBalance } = await supabase
    .from('user_balances')
    .select('*')
    .eq('user_id', userId)
    .eq('token_symbol', tokenSymbol)
    .eq('network', network)
    .single()

  if (existingBalance) {
    const newBalance = Math.max(0, parseFloat(existingBalance.balance) - amount)
    await supabase
      .from('user_balances')
      .update({ 
        balance: newBalance.toString(),
        last_updated: new Date().toISOString()
      })
      .eq('id', existingBalance.id)
  }
}

// GET endpoint to check sync status
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')

    if (!userId) {
      return NextResponse.json(
        { error: 'userId is required' },
        { status: 400 }
      )
    }

    console.log(`[SYNC TRANSACTIONS] Getting status for user ${userId}`)

    // Get user's current balances and transaction count
    const { data: balances, error: balanceError } = await supabase
      .from('user_balances')
      .select('*')
      .eq('user_id', userId)

    const { data: transactions, count: transactionCount, error: transactionError } = await supabase
      .from('user_transactions')
      .select('id, transaction_date', { count: 'exact' })
      .eq('user_id', userId)
      .order('transaction_date', { ascending: false })

    if (balanceError) {
      console.error('[SYNC TRANSACTIONS] Balance error:', balanceError)
    }
    
    if (transactionError) {
      console.error('[SYNC TRANSACTIONS] Transaction error:', transactionError)
    }

    const balanceCount = balances?.length || 0
    const totalTransactions = transactionCount || 0
    const lastSync = transactions?.[0]?.transaction_date || null

    const balanceList = balances?.map(b => ({
      token: b.token_symbol,
      balance: parseFloat(b.balance).toFixed(6),
      network: b.network
    })) || []

    console.log(`[SYNC TRANSACTIONS] Status: ${balanceCount} balances, ${totalTransactions} transactions`)

    return NextResponse.json({
      balanceCount,
      transactionCount: totalTransactions,
      lastSync,
      balances: balanceList
    })

  } catch (error) {
    console.error('[SYNC TRANSACTIONS] GET API error:', error)
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
} 