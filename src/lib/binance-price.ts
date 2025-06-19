import { NETWORKS } from './blockchain'

// Binance API endpoint for 24hr price ticker
const BINANCE_API_URL = 'https://api.binance.com/api/v3/ticker/24hr'

// Token symbol mapping for different networks
const TOKEN_SYMBOL_MAP: Record<string, string> = {
  // Ethereum network
  'ethereum_ETH': 'ETHUSDT',
  
  // BSC network
  'bsc_BNB': 'BNBUSDT',
  'bsc_BUSD': 'BUSDUSDT',
  'bsc_USDT': 'USDTUSDT',
  'bsc_USDC': 'USDCUSDT',
  'bsc_CAKE': 'CAKEUSDT',
  'bsc_ADA': 'ADAUSDT',
  'bsc_DOT': 'DOTUSDT',
  'bsc_LINK': 'LINKUSDT',
  'bsc_UNI': 'UNIUSDT',
  'bsc_AAVE': 'AAVEUSDT',
  'bsc_ETH': 'ETHUSDT', // Binance-Peg Ethereum Token
  
  // BSC specific tokens and Binance-Peg tokens
  'BSC-USD': 'BUSDUSDT', // BSC-USD stays as BSC-USD, priced like BUSD
  'Binance-Peg BSC-USD': 'BUSDUSDT',
  'Binance-Peg Ethereum Token': 'ETHUSDT',
  'Binance-Peg BUSD Token': 'BUSDUSDT',
  'Binance-Peg USD Coin': 'USDCUSDT',
  'Binance-Peg Cardano Token': 'ADAUSDT',
  'Binance-Peg Polkadot Token': 'DOTUSDT',
  'Binance-Peg ChainLink Token': 'LINKUSDT',
  'Binance-Peg Uniswap': 'UNIUSDT',
  'Binance-Peg Aave Token': 'AAVEUSDT',
  'Binance-Peg Bitcoin': 'BTCUSDT',
  'Binance-Peg Bitcoin Cash': 'BCHUSDT',
  'Binance-Peg Litecoin': 'LTCUSDT',
  'Binance-Peg Dogecoin': 'DOGEUSDT',
  'Binance-Peg Polygon': 'POLUSDT', // MATIC migrated to POL
  'Binance-Peg Avalanche': 'AVAXUSDT',
  'Binance-Peg Solana': 'SOLUSDT',
  'Binance-Peg XRP Token': 'XRPUSDT',
  
  // Common token symbols (both full names and short names)
  'BTC': 'BTCUSDT',
  'BTCB': 'BTCUSDT', // Bitcoin BEP20
  'BCH': 'BCHUSDT', // Bitcoin Cash
  'ETH': 'ETHUSDT',
  'BNB': 'BNBUSDT',
  'ADA': 'ADAUSDT',
  'SOL': 'SOLUSDT',
  'MATIC': 'POLUSDT', // MATIC migrated to POL in September 2024
  'AVAX': 'AVAXUSDT',
  'LTC': 'LTCUSDT',
  'DOGE': 'DOGEUSDT',
  'XRP': 'XRPUSDT',
  'SHIB': 'SHIBUSDT',
  'DOT': 'DOTUSDT',
  'LINK': 'LINKUSDT',
  'UNI': 'UNIUSDT',
  'AAVE': 'AAVEUSDT',
  'USDC': 'USDCUSDT',
  'BUSD': 'BUSDUSDT'
}

// Cache for price data (5 minutes)
const priceCache: Map<string, { price: number; timestamp: number }> = new Map()
const CACHE_DURATION = 5 * 60 * 1000 // 5 minutes

interface BinancePriceResponse {
  symbol: string
  price?: string
  lastPrice?: string
  priceChange: string
  priceChangePercent: string
}

/**
 * Get the native currency symbol for a network
 */
export function getNativeCurrencySymbol(network: keyof typeof NETWORKS): string {
  switch (network) {
    case 'BSC_MAINNET':
    case 'BSC_TESTNET':
      return 'BNB'
    case 'ETHEREUM':
      return 'ETH'
    default:
      return 'ETH'
  }
}

/**
 * Get Binance trading pair symbol for a token
 */
function getBinanceSymbol(tokenSymbol: string, network: keyof typeof NETWORKS): string {
  // Special case: if tokenSymbol already ends with USDT, return as is
  if (tokenSymbol.toUpperCase().endsWith('USDT')) {
    return tokenSymbol.toUpperCase()
  }
  
  // Try network-specific mapping first
  const networkKey = `${network.toLowerCase()}_${tokenSymbol}`
  if (TOKEN_SYMBOL_MAP[networkKey]) {
    return TOKEN_SYMBOL_MAP[networkKey]
  }
  
  // Try direct mapping
  if (TOKEN_SYMBOL_MAP[tokenSymbol]) {
    return TOKEN_SYMBOL_MAP[tokenSymbol]
  }
  
  // Default: append USDT
  return `${tokenSymbol}USDT`
}

/**
 * Fetch token price from Binance API
 */
