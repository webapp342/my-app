import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { createHash } from 'crypto'

export async function POST(request: NextRequest) {
  try {
    const {
      userId,
      address,
      tokenQuantity,
      selectedAsset,
      requiredAmount,
      totalUsdCost,
      transactionPassword,
      cardId
    } = await request.json()

    // Validate required fields
    if (!userId || !tokenQuantity || !selectedAsset || !requiredAmount || !transactionPassword) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Verify transaction password
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('transaction_password')
      .eq('id', userId)
      .single()

    if (userError || !user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    if (user.transaction_password !== transactionPassword) {
      return NextResponse.json(
        { error: 'Invalid transaction password' },
        { status: 401 }
      )
    }

    // Check user balance
    const { data: balanceRecord, error: balanceError } = await supabase
      .from('user_balances')
      .select('*')
      .eq('user_id', userId)
      .eq('token_symbol', selectedAsset)
      .single()

    if (balanceError || !balanceRecord) {
      return NextResponse.json(
        { error: `No ${selectedAsset} balance found` },
        { status: 400 }
      )
    }

    const currentBalance = parseFloat(balanceRecord.balance)
    if (currentBalance < requiredAmount) {
      return NextResponse.json(
        { error: `Insufficient ${selectedAsset} balance. Required: ${requiredAmount}, Available: ${currentBalance}` },
        { status: 400 }
      )
    }

    // Generate unique transaction hash and block number
    const transactionHash = `0x${createHash('sha256')
      .update(`${userId}-${Date.now()}-${Math.random()}`)
      .digest('hex')
      .substring(0, 40)}` // Limit to 42 characters (0x + 40 hex chars)
    
    const blockNumber = Math.floor(Math.random() * 90000000) + 10000000 // 8-digit random number

    // Manual transaction handling (no RPC needed)
    try {
        // 1. Deduct payment asset balance
        const newPaymentBalance = currentBalance - requiredAmount
        const { error: updatePaymentError } = await supabase
          .from('user_balances')
          .update({ 
            balance: newPaymentBalance,
            last_updated: new Date().toISOString()
          })
          .eq('id', balanceRecord.id)

        if (updatePaymentError) throw updatePaymentError

        // 2. Add or update BBLIP balance
        const { data: existingBblip, error: bblipCheckError } = await supabase
          .from('user_balances')
          .select('*')
          .eq('user_id', userId)
          .eq('token_symbol', 'BBLIP')
          .single()

        if (bblipCheckError && bblipCheckError.code !== 'PGRST116') {
          throw bblipCheckError
        }

        if (existingBblip) {
          // Update existing BBLIP balance
          const newBblipBalance = parseFloat(existingBblip.balance) + tokenQuantity
          const { error: updateBblipError } = await supabase
            .from('user_balances')
            .update({ 
              balance: newBblipBalance,
              last_updated: new Date().toISOString()
            })
            .eq('id', existingBblip.id)

          if (updateBblipError) throw updateBblipError
        } else {
          // Create new BBLIP balance record
          const { error: insertBblipError } = await supabase
            .from('user_balances')
            .insert({
              user_id: userId,
              wallet_address: address,
              token_symbol: 'BBLIP',
              network: 'BSC_MAINNET',
              balance: tokenQuantity
            })

          if (insertBblipError) throw insertBblipError
        }

        // 3. Record outgoing transaction (payment)
        const outTxHash = `${transactionHash.substring(0, 38)}_o` // 42 chars max
        const { error: outTxError } = await supabase
          .from('user_transactions')
          .insert({
            user_id: userId,
            wallet_address: address,
            transaction_hash: outTxHash,
            transaction_type: 'token_out',
            amount: requiredAmount,
            token_symbol: selectedAsset,
            network: 'BSC_MAINNET',
            block_number: blockNumber,
            transaction_date: new Date().toISOString()
          })

        if (outTxError) throw outTxError

        // 4. Record incoming transaction (BBLIP purchase)
        const inTxHash = `${transactionHash.substring(0, 38)}_i` // 42 chars max
        const { error: inTxError } = await supabase
          .from('user_transactions')
          .insert({
            user_id: userId,
            wallet_address: address,
            transaction_hash: inTxHash,
            transaction_type: 'token_in',
            amount: tokenQuantity,
            token_symbol: 'BBLIP',
            network: 'BSC_MAINNET',
            block_number: blockNumber + 1,
            transaction_date: new Date().toISOString()
          })

        if (inTxError) throw inTxError

        console.log(`[COMPLETE PURCHASE] Transaction completed for user ${userId}`)

    } catch (transactionError) {
      console.error('[COMPLETE PURCHASE] Transaction failed:', transactionError)
      return NextResponse.json(
        { error: 'Transaction failed. Please try again.' },
        { status: 500 }
      )
    }

    // Update virtual card total spent (optional)
    if (cardId) {
      try {
        // Get current total_spent
        const { data: card } = await supabase
          .from('virtual_cards')
          .select('total_spent')
          .eq('id', cardId)
          .single()

        const currentSpent = parseFloat(card?.total_spent || '0')
        const newTotalSpent = currentSpent + totalUsdCost

        await supabase
          .from('virtual_cards')
          .update({ 
            total_spent: newTotalSpent,
            last_used_at: new Date().toISOString()
          })
          .eq('id', cardId)
      } catch (cardError) {
        console.warn('[COMPLETE PURCHASE] Card update failed:', cardError)
        // Don't fail the transaction if card update fails
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Purchase completed successfully',
      data: {
        transactionHash,
        blockNumber,
        tokenQuantity,
        selectedAsset,
        requiredAmount,
        totalUsdCost
      }
    })

  } catch (error) {
    console.error('[COMPLETE PURCHASE] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 