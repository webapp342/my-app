import { NextRequest, NextResponse } from 'next/server'
import { fetchTokenPrice } from '@/lib/binance-price'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const symbol = searchParams.get('symbol')

    if (!symbol) {
      return NextResponse.json(
        { error: 'Symbol is required' },
        { status: 400 }
      )
    }

    console.log(`[BINANCE PRICE] Fetching price for ${symbol}`)

    // Use our fetchTokenPrice function which handles symbol mapping
    const price = await fetchTokenPrice(symbol, 'BSC_MAINNET')
    
    console.log(`[BINANCE PRICE] ${symbol} price: $${price}`)

    return NextResponse.json({
      symbol: symbol,
      price: price.toString()
    })

  } catch (error) {
    console.error('[BINANCE PRICE] Error:', error)
    return NextResponse.json(
      { 
        error: 'Failed to fetch price',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
} 