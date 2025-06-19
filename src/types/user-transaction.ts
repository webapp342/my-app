export interface UserTransaction {
  id: string;
  user_id: string;
  wallet_address: string;
  transaction_hash: string;
  transaction_type: 'deposit' | 'token_in' | 'withdraw' | 'token_out';
  amount: number;
  token_symbol: string;
  token_address?: string;
  network: string;
  block_number?: number;
  transaction_date: string;
  created_at: string;
}

export interface FormattedUserTransaction {
  id: string;
  hash: string;
  type: string;
  amount: number;
  token: string;
  tokenAddress?: string;
  network: string;
  blockNumber?: number;
  timestamp: string;
  createdAt: string;
  walletAddress: string;
  amountFormatted: string;
  dateFormatted: string;
  typeFormatted: string;
}

export interface UserTransactionResponse {
  success: boolean;
  transactions: FormattedUserTransaction[];
  total: number;
  hasMore: boolean;
}

export interface CreateUserTransactionRequest {
  userId: string;
  walletAddress: string;
  transactionHash: string;
  transactionType: 'deposit' | 'token_in' | 'withdraw' | 'token_out';
  amount: number;
  tokenSymbol: string;
  tokenAddress?: string;
  network?: string;
  blockNumber?: number;
  transactionDate?: string;
}
