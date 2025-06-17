'use client'

import { useState, useEffect } from 'react'
import { Balance, Transaction } from '@/types/database'

interface WalletDashboardProps {
  userId: string
  walletAddress: string
}

interface BalanceData {
  symbol: string
  address: string | null
  onChainBalance: string
  trackedDeposits: number
  decimals: number
  lastUpdated: string | null
}

interface TransactionData {
  id: string
  hash: string
  from: string
  to: string
  amount: string
  tokenSymbol: string
  tokenAddress: string | null
  network: string
  type: 'deposit' | 'withdraw'
  status: string
  timestamp: string
  explorerUrl: string
}

export default function WalletDashboard({ userId, walletAddress }: WalletDashboardProps) {
  const [balances, setBalances] = useState<BalanceData[]>([])
  const [transactions, setTransactions] = useState<TransactionData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'balances' | 'transactions'>('balances')
  const [mounted, setMounted] = useState(false)

  // Prevent hydration mismatch
  useEffect(() => {
    setMounted(true)
  }, [])

  // Fetch balances
  const fetchBalances = async () => {
    try {
      const response = await fetch('/api/get-balance', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          walletAddress,
          userId
        })
      })

      if (!response.ok) {
        throw new Error('Failed to fetch balances')
      }

      const data = await response.json()
      setBalances(data.balances || [])
    } catch (error) {
      console.error('Error fetching balances:', error)
      setError('Failed to fetch balances')
    }
  }

  // Fetch transactions
  const fetchTransactions = async () => {
    try {
      const response = await fetch(`/api/transactions?userId=${userId}&limit=10`)
      
      if (!response.ok) {
        throw new Error('Failed to fetch transactions')
      }

      const data = await response.json()
      setTransactions(data.transactions || [])
    } catch (error) {
      console.error('Error fetching transactions:', error)
      setError('Failed to fetch transactions')
    }
  }

  // Start monitoring
  const startMonitoring = async () => {
    try {
      const response = await fetch('/api/monitor-wallet', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action: 'start' })
      })

      if (!response.ok) {
        throw new Error('Failed to start monitoring')
      }

      console.log('Monitoring started successfully')
    } catch (error) {
      console.error('Error starting monitoring:', error)
    }
  }

  useEffect(() => {
    if (!mounted) return

    const loadData = async () => {
      setLoading(true)
      await Promise.all([fetchBalances(), fetchTransactions()])
      await startMonitoring()
      setLoading(false)
    }

    loadData()

    // Refresh data every 30 seconds
    const interval = setInterval(() => {
      fetchBalances()
      fetchTransactions()
    }, 30000)

    return () => clearInterval(interval)
  }, [userId, walletAddress, mounted])

  const formatAmount = (amount: string, decimals: number = 18) => {
    const num = parseFloat(amount)
    if (num === 0) return '0.0000'
    if (num < 0.0001) return '<0.0001'
    return num.toFixed(4)
  }

  const formatTimestamp = (timestamp: string) => {
    if (!mounted) return ''
    return new Date(timestamp).toLocaleString()
  }

  // Prevent rendering until mounted to avoid hydration mismatch
  if (!mounted) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2">Loading...</span>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2">Loading wallet data...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="text-red-800 font-medium">Error</div>
        <div className="text-red-600 text-sm">{error}</div>
        <button 
          onClick={() => {
            setError(null)
            setLoading(true)
            fetchBalances()
            fetchTransactions()
            setLoading(false)
          }}
          className="mt-2 text-red-600 underline text-sm"
        >
          Try again
        </button>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Wallet Dashboard</h1>
        <div className="text-sm text-gray-600">
          <div>Address: <code className="bg-gray-100 px-2 py-1 rounded text-xs">{walletAddress}</code></div>
          <div className="mt-1">Network: BSC Mainnet</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('balances')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'balances'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Balances
          </button>
          <button
            onClick={() => setActiveTab('transactions')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'transactions'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Transactions
          </button>
        </nav>
      </div>

      {/* Balances Tab */}
      {activeTab === 'balances' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold">Token Balances</h2>
            <button
              onClick={fetchBalances}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700"
            >
              Refresh
            </button>
          </div>

          <div className="grid gap-4">
            {balances.map((balance) => (
              <div key={balance.symbol} className="bg-white border border-gray-200 rounded-lg p-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-medium text-gray-900">{balance.symbol}</h3>
                    {balance.address && (
                      <p className="text-xs text-gray-500 mt-1">
                        {balance.address.slice(0, 6)}...{balance.address.slice(-4)}
                      </p>
                    )}
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-semibold">
                      {formatAmount(balance.onChainBalance, balance.decimals)}
                    </div>
                    <div className="text-sm text-gray-500">On-chain Balance</div>
                  </div>
                </div>
                
                <div className="mt-3 pt-3 border-t border-gray-100">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Tracked Deposits:</span>
                    <span className="font-medium">{formatAmount(balance.trackedDeposits.toString())}</span>
                  </div>
                  {balance.lastUpdated && (
                    <div className="flex justify-between text-sm mt-1">
                      <span className="text-gray-600">Last Updated:</span>
                      <span className="text-gray-500">{formatTimestamp(balance.lastUpdated)}</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {balances.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              No balances found. Make sure wallet monitoring is active.
            </div>
          )}
        </div>
      )}

      {/* Transactions Tab */}
      {activeTab === 'transactions' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold">Recent Transactions</h2>
            <button
              onClick={fetchTransactions}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700"
            >
              Refresh
            </button>
          </div>

          <div className="space-y-3">
            {transactions.map((tx) => (
              <div key={tx.id} className="bg-white border border-gray-200 rounded-lg p-4">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        tx.type === 'deposit' 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {tx.type === 'deposit' ? '↓ Deposit' : '↑ Withdraw'}
                      </span>
                      <span className="text-xs text-gray-500">{tx.status}</span>
                    </div>
                    
                    <div className="mt-2">
                      <div className="text-lg font-semibold">
                        {formatAmount(tx.amount)} {tx.tokenSymbol}
                      </div>
                      <div className="text-sm text-gray-600 mt-1">
                        From: {tx.from.slice(0, 6)}...{tx.from.slice(-4)}
                      </div>
                      <div className="text-sm text-gray-600">
                        To: {tx.to.slice(0, 6)}...{tx.to.slice(-4)}
                      </div>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <div className="text-sm text-gray-500">
                      {formatTimestamp(tx.timestamp)}
                    </div>
                    <a
                      href={tx.explorerUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-800 text-sm underline"
                    >
                      View on Explorer
                    </a>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {transactions.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              No transactions found. Deposits will appear here automatically.
            </div>
          )}
        </div>
      )}
    </div>
  )
} 