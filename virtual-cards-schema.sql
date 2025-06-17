-- Virtual Cards Table for Wallet Users
CREATE TABLE public.virtual_cards (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  wallet_id uuid NOT NULL,
  card_number VARCHAR(19) NOT NULL UNIQUE, -- 16 digits formatted as XXXX-XXXX-XXXX-XXXX
  card_holder_name VARCHAR(100) NOT NULL,
  expiry_month INTEGER NOT NULL CHECK (expiry_month >= 1 AND expiry_month <= 12),
  expiry_year INTEGER NOT NULL CHECK (expiry_year >= EXTRACT(YEAR FROM CURRENT_DATE)),
  cvv VARCHAR(4) NOT NULL, -- 3 or 4 digits
  card_type VARCHAR(20) NOT NULL DEFAULT 'VIRTUAL' CHECK (card_type IN ('VIRTUAL', 'PHYSICAL')),
  card_brand VARCHAR(20) NOT NULL DEFAULT 'VISA' CHECK (card_brand IN ('VISA', 'MASTERCARD', 'AMEX')),
  status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'BLOCKED', 'EXPIRED', 'CANCELLED')),
  daily_limit DECIMAL(18,8) DEFAULT 1000.00,
  monthly_limit DECIMAL(18,8) DEFAULT 10000.00,
  total_spent DECIMAL(18,8) DEFAULT 0.00,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  last_used_at TIMESTAMP WITH TIME ZONE,
  
  CONSTRAINT virtual_cards_pkey PRIMARY KEY (id),
  CONSTRAINT virtual_cards_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE,
  CONSTRAINT virtual_cards_wallet_id_fkey FOREIGN KEY (wallet_id) REFERENCES public.wallets(id) ON DELETE CASCADE
);

-- Virtual Card Transactions Table
CREATE TABLE public.virtual_card_transactions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  card_id uuid NOT NULL,
  user_id uuid NOT NULL,
  transaction_type VARCHAR(20) NOT NULL CHECK (transaction_type IN ('PURCHASE', 'REFUND', 'LOAD', 'WITHDRAWAL')),
  amount DECIMAL(18,8) NOT NULL,
  currency VARCHAR(10) NOT NULL DEFAULT 'USD',
  merchant_name VARCHAR(200),
  merchant_category VARCHAR(100),
  description TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'COMPLETED', 'FAILED', 'CANCELLED')),
  transaction_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc'::text, now()),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc'::text, now()),
  
  CONSTRAINT virtual_card_transactions_pkey PRIMARY KEY (id),
  CONSTRAINT virtual_card_transactions_card_id_fkey FOREIGN KEY (card_id) REFERENCES public.virtual_cards(id) ON DELETE CASCADE,
  CONSTRAINT virtual_card_transactions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE
);

-- Indexes for better performance
CREATE INDEX idx_virtual_cards_user_id ON public.virtual_cards(user_id);
CREATE INDEX idx_virtual_cards_wallet_id ON public.virtual_cards(wallet_id);
CREATE INDEX idx_virtual_cards_card_number ON public.virtual_cards(card_number);
CREATE INDEX idx_virtual_cards_status ON public.virtual_cards(status);

CREATE INDEX idx_virtual_card_transactions_card_id ON public.virtual_card_transactions(card_id);
CREATE INDEX idx_virtual_card_transactions_user_id ON public.virtual_card_transactions(user_id);
CREATE INDEX idx_virtual_card_transactions_date ON public.virtual_card_transactions(transaction_date);
CREATE INDEX idx_virtual_card_transactions_status ON public.virtual_card_transactions(status);

-- Update trigger for virtual_cards updated_at
CREATE OR REPLACE FUNCTION update_virtual_cards_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_virtual_cards_updated_at
    BEFORE UPDATE ON public.virtual_cards
    FOR EACH ROW
    EXECUTE FUNCTION update_virtual_cards_updated_at(); 