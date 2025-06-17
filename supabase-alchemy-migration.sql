-- Migration for Alchemy integration
-- Add transactions and balances tables

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

-- Create indexes for better query performance
CREATE INDEX idx_transactions_user_id ON public.transactions(user_id);
CREATE INDEX idx_transactions_tx_hash ON public.transactions(tx_hash);
CREATE INDEX idx_transactions_to_address ON public.transactions(to_address);
CREATE INDEX idx_transactions_created_at ON public.transactions(created_at DESC);
CREATE INDEX idx_balances_user_id ON public.balances(user_id);
CREATE INDEX idx_balances_user_token ON public.balances(user_id, token_symbol);

-- Create RLS policies
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.balances ENABLE ROW LEVEL SECURITY;

-- Transactions policies
CREATE POLICY "Users can view their own transactions" ON public.transactions
  FOR SELECT USING (auth.uid()::text = user_id::text);

CREATE POLICY "Service role can insert transactions" ON public.transactions
  FOR INSERT WITH CHECK (true);

-- Balances policies  
CREATE POLICY "Users can view their own balances" ON public.balances
  FOR SELECT USING (auth.uid()::text = user_id::text);

CREATE POLICY "Service role can manage balances" ON public.balances
  FOR ALL USING (true); 