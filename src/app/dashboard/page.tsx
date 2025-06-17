'use client'

import { useSearchParams } from 'next/navigation'
import { useState, useEffect, Suspense } from 'react'
import Link from 'next/link'
import { useBalanceTracking } from '@/hooks/useBalanceTracking'

function DashboardContent() {
  const searchParams = useSearchParams()
  const [totalUsdValue, setTotalUsdValue] = useState(0)
  const [priceLoading, setPriceLoading] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)
  
  const address = searchParams.get('address')
  const username = searchParams.get('username')
  const network = searchParams.get('network') || 'BSC_MAINNET'
  
  // Balance tracking hook
  const balanceTracking = useBalanceTracking(userId, address)
  
  // Debug log
  console.log('Dashboard params:', { address, username, network })

  useEffect(() => {
    setMounted(true)
  }, [])

  // Get userId from wallet address
  useEffect(() => {
    const fetchUserId = async () => {
      if (!address || !mounted) return
      
      try {
        const response = await fetch(`/api/get-user-id?address=${address}`)
        const data = await response.json()
        
        if (response.ok && data.userId) {
          setUserId(data.userId)
          console.log('[DASHBOARD] Found userId:', data.userId)
        } else {
          console.warn('[DASHBOARD] Could not find userId for address:', address)
        }
      } catch (error) {
        console.error('[DASHBOARD] Error fetching userId:', error)
      }
    }

    fetchUserId()
  }, [address, mounted])

  // Calculate total USD value from stored balances
  useEffect(() => {
    const calculateTotalUsdValue = async () => {
      if (!balanceTracking.balances.length) return
      
      setPriceLoading(true)
      try {
        let totalUsd = 0
        
        // Get current prices from Binance
        const [bnbResponse, busdResponse] = await Promise.all([
          fetch('/api/get-binance-price?symbol=BNBUSDT'),
          fetch('/api/get-binance-price?symbol=BUSDUSDT') // BUSD/USDT pair for USDT price
        ])
        
        const bnbData = await bnbResponse.json()
        const busdData = await busdResponse.json()
        
        const bnbUsdtPrice = parseFloat(bnbData.price || '0')
        const busdUsdtPrice = parseFloat(busdData.price || '1')
        const usdtUsdPrice = 1 / busdUsdtPrice // Convert BUSD/USDT to USDT/USD (BUSD ≈ $1)
        
        console.log('Prices:', { bnbUsdtPrice, busdUsdtPrice, usdtUsdPrice })
        
        // Calculate total value
        for (const balance of balanceTracking.balances) {
          const amount = parseFloat(balance.balance)
          
          if (balance.token === 'BNB') {
            totalUsd += amount * bnbUsdtPrice * usdtUsdPrice
          } else if (balance.token === 'BSC-USD' || balance.token === 'USDT') {
            totalUsd += amount * usdtUsdPrice
          }
        }
        
        setTotalUsdValue(totalUsd)
        console.log('Total USD value calculated:', totalUsd, 'from balances:', balanceTracking.balances)
        
      } catch (error) {
        console.error('Error calculating USD value:', error)
      } finally {
        setPriceLoading(false)
      }
    }

    // Only calculate when we have balances
    if (balanceTracking.balanceCount > 0) {
      calculateTotalUsdValue()
    }
  }, [balanceTracking.balanceCount, balanceTracking.balances]) // Include balances dependency

  if (!mounted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-gray-600">Loading...</div>
      </div>
    )
  }

  if (!address || !username) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="max-w-md w-full mx-4">
          <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
            <h1 className="text-2xl font-bold text-red-600 mb-4">Invalid Access</h1>
            <p className="text-gray-600 mb-6">Missing wallet information.</p>
            <Link
              href="/"
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg transition duration-200"
            >
              Go to Home
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="max-w-4xl mx-auto p-6">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-xl p-6 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Welcome back, {username}!</h1>
              <p className="text-gray-600">BSC Mainnet Cüzdan Paneli</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  // Clear any stored session data and redirect
                  window.location.href = '/'
                }}
                className="bg-red-100 hover:bg-red-200 text-red-700 font-medium py-2 px-4 rounded-lg transition duration-200"
              >
                Logout
              </button>
              <Link
                href="/"
                className="bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-2 px-4 rounded-lg transition duration-200"
              >
                Home
              </Link>
            </div>
          </div>
        </div>

        {/* Wallet Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          {/* Balance Card */}
          <div className="bg-white rounded-2xl shadow-xl p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Total Portfolio Value</h2>
            <div className="text-center">
              {priceLoading || balanceTracking.isLoading ? (
                <div className="animate-pulse">
                  <div className="h-8 bg-gray-200 rounded w-32 mx-auto mb-2"></div>
                  <div className="h-4 bg-gray-200 rounded w-20 mx-auto"></div>
                </div>
              ) : (
                <>
                  <p className="text-3xl font-bold text-gray-900">${totalUsdValue.toFixed(2)}</p>
                  <p className="text-gray-500 text-sm mt-2">Based on stored balances</p>
                  <div className="mt-3 text-xs text-gray-400">
                    <div>Tokens: {balanceTracking.balanceCount}</div>
                    <div>Last sync: {balanceTracking.lastSync ? new Date(balanceTracking.lastSync).toLocaleDateString() : 'Never'}</div>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Portfolio Summary */}
          <div className="bg-white rounded-2xl shadow-xl p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Portfolio Summary</h2>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">Total Tokens:</span>
                <span className="font-medium">{balanceTracking.balanceCount}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Tracked Transactions:</span>
                <span className="font-medium">{balanceTracking.transactionCount}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Status:</span>
                <span className="text-green-600 font-medium">✓ Synced</span>
              </div>
            </div>
            
            {balanceTracking.balances.length > 0 && (
              <div className="mt-4 pt-4 border-t border-gray-200">
                <h3 className="text-sm font-medium text-gray-700 mb-2">Asset Breakdown</h3>
                <div className="space-y-2">
                  {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                  {balanceTracking.balances.map((balance: any, index: number) => (
                    <div key={index} className="flex justify-between text-sm">
                      <span className="text-gray-600">{balance.token}:</span>
                      <span className="font-medium">{parseFloat(balance.balance).toFixed(6)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Wallet Address */}
        <div className="bg-white rounded-2xl shadow-xl p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Wallet Address</h2>
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="flex items-center justify-between">
              <code className="text-sm text-gray-800 break-all flex-1 mr-4">{address}</code>
              <button
                onClick={() => navigator.clipboard.writeText(address)}
                className="text-blue-600 hover:text-blue-800 text-sm font-medium whitespace-nowrap"
              >
                Copy
              </button>
            </div>
          </div>
        </div>

        {/* Stored Balances */}
        {userId && (
          <div className="bg-white rounded-2xl shadow-xl p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Stored Token Balances</h2>
              <div className="flex gap-2">
                <button
                  onClick={balanceTracking.syncTransactions}
                  disabled={balanceTracking.isSyncing}
                  className="bg-blue-100 hover:bg-blue-200 text-blue-700 font-medium py-2 px-4 rounded-lg transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                >
                  {balanceTracking.isSyncing ? 'Syncing...' : 'Sync Transactions'}
                </button>
                <button
                  onClick={balanceTracking.refreshStatus}
                  disabled={balanceTracking.isLoading}
                  className="bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-2 px-4 rounded-lg transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                >
                  {balanceTracking.isLoading ? 'Loading...' : 'Refresh'}
                </button>
              </div>
            </div>

            {balanceTracking.error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                <div className="flex items-center">
                  <svg className="w-5 h-5 text-red-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  <span className="text-red-700 text-sm">{balanceTracking.error}</span>
                  <button
                    onClick={balanceTracking.clearError}
                    className="ml-auto text-red-500 hover:text-red-700"
                  >
                    ×
                  </button>
                </div>
              </div>
            )}

            {balanceTracking.syncStats && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <svg className="w-5 h-5 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    <span className="text-green-700 text-sm">
                      Sync completed: {balanceTracking.syncStats.savedTransactions} transactions saved 
                      (out of {balanceTracking.syncStats.totalTransactions} total)
                    </span>
                  </div>
                  <button
                    onClick={balanceTracking.clearSyncStats}
                    className="text-green-500 hover:text-green-700"
                  >
                    ×
                  </button>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="text-sm text-gray-600">Total Tokens</div>
                <div className="text-2xl font-bold text-gray-900">{balanceTracking.balanceCount}</div>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="text-sm text-gray-600">Transactions Tracked</div>
                <div className="text-2xl font-bold text-gray-900">{balanceTracking.transactionCount}</div>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="text-sm text-gray-600">Last Sync</div>
                <div className="text-sm font-medium text-gray-900">
                  {balanceTracking.lastSync 
                    ? new Date(balanceTracking.lastSync).toLocaleDateString()
                    : 'Never'
                  }
                </div>
              </div>
            </div>

            {balanceTracking.balances.length > 0 && (
              <div className="mt-6">
                <h3 className="text-md font-semibold text-gray-900 mb-3">Token Balances</h3>
                <div className="space-y-3">
                  {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                  {balanceTracking.balances.map((balance: any, index: number) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center">
                        <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-sm font-bold mr-3">
                          {balance.token.charAt(0)}
                        </div>
                        <div>
                          <div className="font-medium text-gray-900">{balance.token}</div>
                          <div className="text-sm text-gray-500">{balance.network}</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-medium text-gray-900">{balance.balance}</div>
                        <div className="text-sm text-gray-500">{balance.token}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {balanceTracking.balances.length === 0 && !balanceTracking.isLoading && !balanceTracking.isSyncing && (
              <div className="text-center py-8">
                <div className="text-gray-400 mb-2">No stored balances found</div>
                <div className="text-sm text-gray-500">Click &quot;Sync Transactions&quot; to track your token balances</div>
              </div>
            )}
          </div>
        )}

        {/* Quick Actions */}
        <div className="bg-white rounded-2xl shadow-xl p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <button className="bg-blue-50 hover:bg-blue-100 text-blue-700 font-medium py-4 px-6 rounded-lg transition duration-200 border border-blue-200">
              Send BNB
            </button>
            <button className="bg-green-50 hover:bg-green-100 text-green-700 font-medium py-4 px-6 rounded-lg transition duration-200 border border-green-200">
              Receive
            </button>
            <button className="bg-purple-50 hover:bg-purple-100 text-purple-700 font-medium py-4 px-6 rounded-lg transition duration-200 border border-purple-200">
              View on BSCScan
            </button>
          </div>
        </div>



        {/* Features Notice */}
        <div className="mt-6 bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex">
            <svg className="w-5 h-5 text-green-500 mt-0.5 mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
            <div>
              <p className="text-sm text-green-700">
                <strong>Real-Time Features:</strong> Bu cüzdan gerçek blockchain verilerini kullanır ve Binance API&apos;sinden 
                güncel fiyat bilgileri alarak USDT cinsinden değer gösterir. Tüm bakiyeler ve işlemler gerçek blockchain ağlarından çekilir.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function Dashboard() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-gray-600">Loading...</div>
      </div>
    }>
      <DashboardContent />
    </Suspense>
  )
} 