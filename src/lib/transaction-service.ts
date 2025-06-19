import { ethers } from 'ethers';
import {
  Transaction,
  RawTransaction,
  TokenTransfer,
  NetworkConfig,
} from '@/types/transaction';

// Network configurations with explorer API details
const NETWORKS: Record<string, NetworkConfig> = {
  ethereum: {
    name: 'Ethereum Mainnet',
    chainId: 1,
    nativeCurrency: 'ETH',
    explorerUrl: 'https://etherscan.io',
    apiKey: process.env.ETHERSCAN_API_KEY || '',
  },
  bsc: {
    name: 'BSC Mainnet',
    chainId: 56,
    nativeCurrency: 'BNB',
    explorerUrl: 'https://bscscan.com',
    apiKey: process.env.BSCSCAN_API_KEY || '',
  },
};

// ERC20 Transfer event signature (currently unused but kept for future features)
// const ERC20_TRANSFER_TOPIC = '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef'

/**
 * Detects network based on address characteristics or explicit network parameter
 */
export function detectNetwork(
  address: string,
  networkParam?: string
): 'ethereum' | 'bsc' {
  if (networkParam && ['ethereum', 'bsc'].includes(networkParam)) {
    return networkParam as 'ethereum' | 'bsc';
  }

  // BSC_MAINNET maps to bsc
  if (networkParam === 'BSC_MAINNET' || networkParam === 'BSC') {
    return 'bsc';
  }

  // Default to BSC since this is a BSC-focused wallet app
  return 'bsc';
}

/**
 * Creates ethers provider based on network (currently unused but kept for future features)
 */
// function createProvider(network: 'ethereum' | 'bsc'): ethers.EtherscanProvider {
//   const config = NETWORKS[network]
//
//   if (!config.apiKey) {
//     throw new Error(`Missing API key for ${network} network`)
//   }
//
//   if (network === 'ethereum') {
//     return new ethers.EtherscanProvider('homestead', config.apiKey)
//   } else {
//     // For BSC, we'll use a custom provider since ethers doesn't have built-in BSC support
//     return new ethers.EtherscanProvider('homestead', config.apiKey)
//   }
// }

/**
 * Fetches transaction history for an address using EtherscanProvider
 */
export async function fetchTransactionHistory(
  address: string,
  network: 'ethereum' | 'bsc',
  page: number = 1,
  limit: number = 20,
  startBlock: number = 0
): Promise<{
  transactions: Transaction[];
  total: number;
  hasMore: boolean;
}> {
  try {
    // Fetch transaction history
    // Note: EtherscanProvider has limitations, so we'll use direct API calls for better control
    const transactions = await fetchTransactionsDirectly(
      address,
      network,
      page,
      limit,
      startBlock
    );

    // Fetch token transfers for the same address
    const tokenTransfers = await fetchTokenTransfers(
      address,
      network,
      page,
      limit,
      startBlock
    );

    // Categorize and normalize transactions
    const categorizedTransactions = await categorizeTransactions(
      transactions,
      tokenTransfers,
      address,
      network
    );

    return {
      transactions: categorizedTransactions,
      total: categorizedTransactions.length,
      hasMore: categorizedTransactions.length === limit,
    };
  } catch (error) {
    console.error('Error fetching transaction history:', error);
    throw new Error('Failed to fetch transaction history');
  }
}

/**
 * Directly calls Etherscan/BSCScan API for better control over pagination and data
 */
