# Alchemy Integration Setup Guide

## 🚀 Real-time Blockchain Transaction Monitoring

This guide will help you set up real-time transaction monitoring using Alchemy SDK for BSC (Binance Smart Chain).

## 📋 Prerequisites

1. Node.js 18+ installed
2. Supabase project set up
3. Alchemy account (free tier works)

## 🔧 Installation

### 1. Install Dependencies

```bash
npm install alchemy-sdk ws
npm install --save-dev @types/ws
```

### 2. Set up Environment Variables

Create a `.env.local` file and add the following:

```env
# Alchemy Configuration
ALCHEMY_API_KEY=your_alchemy_api_key_here
ALCHEMY_WEBHOOK_AUTH_TOKEN=your_alchemy_webhook_auth_token_here

# Existing environment variables
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
```

### 3. Database Migration

Run the following SQL in your Supabase SQL editor:

```sql
-- Create transactions table
CREATE TABLE public.transactions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  tx_hash character varying NOT NULL UNIQUE,
  from_address character varying NOT NULL,
  to_address character varying NOT NULL,
  amount numeric NOT NULL,
  token_address character varying,
  token_symbol character varying NOT NULL,
  token_decimals integer DEFAULT 18,
  network character varying NOT NULL DEFAULT 'BSC_MAINNET',
  type character varying NOT NULL CHECK (type IN ('deposit', 'withdraw')),
  status character varying NOT NULL DEFAULT 'confirmed' CHECK (status IN ('pending', 'confirmed', 'failed')),
  block_number bigint,
  gas_used numeric,
  gas_price numeric,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT transactions_pkey PRIMARY KEY (id),
  CONSTRAINT transactions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE
);

-- Create balances table
CREATE TABLE public.balances (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  token_symbol character varying NOT NULL,
  token_address character varying,
  amount numeric NOT NULL DEFAULT 0,
  network character varying NOT NULL DEFAULT 'BSC_MAINNET',
  last_updated timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT balances_pkey PRIMARY KEY (id),
  CONSTRAINT balances_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE,
  CONSTRAINT balances_user_token_network_unique UNIQUE (user_id, token_symbol, network)
);

-- Create indexes
CREATE INDEX idx_transactions_user_id ON public.transactions(user_id);
CREATE INDEX idx_transactions_tx_hash ON public.transactions(tx_hash);
CREATE INDEX idx_transactions_to_address ON public.transactions(to_address);
CREATE INDEX idx_transactions_created_at ON public.transactions(created_at DESC);
CREATE INDEX idx_balances_user_id ON public.balances(user_id);
CREATE INDEX idx_balances_user_token ON public.balances(user_id, token_symbol);

-- Enable RLS
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.balances ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own transactions" ON public.transactions
  FOR SELECT USING (auth.uid()::text = user_id::text);

CREATE POLICY "Service role can insert transactions" ON public.transactions
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can view their own balances" ON public.balances
  FOR SELECT USING (auth.uid()::text = user_id::text);

CREATE POLICY "Service role can manage balances" ON public.balances
  FOR ALL USING (true);
```

## 🌐 Alchemy Setup

### 1. Create Alchemy Account

1. Go to [Alchemy Dashboard](https://dashboard.alchemy.com/)
2. Sign up for a free account
3. Create a new app:
   - **Chain**: BNB Smart Chain
   - **Network**: BNB Smart Chain Mainnet

### 2. Get API Keys

1. Copy your API Key from the app dashboard
2. Add it to your `.env.local` file as `ALCHEMY_API_KEY`

### 3. Set up Webhooks (Optional)

For production use, set up webhooks in Alchemy dashboard:
1. Go to your app → Notify tab
2. Create a new webhook
3. Set the URL to: `https://your-domain.com/api/webhook/alchemy`
4. Select "Address Activity" notifications

## 🚀 Running the Application

### 1. Start the Development Server

```bash
npm run dev
```

### 2. Test the Integration

1. Create a new wallet using the `/create-wallet` page
2. Go to the dashboard to see the WalletDashboard component
3. The monitoring will automatically start
4. Send test tokens to your wallet address to see real-time updates

## 📊 Features

### Real-time Monitoring
- ✅ Automatic deposit detection
- ✅ ERC20 token support (USDT, BUSD, WETH, BNB)
- ✅ WebSocket-based real-time updates
- ✅ Transaction history tracking
- ✅ Balance updates

### Dashboard Features
- ✅ Real-time balance display
- ✅ Transaction history with explorer links
- ✅ Token breakdown
- ✅ Auto-refresh every 30 seconds

### API Endpoints
- `POST /api/monitor-wallet` - Start/stop monitoring
- `POST /api/get-balance` - Get wallet balances
- `GET /api/transactions` - Get transaction history
- `POST /api/transactions` - Get transaction summary

## 🔒 Security

- ✅ RLS policies on all tables
- ✅ Environment variables for sensitive data
- ✅ Encrypted private key storage
- ✅ User-specific data isolation

## 🛠 Troubleshooting

### Common Issues

1. **Alchemy WebSocket Connection Issues**
   - Check your API key
   - Ensure you're using the correct network (BSC Mainnet)
   - Check firewall settings

2. **Database Connection Issues**
   - Verify Supabase URL and keys
   - Check RLS policies
   - Ensure tables are created

3. **Transaction Not Showing**
   - Check if the transaction involves your wallet address
   - Verify token is in the supported list
   - Check Alchemy dashboard for API limits

### Logs

Check the browser console and server logs for detailed error messages:
- `Alchemy monitoring started successfully` - WebSocket connected
- `Processed deposit: X TOKEN to ADDRESS` - Transaction detected
- `Transaction already exists: HASH` - Duplicate prevention working

## 📈 Monitoring

The system will automatically:
1. Start monitoring when you visit the dashboard
2. Listen for ERC20 Transfer events
3. Check if transfers are to your wallet addresses
4. Save new transactions to the database
5. Update balances in real-time
6. Refresh the UI every 30 seconds

## 🎯 Supported Tokens

Currently monitoring these tokens on BSC:
- BNB (native token)
- USDT: `0x55d398326f99059fF775485246999027B3197955`
- BUSD: `0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56`
- WETH: `0x2170Ed0880ac9A755fd29B2688956BD959F933F8`

To add more tokens, update the `BSC_TOKENS` object in `/src/lib/alchemy-service.ts`.

## 🚦 Production Deployment

1. Set up proper environment variables
2. Configure Alchemy webhooks for better reliability
3. Implement proper error handling and retry logic
4. Set up monitoring and alerting
5. Consider using a message queue for high-volume transactions

## 💡 Next Steps

- Add support for more tokens
- Implement withdraw tracking
- Add email notifications for large deposits
- Create analytics dashboard
- Add support for multiple networks 