-- Add transaction_password column to users table
ALTER TABLE public.users 
ADD COLUMN transaction_password character varying;

-- Add comment for documentation
COMMENT ON COLUMN public.users.transaction_password IS 'Password used for transaction verification during purchases and transfers';

-- This approach is better because:
-- 1. One password per user (not per wallet)
-- 2. User can have multiple wallets but same transaction password
-- 3. Easier to manage and remember 