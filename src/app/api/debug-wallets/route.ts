import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const checkAddress = searchParams.get('address')

    // Get all wallets from database
    const { data: wallets, error: walletsError } = await supabase
      .from('wallets')
      .select('id, address, user_id, network, created_at')

    if (walletsError) {
      console.error('Error fetching wallets:', walletsError)
      return NextResponse.json({ error: walletsError.message }, { status: 500 })
    }

    // If specific address provided, check if it exists
    if (checkAddress) {
      const foundWallet = wallets?.find(w => 
        w.address.toLowerCase() === checkAddress.toLowerCase()
      )
      
      return NextResponse.json({
        success: true,
        requestedAddress: checkAddress,
        found: !!foundWallet,
        wallet: foundWallet || null,
        totalWallets: wallets?.length || 0,
        allAddresses: wallets?.map(w => w.address) || []
      })
    }

    return NextResponse.json({
      success: true,
      totalWallets: wallets?.length || 0,
      wallets: wallets || []
    })

  } catch (error) {
    console.error('Debug wallets error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch wallets' },
      { status: 500 }
    )
  }
} 