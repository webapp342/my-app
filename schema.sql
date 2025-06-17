-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

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
  CONSTRAINT users_pkey PRIMARY KEY (id)
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