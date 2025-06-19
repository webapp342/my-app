import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const address = searchParams.get('address');

    if (!address) {
      return NextResponse.json(
        { error: 'Address is required' },
        { status: 400 }
      );
    }

    // Find user by wallet address (case insensitive)
    const { data: walletData, error } = await supabase
      .from('wallets')
      .select('user_id')
      .ilike('address', address)
      .single();

    if (error) {
      console.error('[GET USER ID] Database error:', error);
      return NextResponse.json({ error: 'Wallet not found' }, { status: 404 });
    }

    return NextResponse.json({
      userId: walletData.user_id,
    });
  } catch (error) {
    console.error('[GET USER ID] API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
