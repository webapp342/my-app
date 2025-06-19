'use client';

import { useState, useEffect } from 'react';
import { Transaction, TransactionResponse } from '@/types/transaction';
import { getExplorerUrl } from '@/lib/transaction-service';

interface TransactionExplorerProps {
  address: string;
  network?: 'ethereum' | 'bsc';
  className?: string;
}

/**
 * TransactionExplorer Component
 *
 * Displays a user's blockchain transaction history in a responsive table format.
 * Categorizes transactions as deposits, withdrawals, and token transfers.
 * Includes pagination and links to blockchain explorers.
 */
export default function TransactionExplorer({
  address,
  network,
  className = '',
}: TransactionExplorerProps) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [totalTransactions, setTotalTransactions] = useState(0);
  const [detectedNetwork, setDetectedNetwork] = useState<'ethereum' | 'bsc'>(
    'ethereum'
  );

  /**
   * Fetches transaction data from the API
   */
  const fetchTransactions = async (
    page: number = 1,
    append: boolean = false
  ) => {
    if (!address) return;

    setLoading(true);
    setError('');

    try {
      const params = new URLSearchParams({
        address,
        page: page.toString(),
        limit: '20',
      });

      if (network) {
        params.set('network', network);
      }

      const response = await fetch(`/api/transactions?${params.toString()}`);
      const data = await response.json();

      if (!response.ok) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        throw new Error((data as any).error || 'Failed to fetch transactions');
      }

      const transactionData = data as TransactionResponse;

      setDetectedNetwork(transactionData.network);
      setTotalTransactions(transactionData.total);
      setHasMore(transactionData.hasMore);
      setCurrentPage(page);

      if (append) {
        setTransactions(prev => [...prev, ...transactionData.transactions]);
      } else {
        setTransactions(transactionData.transactions);
      }
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'An error occurred';
      setError(errorMessage);
      console.error('Error fetching transactions:', err);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Load more transactions (pagination)
   */
  const loadMore = () => {
    if (!loading && hasMore) {
      fetchTransactions(currentPage + 1, true);
    }
  };

  /**
   * Initial load when component mounts or address changes
   */
  useEffect(() => {
    if (address) {
      setTransactions([]);
      setCurrentPage(1);
      fetchTransactions(1, false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [address, network]);

  /**
   * Formats date for display
   */
  const formatDate = (timestamp: string): string => {
    const date = new Date(timestamp);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  /**
   * Gets transaction type styling
   */
  const getTypeStyle = (type: Transaction['type']): string => {
    switch (type) {
      case 'deposit':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'withdraw':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'token_transfer':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  /**
   * Formats transaction type for display
   */
  const formatType = (transaction: Transaction): string => {
    if (transaction.type === 'token_transfer') {
      return `Token ${transaction.to.toLowerCase() === address.toLowerCase() ? 'In' : 'Out'}`;
    }
    return transaction.type === 'deposit' ? 'Deposit' : 'Withdraw';
  };

  /**
   * Gets the display amount for a transaction (number only)
   */
  const getDisplayAmount = (transaction: Transaction): string => {
    if (transaction.type === 'token_transfer') {
      return transaction.tokenAmount || '0';
    }
    return transaction.value;
  };

  /**
   * Gets the token/currency symbol for a transaction
   */
  const getTokenSymbol = (transaction: Transaction): string => {
    if (transaction.type === 'token_transfer') {
      return transaction.tokenSymbol || 'UNKNOWN';
    }
    return detectedNetwork === 'ethereum' ? 'ETH' : 'BNB';
  };

  /**
   * Truncates address for display
   */
  const truncateAddress = (addr: string): string => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  if (error) {
    return (
      <div
        className={`bg-red-50 border border-red-200 rounded-lg p-6 ${className}`}
      >
        <div className='flex items-center'>
          <svg
            className='w-5 h-5 text-red-400 mr-2'
            fill='currentColor'
            viewBox='0 0 20 20'
          >
            <path
              fillRule='evenodd'
              d='M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z'
              clipRule='evenodd'
            />
          </svg>
          <div>
            <h3 className='text-red-800 font-medium'>
              Error Loading Transactions
            </h3>
            <p className='text-red-600 text-sm mt-1'>{error}</p>
          </div>
        </div>
        <button
          onClick={() => fetchTransactions(1, false)}
          className='mt-4 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition duration-200'
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div
      className={`bg-white rounded-2xl shadow-xl overflow-hidden ${className}`}
    >
      {/* Header */}
      <div className='bg-gray-50 px-6 py-4 border-b border-gray-200'>
        <div className='flex items-center justify-between'>
          <div>
            <h2 className='text-xl font-semibold text-gray-900'>
              Transaction History
            </h2>
            <p className='text-sm text-gray-600 mt-1'>
              {totalTransactions > 0 &&
                `${totalTransactions} transactions found`}
              {detectedNetwork && (
                <span className='ml-2 inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800'>
                  {detectedNetwork === 'ethereum' ? 'Ethereum' : 'BSC'}
                </span>
              )}
            </p>
          </div>
          {loading && (
            <div className='flex items-center text-blue-600'>
              <div className='animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2'></div>
              Loading...
            </div>
          )}
        </div>
      </div>

      {/* Transaction Table */}
      <div className='overflow-x-auto'>
        <style jsx>{`
          @media (max-width: 768px) {
            .mobile-scroll {
              min-width: 800px;
            }
          }
        `}</style>
        {transactions.length === 0 && !loading ? (
          <div className='text-center py-12'>
            <svg
              className='mx-auto h-12 w-12 text-gray-400'
              fill='none'
              stroke='currentColor'
              viewBox='0 0 24 24'
            >
              <path
                strokeLinecap='round'
                strokeLinejoin='round'
                strokeWidth={2}
                d='M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2'
              />
            </svg>
            <h3 className='mt-2 text-sm font-medium text-gray-900'>
              No transactions found
            </h3>
            <p className='mt-1 text-sm text-gray-500'>
              This address doesn&apos;t have any recorded transactions.
            </p>
          </div>
        ) : (
          <table className='min-w-full divide-y divide-gray-200 mobile-scroll'>
            <thead className='bg-gray-50'>
              <tr>
                <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                  Date
                </th>
                <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                  Type
                </th>
                <th className='px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider'>
                  Amount
                </th>
                <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                  Token
                </th>
                <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                  From
                </th>
                <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                  To
                </th>
                <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                  Hash
                </th>
              </tr>
            </thead>
            <tbody className='bg-white divide-y divide-gray-200'>
              {transactions.map(transaction => (
                <tr key={transaction.hash} className='hover:bg-gray-50'>
                  <td className='px-6 py-4 whitespace-nowrap text-sm text-gray-900'>
                    {formatDate(transaction.timestamp)}
                  </td>
                  <td className='px-6 py-4 whitespace-nowrap'>
                    <span
                      className={`inline-flex px-2 py-1 text-xs font-medium rounded-full border ${getTypeStyle(transaction.type)}`}
                    >
                      {formatType(transaction)}
                    </span>
                  </td>
                  <td className='px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 text-right font-mono'>
                    {getDisplayAmount(transaction)}
                  </td>
                  <td className='px-6 py-4 whitespace-nowrap text-sm text-gray-600'>
                    <span
                      className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                        transaction.type === 'token_transfer'
                          ? 'bg-purple-100 text-purple-800 border border-purple-200'
                          : 'bg-gray-100 text-gray-800 border border-gray-200'
                      }`}
                    >
                      {getTokenSymbol(transaction)}
                    </span>
                  </td>
                  <td className='px-6 py-4 whitespace-nowrap text-sm text-gray-600'>
                    <span className='font-mono'>
                      {truncateAddress(transaction.from)}
                    </span>
                  </td>
                  <td className='px-6 py-4 whitespace-nowrap text-sm text-gray-600'>
                    <span className='font-mono'>
                      {truncateAddress(transaction.to)}
                    </span>
                  </td>
                  <td className='px-6 py-4 whitespace-nowrap text-sm'>
                    <a
                      href={getExplorerUrl(transaction.hash, detectedNetwork)}
                      target='_blank'
                      rel='noopener noreferrer'
                      className='text-blue-600 hover:text-blue-800 font-mono'
                    >
                      {truncateAddress(transaction.hash)}
                      <svg
                        className='inline w-3 h-3 ml-1'
                        fill='none'
                        stroke='currentColor'
                        viewBox='0 0 24 24'
                      >
                        <path
                          strokeLinecap='round'
                          strokeLinejoin='round'
                          strokeWidth={2}
                          d='M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14'
                        />
                      </svg>
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Load More Button */}
      {hasMore && (
        <div className='bg-gray-50 px-6 py-4 border-t border-gray-200'>
          <button
            onClick={loadMore}
            disabled={loading}
            className='w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium py-2 px-4 rounded-lg transition duration-200'
          >
            {loading ? 'Loading...' : 'Load More Transactions'}
          </button>
        </div>
      )}
    </div>
  );
}
