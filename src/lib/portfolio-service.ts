import { fetchTokenPrice } from './binance-price';

// BSCScan API endpoints (uses same format as Etherscan)
const BSCSCAN_API_URL = 'https://api.bscscan.com/api';
const BSCSCAN_API_KEY = process.env.BSCSCAN_API_KEY;

export interface TokenBalance {
  contractAddress: string;
  tokenName: string;
  tokenSymbol: string;
  tokenDecimal: string;
  balance: string;
  balanceFormatted: number;
  price: number;
  value: number;
  valueFormatted: string;
  change24h?: number;
}

export interface PortfolioData {
  address: string;
  netWorthUSD: number;
  netWorthBNB: number;
  totalChange24h: number;
  tokens: TokenBalance[];
  nativeBalance: {
    symbol: string;
    balance: number;
    value: number;
  };
  lastUpdated: string;
}

/**
 * Fetch all token balances for an address using BSCScan API
 * Format: https://api.bscscan.com/api?module=account&action=tokentx&address={address}&startblock=0&endblock=999999999&sort=desc&apikey={key}
 */
export async function fetchTokenBalances(
  address: string
): Promise<TokenBalance[]> {
  console.log(
    `[PORTFOLIO DEBUG] Starting fetchTokenBalances for address: ${address}`
  );

  if (!BSCSCAN_API_KEY) {
    console.error(
      '[PORTFOLIO DEBUG] BSCScan API key not found in environment variables'
    );
    throw new Error('BSCScan API key not configured');
  }

  console.log(
    `[PORTFOLIO DEBUG] Using BSCSCAN_API_KEY: ${BSCSCAN_API_KEY.substring(0, 8)}...`
  );

  try {
    // Get all ERC20 token transfer events to find unique tokens
    const apiUrl = `${BSCSCAN_API_URL}?module=account&action=tokentx&address=${address}&startblock=0&endblock=999999999&sort=desc&apikey=${BSCSCAN_API_KEY}`;
    console.log(
      `[PORTFOLIO DEBUG] Making API call to: ${apiUrl.replace(BSCSCAN_API_KEY, 'API_KEY_HIDDEN')}`
    );

    const response = await fetch(apiUrl);
    console.log(`[PORTFOLIO DEBUG] API Response status: ${response.status}`);

    if (!response.ok) {
      console.error(
        `[PORTFOLIO DEBUG] BSCScan API HTTP error: ${response.status} ${response.statusText}`
      );
      throw new Error(`BSCScan API error: ${response.status}`);
    }

    const data = await response.json();
    console.log(
      `[PORTFOLIO DEBUG] API Response data status: ${data.status}, message: ${data.message}`
    );

    if (data.status !== '1') {
      console.log(
        '[PORTFOLIO DEBUG] No token transactions found or API error:',
        data.message
      );
      return [];
    }

    console.log(
      `[PORTFOLIO DEBUG] Found ${data.result.length} token transactions`
    );

    // Get unique token contracts
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const uniqueTokens = new Map<string, any>();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    data.result.forEach((tx: any, index: number) => {
      if (index < 5) {
        // Log first 5 transactions for debug
        console.log(`[PORTFOLIO DEBUG] Transaction ${index}:`, {
          contractAddress: tx.contractAddress,
          tokenName: tx.tokenName,
          tokenSymbol: tx.tokenSymbol,
          tokenDecimal: tx.tokenDecimal,
        });
      }

      if (!uniqueTokens.has(tx.contractAddress)) {
        uniqueTokens.set(tx.contractAddress, {
          contractAddress: tx.contractAddress,
          tokenName: tx.tokenName,
          tokenSymbol: tx.tokenSymbol,
          tokenDecimal: tx.tokenDecimal,
        });
      }
    });

    console.log(`[PORTFOLIO DEBUG] Found ${uniqueTokens.size} unique tokens`);

    // Fetch current balance for each token
    const tokenBalances: TokenBalance[] = [];

    for (const token of uniqueTokens.values()) {
      try {
        console.log(
          `[PORTFOLIO DEBUG] Fetching balance for token: ${token.tokenSymbol} (${token.contractAddress})`
        );

        const balanceRaw = await fetchTokenBalanceRaw(
          address,
          token.contractAddress
        );
        console.log(
          `[PORTFOLIO DEBUG] Raw balance for ${token.tokenSymbol}: ${balanceRaw}`
        );

        if (parseFloat(balanceRaw) > 0) {
          // Convert using proper decimals
          const decimals = parseInt(token.tokenDecimal) || 18;
          const balance = parseFloat(balanceRaw) / Math.pow(10, decimals);

          console.log(
            `[PORTFOLIO DEBUG] Formatted balance for ${token.tokenSymbol}: ${balance} (decimals: ${decimals})`
          );

          const price = await fetchTokenPrice(token.tokenSymbol, 'BSC_MAINNET');
          const value = balance * price;

          console.log(
            `[PORTFOLIO DEBUG] Price for ${token.tokenSymbol}: $${price}, Value: $${value}`
          );

          tokenBalances.push({
            contractAddress: token.contractAddress,
            tokenName: token.tokenName,
            tokenSymbol: token.tokenSymbol,
            tokenDecimal: token.tokenDecimal,
            balance: balanceRaw,
            balanceFormatted: balance,
            price,
            value,
            valueFormatted: formatUSDValue(value),
          });
        }
      } catch (error) {
        console.error(
          `[PORTFOLIO DEBUG] Error fetching balance for ${token.tokenSymbol}:`,
          error
        );
      }
    }

    console.log(
      `[PORTFOLIO DEBUG] Final token balances count: ${tokenBalances.length}`
    );
    return tokenBalances.sort((a, b) => b.value - a.value);
  } catch (error) {
    console.error('[PORTFOLIO DEBUG] Error in fetchTokenBalances:', error);
    throw error;
  }
}

