import { NextRequest, NextResponse } from 'next/server'
import { isValidAddress } from '@/lib/blockchain'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const address = searchParams.get('address')

    console.log(`[BSCScan TEST] Testing BSCScan API for address: ${address}`)

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

    const apiKey = process.env.BSCSCAN_API_KEY
    
    if (!apiKey) {
      return NextResponse.json({
        test: 'bscscan-api',
        error: 'BSCScan API key not configured',
        suggestion: 'Add BSCSCAN_API_KEY to your .env.local file'
      }, { status: 500 })
    }

    console.log(`[BSCScan TEST] API key available: ${apiKey.substring(0, 8)}...`)

    // Test 1: Get BNB balance
    console.log('[BSCScan TEST] Testing BNB balance...')
    const balanceUrl = `https://api.bscscan.com/api?module=account&action=balance&address=${address}&tag=latest&apikey=${apiKey}`
    const balanceResponse = await fetch(balanceUrl)
    const balanceData = await balanceResponse.json()
    
    console.log('[BSCScan TEST] Balance response:', balanceData)

    // Test 2: Get token transactions
    console.log('[BSCScan TEST] Testing token transactions...')
    const tokenTxUrl = `https://api.bscscan.com/api?module=account&action=tokentx&address=${address}&startblock=0&endblock=999999999&sort=desc&apikey=${apiKey}`
    const tokenTxResponse = await fetch(tokenTxUrl)
    const tokenTxData = await tokenTxResponse.json()
    
    console.log('[BSCScan TEST] Token tx response status:', tokenTxData.status, 'message:', tokenTxData.message)
    console.log('[BSCScan TEST] Token tx count:', tokenTxData.result ? tokenTxData.result.length : 0)

    // Test 3: Test specific token balance (BUSD)
    const busdContract = '0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56'
    console.log('[BSCScan TEST] Testing BUSD token balance...')
    const tokenBalanceUrl = `https://api.bscscan.com/api?module=account&action=tokenbalance&contractaddress=${busdContract}&address=${address}&tag=latest&apikey=${apiKey}`
    const tokenBalanceResponse = await fetch(tokenBalanceUrl)
    const tokenBalanceData = await tokenBalanceResponse.json()
    
    console.log('[BSCScan TEST] Token balance response:', tokenBalanceData)

    return NextResponse.json({
      test: 'bscscan-api',
      address,
      apiKeyAvailable: true,
      tests: {
        bnbBalance: {
          status: balanceData.status,
          message: balanceData.message,
          result: balanceData.result
        },
        tokenTransactions: {
          status: tokenTxData.status,
          message: tokenTxData.message,
          count: tokenTxData.result ? tokenTxData.result.length : 0,
          sample: tokenTxData.result ? tokenTxData.result.slice(0, 3) : []
        },
        tokenBalance: {
          contract: busdContract,
          status: tokenBalanceData.status,
          message: tokenBalanceData.message,
          result: tokenBalanceData.result
        }
      },
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('[BSCScan TEST] Error:', error)
    
    return NextResponse.json({
      test: 'bscscan-api',
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 })
  }
} 