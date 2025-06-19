import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const userId = searchParams.get('userId');
        const cardId = searchParams.get('cardId');
        const limit = parseInt(searchParams.get('limit') || '10');
        const offset = parseInt(searchParams.get('offset') || '0');

        // userId veya cardId'den biri gerekli
        if (!userId && !cardId) {
            return NextResponse.json(
                { error: 'userId or cardId parameter is required' },
                { status: 400 }
            );
        }

        let query = supabase
            .from('virtual_card_transactions')
            .select(`
        id,
        card_id,
        user_id,
        transaction_type,
        amount,
        currency,
        merchant_name,
        merchant_category,
        description,
        status,
        transaction_date,
        created_at,
        purchase_id,
        bnb_price_at_purchase,
        transaction_direction,
        asset_symbol,
        asset_amount,
        asset_usd_value,
        asset_price_per_unit,
        payment_method,
        primary_asset_symbol,
        assets_used,
        metadata
      `)
            .order('transaction_date', { ascending: false })
            .range(offset, offset + limit - 1);

        // userId veya cardId'e göre filtrele
        if (userId) {
            query = query.eq('user_id', userId);
        } else if (cardId) {
            query = query.eq('card_id', cardId);
        }

        const { data: transactions, error } = await query;

        if (error) {
            console.error('Supabase error:', error);
            return NextResponse.json(
                { error: 'Failed to fetch virtual card transactions' },
                { status: 500 }
            );
        }

        // Transaction'ları frontend'e uygun formata çevir
        const formattedTransactions = transactions?.map(tx => ({
            id: tx.id,
            cardId: tx.card_id,
            userId: tx.user_id,
            type: tx.transaction_type,
            amount: parseFloat(tx.amount),
            currency: tx.currency,
            merchantName: tx.merchant_name,
            merchantCategory: tx.merchant_category,
            description: tx.description,
            status: tx.status,
            timestamp: tx.transaction_date,
            createdAt: tx.created_at,
            purchaseId: tx.purchase_id,
            bnbPriceAtPurchase: tx.bnb_price_at_purchase ? parseFloat(tx.bnb_price_at_purchase) : null,
            transactionDirection: tx.transaction_direction,
            // Asset tracking fields
            assetSymbol: tx.asset_symbol,
            assetAmount: tx.asset_amount ? parseFloat(tx.asset_amount) : null,
            assetUsdValue: tx.asset_usd_value ? parseFloat(tx.asset_usd_value) : null,
            assetPricePerUnit: tx.asset_price_per_unit ? parseFloat(tx.asset_price_per_unit) : null,
            // Payment method fields
            paymentMethod: tx.payment_method,
            primaryAssetSymbol: tx.primary_asset_symbol,
            assetsUsed: tx.assets_used ? JSON.parse(tx.assets_used) : null,
            metadata: tx.metadata,
            // UI için formatted değerler
            amountFormatted: `${parseFloat(tx.amount).toFixed(2)} ${tx.currency}`,
            dateFormatted: new Date(tx.transaction_date).toLocaleDateString('en-US', {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            }),
            typeFormatted: tx.transaction_type === 'PURCHASE' ? 'Purchase' :
                tx.transaction_type === 'REFUND' ? 'Refund' :
                    tx.transaction_type === 'LOAD' ? 'Load Card' :
                        tx.transaction_type === 'WITHDRAWAL' ? 'Withdrawal' : tx.transaction_type,
            statusFormatted: tx.status === 'COMPLETED' ? 'Completed' :
                tx.status === 'PENDING' ? 'Pending' :
                    tx.status === 'FAILED' ? 'Failed' :
                        tx.status === 'CANCELLED' ? 'Cancelled' : tx.status,
            // Asset tracking için formatted değerler
            assetFormatted: tx.asset_symbol && tx.asset_amount ?
                `${parseFloat(tx.asset_amount).toFixed(6)} ${tx.asset_symbol}` : null,
            assetUsdFormatted: tx.asset_usd_value ?
                `$${parseFloat(tx.asset_usd_value).toFixed(2)}` : null,
            paymentMethodFormatted: tx.payment_method === 'MULTI_ASSET' ? 'Multiple Assets' :
                tx.payment_method === 'SINGLE_ASSET' ? 'Single Asset' : 'Unknown',
            // Transaction kategorisi için
            category: 'virtual_card',
            displayName: tx.merchant_name || tx.description || 'Card Transaction'
        })) || [];

        return NextResponse.json({
            success: true,
            transactions: formattedTransactions,
            total: formattedTransactions.length,
            hasMore: formattedTransactions.length === limit
        });

    } catch (error) {
        console.error('Error in virtual-card-transactions API:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const {
            cardId,
            userId,
            transactionType,
            amount,
            currency = 'USD',
            merchantName,
            merchantCategory,
            description,
            status = 'PENDING',
            purchaseId,
            bnbPriceAtPurchase,
            metadata
        } = body;

        // Gerekli alanları kontrol et
        if (!cardId || !userId || !transactionType || !amount) {
            return NextResponse.json(
                { error: 'Missing required fields: cardId, userId, transactionType, amount' },
                { status: 400 }
            );
        }

        // Transaction type kontrolü
        const validTypes = ['PURCHASE', 'REFUND', 'LOAD', 'WITHDRAWAL'];
        if (!validTypes.includes(transactionType)) {
            return NextResponse.json(
                { error: 'Invalid transaction type' },
                { status: 400 }
            );
        }

        // Status kontrolü
        const validStatuses = ['PENDING', 'COMPLETED', 'FAILED', 'CANCELLED'];
        if (!validStatuses.includes(status)) {
            return NextResponse.json(
                { error: 'Invalid status' },
                { status: 400 }
            );
        }

        // Transaction'ı veritabanına kaydet
        const { data, error } = await supabase
            .from('virtual_card_transactions')
            .insert({
                card_id: cardId,
                user_id: userId,
                transaction_type: transactionType,
                amount: amount,
                currency: currency,
                merchant_name: merchantName,
                merchant_category: merchantCategory,
                description: description,
                status: status,
                purchase_id: purchaseId,
                bnb_price_at_purchase: bnbPriceAtPurchase,
                metadata: metadata
            })
            .select()
            .single();

        if (error) {
            console.error('Supabase insert error:', error);
            return NextResponse.json(
                { error: 'Failed to save virtual card transaction' },
                { status: 500 }
            );
        }

        return NextResponse.json({
            success: true,
            transaction: data
        });

    } catch (error) {
        console.error('Error in virtual-card-transactions POST:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
} 