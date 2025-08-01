'use client';

import { useSearchParams } from 'next/navigation';
import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { VirtualCard as VirtualCardType } from '@/lib/virtual-card';
import TransactionPasswordModal from '@/components/TransactionPasswordModal';

interface CheckoutData {
  userId: string;
  address: string;
  username: string;
  tokenQuantity: number;
  totalUsdCost: number;
  bnbPrice: number;
}

function CheckoutContent() {
  const searchParams = useSearchParams();
  const [mounted, setMounted] = useState(false);
  const [virtualCard, setVirtualCard] = useState<VirtualCardType | null>(null);
  const [cardLoading, setCardLoading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');
  const [showPasswordModal, setShowPasswordModal] = useState(false);

  // Parse checkout data from URL params
  const checkoutData: CheckoutData = {
    userId: searchParams.get('userId') || '',
    address: searchParams.get('address') || '',
    username: searchParams.get('username') || '',
    tokenQuantity: parseInt(searchParams.get('tokenQuantity') || '0'),
    totalUsdCost: parseFloat(searchParams.get('totalUsdCost') || '0'),
    bnbPrice: parseFloat(searchParams.get('bnbPrice') || '0'),
  };

  useEffect(() => {
    setMounted(true);
  }, []);

  // Fetch user's virtual card
  useEffect(() => {
    const fetchVirtualCard = async () => {
      if (!checkoutData.userId || !mounted) return;

      setCardLoading(true);
      try {
        const response = await fetch(
          `/api/virtual-cards?userId=${checkoutData.userId}`
        );
        const data = await response.json();

        if (response.ok && data.success && data.cards.length > 0) {
          setVirtualCard(data.cards[0]); // Use first card as default
        } else {
          setError('No virtual card found');
        }
      } catch (error) {
        console.error('[CHECKOUT] Error fetching virtual card:', error);
        setError('Failed to load payment method');
      } finally {
        setCardLoading(false);
      }
    };

    fetchVirtualCard();
  }, [checkoutData.userId, mounted]);

  // Handle purchase button click - show modal
  const handlePurchaseClick = () => {
    if (!virtualCard) {
      setError('No payment method available');
      return;
    }

    if (processing) {
      return;
    }

    setError('');
    setShowPasswordModal(true);
  };

  // Handle purchase completion after password verification
  const handlePurchaseConfirm = async (transactionPassword: string) => {
    setProcessing(true);
    setError('');

    try {
      console.log(
        '[CHECKOUT] 🚀 Starting purchase request with verified password...'
      );

      // Add small delay to prevent rapid double-clicks
      await new Promise(resolve => setTimeout(resolve, 100));

      const response = await fetch('/api/complete-purchase', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...checkoutData,
          transactionPassword, // Include verified password
          cardId: virtualCard?.id,
        }),
      });

      const result = await response.json();

      console.log('[CHECKOUT] 📥 API Response:', {
        success: result.success,
        isDuplicate: result.isDuplicate,
      });

      if (response.ok && result.success) {
        setShowPasswordModal(false);
        if (result.isDuplicate) {
          console.log(
            '[CHECKOUT] ⚠️ Duplicate transaction detected, redirecting...'
          );
          alert('Transaction already processed!');
        } else {
          console.log('[CHECKOUT] ✅ New transaction completed successfully!');
          alert('Purchase completed successfully!');
        }
        window.location.href = `/dashboard?address=${checkoutData.address}&username=${checkoutData.username}`;
      } else {
        setError(result.error || 'Purchase failed');
      }
    } catch (error) {
      console.error('[CHECKOUT] ❌ Purchase error:', error);
      setError('Network error. Please try again.');
    } finally {
      setProcessing(false);
    }
  };

  if (!mounted) {
    return (
      <div className='min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-pink-800 flex items-center justify-center'>
        <div className='text-white'>Loading...</div>
      </div>
    );
  }

  if (!checkoutData.userId || !checkoutData.tokenQuantity) {
    return (
      <div className='min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-pink-800 flex items-center justify-center'>
        <div className='max-w-md w-full mx-4'>
          <div className='bg-white rounded-2xl shadow-xl p-8 text-center'>
            <h1 className='text-2xl font-bold text-red-600 mb-4'>
              Invalid Checkout
            </h1>
            <p className='text-gray-600 mb-6'>Missing purchase information.</p>
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

  return (
    <div className='min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-pink-800'>
      <div className='max-w-md mx-auto p-6'>
        {/* Header */}
        <div className='text-center mb-8 pt-8'>
          <h1 className='text-3xl font-bold text-white mb-2'>Checkout</h1>
          <p className='text-2xl font-semibold text-white'>
            € {checkoutData.totalUsdCost.toFixed(2)}
          </p>
        </div>

        {/* Saved Cards Section */}
        <div className='mb-6'>
          <div className='flex items-center justify-between mb-4'>
            <h2 className='text-lg font-semibold text-white'>Saved Cards</h2>
            <button className='text-orange-400 font-medium text-sm'>
              + Add New
            </button>
          </div>

          {cardLoading ? (
            <div className='bg-gray-700 rounded-2xl p-6 animate-pulse'>
              <div className='h-4 bg-gray-600 rounded mb-4'></div>
              <div className='h-8 bg-gray-600 rounded mb-2'></div>
              <div className='h-4 bg-gray-600 rounded w-3/4'></div>
            </div>
          ) : virtualCard ? (
            <div className='space-y-4'>
              {/* Virtual Card Display */}
              <div className='bg-gradient-to-br from-gray-700 to-gray-800 rounded-2xl p-6 text-white border-2 border-orange-400'>
                <div className='flex justify-between items-start mb-6'>
                  <div className='flex items-center space-x-2'>
                    {virtualCard.cardBrand === 'MASTERCARD' ? (
                      <div className='flex items-center'>
                        <div className='w-6 h-6 bg-red-500 rounded-full opacity-80'></div>
                        <div className='w-6 h-6 bg-yellow-500 rounded-full -ml-3 opacity-80'></div>
                      </div>
                    ) : (
                      <div className='text-white font-bold text-sm'>
                        {virtualCard.cardBrand}
                      </div>
                    )}
                  </div>
                </div>

                <div className='text-xl font-mono tracking-wider mb-6'>
                  {virtualCard.cardNumber}
                </div>

                <div className='flex justify-between items-end'>
                  <div>
                    <div className='text-xs opacity-70 uppercase tracking-wide'>
                      Name
                    </div>
                    <div className='text-sm font-medium'>
                      {virtualCard.cardHolderName}
                    </div>
                  </div>
                  <div>
                    <div className='text-xs opacity-70 uppercase tracking-wide'>
                      Valid Till
                    </div>
                    <div className='text-sm font-medium'>
                      {String(virtualCard.expiryMonth).padStart(2, '0')}/
                      {String(virtualCard.expiryYear).slice(-2)}
                    </div>
                  </div>
                </div>
              </div>

              {/* Alternative card option (demo) */}
              <div className='bg-gradient-to-br from-blue-600 to-purple-600 rounded-2xl p-6 text-white opacity-60'>
                <div className='flex justify-between items-start mb-6'>
                  <div className='text-white font-bold text-lg italic'>
                    VISA
                  </div>
                </div>

                <div className='text-xl font-mono tracking-wider mb-6'>
                  4111 - 1111 - 1111 - 1111
                </div>

                <div className='flex justify-between items-end'>
                  <div>
                    <div className='text-xs opacity-70 uppercase tracking-wide'>
                      Name
                    </div>
                    <div className='text-sm font-medium'>
                      {checkoutData.username.toUpperCase()}
                    </div>
                  </div>
                  <div>
                    <div className='text-xs opacity-70 uppercase tracking-wide'>
                      Valid Till
                    </div>
                    <div className='text-sm font-medium'>10/28</div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className='bg-red-900 rounded-2xl p-6 text-center'>
              <p className='text-red-200'>No saved cards found</p>
            </div>
          )}
        </div>

        {/* Purchase Summary */}
        <div className='bg-white bg-opacity-10 rounded-2xl p-6 mb-6 text-white'>
          <h3 className='text-lg font-semibold mb-4'>Purchase Summary</h3>
          <div className='space-y-2 text-sm'>
            <div className='flex justify-between'>
              <span>Token Quantity:</span>
              <span>{checkoutData.tokenQuantity.toLocaleString()} BBLIP</span>
            </div>
            <div className='flex justify-between'>
              <span>Price per Token:</span>
              <span>$0.10</span>
            </div>
            <div className='border-t border-white border-opacity-20 pt-2 mt-2'>
              <div className='flex justify-between font-semibold'>
                <span>Total Cost:</span>
                <span>${checkoutData.totalUsdCost.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Network Fee Notice */}
          <div className='bg-yellow-600 bg-opacity-30 rounded-lg p-3 mt-4 mb-3'>
            <div className='flex items-start'>
              <svg
                className='w-4 h-4 text-yellow-200 mt-0.5 mr-2 flex-shrink-0'
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
                <p className='text-yellow-100 text-xs font-medium'>
                  Network Fee: 1 BBLIP
                </p>
                <p className='text-yellow-200 text-xs mt-1'>
                  This fee will be deducted from your BBLIP balance
                </p>
              </div>
            </div>
          </div>

          {/* Payment Method Notice */}
          <div className='bg-blue-600 bg-opacity-30 rounded-lg p-3'>
            <p className='text-blue-100 text-xs'>
              <strong>Payment Method:</strong> Funds will be automatically
              deducted from your assets based on your spending priority
              settings.
            </p>
          </div>
        </div>

        {/* Transaction Notice */}
        <div className='mb-6'>
          <div className='bg-green-600 bg-opacity-30 rounded-lg p-4'>
            <p className='text-green-100 text-sm'>
              <strong>Ready to Purchase:</strong> Payment will be automatically
              processed using your asset priority settings.
            </p>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className='bg-red-600 bg-opacity-30 rounded-lg p-4 mb-4'>
            <p className='text-red-200 text-sm'>{error}</p>
          </div>
        )}

        {/* Proceed Button */}
        <button
          onClick={handlePurchaseClick}
          disabled={processing || !virtualCard}
          className='w-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 disabled:from-gray-600 disabled:to-gray-700 text-white font-bold py-4 px-6 rounded-2xl transition duration-200 disabled:cursor-not-allowed text-lg'
          style={{ pointerEvents: processing ? 'none' : 'auto' }} // Extra protection against double clicks
        >
          {processing ? (
            <div className='flex items-center justify-center'>
              <div className='animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2'></div>
              PROCESSING... DO NOT REFRESH
            </div>
          ) : (
            `PURCHASE ${checkoutData.tokenQuantity.toLocaleString()} BBLIP`
          )}
        </button>

        {/* Back to Presale */}
        <div className='text-center mt-6'>
          <Link
            href={`/presale?address=${checkoutData.address}&username=${checkoutData.username}&userId=${checkoutData.userId}`}
            className='text-white text-sm opacity-70 hover:opacity-100 transition duration-200'
          >
            ← Back to Presale
          </Link>
        </div>
      </div>

      {/* Transaction Password Modal */}
      <TransactionPasswordModal
        isOpen={showPasswordModal}
        onClose={() => setShowPasswordModal(false)}
        onConfirm={handlePurchaseConfirm}
        loading={processing}
        error={error}
      />
    </div>
  );
}

export default function Checkout() {
  return (
    <Suspense
      fallback={
        <div className='min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-pink-800 flex items-center justify-center'>
          <div className='text-white'>Loading...</div>
        </div>
      }
    >
      <CheckoutContent />
    </Suspense>
  );
}
