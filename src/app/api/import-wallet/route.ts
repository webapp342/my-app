import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { walletFromPrivateKey, decodePrivateKey } from '@/lib/crypto'
import { getWalletBalance, NETWORKS } from '@/lib/blockchain'
import { calculateUSDTValue, getNativeCurrencySymbol } from '@/lib/binance-price'

export async function POST(request: NextRequest) {
  try {
    const { privateKey } = await request.json()

    if (!privateKey) {
      return NextResponse.json(
        { error: 'Private key is required' },
        { status: 400 }
      )
    }

    let wallet
    try {
      // Try to reconstruct wallet from private key using Ethers.js v6
      wallet = walletFromPrivateKey(privateKey.trim())
    } catch {
      return NextResponse.json(
        { error: 'Invalid private key format' },
        { status: 400 }
      )
    }

    const address = wallet.address

    // Look for existing wallet in database
    const { data: walletData, error: walletError } = await supabase
      .from('wallets')
      .select(`
        *,
        users (
          id,
          username
        )
      `)
      .eq('address', address)
      .single()

    if (walletError || !walletData) {
      return NextResponse.json(
        { error: 'Wallet not found. This wallet was not created through our system.' },
        { status: 404 }
      )
    }

    // Verify the private key matches what we have stored
    const storedPrivateKey = decodePrivateKey(walletData.private_key_encrypted)
    if (storedPrivateKey !== privateKey.trim()) {
      return NextResponse.json(
        { error: 'Private key verification failed' },
        { status: 400 }
      )
    }

    // Fetch real balance from blockchain
    let balanceData
    let usdtData = { usdtValue: 0, formattedValue: '$0.00', price: 0 }
    
    try {
      balanceData = await getWalletBalance(address, walletData.network as keyof typeof NETWORKS)
      
      // Calculate USDT value
      const tokenSymbol = getNativeCurrencySymbol(walletData.network as keyof typeof NETWORKS)
      usdtData = await calculateUSDTValue(
        balanceData.balanceFormatted,
        tokenSymbol,
        walletData.network as keyof typeof NETWORKS
      )
    } catch (balanceError) {
      console.error('Error fetching balance:', balanceError)
      balanceData = {
        balance: '0',
        balanceFormatted: '0.000000',
        symbol: 'BNB',
        network: 'BSC Mainnet'
      }
    }

    return NextResponse.json({
      address,
      username: walletData.users?.username || 'Unknown',
      network: walletData.network,
      balance: balanceData.balanceFormatted,
      symbol: balanceData.symbol,
      usdtValue: usdtData.formattedValue,
      tokenPrice: usdtData.price.toFixed(2),
      message: 'Wallet imported successfully'
    })

  } catch (error) {
    console.error('Error in import-wallet API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 