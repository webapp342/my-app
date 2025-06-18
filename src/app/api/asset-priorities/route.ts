import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

// GET - Get user's asset spending priorities based on their actual balances
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

    // First, get user's actual token balances
    const { data: userBalances, error: balanceError } = await supabase
      .from('user_balances')
      .select('token_symbol')
      .eq('user_id', userId)
      .gt('balance', 0) // Only tokens with positive balance

    if (balanceError) {
      console.error('[ASSET PRIORITIES] Balance fetch error:', balanceError)
      return NextResponse.json(
        { error: 'Failed to fetch user balances' },
        { status: 500 }
      )
    }

    // Get unique token symbols from user balances
    const availableTokens = [...new Set(userBalances?.map(b => b.token_symbol) || [])]

    if (availableTokens.length === 0) {
      return NextResponse.json({
        success: true,
        priorities: [],
        availableTokens: [],
        message: 'No tokens found in user balance'
      })
    }

    // Get user's existing priorities for their tokens
    const { data: existingPriorities, error: priorityError } = await supabase
      .from('user_asset_priorities')
      .select('*')
      .eq('user_id', userId)
      .in('token_symbol', availableTokens)
      .order('priority_order', { ascending: true })

    if (priorityError) {
      console.error('[ASSET PRIORITIES] Priority fetch error:', priorityError)
      return NextResponse.json(
        { error: 'Failed to fetch asset priorities' },
        { status: 500 }
      )
    }

    // If no priorities exist, create default order based on user's tokens
    if (!existingPriorities || existingPriorities.length === 0) {
      const defaultPriorities = availableTokens.map((token, index) => ({
        token_symbol: token,
        priority_order: index + 1,
        is_enabled: true
      }))

      return NextResponse.json({
        success: true,
        priorities: defaultPriorities,
        availableTokens,
        isDefault: true
      })
    }

    // Check for tokens that don't have priorities yet
    const prioritizedTokens = existingPriorities.map(p => p.token_symbol)
    const unprioritizedTokens = availableTokens.filter(token => !prioritizedTokens.includes(token))

    // Add unprioritized tokens to the end
    let allPriorities = [...existingPriorities]
    
    if (unprioritizedTokens.length > 0) {
      const maxOrder = Math.max(...existingPriorities.map(p => p.priority_order))
      const newPriorities = unprioritizedTokens.map((token, index) => ({
        token_symbol: token,
        priority_order: maxOrder + index + 1,
        is_enabled: true
      }))
      allPriorities = [...allPriorities, ...newPriorities]
    }

    return NextResponse.json({
      success: true,
      priorities: allPriorities,
      availableTokens,
      isDefault: false
    })

  } catch (error) {
    console.error('[ASSET PRIORITIES] GET error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// PUT - Update user's asset spending priorities
export async function PUT(request: NextRequest) {
  try {
    const { userId, priorities } = await request.json()

    if (!userId || !priorities || !Array.isArray(priorities)) {
      return NextResponse.json(
        { error: 'userId and priorities array are required' },
        { status: 400 }
      )
    }

    // Validate priorities structure
    for (const priority of priorities) {
      if (!priority.token_symbol || typeof priority.priority_order !== 'number') {
        return NextResponse.json(
          { error: 'Invalid priority structure. Each item must have token_symbol and priority_order' },
          { status: 400 }
        )
      }
    }

    // Verify that all tokens exist in user's balances
    const { data: userBalances } = await supabase
      .from('user_balances')
      .select('token_symbol')
      .eq('user_id', userId)
      .gt('balance', 0)

    const availableTokens = userBalances?.map(b => b.token_symbol) || []
    const invalidTokens = priorities.filter(p => !availableTokens.includes(p.token_symbol))

    if (invalidTokens.length > 0) {
      return NextResponse.json(
        { error: `Invalid tokens: ${invalidTokens.map(t => t.token_symbol).join(', ')}. You can only prioritize tokens you own.` },
        { status: 400 }
      )
    }

    // Start transaction by deleting existing priorities
    const { error: deleteError } = await supabase
      .from('user_asset_priorities')
      .delete()
      .eq('user_id', userId)

    if (deleteError) {
      console.error('[ASSET PRIORITIES] Delete error:', deleteError)
      return NextResponse.json(
        { error: 'Failed to clear existing priorities' },
        { status: 500 }
      )
    }

    // Insert new priorities
    const prioritiesData = priorities.map(priority => ({
      user_id: userId,
      token_symbol: priority.token_symbol,
      priority_order: priority.priority_order,
      is_enabled: priority.is_enabled !== false // default to true
    }))

    const { data: newPriorities, error: insertError } = await supabase
      .from('user_asset_priorities')
      .insert(prioritiesData)
      .select()

    if (insertError) {
      console.error('[ASSET PRIORITIES] Insert error:', insertError)
      return NextResponse.json(
        { error: 'Failed to save asset priorities' },
        { status: 500 }
      )
    }

    console.log(`[ASSET PRIORITIES] Updated priorities for user ${userId}:`, priorities)

    return NextResponse.json({
      success: true,
      message: 'Asset priorities updated successfully',
      priorities: newPriorities
    })

  } catch (error) {
    console.error('[ASSET PRIORITIES] PUT error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 