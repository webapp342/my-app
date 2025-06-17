# Transaction Explorer Documentation

## Overview

The Transaction Explorer is a comprehensive blockchain transaction analysis tool built with Next.js 14, TypeScript, and ethers.js v6. It provides real-time transaction categorization and detailed insights for Ethereum and BSC addresses.

## Features

### ✅ Implemented Features

- **Real-time Transaction Fetching**: Direct integration with Etherscan and BSCScan APIs
- **Smart Categorization**: Automatically categorizes transactions as deposits, withdrawals, or token transfers
- **ERC20 Token Detection**: Identifies and displays token transfers with proper symbol and amount formatting
- **Multi-network Support**: Works with both Ethereum and BSC networks
- **Responsive UI**: Clean, professional interface built with TailwindCSS
- **Pagination**: Efficient loading with "Load More" functionality
- **Explorer Links**: Direct links to blockchain explorers for transaction details
- **Error Handling**: Comprehensive error handling with user-friendly messages
- **Address Validation**: Client and server-side address validation

### 🔧 Technical Implementation

#### API Architecture

**`/api/transactions` Route**
- Accepts query parameters: `address`, `network`, `page`, `limit`
- Validates address format using ethers.js
- Implements rate limiting and error handling
- Returns paginated transaction data with metadata

#### Transaction Service (`/src/lib/transaction-service.ts`)

**Core Functions:**
- `fetchTransactionHistory()`: Main function to fetch and categorize transactions
- `fetchTransactionsDirectly()`: Direct API calls to Etherscan/BSCScan
- `fetchTokenTransfers()`: ERC20 token transfer detection
- `categorizeTransactions()`: Smart transaction categorization
- `detectNetwork()`: Automatic network detection
- `isValidAddress()`: Address validation

**Transaction Categorization Logic:**
1. **Deposits**: Transactions where `to` address matches user address
2. **Withdrawals**: Transactions where `from` address matches user address  
3. **Token Transfers**: ERC20 transfers detected from API token endpoint

#### React Components

**TransactionExplorer Component**
- Fetches data from API with pagination
- Displays transactions in responsive table format
- Handles loading states and error conditions
- Implements "Load More" functionality
- Formats dates, addresses, and amounts for display

**Transaction Explorer Page**
- Search form with address input and network selection
- URL state management for bookmarkable searches
- Feature showcase and information cards
- Responsive layout for mobile and desktop

## API Reference

### GET `/api/transactions`

Fetches and categorizes blockchain transactions for a given address.

**Query Parameters:**
- `address` (required): Ethereum or BSC wallet address
- `network` (optional): 'ethereum' or 'bsc' - auto-detected if not provided
- `page` (optional): Page number for pagination (default: 1)
- `limit` (optional): Number of transactions per page (default: 20, max: 100)

**Response Format:**
```json
{
  "transactions": [
    {
      "hash": "string",
      "timestamp": "string (ISO)",
      "from": "string",
      "to": "string", 
      "value": "string (formatted)",
      "type": "deposit | withdraw | token_transfer",
      "tokenSymbol": "string (optional)",
      "tokenAmount": "string (optional)",
      "blockNumber": number,
      "network": "ethereum | bsc"
    }
  ],
  "total": number,
  "page": number,
  "limit": number,
  "hasMore": boolean,
  "network": "ethereum | bsc"
}
```

**Error Responses:**
- `400`: Invalid address format or parameters
- `429`: API rate limit exceeded
- `500`: Server error or API configuration issues

## Environment Variables

Add these to your `.env.local` file:

```env
# Required for transaction explorer
ETHERSCAN_API_KEY=your_etherscan_api_key
BSCSCAN_API_KEY=your_bscscan_api_key

# Optional: Custom RPC endpoints
ETHEREUM_RPC_URL=https://rpc.ankr.com/eth
BSC_RPC_URL=https://bsc-dataseed.binance.org/
```

### Getting API Keys

