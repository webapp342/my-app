'use client';

import { useSearchParams } from 'next/navigation';
import { useState, useEffect, useCallback, Suspense } from 'react';
import Link from 'next/link';
import { useBalanceTracking } from '@/hooks/useBalanceTracking';
import VirtualCard from '@/components/VirtualCard';
import { VirtualCard as VirtualCardType } from '@/lib/virtual-card';

function DashboardContent() {
  const searchParams = useSearchParams();
  const [totalUsdValue, setTotalUsdValue] = useState(0);
  const [priceLoading, setPriceLoading] = useState(false);
  const [tokenPrices, setTokenPrices] = useState<Record<string, number>>({});
  const [mounted, setMounted] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [virtualCards, setVirtualCards] = useState<VirtualCardType[]>([]);
  const [cardsLoading, setCardsLoading] = useState(false);
  const [showFullCardNumber, setShowFullCardNumber] = useState(false);

  const address = searchParams.get('address');
  const username = searchParams.get('username');
  const network = searchParams.get('network') || 'BSC_MAINNET';

  // Balance tracking hook
  const balanceTracking = useBalanceTracking(userId, address);

  // Debug log
  console.log('Dashboard params:', { address, username, network });

  useEffect(() => {
    setMounted(true);
  }, []);

  // Get userId from wallet address
  useEffect(() => {
    const fetchUserId = async () => {
      if (!address || !mounted) return;

      try {
        const response = await fetch(`/api/get-user-id?address=${address}`);
        const data = await response.json();

        if (response.ok && data.userId) {
          setUserId(data.userId);
          console.log('[DASHBOARD] Found userId:', data.userId);
        } else {
          console.warn(
            '[DASHBOARD] Could not find userId for address:',
            address
          );
        }
      } catch (error) {
        console.error('[DASHBOARD] Error fetching userId:', error);
      }
    };

    fetchUserId();
  }, [address, mounted]);

  // Fetch user's virtual cards
  const fetchVirtualCards = useCallback(async () => {
    if (!userId || !mounted) return;

    setCardsLoading(true);
    try {
      const response = await fetch(`/api/virtual-cards?userId=${userId}`);
      const data = await response.json();

      if (response.ok && data.success) {
        setVirtualCards(data.cards || []);
        console.log(
          '[DASHBOARD] Found virtual cards:',
          data.cards?.length || 0
        );
      } else {
        console.warn('[DASHBOARD] Could not fetch virtual cards:', data.error);
      }
    } catch (error) {
      console.error('[DASHBOARD] Error fetching virtual cards:', error);
    } finally {
      setCardsLoading(false);
    }
  }, [userId, mounted]);

  useEffect(() => {
    fetchVirtualCards();
  }, [fetchVirtualCards]);

  // Calculate total USD value from stored balances
  useEffect(() => {
    const calculateTotalUsdValue = async () => {
      if (!balanceTracking.balances.length) return;

      setPriceLoading(true);
      try {
        let totalUsd = 0;

        // Get current prices from Binance for all tokens we have
        const currentTokenPrices: Record<string, number> = {};

        // Get unique tokens from balances (excluding stablecoins)
        const tokensToFetch = [
          ...new Set(
            balanceTracking.balances
              .map((b: { token: string; balance: string }) => b.token)
              .filter(
                (token: string) =>
                  !['BUSD', 'BSC-USD', 'USDT', 'USDC'].includes(token)
              )
          ),
        ];

        console.log('Tokens to fetch prices for:', tokensToFetch);

        // Fetch prices for all tokens using the proper API
        const pricePromises = tokensToFetch.map(async (token: string) => {
          try {
            // Use the get-binance-price API which handles symbol mapping correctly
            const response = await fetch(
              `/api/get-binance-price?symbol=${token}`
            );
            const data = await response.json();
            const price = parseFloat(data.price || '0');
            currentTokenPrices[token] = price;
            console.log(`Price for ${token}: $${price}`);
            return { token, price };
          } catch (error) {
            console.error(`Error fetching price for ${token}:`, error);
            currentTokenPrices[token] = 0;
            return { token, price: 0 };
          }
        });

        await Promise.all(pricePromises);
        console.log('All token prices:', currentTokenPrices);

        // Update state with current prices
        setTokenPrices(currentTokenPrices);

        // Calculate total value
        for (const balance of balanceTracking.balances) {
          const amount = parseFloat(balance.balance);
          const token = balance.token;

          console.log(`Calculating value for ${token}: ${amount}`);

          // Handle stablecoins (always $1)
          if (['BUSD', 'BSC-USD', 'USDT', 'USDC'].includes(token)) {
            totalUsd += amount;
            console.log(`${token}: ${amount} * 1 = $${amount}`);
          }
          // Handle tokens with fetched prices
          else if (currentTokenPrices[token] !== undefined) {
            const price = currentTokenPrices[token];
            const usdValue = amount * price;
            totalUsd += usdValue;
            console.log(`${token}: ${amount} * ${price} = $${usdValue}`);
          }
          // Handle unknown tokens
          else {
            console.log(
              `${token}: ${amount} - no price data available, skipping...`
            );
          }
        }

        setTotalUsdValue(totalUsd);
        console.log(
          'Total USD value calculated:',
          totalUsd,
          'from balances:',
          balanceTracking.balances
        );
      } catch (error) {
        console.error('Error calculating USD value:', error);
      } finally {
        setPriceLoading(false);
      }
    };

    // Only calculate when we have balances
    if (balanceTracking.balanceCount > 0) {
      calculateTotalUsdValue();
    }
  }, [balanceTracking.balanceCount, balanceTracking.balances]); // Include balances dependency

  if (!mounted) {
    return (
      <div className='min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center'>
        <div className='text-gray-600'>Loading...</div>
      </div>
    );
  }

  if (!address || !username) {
    return (
      <div className='min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center'>
        <div className='max-w-md w-full mx-4'>
          <div className='bg-white rounded-2xl shadow-xl p-8 text-center'>
            <h1 className='text-2xl font-bold text-red-600 mb-4'>
              Invalid Access
            </h1>
            <p className='text-gray-600 mb-6'>Missing wallet information.</p>
            <Link
              href='/'
              className='bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg transition duration-200'
            >
              Go to Home
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className='min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100'>
      <div className='max-w-4xl mx-auto p-6'>
        {/* Header */}
        <div className='bg-white rounded-2xl shadow-xl p-6 mb-6'>
          <div className='flex items-center justify-between'>
            <div>
              <h1 className='text-2xl font-bold text-gray-900'>
                Welcome back, {username}!
              </h1>
              <p className='text-gray-600'>BSC Mainnet Cüzdan Paneli</p>
            </div>
            <div className='flex gap-2'>
              <button
                onClick={() => {
                  // Clear any stored session data and redirect
                  window.location.href = '/';
                }}
                className='bg-red-100 hover:bg-red-200 text-red-700 font-medium py-2 px-4 rounded-lg transition duration-200'
              >
                Logout
              </button>
              <Link
                href='/'
                className='bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-2 px-4 rounded-lg transition duration-200'
              >
                Home
              </Link>
              <Link
                href={`/presale?address=${address}&username=${username}&userId=${userId}`}
                className='bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-medium py-2 px-4 rounded-lg transition duration-200'
              >
                Presale
              </Link>
              <Link
                href={`/asset-priorities?address=${address}&username=${username}&userId=${userId}`}
                className='bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white font-medium py-2 px-4 rounded-lg transition duration-200'
              >
                Asset Priorities
              </Link>
            </div>
          </div>
        </div>

        {/* Wallet Overview */}
        <div className='grid grid-cols-1 md:grid-cols-3 gap-6 mb-6'>
          {/* Balance Card */}
          <div className='bg-white rounded-2xl shadow-xl p-6'>
            <h2 className='text-lg font-semibold text-gray-900 mb-4'>
              Total Portfolio Value
            </h2>
            <div className='text-center'>
              {priceLoading || balanceTracking.isLoading ? (
                <div className='animate-pulse'>
                  <div className='h-8 bg-gray-200 rounded w-32 mx-auto mb-2'></div>
                  <div className='h-4 bg-gray-200 rounded w-20 mx-auto'></div>
                </div>
              ) : (
                <>
                  <p className='text-3xl font-bold text-gray-900'>
                    ${totalUsdValue.toFixed(2)}
                  </p>
                  <p className='text-gray-500 text-sm mt-2'>
                    Based on stored balances
                  </p>
                  <div className='mt-3 text-xs text-gray-400'>
                    <div>Tokens: {balanceTracking.balanceCount}</div>
                    <div>
                      Last sync:{' '}
                      {balanceTracking.lastSync
                        ? new Date(
                            balanceTracking.lastSync
                          ).toLocaleDateString()
                        : 'Never'}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Portfolio Summary */}
          <div className='bg-white rounded-2xl shadow-xl p-6'>
            <h2 className='text-lg font-semibold text-gray-900 mb-4'>
              Portfolio Summary
            </h2>
            <div className='space-y-3'>
              <div className='flex justify-between'>
                <span className='text-gray-600'>Total Tokens:</span>
                <span className='font-medium'>
                  {balanceTracking.balanceCount}
                </span>
              </div>
              <div className='flex justify-between'>
                <span className='text-gray-600'>Tracked Transactions:</span>
                <span className='font-medium'>
                  {balanceTracking.transactionCount}
                </span>
              </div>
              <div className='flex justify-between'>
                <span className='text-gray-600'>Status:</span>
                <span className='text-green-600 font-medium'>✓ Synced</span>
              </div>
            </div>

            {balanceTracking.balances.length > 0 && (
              <div className='mt-4 pt-4 border-t border-gray-200'>
                <h3 className='text-sm font-medium text-gray-700 mb-2'>
                  Asset Breakdown
                </h3>
                <div className='space-y-2'>
                  {balanceTracking.balances.map(
                    (
                      balance: { token: string; balance: string },
                      index: number
                    ) => (
                      <div key={index} className='flex justify-between text-sm'>
                        <span className='text-gray-600'>{balance.token}:</span>
                        <span className='font-medium'>
                          {parseFloat(balance.balance).toFixed(6)}
                        </span>
                      </div>
                    )
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Quick Actions */}
          <div className='bg-white rounded-2xl shadow-xl p-6'>
            <h2 className='text-lg font-semibold text-gray-900 mb-4'>
              Quick Actions
            </h2>
            <div className='space-y-3'>
              <Link
                href={`/send-bnb?address=${address}&username=${username}`}
                className='w-full bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white font-semibold py-3 px-4 rounded-xl flex items-center justify-center transition-all duration-200 transform hover:scale-105'
              >
                <svg
                  className='w-5 h-5 mr-2'
                  fill='none'
                  stroke='currentColor'
                  viewBox='0 0 24 24'
                >
                  <path
                    strokeLinecap='round'
                    strokeLinejoin='round'
                    strokeWidth={2}
                    d='M12 19l9 2-9-18-9 18 9-2zm0 0v-8'
                  />
                </svg>
                Send BNB
              </Link>

              <Link
                href={`/transactions?address=${address}&username=${username}`}
                className='w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-3 px-4 rounded-xl flex items-center justify-center transition-colors'
              >
                <svg
                  className='w-5 h-5 mr-2'
                  fill='none'
                  stroke='currentColor'
                  viewBox='0 0 24 24'
                >
                  <path
                    strokeLinecap='round'
                    strokeLinejoin='round'
                    strokeWidth={2}
                    d='M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z'
                  />
                </svg>
                View Transactions
              </Link>

              <Link
                href={`/checkout?address=${address}&username=${username}&userId=${userId}`}
                className='w-full bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white font-medium py-3 px-4 rounded-xl flex items-center justify-center transition-all duration-200 transform hover:scale-105'
              >
                <svg
                  className='w-5 h-5 mr-2'
                  fill='none'
                  stroke='currentColor'
                  viewBox='0 0 24 24'
                >
                  <path
                    strokeLinecap='round'
                    strokeLinejoin='round'
                    strokeWidth={2}
                    d='M3 3h2l.4 2M7 13h10l4-8H5.4m0 0L7 13m0 0l-2.5 5M17 13v6a2 2 0 01-2 2H9a2 2 0 01-2-2v-6'
                  />
                </svg>
                Buy with Card
              </Link>
            </div>

            <div className='mt-4 pt-4 border-t border-gray-200'>
              <h3 className='text-sm font-medium text-gray-700 mb-2'>
                BNB Balance
              </h3>
              <div className='text-lg font-semibold text-yellow-600'>
                {balanceTracking.balances.find(
                  (b: { token: string; balance: string }) => b.token === 'BNB'
                )?.balance || '0.000000'}{' '}
                BNB
              </div>
            </div>
          </div>
        </div>

        {/* Wallet Address */}
        <div className='bg-white rounded-2xl shadow-xl p-6 mb-6'>
          <h2 className='text-lg font-semibold text-gray-900 mb-4'>
            Wallet Address
          </h2>
          <div className='bg-gray-50 p-4 rounded-lg'>
            <div className='flex items-center justify-between'>
              <code className='text-sm text-gray-800 break-all flex-1 mr-4'>
                {address}
              </code>
              <button
                onClick={() => navigator.clipboard.writeText(address)}
                className='text-blue-600 hover:text-blue-800 text-sm font-medium whitespace-nowrap'
              >
                Copy
              </button>
            </div>
          </div>
        </div>

        {/* Stored Balances */}
        {userId && (
          <div className='bg-white rounded-2xl shadow-xl p-6 mb-6'>
            <div className='flex items-center justify-between mb-4'>
              <h2 className='text-lg font-semibold text-gray-900'>
                Stored Token Balances
              </h2>
              <div className='flex gap-2'>
                <button
                  onClick={balanceTracking.syncTransactions}
                  disabled={balanceTracking.isSyncing}
                  className='bg-blue-100 hover:bg-blue-200 text-blue-700 font-medium py-2 px-4 rounded-lg transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed text-sm'
                >
                  {balanceTracking.isSyncing
                    ? 'Syncing...'
                    : 'Sync Transactions'}
                </button>
                <button
                  onClick={balanceTracking.refreshStatus}
                  disabled={balanceTracking.isLoading}
                  className='bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-2 px-4 rounded-lg transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed text-sm'
                >
                  {balanceTracking.isLoading ? 'Loading...' : 'Refresh'}
                </button>
              </div>
            </div>

            {balanceTracking.error && (
              <div className='bg-red-50 border border-red-200 rounded-lg p-4 mb-4'>
                <div className='flex items-center'>
                  <svg
                    className='w-5 h-5 text-red-500 mr-2'
                    fill='currentColor'
                    viewBox='0 0 20 20'
                  >
                    <path
                      fillRule='evenodd'
                      d='M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z'
                      clipRule='evenodd'
                    />
                  </svg>
                  <span className='text-red-700 text-sm'>
                    {balanceTracking.error}
                  </span>
                  <button
                    onClick={balanceTracking.clearError}
                    className='ml-auto text-red-500 hover:text-red-700'
                  >
                    ×
                  </button>
                </div>
              </div>
            )}

            {balanceTracking.syncStats && (
              <div className='bg-green-50 border border-green-200 rounded-lg p-4 mb-4'>
                <div className='flex items-center justify-between'>
                  <div className='flex items-center'>
                    <svg
                      className='w-5 h-5 text-green-500 mr-2'
                      fill='currentColor'
                      viewBox='0 0 20 20'
                    >
                      <path
                        fillRule='evenodd'
                        d='M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z'
                        clipRule='evenodd'
                      />
                    </svg>
                    <span className='text-green-700 text-sm'>
                      Sync completed:{' '}
                      {balanceTracking.syncStats.savedTransactions} transactions
                      saved (out of{' '}
                      {balanceTracking.syncStats.totalTransactions} total)
                    </span>
                  </div>
                  <button
                    onClick={balanceTracking.clearSyncStats}
                    className='text-green-500 hover:text-green-700'
                  >
                    ×
                  </button>
                </div>
              </div>
            )}

            <div className='grid grid-cols-1 md:grid-cols-3 gap-4'>
              <div className='bg-gray-50 p-4 rounded-lg'>
                <div className='text-sm text-gray-600'>Total Tokens</div>
                <div className='text-2xl font-bold text-gray-900'>
                  {balanceTracking.balanceCount}
                </div>
              </div>
              <div className='bg-gray-50 p-4 rounded-lg'>
                <div className='text-sm text-gray-600'>
                  Transactions Tracked
                </div>
                <div className='text-2xl font-bold text-gray-900'>
                  {balanceTracking.transactionCount}
                </div>
              </div>
              <div className='bg-gray-50 p-4 rounded-lg'>
                <div className='text-sm text-gray-600'>Last Sync</div>
                <div className='text-sm font-medium text-gray-900'>
                  {balanceTracking.lastSync
                    ? new Date(balanceTracking.lastSync).toLocaleDateString()
                    : 'Never'}
                </div>
              </div>
            </div>

            <div className='mt-6'>
              <h3 className='text-md font-semibold text-gray-900 mb-3'>
                Token Balances
              </h3>
              <div className='space-y-3'>
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
                ].map(token => {
                  // Find balance for this token
                  const balance = balanceTracking.balances.find(
                    (b: { token: string; balance: string }) => b.token === token
                  );
                  const amount = balance ? parseFloat(balance.balance) : 0;

                  // Calculate USD value
                  let usdValue = 0;
                  if (['BUSD', 'BSC-USD', 'USDT', 'USDC'].includes(token)) {
                    usdValue = amount; // Stablecoins = $1
                  } else if (tokenPrices && tokenPrices[token]) {
                    usdValue = amount * tokenPrices[token];
                  }

                  return (
                    <div
                      key={token}
                      className='flex items-center justify-between p-3 bg-gray-50 rounded-lg'
                    >
                      <div className='flex items-center'>
                        <div className='w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-sm font-bold mr-3'>
                          {token.charAt(0)}
                        </div>
                        <div>
                          <div className='font-medium text-gray-900'>
                            {token}
                          </div>
                          <div className='text-sm text-gray-500'>
                            {amount.toFixed(6)} {token}
                          </div>
                        </div>
                      </div>
                      <div className='text-right'>
                        <div className='font-medium text-gray-900'>
                          ${usdValue.toFixed(2)}
                        </div>
                        <div className='text-sm text-gray-500'>USD Value</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Virtual Cards */}
        {userId && (
          <div className='bg-white rounded-2xl shadow-xl p-6 mb-6'>
            <div className='flex items-center justify-between mb-4'>
              <h2 className='text-lg font-semibold text-gray-900'>
                Virtual Cards
              </h2>
              <div className='flex gap-2'>
                <button
                  onClick={fetchVirtualCards}
                  disabled={cardsLoading}
                  className='bg-green-100 hover:bg-green-200 text-green-700 font-medium py-2 px-4 rounded-lg transition duration-200 text-sm disabled:opacity-50'
                  title='Refresh virtual cards'
                >
                  {cardsLoading ? (
                    <div className='flex items-center'>
                      <div className='animate-spin rounded-full h-4 w-4 border-b-2 border-green-700 mr-1'></div>
                      Refreshing...
                    </div>
                  ) : (
                    <div className='flex items-center'>
                      <svg
                        className='w-4 h-4 mr-1'
                        fill='none'
                        stroke='currentColor'
                        viewBox='0 0 24 24'
                      >
                        <path
                          strokeLinecap='round'
                          strokeLinejoin='round'
                          strokeWidth={2}
                          d='M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15'
                        />
                      </svg>
                      Refresh
                    </div>
                  )}
                </button>
                <button
                  onClick={() => {
                    // TODO: Implement create new card functionality
                    console.log('Create new card clicked');
                  }}
                  className='bg-blue-100 hover:bg-blue-200 text-blue-700 font-medium py-2 px-4 rounded-lg transition duration-200 text-sm'
                >
                  + New Card
                </button>
              </div>
            </div>

            {cardsLoading ? (
              <div className='flex justify-center py-8'>
                <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600'></div>
              </div>
            ) : virtualCards.length > 0 ? (
              <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'>
                {virtualCards.map(card => (
                  <VirtualCard
                    key={card.id}
                    card={card}
                    showFullNumber={showFullCardNumber}
                    onToggleVisibility={() =>
                      setShowFullCardNumber(!showFullCardNumber)
                    }
                    className='max-w-sm'
                  />
                ))}
              </div>
            ) : (
              <div className='text-center py-8'>
                <div className='text-gray-400 mb-2'>No virtual cards found</div>
                <div className='text-sm text-gray-500'>
                  {address
                    ? 'Your virtual card should have been created automatically when you created your wallet.'
                    : 'Create a wallet to get your virtual card.'}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Quick Actions */}
        <div className='bg-white rounded-2xl shadow-xl p-6 mb-6'>
          <h2 className='text-lg font-semibold text-gray-900 mb-4'>
            Quick Actions
          </h2>
          <div className='grid grid-cols-1 sm:grid-cols-3 gap-4'>
            <button className='bg-blue-50 hover:bg-blue-100 text-blue-700 font-medium py-4 px-6 rounded-lg transition duration-200 border border-blue-200'>
              Send BNB
            </button>
            <button className='bg-green-50 hover:bg-green-100 text-green-700 font-medium py-4 px-6 rounded-lg transition duration-200 border border-green-200'>
              Receive
            </button>
            <button className='bg-purple-50 hover:bg-purple-100 text-purple-700 font-medium py-4 px-6 rounded-lg transition duration-200 border border-purple-200'>
              View on BSCScan
            </button>
          </div>
        </div>

        {/* Features Notice */}
        <div className='mt-6 bg-green-50 border border-green-200 rounded-lg p-4'>
          <div className='flex'>
            <svg
              className='w-5 h-5 text-green-500 mt-0.5 mr-3 flex-shrink-0'
              fill='currentColor'
              viewBox='0 0 20 20'
            >
              <path
                fillRule='evenodd'
                d='M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z'
                clipRule='evenodd'
              />
            </svg>
            <div>
              <p className='text-sm text-green-700'>
                <strong>Real-Time Features:</strong> Bu cüzdan gerçek blockchain
                verilerini kullanır ve Binance API&apos;sinden güncel fiyat
                bilgileri alarak USDT cinsinden değer gösterir. Tüm bakiyeler ve
                işlemler gerçek blockchain ağlarından çekilir.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Dashboard() {
  return (
    <Suspense
      fallback={
        <div className='min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center'>
          <div className='text-gray-600'>Loading...</div>
        </div>
      }
    >
      <DashboardContent />
    </Suspense>
  );
}
