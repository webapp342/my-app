// Transaction type definitions for the transaction explorer
export interface Transaction {
  hash: string
  timestamp: string // ISO string
  from: string
  to: string
  value: string // Formatted ETH/BNB amount
  type: 'deposit' | 'withdraw' | 'token_transfer'
  tokenSymbol?: string // For token transfers
  tokenAmount?: string // Formatted token amount
  tokenDecimals?: number
  gasUsed?: string
  gasPrice?: string
  blockNumber: number
  network: 'ethereum' | 'bsc'
}

// Raw transaction from ethers provider
export interface RawTransaction {
  hash: string
  blockNumber: number
  from: string
  to: string
  value: string
  timestamp: number
  gasUsed?: string
  gasPrice?: string
}

// ERC20 Transfer event structure
export interface TokenTransfer {
  hash: string
  from: string
  to: string
  tokenAddress: string
  tokenSymbol: string
  tokenName: string
  tokenDecimals: number
  amount: string
  formattedAmount: string
  blockNumber: number
  timestamp: number
}

// API response structure
export interface TransactionResponse {
  transactions: Transaction[]
  total: number
  page: number
  limit: number
  hasMore: boolean
  network: 'ethereum' | 'bsc'
}

// Network configuration
export interface NetworkConfig {
  name: string
  chainId: number
  nativeCurrency: string
  explorerUrl: string
  apiKey: string
} 