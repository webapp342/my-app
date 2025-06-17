-- Add transaction_password column to wallets table
ALTER TABLE public.wallets 
ADD COLUMN transaction_password character varying;

-- Add comment for documentation
COMMENT ON COLUMN public.wallets.transaction_password IS 'Password used for transaction verification during purchases';

-- Update existing wallets with a default password (optional - can be NULL)
-- UPDATE public.wallets SET transaction_password = 'defaultpass' WHERE transaction_password IS NULL; 