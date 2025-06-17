'use client'

import { useSearchParams } from 'next/navigation'
import { useState, Suspense } from 'react'
import Link from 'next/link'

function WelcomeContent() {
  const searchParams = useSearchParams()
  const [copied, setCopied] = useState('')
  
  const address = searchParams.get('address')
  const privateKey = searchParams.get('privateKey')
  const secondPrivateKey = searchParams.get('secondPrivateKey')
  const username = searchParams.get('username')
  const network = searchParams.get('network')

  const copyToClipboard = async (text: string, type: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(type)
      setTimeout(() => setCopied(''), 2000)
    } catch (err) {
      console.error('Failed to copy text: ', err)
    }
  }

  if (!address || !privateKey || !username) {
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
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-100 flex items-center justify-center">
      <div className="max-w-2xl w-full mx-4">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Welcome, {username}!
            </h1>
            <p className="text-gray-600">
              Your BSC wallet has been created successfully
            </p>
          </div>

          <div className="space-y-6">
            {/* Wallet Address */}
            <div className="bg-gray-50 rounded-lg p-6">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-lg font-semibold text-gray-900">Wallet Address</h3>
                <button
                  onClick={() => copyToClipboard(address, 'address')}
                  className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                >
                  {copied === 'address' ? 'Copied!' : 'Copy'}
                </button>
              </div>
              <div className="bg-white p-3 rounded-lg border">
                <code className="text-sm text-gray-800 break-all">{address}</code>
              </div>
            </div>

            {/* Primary Private Key */}
            <div className="bg-red-50 border border-red-200 rounded-lg p-6">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-lg font-semibold text-red-900">Primary Private Key (Wallet Control)</h3>
                <button
                  onClick={() => copyToClipboard(privateKey, 'privateKey')}
                  className="text-red-600 hover:text-red-800 text-sm font-medium"
                >
                  {copied === 'privateKey' ? 'Copied!' : 'Copy'}
                </button>
              </div>
              <div className="bg-white p-3 rounded-lg border border-red-200">
                <code className="text-sm text-gray-800 break-all">{privateKey}</code>
              </div>
              <p className="mt-2 text-sm text-red-700">
                <strong>Real blockchain private key</strong> - Controls your actual wallet and funds
              </p>
            </div>

            {/* Second Private Key */}
            {secondPrivateKey && (
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-6">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-lg font-semibold text-purple-900">Backup Access Key</h3>
                  <button
                    onClick={() => copyToClipboard(secondPrivateKey, 'secondPrivateKey')}
                    className="text-purple-600 hover:text-purple-800 text-sm font-medium"
                  >
                    {copied === 'secondPrivateKey' ? 'Copied!' : 'Copy'}
                  </button>
                </div>
                <div className="bg-white p-3 rounded-lg border border-purple-200">
                  <code className="text-sm text-gray-800 break-all">{secondPrivateKey}</code>
                </div>
                <p className="mt-2 text-sm text-purple-700">
                  <strong>Alternative access key</strong> - Can be used to import and access your wallet
                </p>
              </div>
            )}

            {/* Security Warning */}
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
              <div className="flex items-start">
                <svg className="w-5 h-5 text-yellow-500 mt-0.5 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                <div className="text-sm text-yellow-700">
                  <p className="font-semibold mb-1">⚠️ CRITICAL SECURITY WARNING:</p>
                  <ul className="list-disc list-inside space-y-1">
                    <li>Save BOTH keys in separate secure locations</li>
                    <li>Never share these keys with anyone</li>
                    <li>The primary key controls your actual blockchain wallet</li>
                    <li>The backup key provides alternative access to your account</li>
                    <li>Anyone with either key can access your wallet</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Recovery Instructions */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-blue-900 mb-3">Recovery Instructions</h3>
              <div className="text-sm text-blue-800 space-y-2">
                <p>1. <strong>Write down</strong> your private key on paper and store it safely</p>
                <p>2. <strong>Never store</strong> your private key digitally (photos, cloud, etc.)</p>
                <p>3. <strong>Test recovery</strong> by importing your wallet using the private key</p>
                <p>4. <strong>Multiple copies</strong> - store backups in different secure locations</p>
              </div>
            </div>
          </div>

          <div className="mt-8 flex flex-col sm:flex-row gap-4">
            <Link
              href={`/dashboard?address=${address}&username=${username}&network=${network}`}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg text-center transition duration-200"
            >
              Go to Dashboard
            </Link>
            <Link
              href="/"
              className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-900 font-semibold py-3 px-6 rounded-lg text-center border-2 border-gray-200 transition duration-200"
            >
              Create Another Wallet
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function Welcome() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-gray-600">Loading...</div>
      </div>
    }>
      <WelcomeContent />
    </Suspense>
  )
} 