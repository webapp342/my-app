-- Add constraint to wallets table for network values
-- Bu kodu Supabase SQL Editor'da çalıştırın

-- Önce mevcut geçersiz değerleri kontrol edin
SELECT DISTINCT network FROM public.wallets;

-- Network kolonu için constraint ekleyin (sadece belirli değerlere izin ver)
ALTER TABLE public.wallets 
ADD CONSTRAINT wallets_network_check 
CHECK (network IN ('BSC_MAINNET', 'BSC_TESTNET', 'ETHEREUM', 'POLYGON', 'ARBITRUM'));

-- Index'i güncelleyin (performans için)
DROP INDEX IF EXISTS idx_wallets_network;
CREATE INDEX idx_wallets_network ON public.wallets(network);

-- Network değeri için comment ekleyin
COMMENT ON COLUMN public.wallets.network IS 'Blockchain network: BSC_MAINNET, BSC_TESTNET, ETHEREUM, POLYGON, ARBITRUM';

-- Eğer mevcut verileriniz varsa ve constraint hatası alırsanız, önce veriyi temizleyin:
-- UPDATE public.wallets SET network = 'BSC_MAINNET' WHERE network NOT IN ('BSC_MAINNET', 'BSC_TESTNET', 'ETHEREUM', 'POLYGON', 'ARBITRUM'); 