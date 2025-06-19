// Virtual Card Generation and Validation Utilities

export interface VirtualCard {
  id: string;
  userId: string;
  walletId: string;
  cardNumber: string;
  cardHolderName: string;
  expiryMonth: number;
  expiryYear: number;
  cvv: string;
  cardType: 'VIRTUAL' | 'PHYSICAL';
  cardBrand: 'VISA' | 'MASTERCARD' | 'AMEX';
  status: 'ACTIVE' | 'BLOCKED' | 'EXPIRED' | 'CANCELLED';
  dailyLimit: number;
  monthlyLimit: number;
  totalSpent: number;
  createdAt: string;
  updatedAt: string;
  lastUsedAt?: string;
}

export interface VirtualCardTransaction {
  id: string;
  cardId: string;
  userId: string;
  transactionType: 'PURCHASE' | 'REFUND' | 'LOAD' | 'WITHDRAWAL';
  amount: number;
  currency: string;
  merchantName?: string;
  merchantCategory?: string;
  description?: string;
  status: 'PENDING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
  transactionDate: string;
  createdAt: string;
}

// Luhn Algorithm Implementation
export function luhnCheck(cardNumber: string): boolean {
  const digits = cardNumber.replace(/\D/g, '').split('').map(Number);
  let sum = 0;
  let isEven = false;

  for (let i = digits.length - 1; i >= 0; i--) {
    let digit = digits[i];

    if (isEven) {
      digit *= 2;
      if (digit > 9) {
        digit -= 9;
      }
    }

    sum += digit;
    isEven = !isEven;
  }

  return sum % 10 === 0;
}

// Generate Luhn-valid card number
export function generateLuhnValidCardNumber(
  prefix: string,
  length: number = 16
): string {
  let attempts = 0;
  const maxAttempts = 10;

  while (attempts < maxAttempts) {
    attempts++;

    // Generate random digits for the middle part
    const prefixLength = prefix.length;
    const randomDigitsCount = length - prefixLength - 1; // -1 for check digit

    let cardNumber = prefix;

    // Add random digits
    for (let i = 0; i < randomDigitsCount; i++) {
      cardNumber += Math.floor(Math.random() * 10).toString();
    }

    // Calculate check digit using proper Luhn algorithm
    const digits = cardNumber.split('').map(Number);
    let sum = 0;

    // Process from right to left (but we don't have check digit yet)
    // So we simulate as if check digit is 0, then calculate what it should be
    for (let i = digits.length - 1; i >= 0; i--) {
      let digit = digits[i];

      // Double every second digit from the right (check digit will be position 0 from right)
      // So position 1, 3, 5... from right should be doubled
      if ((digits.length - i) % 2 === 0) {
        digit *= 2;
        if (digit > 9) {
          digit -= 9;
        }
      }

      sum += digit;
    }

    // Calculate what check digit we need
    const checkDigit = (10 - (sum % 10)) % 10;
    const finalCardNumber = cardNumber + checkDigit.toString();

    // Verify it's actually valid
    if (luhnCheck(finalCardNumber)) {
      return finalCardNumber;
    }
  }

  // Fallback: use a known working method
  return generateLuhnValidCardNumberFallback(prefix, length);
}

// Fallback method - generate and test until we get a valid one
function generateLuhnValidCardNumberFallback(
  prefix: string,
  length: number = 16
): string {
  for (let attempt = 0; attempt < 100; attempt++) {
    let cardNumber = prefix;

    // Fill remaining digits randomly
    for (let i = prefix.length; i < length; i++) {
      cardNumber += Math.floor(Math.random() * 10).toString();
    }

    if (luhnCheck(cardNumber)) {
      return cardNumber;
    }
  }

  // This should never happen, but just in case
  throw new Error('Failed to generate valid card number after 100 attempts');
}

// Format card number with dashes
export function formatCardNumber(cardNumber: string): string {
  const cleaned = cardNumber.replace(/\D/g, '');
  return cleaned.replace(/(\d{4})(?=\d)/g, '$1-');
}

