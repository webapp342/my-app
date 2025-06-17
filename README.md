# Web3 Wallet App

A secure, minimal, production-ready Next.js 14 Web3 wallet simulation application using Supabase and Ethers.js v6.

## 🚀 Features

### Wallet Management
- **Create New Wallet**: Generate BSC-compatible wallets using Ethers.js v6
- **Import Existing Wallet**: Import wallets using private keys
- **Real Blockchain Balance**: Fetch actual balance from BSC/Ethereum networks
- **Multiple Networks**: Support for BSC Mainnet, BSC Testnet, and Ethereum
- **Secure Storage**: Encoded private key storage in Supabase PostgreSQL

### Transaction Explorer
- **Real-time Transaction Fetching**: Direct integration with Etherscan and BSCScan APIs
- **Smart Categorization**: Automatically categorizes transactions as deposits, withdrawals, or token transfers
- **ERC20 Token Detection**: Identifies and displays token transfers with proper symbol and amount formatting
- **Explorer Links**: Direct links to blockchain explorers for transaction details
- **Pagination**: Efficient loading with "Load More" functionality

### Technical Features
- **Modern UI**: Beautiful, responsive design with Tailwind CSS
- **TypeScript**: Full type safety throughout the application
- **Error Handling**: Comprehensive error handling with user-friendly messages
- **Address Validation**: Client and server-side address validation
- **Logout Functionality**: Secure session management

## 🛠 Technology Stack

- **Next.js 14** (App Router)
- **TypeScript** for type safety
- **Tailwind CSS** for styling
- **Supabase** for database and authentication
- **Ethers.js v6** for Web3 wallet operations
- **bcrypt** for password hashing

## 📋 Prerequisites

- Node.js 18+ 
- A Supabase account and project
- BSC RPC endpoint (included: `https://bsc-dataseed.binance.org/`)

## ⚙️ Setup Instructions

### 1. Environment Variables

Create a `.env.local` file in the root directory:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Blockchain Network Configuration
BSC_RPC_URL=https://bsc-dataseed.binance.org/
BSC_TESTNET_RPC_URL=https://data-seed-prebsc-1-s1.binance.org:8545/
ETHEREUM_RPC_URL=https://rpc.ankr.com/eth

# Transaction Explorer API Keys
ETHERSCAN_API_KEY=your_etherscan_api_key
BSCSCAN_API_KEY=your_bscscan_api_key
```

### 2. Database Setup

1. Go to your Supabase project dashboard
2. Navigate to the SQL editor
3. Run the migration script in `supabase-migration.sql`

### 3. Install Dependencies

```bash
npm install
```

### 4. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the application.

## 📊 Database Schema

### Users Table
```sql
CREATE TABLE public.users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(255) UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
```

### Wallets Table
```sql
CREATE TABLE public.wallets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    network VARCHAR(50) DEFAULT 'BSC_MAINNET',
    address VARCHAR(42) UNIQUE NOT NULL,
    private_key TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
```

## 🔐 Security Features

### Current Implementation (Demo)
- Basic Base64 encoding for private key storage
- Password validation and confirmation
- Input sanitization and validation
- Error handling for invalid private keys

### Production Recommendations
- **AES Encryption**: Implement proper AES-256 encryption for private keys
- **Key Derivation**: Use PBKDF2 or Argon2 for key derivation
- **Hardware Security**: Consider hardware security modules (HSMs)
- **Multi-factor Authentication**: Add 2FA for wallet access
- **Rate Limiting**: Implement API rate limiting
- **Audit Logging**: Log all wallet operations

## 🎯 Application Flows

### 1. Create Wallet Flow
1. User enters username and password
2. System generates random wallet using `ethers.Wallet.createRandom()`
3. **Real balance is fetched from blockchain** using the network provider
4. Private key is encoded and stored in database
5. User receives wallet address, private key, and real balance with security warnings

### 2. Import Wallet Flow
1. User enters private key
2. System reconstructs wallet using `new ethers.Wallet(privateKey)`
3. System verifies wallet exists in database
4. **Real balance is fetched from blockchain** for the imported wallet
5. User is redirected to dashboard with live balance data

## 🔧 API Endpoints

### POST /api/create-wallet
Creates a new BSC wallet for a user.

**Request Body:**
```json
{
  "username": "string",
  "password": "string"
}
```

**Response:**
```json
{
  "address": "string",
  "privateKey": "string",
  "username": "string",
  "message": "string"
}
```

### POST /api/import-wallet
Imports an existing wallet using private key.

**Request Body:**
```json
{
  "privateKey": "string"
}
```

**Response:**
```json
{
  "address": "string",
  "username": "string",
  "network": "string",
  "balanceFormatted": "string",
  "symbol": "string",
  "message": "string"
}
```

### GET /api/get-balance
Fetches real-time balance from blockchain.

**Query Parameters:**
- `address`: Wallet address
- `network`: Network type (BSC_MAINNET, BSC_TESTNET, ETHEREUM)

**Response:**
```json
{
  "address": "string",
  "balance": "string",
  "balanceFormatted": "string",
  "symbol": "string",
  "network": "string",
  "timestamp": "string"
}
```

## ⚠️ Security Warnings

🚨 **CRITICAL WARNINGS FOR PRODUCTION:**

1. **Private Key Storage**: This demo uses basic encoding. In production, implement proper AES encryption.
2. **Key Management**: Never store private keys in plain text or logs.
3. **Environment Variables**: Keep all sensitive data in environment variables.
4. **Database Security**: Use proper database security and access controls.
5. **HTTPS Only**: Always use HTTPS in production.
6. **Regular Audits**: Conduct regular security audits and penetration testing.

## 🧪 Demo Features

This demonstration application includes:
- **Real blockchain balance fetching** from BSC and Ethereum networks
- Private keys are encoded (not encrypted) for demo purposes
- Support for multiple networks (BSC Mainnet, BSC Testnet, Ethereum)
- Simplified error handling for educational purposes
- Basic validation without advanced security measures
- No polling - balance fetched only on wallet creation/import

## 📝 License

MIT License - see LICENSE file for details.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📞 Support

For questions or issues, please open a GitHub issue or contact the development team.
