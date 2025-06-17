import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { saveUserTransactions } from '@/lib/balance-tracking'
import { fetchTransactionHistory } from '@/lib/transaction-service'

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

    // Fetch recent transactions from blockchain
    try {
      console.log(`[SYNC TRANSACTIONS] Fetching transactions from blockchain...`)
      
      // Fetch transactions for BSC (LIMIT to save database space)
      const transactionResult = await fetchTransactionHistory(address, 'bsc', 1, 25) // Reduced from 100 to 25
      
      console.log(`[SYNC TRANSACTIONS] Found ${transactionResult.transactions.length} transactions`)

      // Save relevant transactions to database
      const saveResult = await saveUserTransactions(
        userId,
        address,
        transactionResult.transactions
      )

      console.log(`[SYNC TRANSACTIONS] Save result:`, saveResult)

      return NextResponse.json({
        success: true,
        message: 'Transactions synced successfully',
        stats: {
          totalTransactions: transactionResult.transactions.length,
          savedTransactions: saveResult.saved,
          errors: saveResult.errors
        }
      })

    } catch (blockchainError) {
      console.error('[SYNC TRANSACTIONS] Blockchain fetch error:', blockchainError)
      return NextResponse.json(
        { 
          error: 'Failed to fetch transactions from blockchain',
          details: blockchainError instanceof Error ? blockchainError.message : 'Unknown error'
        },
        { status: 500 }
      )
    }

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

    // Get user's current balances and transaction count
    const { data: balances, error: balanceError } = await supabase
      .from('user_balances')
      .select('*')
      .eq('user_id', userId)

    const { data: transactions, error: transactionError } = await supabase
      .from('user_transactions')
      .select('id, transaction_date')
      .eq('user_id', userId)
      .order('transaction_date', { ascending: false })
      .limit(1)

    if (balanceError || transactionError) {
      return NextResponse.json(
        { error: 'Failed to fetch sync status' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      balanceCount: balances?.length || 0,
      transactionCount: transactions?.length || 0,
      lastSync: transactions?.[0]?.transaction_date || null,
      balances: balances?.map(b => ({
        token: b.token_symbol,
        balance: parseFloat(b.balance).toFixed(6),
        network: b.network
      })) || []
    })

  } catch (error) {
    console.error('[SYNC TRANSACTIONS] GET API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 