// Generate virtual card data
export function generateVirtualCard(
  userId: string,
  walletId: string,
  cardHolderName: string,
  cardBrand: 'VISA' | 'MASTERCARD' | 'AMEX' = 'VISA'
): Omit<VirtualCard, 'id' | 'createdAt' | 'updatedAt'> {
  // Card number prefixes for different brands
  const prefixes = {
    VISA: ['4532', '4556', '4716', '4929'],
    MASTERCARD: ['5425', '5555', '5105', '5205'],
    AMEX: ['3782', '3714', '3787'], // AMEX uses 15 digits
  };

  const cardLength = cardBrand === 'AMEX' ? 15 : 16;
  const prefix =
    prefixes[cardBrand][Math.floor(Math.random() * prefixes[cardBrand].length)];

  // Generate Luhn-valid card number
  const rawCardNumber = generateLuhnValidCardNumber(prefix, cardLength);
  const formattedCardNumber = formatCardNumber(rawCardNumber);

  // Verify Luhn validation
  if (!luhnCheck(rawCardNumber)) {
    console.error(`[VIRTUAL CARD] Generated invalid card: ${rawCardNumber}`);
  }

  // Generate expiry date (1-3 years from now)
  const currentDate = new Date();
  const expiryYear =
    currentDate.getFullYear() + Math.floor(Math.random() * 3) + 1;
  const expiryMonth = Math.floor(Math.random() * 12) + 1;

  // Generate CVV
  const cvvLength = cardBrand === 'AMEX' ? 4 : 3;
  const cvv = Math.floor(Math.random() * Math.pow(10, cvvLength))
    .toString()
    .padStart(cvvLength, '0');

  return {
    userId,
    walletId,
    cardNumber: formattedCardNumber,
    cardHolderName: cardHolderName.toUpperCase(),
    expiryMonth,
    expiryYear,
    cvv,
    cardType: 'VIRTUAL',
    cardBrand,
    status: 'ACTIVE',
    dailyLimit: 1000,
    monthlyLimit: 10000,
    totalSpent: 0,
  };
}

// Validate card expiry
export function isCardExpired(
  expiryMonth: number,
  expiryYear: number
): boolean {
  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth() + 1;

  if (expiryYear < currentYear) return true;
  if (expiryYear === currentYear && expiryMonth < currentMonth) return true;

  return false;
}

// Mask card number for display
export function maskCardNumber(cardNumber: string): string {
  const cleaned = cardNumber.replace(/\D/g, '');
  if (cleaned.length < 4) return cardNumber;

  const lastFour = cleaned.slice(-4);
  const masked = '*'.repeat(cleaned.length - 4) + lastFour;

  return formatCardNumber(masked);
}

// Get card brand from number
export function getCardBrand(
  cardNumber: string
): 'VISA' | 'MASTERCARD' | 'AMEX' | 'UNKNOWN' {
  const cleaned = cardNumber.replace(/\D/g, '');

  if (cleaned.startsWith('4')) return 'VISA';
  if (cleaned.startsWith('5') || cleaned.startsWith('2')) return 'MASTERCARD';
  if (cleaned.startsWith('3')) return 'AMEX';

  return 'UNKNOWN';
}

// Generate random merchant data for demo transactions
export const DEMO_MERCHANTS = [
  { name: 'Amazon', category: 'E-commerce' },
  { name: 'Starbucks', category: 'Food & Drink' },
  { name: 'Uber', category: 'Transportation' },
  { name: 'Netflix', category: 'Entertainment' },
  { name: 'Spotify', category: 'Entertainment' },
  { name: "McDonald's", category: 'Food & Drink' },
  { name: 'Shell', category: 'Gas Station' },
  { name: 'Target', category: 'Retail' },
  { name: 'Apple Store', category: 'Technology' },
  { name: 'Walmart', category: 'Retail' },
];

export function generateDemoTransaction(
  cardId: string,
  userId: string
): Omit<VirtualCardTransaction, 'id' | 'createdAt'> {
  const merchant =
    DEMO_MERCHANTS[Math.floor(Math.random() * DEMO_MERCHANTS.length)];
  const amount = Math.round((Math.random() * 200 + 5) * 100) / 100; // $5-$205

  return {
    cardId,
    userId,
    transactionType: 'PURCHASE',
    amount,
    currency: 'USD',
    merchantName: merchant.name,
    merchantCategory: merchant.category,
    description: `Purchase at ${merchant.name}`,
    status: Math.random() > 0.1 ? 'COMPLETED' : 'PENDING', // 90% completed
    transactionDate: new Date().toISOString(),
  };
}