/**
 * Fetch raw balance for a specific token contract
 * Format: https://api.bscscan.com/api?module=account&action=tokenbalance&contractaddress={contract}&address={address}&tag=latest&apikey={key}
 */
async function fetchTokenBalanceRaw(
  address: string,
  contractAddress: string
): Promise<string> {
  if (!BSCSCAN_API_KEY) {
    throw new Error('BSCScan API key not configured');
  }

  try {
    const apiUrl = `${BSCSCAN_API_URL}?module=account&action=tokenbalance&contractaddress=${contractAddress}&address=${address}&tag=latest&apikey=${BSCSCAN_API_KEY}`;
    console.log(
      `[PORTFOLIO DEBUG] Token balance API call: ${apiUrl.replace(BSCSCAN_API_KEY, 'API_KEY_HIDDEN')}`
    );

    const response = await fetch(apiUrl);
    console.log(
      `[PORTFOLIO DEBUG] Token balance response status: ${response.status}`
    );

    if (!response.ok) {
      console.error(
        `[PORTFOLIO DEBUG] Token balance API error: ${response.status} ${response.statusText}`
      );
      throw new Error(`BSCScan API error: ${response.status}`);
    }

    const data = await response.json();
    console.log(`[PORTFOLIO DEBUG] Token balance response:`, data);

    if (data.status !== '1') {
      console.log(
        `[PORTFOLIO DEBUG] Token balance API returned status: ${data.status}, message: ${data.message}`
      );
      return '0';
    }

    // Return raw balance, will be converted using proper decimals in caller
    return data.result;
  } catch (error) {
    console.error('[PORTFOLIO DEBUG] Error fetching token balance:', error);
    return '0';
  }
}

/**
 * Get complete portfolio data
 */
