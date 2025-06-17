import { NextRequest, NextResponse } from 'next/server'

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

    // Fetch from Binance API
    const binanceUrl = `https://api.binance.com/api/v3/ticker/price?symbol=${symbol}`
    const response = await fetch(binanceUrl)
    
    if (!response.ok) {
      throw new Error(`Binance API error: ${response.status}`)
    }

    const data = await response.json()
    
    console.log(`[BINANCE PRICE] ${symbol} price:`, data.price)

    return NextResponse.json({
      symbol: data.symbol,
      price: data.price
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