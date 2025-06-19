import { NextRequest, NextResponse } from 'next/server';

// CORS headers for cross-origin requests
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

// Multiple price API endpoints
const PRICE_APIS = [
  {
    name: 'CoinGecko',
    url: 'https://api.coingecko.com/api/v3/simple/price',
    transform: (symbol: string) => ({
      url: `https://api.coingecko.com/api/v3/simple/price?ids=${symbol.toLowerCase()}&vs_currencies=usd`,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; WalletApp/1.0)',
      },
    }),
    parse: async (response: Response) => {
      const data = await response.json();
      const coinId = Object.keys(data)[0];
      return data[coinId]?.usd || 0;
    },
  },
  {
    name: 'CryptoCompare',
    url: 'https://min-api.cryptocompare.com/data/price',
    transform: (symbol: string) => ({
      url: `https://min-api.cryptocompare.com/data/price?fsym=${symbol.toUpperCase()}&tsyms=USD`,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; WalletApp/1.0)',
      },
    }),
    parse: async (response: Response) => {
      const data = await response.json();
      return data.USD || 0;
    },
  },
  {
    name: 'CoinCap',
    url: 'https://api.coincap.io/v2/assets',
    transform: (symbol: string) => ({
      url: `https://api.coincap.io/v2/assets/${symbol.toLowerCase()}`,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; WalletApp/1.0)',
      },
    }),
    parse: async (response: Response) => {
      const data = await response.json();
      return parseFloat(data.data?.priceUsd || '0');
    },
  },
];

// Token symbol to CoinGecko ID mapping
const COINGECKO_IDS: Record<string, string> = {
  BTC: 'bitcoin',
  ETH: 'ethereum',
  BNB: 'binancecoin',
  ADA: 'cardano',
  SOL: 'solana',
  MATIC: 'matic-network',
  AVAX: 'avalanche-2',
  LTC: 'litecoin',
  DOGE: 'dogecoin',
  XRP: 'ripple',
  SHIB: 'shiba-inu',
  DOT: 'polkadot',
  LINK: 'chainlink',
  UNI: 'uniswap',
  AAVE: 'aave',
  USDC: 'usd-coin',
  BUSD: 'binance-usd',
  USDT: 'tether',
  CAKE: 'pancakeswap-token',
  BCH: 'bitcoin-cash',
  POL: 'matic-network',
};

// Cache for price data (5 minutes)
const priceCache = new Map<string, { price: number; timestamp: number }>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: corsHeaders,
  });
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const symbol = searchParams.get('symbol');
    const network = searchParams.get('network') || 'BSC_MAINNET';

    if (!symbol) {
      return NextResponse.json(
        { error: 'Symbol parameter is required' },
        { status: 400, headers: corsHeaders }
      );
    }

    console.log(`[PROXY PRICE] Fetching price for ${symbol} on ${network}`);

    // Check cache first
    const cacheKey = `${symbol}_${network}`;
    const cached = priceCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      console.log(
        `[PROXY PRICE] Using cached price for ${symbol}: $${cached.price}`
      );
      return NextResponse.json(
        { price: cached.price, source: 'cache' },
        { headers: corsHeaders }
      );
    }

    // Special case for stablecoins
    if (
      ['USDT', 'USDC', 'BUSD', 'DAI', 'BSC-USD'].includes(symbol.toUpperCase())
    ) {
      const price = 1.0;
      priceCache.set(cacheKey, { price, timestamp: Date.now() });
      return NextResponse.json(
        { price, source: 'stablecoin' },
        { headers: corsHeaders }
      );
    }

    // Try multiple APIs
    let lastError: Error | null = null;

    for (const api of PRICE_APIS) {
      try {
        console.log(`[PROXY PRICE] Trying ${api.name} API...`);

        // Get CoinGecko ID if using CoinGecko
        const apiSymbol =
          api.name === 'CoinGecko'
            ? COINGECKO_IDS[symbol.toUpperCase()] || symbol.toLowerCase()
            : symbol;

        const { url, headers } = api.transform(apiSymbol);

        const response = await fetch(url, {
          headers,
          // Add timeout
          signal: AbortSignal.timeout(10000), // 10 seconds
        });

        if (!response.ok) {
          throw new Error(`${api.name} API error: ${response.status}`);
        }

        const price = await api.parse(response);

        if (price > 0) {
          console.log(`[PROXY PRICE] Success with ${api.name}: $${price}`);
          priceCache.set(cacheKey, { price, timestamp: Date.now() });

          return NextResponse.json(
            {
              price,
              source: api.name.toLowerCase(),
              symbol,
              network,
              timestamp: new Date().toISOString(),
            },
            { headers: corsHeaders }
          );
        }
      } catch (error) {
        console.log(`[PROXY PRICE] ${api.name} failed:`, error);
        lastError = error as Error;
        continue;
      }
    }

    // All APIs failed, try to return cached value
    if (cached) {
      console.log(
        `[PROXY PRICE] Using expired cache for ${symbol}: $${cached.price}`
      );
      return NextResponse.json(
        {
          price: cached.price,
          source: 'expired_cache',
          warning: 'Using expired cache data',
        },
        { headers: corsHeaders }
      );
    }

    // No price found - log the last error for debugging
    console.log(
      `[PROXY PRICE] No price found for ${symbol}. Last error:`,
      lastError?.message
    );
    return NextResponse.json(
      {
        price: 0,
        source: 'fallback',
        error: 'No price data available',
        lastError: lastError?.message || 'Unknown error',
      },
      { headers: corsHeaders }
    );
  } catch (error) {
    console.error('[PROXY PRICE] Error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500, headers: corsHeaders }
    );
  }
}
