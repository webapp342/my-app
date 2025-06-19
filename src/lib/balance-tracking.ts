import { supabase } from './supabase';
import { Transaction } from '@/types/transaction';
import { UserTransaction, UserBalance, Database } from '@/types/database';

/**
 * Save deposit and token_in transactions to database
 */
export async function saveUserTransactions(
  userId: string,
  walletAddress: string,
  transactions: Transaction[]
): Promise<{ success: boolean; saved: number; errors: string[] }> {
  const errors: string[] = [];
  let savedCount = 0;

  // Filter only deposit and token_in transactions (LIMIT TO RECENT)
  const relevantTransactions = transactions
    .filter(
      tx =>
        tx.type === 'deposit' ||
        (tx.type === 'token_transfer' &&
          tx.to.toLowerCase() === walletAddress.toLowerCase())
    )
    .slice(0, 50); // LIMIT: Only process last 50 transactions to save space

  console.log(
    `[BALANCE TRACKING] Processing ${relevantTransactions.length} relevant transactions (limited for efficiency)`
  );

  for (const transaction of relevantTransactions) {
    try {
      // Determine transaction type
      const transactionType =
        transaction.type === 'deposit' ? 'deposit' : 'token_in';

      // Get amount and token info
      let amount: string;
      let tokenSymbol: string;
      const tokenAddress: string | null = null;

      if (transaction.type === 'token_transfer') {
        amount = transaction.tokenAmount || '0';
        tokenSymbol = transaction.tokenSymbol || 'UNKNOWN';
        // For token transfers, we could extract token address from transaction data
        // For now, we'll leave it null and identify by symbol
      } else {
        amount = transaction.value;
        tokenSymbol = transaction.network === 'ethereum' ? 'ETH' : 'BNB';
      }

      // Prepare transaction data
      const transactionData: Database['public']['Tables']['user_transactions']['Insert'] =
        {
          user_id: userId,
          wallet_address: walletAddress.toLowerCase(),
          transaction_hash: transaction.hash,
          transaction_type: transactionType,
          amount: amount,
          token_symbol: tokenSymbol,
          token_address: tokenAddress,
          network:
            transaction.network === 'ethereum' ? 'ETHEREUM' : 'BSC_MAINNET',
          block_number: transaction.blockNumber,
          transaction_date: transaction.timestamp,
        };

      // Insert transaction (will be ignored if hash already exists due to UNIQUE constraint)
      const { error } = await supabase
        .from('user_transactions')
        .insert(transactionData);

      if (error) {
        if (error.code === '23505') {
          // Duplicate key error
          console.log(
            `[BALANCE TRACKING] Transaction ${transaction.hash} already exists, skipping`
          );
        } else {
          console.error(
            `[BALANCE TRACKING] Error saving transaction ${transaction.hash}:`,
            error
          );
          errors.push(`Transaction ${transaction.hash}: ${error.message}`);
        }
      } else {
        savedCount++;
        console.log(
          `[BALANCE TRACKING] Saved transaction: ${transaction.hash} - ${amount} ${tokenSymbol}`
        );
      }
    } catch (error) {
      console.error(
        `[BALANCE TRACKING] Unexpected error processing transaction:`,
        error
      );
      errors.push(
        `Unexpected error: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  return {
    success: errors.length === 0,
    saved: savedCount,
    errors,
  };
}

/**
 * Get user's token balances from database
 */
export async function getUserBalances(userId: string): Promise<UserBalance[]> {
  try {
    const { data, error } = await supabase
      .from('user_balances')
      .select('*')
      .eq('user_id', userId)
      .order('token_symbol', { ascending: true });

    if (error) {
      console.error('[BALANCE TRACKING] Error fetching user balances:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error(
      '[BALANCE TRACKING] Unexpected error fetching balances:',
      error
    );
    return [];
  }
}

/**
 * Get user's transaction history from database
 */
export async function getUserTransactionHistory(
  userId: string,
  limit: number = 50
): Promise<UserTransaction[]> {
  try {
    const { data, error } = await supabase
      .from('user_transactions')
      .select('*')
      .eq('user_id', userId)
      .order('transaction_date', { ascending: false })
      .limit(limit);

    if (error) {
      console.error(
        '[BALANCE TRACKING] Error fetching transaction history:',
        error
      );
      return [];
    }

    return data || [];
  } catch (error) {
    console.error(
      '[BALANCE TRACKING] Unexpected error fetching transaction history:',
      error
    );
    return [];
  }
}

/**
 * Recalculate all balances for a user (useful for fixing inconsistencies)
 */
export async function recalculateUserBalances(
  userId: string
): Promise<boolean> {
  try {
    const { error } = await supabase.rpc('recalculate_user_balances', {
      target_user_id: userId,
    });

    if (error) {
      console.error('[BALANCE TRACKING] Error recalculating balances:', error);
      return false;
    }

    console.log(
      `[BALANCE TRACKING] Successfully recalculated balances for user ${userId}`
    );
    return true;
  } catch (error) {
    console.error(
      '[BALANCE TRACKING] Unexpected error recalculating balances:',
      error
    );
    return false;
  }
}

/**
 * Get balance summary for dashboard display
 */
export async function getBalanceSummary(userId: string): Promise<{
  totalTokens: number;
  balances: Array<{
    token: string;
    balance: string;
    network: string;
  }>;
}> {
  const balances = await getUserBalances(userId);

  return {
    totalTokens: balances.length,
    balances: balances.map(balance => ({
      token: balance.token_symbol,
      balance: parseFloat(balance.balance).toFixed(6),
      network: balance.network,
    })),
  };
}