export async function fetchTokenPrice(tokenSymbol: string, network: keyof typeof NETWORKS = 'BSC_MAINNET'): Promise<number> {
  const binanceSymbol = getBinanceSymbol(tokenSymbol, network)
  
  console.log(`[PRICE DEBUG] Fetching price for token: ${tokenSymbol}, network: ${network} -> binanceSymbol: ${binanceSymbol}`)
  
  // Check cache first
  const cached = priceCache.get(binanceSymbol)
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    console.log(`[PRICE DEBUG] Using cached price for ${binanceSymbol}: $${cached.price}`)
    return cached.price
  }

  try {
    // Special case for stablecoins - always return 1
    if (['USDT', 'USDC', 'BUSD', 'DAI', 'BSC-USD'].includes(tokenSymbol.toUpperCase())) {
      const price = 1.0
      priceCache.set(binanceSymbol, { price, timestamp: Date.now() })
      console.log(`[PRICE DEBUG] Stablecoin price for ${tokenSymbol}: $${price}`)
      return price
    }

    const apiUrl = `${BINANCE_API_URL}?symbol=${binanceSymbol}`
    console.log(`[PRICE DEBUG] Making Binance API call: ${apiUrl}`)
    
    const response = await fetch(apiUrl)
    console.log(`[PRICE DEBUG] API Response status: ${response.status}`)
    
    if (!response.ok) {
      console.error(`[PRICE DEBUG] Binance API error: ${response.status} ${response.statusText}`)
      throw new Error(`Binance API error: ${response.status}`)
    }

    const data: BinancePriceResponse = await response.json()
    console.log(`[PRICE DEBUG] API Response data:`, data)
    
    // Binance 24hr ticker API uses 'lastPrice' field, not 'price'
    const price = parseFloat(data.lastPrice || data.price || '0')
    console.log(`[PRICE DEBUG] Parsed price for ${binanceSymbol}: $${price}`)

    // Cache the result
    priceCache.set(binanceSymbol, { price, timestamp: Date.now() })
    
    return price

  } catch (error) {
    console.error(`[PRICE DEBUG] Error fetching price for ${tokenSymbol}:`, error)
    
    // Return cached value if available, even if expired
    if (cached) {
      console.log(`[PRICE DEBUG] Using expired cache for ${binanceSymbol}: $${cached.price}`)
      return cached.price
    }
    
    // Fallback: return 0 for unknown tokens
    console.log(`[PRICE DEBUG] Fallback price for ${tokenSymbol}: $0`)
    return 0
  }
}

/**
 * Calculate USDT value for a token amount
 */
export async function calculateUSDTValue(
  amount: string | number,
  tokenSymbol: string,
  network: keyof typeof NETWORKS = 'BSC_MAINNET'
): Promise<{
  usdtValue: number
  price: number
  formattedValue: string
}> {
  const tokenAmount = typeof amount === 'string' ? parseFloat(amount) : amount
  
  if (isNaN(tokenAmount) || tokenAmount <= 0) {
    return {
      usdtValue: 0,
      price: 0,
      formattedValue: '$0.00'
    }
  }

  try {
    const price = await fetchTokenPrice(tokenSymbol, network)
    const usdtValue = tokenAmount * price
    
    return {
      usdtValue,
      price,
      formattedValue: formatUSDT(usdtValue)
    }
  } catch (error) {
    console.error('Error calculating USDT value:', error)
    return {
      usdtValue: 0,
      price: 0,
      formattedValue: '$0.00'
    }
  }
}

/**
 * Format USDT value for display
 */
export function formatUSDT(value: number): string {
  if (value === 0) return '$0.00'
  
  if (value < 0.01) {
    return `$${value.toFixed(6)}`
  } else if (value < 1) {
    return `$${value.toFixed(4)}`
  } else if (value < 1000) {
    return `$${value.toFixed(2)}`
  } else if (value < 1000000) {
    return `$${(value / 1000).toFixed(2)}K`
  } else {
    return `$${(value / 1000000).toFixed(2)}M`
  }
}

/**
 * Get multiple token prices at once (batch request)
 */
export async function fetchMultipleTokenPrices(
  tokens: Array<{ symbol: string; network: keyof typeof NETWORKS }>
): Promise<Record<string, number>> {
  const results: Record<string, number> = {}
  
  // Group unique symbols
  const uniqueSymbols = new Set(tokens.map(t => getBinanceSymbol(t.symbol, t.network)))
  
  try {
    // Fetch all prices in parallel
    const pricePromises = Array.from(uniqueSymbols).map(async (binanceSymbol) => {
      const tokenSymbol = binanceSymbol.replace('USDT', '')
      const network = tokens.find(t => getBinanceSymbol(t.symbol, t.network) === binanceSymbol)?.network || 'BSC_MAINNET'
      
      const price = await fetchTokenPrice(tokenSymbol, network)
      return { symbol: binanceSymbol, price }
    })

    const prices = await Promise.all(pricePromises)
    
    prices.forEach(({ symbol, price }) => {
      results[symbol] = price
    })

  } catch (error) {
    console.error('Error fetching multiple token prices:', error)
  }

  return results
}

/**
 * Clear price cache (for testing or manual refresh)
 */
export function clearPriceCache(): void {
  priceCache.clear()
} 