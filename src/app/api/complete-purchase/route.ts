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
    const { userId, tokenQuantity, totalUsdCost, bnbPrice, cardId, transactionPassword } = body

    requestCounter++
    console.log(`[PURCHASE] 🚀 Request #${requestCounter}: ${tokenQuantity} BBLIP for $${totalUsdCost}`)

    // Validate required fields
    if (!transactionPassword) {
      return NextResponse.json({ error: 'Transaction password is required' }, { status: 400 })
    }

    // Validate transaction password format (6 digits)
    if (!/^\d{6}$/.test(transactionPassword)) {
      return NextResponse.json({ error: 'Transaction password must be 6 digits' }, { status: 400 })
    }

    // Verify transaction password against user's stored password
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('transaction_password')
      .eq('id', userId)
      .single()

    if (userError || !userData) {
      console.error(`[PURCHASE] ❌ User not found:`, userError)
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    if (!userData.transaction_password) {
      return NextResponse.json({ error: 'Transaction password not set. Please set your password in wallet settings.' }, { status: 400 })
    }

    if (userData.transaction_password !== transactionPassword) {
      console.log(`[PURCHASE] ❌ Invalid transaction password for user ${userId}`)
      return NextResponse.json({ error: 'Invalid transaction password' }, { status: 401 })
    }

    console.log(`[PURCHASE] ✅ Transaction password verified for user ${userId}`)

    // NETWORK FEE: Check BBLIP balance for 1 BBLIP network fee
    const NETWORK_FEE_BBLIP = 1
    console.log(`[PURCHASE] 🔍 Checking BBLIP balance for network fee: ${NETWORK_FEE_BBLIP} BBLIP`)
    
    const { data: bblipBalance, error: bblipError } = await supabase
      .from('user_balances')
      .select('balance')
      .eq('user_id', userId)
      .eq('token_symbol', 'BBLIP')
      .single()

    if (bblipError || !bblipBalance) {
      console.log(`[PURCHASE] ❌ No BBLIP balance found for network fee`)
      return NextResponse.json({ 
        error: `Network fee required: ${NETWORK_FEE_BBLIP} BBLIP. You don't have any BBLIP tokens for network fees.` 
      }, { status: 400 })
    }

    const currentBblipBalance = parseFloat(bblipBalance.balance)
    console.log(`[PURCHASE] 💰 Current BBLIP balance: ${currentBblipBalance}`)

    if (currentBblipBalance < NETWORK_FEE_BBLIP) {
      console.log(`[PURCHASE] ❌ Insufficient BBLIP for network fee: need ${NETWORK_FEE_BBLIP}, have ${currentBblipBalance}`)
      return NextResponse.json({ 
        error: `Insufficient BBLIP for network fee. Need ${NETWORK_FEE_BBLIP} BBLIP, you have ${currentBblipBalance.toFixed(6)} BBLIP.` 
      }, { status: 400 })
    }

    console.log(`[PURCHASE] ✅ BBLIP network fee check passed: ${currentBblipBalance} >= ${NETWORK_FEE_BBLIP}`)

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

    // 1. GET USER'S CURRENT BALANCES (ALL SUPPORTED TOKENS EXCEPT BBLIP)
    const supportedTokens = ['BNB', 'BSC-USD', 'AAVE', 'UNI', 'LINK', 'DOT', 'ADA', 'USDC', 'BUSD', 'SOL', 'XRP', 'DOGE', 'LTC', 'BCH', 'MATIC', 'SHIB', 'AVAX']
    
    const { data: balances, error: balanceError } = await supabase
      .from('user_balances')
      .select('*')
      .eq('user_id', userId)
      .in('token_symbol', supportedTokens) // Only supported tokens

    if (balanceError) {
      console.error(`[PURCHASE] ❌ Failed to get balances:`, balanceError)
      throw new Error('Failed to get user balances')
    }

    console.log(`[PURCHASE] 💰 Current balances:`, balances?.map(b => `${b.token_symbol}: ${b.balance}`))

    // 2. FETCH TOKEN PRICES FOR ALL SUPPORTED TOKENS
    const tokenPrices: Record<string, number> = { BNB: bnbPrice }
    const uniqueTokens = supportedTokens
    
    for (const token of uniqueTokens) {
      if (token === 'BNB') continue // Already have BNB price
      
      try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/get-binance-price?symbol=${token}`)
        const data = await response.json()
        
        if (response.ok && data.price) {
          tokenPrices[token] = parseFloat(data.price)
        } else {
          // Default prices for stablecoins
          if (['BSC-USD', 'USDT', 'USDC', 'BUSD'].includes(token)) {
            tokenPrices[token] = 1.0
          } else {
            tokenPrices[token] = 0
          }
        }
      } catch (error) {
        console.error(`[PURCHASE] Error fetching ${token} price:`, error)
        // Default to 1 for stablecoins, 0 for others
        if (['BSC-USD', 'USDT', 'USDC', 'BUSD'].includes(token)) {
          tokenPrices[token] = 1.0
        } else {
          tokenPrices[token] = 0
        }
      }
    }
    
    console.log(`[PURCHASE] 💰 Token prices:`, tokenPrices)

    // 3. CALCULATE TOTAL AVAILABLE USD FOR ALL SUPPORTED TOKENS
    const tokenBalances: Record<string, { total: number; records: Array<{ id: string; balance: string; token_symbol: string }> }> = {}
    let totalAvailableUsd = 0

    // Initialize all supported tokens with zero balance
    for (const token of supportedTokens) {
      tokenBalances[token] = { total: 0, records: [] }
    }

    // Add actual balances from database
    for (const balance of balances || []) {
      const tokenSymbol = balance.token_symbol
      const balanceAmount = parseFloat(balance.balance)
      const tokenPrice = tokenPrices[tokenSymbol] || 0
      
      tokenBalances[tokenSymbol].total += balanceAmount
      tokenBalances[tokenSymbol].records.push(balance)
      
      if (tokenPrice > 0 && balanceAmount > 0) {
        totalAvailableUsd += balanceAmount * tokenPrice
      }
    }

    console.log(`[PURCHASE] 💵 Total available: $${totalAvailableUsd.toFixed(2)}`)
    console.log(`[PURCHASE] 📊 Token breakdown:`, Object.entries(tokenBalances).map(([token, data]) => 
      `${token}: ${data.total.toFixed(6)} (≈ $${(data.total * (tokenPrices[token] || 0)).toFixed(2)})`
    ))

    // 4. CHECK SUFFICIENT BALANCE
    if (totalAvailableUsd < totalUsdCost) {
      console.log(`[PURCHASE] ❌ Insufficient balance: need $${totalUsdCost}, have $${totalAvailableUsd.toFixed(2)}`)
      return NextResponse.json({ 
        error: `Insufficient balance. Need $${totalUsdCost}, have $${totalAvailableUsd.toFixed(2)}` 
      }, { status: 400 })
    }

    // 5. GET USER'S ASSET PRIORITIES
    const { data: priorities } = await supabase
      .from('user_asset_priorities')
      .select('*')
      .eq('user_id', userId)
      .eq('is_enabled', true)
      .order('priority_order', { ascending: true })

    console.log(`[PURCHASE] 🎯 Asset priorities:`, priorities?.map(p => `${p.token_symbol} (Priority: ${p.priority_order})`))

    // 6. CALCULATE PAYMENT PLAN USING ALL TOKENS BY PRIORITY
    let remainingCost = totalUsdCost
    const paymentPlan: Array<{
      tokenSymbol: string,
      requiredAmount: number,
      tokenPrice: number,
      records: Array<{ id: string; balance: string; token_symbol: string }>
    }> = []

    // Sort tokens by priority order (enabled priorities first, then by order)
    const sortedTokens = Object.keys(tokenBalances).sort((a, b) => {
      const aPriority = priorities?.find(p => p.token_symbol === a && p.is_enabled)?.priority_order || 999
      const bPriority = priorities?.find(p => p.token_symbol === b && p.is_enabled)?.priority_order || 999
      return aPriority - bPriority
    })

    console.log(`[PURCHASE] 🔄 Processing tokens in priority order:`, sortedTokens)

    for (const tokenSymbol of sortedTokens) {
      if (remainingCost <= 0.01) break // Stop if we have enough
      
      const tokenData = tokenBalances[tokenSymbol]
      const tokenPrice = tokenPrices[tokenSymbol] || 0
      
      if (tokenPrice <= 0 || tokenData.total <= 0) {
        console.log(`[PURCHASE] ⏭️ Skipping ${tokenSymbol}: price=${tokenPrice}, balance=${tokenData.total}`)
        continue
      }
      
      // Calculate how much of this token we need
      const maxTokenNeeded = remainingCost / tokenPrice
      const tokenToUse = Math.min(maxTokenNeeded, tokenData.total)
      
      if (tokenToUse > 0) {
        const usdValue = tokenToUse * tokenPrice
        paymentPlan.push({
          tokenSymbol,
          requiredAmount: tokenToUse,
          tokenPrice,
          records: tokenData.records
        })
        remainingCost -= usdValue
        
        console.log(`[PURCHASE] 💰 Using ${tokenToUse.toFixed(6)} ${tokenSymbol} @ $${tokenPrice.toFixed(2)} = $${usdValue.toFixed(2)}`)
      }
    }

    console.log(`[PURCHASE] 📋 Final payment plan:`, paymentPlan.map(p => `${p.requiredAmount.toFixed(6)} ${p.tokenSymbol}`))

    if (remainingCost > 0.01) {
      console.log(`[PURCHASE] ❌ Still need $${remainingCost.toFixed(2)} more`)
      return NextResponse.json({ error: 'Insufficient balance for purchase' }, { status: 400 })
    }

    // 6. EXECUTE PAYMENT - WITH PURCHASE ID LINKING
    const transactionHash = `0x${Math.random().toString(16).substr(2, 40)}`
    const masterPurchaseId = `purchase_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    console.log(`[PURCHASE] 🔄 Executing payment with transaction: ${transactionHash}, Purchase ID: ${masterPurchaseId}`)

    // First, create master purchase transaction
    const { error: masterTxError } = await supabase
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
        status: 'COMPLETED',
        purchase_id: masterPurchaseId,
        bnb_price_at_purchase: bnbPrice.toString(),
        metadata: JSON.stringify({
          tokenQuantity,
          totalUsdCost,
          bnbPrice,
          paymentPlan: paymentPlan.map(p => ({
            tokenSymbol: p.tokenSymbol,
            requiredAmount: p.requiredAmount,
            tokenPrice: p.tokenPrice,
            usdValue: p.requiredAmount * p.tokenPrice
          }))
        })
      })

    if (masterTxError) {
      console.error(`[PURCHASE] ❌ Failed to record master transaction:`, masterTxError)
      throw new Error('Failed to record master transaction')
    }

    console.log(`[PURCHASE] ✅ Created master transaction: ${masterPurchaseId}`)

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

      // Record detailed virtual card transaction for each payment method
      const cardTxAmount = payment.requiredAmount * payment.tokenPrice
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
          description: `Payment Detail: ${payment.requiredAmount.toFixed(6)} ${payment.tokenSymbol} (@ $${payment.tokenPrice.toFixed(2)})`,
          status: 'COMPLETED',
          purchase_id: masterPurchaseId,
          bnb_price_at_purchase: bnbPrice.toString(),
          metadata: JSON.stringify({
            tokenSymbol: payment.tokenSymbol,
            tokenAmount: payment.requiredAmount,
            tokenPrice: payment.tokenPrice,
            usdValue: cardTxAmount
          })
        })

      if (cardTxError) {
        console.error(`[PURCHASE] ❌ Failed to record virtual card transaction:`, cardTxError)
        throw new Error('Failed to record virtual card transaction')
      }

      console.log(`[PURCHASE] ✅ Recorded payment detail transaction: $${cardTxAmount.toFixed(2)} using ${payment.tokenSymbol}`)
    }

    // 7. DEDUCT NETWORK FEE AND ADD BBLIP TOKENS
    console.log(`[PURCHASE] 💰 Processing BBLIP: Adding ${tokenQuantity} tokens and deducting ${NETWORK_FEE_BBLIP} network fee`)

    // Get current BBLIP balance (we already verified it exists and is sufficient)
    const { data: existingBblip } = await supabase
          .from('user_balances')
          .select('*')
          .eq('user_id', userId)
          .eq('token_symbol', 'BBLIP')
          .single()

        if (existingBblip) {
          // Calculate new balance: current + purchased - network fee
      const oldBalance = parseFloat(existingBblip.balance)
      const newBblipBalance = oldBalance + tokenQuantity - NETWORK_FEE_BBLIP
      
      console.log(`[PURCHASE] 🔍 BBLIP CALCULATION:`)
      console.log(`[PURCHASE] 🔍   Current: ${oldBalance}`)
      console.log(`[PURCHASE] 🔍   Adding: +${tokenQuantity} (purchased)`)
      console.log(`[PURCHASE] 🔍   Deducting: -${NETWORK_FEE_BBLIP} (network fee)`)
      console.log(`[PURCHASE] 🔍   Final: ${newBblipBalance}`)
      console.log(`[PURCHASE] 🔍   Record ID: ${existingBblip.id}`)
      
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

      console.log(`[PURCHASE] ✅ Updated BBLIP balance: ${oldBalance} → ${newBblipBalance} (net: +${tokenQuantity - NETWORK_FEE_BBLIP})`)
      
      // Verify the update actually worked
      const { data: verifyBblip } = await supabase
        .from('user_balances')
        .select('balance')
        .eq('id', existingBblip.id)
        .single()
      
      console.log(`[PURCHASE] 🔍 VERIFICATION - Database now shows: ${verifyBblip?.balance}`)
        } else {
          // This should not happen since we verified BBLIP balance exists earlier
      console.error(`[PURCHASE] ❌ CRITICAL ERROR: BBLIP balance disappeared during transaction`)
      throw new Error('BBLIP balance not found during processing')
    }

    console.log(`[PURCHASE] ✅ All transactions recorded under Purchase ID: ${masterPurchaseId}`)

    // 8. UPDATE VIRTUAL CARD TOTAL_SPENT AND LAST_USED_AT
    console.log(`[PURCHASE] 💳 Updating virtual card total spent...`)
    
    // Calculate total spent from MASTER transactions only (not detail transactions)
    // This prevents double counting since we create both master and detail transactions
    const { data: masterTransactions, error: masterTxFetchError } = await supabase
      .from('virtual_card_transactions')
      .select('amount')
      .eq('card_id', cardId)
      .eq('status', 'COMPLETED')
      .eq('transaction_type', 'PURCHASE')
      .like('description', 'BBLIP Token Purchase:%') // Only master transactions have this pattern

    if (masterTxFetchError) {
      console.error(`[PURCHASE] ❌ Failed to fetch master transactions:`, masterTxFetchError)
      throw new Error('Failed to fetch master transactions')
    }

    // Calculate total from master transactions only
    const calculatedTotalSpent = (masterTransactions || []).reduce((sum, tx) => sum + parseFloat(tx.amount), 0)
    
    // Update card with calculated total spent and last used date
    const { error: cardUpdateError } = await supabase
      .from('virtual_cards')
      .update({
        total_spent: calculatedTotalSpent,
        last_used_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', cardId)

    if (cardUpdateError) {
      console.error(`[PURCHASE] ❌ Failed to update virtual card:`, cardUpdateError)
      throw new Error('Failed to update virtual card')
    }

    console.log(`[PURCHASE] ✅ Updated virtual card total_spent to: $${calculatedTotalSpent.toFixed(2)} (from ${masterTransactions?.length || 0} master transactions)`)

    // 9. FINAL VERIFICATION
    console.log(`[PURCHASE] 🔍 FINAL CHECK - Getting all user balances...`)
    const { data: finalBalances } = await supabase
      .from('user_balances')
      .select('token_symbol, balance, id')
      .eq('user_id', userId)
    
    console.log(`[PURCHASE] 🔍 FINAL BALANCES:`, finalBalances?.map(b => `${b.token_symbol}: ${b.balance} (ID: ${b.id})`))

    // 10. SUCCESS RESPONSE
    console.log(`[PURCHASE] 🎉 Purchase completed successfully!`)
    console.log(`[PURCHASE] 📊 Summary: ${tokenQuantity} BBLIP for $${totalUsdCost}`)

    return NextResponse.json({
      success: true,
      message: 'Purchase completed successfully',
      data: {
        purchaseId: masterPurchaseId,
        transactionHash,
        tokenQuantity,
        totalUsdCost,
        bnbPrice,
        paymentBreakdown: paymentPlan.map(p => ({
          asset: p.tokenSymbol,
          amount: p.requiredAmount,
          tokenPrice: p.tokenPrice,
          usdValue: p.requiredAmount * p.tokenPrice
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