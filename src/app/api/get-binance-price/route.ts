import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const symbol = searchParams.get('symbol');
    const network = searchParams.get('network') || 'BSC_MAINNET';

    if (!symbol) {
      return NextResponse.json(
        { error: 'Symbol is required' },
        { status: 400 }
      );
    }

    console.log(`[BINANCE PRICE] Fetching price for ${symbol} on ${network}`);

    // Use our proxy API to avoid CORS and 451 errors
    const proxyUrl = new URL('/api/proxy-price', request.url);
    proxyUrl.searchParams.set('symbol', symbol);
    proxyUrl.searchParams.set('network', network);

    const response = await fetch(proxyUrl.toString(), {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Proxy API error: ${response.status}`);
    }

    const data = await response.json();

    console.log(
      `[BINANCE PRICE] ${symbol} price: $${data.price} (source: ${data.source})`
    );

    return NextResponse.json({
      symbol: symbol,
      price: data.price.toString(),
      source: data.source,
      network: network,
      timestamp: data.timestamp,
    });
  } catch (error) {
    console.error('[BINANCE PRICE] Error:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch price',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
