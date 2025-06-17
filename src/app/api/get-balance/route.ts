import { NextRequest, NextResponse } from 'next/server'
import { getWalletBalance, isValidAddress, NETWORKS } from '@/lib/blockchain'
import { calculateUSDTValue, getNativeCurrencySymbol } from '@/lib/binance-price'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const address = searchParams.get('address')
    const network = searchParams.get('network') as keyof typeof NETWORKS || 'BSC_MAINNET'

    if (!address) {
      return NextResponse.json(
        { error: 'Address is required' },
        { status: 400 }
      )
    }

    if (!isValidAddress(address)) {
      return NextResponse.json(
        { error: 'Invalid address format' },
        { status: 400 }
      )
    }

    if (!NETWORKS[network]) {
      return NextResponse.json(
        { error: 'Unsupported network' },
        { status: 400 }
      )
    }

    const balanceData = await getWalletBalance(address, network)
    
    // Get native currency symbol and calculate USDT value
    const tokenSymbol = getNativeCurrencySymbol(network)
    const usdtData = await calculateUSDTValue(
      balanceData.balanceFormatted,
      tokenSymbol,
      network
    )

    return NextResponse.json({
      address,
      network,
      balance: balanceData.balance,
      balanceFormatted: balanceData.balanceFormatted,
      symbol: balanceData.symbol,
      usdt: {
        value: usdtData.usdtValue,
        formatted: usdtData.formattedValue,
        price: usdtData.price,
        tokenSymbol
      },
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Error in get-balance API:', error)
    return NextResponse.json(
      { error: 'Failed to fetch balance' },
      { status: 500 }
    )
  }
} 