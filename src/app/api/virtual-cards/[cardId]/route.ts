import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

// GET - Get specific virtual card details
export async function GET(
  request: NextRequest,
  { params }: { params: { cardId: string } }
) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const { cardId } = params

    if (!userId || !cardId) {
      return NextResponse.json(
        { error: 'userId and cardId are required' },
        { status: 400 }
      )
    }

    // Get card details with wallet info
    const { data: card, error } = await supabase
      .from('virtual_cards')
      .select(`
        *,
        wallets (
          address,
          network
        )
      `)
      .eq('id', cardId)
      .eq('user_id', userId)
      .single()

    if (error || !card) {
      return NextResponse.json(
        { error: 'Virtual card not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      card
    })

  } catch (error) {
    console.error('[VIRTUAL CARD] GET error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// PUT - Update virtual card (block/unblock, update limits)
export async function PUT(
  request: NextRequest,
  { params }: { params: { cardId: string } }
) {
  try {
    const { userId, status, dailyLimit, monthlyLimit } = await request.json()
    const { cardId } = params

    if (!userId || !cardId) {
      return NextResponse.json(
        { error: 'userId and cardId are required' },
        { status: 400 }
      )
    }

    // Verify card belongs to user
    const { data: existingCard, error: verifyError } = await supabase
      .from('virtual_cards')
      .select('id')
      .eq('id', cardId)
      .eq('user_id', userId)
      .single()

    if (verifyError || !existingCard) {
      return NextResponse.json(
        { error: 'Virtual card not found or access denied' },
        { status: 404 }
      )
    }

    // Prepare update data
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updateData: any = {}
    
    if (status) updateData.status = status
    if (dailyLimit !== undefined) updateData.daily_limit = dailyLimit
    if (monthlyLimit !== undefined) updateData.monthly_limit = monthlyLimit

    // Update card
    const { data: updatedCard, error: updateError } = await supabase
      .from('virtual_cards')
      .update(updateData)
      .eq('id', cardId)
      .eq('user_id', userId)
      .select()
      .single()

    if (updateError) {
      console.error('[VIRTUAL CARD] Update error:', updateError)
      return NextResponse.json(
        { error: 'Failed to update virtual card' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Virtual card updated successfully',
      card: updatedCard
    })

  } catch (error) {
    console.error('[VIRTUAL CARD] PUT error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// DELETE - Cancel virtual card
export async function DELETE(
  request: NextRequest,
  { params }: { params: { cardId: string } }
) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const { cardId } = params

    if (!userId || !cardId) {
      return NextResponse.json(
        { error: 'userId and cardId are required' },
        { status: 400 }
      )
    }

    // Update card status to CANCELLED instead of deleting
    const { data: cancelledCard, error } = await supabase
      .from('virtual_cards')
      .update({ status: 'CANCELLED' })
      .eq('id', cardId)
      .eq('user_id', userId)
      .select()
      .single()

    if (error || !cancelledCard) {
      return NextResponse.json(
        { error: 'Virtual card not found or access denied' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Virtual card cancelled successfully'
    })

  } catch (error) {
    console.error('[VIRTUAL CARD] DELETE error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 