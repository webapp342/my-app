'use client'

import { useState } from 'react'
import { VirtualCard as VirtualCardType } from '@/lib/virtual-card'
import { maskCardNumber, isCardExpired } from '@/lib/virtual-card'

interface VirtualCardProps {
  card: VirtualCardType
  showFullNumber?: boolean
  onToggleVisibility?: () => void
  onBlockCard?: (cardId: string) => void
  onUnblockCard?: (cardId: string) => void
  className?: string
}

export default function VirtualCard({
  card,
  showFullNumber = false,
  onToggleVisibility,
  onBlockCard,
  onUnblockCard,
  className = ''
}: VirtualCardProps) {
  const [isFlipped, setIsFlipped] = useState(false)
  const [showCVV, setShowCVV] = useState(false)

  const isExpired = isCardExpired(card.expiryMonth, card.expiryYear)
  const isBlocked = card.status === 'BLOCKED'
  const isCancelled = card.status === 'CANCELLED'

  const cardBrandColors = {
    VISA: 'from-blue-600 to-blue-800',
    MASTERCARD: 'from-red-600 to-orange-600',
    AMEX: 'from-gray-700 to-gray-900'
  }

  const cardBrandLogos = {
    VISA: (
      <div className="text-white font-bold text-xl italic">
        VISA
      </div>
    ),
    MASTERCARD: (
      <div className="flex items-center">
        <div className="w-8 h-8 bg-red-500 rounded-full opacity-80"></div>
        <div className="w-8 h-8 bg-yellow-500 rounded-full -ml-4 opacity-80"></div>
      </div>
    ),
    AMEX: (
      <div className="text-white font-bold text-lg">
        AMEX
      </div>
    )
  }

  const statusColors = {
    ACTIVE: 'text-green-600 bg-green-100',
    BLOCKED: 'text-red-600 bg-red-100',
    EXPIRED: 'text-gray-600 bg-gray-100',
    CANCELLED: 'text-gray-600 bg-gray-100'
  }

  return (
    <div className={`relative ${className}`}>
      {/* Card Status Badge */}
      <div className="flex justify-between items-center mb-4">
        <span className={`px-3 py-1 rounded-full text-sm font-medium ${statusColors[card.status]}`}>
          {card.status}
        </span>
        <div className="flex gap-2">
          {onToggleVisibility && (
            <button
              onClick={onToggleVisibility}
              className="p-2 text-gray-600 hover:text-gray-800 transition-colors"
              title={showFullNumber ? 'Hide card number' : 'Show card number'}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {showFullNumber ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                )}
              </svg>
            </button>
          )}
          <button
            onClick={() => setIsFlipped(!isFlipped)}
            className="p-2 text-gray-600 hover:text-gray-800 transition-colors"
            title="Flip card"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>
      </div>

      {/* Card Container */}
      <div className="relative w-full max-w-sm mx-auto">
        <div className={`relative w-full h-56 transition-transform duration-700 transform-style-preserve-3d ${isFlipped ? 'rotate-y-180' : ''}`}>
          
          {/* Front of Card */}
          <div className={`absolute inset-0 w-full h-full rounded-2xl shadow-2xl bg-gradient-to-br ${cardBrandColors[card.cardBrand]} p-6 text-white backface-hidden`}>
            {/* Card Header */}
            <div className="flex justify-between items-start mb-8">
              <div className="flex items-center space-x-2">
                <div className="w-10 h-8 bg-gradient-to-r from-yellow-400 to-yellow-600 rounded-md flex items-center justify-center">
                  <div className="w-6 h-4 bg-gradient-to-r from-yellow-300 to-yellow-500 rounded-sm"></div>
                </div>
                <span className="text-xs font-medium opacity-80">{card.cardType}</span>
              </div>
              {cardBrandLogos[card.cardBrand]}
            </div>

            {/* Card Number */}
            <div className="mb-6">
              <div className="text-2xl font-mono tracking-wider font-medium">
                {showFullNumber ? card.cardNumber : maskCardNumber(card.cardNumber)}
              </div>
            </div>

            {/* Card Details */}
            <div className="flex justify-between items-end">
              <div>
                <div className="text-xs opacity-70 uppercase tracking-wide">Card Holder</div>
                <div className="text-sm font-medium">{card.cardHolderName}</div>
              </div>
              <div>
                <div className="text-xs opacity-70 uppercase tracking-wide">Expires</div>
                <div className="text-sm font-medium">
                  {String(card.expiryMonth).padStart(2, '0')}/{String(card.expiryYear).slice(-2)}
                </div>
              </div>
            </div>

            {/* Overlay for blocked/expired cards */}
            {(isBlocked || isExpired || isCancelled) && (
              <div className="absolute inset-0 bg-black bg-opacity-50 rounded-2xl flex items-center justify-center">
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-400">
                    {isBlocked ? 'BLOCKED' : isExpired ? 'EXPIRED' : 'CANCELLED'}
                  </div>
                  <div className="text-sm opacity-80">
                    {isBlocked ? 'Card is temporarily blocked' : 
                     isExpired ? 'Card has expired' : 
                     'Card has been cancelled'}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Back of Card */}
          <div className={`absolute inset-0 w-full h-full rounded-2xl shadow-2xl bg-gradient-to-br ${cardBrandColors[card.cardBrand]} p-6 text-white backface-hidden rotate-y-180`}>
            {/* Magnetic Stripe */}
            <div className="w-full h-12 bg-black mt-4 mb-6"></div>

            {/* CVV Section */}
            <div className="mb-6">
              <div className="bg-white p-3 rounded">
                <div className="flex justify-between items-center">
                  <span className="text-gray-800 text-sm">CVV:</span>
                  <div className="flex items-center space-x-2">
                    <span className="text-gray-800 font-mono text-lg">
                      {showCVV ? card.cvv : '***'}
                    </span>
                    <button
                      onClick={() => setShowCVV(!showCVV)}
                      className="text-gray-600 hover:text-gray-800"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        {showCVV ? (
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
                        ) : (
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        )}
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Card Info */}
            <div className="text-xs space-y-2 opacity-80">
              <div>This card is issued by Digital Wallet Inc.</div>
              <div>For customer service, call 1-800-DIGITAL</div>
              <div>Card ID: {card.id.slice(0, 8)}...</div>
            </div>

            {/* Brand Logo */}
            <div className="absolute bottom-6 right-6">
              {cardBrandLogos[card.cardBrand]}
            </div>
          </div>
        </div>
      </div>

      {/* Card Actions */}
      <div className="mt-6 flex justify-center space-x-3">
        {card.status === 'ACTIVE' && onBlockCard && (
          <button
            onClick={() => onBlockCard(card.id)}
            className="px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors text-sm font-medium"
          >
            Block Card
          </button>
        )}
        {card.status === 'BLOCKED' && onUnblockCard && (
          <button
            onClick={() => onUnblockCard(card.id)}
            className="px-4 py-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors text-sm font-medium"
          >
            Unblock Card
          </button>
        )}
      </div>

      {/* Card Limits */}
      <div className="mt-6 grid grid-cols-2 gap-4">
        <div className="bg-gray-50 p-4 rounded-lg">
          <div className="text-sm text-gray-600">Daily Limit</div>
          <div className="text-lg font-semibold text-gray-900">${card.dailyLimit.toFixed(2)}</div>
        </div>
        <div className="bg-gray-50 p-4 rounded-lg">
          <div className="text-sm text-gray-600">Monthly Limit</div>
          <div className="text-lg font-semibold text-gray-900">${card.monthlyLimit.toFixed(2)}</div>
        </div>
      </div>

      {/* Spending Summary */}
      <div className="mt-4 bg-blue-50 p-4 rounded-lg">
        <div className="text-sm text-blue-600">Total Spent</div>
        <div className="text-xl font-bold text-blue-900">${card.totalSpent.toFixed(2)}</div>
        <div className="text-xs text-blue-600 mt-1">
          {card.lastUsedAt ? `Last used: ${new Date(card.lastUsedAt).toLocaleDateString()}` : 'Never used'}
        </div>
      </div>

      <style jsx>{`
        .transform-style-preserve-3d {
          transform-style: preserve-3d;
        }
        .backface-hidden {
          backface-visibility: hidden;
        }
        .rotate-y-180 {
          transform: rotateY(180deg);
        }
      `}</style>
    </div>
  )
} 