import { NextRequest, NextResponse } from 'next/server'
import { getWalletBalance, isValidAddress } from '@/lib/blockchain'
import { calculateUSDTValue, fetchTokenPrice } from '@/lib/binance-price'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const address = searchParams.get('address')

    console.log(`[TEST PORTFOLIO] Testing portfolio for address: ${address}`)

    if (!address) {
      return NextResponse.json(
        { error: 'Address is required' },
        { status: 400 }
      )
    }

    if (!isValidAddress(address)) {
      return NextResponse.json(
        { error: 'Invalid address format' },
        { status: 400 }
      )
    }

    // Test 1: Get BNB balance
    console.log('[TEST PORTFOLIO] Testing BNB balance fetch...')
    const balanceData = await getWalletBalance(address, 'BSC_MAINNET')
    console.log('[TEST PORTFOLIO] BNB balance result:', balanceData)

    // Test 2: Get BNB price
    console.log('[TEST PORTFOLIO] Testing BNB price fetch...')
    const bnbPrice = await fetchTokenPrice('BNB', 'BSC_MAINNET')
    console.log('[TEST PORTFOLIO] BNB price result:', bnbPrice)

    // Test 3: Calculate USD value
    console.log('[TEST PORTFOLIO] Testing USD value calculation...')
    const usdtData = await calculateUSDTValue(balanceData.balanceFormatted, 'BNB', 'BSC_MAINNET')
    console.log('[TEST PORTFOLIO] USD value result:', usdtData)

    // Test 4: BSCScan API availability
    console.log('[TEST PORTFOLIO] Checking BSCScan API key...')
    const hasApiKey = !!process.env.BSCSCAN_API_KEY
    console.log(`[TEST PORTFOLIO] BSCScan API key available: ${hasApiKey}`)

    if (hasApiKey) {
      console.log(`[TEST PORTFOLIO] API key length: ${process.env.BSCSCAN_API_KEY!.length}`)
    }

    // Return test results
    return NextResponse.json({
      test: 'portfolio-debug',
      address,
      results: {
        bnbBalance: {
          raw: balanceData.balance,
          formatted: balanceData.balanceFormatted,
          symbol: balanceData.symbol
        },
        bnbPrice: bnbPrice,
        usdValue: usdtData,
        bscscanApiAvailable: hasApiKey,
        timestamp: new Date().toISOString()
      }
    })

  } catch (error) {
    console.error('[TEST PORTFOLIO] Error:', error)
    
    return NextResponse.json({
      test: 'portfolio-debug',
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 })
  }
} 