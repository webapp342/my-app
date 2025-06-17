'use client'

import { useSearchParams } from 'next/navigation'
import { useState, useEffect, Suspense } from 'react'
import Link from 'next/link'
import { VirtualCard as VirtualCardType } from '@/lib/virtual-card'

interface CheckoutData {
  userId: string
  address: string
  username: string
  tokenQuantity: number
  selectedAsset: string
  requiredAmount: number
  totalUsdCost: number
  bnbPrice: number
}

function CheckoutContent() {
  const searchParams = useSearchParams()
  const [mounted, setMounted] = useState(false)
  const [virtualCard, setVirtualCard] = useState<VirtualCardType | null>(null)
  const [cardLoading, setCardLoading] = useState(false)
  const [transactionPassword, setTransactionPassword] = useState('')
  const [processing, setProcessing] = useState(false)
  const [error, setError] = useState('')

  // Parse checkout data from URL params
  const checkoutData: CheckoutData = {
    userId: searchParams.get('userId') || '',
    address: searchParams.get('address') || '',
    username: searchParams.get('username') || '',
    tokenQuantity: parseInt(searchParams.get('tokenQuantity') || '0'),
    selectedAsset: searchParams.get('selectedAsset') || '',
    requiredAmount: parseFloat(searchParams.get('requiredAmount') || '0'),
    totalUsdCost: parseFloat(searchParams.get('totalUsdCost') || '0'),
    bnbPrice: parseFloat(searchParams.get('bnbPrice') || '0')
  }

  useEffect(() => {
    setMounted(true)
  }, [])

  // Fetch user's virtual card
  useEffect(() => {
    const fetchVirtualCard = async () => {
      if (!checkoutData.userId || !mounted) return
      
      setCardLoading(true)
      try {
        const response = await fetch(`/api/virtual-cards?userId=${checkoutData.userId}`)
        const data = await response.json()
        
        if (response.ok && data.success && data.cards.length > 0) {
          setVirtualCard(data.cards[0]) // Use first card as default
        } else {
          setError('No virtual card found')
        }
      } catch (error) {
        console.error('[CHECKOUT] Error fetching virtual card:', error)
        setError('Failed to load payment method')
      } finally {
        setCardLoading(false)
      }
    }

    fetchVirtualCard()
  }, [checkoutData.userId, mounted])

  // Handle purchase completion
  const handleProceed = async () => {
    if (!transactionPassword.trim()) {
      setError('Please enter your transaction password')
      return
    }

    if (!virtualCard) {
      setError('No payment method available')
      return
    }

    setProcessing(true)
    setError('')

    try {
      const response = await fetch('/api/complete-purchase', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...checkoutData,
          transactionPassword,
          cardId: virtualCard.id
        })
      })

      const result = await response.json()

      if (response.ok && result.success) {
        // Redirect to success page or dashboard
        alert('Purchase completed successfully!')
        window.location.href = `/dashboard?address=${checkoutData.address}&username=${checkoutData.username}`
      } else {
        setError(result.error || 'Purchase failed')
      }
    } catch (error) {
      console.error('[CHECKOUT] Purchase error:', error)
      setError('Network error. Please try again.')
    } finally {
      setProcessing(false)
    }
  }

  if (!mounted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-pink-800 flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    )
  }

  if (!checkoutData.userId || !checkoutData.tokenQuantity) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-pink-800 flex items-center justify-center">
        <div className="max-w-md w-full mx-4">
          <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
            <h1 className="text-2xl font-bold text-red-600 mb-4">Invalid Checkout</h1>
            <p className="text-gray-600 mb-6">Missing purchase information.</p>
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-pink-800">
      <div className="max-w-md mx-auto p-6">
        {/* Header */}
        <div className="text-center mb-8 pt-8">
          <h1 className="text-3xl font-bold text-white mb-2">Checkout</h1>
          <p className="text-2xl font-semibold text-white">€ {checkoutData.totalUsdCost.toFixed(2)}</p>
        </div>

        {/* Saved Cards Section */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white">Saved Cards</h2>
            <button className="text-orange-400 font-medium text-sm">
              + Add New
            </button>
          </div>

          {cardLoading ? (
            <div className="bg-gray-700 rounded-2xl p-6 animate-pulse">
              <div className="h-4 bg-gray-600 rounded mb-4"></div>
              <div className="h-8 bg-gray-600 rounded mb-2"></div>
              <div className="h-4 bg-gray-600 rounded w-3/4"></div>
            </div>
          ) : virtualCard ? (
            <div className="space-y-4">
              {/* Virtual Card Display */}
              <div className="bg-gradient-to-br from-gray-700 to-gray-800 rounded-2xl p-6 text-white border-2 border-orange-400">
                <div className="flex justify-between items-start mb-6">
                  <div className="flex items-center space-x-2">
                    {virtualCard.cardBrand === 'MASTERCARD' ? (
                      <div className="flex items-center">
                        <div className="w-6 h-6 bg-red-500 rounded-full opacity-80"></div>
                        <div className="w-6 h-6 bg-yellow-500 rounded-full -ml-3 opacity-80"></div>
                      </div>
                    ) : (
                      <div className="text-white font-bold text-sm">
                        {virtualCard.cardBrand}
                      </div>
                    )}
                  </div>
                </div>

                <div className="text-xl font-mono tracking-wider mb-6">
                  {virtualCard.cardNumber}
                </div>

                <div className="flex justify-between items-end">
                  <div>
                    <div className="text-xs opacity-70 uppercase tracking-wide">Name</div>
                    <div className="text-sm font-medium">{virtualCard.cardHolderName}</div>
                  </div>
                  <div>
                    <div className="text-xs opacity-70 uppercase tracking-wide">Valid Till</div>
                    <div className="text-sm font-medium">
                      {String(virtualCard.expiryMonth).padStart(2, '0')}/{String(virtualCard.expiryYear).slice(-2)}
                    </div>
                  </div>
                </div>
              </div>

              {/* Alternative card option (demo) */}
              <div className="bg-gradient-to-br from-blue-600 to-purple-600 rounded-2xl p-6 text-white opacity-60">
                <div className="flex justify-between items-start mb-6">
                  <div className="text-white font-bold text-lg italic">
                    VISA
                  </div>
                </div>

                <div className="text-xl font-mono tracking-wider mb-6">
                  4111 - 1111 - 1111 - 1111
                </div>

                <div className="flex justify-between items-end">
                  <div>
                    <div className="text-xs opacity-70 uppercase tracking-wide">Name</div>
                    <div className="text-sm font-medium">{checkoutData.username.toUpperCase()}</div>
                  </div>
                  <div>
                    <div className="text-xs opacity-70 uppercase tracking-wide">Valid Till</div>
                    <div className="text-sm font-medium">10/28</div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-red-900 rounded-2xl p-6 text-center">
              <p className="text-red-200">No saved cards found</p>
            </div>
          )}
        </div>

        {/* Purchase Summary */}
        <div className="bg-white bg-opacity-10 rounded-2xl p-6 mb-6 text-white">
          <h3 className="text-lg font-semibold mb-4">Purchase Summary</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span>Token Quantity:</span>
              <span>{checkoutData.tokenQuantity.toLocaleString()} BBLIP</span>
            </div>
            <div className="flex justify-between">
              <span>Price per Token:</span>
              <span>$0.10</span>
            </div>
            <div className="flex justify-between">
              <span>Payment Asset:</span>
              <span>{checkoutData.selectedAsset}</span>
            </div>
            <div className="flex justify-between">
              <span>Required Amount:</span>
              <span>{checkoutData.requiredAmount.toFixed(6)} {checkoutData.selectedAsset}</span>
            </div>
            <div className="border-t border-white border-opacity-20 pt-2 mt-2">
              <div className="flex justify-between font-semibold">
                <span>Total:</span>
                <span>${checkoutData.totalUsdCost.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Transaction Password */}
        <div className="mb-6">
          <label className="block text-white text-sm font-medium mb-2">
            Transaction Password
          </label>
          <input
            type="password"
            value={transactionPassword}
            onChange={(e) => setTransactionPassword(e.target.value)}
            placeholder="Enter your transaction password"
            className="w-full px-4 py-3 bg-white bg-opacity-10 border border-white border-opacity-20 rounded-lg text-white placeholder-white placeholder-opacity-50 focus:ring-2 focus:ring-orange-400 focus:border-transparent"
          />
          {error && (
            <p className="text-red-400 text-sm mt-2">{error}</p>
          )}
        </div>

        {/* Proceed Button */}
        <button
          onClick={handleProceed}
          disabled={processing || !transactionPassword.trim() || !virtualCard}
          className="w-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 disabled:from-gray-600 disabled:to-gray-700 text-white font-bold py-4 px-6 rounded-2xl transition duration-200 disabled:cursor-not-allowed text-lg"
        >
          {processing ? (
            <div className="flex items-center justify-center">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
              PROCESSING...
            </div>
          ) : (
            'PROCEED'
          )}
        </button>

        {/* Back to Presale */}
        <div className="text-center mt-6">
          <Link
            href={`/presale?address=${checkoutData.address}&username=${checkoutData.username}&userId=${checkoutData.userId}`}
            className="text-white text-sm opacity-70 hover:opacity-100 transition duration-200"
          >
            ← Back to Presale
          </Link>
        </div>
      </div>
    </div>
  )
}

export default function Checkout() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-pink-800 flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    }>
      <CheckoutContent />
    </Suspense>
  )
} 