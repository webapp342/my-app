// Supported tokens in the wallet application
export const SUPPORTED_TOKENS = [
  'BNB',
  'BSC-USD',
  'AAVE',
  'UNI',
  'LINK',
  'DOT',
  'ADA',
  'USDC',
  'BUSD',
  'SOL',
  'XRP',
  'DOGE',
  'LTC',
  'BCH',
  'MATIC',
  'SHIB',
  'AVAX',
  'BBLIP',
] as const;

export type SupportedToken = (typeof SUPPORTED_TOKENS)[number];

// Token display information
export const TOKEN_INFO: Record<
  string,
  { name: string; symbol: string; network: string }
> = {
  BNB: { name: 'BNB', symbol: 'BNB', network: 'BSC_MAINNET' },
  'BSC-USD': { name: 'BSC-USD', symbol: 'BSC-USD', network: 'BSC_MAINNET' },
  AAVE: { name: 'Aave', symbol: 'AAVE', network: 'BSC_MAINNET' },
  UNI: { name: 'Uniswap', symbol: 'UNI', network: 'BSC_MAINNET' },
  LINK: { name: 'Chainlink', symbol: 'LINK', network: 'BSC_MAINNET' },
  DOT: { name: 'Polkadot', symbol: 'DOT', network: 'BSC_MAINNET' },
  ADA: { name: 'Cardano', symbol: 'ADA', network: 'BSC_MAINNET' },
  USDC: { name: 'USD Coin', symbol: 'USDC', network: 'BSC_MAINNET' },
  BUSD: { name: 'BUSD', symbol: 'BUSD', network: 'BSC_MAINNET' },
  SOL: { name: 'Solana', symbol: 'SOL', network: 'BSC_MAINNET' },
  XRP: { name: 'XRP', symbol: 'XRP', network: 'BSC_MAINNET' },
  DOGE: { name: 'Dogecoin', symbol: 'DOGE', network: 'BSC_MAINNET' },
  LTC: { name: 'Litecoin', symbol: 'LTC', network: 'BSC_MAINNET' },
  BCH: { name: 'Bitcoin Cash', symbol: 'BCH', network: 'BSC_MAINNET' },
  MATIC: { name: 'Polygon', symbol: 'MATIC', network: 'BSC_MAINNET' },
  SHIB: { name: 'Shiba Inu', symbol: 'SHIB', network: 'BSC_MAINNET' },
  AVAX: { name: 'Avalanche', symbol: 'AVAX', network: 'BSC_MAINNET' },
  BBLIP: { name: 'BBLIP Token', symbol: 'BBLIP', network: 'BSC_MAINNET' },
};

// Stablecoins (always $1.00)
export const STABLECOINS = ['BSC-USD', 'USDC', 'BUSD'] as const;

// Check if a token is supported
export function isSupportedToken(token: string): token is SupportedToken {
  return SUPPORTED_TOKENS.includes(token as SupportedToken);
}
