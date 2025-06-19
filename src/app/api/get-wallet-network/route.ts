import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const address = searchParams.get('address');

    if (!address) {
      return NextResponse.json(
        { error: 'Address parameter is required' },
        { status: 400 }
      );
    }

    // Query wallets table to find network for this address (case insensitive)
    const { data: walletData, error } = await supabase
      .from('wallets')
      .select('network')
      .ilike('address', address.trim())
      .single();

    if (error || !walletData) {
      return NextResponse.json(
        { error: 'Wallet not found in database' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      network: walletData.network,
      address: address.trim(),
    });
  } catch (error) {
    console.error('[GET WALLET NETWORK] Error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
