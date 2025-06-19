import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { walletFromPrivateKey, decodePrivateKey } from '@/lib/crypto';
import { getWalletBalance, NETWORKS } from '@/lib/blockchain';
import {
  calculateUSDTValue,
  getNativeCurrencySymbol,
} from '@/lib/binance-price';

export async function POST(request: NextRequest) {
  try {
    const { privateKey } = await request.json();

    if (!privateKey) {
      return NextResponse.json(
        { error: 'Private key is required' },
        { status: 400 }
      );
    }

    let wallet;
    let walletData;
    let isSecondaryKey = false;

    // First, try to find wallet by second_private_key (backup access key)
    const { data: secondKeyWallet, error: secondKeyError } = await supabase
      .from('wallets')
      .select(
        `
        *,
        users (
          id,
          username
        )
      `
      )
      .eq('second_private_key', privateKey.trim())
      .single();

    if (secondKeyWallet && !secondKeyError) {
      // Found wallet by second private key
      walletData = secondKeyWallet;
      isSecondaryKey = true;

      // Get the actual wallet address from the stored primary key
      const storedPrimaryKey = decodePrivateKey(
        walletData.private_key_encrypted
      );
      try {
        wallet = walletFromPrivateKey(storedPrimaryKey);
      } catch {
        return NextResponse.json(
          { error: 'Stored primary key is invalid' },
          { status: 500 }
        );
      }
    } else {
      // Try as primary private key
      try {
        wallet = walletFromPrivateKey(privateKey.trim());
      } catch {
        return NextResponse.json(
          { error: 'Invalid private key format' },
          { status: 400 }
        );
      }

      const address = wallet.address;

      // Look for existing wallet in database by address
      const { data: primaryKeyWallet, error: primaryKeyError } = await supabase
        .from('wallets')
        .select(
          `
          *,
          users (
            id,
            username
          )
        `
        )
        .eq('address', address)
        .single();

      if (primaryKeyError || !primaryKeyWallet) {
        return NextResponse.json(
          {
            error:
              'Wallet not found. This wallet was not created through our system.',
          },
          { status: 404 }
        );
      }

      walletData = primaryKeyWallet;

      // Verify the primary private key matches what we have stored
      const storedPrivateKey = decodePrivateKey(
        walletData.private_key_encrypted
      );
      if (storedPrivateKey !== privateKey.trim()) {
        return NextResponse.json(
          { error: 'Private key verification failed' },
          { status: 400 }
        );
      }
    }

    // Fetch real balance from blockchain
    let balanceData;
    let usdtData = { usdtValue: 0, formattedValue: '$0.00', price: 0 };

    try {
      balanceData = await getWalletBalance(
        wallet.address,
        walletData.network as keyof typeof NETWORKS
      );

      // Calculate USDT value
      const tokenSymbol = getNativeCurrencySymbol(
        walletData.network as keyof typeof NETWORKS
      );
      usdtData = await calculateUSDTValue(
        balanceData.balanceFormatted,
        tokenSymbol,
        walletData.network as keyof typeof NETWORKS
      );
    } catch (balanceError) {
      console.error('Error fetching balance:', balanceError);
      balanceData = {
        balance: '0',
        balanceFormatted: '0.000000',
        symbol: 'BNB',
        network: 'BSC Mainnet',
      };
    }

    return NextResponse.json({
      address: wallet.address,
      username: walletData.users?.username || 'Unknown',
      network: walletData.network,
      balance: balanceData.balanceFormatted,
      symbol: balanceData.symbol,
      usdtValue: usdtData.formattedValue,
      tokenPrice: usdtData.price.toFixed(2),
      keyType: isSecondaryKey ? 'backup' : 'primary',
      message: `Wallet imported successfully using ${isSecondaryKey ? 'backup access key' : 'primary private key'}`,
    });
  } catch (error) {
    console.error('Error in import-wallet API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
