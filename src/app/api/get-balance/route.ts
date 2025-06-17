import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { getTokenBalance, BSC_TOKENS } from '@/lib/alchemy-service'

export async function POST(request: NextRequest) {
  try {
    const { walletAddress, userId } = await request.json()

    if (!walletAddress) {
      return NextResponse.json(
        { error: 'Wallet address is required' },
        { status: 400 }
      )
    }

    // Get database balances for the user
    const { data: dbBalances, error: dbError } = await supabase
      .from('balances')
      .select('*')
      .eq('user_id', userId)
      .eq('network', 'BSC_MAINNET')

    if (dbError) {
      console.error('Error fetching database balances:', dbError)
    }

    // Get real-time balances from Alchemy
    const alchemyBalances = []
    
    try {
      // Get BNB balance
      const bnbBalance = await getTokenBalance(walletAddress)
      alchemyBalances.push({
        symbol: 'BNB',
        address: null,
        balance: bnbBalance.balance,
        decimals: bnbBalance.decimals
      })

      // Get token balances for common tokens
      for (const token of Object.values(BSC_TOKENS)) {
        if (token.address) {
          try {
            const tokenBalance = await getTokenBalance(walletAddress, token.address)
            alchemyBalances.push({
              symbol: token.symbol,
              address: token.address,
              balance: tokenBalance.balance,
              decimals: tokenBalance.decimals
            })
          } catch (error) {
            console.error(`Error getting balance for ${token.symbol}:`, error)
            // Continue with other tokens
          }
        }
      }
    } catch (error) {
      console.error('Error fetching Alchemy balances:', error)
    }

    // Combine database and Alchemy data
    const combinedBalances = alchemyBalances.map(alchemyBalance => {
      const dbBalance = dbBalances?.find(
        db => db.token_symbol === alchemyBalance.symbol
      )
      
      return {
        symbol: alchemyBalance.symbol,
        address: alchemyBalance.address,
        onChainBalance: alchemyBalance.balance,
        trackedDeposits: dbBalance?.amount || 0,
        decimals: alchemyBalance.decimals,
        lastUpdated: dbBalance?.last_updated || null
      }
    })

    return NextResponse.json({
      walletAddress,
      balances: combinedBalances,
      network: 'BSC_MAINNET'
    })

  } catch (error) {
    console.error('Error in get-balance API:', error)
    return NextResponse.json(
      { 
        error: 'Internal server error', 
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Balance API is available',
    usage: 'POST with { "walletAddress": "0x...", "userId": "uuid" }'
  })
} 