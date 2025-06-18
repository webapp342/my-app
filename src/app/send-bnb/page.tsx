'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { ethers } from 'ethers'

interface TransactionData {
  to: string
  amount: string
  gasLimit: string
  gasPrice: string
  totalCost: string
  estimatedFeeUSD: string
}

function SendBNBContent() {
  const searchParams = useSearchParams()
  const address = searchParams.get('address')
  const username = searchParams.get('username')

  const [step, setStep] = useState<'form' | 'confirm' | 'processing' | 'success' | 'error'>('form')
  const [recipientAddress, setRecipientAddress] = useState('')
  const [amount, setAmount] = useState('')
  const [userBalance, setUserBalance] = useState('0')
  const [bnbPrice, setBnbPrice] = useState(0)
  const [transactionData, setTransactionData] = useState<TransactionData | null>(null)
  const [isLoadingBalance, setIsLoadingBalance] = useState(false)
  const [isEstimatingGas, setIsEstimatingGas] = useState(false)
  const [error, setError] = useState('')
  const [transactionHash, setTransactionHash] = useState('')
  const [isValidAddress, setIsValidAddress] = useState(false)

  // Fetch user balance and BNB price
  useEffect(() => {
    if (address) {
      fetchUserBalance()
      fetchBNBPrice()
    }
  }, [address]) // eslint-disable-line react-hooks/exhaustive-deps

  // Validate recipient address
  useEffect(() => {
    if (recipientAddress.length > 0) {
      setIsValidAddress(ethers.isAddress(recipientAddress))
    } else {
      setIsValidAddress(false)
    }
  }, [recipientAddress])

  const fetchUserBalance = async () => {
    if (!address) return
    
    setIsLoadingBalance(true)
    try {
      // Fetch real blockchain balance, not database balance
      const response = await fetch(`/api/get-blockchain-balance?address=${address}`)
      const data = await response.json()
      
      if (data.success && data.balance) {
        setUserBalance(data.balance)
        console.log('Blockchain BNB balance:', data.balance)
      } else {
        setUserBalance('0')
        console.warn('Could not fetch blockchain balance:', data.error)
      }
    } catch (error) {
      console.error('Error fetching blockchain balance:', error)
      setError('Failed to fetch blockchain balance')
      setUserBalance('0')
    } finally {
      setIsLoadingBalance(false)
    }
  }

  const fetchBNBPrice = async () => {
    try {
      const response = await fetch('/api/get-binance-price?symbol=BNBUSDT')
      const data = await response.json()
      setBnbPrice(data.price || 0)
    } catch (error) {
      console.error('Error fetching BNB price:', error)
    }
  }

  const estimateGas = async () => {
    if (!amount || !recipientAddress || !isValidAddress) return

    setIsEstimatingGas(true)
    setError('')

    try {
      const response = await fetch('/api/estimate-gas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: address,
          to: recipientAddress,
          amount: amount
        })
      })

      const data = await response.json()
      
      if (data.error) {
        throw new Error(data.error)
      }

      const totalCost = (parseFloat(amount) + parseFloat(data.estimatedFeeETH)).toFixed(6)
      const estimatedFeeUSD = (parseFloat(data.estimatedFeeETH) * bnbPrice).toFixed(2)

      setTransactionData({
        to: recipientAddress,
        amount: amount,
        gasLimit: data.gasLimit,
        gasPrice: data.gasPrice,
        totalCost: totalCost,
        estimatedFeeUSD: estimatedFeeUSD
      })

      setStep('confirm')
    } catch (error) {
      console.error('Gas estimation error:', error)
      setError(error instanceof Error ? error.message : 'Failed to estimate gas')
    } finally {
      setIsEstimatingGas(false)
    }
  }

  const sendTransaction = async () => {
    if (!transactionData) return

    setStep('processing')
    setError('')

    try {
      const response = await fetch('/api/send-bnb', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fromAddress: address,
          toAddress: transactionData.to,
          amount: transactionData.amount,
          gasLimit: transactionData.gasLimit,
          gasPrice: transactionData.gasPrice
        })
      })

      const data = await response.json()
      
      if (data.error) {
        if (data.code === 'WALLET_NOT_FOUND') {
          throw new Error('This wallet is not registered in our system. Please create or import a wallet first.')
        }
        throw new Error(data.error)
      }

      setTransactionHash(data.transactionHash)
      setStep('success')
      
      // Refresh blockchain balance after successful transaction
      setTimeout(() => {
        fetchUserBalance() // This will fetch from blockchain now
      }, 3000) // Wait a bit longer for blockchain confirmation

    } catch (error) {
      console.error('Transaction error:', error)
      setError(error instanceof Error ? error.message : 'Transaction failed')
      setStep('error')
    }
  }

  const handleMaxAmount = () => {
    // Reserve more realistic gas fee for BSC (approximately 0.0002-0.0005 BNB for simple transfer)
    const gasReserve = 0.0005 // Reserve 0.0005 BNB for gas fees
    const maxAmount = Math.max(0, parseFloat(userBalance) - gasReserve)
    setAmount(maxAmount.toFixed(6))
  }

  const resetForm = () => {
    setStep('form')
    setRecipientAddress('')
    setAmount('')
    setTransactionData(null)
    setError('')
    setTransactionHash('')
  }

  const canProceed = recipientAddress && amount && isValidAddress && 
                    parseFloat(amount) > 0 && parseFloat(amount) <= parseFloat(userBalance)

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-100">
      <div className="max-w-lg mx-auto p-6">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-xl p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <Link
              href={`/dashboard?address=${address}&username=${username}`}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
            <h1 className="text-xl font-bold text-gray-900">Send BNB</h1>
            <div className="w-8"></div>
          </div>

          {/* Balance Display */}
          <div className="bg-gradient-to-r from-yellow-50 to-orange-50 rounded-xl p-4 border border-yellow-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-yellow-500 rounded-full flex items-center justify-center">
                  <span className="text-white font-bold text-lg">BNB</span>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Blockchain Balance</p>
                  <p className="text-xl font-bold text-gray-900">
                    {isLoadingBalance ? '...' : `${parseFloat(userBalance).toFixed(6)} BNB`}
                  </p>
                  <p className="text-sm text-gray-500">
                    ≈ ${(parseFloat(userBalance) * bnbPrice).toFixed(2)} USD
                  </p>
                  <p className="text-xs text-blue-600 mt-1">Live from BSC Network</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="bg-white rounded-2xl shadow-xl p-6">
          {step === 'form' && (
            <div className="space-y-6">
              <h2 className="text-lg font-semibold text-gray-900">Send BNB</h2>

              {/* Recipient Address */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">Recipient Address</label>
                <div className="relative">
                  <input
                    type="text"
                    value={recipientAddress}
                    onChange={(e) => setRecipientAddress(e.target.value)}
                    placeholder="0x1234...abcd"
                    className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent ${
                      recipientAddress && !isValidAddress ? 'border-red-300' : 'border-gray-300'
                    }`}
                  />
                  {recipientAddress && (
                    <div className="absolute right-3 top-3">
                      {isValidAddress ? (
                        <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center">
                          <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                      ) : (
                        <div className="w-6 h-6 bg-red-100 rounded-full flex items-center justify-center">
                          <svg className="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </div>
                      )}
                    </div>
                  )}
                </div>
                {recipientAddress && !isValidAddress && (
                  <p className="text-sm text-red-600">Invalid BNB address</p>
                )}
              </div>

              {/* Amount */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">Amount (BNB)</label>
                <div className="relative">
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.000000"
                    step="0.000001"
                    max={userBalance}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                  <button
                    onClick={handleMaxAmount}
                    className="absolute right-3 top-3 px-3 py-1 bg-indigo-100 hover:bg-indigo-200 text-indigo-700 text-sm font-medium rounded-lg transition-colors"
                  >
                    MAX
                  </button>
                </div>
                {amount && (
                  <p className="text-sm text-gray-500">
                    ≈ ${(parseFloat(amount || '0') * bnbPrice).toFixed(2)} USD
                  </p>
                )}
              </div>

              {/* Error Display */}
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                  <p className="text-red-800 text-sm">{error}</p>
                </div>
              )}

              {/* Continue Button */}
              <button
                onClick={estimateGas}
                disabled={!canProceed || isEstimatingGas}
                className={`w-full py-4 rounded-xl font-semibold transition-all duration-200 ${
                  canProceed && !isEstimatingGas
                    ? 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white transform hover:scale-105'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
              >
                {isEstimatingGas ? (
                  <div className="flex items-center justify-center space-x-2">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    <span>Estimating Gas...</span>
                  </div>
                ) : (
                  'Continue'
                )}
              </button>
            </div>
          )}

          {step === 'confirm' && transactionData && (
            <div className="space-y-6">
              <h2 className="text-lg font-semibold text-gray-900">Confirm Transaction</h2>

              {/* Transaction Summary */}
              <div className="bg-gray-50 rounded-xl p-4 space-y-4">
                <div className="flex justify-between">
                  <span className="text-gray-600">To</span>
                  <span className="font-mono text-sm">{`${transactionData.to.slice(0, 6)}...${transactionData.to.slice(-4)}`}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Amount</span>
                  <span className="font-semibold">{transactionData.amount} BNB</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Network Fee</span>
                  <span className="text-sm">≈ ${transactionData.estimatedFeeUSD} USD</span>
                </div>
                <hr className="border-gray-200" />
                <div className="flex justify-between font-semibold">
                  <span>Total</span>
                  <span>{transactionData.totalCost} BNB</span>
                </div>
              </div>

              {/* Gas Details */}
              <div className="bg-blue-50 rounded-xl p-4">
                <h3 className="font-medium text-blue-900 mb-2">Transaction Details</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-blue-700">Gas Limit</span>
                    <span className="text-blue-900">{transactionData.gasLimit}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-blue-700">Gas Price</span>
                    <span className="text-blue-900">{ethers.formatUnits(transactionData.gasPrice, 'gwei')} Gwei</span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex space-x-4">
                <button
                  onClick={() => setStep('form')}
                  className="flex-1 py-3 border border-gray-300 text-gray-700 rounded-xl font-medium hover:bg-gray-50 transition-colors"
                >
                  Back
                </button>
                <button
                  onClick={sendTransaction}
                  className="flex-1 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white rounded-xl font-semibold transition-all duration-200 transform hover:scale-105"
                >
                  Send BNB
                </button>
              </div>
            </div>
          )}

          {step === 'processing' && (
            <div className="text-center space-y-6">
              <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mx-auto">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
              </div>
              <h2 className="text-xl font-semibold text-gray-900">Processing Transaction</h2>
              <p className="text-gray-600">Please wait while your transaction is being processed...</p>
            </div>
          )}

          {step === 'success' && (
            <div className="text-center space-y-6">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-gray-900">Transaction Successful!</h2>
              <p className="text-gray-600">Your BNB has been sent successfully.</p>
              
              {transactionHash && (
                <div className="bg-gray-50 rounded-xl p-4">
                  <p className="text-sm font-medium text-gray-700 mb-2">Transaction Hash</p>
                  <p className="font-mono text-sm text-indigo-600 break-all">{transactionHash}</p>
                  <a
                    href={`https://bscscan.com/tx/${transactionHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center mt-2 text-sm text-indigo-600 hover:text-indigo-700"
                  >
                    View on BSCScan
                    <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                  </a>
                </div>
              )}

              <div className="flex space-x-4">
                <button
                  onClick={resetForm}
                  className="flex-1 py-3 border border-gray-300 text-gray-700 rounded-xl font-medium hover:bg-gray-50 transition-colors"
                >
                  Send Another
                </button>
                <Link
                  href={`/dashboard?address=${address}&username=${username}`}
                  className="flex-1 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white rounded-xl font-semibold text-center transition-all duration-200 transform hover:scale-105"
                >
                  Back to Dashboard
                </Link>
              </div>
            </div>
          )}

          {step === 'error' && (
            <div className="text-center space-y-6">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto">
                <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-gray-900">Transaction Failed</h2>
              <p className="text-red-600">{error}</p>
              
              <div className="flex space-x-4">
                <button
                  onClick={() => setStep('form')}
                  className="flex-1 py-3 border border-gray-300 text-gray-700 rounded-xl font-medium hover:bg-gray-50 transition-colors"
                >
                  Try Again
                </button>
                <Link
                  href={`/dashboard?address=${address}&username=${username}`}
                  className="flex-1 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white rounded-xl font-semibold text-center transition-all duration-200 transform hover:scale-105"
                >
                  Back to Dashboard
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default function SendBNB() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-100 flex items-center justify-center">
        <div className="text-gray-600">Loading...</div>
      </div>
    }>
      <SendBNBContent />
    </Suspense>
  )
} 