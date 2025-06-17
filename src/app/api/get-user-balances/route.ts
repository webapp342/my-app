import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')

    if (!userId) {
      return NextResponse.json(
        { error: 'userId parameter is required' },
        { status: 400 }
      )
    }

    // Fetch user balances from user_balances table
    const { data: balances, error } = await supabase
      .from('user_balances')
      .select('*')
      .eq('user_id', userId)
      .gt('balance', 0) // Only get balances > 0
      .order('balance', { ascending: false })

    if (error) {
      console.error('[GET USER BALANCES] Database error:', error)
      return NextResponse.json(
        { error: 'Failed to fetch user balances' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      balances: balances || []
    })

  } catch (error) {
    console.error('[GET USER BALANCES] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 