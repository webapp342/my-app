import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

/**
 * GET /api/transactions
 * 
 * Fetches and categorizes blockchain transactions for a given address
 * 
 * Query Parameters:
 * - userId (optional): User ID
 * - walletAddress (optional): Ethereum or BSC wallet address
 * - page (optional): Page number for pagination (default: 1)
 * - limit (optional): Number of transactions per page (default: 20, max: 100)
 * - type (optional): Transaction type ('deposit', 'withdraw', 'all')
 * 
 * Returns:
 * - Array of categorized transactions (deposit, withdraw, token_transfer)
 * - Pagination metadata
 * - Network information
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const walletAddress = searchParams.get('walletAddress')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const type = searchParams.get('type') // 'deposit' | 'withdraw' | 'all'

    if (!userId && !walletAddress) {
      return NextResponse.json(
        { error: 'Either userId or walletAddress is required' },
        { status: 400 }
      )
    }

    let query = supabase
      .from('transactions')
      .select('*')
      .order('created_at', { ascending: false })

    // Filter by user or wallet
    if (userId) {
      query = query.eq('user_id', userId)
    } else if (walletAddress) {
      query = query.eq('to_address', walletAddress)
    }

    // Filter by type if specified
    if (type && type !== 'all') {
      query = query.eq('type', type)
    }

    // Add pagination
    const offset = (page - 1) * limit
    query = query.range(offset, offset + limit - 1)

    const { data: transactions, error, count } = await query

    if (error) {
      console.error('Error fetching transactions:', error)
      return NextResponse.json(
        { error: 'Failed to fetch transactions' },
        { status: 500 }
      )
    }

    // Format transactions for frontend
    const formattedTransactions = transactions?.map(tx => ({
      id: tx.id,
      hash: tx.tx_hash,
      from: tx.from_address,
      to: tx.to_address,
      amount: tx.amount.toString(),
      tokenSymbol: tx.token_symbol,
      tokenAddress: tx.token_address,
      decimals: tx.token_decimals,
      network: tx.network,
      type: tx.type,
      status: tx.status,
      blockNumber: tx.block_number,
      gasUsed: tx.gas_used?.toString(),
      gasPrice: tx.gas_price?.toString(),
      timestamp: tx.created_at,
      explorerUrl: getExplorerUrl(tx.tx_hash, tx.network)
    })) || []

    // Get total count for pagination
    const { count: totalCount } = await supabase
      .from('transactions')
      .select('*', { count: 'exact', head: true })
      .eq(userId ? 'user_id' : 'to_address', userId || walletAddress)

    const hasMore = offset + limit < (totalCount || 0)

    return NextResponse.json({
      transactions: formattedTransactions,
      pagination: {
        page,
        limit,
        total: totalCount || 0,
        hasMore
      },
      network: 'BSC_MAINNET'
    })

  } catch (error) {
    console.error('Error in transactions API:', error)
    return NextResponse.json(
      { 
        error: 'Internal server error', 
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

// Get transaction summary for a user
export async function POST(request: NextRequest) {
  try {
    const { userId } = await request.json()

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      )
    }

    // Get transaction counts by type
    const { data: summary } = await supabase
      .from('transactions')
      .select('type, token_symbol, amount')
      .eq('user_id', userId)

    if (!summary) {
      return NextResponse.json({
        totalDeposits: 0,
        totalWithdrawals: 0,
        transactionCount: 0,
        tokenBreakdown: {}
      })
    }

    const deposits = summary.filter(tx => tx.type === 'deposit')
    const withdrawals = summary.filter(tx => tx.type === 'withdraw')

    // Calculate token breakdown
    const tokenBreakdown: Record<string, { deposits: number; amount: number }> = {}
    
    deposits.forEach(tx => {
      if (!tokenBreakdown[tx.token_symbol]) {
        tokenBreakdown[tx.token_symbol] = { deposits: 0, amount: 0 }
      }
      tokenBreakdown[tx.token_symbol].deposits++
      tokenBreakdown[tx.token_symbol].amount += parseFloat(tx.amount.toString())
    })

    return NextResponse.json({
      totalDeposits: deposits.length,
      totalWithdrawals: withdrawals.length,
      transactionCount: summary.length,
      tokenBreakdown
    })

  } catch (error) {
    console.error('Error in transaction summary API:', error)
    return NextResponse.json(
      { 
        error: 'Internal server error', 
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

// Helper function to generate explorer URLs
function getExplorerUrl(txHash: string, network: string): string {
  const explorers = {
    'BSC_MAINNET': 'https://bscscan.com/tx/',
    'BSC_TESTNET': 'https://testnet.bscscan.com/tx/',
    'ETHEREUM': 'https://etherscan.io/tx/'
  }
  
  const baseUrl = explorers[network as keyof typeof explorers] || explorers.BSC_MAINNET
  return `${baseUrl}${txHash}`
}

/**
 * Handle OPTIONS request for CORS
 */
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  })
} 