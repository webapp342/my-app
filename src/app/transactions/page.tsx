'use client'

import { useState, Suspense, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import TransactionExplorer from '@/components/TransactionExplorer'
import { isValidAddress } from '@/lib/transaction-service'

function TransactionPageContent() {
  const searchParams = useSearchParams()
  const initialAddress = searchParams.get('address') || ''

  const [address, setAddress] = useState(initialAddress)
  const [network, setNetwork] = useState<'ethereum' | 'bsc'>('bsc') // Default to BSC since we mainly use BSC_MAINNET
  const [searchAddress, setSearchAddress] = useState(initialAddress)
  const [error, setError] = useState('')
  const [networkLoading, setNetworkLoading] = useState(false)
  const [detectedNetwork, setDetectedNetwork] = useState<string | null>(null)

  // Function to detect network from wallet address
  const detectNetworkFromAddress = async (walletAddress: string) => {
    if (!walletAddress.trim() || !isValidAddress(walletAddress.trim())) {
      setDetectedNetwork(null)
      return
    }

    setNetworkLoading(true)
    try {
      const response = await fetch(`/api/get-wallet-network?address=${encodeURIComponent(walletAddress.trim())}`)
      const data = await response.json()
      
      if (response.ok && data.network) {
        // Convert database network format to our format
        const networkMap: { [key: string]: 'ethereum' | 'bsc' } = {
          'BSC_MAINNET': 'bsc',
          'BSC_TESTNET': 'bsc',
          'ETHEREUM': 'ethereum',
          'POLYGON': 'ethereum', // Default fallback
          'ARBITRUM': 'ethereum'  // Default fallback
        }
        
        const detectedNet = networkMap[data.network] || 'bsc'
        setNetwork(detectedNet)
        setDetectedNetwork(data.network)
      } else {
        // If not found in database, keep current selection
        setDetectedNetwork(null)
      }
    } catch (error) {
      console.error('Error detecting network:', error)
      setDetectedNetwork(null)
    } finally {
      setNetworkLoading(false)
    }
  }

  // Auto-detect network when address changes
  useEffect(() => {
    if (address.trim() && isValidAddress(address.trim())) {
      detectNetworkFromAddress(address.trim())
    } else {
      setDetectedNetwork(null)
    }
  }, [address])

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!address.trim()) {
      setError('Please enter an address')
      return
    }

    if (!isValidAddress(address.trim())) {
      setError('Please enter a valid Ethereum/BSC address')
      return
    }

    // Auto-detect network from database first
    await detectNetworkFromAddress(address.trim())
    
    setSearchAddress(address.trim())

    // Update URL without refresh
    const params = new URLSearchParams()
    params.set('address', address.trim())
    params.set('network', network)
    window.history.replaceState({}, '', `${window.location.pathname}?${params}`)
  }

  const handleClear = () => {
    setAddress('')
    setSearchAddress('')
    setError('')
    window.history.replaceState({}, '', window.location.pathname)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="max-w-7xl mx-auto p-6">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Blockchain Transaction Explorer
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            View real-time transaction history for any Ethereum or BSC address. 
            Track deposits, withdrawals, and token transfers with detailed categorization.
          </p>
        </div>

        {/* Search Form */}
        <div className="bg-white rounded-2xl shadow-xl p-6 mb-8">
          <form onSubmit={handleSearch} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
              <div className="md:col-span-8">
                <label htmlFor="address" className="block text-sm font-medium text-gray-700 mb-2">
                  Wallet Address
                </label>
                <input
                  type="text"
                  id="address"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
                  placeholder="0x742d35cc6491c59bc79a40d9a0e86b1e54a9d4b8"
                />
              </div>
              
              <div className="md:col-span-2">
                <label htmlFor="network" className="block text-sm font-medium text-gray-700 mb-2">
                  Network {detectedNetwork && <span className="text-xs text-green-600">(Auto-detected)</span>}
                </label>
                <div className="relative">
                  <select
                    id="network"
                    value={network}
                    onChange={(e) => setNetwork(e.target.value as 'ethereum' | 'bsc')}
                    disabled={detectedNetwork !== null}
                    className={`w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      detectedNetwork ? 'bg-gray-50 text-gray-600 cursor-not-allowed' : ''
                    }`}
                  >
                    <option value="ethereum">Ethereum</option>
                    <option value="bsc">BSC</option>
                  </select>
                  {networkLoading && (
                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                    </div>
                  )}
                </div>
                {detectedNetwork && (
                  <p className="text-xs text-green-600 mt-1">
                    Network auto-detected from wallet: {detectedNetwork}
                  </p>
                )}
              </div>

              <div className="md:col-span-2 flex items-end gap-2">
                <button
                  type="submit"
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-lg transition duration-200"
                >
                  Search
                </button>
                {searchAddress && (
                  <button
                    type="button"
                    onClick={handleClear}
                    className="bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-3 px-4 rounded-lg transition duration-200"
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                {error}
              </div>
            )}
          </form>

          {/* Info Cards */}
          <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-blue-800">Deposits</h3>
                  <p className="text-xs text-blue-600">Incoming transactions</p>
                </div>
              </div>
            </div>

            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800">Withdrawals</h3>
                  <p className="text-xs text-red-600">Outgoing transactions</p>
                </div>
              </div>
            </div>

            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-green-800">Token Transfers</h3>
                  <p className="text-xs text-green-600">ERC20 token movements</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Transaction Explorer */}
        {searchAddress && (
          <TransactionExplorer 
            address={searchAddress} 
            network={network}
            className="mb-8"
          />
        )}

        {/* Features Info */}
        <div className="bg-white rounded-2xl shadow-xl p-6">
          <h2 className="text-2xl font-semibold text-gray-900 mb-6">Features</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-12 h-12 bg-blue-100 rounded-full mb-4">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Real-time Data</h3>
              <p className="text-sm text-gray-600">Direct API integration with Etherscan and BSCScan</p>
            </div>

            <div className="text-center">
              <div className="inline-flex items-center justify-center w-12 h-12 bg-green-100 rounded-full mb-4">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Smart Categorization</h3>
              <p className="text-sm text-gray-600">Automatically categorizes deposits, withdrawals, and token transfers</p>
            </div>

            <div className="text-center">
              <div className="inline-flex items-center justify-center w-12 h-12 bg-purple-100 rounded-full mb-4">
                <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17v4a2 2 0 002 2h4M11 7l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Token Detection</h3>
              <p className="text-sm text-gray-600">Detects and displays ERC20 token transfers with symbols and amounts</p>
            </div>

            <div className="text-center">
              <div className="inline-flex items-center justify-center w-12 h-12 bg-orange-100 rounded-full mb-4">
                <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Explorer Links</h3>
              <p className="text-sm text-gray-600">Direct links to blockchain explorers for detailed transaction info</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function TransactionsPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-gray-600">Loading...</div>
      </div>
    }>
      <TransactionPageContent />
    </Suspense>
  )
} 