import { FormattedUserTransaction } from './user-transaction';
import { FormattedVirtualCardTransaction, AssetsUsedDetail } from './virtual-card-transaction';

// Unified transaction type - her iki transaction türünü destekler
export interface UnifiedTransaction {
  id: string;
  type: string;
  amount: number;
  timestamp: string;
  amountFormatted: string;
  dateFormatted: string;
  typeFormatted: string;
  category: 'user_transaction' | 'virtual_card';
  displayName: string;

  // User transaction specific fields
  hash?: string;
  token?: string;
  tokenAddress?: string;
  network?: string;
  blockNumber?: number;
  walletAddress?: string;

  // Virtual card transaction specific fields
  cardId?: string;
  currency?: string;
  merchantName?: string;
  merchantCategory?: string;
  description?: string;
  status?: string;
  statusFormatted?: string;
  purchaseId?: string;
  bnbPriceAtPurchase?: number;
  transactionDirection?: 'TOKEN_IN' | 'TOKEN_OUT';
  // Asset tracking fields - hangi varlık kullanıldığı ve USD karşılığı
  assetSymbol?: string; // BNB, USDC, USDT vs. hangi varlık kullanıldı
  assetAmount?: number; // Kullanılan varlık miktarı (örn: 0.05 BNB)
  assetUsdValue?: number; // Kullanılan varlığın o anki USD değeri (örn: $30.50)
  assetPricePerUnit?: number; // Birim fiyat (örn: BNB = $610.00)
  // Ek checkout bilgileri
  paymentMethod?: 'MULTI_ASSET' | 'SINGLE_ASSET'; // Ödeme yöntemi
  primaryAssetSymbol?: string; // Ana kullanılan varlık
  assetsUsed?: AssetsUsedDetail[]; // Parsed assets_used JSON
  // Asset tracking için formatted değerler
  assetFormatted?: string; // "0.050000 BNB" gibi
  assetUsdFormatted?: string; // "$30.50" gibi
  paymentMethodFormatted?: string; // "Multiple Assets" veya "Single Asset"
  metadata?: Record<string, unknown>;
}

// Helper function to convert user transaction to unified format
export function userTransactionToUnified(tx: FormattedUserTransaction): UnifiedTransaction {
  return {
    id: tx.id,
    type: tx.type,
    amount: tx.amount,
    timestamp: tx.timestamp,
    amountFormatted: tx.amountFormatted,
    dateFormatted: tx.dateFormatted,
    typeFormatted: tx.typeFormatted,
    category: 'user_transaction',
    displayName: `${tx.typeFormatted} ${tx.token}`,

    // User transaction specific
    hash: tx.hash,
    token: tx.token,
    tokenAddress: tx.tokenAddress,
    network: tx.network,
    blockNumber: tx.blockNumber,
    walletAddress: tx.walletAddress
  };
}

// Helper function to convert virtual card transaction to unified format
export function virtualCardTransactionToUnified(tx: FormattedVirtualCardTransaction): UnifiedTransaction {
  return {
    id: tx.id,
    type: tx.type,
    amount: tx.amount,
    timestamp: tx.timestamp,
    amountFormatted: tx.amountFormatted,
    dateFormatted: tx.dateFormatted,
    typeFormatted: tx.typeFormatted,
    category: 'virtual_card',
    displayName: tx.displayName,

    // Virtual card transaction specific
    cardId: tx.cardId,
    currency: tx.currency,
    merchantName: tx.merchantName,
    merchantCategory: tx.merchantCategory,
    description: tx.description,
    status: tx.status,
    statusFormatted: tx.statusFormatted,
    purchaseId: tx.purchaseId,
    bnbPriceAtPurchase: tx.bnbPriceAtPurchase,
    transactionDirection: tx.transactionDirection,
    // Asset tracking fields
    assetSymbol: tx.assetSymbol,
    assetAmount: tx.assetAmount,
    assetUsdValue: tx.assetUsdValue,
    assetPricePerUnit: tx.assetPricePerUnit,
    // Payment method fields
    paymentMethod: tx.paymentMethod,
    primaryAssetSymbol: tx.primaryAssetSymbol,
    assetsUsed: tx.assetsUsed,
    // Formatted values
    assetFormatted: tx.assetFormatted,
    assetUsdFormatted: tx.assetUsdFormatted,
    paymentMethodFormatted: tx.paymentMethodFormatted,
    metadata: tx.metadata
  };
}

// Helper function to merge and sort transactions by date
export function mergeAndSortTransactions(
  userTransactions: FormattedUserTransaction[],
  virtualCardTransactions: FormattedVirtualCardTransaction[]
): UnifiedTransaction[] {
  const userTxs = userTransactions.map(userTransactionToUnified);
  const cardTxs = virtualCardTransactions.map(virtualCardTransactionToUnified);

  const allTransactions = [...userTxs, ...cardTxs];

  // Sort by timestamp (newest first)
  return allTransactions.sort((a, b) =>
    new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );
} 