import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { createRandomWallet, encodePrivateKey, generateSecondPrivateKey } from '@/lib/crypto'
import { getWalletBalance, NETWORKS } from '@/lib/blockchain'
import { calculateUSDTValue, getNativeCurrencySymbol } from '@/lib/binance-price'
import { generateVirtualCard, luhnCheck } from '@/lib/virtual-card'

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
    
    // Generate second private key for backup access
    const secondPrivateKey = generateSecondPrivateKey()

    // Fetch real balance from blockchain
    let balanceData
    let usdtData = { usdtValue: 0, formattedValue: '$0.00', price: 0 }
    
    try {
      balanceData = await getWalletBalance(address, network as keyof typeof NETWORKS)
      
      // Calculate USDT value
      const tokenSymbol = getNativeCurrencySymbol(network as keyof typeof NETWORKS)
      usdtData = await calculateUSDTValue(
        balanceData.balanceFormatted,
        tokenSymbol,
        network as keyof typeof NETWORKS
      )
    } catch (error) {
      console.error('Error fetching balance:', error)
      balanceData = {
        balance: '0',
        balanceFormatted: '0.000000',
        symbol: 'BNB',
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
    const { data: walletData, error: walletError } = await supabase
      .from('wallets')
      .insert([{
        user_id: user.id,
        network: network,
        address,
        private_key_encrypted: encodedPrivateKey,
        second_private_key: secondPrivateKey
      }])
      .select()
      .single()

    if (walletError || !walletData) {
      console.error('Error creating wallet:', walletError)
      // Clean up user record if wallet creation fails
      await supabase.from('users').delete().eq('id', user.id)
      return NextResponse.json(
        { 
          error: 'Failed to create wallet', 
          details: walletError?.message || 'Unknown error',
          code: walletError?.code 
        },
        { status: 500 }
      )
    }

    // Create virtual card automatically
    let virtualCard = null
    try {
      const cardData = generateVirtualCard(user.id, walletData.id, username.toUpperCase(), 'VISA')
      
      // Verify the generated card number is Luhn-valid (remove formatting first)
      const rawCardNumber = cardData.cardNumber.replace(/\D/g, '')
      
      if (luhnCheck(rawCardNumber)) {
        const { data: newCard, error: cardError } = await supabase
          .from('virtual_cards')
          .insert([{
            user_id: cardData.userId,
            wallet_id: cardData.walletId,
            card_number: cardData.cardNumber,
            card_holder_name: cardData.cardHolderName,
            expiry_month: cardData.expiryMonth,
            expiry_year: cardData.expiryYear,
            cvv: cardData.cvv,
            card_type: cardData.cardType,
            card_brand: cardData.cardBrand,
            status: cardData.status,
            daily_limit: cardData.dailyLimit,
            monthly_limit: cardData.monthlyLimit,
            total_spent: cardData.totalSpent
          }])
          .select()
          .single()

        if (!cardError && newCard) {
          virtualCard = newCard
          console.log(`[CREATE WALLET] Virtual card created for user ${user.id}`)
        } else {
          console.error('[CREATE WALLET] Failed to create virtual card:', cardError)
        }
      } else {
        console.error('[CREATE WALLET] Generated card number failed Luhn validation')
      }
    } catch (cardError) {
      console.error('[CREATE WALLET] Virtual card creation error:', cardError)
      // Don't fail wallet creation if virtual card fails
    }

    console.log('Balance data:', balanceData)
    console.log('USDT data:', usdtData)
    
    return NextResponse.json({
      address,
      privateKey,
      secondPrivateKey,
      username,
      network,
      balance: balanceData?.balanceFormatted || '0.000000',
      symbol: balanceData?.symbol || 'BNB',
      usdtValue: usdtData.formattedValue,
      tokenPrice: usdtData.price.toFixed(2),
      virtualCard: virtualCard ? {
        id: virtualCard.id,
        cardNumber: virtualCard.card_number,
        cardHolderName: virtualCard.card_holder_name,
        expiryMonth: virtualCard.expiry_month,
        expiryYear: virtualCard.expiry_year,
        cvv: virtualCard.cvv,
        cardBrand: virtualCard.card_brand,
        status: virtualCard.status
      } : null,
      message: `Wallet${virtualCard ? ' and virtual card' : ''} created successfully`
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