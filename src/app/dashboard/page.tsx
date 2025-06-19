'use client';

import { useSearchParams } from 'next/navigation';
import { useState, useEffect, useCallback, Suspense } from 'react';
import Link from 'next/link';
import { useBalanceTracking } from '@/hooks/useBalanceTracking';
import { VirtualCard as VirtualCardType } from '@/lib/virtual-card';
import { FormattedUserTransaction } from '@/types/user-transaction';
import { FormattedVirtualCardTransaction } from '@/types/virtual-card-transaction';
import { UnifiedTransaction, mergeAndSortTransactions } from '@/types/unified-transaction';

function DashboardContent() {
  const searchParams = useSearchParams();
  const [totalUsdValue, setTotalUsdValue] = useState(0);
  const [priceLoading, setPriceLoading] = useState(false);
  const [tokenPrices, setTokenPrices] = useState<Record<string, number>>({});
  const [mounted, setMounted] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [virtualCards, setVirtualCards] = useState<VirtualCardType[]>([]);
  const [cardsLoading, setCardsLoading] = useState(false);
  const [recentTransactions, setRecentTransactions] = useState<UnifiedTransaction[]>([]);
  const [userTransactions, setUserTransactions] = useState<FormattedUserTransaction[]>([]);
  const [virtualCardTransactions, setVirtualCardTransactions] = useState<FormattedVirtualCardTransaction[]>([]);
  const [expandedTransactions, setExpandedTransactions] = useState<Set<string>>(new Set());

  const address = searchParams.get('address');
  const username = searchParams.get('username');
  const network = searchParams.get('network') || 'BSC_MAINNET';

  // Balance tracking hook
  const balanceTracking = useBalanceTracking(userId, address);

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
        }
      } catch {
        console.error('[DASHBOARD] Error fetching userId');
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
      }
    } catch (error) {
      console.error('[DASHBOARD] Error fetching virtual cards:', error);
    } finally {
      setCardsLoading(false);
    }
  }, [userId, mounted]);

  // Fetch user transactions from user_transactions table
  const fetchUserTransactions = useCallback(async () => {
    if (!userId && !address) return;

    try {
      const apiUrl = userId
        ? `/api/user-transactions?userId=${userId}&limit=20`
        : `/api/user-transactions?walletAddress=${address}&limit=20`;

      const response = await fetch(apiUrl);
      const data = await response.json();

      if (response.ok && data.success && data.transactions) {
        setUserTransactions(data.transactions);
      } else {
        setUserTransactions([]);
      }
    } catch {
      console.error('[DASHBOARD] Error fetching user transactions');
      setUserTransactions([]);
    }
  }, [userId, address]);

  // Fetch virtual card transactions
  const fetchVirtualCardTransactions = useCallback(async () => {
    if (!userId) return;

    try {
      const response = await fetch(`/api/virtual-card-transactions?userId=${userId}&limit=20`);
      const data = await response.json();

      if (response.ok && data.success && data.transactions) {
        setVirtualCardTransactions(data.transactions);
      } else {
        setVirtualCardTransactions([]);
      }
    } catch {
      console.error('[DASHBOARD] Error fetching virtual card transactions');
      setVirtualCardTransactions([]);
    }
  }, [userId]);

  // Merge and sort all transactions
  useEffect(() => {
    const mergedTransactions = mergeAndSortTransactions(userTransactions, virtualCardTransactions);
    setRecentTransactions(mergedTransactions.slice(0, 10)); // Show 10 most recent
  }, [userTransactions, virtualCardTransactions]);

  useEffect(() => {
    fetchVirtualCards();
    fetchUserTransactions();
    fetchVirtualCardTransactions();
  }, [fetchVirtualCards, fetchUserTransactions, fetchVirtualCardTransactions]);

  // Calculate total USD value from stored balances
  useEffect(() => {
    const calculateTotalUsdValue = async () => {
      if (!balanceTracking.balances.length) return;

      setPriceLoading(true);
      try {
        let totalUsd = 0;
        const currentTokenPrices: Record<string, number> = {};

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

        const pricePromises = tokensToFetch.map(async (token: string) => {
          try {
            const response = await fetch(
              `/api/get-binance-price?symbol=${token}`
            );
            const data = await response.json();
            const price = parseFloat(data.price || '0');
            currentTokenPrices[token] = price;
            return { token, price };
          } catch {
            currentTokenPrices[token] = 0;
            return { token, price: 0 };
          }
        });

        await Promise.all(pricePromises);
        setTokenPrices(currentTokenPrices);

        for (const balance of balanceTracking.balances) {
          const amount = parseFloat(balance.balance);
          const token = balance.token;

          if (['BUSD', 'BSC-USD', 'USDT', 'USDC'].includes(token)) {
            totalUsd += amount;
          } else if (currentTokenPrices[token] !== undefined) {
            const price = currentTokenPrices[token];
            const usdValue = amount * price;
            totalUsd += usdValue;
          }
        }

        setTotalUsdValue(totalUsd);
      } catch {
        console.error('Error calculating USD value');
      } finally {
        setPriceLoading(false);
      }
    };

    if (balanceTracking.balanceCount > 0) {
      calculateTotalUsdValue();
    }
  }, [balanceTracking.balanceCount, balanceTracking.balances]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  const getUserInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  if (!mounted) {
    return (
      <div className='min-h-screen bg-gray-50 flex items-center justify-center'>
        <div className='text-gray-600'>Loading...</div>
      </div>
    );
  }

  if (!address || !username) {
    return (
      <div className='min-h-screen bg-gray-50 flex items-center justify-center'>
        <div className='max-w-md w-full mx-4'>
          <div className='bg-white rounded-2xl shadow-lg p-8 text-center'>
            <h2 className='text-2xl font-bold text-gray-900 mb-4'>
              Access Required
            </h2>
            <p className='text-gray-600 mb-6'>
              Please create or import a wallet to access the dashboard.
            </p>
            <div className='space-y-3'>
              <Link
                href='/create-wallet'
                className='block w-full bg-blue-600 text-white py-3 px-4 rounded-xl font-medium hover:bg-blue-700 transition-colors'
              >
                Create New Wallet
              </Link>
              <Link
                href='/import-wallet'
                className='block w-full bg-gray-100 text-gray-700 py-3 px-4 rounded-xl font-medium hover:bg-gray-200 transition-colors'
              >
                Import Wallet
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className='min-h-screen bg-gray-50'>
      {/* Mobile Header */}
      <div className='bg-white shadow-sm border-b border-gray-100 backdrop-blur-sm bg-white/95'>
        <div className='max-w-7xl mx-auto px-3 sm:px-4 lg:px-8'>
          <div className='flex items-center justify-between h-16 sm:h-20'>
            {/* User Avatar & Title */}
            <div className='flex items-center space-x-3 sm:space-x-4'>
              <div className='w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl sm:rounded-2xl flex items-center justify-center text-white font-bold text-sm sm:text-base shadow-lg'>
                {getUserInitials(username)}
              </div>
              <div className='hidden sm:block'>
                <h1 className='text-xl sm:text-2xl font-bold text-gray-900'>Home</h1>
                <p className='text-xs sm:text-sm text-gray-600 font-medium'>{username}</p>
              </div>
              <h1 className='sm:hidden text-lg font-bold text-gray-900'>Home</h1>
            </div>

            {/* Notifications */}
            <button className='p-2 sm:p-3 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-xl sm:rounded-2xl transition-all duration-200'>
              <svg className='w-5 h-5 sm:w-6 sm:h-6' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M15 17h5l-5 5v-5zM9 3h6v12H9V3z' />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className='w-[95%] max-w-7xl mx-auto px-1 sm:px-2 lg:px-4 py-3 sm:py-4 lg:py-6'>
        <div className='grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8 w-full'>

          {/* Left Column - Main Content */}
          <div className='lg:col-span-2 space-y-4 sm:space-y-6 lg:space-y-8 w-full'>

            {/* Balance Section */}
            <div className='w-full bg-gradient-to-br from-white to-gray-50/30 rounded-2xl sm:rounded-3xl p-4 sm:p-6 lg:p-8 shadow-lg border border-white/50 backdrop-blur-sm'>
              <div className='text-center'>
                <p className='text-sm sm:text-base text-gray-600 mb-2 sm:mb-4 font-medium'>Current balance</p>
                {priceLoading ? (
                  <div className='flex items-center justify-center py-4 sm:py-6 lg:py-8'>
                    <div className='animate-spin rounded-full h-6 w-6 sm:h-8 sm:w-8 border-b-2 sm:border-b-3 border-blue-600'></div>
                  </div>
                ) : (
                  <h2 className='text-3xl sm:text-4xl lg:text-5xl xl:text-6xl font-black text-gray-900 tracking-tight'>
                    {formatCurrency(totalUsdValue)}
                  </h2>
                )}
              </div>
            </div>

            {/* Virtual Card Section */}
            <div className='w-full bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-6 lg:p-8 shadow-lg border border-gray-100/50 hover:shadow-xl transition-all duration-300'>
              {cardsLoading ? (
                <div className='flex items-center justify-center py-8 sm:py-10 lg:py-12'>
                  <div className='animate-spin rounded-full h-8 w-8 sm:h-10 sm:w-10 border-b-2 sm:border-b-3 border-blue-600'></div>
                </div>
              ) : virtualCards.length > 0 ? (
                <div className='space-y-4 sm:space-y-6'>
                  <div className='flex items-center justify-between'>
                    <h3 className='text-lg sm:text-xl font-bold text-gray-900'>Your Card</h3>
                    <Link
                      href={`/virtual-cards?userId=${userId}`}
                      className='text-blue-600 text-xs sm:text-sm font-semibold hover:text-blue-700 px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl sm:rounded-2xl hover:bg-blue-50 transition-all duration-200'
                    >
                      Manage
                    </Link>
                  </div>

                  {/* Simplified Card Display */}
                  <div className='relative'>
                    <div className='bg-gradient-to-br from-gray-900 via-gray-800 to-black rounded-2xl sm:rounded-3xl p-4 sm:p-6 lg:p-8 text-white shadow-2xl transform hover:scale-105 transition-transform duration-300'>
                      <div className='flex justify-between items-start mb-6 sm:mb-8 lg:mb-10'>
                        <div className='w-10 h-7 sm:w-12 sm:h-8 lg:w-14 lg:h-10 bg-gradient-to-r from-yellow-400 to-yellow-500 rounded-md sm:rounded-lg shadow-lg'></div>
                        <div className='text-white font-black text-lg sm:text-xl lg:text-2xl tracking-wider'>VISA</div>
                      </div>

                      <div className='text-xl sm:text-2xl lg:text-3xl font-mono tracking-[0.15em] sm:tracking-[0.2em] mb-6 sm:mb-8 font-bold'>
                        •••• •••• •••• {virtualCards[0]?.cardNumber?.slice(-4) || '0000'}
                      </div>

                      <div className='flex justify-between items-end'>
                        <div>
                          <p className='text-xs text-gray-300 mb-1 sm:mb-2 uppercase tracking-wider font-medium'>Card Holder</p>
                          <p className='font-bold text-sm sm:text-base lg:text-lg'>{virtualCards[0]?.cardHolderName}</p>
                        </div>
                        <div>
                          <p className='text-xs text-gray-300 mb-1 sm:mb-2 uppercase tracking-wider font-medium'>Expires</p>
                          <p className='font-bold text-sm sm:text-base lg:text-lg'>
                            {String(virtualCards[0]?.expiryMonth).padStart(2, '0')}/
                            {String(virtualCards[0]?.expiryYear).slice(-2)}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className='text-center py-8 sm:py-10 lg:py-12'>
                  <div className='w-16 h-16 sm:w-18 sm:h-18 lg:w-20 lg:h-20 bg-gradient-to-br from-gray-100 to-gray-200 rounded-2xl sm:rounded-3xl flex items-center justify-center mx-auto mb-4 sm:mb-6 shadow-lg'>
                    <svg className='w-8 h-8 sm:w-9 sm:h-9 lg:w-10 lg:h-10 text-gray-500' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                      <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z' />
                    </svg>
                  </div>
                  <h3 className='text-lg sm:text-xl font-bold text-gray-900 mb-2 sm:mb-3'>No Virtual Card</h3>
                  <p className='text-gray-600 mb-4 sm:mb-6 font-medium text-sm sm:text-base'>Create a virtual card to start making online purchases</p>
                  <Link
                    href={`/virtual-cards?userId=${userId}`}
                    className='inline-flex items-center px-4 py-2.5 sm:px-6 sm:py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl sm:rounded-2xl hover:from-blue-700 hover:to-blue-800 transition-all duration-200 font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 text-sm sm:text-base'
                  >
                    Create Card
                  </Link>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className='w-full grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 lg:gap-6'>
              <Link
                href={`/send-bnb?address=${address}&username=${username}`}
                className='bg-gradient-to-br from-white to-green-50/50 rounded-2xl sm:rounded-3xl p-3 sm:p-4 lg:p-6 shadow-lg border border-green-100/50 text-center hover:shadow-xl hover:scale-105 transition-all duration-300 group'
              >
                <div className='w-12 h-12 sm:w-14 sm:h-14 lg:w-16 lg:h-16 bg-gradient-to-br from-green-500 to-green-600 rounded-2xl sm:rounded-3xl flex items-center justify-center mx-auto mb-2 sm:mb-3 lg:mb-4 shadow-lg group-hover:shadow-xl transform group-hover:-translate-y-0.5 transition-all duration-300'>
                  <svg className='w-6 h-6 sm:w-7 sm:h-7 lg:w-8 lg:h-8 text-white' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                    <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2.5} d='M12 6v6m0 0v6m0-6h6m-6 0H6' />
                  </svg>
                </div>
                <p className='text-sm sm:text-base font-bold text-gray-900'>Top up</p>
              </Link>

              <Link
                href={`/transactions?address=${address}&username=${username}`}
                className='bg-gradient-to-br from-white to-blue-50/50 rounded-2xl sm:rounded-3xl p-3 sm:p-4 lg:p-6 shadow-lg border border-blue-100/50 text-center hover:shadow-xl hover:scale-105 transition-all duration-300 group'
              >
                <div className='w-12 h-12 sm:w-14 sm:h-14 lg:w-16 lg:h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl sm:rounded-3xl flex items-center justify-center mx-auto mb-2 sm:mb-3 lg:mb-4 shadow-lg group-hover:shadow-xl transform group-hover:-translate-y-0.5 transition-all duration-300'>
                  <svg className='w-6 h-6 sm:w-7 sm:h-7 lg:w-8 lg:h-8 text-white' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                    <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2.5} d='M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4' />
                  </svg>
                </div>
                <p className='text-sm sm:text-base font-bold text-gray-900'>Exchange</p>
              </Link>

              <Link
                href={`/send-bnb?address=${address}&username=${username}`}
                className='bg-gradient-to-br from-white to-purple-50/50 rounded-2xl sm:rounded-3xl p-3 sm:p-4 lg:p-6 shadow-lg border border-purple-100/50 text-center hover:shadow-xl hover:scale-105 transition-all duration-300 group'
              >
                <div className='w-12 h-12 sm:w-14 sm:h-14 lg:w-16 lg:h-16 bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl sm:rounded-3xl flex items-center justify-center mx-auto mb-2 sm:mb-3 lg:mb-4 shadow-lg group-hover:shadow-xl transform group-hover:-translate-y-0.5 transition-all duration-300'>
                  <svg className='w-6 h-6 sm:w-7 sm:h-7 lg:w-8 lg:h-8 text-white' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                    <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2.5} d='M7 11l5-5m0 0l5 5m-5-5v12' />
                  </svg>
                </div>
                <p className='text-sm sm:text-base font-bold text-gray-900'>Transfer</p>
              </Link>

              <Link
                href={`/presale?address=${address}&username=${username}&userId=${userId}`}
                className='bg-gradient-to-br from-white to-gray-50/50 rounded-2xl sm:rounded-3xl p-3 sm:p-4 lg:p-6 shadow-lg border border-gray-100/50 text-center hover:shadow-xl hover:scale-105 transition-all duration-300 group'
              >
                <div className='w-12 h-12 sm:w-14 sm:h-14 lg:w-16 lg:h-16 bg-gradient-to-br from-gray-600 to-gray-700 rounded-2xl sm:rounded-3xl flex items-center justify-center mx-auto mb-2 sm:mb-3 lg:mb-4 shadow-lg group-hover:shadow-xl transform group-hover:-translate-y-0.5 transition-all duration-300'>
                  <svg className='w-6 h-6 sm:w-7 sm:h-7 lg:w-8 lg:h-8 text-white' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                    <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2.5} d='M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z' />
                  </svg>
                </div>
                <p className='text-sm sm:text-base font-bold text-gray-900'>Presale</p>
              </Link>
            </div>

            {/* Recent Transactions */}
            <div className='w-full bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-6 lg:p-8 shadow-lg border border-gray-100/50 hover:shadow-xl transition-all duration-300'>
              <div className='flex items-center justify-between mb-4 sm:mb-6'>
                <h3 className='text-lg sm:text-xl font-bold text-gray-900'>Transactions</h3>
                <Link
                  href={`/transactions?address=${address}&username=${username}`}
                  className='text-blue-600 text-xs sm:text-sm font-semibold hover:text-blue-700 px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl sm:rounded-2xl hover:bg-blue-50 transition-all duration-200'
                >
                  View all
                </Link>
              </div>

              {recentTransactions.length > 0 ? (
                <div className='w-full divide-y divide-gray-100'>
                  {(() => {
                    const processedTransactionIds = new Set();
                    const transactionsToShow = [];

                    for (const transaction of recentTransactions) {
                      // Skip if already processed
                      if (processedTransactionIds.has(transaction.id)) continue;

                      // Check if this is part of a BBLIP purchase group
                      const isBBLIPPurchase = transaction.category === 'virtual_card' &&
                        transaction.type === 'PURCHASE' &&
                        transaction.transactionDirection === 'TOKEN_IN' &&
                        transaction.assetSymbol === 'BBLIP';

                      const isPaymentAsset = transaction.category === 'virtual_card' &&
                        transaction.type === 'PURCHASE' &&
                        transaction.transactionDirection === 'TOKEN_OUT';

                      if (isBBLIPPurchase) {
                        // Find all related payment transactions within 1 minute
                        const relatedPayments = recentTransactions.filter((t: UnifiedTransaction) =>
                          t.category === 'virtual_card' &&
                          t.type === 'PURCHASE' &&
                          t.transactionDirection === 'TOKEN_OUT' &&
                          Math.abs(new Date(t.timestamp).getTime() - new Date(transaction.timestamp).getTime()) < 60000
                        );

                        if (relatedPayments.length > 0) {
                          // Mark all related transactions as processed
                          processedTransactionIds.add(transaction.id);
                          relatedPayments.forEach(p => processedTransactionIds.add(p.id));

                          // Calculate total USD spent
                          const totalUsdSpent = relatedPayments.reduce((sum, p) => sum + (p.assetUsdValue || 0), 0);

                          // Add three transactions: Converted, Sent USD, and Received BBLIP
                          transactionsToShow.push({
                            ...transaction,
                            id: `converted-${transaction.id}`,
                            displayType: 'CONVERTED',
                            amount: totalUsdSpent,
                            amountFormatted: `${totalUsdSpent.toFixed(2)} USD`,
                            relatedPayments: relatedPayments,
                            originalTransaction: transaction
                          });

                          transactionsToShow.push({
                            ...transaction,
                            id: `sent-usd-${transaction.id}`,
                            displayType: 'SENT_USD',
                            amount: totalUsdSpent,
                            amountFormatted: `${totalUsdSpent.toFixed(2)} USD`,
                            relatedPayments: relatedPayments,
                            originalTransaction: transaction
                          });

                          transactionsToShow.push({
                            ...transaction,
                            displayType: 'RECEIVED_BBLIP'
                          });
                        } else {
                          // Single BBLIP purchase - still show as received BBLIP
                          transactionsToShow.push({
                            ...transaction,
                            displayType: 'RECEIVED_BBLIP'
                          });
                          processedTransactionIds.add(transaction.id);
                        }
                      } else if (isPaymentAsset) {
                        // Skip individual payment assets - they will be grouped in "Sent USD"
                        processedTransactionIds.add(transaction.id);
                      } else {
                        // Regular non-BBLIP transaction
                        transactionsToShow.push(transaction);
                        processedTransactionIds.add(transaction.id);
                      }
                    }

                    return transactionsToShow;
                  })().map((transaction: any) => { // eslint-disable-line @typescript-eslint/no-explicit-any

                    const getTransactionIcon = () => {
                      if (transaction.displayType === 'CONVERTED') {
                        return {
                          icon: 'M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15',
                          bg: 'bg-blue-50',
                          color: 'text-blue-500'
                        };
                      }
                      if (transaction.displayType === 'SENT_USD') {
                        return {
                          icon: 'M7 11l5-5m0 0l5 5m-5-5v12',
                          bg: 'bg-red-50',
                          color: 'text-red-500'
                        };
                      }
                      if (transaction.displayType === 'RECEIVED_BBLIP') {
                        return {
                          icon: 'M12 6v6m0 0v6m0-6h6m-6 0H6',
                          bg: 'bg-green-50',
                          color: 'text-green-500'
                        };
                      }

                      if (transaction.category === 'virtual_card') {
                        switch (transaction.type) {
                          case 'PURCHASE':
                            return {
                              icon: 'M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z',
                              bg: 'bg-blue-100',
                              color: 'text-blue-600'
                            };
                          case 'REFUND':
                            return {
                              icon: 'M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6',
                              bg: 'bg-green-100',
                              color: 'text-green-600'
                            };
                          case 'LOAD':
                            return {
                              icon: 'M12 6v6m0 0v6m0-6h6m-6 0H6',
                              bg: 'bg-purple-100',
                              color: 'text-purple-600'
                            };
                          default:
                            return {
                              icon: 'M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z',
                              bg: 'bg-gray-100',
                              color: 'text-gray-600'
                            };
                        }
                      } else {
                        return transaction.type === 'deposit' || transaction.type === 'token_in'
                          ? {
                            icon: 'M12 6v6m0 0v6m0-6h6m-6 0H6',
                            bg: 'bg-green-100',
                            color: 'text-green-600'
                          }
                          : {
                            icon: 'M20 12H4',
                            bg: 'bg-red-100',
                            color: 'text-red-600'
                          };
                      }
                    };

                    const iconStyle = getTransactionIcon();

                    const getDisplayName = () => {
                      if (transaction.displayType === 'CONVERTED') {
                        return 'Converted';
                      }
                      if (transaction.displayType === 'SENT_USD') {
                        return 'Sent';
                      }
                      if (transaction.displayType === 'RECEIVED_BBLIP') {
                        return 'Received';
                      }
                      return transaction.displayName;
                    };

                    const getDisplayDescription = () => {
                      if (transaction.displayType === 'CONVERTED') {
                        const assetCount = transaction.relatedPayments?.length || 0;
                        return `${assetCount} asset${assetCount > 1 ? 's' : ''} to USD • Click for details`;
                      }
                      if (transaction.displayType === 'SENT_USD') {
                        return 'USD payment';
                      }
                      if (transaction.displayType === 'RECEIVED_BBLIP') {
                        return 'BBLIP tokens';
                      }
                      return transaction.dateFormatted;
                    };

                    const displayAmount = transaction.displayType === 'RECEIVED_BBLIP' && transaction.assetFormatted
                      ? transaction.assetFormatted
                      : transaction.amountFormatted;

                    const isExpanded = expandedTransactions.has(transaction.id);
                    const canExpand = transaction.displayType === 'CONVERTED' && transaction.relatedPayments?.length > 0;

                    const toggleExpanded = () => {
                      const newExpanded = new Set(expandedTransactions);
                      if (isExpanded) {
                        newExpanded.delete(transaction.id);
                      } else {
                        newExpanded.add(transaction.id);
                      }
                      setExpandedTransactions(newExpanded);
                    };

                    return (
                      <div key={transaction.id} className='w-full'>
                        <div
                          className={`p-3 sm:p-4 ${canExpand ? 'cursor-pointer hover:bg-gray-50/50 rounded-xl transition-all duration-200' : ''}`}
                          onClick={canExpand ? toggleExpanded : undefined}
                        >
                          <div className='flex items-center space-x-3 sm:space-x-4'>
                            {/* İkon */}
                            <div className={`w-10 h-10 sm:w-11 sm:h-11 rounded-xl flex items-center justify-center ${iconStyle.bg} shadow-sm flex-shrink-0`}>
                              <svg className={`w-5 h-5 sm:w-6 sm:h-6 ${iconStyle.color}`} fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                                <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2.5} d={iconStyle.icon} />
                              </svg>
                            </div>

                            {/* İçerik */}
                            <div className='flex-1 min-w-0'>
                              <div className='flex items-center justify-between mb-1'>
                                <div className='flex items-center space-x-2 min-w-0'>
                                  <h3 className='font-bold text-gray-900 text-sm sm:text-base truncate'>
                                    {getDisplayName()}
                                  </h3>
                                  {canExpand && (
                                    <svg
                                      className={`w-4 h-4 text-gray-400 transition-transform duration-300 flex-shrink-0 ${isExpanded ? 'rotate-180' : ''}`}
                                      fill='none'
                                      stroke='currentColor'
                                      viewBox='0 0 24 24'
                                    >
                                      <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M19 9l-7 7-7-7' />
                                    </svg>
                                  )}
                                </div>
                                <div className='font-bold text-gray-900 text-sm sm:text-base flex-shrink-0 ml-3'>
                                  {transaction.displayType === 'SENT_USD' ? '-' : transaction.displayType === 'RECEIVED_BBLIP' ? '+' : ''}{displayAmount}
                                </div>
                              </div>

                              <div className='flex items-center justify-between'>
                                <p className='text-xs sm:text-sm text-gray-600 font-medium truncate pr-2'>
                                  {getDisplayDescription()}
                                </p>
                                <div className='text-xs sm:text-sm text-gray-500 font-medium flex-shrink-0 ml-3'>
                                  {transaction.dateFormatted?.replace(/,\s*\d{4}/, '') || 'N/A'}
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Expandable conversion details */}
                        {canExpand && isExpanded && (
                          <div className='border-t border-gray-200/50 bg-gradient-to-br from-gray-50/50 to-gray-100/30 p-4 sm:p-6 lg:p-8 backdrop-blur-sm'>
                            <h4 className='text-base sm:text-lg font-black text-gray-800 mb-4 sm:mb-6 flex items-center'>
                              <div className='w-6 h-6 sm:w-7 sm:h-7 lg:w-8 lg:h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl sm:rounded-2xl flex items-center justify-center mr-2 sm:mr-3 shadow-lg'>
                                <svg className='w-3 h-3 sm:w-4 sm:h-4 lg:w-5 lg:h-5 text-white' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                                  <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2.5} d='M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15' />
                                </svg>
                              </div>
                              Conversion Breakdown
                            </h4>
                            <div className='space-y-3 sm:space-y-4'>
                              {transaction.relatedPayments.map((payment: UnifiedTransaction, idx: number) => (
                                <div key={idx} className='flex items-center justify-between py-3 px-3 sm:py-4 sm:px-4 lg:py-5 lg:px-6 bg-gradient-to-r from-white to-gray-50/50 rounded-2xl sm:rounded-3xl border border-gray-200/50 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105'>
                                  <div className='flex items-center space-x-2 sm:space-x-3 lg:space-x-4 min-w-0'>
                                    <div className='w-3 h-3 sm:w-4 sm:h-4 lg:w-5 lg:h-5 bg-gradient-to-r from-red-500 to-red-600 rounded-xl sm:rounded-2xl shadow-lg flex-shrink-0'></div>
                                    <div className='min-w-0'>
                                      <span className='font-black text-gray-900 text-sm sm:text-base lg:text-lg'>{payment.assetSymbol}</span>
                                      <span className='text-gray-600 ml-1 sm:ml-2 lg:ml-3 text-xs sm:text-sm lg:text-base font-bold bg-gray-100 px-2 py-0.5 sm:px-3 sm:py-1 rounded-full'>({payment.assetFormatted})</span>
                                    </div>
                                  </div>
                                  <span className='font-black text-sm sm:text-lg lg:text-xl text-gray-800 flex-shrink-0'>{payment.assetUsdFormatted}</span>
                                </div>
                              ))}
                            </div>
                            <div className='mt-4 pt-4 sm:mt-6 sm:pt-6 border-t border-gray-300/50'>
                              <div className='flex items-center justify-between bg-gradient-to-r from-blue-50 to-blue-100 rounded-2xl sm:rounded-3xl p-4 sm:p-5 lg:p-6 border border-blue-200/50 shadow-xl transform hover:scale-105 transition-all duration-300'>
                                <span className='font-black text-base sm:text-lg lg:text-xl text-blue-800'>Total Converted</span>
                                <span className='font-black text-lg sm:text-2xl lg:text-3xl text-blue-900'>${transaction.amount.toFixed(2)}</span>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className='text-center py-8 sm:py-10 lg:py-12'>
                  <div className='w-16 h-16 sm:w-18 sm:h-18 lg:w-20 lg:h-20 bg-gradient-to-br from-gray-100 to-gray-200 rounded-2xl sm:rounded-3xl flex items-center justify-center mx-auto mb-4 sm:mb-6 shadow-lg'>
                    <svg className='w-8 h-8 sm:w-9 sm:h-9 lg:w-10 lg:h-10 text-gray-500' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                      <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2' />
                    </svg>
                  </div>
                  <h3 className='text-lg sm:text-xl font-bold text-gray-900 mb-2 sm:mb-3'>No Transactions</h3>
                  <p className='text-gray-600 mb-4 sm:mb-6 font-medium text-sm sm:text-base'>Your recent transactions will appear here</p>
                  <button
                    onClick={balanceTracking.syncTransactions}
                    disabled={balanceTracking.isSyncing}
                    className='inline-flex items-center px-4 py-2.5 sm:px-6 sm:py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl sm:rounded-2xl hover:from-blue-700 hover:to-blue-800 transition-all duration-200 font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 disabled:opacity-50 disabled:transform-none text-sm sm:text-base'
                  >
                    {balanceTracking.isSyncing ? 'Syncing...' : 'Sync Transactions'}
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Right Column - Portfolio & Quick Actions */}
          <div className='w-full space-y-4 sm:space-y-6 lg:space-y-8'>

            {/* Portfolio Summary */}
            <div className='w-full bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-6 lg:p-8 shadow-lg border border-gray-100/50 hover:shadow-xl transition-all duration-300'>
              <h3 className='text-lg sm:text-xl font-bold text-gray-900 mb-4 sm:mb-6'>Portfolio</h3>

              {balanceTracking.balances.length > 0 ? (
                <div className='space-y-3 sm:space-y-4'>
                  {balanceTracking.balances.slice(0, 4).map((balance, index) => (
                    <div key={index} className='flex items-center justify-between p-3 sm:p-4 rounded-xl sm:rounded-2xl hover:bg-gray-50 transition-all duration-200'>
                      <div className='flex items-center space-x-3 sm:space-x-4 min-w-0'>
                        <div className='w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-gray-100 to-gray-200 rounded-xl sm:rounded-2xl flex items-center justify-center shadow-sm flex-shrink-0'>
                          <span className='text-xs sm:text-sm font-bold text-gray-700'>
                            {balance.token.slice(0, 2)}
                          </span>
                        </div>
                        <div className='min-w-0'>
                          <p className='font-bold text-gray-900 text-sm sm:text-base truncate'>{balance.token}</p>
                          <p className='text-xs sm:text-sm text-gray-600 font-medium'>
                            {parseFloat(balance.balance).toFixed(4)}
                          </p>
                        </div>
                      </div>
                      <div className='text-right flex-shrink-0'>
                        <p className='font-bold text-gray-900 text-sm sm:text-base'>
                          ${(parseFloat(balance.balance) * (tokenPrices[balance.token] || (['BUSD', 'BSC-USD', 'USDT', 'USDC'].includes(balance.token) ? 1 : 0))).toFixed(2)}
                        </p>
                      </div>
                    </div>
                  ))}

                  {balanceTracking.balances.length > 4 && (
                    <Link
                      href={`/portfolio?address=${address}&username=${username}`}
                      className='block text-center text-blue-600 text-xs sm:text-sm font-semibold hover:text-blue-700 py-2.5 px-3 sm:py-3 sm:px-4 rounded-xl sm:rounded-2xl hover:bg-blue-50 transition-all duration-200 mt-3 sm:mt-4'
                    >
                      View all assets
                    </Link>
                  )}
                </div>
              ) : (
                <div className='text-center py-6 sm:py-8'>
                  <p className='text-gray-600 mb-3 sm:mb-4 font-medium text-sm sm:text-base'>No assets found</p>
                  <button
                    onClick={balanceTracking.syncTransactions}
                    disabled={balanceTracking.isSyncing}
                    className='text-blue-600 text-xs sm:text-sm font-semibold hover:text-blue-700 disabled:opacity-50 px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl sm:rounded-2xl hover:bg-blue-50 transition-all duration-200'
                  >
                    {balanceTracking.isSyncing ? 'Loading...' : 'Load Portfolio'}
                  </button>
                </div>
              )}
            </div>

            {/* Quick Actions */}
            <div className='w-full bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-6 lg:p-8 shadow-lg border border-gray-100/50 hover:shadow-xl transition-all duration-300'>
              <h3 className='text-lg sm:text-xl font-bold text-gray-900 mb-4 sm:mb-6'>Quick Actions</h3>
              <div className='space-y-3 sm:space-y-4'>
                <Link
                  href={`/asset-priorities?address=${address}&username=${username}&userId=${userId}`}
                  className='flex items-center p-3 sm:p-4 rounded-xl sm:rounded-2xl hover:bg-gradient-to-r hover:from-blue-50 hover:to-blue-100 transition-all duration-200 group'
                >
                  <div className='w-10 h-10 sm:w-12 sm:h-12 lg:w-14 lg:h-14 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl sm:rounded-2xl flex items-center justify-center mr-3 sm:mr-4 shadow-lg group-hover:shadow-xl transform group-hover:-translate-y-0.5 transition-all duration-200 flex-shrink-0'>
                    <svg className='w-5 h-5 sm:w-6 sm:h-6 lg:w-7 lg:h-7 text-white' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                      <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2.5} d='M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z' />
                    </svg>
                  </div>
                  <div className='min-w-0'>
                    <p className='font-bold text-gray-900 text-sm sm:text-base'>Asset Priorities</p>
                    <p className='text-xs sm:text-sm text-gray-600 font-medium'>Manage your investments</p>
                  </div>
                </Link>

                <Link
                  href='/welcome'
                  className='flex items-center p-3 sm:p-4 rounded-xl sm:rounded-2xl hover:bg-gradient-to-r hover:from-green-50 hover:to-green-100 transition-all duration-200 group'
                >
                  <div className='w-10 h-10 sm:w-12 sm:h-12 lg:w-14 lg:h-14 bg-gradient-to-br from-green-500 to-green-600 rounded-xl sm:rounded-2xl flex items-center justify-center mr-3 sm:mr-4 shadow-lg group-hover:shadow-xl transform group-hover:-translate-y-0.5 transition-all duration-200 flex-shrink-0'>
                    <svg className='w-5 h-5 sm:w-6 sm:h-6 lg:w-7 lg:h-7 text-white' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                      <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2.5} d='M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253' />
                    </svg>
                  </div>
                  <div className='min-w-0'>
                    <p className='font-bold text-gray-900 text-sm sm:text-base'>Learning Center</p>
                    <p className='text-xs sm:text-sm text-gray-600 font-medium'>Crypto education</p>
                  </div>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Navigation - Mobile */}
      <div className='fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-gray-200/50 shadow-2xl lg:hidden'>
        <div className='grid grid-cols-4'>
          <Link
            href={`/dashboard?address=${address}&username=${username}&network=${network}`}
            className='flex flex-col items-center py-4 px-3 text-blue-600 relative'
          >
            <div className='absolute -top-1 left-1/2 transform -translate-x-1/2 w-8 h-1 bg-blue-600 rounded-full'></div>
            <svg className='w-7 h-7 mb-2' fill='currentColor' viewBox='0 0 24 24'>
              <path d='M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z' />
            </svg>
            <span className='text-xs font-bold'>Home</span>
          </Link>

          <Link
            href={`/transactions?address=${address}&username=${username}`}
            className='flex flex-col items-center py-4 px-3 text-gray-500 hover:text-gray-700 transition-colors duration-200'
          >
            <svg className='w-7 h-7 mb-2' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
              <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2' />
            </svg>
            <span className='text-xs font-semibold'>Transactions</span>
          </Link>

          <Link
            href={`/portfolio?address=${address}&username=${username}`}
            className='flex flex-col items-center py-4 px-3 text-gray-500 hover:text-gray-700 transition-colors duration-200'
          >
            <svg className='w-7 h-7 mb-2' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
              <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z' />
            </svg>
            <span className='text-xs font-semibold'>Reports</span>
          </Link>

          <Link
            href={`/asset-priorities?address=${address}&username=${username}&userId=${userId}`}
            className='flex flex-col items-center py-4 px-3 text-gray-500 hover:text-gray-700 transition-colors duration-200'
          >
            <svg className='w-7 h-7 mb-2' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
              <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4' />
            </svg>
            <span className='text-xs font-semibold'>Manage</span>
          </Link>
        </div>
      </div>

      {/* Add bottom padding on mobile to account for bottom navigation */}
      <div className='h-24 lg:hidden'></div>
    </div>
  );
}

export default function Dashboard() {
  return (
    <Suspense fallback={
      <div className='min-h-screen bg-gray-50 flex items-center justify-center'>
        <div className='text-gray-600'>Loading...</div>
      </div>
    }>
      <DashboardContent />
    </Suspense>
  );
}
