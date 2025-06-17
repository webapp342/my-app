import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { generateVirtualCard, luhnCheck } from '@/lib/virtual-card'

// GET - Get user's virtual cards
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')

    if (!userId) {
      return NextResponse.json(
        { error: 'userId is required' },
        { status: 400 }
      )
    }

    // Get user's virtual cards
    const { data: cards, error } = await supabase
      .from('virtual_cards')
      .select(`
        *,
        wallets (
          address,
          network
        )
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('[VIRTUAL CARDS] Database error:', error)
      return NextResponse.json(
        { error: 'Failed to fetch virtual cards' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      cards: cards || []
    })

  } catch (error) {
    console.error('[VIRTUAL CARDS] GET error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST - Create new virtual card
export async function POST(request: NextRequest) {
  try {
    const { userId, walletId, cardHolderName, cardBrand = 'VISA' } = await request.json()

    if (!userId || !walletId || !cardHolderName) {
      return NextResponse.json(
        { error: 'userId, walletId, and cardHolderName are required' },
        { status: 400 }
      )
    }

    // Verify wallet belongs to user
    const { data: wallet, error: walletError } = await supabase
      .from('wallets')
      .select('id, user_id')
      .eq('id', walletId)
      .eq('user_id', userId)
      .single()

    if (walletError || !wallet) {
      return NextResponse.json(
        { error: 'Wallet not found or access denied' },
        { status: 404 }
      )
    }

    // Check if user already has a virtual card for this wallet
    const { data: existingCard } = await supabase
      .from('virtual_cards')
      .select('id')
      .eq('user_id', userId)
      .eq('wallet_id', walletId)
      .eq('status', 'ACTIVE')
      .single()

    if (existingCard) {
      return NextResponse.json(
        { error: 'User already has an active virtual card for this wallet' },
        { status: 400 }
      )
    }

    // Generate virtual card data
    const cardData = generateVirtualCard(userId, walletId, cardHolderName, cardBrand)

    // Verify the generated card number is Luhn-valid (remove formatting first)
    const rawCardNumber = cardData.cardNumber.replace(/\D/g, '')
    
    if (!luhnCheck(rawCardNumber)) {
      throw new Error('Generated card number failed Luhn validation')
    }

    // Insert into database
    const { data: newCard, error: insertError } = await supabase
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

    if (insertError) {
      console.error('[VIRTUAL CARDS] Insert error:', insertError)
      return NextResponse.json(
        { error: 'Failed to create virtual card' },
        { status: 500 }
      )
    }

    console.log(`[VIRTUAL CARDS] Created card for user ${userId}, wallet ${walletId}`)

    return NextResponse.json({
      success: true,
      message: 'Virtual card created successfully',
      card: newCard
    })

  } catch (error) {
    console.error('[VIRTUAL CARDS] POST error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 