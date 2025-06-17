'use client'

import { useSearchParams } from 'next/navigation'
import { useState, useEffect, Suspense } from 'react'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import ErrorBoundary from '@/components/ErrorBoundary'

// Dynamic import to prevent SSR hydration issues
const Portfolio = dynamic(() => import('@/components/Portfolio'), { 
  ssr: false,
  loading: () => (
    <div className="bg-white rounded-2xl shadow-xl p-6 mb-6">
      <div className="animate-pulse">
        <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
        <div className="space-y-3">
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          <div className="h-4 bg-gray-200 rounded w-1/4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/3"></div>
        </div>
      </div>
    </div>
  )
})

function DashboardContent() {
  const searchParams = useSearchParams()
  const [balanceData, setBalanceData] = useState({
    balanceFormatted: '0.000000',
    symbol: 'BNB',
    network: 'BSC Mainnet',
    usdt: {
      value: 0,
      formatted: '$0.00',
      price: 0,
      tokenSymbol: 'BNB'
    }
  })
  const [loading, setLoading] = useState(true)
  const [mounted, setMounted] = useState(false)
  
  const address = searchParams.get('address')
  const username = searchParams.get('username')
  const network = searchParams.get('network') || 'BSC_MAINNET'
  
  // Debug log
  console.log('Dashboard params:', { address, username, network })

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    const fetchBalance = async () => {
      if (!address || !mounted) return
      
      setLoading(true)
      try {
        const response = await fetch(`/api/get-balance?address=${address}&network=${network}`)
        const data = await response.json()
        
        if (response.ok) {
          console.log('Balance API response:', data)
          setBalanceData({
            balanceFormatted: data.balanceFormatted || '0.000000',
            symbol: data.symbol || 'BNB',
            network: data.network || 'BSC Mainnet',
            usdt: data.usdt || {
              value: 0,
              formatted: '$0.00',
              price: 0,
              tokenSymbol: 'BNB'
            }
          })
        } else {
          console.error('Error fetching balance:', data.error)
        }
      } catch (error) {
        console.error('Error fetching balance:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchBalance()
  }, [address, network, mounted])

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
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Wallet Balance</h2>
            <div className="text-center">
              {loading ? (
                <div className="animate-pulse">
                  <div className="h-8 bg-gray-200 rounded w-32 mx-auto mb-2"></div>
                  <div className="h-4 bg-gray-200 rounded w-20 mx-auto"></div>
                </div>
              ) : (
                <>
                  <p className="text-3xl font-bold text-gray-900">{balanceData.balanceFormatted} {balanceData.symbol}</p>
                  <p className="text-xl font-semibold text-green-600 mt-2">{balanceData.usdt?.formatted || '$0.00'}</p>
                  <p className="text-gray-500 text-sm">Real-time blockchain balance</p>
                  <p className="text-gray-400 text-xs mt-1">
                    1 {balanceData.usdt?.tokenSymbol || 'BNB'} = ${balanceData.usdt?.price?.toFixed(2) || '0.00'} USDT
                  </p>
                </>
              )}
            </div>
          </div>

          {/* Network Info */}
          <div className="bg-white rounded-2xl shadow-xl p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Network Information</h2>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">Network:</span>
                <span className="font-medium">{balanceData.network}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Currency:</span>
                <span className="font-medium">{balanceData.symbol}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Status:</span>
                <span className="text-green-600 font-medium">✓ Connected</span>
              </div>
            </div>
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

        {/* Portfolio Section */}
        <ErrorBoundary>
          <Portfolio address={address} className="mb-6" />
        </ErrorBoundary>

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