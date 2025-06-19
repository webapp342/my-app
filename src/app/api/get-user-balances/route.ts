import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// All supported tokens in the application
const SUPPORTED_TOKENS = [
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
];

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const address = searchParams.get('address');
    const username = searchParams.get('username');
    const userId = searchParams.get('userId');

    if (!address && !username && !userId) {
      return NextResponse.json(
        { error: 'Address, username, or userId is required' },
        { status: 400 }
      );
    }

    const tokenSymbol = searchParams.get('tokenSymbol');

    let query = supabase
      .from('user_balances')
      .select('balance, token_symbol, wallet_address, user_id')
      .eq('network', 'BSC_MAINNET')
      .in('token_symbol', SUPPORTED_TOKENS); // Only supported tokens

    // If tokenSymbol is specified, filter by it, otherwise get all tokens
    if (tokenSymbol) {
      query = query.eq('token_symbol', tokenSymbol);
    }

    if (address) {
      query = query.eq('wallet_address', address);
    } else if (username) {
      // First get user_id from username
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('id')
        .eq('username', username)
        .single();

      if (userError || !userData) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
      }

      query = query.eq('user_id', userData.id);
    } else if (userId) {
      query = query.eq('user_id', userId);
    }

    // If tokenSymbol is specified, get single record, otherwise get all
    let balanceData, error;
    if (tokenSymbol) {
      const result = await query.single();
      balanceData = result.data;
      error = result.error;
    } else {
      const result = await query;
      balanceData = result.data;
      error = result.error;
    }

    if (error) {
      console.error('Database error:', error);
      if (tokenSymbol) {
        return NextResponse.json({
          success: true,
          balance: '0',
          message: `No ${tokenSymbol} balance found in database`,
        });
      } else {
        return NextResponse.json({
          success: true,
          balances: [],
          message: 'No balances found in database',
        });
      }
    }

    // Return single balance or all balances based on request
    if (tokenSymbol) {
      // balanceData is single object for tokenSymbol queries
      const singleBalance = balanceData as {
        balance: string;
        wallet_address: string;
      } | null;
      return NextResponse.json({
        success: true,
        balance: singleBalance?.balance?.toString() || '0',
        token_symbol: tokenSymbol,
        wallet_address: singleBalance?.wallet_address,
      });
    } else {
      // balanceData is array for all tokens queries
      const balanceArray = balanceData as
        | {
            token_symbol: string;
            balance: string;
            wallet_address: string;
            user_id: string;
          }[]
        | null;

      // Create a complete list with all supported tokens (0 balance if not found)
      const completeBalances = SUPPORTED_TOKENS.map(token => {
        const existingBalance = balanceArray?.find(
          b => b.token_symbol === token
        );
        return {
          token_symbol: token,
          balance: existingBalance?.balance || '0',
          wallet_address: existingBalance?.wallet_address || address || '',
          user_id: existingBalance?.user_id || userId,
          network: 'BSC_MAINNET',
        };
      });

      return NextResponse.json({
        success: true,
        balances: completeBalances,
      });
    }
  } catch (error) {
    console.error('Get user balance error:', error);
    return NextResponse.json(
      { error: 'Failed to get user balance' },
      { status: 500 }
    );
  }
}