1. **Etherscan API Key**:
   - Visit [etherscan.io/apis](https://etherscan.io/apis)
   - Create free account
   - Generate API key

2. **BSCScan API Key**:
   - Visit [bscscan.com/apis](https://bscscan.com/apis)  
   - Create free account
   - Generate API key

## Usage Examples

### Basic Transaction Lookup

```typescript
// Fetch transactions for an address
const response = await fetch('/api/transactions?address=0x742d35cc...')
const data = await response.json()

console.log(data.transactions) // Array of categorized transactions
```

### With Network and Pagination

```typescript
// Fetch BSC transactions with pagination
const response = await fetch('/api/transactions?address=0x742d35cc...&network=bsc&page=2&limit=50')
const data = await response.json()
```

### Component Usage

```tsx
import TransactionExplorer from '@/components/TransactionExplorer'

function MyComponent() {
  return (
    <TransactionExplorer 
      address="0x742d35cc6491c59bc79a40d9a0e86b1e54a9d4b8"
      network="ethereum"
    />
  )
}
```

## Data Flow

1. **User Input**: User enters wallet address and selects network
2. **Validation**: Client-side validation using ethers.js
3. **API Request**: Fetch request to `/api/transactions` endpoint
4. **Data Fetching**: Server fetches from Etherscan/BSCScan APIs
5. **Processing**: Categorize transactions and token transfers
6. **Response**: Return formatted transaction data
7. **Display**: Render in responsive table with pagination

## Performance Optimizations

- **API Call Minimization**: Single request fetches both transactions and token transfers
- **Pagination**: Limits data per request to prevent large payloads
- **Error Handling**: Graceful degradation with informative error messages
- **Caching**: Browser caching of API responses
- **Debouncing**: Input validation debouncing for better UX

## Security Considerations

- **API Key Protection**: Server-side only API key usage
- **Input Validation**: Multiple layers of address validation
- **Rate Limiting**: Built-in handling for API rate limits
- **Error Sanitization**: No sensitive data in error messages
- **CORS Configuration**: Proper CORS headers for API endpoints

## Browser Support

- **Modern Browsers**: Chrome 90+, Firefox 88+, Safari 14+
- **Mobile**: iOS Safari 14+, Chrome Mobile 90+
- **Features**: ES2020, Web APIs, CSS Grid, Flexbox

## Testing

### Manual Testing Checklist

- [ ] Valid Ethereum address search
- [ ] Valid BSC address search  
- [ ] Invalid address handling
- [ ] Empty result handling
- [ ] Pagination functionality
- [ ] Network switching
- [ ] Mobile responsiveness
- [ ] Error state display
- [ ] Explorer link functionality

### Test Addresses

**Ethereum (with activity):**
- `0x742d35cc6491c59bc79a40d9a0e86b1e54a9d4b8` (DEX trader)
- `0x8ba1f109551bd432803012645hac136c5ca5d8fe` (Exchange wallet)

**BSC (with activity):**
- `0x8894e0a0c962cb723c1976a4421c95949be2d4e3` (PancakeSwap router)

## Troubleshooting

### Common Issues

1. **"API key not configured"**
   - Add ETHERSCAN_API_KEY or BSCSCAN_API_KEY to .env.local

2. **"No transactions found"**
   - Address may be valid but have no transaction history
   - Try a different address with known activity

3. **"Rate limit exceeded"**
   - Wait a few minutes before making more requests
   - Consider upgrading to paid API plan for higher limits

4. **Network detection issues**
   - Explicitly specify network parameter
   - Check address format (should be valid Ethereum address)

### Debug Mode

Enable debug logging by setting in browser console:
```javascript
localStorage.setItem('debug', 'transactions:*')
```

## Future Enhancements

- [ ] Transaction filtering by type, date, amount
- [ ] Export functionality (CSV, JSON)
- [ ] Real-time transaction monitoring
- [ ] Portfolio value tracking
- [ ] DeFi protocol detection
- [ ] NFT transfer detection
- [ ] Multi-address portfolio view
- [ ] Transaction analytics and insights 