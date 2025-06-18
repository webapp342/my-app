'use client'

import { useSearchParams } from 'next/navigation'
import { useState, useEffect, Suspense } from 'react'
import Link from 'next/link'

interface UserBalance {
  id: string
  token_symbol: string
  balance: string
  network: string
}

function PresaleContent() {
  const searchParams = useSearchParams()
  const [mounted, setMounted] = useState(false)
  const [userBalances, setUserBalances] = useState<UserBalance[]>([])
  const [balancesLoading, setBalancesLoading] = useState(false)
  
  // Form state - removed selectedAsset
  const [tokenQuantity, setTokenQuantity] = useState<number>(0)
  const [bnbPrice, setBnbPrice] = useState<number>(0)
  const [priceLoading, setPriceLoading] = useState(false)
  
  // Get params
  const address = searchParams.get('address')
  const username = searchParams.get('username')
  const userId = searchParams.get('userId')
  
  // Constants
  const BBLIP_PRICE_USD = 0.1 // $0.1 per BBLIP token
  
  useEffect(() => {
    setMounted(true)
  }, [])

  // Fetch user balances
  useEffect(() => {
    const fetchUserBalances = async () => {
      if (!userId || !mounted) return
      
      setBalancesLoading(true)
      try {
        const response = await fetch(`/api/get-user-balances?userId=${userId}`)
        const data = await response.json()
        
        if (response.ok && data.success) {
          // Filter only BNB and BSC-USD
          const filteredBalances = data.balances.filter((balance: UserBalance) => 
            balance.token_symbol === 'BNB' || balance.token_symbol === 'BSC-USD'
          )
          setUserBalances(filteredBalances)
        } else {
          console.warn('[PRESALE] Could not fetch user balances:', data.error)
        }
      } catch (error) {
        console.error('[PRESALE] Error fetching user balances:', error)
      } finally {
        setBalancesLoading(false)
      }
    }

    fetchUserBalances()
  }, [userId, mounted])

  // Fetch BNB price
  useEffect(() => {
    const fetchBnbPrice = async () => {
      setPriceLoading(true)
      try {
        const response = await fetch('/api/get-binance-price?symbol=BNBUSDT')
        const data = await response.json()
        
        if (response.ok && data.price) {
          setBnbPrice(parseFloat(data.price))
        }
      } catch (error) {
        console.error('[PRESALE] Error fetching BNB price:', error)
      } finally {
        setPriceLoading(false)
      }
    }

    fetchBnbPrice()
  }, [])

  // Calculate total USD cost
  const calculateTotalUsdCost = () => {
    if (!tokenQuantity || tokenQuantity <= 0) return 0
    return tokenQuantity * BBLIP_PRICE_USD
  }

  // Calculate total available balance in USD
  const calculateTotalAvailableUsd = () => {
    let totalUsd = 0
    
    userBalances.forEach(balance => {
      const balanceAmount = parseFloat(balance.balance)
      
      if (balance.token_symbol === 'BNB' && bnbPrice > 0) {
        totalUsd += balanceAmount * bnbPrice
      } else if (balance.token_symbol === 'BSC-USD') {
        totalUsd += balanceAmount // BSC-USD is pegged to $1
      }
    })
    
    return totalUsd
  }

  // Check if user has sufficient balance
  const hasSufficientBalance = () => {
    const requiredUsd = calculateTotalUsdCost()
    const availableUsd = calculateTotalAvailableUsd()
    
    return requiredUsd > 0 && availableUsd >= requiredUsd
  }

  // Handle purchase - redirect to checkout
  const handlePurchase = () => {
    if (!hasSufficientBalance()) return
    
    // Redirect to checkout with purchase details (no asset selection needed)
    const checkoutParams = new URLSearchParams({
      userId: userId || '',
      address: address || '',
      username: username || '',
      tokenQuantity: tokenQuantity.toString(),
      totalUsdCost: calculateTotalUsdCost().toString(),
      bnbPrice: bnbPrice.toString()
    })
    
    window.location.href = `/checkout?${checkoutParams.toString()}`
  }

  if (!mounted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-100 flex items-center justify-center">
        <div className="text-gray-600">Loading...</div>
      </div>
    )
  }

  if (!address || !username || !userId) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-100 flex items-center justify-center">
        <div className="max-w-md w-full mx-4">
          <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
            <h1 className="text-2xl font-bold text-red-600 mb-4">Invalid Access</h1>
            <p className="text-gray-600 mb-6">Missing required information.</p>
            <Link
              href="/"
              className="bg-purple-600 hover:bg-purple-700 text-white font-semibold py-3 px-6 rounded-lg transition duration-200"
            >
              Go to Home
            </Link>
          </div>
        </div>
      </div>
    )
  }

  const totalUsdCost = calculateTotalUsdCost()
  const totalAvailableUsd = calculateTotalAvailableUsd()
  const sufficientBalance = hasSufficientBalance()

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-100">
      <div className="max-w-2xl mx-auto p-6">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-xl p-6 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                BBLIP Presale
              </h1>
              <p className="text-gray-600 mt-2">Welcome {username}! Purchase BBLIP tokens at $0.1 each</p>
            </div>
            <Link
              href={`/dashboard?address=${address}&username=${username}`}
              className="bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-2 px-4 rounded-lg transition duration-200"
            >
              ← Dashboard
            </Link>
          </div>
        </div>

        {/* Presale Form */}
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <div className="space-y-6">
            {/* Token Quantity Input */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Token Quantity
              </label>
              <div className="relative">
                <input
                  type="number"
                  min="1"
                  value={tokenQuantity || ''}
                  onChange={(e) => setTokenQuantity(parseInt(e.target.value) || 0)}
                  placeholder="Enter quantity (e.g., 100)"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-lg"
                />
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                  <span className="text-gray-500 font-medium">BBLIP</span>
                </div>
              </div>
            </div>

            {/* Available Balances */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Available Balances
              </label>
              {balancesLoading ? (
                <div className="bg-gray-50 rounded-lg p-4 animate-pulse">
                  <div className="h-4 bg-gray-200 rounded mb-2"></div>
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                </div>
              ) : userBalances.length > 0 ? (
                <div className="space-y-2">
                  {userBalances.map((balance) => {
                    const balanceAmount = parseFloat(balance.balance)
                    let usdValue = 0
                    
                    if (balance.token_symbol === 'BNB' && bnbPrice > 0) {
                      usdValue = balanceAmount * bnbPrice
                    } else if (balance.token_symbol === 'BSC-USD') {
                      usdValue = balanceAmount
                    }
                    
                    return (
                      <div key={balance.id} className="bg-gray-50 rounded-lg p-3 flex justify-between items-center">
                        <div>
                          <span className="font-medium text-gray-900">{balance.token_symbol}</span>
                          <span className="text-sm text-gray-500 ml-2">({balance.network})</span>
                        </div>
                        <div className="text-right">
                          <div className="font-semibold text-gray-900">
                            {balanceAmount.toFixed(6)}
                          </div>
                          <div className="text-sm text-gray-500">
                            ≈ ${usdValue.toFixed(2)}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                  <div className="bg-purple-50 rounded-lg p-3 border border-purple-200">
                    <div className="flex justify-between items-center">
                      <span className="font-medium text-purple-900">Total Available</span>
                      <span className="font-bold text-purple-900">
                        ${totalAvailableUsd.toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <p className="text-red-600">No supported assets found. Please ensure you have BNB or BSC-USD in your wallet.</p>
                </div>
              )}
            </div>

            {/* Cost Calculation */}
            {tokenQuantity > 0 && (
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Token Quantity:</span>
                    <span>{tokenQuantity.toLocaleString()} BBLIP</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Price per Token:</span>
                    <span>$0.10</span>
                  </div>
                  <div className="border-t pt-2">
                    <div className="flex justify-between font-semibold">
                      <span>Total Cost:</span>
                      <span>${totalUsdCost.toFixed(2)}</span>
                    </div>
                  </div>
                  
                  {/* Insufficient balance warning */}
                  {!sufficientBalance && tokenQuantity > 0 && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-3 mt-3">
                      <p className="text-red-600 text-sm">
                        Insufficient balance. You need ${totalUsdCost.toFixed(2)} but only have ${totalAvailableUsd.toFixed(2)} available.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Purchase Button */}
            <button
              onClick={handlePurchase}
              disabled={!sufficientBalance || tokenQuantity <= 0 || balancesLoading || priceLoading}
              className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 disabled:from-gray-400 disabled:to-gray-500 text-white font-bold py-4 px-6 rounded-lg transition duration-200 disabled:cursor-not-allowed"
            >
              {balancesLoading || priceLoading ? (
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                  Loading...
                </div>
              ) : tokenQuantity <= 0 ? (
                'Enter Token Quantity'
              ) : !sufficientBalance ? (
                'Insufficient Balance'
              ) : (
                `Purchase ${tokenQuantity.toLocaleString()} BBLIP for $${totalUsdCost.toFixed(2)}`
              )}
            </button>

            {/* Notice */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-blue-800 text-sm">
                <strong>Notice:</strong> Payment will be automatically deducted from your assets based on your priority settings. 
                You can manage your asset spending priorities in the Dashboard.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function Presale() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-100 flex items-center justify-center">
        <div className="text-gray-600">Loading...</div>
      </div>
    }>
      <PresaleContent />
    </Suspense>
  )
} 