async function fetchTransactionsDirectly(
  address: string,
  network: 'ethereum' | 'bsc',
  page: number,
  limit: number,
  startBlock: number = 0
): Promise<RawTransaction[]> {
  const config = NETWORKS[network];

  if (!config.apiKey) {
    console.warn(
      `[TRANSACTION SERVICE] Missing API key for ${network}. Please add ${network.toUpperCase()}SCAN_API_KEY to your .env.local file`
    );
    throw new Error(
      `Missing ${network.toUpperCase()}SCAN_API_KEY. Please get a free API key from ${network === 'ethereum' ? 'etherscan.io' : 'bscscan.com'}`
    );
  }

  const baseUrl =
    network === 'ethereum'
      ? 'https://api.etherscan.io/api'
      : 'https://api.bscscan.com/api';

  const url = `${baseUrl}?module=account&action=txlist&address=${address}&startblock=${startBlock}&endblock=99999999&page=${page}&offset=${limit}&sort=desc&apikey=${config.apiKey}`;

  const response = await fetch(url);
  const data = await response.json();

  if (data.status === '0' && data.message === 'No transactions found') {
    return [];
  }

  if (data.status === '0') {
    console.error(`[BSCScan API Error] ${data.message || 'Unknown error'}`);
    throw new Error(data.message || 'Failed to fetch transactions');
  }

  return data.result.map(
    (tx: {
      hash: string;
      blockNumber: string;
      from: string;
      to?: string;
      value: string;
      timeStamp: string;
      gasUsed: string;
      gasPrice: string;
    }): RawTransaction => ({
      hash: tx.hash,
      blockNumber: parseInt(tx.blockNumber),
      from: tx.from,
      to: tx.to || '',
      value: tx.value,
      timestamp: parseInt(tx.timeStamp),
      gasUsed: tx.gasUsed,
      gasPrice: tx.gasPrice,
    })
  );
}

/**
 * Normalize token symbols to standard format
 * This helps identify Binance-Peg tokens and other variations
 */
function normalizeTokenSymbol(tokenSymbol: string, tokenName: string): string {
  // Convert to uppercase for comparison
  const symbol = tokenSymbol.toUpperCase();
  const name = tokenName.toUpperCase();

  // Handle Binance-Peg tokens - extract the base symbol
  if (name.includes('BINANCE-PEG')) {
    if (name.includes('ETHEREUM')) return 'ETH';
    if (name.includes('BITCOIN CASH')) return 'BCH'; // Bitcoin Cash must come before Bitcoin
    if (name.includes('BITCOIN')) return 'BTC';
    if (name.includes('CARDANO')) return 'ADA';
    if (name.includes('POLKADOT')) return 'DOT';
    if (name.includes('CHAINLINK')) return 'LINK';
    if (name.includes('UNISWAP')) return 'UNI';
    if (name.includes('AAVE')) return 'AAVE';
    if (name.includes('BUSD')) return 'BUSD';
    if (name.includes('USD COIN')) return 'USDC';
    if (name.includes('LITECOIN')) return 'LTC';
    if (name.includes('DOGECOIN')) return 'DOGE';
    if (name.includes('POLYGON')) return 'MATIC'; // Keep as MATIC for user display
    if (name.includes('AVALANCHE')) return 'AVAX';
    if (name.includes('SOLANA')) return 'SOL';
    if (name.includes('XRP')) return 'XRP';
  }

  // Handle common variations
  if (symbol === 'BTCB') return 'BTC'; // Bitcoin BEP20
  if (symbol === 'WBNB') return 'BNB'; // Wrapped BNB
  if (symbol === 'WETH') return 'ETH'; // Wrapped ETH
  if (symbol === 'WBTC') return 'BTC'; // Wrapped BTC

  // Keep BSC-USD as is (don't convert to USDT)
  if (symbol === 'BSC-USD' || name.includes('BSC-USD')) return 'BSC-USD';

  // Return original symbol if no normalization needed
  return symbol;
}

/**
 * Fetches ERC20 token transfers for an address
 */
