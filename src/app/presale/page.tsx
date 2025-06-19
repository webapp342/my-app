'use client';

import { useSearchParams } from 'next/navigation';
import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';

interface UserBalance {
  id: string;
  token_symbol: string;
  balance: string;
  network: string;
  usd_value?: number;
}

interface AssetPriority {
  id: string;
  token_symbol: string;
  priority_order: number;
  is_enabled: boolean;
}

function PresaleContent() {
  const searchParams = useSearchParams();
  const [mounted, setMounted] = useState(false);
  const [userBalances, setUserBalances] = useState<UserBalance[]>([]);
  const [assetPriorities, setAssetPriorities] = useState<AssetPriority[]>([]);
  const [balancesLoading, setBalancesLoading] = useState(false);
  const [tokenPrices, setTokenPrices] = useState<Record<string, number>>({});

  // Form state - removed selectedAsset
  const [tokenQuantity, setTokenQuantity] = useState<number>(0);
  const [bnbPrice, setBnbPrice] = useState<number>(0);
  const [priceLoading, setPriceLoading] = useState(false);

  // Get params
  const address = searchParams.get('address');
  const username = searchParams.get('username');
  const userId = searchParams.get('userId');

  // Constants
  const BBLIP_PRICE_USD = 0.1; // $0.1 per BBLIP token

  useEffect(() => {
    setMounted(true);
  }, []);

  // Fetch user balances and asset priorities
  useEffect(() => {
    const fetchData = async () => {
      if (!userId || !mounted) return;

      setBalancesLoading(true);
      try {
        // Fetch balances and priorities in parallel
        const [balancesResponse, prioritiesResponse] = await Promise.all([
          fetch(`/api/get-user-balances?userId=${userId}`),
          fetch(`/api/asset-priorities?userId=${userId}`),
        ]);

        const balancesData = await balancesResponse.json();
        const prioritiesData = await prioritiesResponse.json();

        if (balancesResponse.ok && balancesData.success) {
          // Get all balances (not just BNB and BSC-USD)
          const allBalances = balancesData.balances.filter(
            (balance: UserBalance) =>
              parseFloat(balance.balance) > 0 &&
              balance.token_symbol !== 'BBLIP' // Exclude BBLIP and zero balances
          );
          setUserBalances(allBalances);
        }

        if (prioritiesResponse.ok && prioritiesData.success) {
          setAssetPriorities(
            prioritiesData.priorities.filter((p: AssetPriority) => p.is_enabled)
          );
        }
      } catch (error) {
        console.error('[PRESALE] Error fetching data:', error);
      } finally {
        setBalancesLoading(false);
      }
    };

    fetchData();
  }, [userId, mounted]);

  // Fetch token prices
  useEffect(() => {
    const fetchTokenPrices = async () => {
      if (userBalances.length === 0) return;

      setPriceLoading(true);
      try {
        const uniqueTokens = [
          ...new Set(userBalances.map(b => b.token_symbol)),
        ];
        const prices: Record<string, number> = {};

        // Fetch prices for all tokens
        for (const token of uniqueTokens) {
          try {
            const response = await fetch(
              `/api/get-binance-price?symbol=${token}`
            );
            const data = await response.json();

            if (response.ok && data.price) {
              prices[token] = parseFloat(data.price);
            } else {
              // Default prices for stablecoins
              if (['BSC-USD', 'USDT', 'USDC', 'BUSD'].includes(token)) {
                prices[token] = 1.0;
              }
            }
          } catch (error) {
            console.error(`[PRESALE] Error fetching ${token} price:`, error);
            // Default to 1 for stablecoins
            if (['BSC-USD', 'USDT', 'USDC', 'BUSD'].includes(token)) {
              prices[token] = 1.0;
            }
          }
        }

        setTokenPrices(prices);
        setBnbPrice(prices.BNB || 0);
      } catch (error) {
        console.error('[PRESALE] Error fetching token prices:', error);
      } finally {
        setPriceLoading(false);
      }
    };

    fetchTokenPrices();
  }, [userBalances]);

  // Calculate total USD cost
  const calculateTotalUsdCost = () => {
    if (!tokenQuantity || tokenQuantity <= 0) return 0;
    return tokenQuantity * BBLIP_PRICE_USD;
  };

  // Calculate total available balance in USD
  const calculateTotalAvailableUsd = () => {
    let totalUsd = 0;

    // Check all supported tokens
    const supportedTokens = [
      'BNB',
      'BSC-USD',
      'AAVE',
      'UNI',
      'LINK',
      'DOT',
      'ADA',
      'USDC',
      'BUSD',
      'SOL',
      'XRP',
      'DOGE',
      'LTC',
      'BCH',
      'MATIC',
      'SHIB',
      'AVAX',
    ];

    supportedTokens.forEach(token => {
      const balance = userBalances.find(b => b.token_symbol === token);
      const balanceAmount = balance ? parseFloat(balance.balance) : 0;
      const tokenPrice = tokenPrices[token] || 0;

      if (tokenPrice > 0 && balanceAmount > 0) {
        totalUsd += balanceAmount * tokenPrice;
      }
    });

    return totalUsd;
  };

  // Check if user has sufficient balance
  const hasSufficientBalance = () => {
    const requiredUsd = calculateTotalUsdCost();
    const availableUsd = calculateTotalAvailableUsd();

    return requiredUsd > 0 && availableUsd >= requiredUsd;
  };

  // Handle purchase - redirect to checkout
  const handlePurchase = () => {
    if (!hasSufficientBalance()) return;

    // Redirect to checkout with purchase details (no asset selection needed)
    const checkoutParams = new URLSearchParams({
      userId: userId || '',
      address: address || '',
      username: username || '',
      tokenQuantity: tokenQuantity.toString(),
      totalUsdCost: calculateTotalUsdCost().toString(),
      bnbPrice: bnbPrice.toString(),
    });

    window.location.href = `/checkout?${checkoutParams.toString()}`;
  };

  if (!mounted) {
    return (
      <div className='min-h-screen bg-gradient-to-br from-purple-50 to-pink-100 flex items-center justify-center'>
        <div className='text-gray-600'>Loading...</div>
      </div>
    );
  }

  if (!address || !username || !userId) {
    return (
      <div className='min-h-screen bg-gradient-to-br from-purple-50 to-pink-100 flex items-center justify-center'>
        <div className='max-w-md w-full mx-4'>
          <div className='bg-white rounded-2xl shadow-xl p-8 text-center'>
            <h1 className='text-2xl font-bold text-red-600 mb-4'>
              Invalid Access
            </h1>
            <p className='text-gray-600 mb-6'>Missing required information.</p>
            <Link
              href='/'
              className='bg-purple-600 hover:bg-purple-700 text-white font-semibold py-3 px-6 rounded-lg transition duration-200'
            >
              Go to Home
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const totalUsdCost = calculateTotalUsdCost();
  const totalAvailableUsd = calculateTotalAvailableUsd();
  const sufficientBalance = hasSufficientBalance();

  return (
    <div className='min-h-screen bg-gradient-to-br from-purple-50 to-pink-100'>
      <div className='max-w-2xl mx-auto p-6'>
        {/* Header */}
        <div className='bg-white rounded-2xl shadow-xl p-6 mb-6'>
          <div className='flex items-center justify-between'>
            <div>
              <h1 className='text-3xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent'>
                BBLIP Presale
              </h1>
              <p className='text-gray-600 mt-2'>
                Welcome {username}! Purchase BBLIP tokens at $0.1 each
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

        {/* Presale Form */}
        <div className='bg-white rounded-2xl shadow-xl p-8'>
          <div className='space-y-6'>
            {/* Token Quantity Input */}
            <div>
              <label className='block text-sm font-medium text-gray-700 mb-2'>
                Token Quantity
              </label>
              <div className='relative'>
                <input
                  type='number'
                  min='1'
                  value={tokenQuantity || ''}
                  onChange={e =>
                    setTokenQuantity(parseInt(e.target.value) || 0)
                  }
                  placeholder='Enter quantity (e.g., 100)'
                  className='w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-lg'
                />
                <div className='absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none'>
                  <span className='text-gray-500 font-medium'>BBLIP</span>
                </div>
              </div>
            </div>

            {/* Available Balances */}
            <div>
              <label className='block text-sm font-medium text-gray-700 mb-2'>
                Available Balances
              </label>
              {balancesLoading ? (
                <div className='bg-gray-50 rounded-lg p-4 animate-pulse'>
                  <div className='h-4 bg-gray-200 rounded mb-2'></div>
                  <div className='h-4 bg-gray-200 rounded w-3/4'></div>
                </div>
              ) : (
                <div className='space-y-2'>
                  {/* Show all supported tokens */}
                  {[
                    'BNB',
                    'BSC-USD',
                    'AAVE',
                    'UNI',
                    'LINK',
                    'DOT',
                    'ADA',
                    'USDC',
                    'BUSD',
                    'SOL',
                    'XRP',
                    'DOGE',
                    'LTC',
                    'BCH',
                    'MATIC',
                    'SHIB',
                    'AVAX',
                    'BBLIP',
                  ]
                    .filter(token => token !== 'BBLIP') // Exclude BBLIP from purchase options
                    .sort((a, b) => {
                      // Sort by asset priority order
                      const aPriority =
                        assetPriorities.find(p => p.token_symbol === a)
                          ?.priority_order || 999;
                      const bPriority =
                        assetPriorities.find(p => p.token_symbol === b)
                          ?.priority_order || 999;
                      return aPriority - bPriority;
                    })
                    .map(token => {
                      // Find balance for this token
                      const balance = userBalances.find(
                        b => b.token_symbol === token
                      );
                      const balanceAmount = balance
                        ? parseFloat(balance.balance)
                        : 0;
                      const tokenPrice = tokenPrices[token] || 0;
                      const usdValue = balanceAmount * tokenPrice;
                      const priority = assetPriorities.find(
                        p => p.token_symbol === token
                      )?.priority_order;

                      return (
                        <div
                          key={token}
                          className='bg-gray-50 rounded-lg p-3 flex justify-between items-center'
                        >
                          <div>
                            <span className='font-medium text-gray-900'>
                              {token}
                            </span>
                            {priority && (
                              <span className='text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded-full ml-2'>
                                Priority {priority}
                              </span>
                            )}
                            <div className='text-sm text-gray-500'>
                              (BSC_MAINNET)
                            </div>
                          </div>
                          <div className='text-right'>
                            <div className='font-semibold text-gray-900'>
                              {balanceAmount.toFixed(6)}
                            </div>
                            <div className='text-sm text-gray-500'>
                              ≈ ${usdValue.toFixed(2)}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  <div className='bg-purple-50 rounded-lg p-3 border border-purple-200'>
                    <div className='flex justify-between items-center'>
                      <span className='font-medium text-purple-900'>
                        Total Available
                      </span>
                      <span className='font-bold text-purple-900'>
                        ${totalAvailableUsd.toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Cost Calculation */}
            {tokenQuantity > 0 && (
              <div className='bg-gray-50 rounded-lg p-4'>
                <div className='space-y-2'>
                  <div className='flex justify-between text-sm'>
                    <span>Token Quantity:</span>
                    <span>{tokenQuantity.toLocaleString()} BBLIP</span>
                  </div>
                  <div className='flex justify-between text-sm'>
                    <span>Price per Token:</span>
                    <span>$0.10</span>
                  </div>
                  <div className='border-t pt-2'>
                    <div className='flex justify-between font-semibold'>
                      <span>Total Cost:</span>
                      <span>${totalUsdCost.toFixed(2)}</span>
                    </div>
                  </div>

                  {/* Insufficient balance warning */}
                  {!sufficientBalance && tokenQuantity > 0 && (
                    <div className='bg-red-50 border border-red-200 rounded-lg p-3 mt-3'>
                      <p className='text-red-600 text-sm'>
                        Insufficient balance. You need $
                        {totalUsdCost.toFixed(2)} but only have $
                        {totalAvailableUsd.toFixed(2)} available.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Purchase Button */}
            <button
              onClick={handlePurchase}
              disabled={
                !sufficientBalance ||
                tokenQuantity <= 0 ||
                balancesLoading ||
                priceLoading
              }
              className='w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 disabled:from-gray-400 disabled:to-gray-500 text-white font-bold py-4 px-6 rounded-lg transition duration-200 disabled:cursor-not-allowed'
            >
              {balancesLoading || priceLoading ? (
                <div className='flex items-center justify-center'>
                  <div className='animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2'></div>
                  Loading...
                </div>
              ) : tokenQuantity <= 0 ? (
                'Enter Token Quantity'
              ) : !sufficientBalance ? (
                'Insufficient Balance'
              ) : (
                `Purchase ${tokenQuantity.toLocaleString()} BBLIP for $${totalUsdCost.toFixed(2)}`
              )}
            </button>

            {/* Network Fee Notice */}
            <div className='bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4'>
              <div className='flex items-start'>
                <svg
                  className='w-5 h-5 text-yellow-600 mt-0.5 mr-2 flex-shrink-0'
                  fill='currentColor'
                  viewBox='0 0 20 20'
                >
                  <path
                    fillRule='evenodd'
                    d='M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z'
                    clipRule='evenodd'
                  />
                </svg>
                <div>
                  <p className='text-yellow-800 text-sm font-medium'>
                    Network Fee Required
                  </p>
                  <p className='text-yellow-700 text-sm mt-1'>
                    Each purchase requires <strong>1 BBLIP</strong> as network
                    fee. Make sure you have sufficient BBLIP balance.
                  </p>
                </div>
              </div>
            </div>

            {/* Notice */}
            <div className='bg-blue-50 border border-blue-200 rounded-lg p-4'>
              <p className='text-blue-800 text-sm'>
                <strong>Notice:</strong> Payment will be automatically deducted
                from your assets based on your priority settings. You can manage
                your asset spending priorities in the Dashboard.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Presale() {
  return (
    <Suspense
      fallback={
        <div className='min-h-screen bg-gradient-to-br from-purple-50 to-pink-100 flex items-center justify-center'>
          <div className='text-gray-600'>Loading...</div>
        </div>
      }
    >
      <PresaleContent />
    </Suspense>
  );
}
