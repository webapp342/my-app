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
    const walletAddress = searchParams.get('walletAddress');
    const limit = parseInt(searchParams.get('limit') || '10');
    const offset = parseInt(searchParams.get('offset') || '0');

    // userId veya walletAddress'den biri gerekli
    if (!userId && !walletAddress) {
      return NextResponse.json(
        { error: 'userId or walletAddress parameter is required' },
        { status: 400 }
      );
    }

    let query = supabase
      .from('user_transactions')
      .select(`
        id,
        transaction_hash,
        transaction_type,
        amount,
        token_symbol,
        token_address,
        network,
        block_number,
        transaction_date,
        created_at,
        wallet_address
      `)
      .order('transaction_date', { ascending: false })
      .range(offset, offset + limit - 1);

    // userId veya walletAddress'e göre filtrele
    if (userId) {
      query = query.eq('user_id', userId);
    } else if (walletAddress) {
      query = query.eq('wallet_address', walletAddress);
    }

    const { data: transactions, error } = await query;

    if (error) {
      console.error('Supabase error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch user transactions' },
        { status: 500 }
      );
    }

    // Transaction'ları frontend'e uygun formata çevir
    const formattedTransactions = transactions?.map(tx => ({
      id: tx.id,
      hash: tx.transaction_hash,
      type: tx.transaction_type,
      amount: parseFloat(tx.amount),
      token: tx.token_symbol,
      tokenAddress: tx.token_address,
      network: tx.network,
      blockNumber: tx.block_number,
      timestamp: tx.transaction_date,
      createdAt: tx.created_at,
      walletAddress: tx.wallet_address,
      // UI için formatted değerler
      amountFormatted: `${parseFloat(tx.amount).toFixed(6)} ${tx.token_symbol}`,
      dateFormatted: new Date(tx.transaction_date).toLocaleDateString('en-US', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }),
      typeFormatted: tx.transaction_type === 'deposit' ? 'Received' :
        tx.transaction_type === 'withdraw' ? 'Sent' :
          tx.transaction_type === 'token_in' ? 'Token In' :
            tx.transaction_type === 'token_out' ? 'Token Out' : tx.transaction_type
    })) || [];

    return NextResponse.json({
      success: true,
      transactions: formattedTransactions,
      total: formattedTransactions.length,
      hasMore: formattedTransactions.length === limit
    });

  } catch (error) {
    console.error('Error in user-transactions API:', error);
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
      userId,
      walletAddress,
      transactionHash,
      transactionType,
      amount,
      tokenSymbol,
      tokenAddress,
      network,
      blockNumber,
      transactionDate
    } = body;

    // Gerekli alanları kontrol et
    if (!userId || !walletAddress || !transactionHash || !transactionType || !amount || !tokenSymbol) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Transaction type kontrolü
    const validTypes = ['deposit', 'token_in', 'withdraw', 'token_out'];
    if (!validTypes.includes(transactionType)) {
      return NextResponse.json(
        { error: 'Invalid transaction type' },
        { status: 400 }
      );
    }

    // Transaction'ı veritabanına kaydet
    const { data, error } = await supabase
      .from('user_transactions')
      .insert({
        user_id: userId,
        wallet_address: walletAddress,
        transaction_hash: transactionHash,
        transaction_type: transactionType,
        amount: amount,
        token_symbol: tokenSymbol,
        token_address: tokenAddress,
        network: network || 'BSC_MAINNET',
        block_number: blockNumber,
        transaction_date: transactionDate || new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      console.error('Supabase insert error:', error);

      // Unique constraint hatası için özel mesaj
      if (error.code === '23505') {
        return NextResponse.json(
          { error: 'Transaction already exists' },
          { status: 409 }
        );
      }

      return NextResponse.json(
        { error: 'Failed to save transaction' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      transaction: data
    });

  } catch (error) {
    console.error('Error in user-transactions POST:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 