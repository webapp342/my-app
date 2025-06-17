import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

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

    // For now, return success without actual blockchain sync
    // This prevents the 404 error and allows the dashboard to work
    return NextResponse.json({
      success: true,
      message: 'Sync endpoint is available but blockchain sync is temporarily disabled',
      stats: {
        totalTransactions: 0,
        savedTransactions: 0,
        errors: []
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

    const { data: transactions, error: transactionError } = await supabase
      .from('user_transactions')
      .select('id, transaction_date')
      .eq('user_id', userId)
      .order('transaction_date', { ascending: false })
      .limit(1)

    if (balanceError) {
      console.error('[SYNC TRANSACTIONS] Balance error:', balanceError)
    }
    
    if (transactionError) {
      console.error('[SYNC TRANSACTIONS] Transaction error:', transactionError)
    }

    const balanceCount = balances?.length || 0
    const transactionCount = transactions?.length || 0
    const lastSync = transactions?.[0]?.transaction_date || null

    const balanceList = balances?.map(b => ({
      token: b.token_symbol,
      balance: parseFloat(b.balance).toFixed(6),
      network: b.network
    })) || []

    console.log(`[SYNC TRANSACTIONS] Status: ${balanceCount} balances, ${transactionCount} transactions`)

    return NextResponse.json({
      balanceCount,
      transactionCount,
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