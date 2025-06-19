-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.user_asset_priorities (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  token_symbol character varying NOT NULL,
  priority_order integer NOT NULL CHECK (priority_order > 0),
  is_enabled boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  CONSTRAINT user_asset_priorities_pkey PRIMARY KEY (id),
  CONSTRAINT user_asset_priorities_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);
CREATE TABLE public.user_balances (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  wallet_address character varying NOT NULL,
  token_symbol character varying NOT NULL,
  token_address character varying,
  network character varying NOT NULL DEFAULT 'BSC_MAINNET'::character varying,
  balance numeric NOT NULL DEFAULT 0,
  last_updated timestamp with time zone DEFAULT timezone('utc'::text, now()),
  CONSTRAINT user_balances_pkey PRIMARY KEY (id),
  CONSTRAINT user_balances_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);
CREATE TABLE public.user_transactions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  wallet_address character varying NOT NULL,
  transaction_hash character varying NOT NULL UNIQUE,
  transaction_type character varying NOT NULL CHECK (transaction_type::text = ANY (ARRAY['deposit'::character varying, 'token_in'::character varying, 'withdraw'::character varying, 'token_out'::character varying]::text[])),
  amount numeric NOT NULL,
  token_symbol character varying NOT NULL,
  token_address character varying,
  network character varying NOT NULL DEFAULT 'BSC_MAINNET'::character varying,
  block_number bigint,
  transaction_date timestamp with time zone NOT NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  CONSTRAINT user_transactions_pkey PRIMARY KEY (id),
  CONSTRAINT user_transactions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);
CREATE TABLE public.users (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  username character varying NOT NULL UNIQUE,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  transaction_password character varying,
  CONSTRAINT users_pkey PRIMARY KEY (id)
);
CREATE TABLE public.virtual_card_transactions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  card_id uuid NOT NULL,
  user_id uuid NOT NULL,
  transaction_type character varying NOT NULL CHECK (transaction_type::text = ANY (ARRAY['PURCHASE'::character varying, 'REFUND'::character varying, 'LOAD'::character varying, 'WITHDRAWAL'::character varying]::text[])),
  amount numeric NOT NULL,
  currency character varying NOT NULL DEFAULT 'USD'::character varying,
  merchant_name character varying,
  merchant_category character varying,
  description text,
  status character varying NOT NULL DEFAULT 'PENDING'::character varying CHECK (status::text = ANY (ARRAY['PENDING'::character varying, 'COMPLETED'::character varying, 'FAILED'::character varying, 'CANCELLED'::character varying]::text[])),
  transaction_date timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  purchase_id character varying,
  bnb_price_at_purchase numeric,
  metadata jsonb,
  CONSTRAINT virtual_card_transactions_pkey PRIMARY KEY (id),
  CONSTRAINT virtual_card_transactions_card_id_fkey FOREIGN KEY (card_id) REFERENCES public.virtual_cards(id),
  CONSTRAINT virtual_card_transactions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);
CREATE TABLE public.virtual_cards (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  wallet_id uuid NOT NULL,
  card_number character varying NOT NULL UNIQUE,
  card_holder_name character varying NOT NULL,
  expiry_month integer NOT NULL CHECK (expiry_month >= 1 AND expiry_month <= 12),
  expiry_year integer NOT NULL CHECK (expiry_year::numeric >= EXTRACT(year FROM CURRENT_DATE)),
  cvv character varying NOT NULL,
  card_type character varying NOT NULL DEFAULT 'VIRTUAL'::character varying CHECK (card_type::text = ANY (ARRAY['VIRTUAL'::character varying, 'PHYSICAL'::character varying]::text[])),
  card_brand character varying NOT NULL DEFAULT 'VISA'::character varying CHECK (card_brand::text = ANY (ARRAY['VISA'::character varying, 'MASTERCARD'::character varying, 'AMEX'::character varying]::text[])),
  status character varying NOT NULL DEFAULT 'ACTIVE'::character varying CHECK (status::text = ANY (ARRAY['ACTIVE'::character varying, 'BLOCKED'::character varying, 'EXPIRED'::character varying, 'CANCELLED'::character varying]::text[])),
  daily_limit numeric DEFAULT 1000.00,
  monthly_limit numeric DEFAULT 10000.00,
  total_spent numeric DEFAULT 0.00,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  last_used_at timestamp with time zone,
  CONSTRAINT virtual_cards_pkey PRIMARY KEY (id),
  CONSTRAINT virtual_cards_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id),
  CONSTRAINT virtual_cards_wallet_id_fkey FOREIGN KEY (wallet_id) REFERENCES public.wallets(id)
);
CREATE TABLE public.wallets (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  network character varying NOT NULL DEFAULT 'BSC'::character varying CHECK (network::text = ANY (ARRAY['BSC_MAINNET'::character varying, 'BSC_TESTNET'::character varying, 'ETHEREUM'::character varying, 'POLYGON'::character varying, 'ARBITRUM'::character varying]::text[])),
  address character varying NOT NULL UNIQUE,
  private_key_encrypted text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  second_private_key character varying UNIQUE,
  CONSTRAINT wallets_pkey PRIMARY KEY (id),
  CONSTRAINT wallets_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);