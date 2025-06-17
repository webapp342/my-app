-- Add 'internal_transaction' to the allowed transaction types
ALTER TABLE public.user_transactions 
DROP CONSTRAINT user_transactions_transaction_type_check;

ALTER TABLE public.user_transactions 
ADD CONSTRAINT user_transactions_transaction_type_check 
CHECK (transaction_type::text = ANY (ARRAY[
  'deposit'::character varying, 
  'token_in'::character varying, 
  'withdraw'::character varying, 
  'token_out'::character varying,
  'internal_transaction'::character varying
]::text[])); 