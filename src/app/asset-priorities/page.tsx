'use client';

import { useSearchParams } from 'next/navigation';
import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';

interface AssetPriority {
  id?: string;
  token_symbol: string;
  priority_order: number;
  is_enabled: boolean;
}

function AssetPrioritiesContent() {
  const searchParams = useSearchParams();
  const [mounted, setMounted] = useState(false);
  const [priorities, setPriorities] = useState<AssetPriority[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const userId = searchParams.get('userId');
  const username = searchParams.get('username');
  const address = searchParams.get('address');

  useEffect(() => {
    setMounted(true);
  }, []);

  // Fetch current priorities
  useEffect(() => {
    const fetchPriorities = async () => {
      if (!userId || !mounted) return;

      setLoading(true);
      try {
        const response = await fetch(`/api/asset-priorities?userId=${userId}`);
        const data = await response.json();

        if (response.ok && data.success) {
          setPriorities(data.priorities);
          if (data.isDefault) {
            setMessage(
              `Default priorities created based on your ${data.availableTokens?.length || 0} tokens. You can customize them below.`
            );
          }
          if (data.message) {
            setMessage(data.message);
          }
        } else {
          setError('Failed to load asset priorities');
        }
      } catch (error) {
        console.error('[ASSET PRIORITIES] Error fetching priorities:', error);
        setError('Network error while loading priorities');
      } finally {
        setLoading(false);
      }
    };

    fetchPriorities();
  }, [userId, mounted]);

  // Move asset up in priority
  const moveUp = (index: number) => {
    if (index === 0) return;

    const newPriorities = [...priorities];
    // Swap with previous item
    const temp = newPriorities[index];
    newPriorities[index] = newPriorities[index - 1];
    newPriorities[index - 1] = temp;

    // Update priority_order values
    newPriorities.forEach((priority, idx) => {
      priority.priority_order = idx + 1;
    });

    setPriorities(newPriorities);
  };

  // Move asset down in priority
  const moveDown = (index: number) => {
    if (index === priorities.length - 1) return;

    const newPriorities = [...priorities];
    // Swap with next item
    const temp = newPriorities[index];
    newPriorities[index] = newPriorities[index + 1];
    newPriorities[index + 1] = temp;

    // Update priority_order values
    newPriorities.forEach((priority, idx) => {
      priority.priority_order = idx + 1;
    });

    setPriorities(newPriorities);
  };

  // Toggle asset enabled/disabled
  const toggleEnabled = (index: number) => {
    const newPriorities = [...priorities];
    newPriorities[index].is_enabled = !newPriorities[index].is_enabled;
    setPriorities(newPriorities);
  };

  // Save priorities to database
  const savePriorities = async () => {
    if (!userId) return;

    setSaving(true);
    setError('');
    setMessage('');

    try {
      const response = await fetch('/api/asset-priorities', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          priorities: priorities,
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setMessage('Asset priorities saved successfully!');
        setTimeout(() => setMessage(''), 3000);
      } else {
        setError(data.error || 'Failed to save priorities');
      }
    } catch (error) {
      console.error('[ASSET PRIORITIES] Error saving priorities:', error);
      setError('Network error while saving priorities');
    } finally {
      setSaving(false);
    }
  };

  // Asset symbols with display names and colors
  const assetInfo: Record<
    string,
    { name: string; color: string; icon: string }
  > = {
    BNB: { name: 'Binance Coin', color: 'bg-yellow-500', icon: '🪙' },
    'BSC-USD': { name: 'BSC-USD', color: 'bg-green-500', icon: '💵' },
    AAVE: { name: 'Aave', color: 'bg-purple-600', icon: '🏦' },
    UNI: { name: 'Uniswap', color: 'bg-pink-500', icon: '🦄' },
    LINK: { name: 'Chainlink', color: 'bg-blue-600', icon: '🔗' },
    DOT: { name: 'Polkadot', color: 'bg-red-500', icon: '⚫' },
    ADA: { name: 'Cardano', color: 'bg-blue-700', icon: '♠️' },
    USDC: { name: 'USD Coin', color: 'bg-blue-500', icon: '💰' },
    BUSD: { name: 'Binance USD', color: 'bg-purple-500', icon: '💳' },
    SOL: { name: 'Solana', color: 'bg-purple-400', icon: '☀️' },
    XRP: { name: 'XRP', color: 'bg-gray-700', icon: '💎' },
    DOGE: { name: 'Dogecoin', color: 'bg-yellow-400', icon: '🐕' },
    LTC: { name: 'Litecoin', color: 'bg-gray-500', icon: '⚡' },
    BCH: { name: 'Bitcoin Cash', color: 'bg-green-600', icon: '💚' },
    MATIC: { name: 'Polygon', color: 'bg-purple-700', icon: '🔷' },
    SHIB: { name: 'Shiba Inu', color: 'bg-orange-500', icon: '🐕' },
    AVAX: { name: 'Avalanche', color: 'bg-red-600', icon: '🏔️' },
    BBLIP: { name: 'BBLIP Token', color: 'bg-indigo-600', icon: '🚀' },
  };

  if (!mounted) {
    return (
      <div className='min-h-screen bg-gradient-to-br from-indigo-50 to-purple-100 flex items-center justify-center'>
        <div className='text-gray-600'>Loading...</div>
      </div>
    );
  }

  if (!userId || !username) {
    return (
      <div className='min-h-screen bg-gradient-to-br from-indigo-50 to-purple-100 flex items-center justify-center'>
        <div className='max-w-md w-full mx-4'>
          <div className='bg-white rounded-2xl shadow-xl p-8 text-center'>
            <h1 className='text-2xl font-bold text-red-600 mb-4'>
              Invalid Access
            </h1>
            <p className='text-gray-600 mb-6'>
              Missing required user information.
            </p>
            <Link
              href='/'
              className='bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 px-6 rounded-lg transition duration-200'
            >
              Go to Home
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className='min-h-screen bg-gradient-to-br from-indigo-50 to-purple-100'>
      <div className='max-w-2xl mx-auto p-6'>
        {/* Header */}
        <div className='bg-white rounded-2xl shadow-xl p-6 mb-6'>
          <div className='flex items-center justify-between'>
            <div>
              <h1 className='text-3xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent'>
                Asset Spending Priorities
              </h1>
              <p className='text-gray-600 mt-2'>
                Set the order in which your assets will be used for payments
              </p>
            </div>
            <Link
              href={`/dashboard?address=${address}&username=${username}`}
              className='bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-2 px-4 rounded-lg transition duration-200'
            >
              ← Dashboard
            </Link>
          </div>
        </div>

        {/* Instructions */}
        <div className='bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6'>
          <div className='flex'>
            <div className='text-blue-600 text-xl mr-3'>ℹ️</div>
            <div>
              <h3 className='text-blue-900 font-semibold mb-2'>
                How it works:
              </h3>
              <ul className='text-blue-800 text-sm space-y-1'>
                <li>
                  • Assets with higher priority (top of list) will be used first
                </li>
                <li>• Use ↑ ↓ buttons to reorder your preferences</li>
                <li>• Toggle switches to enable/disable specific assets</li>
                <li>
                  • Changes are saved automatically when you click &ldquo;Save
                  Priorities&rdquo;
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Priorities List */}
        <div className='bg-white rounded-2xl shadow-xl p-6'>
          <h2 className='text-xl font-bold text-gray-900 mb-6'>
            Your Asset Priority Order
          </h2>

          {loading ? (
            <div className='flex items-center justify-center py-12'>
              <div className='animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600'></div>
            </div>
          ) : (
            <div className='space-y-4'>
              {priorities.map((priority, index) => {
                const asset = assetInfo[priority.token_symbol] || {
                  name: priority.token_symbol,
                  color: 'bg-gray-500',
                  icon: '🪙',
                };

                return (
                  <div
                    key={priority.token_symbol}
                    className={`flex items-center justify-between p-4 rounded-xl border-2 transition-all duration-200 ${
                      priority.is_enabled
                        ? 'border-indigo-200 bg-indigo-50'
                        : 'border-gray-200 bg-gray-50 opacity-60'
                    }`}
                  >
                    {/* Priority Number */}
                    <div className='flex items-center space-x-4'>
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold ${asset.color}`}
                      >
                        {priority.priority_order}
                      </div>

                      {/* Asset Info */}
                      <div className='flex items-center space-x-3'>
                        <span className='text-2xl'>{asset.icon}</span>
                        <div>
                          <h3 className='font-semibold text-gray-900'>
                            {priority.token_symbol}
                          </h3>
                          <p className='text-sm text-gray-600'>{asset.name}</p>
                        </div>
                      </div>
                    </div>

                    {/* Controls */}
                    <div className='flex items-center space-x-3'>
                      {/* Move Up/Down */}
                      <div className='flex flex-col space-y-1'>
                        <button
                          onClick={() => moveUp(index)}
                          disabled={index === 0}
                          className={`p-1 rounded ${
                            index === 0
                              ? 'text-gray-300 cursor-not-allowed'
                              : 'text-indigo-600 hover:bg-indigo-100'
                          }`}
                        >
                          <svg
                            className='w-4 h-4'
                            fill='none'
                            stroke='currentColor'
                            viewBox='0 0 24 24'
                          >
                            <path
                              strokeLinecap='round'
                              strokeLinejoin='round'
                              strokeWidth={2}
                              d='M5 15l7-7 7 7'
                            />
                          </svg>
                        </button>
                        <button
                          onClick={() => moveDown(index)}
                          disabled={index === priorities.length - 1}
                          className={`p-1 rounded ${
                            index === priorities.length - 1
                              ? 'text-gray-300 cursor-not-allowed'
                              : 'text-indigo-600 hover:bg-indigo-100'
                          }`}
                        >
                          <svg
                            className='w-4 h-4'
                            fill='none'
                            stroke='currentColor'
                            viewBox='0 0 24 24'
                          >
                            <path
                              strokeLinecap='round'
                              strokeLinejoin='round'
                              strokeWidth={2}
                              d='M19 9l-7 7-7-7'
                            />
                          </svg>
                        </button>
                      </div>

                      {/* Enable/Disable Toggle */}
                      <label className='relative inline-flex items-center cursor-pointer'>
                        <input
                          type='checkbox'
                          checked={priority.is_enabled}
                          onChange={() => toggleEnabled(index)}
                          className='sr-only peer'
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                      </label>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Messages */}
          {message && (
            <div className='mt-6 p-4 bg-green-50 border border-green-200 rounded-lg'>
              <p className='text-green-800'>{message}</p>
            </div>
          )}

          {error && (
            <div className='mt-6 p-4 bg-red-50 border border-red-200 rounded-lg'>
              <p className='text-red-800'>{error}</p>
            </div>
          )}

          {/* Save Button */}
          <div className='mt-8 flex justify-center'>
            <button
              onClick={savePriorities}
              disabled={saving || loading}
              className={`px-8 py-3 rounded-xl font-semibold transition-all duration-200 ${
                saving || loading
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white transform hover:scale-105'
              }`}
            >
              {saving ? (
                <div className='flex items-center space-x-2'>
                  <div className='animate-spin rounded-full h-4 w-4 border-b-2 border-white'></div>
                  <span>Saving...</span>
                </div>
              ) : (
                'Save Priorities'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AssetPriorities() {
  return (
    <Suspense
      fallback={
        <div className='min-h-screen bg-gradient-to-br from-indigo-50 to-purple-100 flex items-center justify-center'>
          <div className='text-gray-600'>Loading...</div>
        </div>
      }
    >
      <AssetPrioritiesContent />
    </Suspense>
  );
}