async function fetchTokenTransfers(
  address: string,
  network: 'ethereum' | 'bsc',
  page: number,
  limit: number,
  startBlock: number = 0
): Promise<TokenTransfer[]> {
  const config = NETWORKS[network];

  if (!config.apiKey) {
    console.warn(
      `[TRANSACTION SERVICE] Missing API key for ${network} token transfers`
    );
    return []; // Return empty array instead of throwing for token transfers
  }

  const baseUrl =
    network === 'ethereum'
      ? 'https://api.etherscan.io/api'
      : 'https://api.bscscan.com/api';

  const url = `${baseUrl}?module=account&action=tokentx&address=${address}&startblock=${startBlock}&endblock=99999999&page=${page}&offset=${limit}&sort=desc&apikey=${config.apiKey}`;

  try {
    const response = await fetch(url);
    const data = await response.json();

    if (data.status === '0' && data.message === 'No transactions found') {
      return [];
    }

    if (data.status === '0') {
      console.error('Token transfer fetch error:', data.message);
      return [];
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return data.result.map((tx: any): TokenTransfer => {
      const decimals = parseInt(tx.tokenDecimal) || 18;
      const amount = tx.value;
      const formattedAmount = ethers.formatUnits(amount, decimals);

      // Normalize token symbol for better recognition
      const originalSymbol = tx.tokenSymbol || 'UNKNOWN';
      const originalName = tx.tokenName || 'Unknown Token';
      const normalizedSymbol = normalizeTokenSymbol(
        originalSymbol,
        originalName
      );

      return {
        hash: tx.hash,
        from: tx.from,
        to: tx.to,
        tokenAddress: tx.contractAddress,
        tokenSymbol: normalizedSymbol, // Use normalized symbol
        tokenName: originalName, // Keep original name for reference
        tokenDecimals: decimals,
        amount: amount,
        formattedAmount: parseFloat(formattedAmount).toFixed(6),
        blockNumber: parseInt(tx.blockNumber),
        timestamp: parseInt(tx.timeStamp),
      };
    });
  } catch (error) {
    console.error('Error fetching token transfers:', error);
    return [];
  }
}

/**
 * Categorizes transactions as deposit, withdraw, or token_transfer
 */
async function categorizeTransactions(
  transactions: RawTransaction[],
  tokenTransfers: TokenTransfer[],
  userAddress: string,
  network: 'ethereum' | 'bsc'
): Promise<Transaction[]> {
  const categorized: Transaction[] = [];

  // Process regular ETH/BNB transactions
  for (const tx of transactions) {
    const isDeposit = tx.to.toLowerCase() === userAddress.toLowerCase();
    const isWithdraw = tx.from.toLowerCase() === userAddress.toLowerCase();

    if (isDeposit || isWithdraw) {
      const valueInEth = ethers.formatEther(tx.value);

      categorized.push({
        hash: tx.hash,
        timestamp: new Date(tx.timestamp * 1000).toISOString(),
        from: tx.from,
        to: tx.to,
        value: parseFloat(valueInEth).toFixed(6),
        type: isDeposit ? 'deposit' : 'withdraw',
        gasUsed: tx.gasUsed,
        gasPrice: tx.gasPrice,
        blockNumber: tx.blockNumber,
        network,
      });
    }
  }

  // Process token transfers
  for (const transfer of tokenTransfers) {
    const isDeposit = transfer.to.toLowerCase() === userAddress.toLowerCase();
    const isWithdraw =
      transfer.from.toLowerCase() === userAddress.toLowerCase();

    if (isDeposit || isWithdraw) {
      categorized.push({
        hash: transfer.hash,
        timestamp: new Date(transfer.timestamp * 1000).toISOString(),
        from: transfer.from,
        to: transfer.to,
        value: '0.000000', // No native currency for token transfers
        type: 'token_transfer',
        tokenSymbol: transfer.tokenSymbol,
        tokenAmount: transfer.formattedAmount,
        tokenDecimals: transfer.tokenDecimals,
        tokenAddress: transfer.tokenAddress, // Add contract address
        blockNumber: transfer.blockNumber,
        network,
      });
    }
  }

  // Sort by block number (most recent first)
  return categorized.sort((a, b) => b.blockNumber - a.blockNumber);
}

/**
 * Gets explorer URL for a transaction
 */
export function getExplorerUrl(
  hash: string,
  network: 'ethereum' | 'bsc'
): string {
  const config = NETWORKS[network];
  return `${config.explorerUrl}/tx/${hash}`;
}

/**
 * Validates if an address is valid Ethereum address
 */
export function isValidAddress(address: string): boolean {
  try {
    return ethers.isAddress(address);
  } catch {
    return false;
  }
}
