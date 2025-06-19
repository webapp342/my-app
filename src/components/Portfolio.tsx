'use client';

import { useState, useEffect } from 'react';
import { PortfolioData, TokenBalance } from '@/lib/portfolio-service';

interface PortfolioProps {
  address: string;
  className?: string;
}

export default function Portfolio({ address, className = '' }: PortfolioProps) {
  const [portfolioData, setPortfolioData] = useState<PortfolioData | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [mounted, setMounted] = useState(false);

  // Ensure component is mounted on client side
  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const fetchPortfolio = async () => {
      if (!address || !mounted) return;

      setLoading(true);
      setError('');

      try {
        const response = await fetch(`/api/portfolio?address=${address}`);
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Failed to fetch portfolio');
        }

        setPortfolioData(data);
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'An error occurred';
        setError(errorMessage);
        console.error('Error fetching portfolio:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchPortfolio();
  }, [address, mounted]);

  const formatNumber = (num: number, decimals: number = 6): string => {
    if (typeof num !== 'number' || isNaN(num)) return '0';
    return num.toLocaleString('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: decimals,
    });
  };

  const formatChange = (change: number): string => {
    if (typeof change !== 'number' || isNaN(change)) return '0.00%';
    const sign = change >= 0 ? '+' : '';
    return `${sign}${change.toFixed(2)}%`;
  };

  const getChangeColor = (change: number): string => {
    if (typeof change !== 'number' || isNaN(change)) return 'text-gray-600';
    if (change > 0) return 'text-green-600';
    if (change < 0) return 'text-red-600';
    return 'text-gray-600';
  };

  // Don't render anything until mounted (prevents hydration mismatch)
  if (!mounted) {
    return (
      <div className={`bg-white rounded-2xl shadow-xl p-6 ${className}`}>
        <div className='animate-pulse'>
          <div className='h-6 bg-gray-200 rounded w-1/3 mb-4'></div>
          <div className='space-y-3'>
            <div className='h-4 bg-gray-200 rounded w-1/2'></div>
            <div className='h-4 bg-gray-200 rounded w-1/4'></div>
            <div className='h-4 bg-gray-200 rounded w-1/3'></div>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className={`bg-white rounded-2xl shadow-xl p-6 ${className}`}>
        <div className='animate-pulse'>
          <div className='h-6 bg-gray-200 rounded w-1/3 mb-4'></div>
          <div className='space-y-3'>
            <div className='h-4 bg-gray-200 rounded w-1/2'></div>
            <div className='h-4 bg-gray-200 rounded w-1/4'></div>
            <div className='h-4 bg-gray-200 rounded w-1/3'></div>
          </div>
        </div>
      </div>
    );
  }

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
              Error Loading Portfolio
            </h3>
            <p className='text-red-600 text-sm mt-1'>{error}</p>
          </div>
        </div>
        <button
          onClick={() => window.location.reload()}
          className='mt-4 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition duration-200'
        >
          Retry
        </button>
      </div>
    );
  }

  if (!portfolioData) {
    return (
      <div
        className={`bg-gray-50 border border-gray-200 rounded-lg p-6 ${className}`}
      >
        <p className='text-gray-600 text-center'>No portfolio data available</p>
      </div>
    );
  }

  const netWorthUSD = portfolioData.netWorthUSD || 0;
  const netWorthBNB = portfolioData.netWorthBNB || 0;
  const totalChange24h = portfolioData.totalChange24h || 0;
  const nativeBalance = portfolioData.nativeBalance || {
    symbol: 'BNB',
    balance: 0,
    value: 0,
  };
  const tokens = portfolioData.tokens || [];

  return (
    <div
      className={`bg-white rounded-2xl shadow-xl overflow-hidden ${className}`}
    >
      {/* Portfolio Overview */}
      <div className='bg-gradient-to-r from-blue-600 to-purple-600 text-white p-6'>
        <h2 className='text-2xl font-bold mb-4'>Portfolio Overview</h2>

        <div className='grid grid-cols-1 md:grid-cols-3 gap-6'>
          {/* Net Worth USD */}
          <div>
            <p className='text-blue-100 text-sm'>Net Worth in USD</p>
            <p className='text-3xl font-bold'>
              ${formatNumber(netWorthUSD, 2)}
            </p>
          </div>

          {/* Net Worth BNB */}
          <div>
            <p className='text-blue-100 text-sm'>Net Worth in BNB</p>
            <p className='text-2xl font-semibold'>
              ⚪ {formatNumber(netWorthBNB, 6)}
            </p>
          </div>

          {/* 24h Change */}
          <div>
            <p className='text-blue-100 text-sm'>Total Balance Change (24H)</p>
            <p
              className={`text-xl font-semibold ${getChangeColor(totalChange24h)}`}
            >
              {formatChange(totalChange24h)}
            </p>
          </div>
        </div>

        {/* Progress Bar (Portfolio Composition) */}
        <div className='mt-6'>
          <div className='flex items-center justify-between text-sm mb-2'>
            <span>Portfolio Composition</span>
            <span>Total: {tokens.length + 1} assets</span>
          </div>
          <div className='w-full bg-blue-500 rounded-full h-2'>
            <div
              className='bg-yellow-400 h-2 rounded-full'
              style={{
                width:
                  netWorthUSD > 0
                    ? `${Math.min(100, (nativeBalance.value / netWorthUSD) * 100)}%`
                    : '0%',
              }}
            ></div>
          </div>
          <div className='flex items-center mt-2 text-xs space-x-4'>
            <div className='flex items-center'>
              <div className='w-3 h-3 bg-yellow-400 rounded-full mr-1'></div>
              <span>
                BNB{' '}
                {netWorthUSD > 0
                  ? ((nativeBalance.value / netWorthUSD) * 100).toFixed(1)
                  : '0'}
                %
              </span>
            </div>
            <div className='flex items-center'>
              <div className='w-3 h-3 bg-blue-400 rounded-full mr-1'></div>
              <span>
                Others{' '}
                {netWorthUSD > 0
                  ? (100 - (nativeBalance.value / netWorthUSD) * 100).toFixed(1)
                  : '0'}
                %
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Token List */}
      <div className='p-6'>
        <div className='flex items-center justify-between mb-4'>
          <h3 className='text-lg font-semibold'>Token Holdings</h3>
          <span className='text-sm text-gray-500'>
            Showing {tokens.length + 1} tokens
          </span>
        </div>

        <div className='overflow-x-auto'>
          <table className='w-full'>
            <thead>
              <tr className='border-b border-gray-200'>
                <th className='text-left py-3 text-sm font-medium text-gray-600'>
                  Token
                </th>
                <th className='text-left py-3 text-sm font-medium text-gray-600'>
                  Contract
                </th>
                <th className='text-right py-3 text-sm font-medium text-gray-600'>
                  Price
                </th>
                <th className='text-right py-3 text-sm font-medium text-gray-600'>
                  Change (24H)
                </th>
                <th className='text-right py-3 text-sm font-medium text-gray-600'>
                  Amount
                </th>
                <th className='text-right py-3 text-sm font-medium text-gray-600'>
                  Value
                </th>
              </tr>
            </thead>
            <tbody className='divide-y divide-gray-100'>
              {/* Native BNB */}
              <tr className='hover:bg-gray-50'>
                <td className='py-4 flex items-center'>
                  <div className='w-8 h-8 bg-yellow-500 rounded-full flex items-center justify-center mr-3'>
                    <span className='text-white font-bold text-sm'>B</span>
                  </div>
                  <div>
                    <p className='font-medium'>BNB</p>
                    <p className='text-xs text-gray-500'>Binance Coin</p>
                  </div>
                </td>
                <td className='py-4 text-sm text-gray-600'>
                  <span className='text-xs font-mono'>Native Token</span>
                </td>
                <td className='py-4 text-right text-sm font-medium'>
                  $
                  {nativeBalance.balance > 0
                    ? formatNumber(
                        nativeBalance.value / nativeBalance.balance,
                        2
                      )
                    : '0.00'}
                </td>
                <td className='py-4 text-right text-sm'>
                  <span className='text-gray-500'>-</span>
                </td>
                <td className='py-4 text-right text-sm font-medium'>
                  {formatNumber(nativeBalance.balance, 6)}
                </td>
                <td className='py-4 text-right text-sm font-medium'>
                  {nativeBalance.value < 1000
                    ? `$${nativeBalance.value.toFixed(2)}`
                    : `$${(nativeBalance.value / 1000).toFixed(2)}K`}
                </td>
              </tr>

              {/* Other Tokens */}
              {tokens.map((token: TokenBalance) => (
                <tr key={token.contractAddress} className='hover:bg-gray-50'>
                  <td className='py-4 flex items-center'>
                    <div className='w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center mr-3'>
                      <span className='text-gray-600 font-bold text-xs'>
                        {token.tokenSymbol?.slice(0, 2).toUpperCase() || 'TK'}
                      </span>
                    </div>
                    <div>
                      <p className='font-medium'>
                        {token.tokenSymbol || 'Unknown'}
                      </p>
                      <p className='text-xs text-gray-500'>
                        {token.tokenName || 'Unknown Token'}
                      </p>
                    </div>
                  </td>
                  <td className='py-4 text-sm'>
                    <a
                      href={`https://bscscan.com/token/${token.contractAddress}`}
                      target='_blank'
                      rel='noopener noreferrer'
                      className='text-blue-600 hover:text-blue-800 font-mono text-xs'
                    >
                      {`${token.contractAddress?.slice(0, 6) || ''}...${token.contractAddress?.slice(-4) || ''}`}
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
                  <td className='py-4 text-right text-sm font-medium'>
                    ${formatNumber(token.price || 0, 4)}
                  </td>
                  <td className='py-4 text-right text-sm'>
                    <span className={getChangeColor(token.change24h || 0)}>
                      {token.change24h ? formatChange(token.change24h) : '-'}
                    </span>
                  </td>
                  <td className='py-4 text-right text-sm font-medium'>
                    {formatNumber(token.balanceFormatted || 0, 4)}
                  </td>
                  <td className='py-4 text-right text-sm font-medium'>
                    {token.valueFormatted || '$0.00'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Show $0.00 assets toggle */}
        <div className='mt-4 flex items-center justify-between text-sm text-gray-500'>
          <div className='flex items-center'>
            <input type='checkbox' id='showZero' className='mr-2' />
            <label htmlFor='showZero'>Hide $0.00 assets</label>
          </div>
          <p>
            Last updated:{' '}
            {portfolioData.lastUpdated
              ? new Date(portfolioData.lastUpdated).toLocaleString()
              : 'Never'}
          </p>
        </div>
      </div>
    </div>
  );
}
