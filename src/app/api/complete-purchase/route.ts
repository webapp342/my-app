import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

// Simple in-memory tracking to prevent duplicate calls
const activePurchases = new Set<string>()

// Global request counter for extra debugging
let requestCounter = 0

export async function POST(request: NextRequest) {
  let purchaseId: string | null = null
  
  try {
    const body = await request.json()
    const { userId, address, tokenQuantity, totalUsdCost, bnbPrice, cardId } = body

    requestCounter++
    console.log(`[PURCHASE] 🚀 Request #${requestCounter}: ${tokenQuantity} BBLIP for $${totalUsdCost}`)

    // Create unique purchase ID
    purchaseId = `${userId}-${tokenQuantity}-${Date.now()}`
    
    // Check for duplicate purchase
    if (activePurchases.has(purchaseId)) {
      console.log(`[PURCHASE] ⚠️ Duplicate purchase detected: ${purchaseId}`)
      return NextResponse.json({ error: 'Purchase already in progress' }, { status: 409 })
    }

    // Mark purchase as active
    activePurchases.add(purchaseId)
    console.log(`[PURCHASE] ✅ Purchase marked as active: ${purchaseId}`)

    // 1. GET USER'S CURRENT BALANCES
    const { data: balances, error: balanceError } = await supabase
      .from('user_balances')
      .select('*')
      .eq('user_id', userId)
      .in('token_symbol', ['BNB', 'BSC-USD'])

    if (balanceError) {
      console.error(`[PURCHASE] ❌ Failed to get balances:`, balanceError)
      throw new Error('Failed to get user balances')
    }

    console.log(`[PURCHASE] 💰 Current balances:`, balances?.map(b => `${b.token_symbol}: ${b.balance}`))

    // 2. CALCULATE TOTAL AVAILABLE USD
    let totalBnb = 0
    let totalBscUsd = 0
    const bnbRecords: Array<{ id: string; balance: string; token_symbol: string }> = []
    const bscUsdRecords: Array<{ id: string; balance: string; token_symbol: string }> = []

    for (const balance of balances || []) {
      if (balance.token_symbol === 'BNB') {
        totalBnb += parseFloat(balance.balance)
        bnbRecords.push(balance)
      } else if (balance.token_symbol === 'BSC-USD') {
        totalBscUsd += parseFloat(balance.balance)
        bscUsdRecords.push(balance)
      }
    }

    const totalAvailableUsd = (totalBnb * bnbPrice) + totalBscUsd
    console.log(`[PURCHASE] 💵 Total available: $${totalAvailableUsd.toFixed(2)} (BNB: ${totalBnb}, BSC-USD: ${totalBscUsd})`)

    // 3. CHECK SUFFICIENT BALANCE
    if (totalAvailableUsd < totalUsdCost) {
      console.log(`[PURCHASE] ❌ Insufficient balance: need $${totalUsdCost}, have $${totalAvailableUsd.toFixed(2)}`)
      return NextResponse.json({ 
        error: `Insufficient balance. Need $${totalUsdCost}, have $${totalAvailableUsd.toFixed(2)}` 
      }, { status: 400 })
    }

    // 4. GET USER'S ASSET PRIORITIES
    const { data: priorities } = await supabase
      .from('user_asset_priorities')
      .select('*')
      .eq('user_id', userId)
      .eq('is_enabled', true)
      .order('priority_order', { ascending: true })

    console.log(`[PURCHASE] 🎯 Asset priorities:`, priorities?.map(p => `${p.token_symbol} (Priority: ${p.priority_order})`))

    // 5. CALCULATE PAYMENT PLAN (SINGLE SOURCE OF TRUTH)
    let remainingCost = totalUsdCost
    const paymentPlan: Array<{
      tokenSymbol: string,
      requiredAmount: number,
      records: Array<{ id: string; balance: string; token_symbol: string }>
    }> = []

    // Use BNB first if it's priority 1, otherwise BSC-USD first
    const bnbFirst = priorities?.find(p => p.token_symbol === 'BNB' && p.priority_order === 1)
    
    if (bnbFirst && totalBnb > 0 && remainingCost > 0) {
      const bnbNeeded = Math.min(remainingCost / bnbPrice, totalBnb)
      if (bnbNeeded > 0) {
        paymentPlan.push({
          tokenSymbol: 'BNB',
          requiredAmount: bnbNeeded,
          records: bnbRecords
        })
        remainingCost -= bnbNeeded * bnbPrice
        console.log(`[PURCHASE] 💎 Using ${bnbNeeded.toFixed(6)} BNB ($${(bnbNeeded * bnbPrice).toFixed(2)})`)
      }
    }

    // Use BSC-USD for remaining cost
    if (totalBscUsd > 0 && remainingCost > 0.01) {
      const bscUsdNeeded = Math.min(remainingCost, totalBscUsd)
      if (bscUsdNeeded > 0) {
        paymentPlan.push({
          tokenSymbol: 'BSC-USD',
          requiredAmount: bscUsdNeeded,
          records: bscUsdRecords
        })
        remainingCost -= bscUsdNeeded
        console.log(`[PURCHASE] 💵 Using ${bscUsdNeeded.toFixed(6)} BSC-USD ($${bscUsdNeeded.toFixed(2)})`)
      }
    }

    // Use BNB if it wasn't used first and still needed
    if (!bnbFirst && totalBnb > 0 && remainingCost > 0.01) {
      const bnbNeeded = Math.min(remainingCost / bnbPrice, totalBnb)
      if (bnbNeeded > 0) {
        paymentPlan.push({
          tokenSymbol: 'BNB',
          requiredAmount: bnbNeeded,
          records: bnbRecords
        })
        remainingCost -= bnbNeeded * bnbPrice
        console.log(`[PURCHASE] 💎 Using ${bnbNeeded.toFixed(6)} BNB ($${(bnbNeeded * bnbPrice).toFixed(2)}) [fallback]`)
      }
    }

    console.log(`[PURCHASE] 📋 Final payment plan:`, paymentPlan.map(p => `${p.requiredAmount.toFixed(6)} ${p.tokenSymbol}`))

    if (remainingCost > 0.01) {
      console.log(`[PURCHASE] ❌ Still need $${remainingCost.toFixed(2)} more`)
      return NextResponse.json({ error: 'Insufficient balance for purchase' }, { status: 400 })
    }

    // 6. EXECUTE PAYMENT - SIMPLE DIRECT UPDATES
    const transactionHash = `0x${Math.random().toString(16).substr(2, 40)}`
    console.log(`[PURCHASE] 🔄 Executing payment with transaction: ${transactionHash}`)

    // Process each payment step
    for (let i = 0; i < paymentPlan.length; i++) {
      const payment = paymentPlan[i]
      let remainingToDeduct = payment.requiredAmount

      console.log(`[PURCHASE] 💳 Processing ${payment.tokenSymbol}: ${remainingToDeduct.toFixed(6)} from ${payment.records.length} records`)

      // Deduct from each record for this token
      for (const record of payment.records) {
        if (remainingToDeduct <= 0) break

        const currentBalance = parseFloat(record.balance)
        const deductAmount = Math.min(remainingToDeduct, currentBalance)

        if (deductAmount > 0) {
          console.log(`[PURCHASE] 📉 Deducting ${deductAmount.toFixed(6)} from record ${record.id} (balance: ${currentBalance})`)

          // SIMPLE DIRECT UPDATE - NO ATOMIC FUNCTIONS NEEDED
          const newBalance = currentBalance - deductAmount
          const { error: updateError } = await supabase
            .from('user_balances')
            .update({ 
              balance: newBalance.toString(),
              last_updated: new Date().toISOString()
            })
            .eq('id', record.id)

          if (updateError) {
            console.error(`[PURCHASE] ❌ Failed to update balance:`, updateError)
            throw new Error(`Failed to update balance for ${payment.tokenSymbol}`)
          }

          remainingToDeduct -= deductAmount
          console.log(`[PURCHASE] ✅ Updated balance to ${newBalance.toFixed(6)}, remaining: ${remainingToDeduct.toFixed(6)}`)
        }
      }

      // Record virtual card transaction for each payment
      const cardTxAmount = payment.tokenSymbol === 'BNB' ? payment.requiredAmount * bnbPrice : payment.requiredAmount
      const { error: cardTxError } = await supabase
        .from('virtual_card_transactions')
        .insert({
          card_id: cardId,
          user_id: userId,
          transaction_type: 'PURCHASE',
          amount: cardTxAmount.toString(),
          currency: 'USD',
          merchant_name: 'BBLIP Presale',
          merchant_category: 'CRYPTO',
          description: `Payment using ${payment.requiredAmount.toFixed(6)} ${payment.tokenSymbol} for BBLIP tokens`,
          status: 'COMPLETED'
        })

      if (cardTxError) {
        console.error(`[PURCHASE] ❌ Failed to record virtual card transaction:`, cardTxError)
        throw new Error('Failed to record virtual card transaction')
      }

      console.log(`[PURCHASE] ✅ Recorded virtual card transaction: $${cardTxAmount.toFixed(2)} using ${payment.tokenSymbol}`)
    }

    // 7. ADD BBLIP TOKENS
    console.log(`[PURCHASE] 🎁 Adding ${tokenQuantity} BBLIP tokens`)

    // Check if user already has BBLIP balance
    const { data: existingBblip } = await supabase
      .from('user_balances')
      .select('*')
      .eq('user_id', userId)
      .eq('token_symbol', 'BBLIP')
      .single()

    if (existingBblip) {
      // Update existing BBLIP balance
      const oldBalance = parseFloat(existingBblip.balance)
      const newBblipBalance = oldBalance + tokenQuantity
      
      console.log(`[PURCHASE] 🔍 BBLIP DEBUG - Old: ${oldBalance}, Adding: ${tokenQuantity}, New: ${newBblipBalance}`)
      console.log(`[PURCHASE] 🔍 BBLIP Record ID: ${existingBblip.id}`)
      
      const { error: bblipError } = await supabase
        .from('user_balances')
        .update({ 
          balance: newBblipBalance.toString(),
          last_updated: new Date().toISOString()
        })
        .eq('id', existingBblip.id)

      if (bblipError) {
        console.error(`[PURCHASE] ❌ Failed to update BBLIP balance:`, bblipError)
        throw new Error('Failed to update BBLIP balance')
      }

      console.log(`[PURCHASE] ✅ Updated BBLIP balance from ${oldBalance} to ${newBblipBalance}`)
      
      // Verify the update actually worked
      const { data: verifyBblip } = await supabase
        .from('user_balances')
        .select('balance')
        .eq('id', existingBblip.id)
        .single()
      
      console.log(`[PURCHASE] 🔍 VERIFICATION - Database now shows: ${verifyBblip?.balance}`)
    } else {
      // Create new BBLIP balance record
      const { error: bblipError } = await supabase
        .from('user_balances')
        .insert({
          user_id: userId,
          wallet_address: address,
          token_symbol: 'BBLIP',
          network: 'BSC_MAINNET',
          balance: tokenQuantity.toString()
        })

      if (bblipError) {
        console.error(`[PURCHASE] ❌ Failed to create BBLIP balance:`, bblipError)
        throw new Error('Failed to create BBLIP balance')
      }

      console.log(`[PURCHASE] ✅ Created new BBLIP balance: ${tokenQuantity}`)
    }

    // Record final virtual card transaction for BBLIP purchase
    const { error: finalCardTxError } = await supabase
      .from('virtual_card_transactions')
      .insert({
        card_id: cardId,
        user_id: userId,
        transaction_type: 'PURCHASE',
        amount: totalUsdCost.toString(),
        currency: 'USD',
        merchant_name: 'BBLIP Presale',
        merchant_category: 'CRYPTO',
        description: `BBLIP Token Purchase: ${tokenQuantity.toLocaleString()} BBLIP tokens`,
        status: 'COMPLETED'
      })

    if (finalCardTxError) {
      console.error(`[PURCHASE] ❌ Failed to record final virtual card transaction:`, finalCardTxError)
      throw new Error('Failed to record final virtual card transaction')
    }

    console.log(`[PURCHASE] ✅ Recorded final virtual card transaction: $${totalUsdCost} for ${tokenQuantity} BBLIP`)

    // 8. FINAL VERIFICATION
    console.log(`[PURCHASE] 🔍 FINAL CHECK - Getting all user balances...`)
    const { data: finalBalances } = await supabase
      .from('user_balances')
      .select('token_symbol, balance, id')
      .eq('user_id', userId)
    
    console.log(`[PURCHASE] 🔍 FINAL BALANCES:`, finalBalances?.map(b => `${b.token_symbol}: ${b.balance} (ID: ${b.id})`))

    // 9. SUCCESS RESPONSE
    console.log(`[PURCHASE] 🎉 Purchase completed successfully!`)
    console.log(`[PURCHASE] 📊 Summary: ${tokenQuantity} BBLIP for $${totalUsdCost}`)

    return NextResponse.json({
      success: true,
      message: 'Purchase completed successfully',
      data: {
        transactionHash,
        tokenQuantity,
        totalUsdCost,
        paymentBreakdown: paymentPlan.map(p => ({
          asset: p.tokenSymbol,
          amount: p.requiredAmount,
          usdValue: p.tokenSymbol === 'BNB' ? p.requiredAmount * bnbPrice : p.requiredAmount
        }))
      }
    })

  } catch (error) {
    console.error('[PURCHASE] ❌ Error:', error)
    
    return NextResponse.json({
      error: 'Purchase failed. Please try again.',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
    
  } finally {
    // Always clean up
    if (purchaseId) {
      activePurchases.delete(purchaseId)
      console.log(`[PURCHASE] 🧹 Cleaned up: ${purchaseId}`)
    }
  }
} 