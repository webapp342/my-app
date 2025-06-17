'use client'

import { useSearchParams } from 'next/navigation'
import { useState, useEffect, Suspense } from 'react'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import ErrorBoundary from '@/components/ErrorBoundary'
import WalletDashboard from '@/components/WalletDashboard'

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
  const [userInfo, setUserInfo] = useState<{
    userId: string | null
    username: string | null
    walletAddress: string | null
    network: string
  }>({
    userId: null,
    username: null,
    walletAddress: null,
    network: 'BSC_MAINNET'
  })
  const [loading, setLoading] = useState(true)
  const [mounted, setMounted] = useState(false)
  
  // Prevent hydration mismatch
  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!mounted) return

    const address = searchParams.get('address')
    const username = searchParams.get('username')
    const userId = searchParams.get('userId')
    const network = searchParams.get('network') || 'BSC_MAINNET'
    
    // Debug log
    console.log('Dashboard params:', { address, username, userId, network })

    setUserInfo({
      userId,
      username,
      walletAddress: address,
      network
    })
    setLoading(false)
  }, [searchParams, mounted])

  // Prevent rendering until mounted
  if (!mounted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-gray-600">Loading...</div>
      </div>
    )
  }

  if (!userInfo.walletAddress || !userInfo.username) {
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="flex items-center space-x-2">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="text-gray-600">Loading dashboard...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="max-w-7xl mx-auto p-6">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-xl p-6 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Welcome back, {userInfo.username}!</h1>
              <p className="text-gray-600">Real-time BSC Wallet Monitoring with Alchemy</p>
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

        {/* Main Dashboard */}
        <ErrorBoundary>
          {userInfo.userId && userInfo.walletAddress ? (
            <WalletDashboard 
              userId={userInfo.userId} 
              walletAddress={userInfo.walletAddress} 
            />
          ) : (
            <div className="bg-white rounded-2xl shadow-xl p-6 mb-6">
              <div className="text-center py-8">
                <div className="text-red-600 mb-4">
                  <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">User ID Required</h3>
                <p className="text-gray-600 mb-4">
                  To use real-time monitoring, please create a new wallet or import an existing one.
                </p>
                <div className="flex gap-4 justify-center">
                  <Link
                    href="/create-wallet"
                    className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition duration-200"
                  >
                    Create Wallet
                  </Link>
                  <Link
                    href="/import-wallet"
                    className="bg-gray-600 hover:bg-gray-700 text-white font-medium py-2 px-4 rounded-lg transition duration-200"
                  >
                    Import Wallet
                  </Link>
                </div>
              </div>
            </div>
          )}
        </ErrorBoundary>

        {/* Quick Actions */}
        <div className="bg-white rounded-2xl shadow-xl p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Link
              href="/create-wallet"
              className="bg-green-100 hover:bg-green-200 text-green-800 font-medium py-3 px-4 rounded-lg text-center transition duration-200"
            >
              Create New Wallet
            </Link>
            <Link
              href="/import-wallet"
              className="bg-blue-100 hover:bg-blue-200 text-blue-800 font-medium py-3 px-4 rounded-lg text-center transition duration-200"
            >
              Import Wallet
            </Link>
            <Link
              href="/transactions"
              className="bg-purple-100 hover:bg-purple-200 text-purple-800 font-medium py-3 px-4 rounded-lg text-center transition duration-200"
            >
              Transaction History
            </Link>
          </div>
        </div>

        {/* Information Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div className="bg-white rounded-2xl shadow-xl p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">🔄 Real-time Monitoring</h3>
            <div className="space-y-2 text-sm text-gray-600">
              <p>• Automatic deposit detection</p>
              <p>• ERC20 token support (USDT, BUSD, WETH)</p>
              <p>• WebSocket-based real-time updates</p>
              <p>• Transaction history tracking</p>
            </div>
          </div>
          
          <div className="bg-white rounded-2xl shadow-xl p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">⚡ Powered by Alchemy</h3>
            <div className="space-y-2 text-sm text-gray-600">
              <p>• BSC Mainnet integration</p>
              <p>• High-performance API</p>
              <p>• Reliable blockchain data</p>
              <p>• Enterprise-grade infrastructure</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function Dashboard() {
  return (
    <ErrorBoundary>
      <Suspense fallback={
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
          <div className="text-gray-600">Loading dashboard...</div>
        </div>
      }>
        <DashboardContent />
      </Suspense>
    </ErrorBoundary>
  )
} 