import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { createRandomWallet, encodePrivateKey } from '@/lib/crypto'
import { getWalletBalance } from '@/lib/blockchain'
import { calculateUSDTValue, getNativeCurrencySymbol } from '@/lib/binance-price'

export async function POST(request: NextRequest) {
  try {
    const { username, password, network = 'BSC_MAINNET' } = await request.json()

    if (!username || !password) {
      return NextResponse.json(
        { error: 'Username and password are required' },
        { status: 400 }
      )
    }

    // Check if username already exists
    const { data: existingUser } = await supabase
      .from('users')
      .select('username')
      .eq('username', username)
      .single()

    if (existingUser) {
      return NextResponse.json(
        { error: 'Username already exists' },
        { status: 400 }
      )
    }

    // Generate new wallet using Ethers.js v6
    const wallet = createRandomWallet()
    const address = wallet.address
    const privateKey = wallet.privateKey

    // Fetch real balance from blockchain
    let balanceData
    let usdtData = { usdtValue: 0, formattedValue: '$0.00', price: 0 }
    
    try {
      balanceData = await getWalletBalance(address, network as any)
      
      // Calculate USDT value
      const tokenSymbol = getNativeCurrencySymbol(network as any)
      usdtData = await calculateUSDTValue(
        balanceData.balance.formatted,
        tokenSymbol,
        network as any
      )
    } catch (error) {
      console.error('Error fetching balance:', error)
      balanceData = {
        balance: { 
          raw: '0',
          formatted: '0.000000',
          symbol: 'BNB'
        },
        network: 'BSC Mainnet'
      }
    }

    // Create user record
    const { data: user, error: userError } = await supabase
      .from('users')
      .insert([{ username }])
      .select()
      .single()

    if (userError) {
      console.error('Error creating user:', userError)
      return NextResponse.json(
        { 
          error: 'Failed to create user', 
          details: userError.message,
          code: userError.code 
        },
        { status: 500 }
      )
    }

    // Encode private key for storage (in production, use proper AES encryption)
    const encodedPrivateKey = encodePrivateKey(privateKey)

    // Create wallet record
    const { error: walletError } = await supabase
      .from('wallets')
      .insert([{
        user_id: user.id,
        network: network,
        address,
        private_key_encrypted: encodedPrivateKey
      }])

    if (walletError) {
      console.error('Error creating wallet:', walletError)
      // Clean up user record if wallet creation fails
      await supabase.from('users').delete().eq('id', user.id)
      return NextResponse.json(
        { 
          error: 'Failed to create wallet', 
          details: walletError.message,
          code: walletError.code 
        },
        { status: 500 }
      )
    }

    console.log('Balance data:', balanceData)
    console.log('USDT data:', usdtData)
    
    return NextResponse.json({
      userId: user.id,
      address,
      privateKey,
      username,
      network,
      balance: balanceData?.balance?.formatted || '0.000000',
      symbol: balanceData?.balance?.symbol || 'BNB',
      usdtValue: usdtData.formattedValue,
      tokenPrice: usdtData.price.toFixed(2),
      message: 'Wallet created successfully'
    })

  } catch (error) {
    console.error('Error in create-wallet API:', error)
    return NextResponse.json(
      { 
        error: 'Internal server error', 
        details: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      },
      { status: 500 }
    )
  }
} 