export async function getPortfolioData(
  address: string
): Promise<PortfolioData> {
  try {
    console.log(
      `[PORTFOLIO DEBUG] Fetching complete portfolio for address: ${address}`
    );

    // Fetch native BNB balance directly using blockchain service
    console.log('[PORTFOLIO DEBUG] Fetching BNB balance...');
    const { getWalletBalance } = await import('./blockchain');
    const { calculateUSDTValue, getNativeCurrencySymbol } = await import(
      './binance-price'
    );

    const balanceData = await getWalletBalance(address, 'BSC_MAINNET');
    const tokenSymbol = getNativeCurrencySymbol('BSC_MAINNET');
    const usdtData = await calculateUSDTValue(
      balanceData.balanceFormatted,
      tokenSymbol,
      'BSC_MAINNET'
    );

    console.log('[PORTFOLIO DEBUG] BNB balance data:', {
      balanceData,
      usdtData,
    });

    const nativeBalance = {
      symbol: 'BNB',
      balance: parseFloat(balanceData.balanceFormatted),
      value: usdtData.usdtValue,
    };

    console.log('[PORTFOLIO DEBUG] Native balance:', nativeBalance);

    // Fetch all token balances
    console.log('[PORTFOLIO DEBUG] Fetching token balances...');
    const tokens = await fetchTokenBalances(address);

    // Calculate total portfolio value
    const totalTokenValue = tokens.reduce((sum, token) => sum + token.value, 0);
    const netWorthUSD = nativeBalance.value + totalTokenValue;

    console.log(`[PORTFOLIO DEBUG] Total token value: $${totalTokenValue}`);
    console.log(`[PORTFOLIO DEBUG] Net worth USD: $${netWorthUSD}`);

    // Calculate BNB equivalent
    const bnbPrice = await fetchTokenPrice('BNB', 'BSC_MAINNET');
    const netWorthBNB = netWorthUSD / bnbPrice;

    console.log(`[PORTFOLIO DEBUG] BNB price: $${bnbPrice}`);
    console.log(`[PORTFOLIO DEBUG] Net worth BNB: ${netWorthBNB}`);

    // For now, set 24h change to 0 (would need historical data)
    const totalChange24h = 0;

    const portfolioData = {
      address,
      netWorthUSD,
      netWorthBNB,
      totalChange24h,
      tokens,
      nativeBalance,
      lastUpdated: new Date().toISOString(),
    };

    console.log('[PORTFOLIO DEBUG] Final portfolio data:', portfolioData);
    return portfolioData;
  } catch (error) {
    console.error('[PORTFOLIO DEBUG] Error in getPortfolioData:', error);
    throw error;
  }
}

/**
 * Format USD value for display
 */
function formatUSDValue(value: number): string {
  if (value === 0) return '$0.00';

  if (value < 0.01) {
    return `$${value.toFixed(6)}`;
  } else if (value < 1) {
    return `$${value.toFixed(4)}`;
  } else if (value < 1000) {
    return `$${value.toFixed(2)}`;
  } else if (value < 1000000) {
    return `$${(value / 1000).toFixed(2)}K`;
  } else {
    return `$${(value / 1000000).toFixed(2)}M`;
  }
}

/**
 * Get popular BSC token contracts for reference
 */
export const POPULAR_BSC_TOKENS = {
  BUSD: '0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56',
  USDT: '0x55d398326f99059fF775485246999027B3197955',
  USDC: '0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d',
  CAKE: '0x0E09FaBB73Bd3Ade0a17ECC321fD13a19e81cE82',
  ADA: '0x3EE2200Efb3400fAbB9AacF31297cBdD1d435D47',
  DOT: '0x7083609fCE4d1d8Dc0C979AAb8c869Ea2C873402',
  LINK: '0xF8A0BF9cF54Bb92F17374d9e9A321E6a111a51bD',
  UNI: '0xBf5140A22578168FD562DCcF235E5D43A02ce9B1',
  AAVE: '0xfb6115445Bff7b52FeB98650C87f44907E58f802',
};
