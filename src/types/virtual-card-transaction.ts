export interface VirtualCardTransaction {
    id: string;
    card_id: string;
    user_id: string;
    transaction_type: 'PURCHASE' | 'REFUND' | 'LOAD' | 'WITHDRAWAL';
    amount: number;
    currency: string;
    merchant_name?: string;
    merchant_category?: string;
    description?: string;
    status: 'PENDING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
    transaction_date: string;
    created_at: string;
    purchase_id?: string;
    bnb_price_at_purchase?: number;
    transaction_direction?: 'TOKEN_IN' | 'TOKEN_OUT';
    // Asset tracking fields - hangi varlık kullanıldığı ve USD karşılığı
    asset_symbol?: string; // BNB, USDC, USDT vs. hangi varlık kullanıldı
    asset_amount?: number; // Kullanılan varlık miktarı (örn: 0.05 BNB)
    asset_usd_value?: number; // Kullanılan varlığın o anki USD değeri (örn: $30.50)
    asset_price_per_unit?: number; // Birim fiyat (örn: BNB = $610.00)
    // Ek checkout bilgileri
    payment_method?: 'MULTI_ASSET' | 'SINGLE_ASSET'; // Ödeme yöntemi
    primary_asset_symbol?: string; // Ana kullanılan varlık
    assets_used?: string; // JSON string - birden fazla varlık kullanıldıysa detaylar
    metadata?: Record<string, unknown>;
}

export interface FormattedVirtualCardTransaction {
    id: string;
    cardId: string;
    userId: string;
    type: string;
    amount: number;
    currency: string;
    merchantName?: string;
    merchantCategory?: string;
    description?: string;
    status: string;
    timestamp: string;
    createdAt: string;
    purchaseId?: string;
    bnbPriceAtPurchase?: number;
    transactionDirection?: 'TOKEN_IN' | 'TOKEN_OUT'; // Token akış yönü
    // Asset tracking fields - hangi varlık kullanıldığı ve USD karşılığı
    assetSymbol?: string; // BNB, USDC, USDT vs. hangi varlık kullanıldı
    assetAmount?: number; // Kullanılan varlık miktarı (örn: 0.05 BNB)
    assetUsdValue?: number; // Kullanılan varlığın o anki USD değeri (örn: $30.50)
    assetPricePerUnit?: number; // Birim fiyat (örn: BNB = $610.00)
    // Ek checkout bilgileri
    paymentMethod?: 'MULTI_ASSET' | 'SINGLE_ASSET'; // Ödeme yöntemi
    primaryAssetSymbol?: string; // Ana kullanılan varlık
    assetsUsed?: AssetsUsedDetail[]; // Parsed assets_used JSON
    metadata?: Record<string, unknown>;
    amountFormatted: string;
    dateFormatted: string;
    typeFormatted: string;
    statusFormatted: string;
    // Asset tracking için formatted değerler
    assetFormatted?: string; // "0.050000 BNB" gibi
    assetUsdFormatted?: string; // "$30.50" gibi
    paymentMethodFormatted?: string; // "Multiple Assets" veya "Single Asset"
    category: 'virtual_card';
    displayName: string;
}

// Yeni interface - assets_used detayları için
export interface AssetsUsedDetail {
    symbol: string;
    amount: number;
    price: number;
    usdValue: number;
}

export interface VirtualCardTransactionResponse {
    success: boolean;
    transactions: FormattedVirtualCardTransaction[];
    total: number;
    hasMore: boolean;
}

export interface CreateVirtualCardTransactionRequest {
    cardId: string;
    userId: string;
    transactionType: 'PURCHASE' | 'REFUND' | 'LOAD' | 'WITHDRAWAL';
    amount: number;
    currency?: string;
    merchantName?: string;
    merchantCategory?: string;
    description?: string;
    status?: 'PENDING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
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
    assetsUsed?: AssetsUsedDetail[]; // Birden fazla varlık kullanıldıysa detaylar
    metadata?: Record<string, unknown>;
}
