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
  
  // Form state
  const [tokenQuantity, setTokenQuantity] = useState<number>(0)
  const [selectedAsset, setSelectedAsset] = useState<string>('')
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
          
          // Auto-select first available asset
          if (filteredBalances.length > 0) {
            setSelectedAsset(filteredBalances[0].token_symbol)
          }
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

  // Calculate required amount
  const calculateRequiredAmount = () => {
    if (!tokenQuantity || tokenQuantity <= 0) return 0
    
    const totalUsdCost = tokenQuantity * BBLIP_PRICE_USD
    
    if (selectedAsset === 'BNB') {
      return bnbPrice > 0 ? totalUsdCost / bnbPrice : 0
    } else if (selectedAsset === 'BSC-USD') {
      return totalUsdCost // BSC-USD is pegged to $1
    }
    
    return 0
  }

  // Check if user has sufficient balance
  const hasSufficientBalance = () => {
    const requiredAmount = calculateRequiredAmount()
    const selectedBalance = userBalances.find(b => b.token_symbol === selectedAsset)
    
    if (!selectedBalance || requiredAmount <= 0) return false
    
    return parseFloat(selectedBalance.balance) >= requiredAmount
  }

  // Handle purchase - redirect to checkout
  const handlePurchase = () => {
    if (!hasSufficientBalance()) return
    
    // Redirect to checkout with purchase details
    const checkoutParams = new URLSearchParams({
      userId: userId || '',
      address: address || '',
      username: username || '',
      tokenQuantity: tokenQuantity.toString(),
      selectedAsset,
      requiredAmount: calculateRequiredAmount().toString(),
      totalUsdCost: (tokenQuantity * BBLIP_PRICE_USD).toString(),
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

  const requiredAmount = calculateRequiredAmount()
  const totalUsdCost = tokenQuantity * BBLIP_PRICE_USD
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
                  step="1"
                  value={tokenQuantity || ''}
                  onChange={(e) => setTokenQuantity(parseInt(e.target.value) || 0)}
                  placeholder="Enter number of BBLIP tokens"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
                <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                  <span className="text-gray-500 font-medium">BBLIP</span>
                </div>
              </div>
            </div>

            {/* Asset Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Payment Asset
              </label>
              {balancesLoading ? (
                <div className="animate-pulse h-12 bg-gray-200 rounded-lg"></div>
              ) : (
                <select
                  value={selectedAsset}
                  onChange={(e) => setSelectedAsset(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  disabled={userBalances.length === 0}
                >
                  <option value="">Select payment asset</option>
                  {userBalances.map((balance) => (
                    <option key={balance.id} value={balance.token_symbol}>
                      {balance.token_symbol} (Balance: {parseFloat(balance.balance).toFixed(6)})
                    </option>
                  ))}
                </select>
              )}
              
              {userBalances.length === 0 && !balancesLoading && (
                <p className="text-sm text-red-600 mt-2">
                  No BNB or BSC-USD balance found. Please add funds to your wallet.
                </p>
              )}
            </div>

            {/* Price Calculation */}
            {tokenQuantity > 0 && selectedAsset && (
              <div className="bg-gray-50 rounded-lg p-6 space-y-4">
                <h3 className="text-lg font-semibold text-gray-900">Purchase Summary</h3>
                
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Token Quantity:</span>
                    <span className="font-medium">{tokenQuantity.toLocaleString()} BBLIP</span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span className="text-gray-600">Price per Token:</span>
                    <span className="font-medium">${BBLIP_PRICE_USD}</span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span className="text-gray-600">Total USD Cost:</span>
                    <span className="font-medium">${totalUsdCost.toFixed(2)}</span>
                  </div>
                  
                  {selectedAsset === 'BNB' && (
                    <>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Current BNB Price:</span>
                        <span className="font-medium">
                          {priceLoading ? 'Loading...' : `$${bnbPrice.toFixed(2)}`}
                        </span>
                      </div>
                      
                      <div className="flex justify-between">
                        <span className="text-gray-600">Required BNB:</span>
                        <span className="font-medium">{requiredAmount.toFixed(6)} BNB</span>
                      </div>
                    </>
                  )}
                  
                  {selectedAsset === 'BSC-USD' && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Required BSC-USD:</span>
                      <span className="font-medium">{requiredAmount.toFixed(2)} BSC-USD</span>
                    </div>
                  )}
                </div>
                
                {/* Balance Check */}
                <div className={`p-4 rounded-lg ${sufficientBalance ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
                  <div className="flex items-center">
                    <svg 
                      className={`w-5 h-5 mr-2 ${sufficientBalance ? 'text-green-500' : 'text-red-500'}`}
                      fill="currentColor" 
                      viewBox="0 0 20 20"
                    >
                      {sufficientBalance ? (
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      ) : (
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      )}
                    </svg>
                    <span className={`text-sm font-medium ${sufficientBalance ? 'text-green-700' : 'text-red-700'}`}>
                      {sufficientBalance 
                        ? 'Sufficient balance available' 
                        : `Insufficient balance. You need ${requiredAmount.toFixed(6)} ${selectedAsset} but only have ${userBalances.find(b => b.token_symbol === selectedAsset)?.balance || '0'} ${selectedAsset}`
                      }
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Purchase Button */}
            <button
              onClick={handlePurchase}
              disabled={!sufficientBalance || tokenQuantity <= 0 || !selectedAsset || priceLoading}
              className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 disabled:from-gray-400 disabled:to-gray-500 text-white font-semibold py-4 px-6 rounded-lg transition duration-200 disabled:cursor-not-allowed"
            >
              Proceed to Checkout
            </button>
            
            {/* Disclaimer */}
            <div className="text-xs text-gray-500 text-center">
              <p>* This is a demo presale interface. No actual transactions will be processed.</p>
              <p>* BBLIP tokens are for demonstration purposes only.</p>
            </div>
          </div>
        </div>

        {/* Presale Info */}
        <div className="bg-white rounded-2xl shadow-xl p-6 mt-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Presale Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-semibold text-gray-800 mb-2">Token Details</h3>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Token Name: BBLIP</li>
                <li>• Presale Price: $0.1 per token</li>
                <li>• Accepted Assets: BNB, BSC-USD</li>
                <li>• Network: BSC Mainnet</li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-gray-800 mb-2">How it Works</h3>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Enter desired token quantity</li>
                <li>• Select payment asset from your balance</li>
                <li>• Review calculated price</li>
                <li>• Complete purchase (Demo only)</li>
              </ul>
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