-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

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
  CONSTRAINT wallets_pkey PRIMARY KEY (id),
  CONSTRAINT wallets_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);