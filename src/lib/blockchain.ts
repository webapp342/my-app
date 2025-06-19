import { ethers } from 'ethers';

// Network configurations
export const NETWORKS = {
  BSC_MAINNET: {
    name: 'BSC Mainnet',
    rpcUrl: process.env.BSC_RPC_URL || 'https://bsc-dataseed.binance.org/',
    chainId: 56,
    symbol: 'BNB',
    explorer: 'https://bscscan.com',
  },
  BSC_TESTNET: {
    name: 'BSC Testnet',
    rpcUrl:
      process.env.BSC_TESTNET_RPC_URL ||
      'https://data-seed-prebsc-1-s1.binance.org:8545/',
    chainId: 97,
    symbol: 'tBNB',
    explorer: 'https://testnet.bscscan.com',
  },
  ETHEREUM: {
    name: 'Ethereum Mainnet',
    rpcUrl: process.env.ETHEREUM_RPC_URL || 'https://rpc.ankr.com/eth',
    chainId: 1,
    symbol: 'ETH',
    explorer: 'https://etherscan.io',
  },
};

// Get provider for a specific network
export function getProvider(network: keyof typeof NETWORKS = 'BSC_MAINNET') {
  const networkConfig = NETWORKS[network];
  return new ethers.JsonRpcProvider(networkConfig.rpcUrl);
}

// Fetch real balance from blockchain
export async function getWalletBalance(
  address: string,
  network: keyof typeof NETWORKS = 'BSC_MAINNET'
): Promise<{
  balance: string;
  balanceFormatted: string;
  symbol: string;
  network: string;
}> {
  try {
    const provider = getProvider(network);
    const networkConfig = NETWORKS[network];

    // Get balance in wei
    const balanceWei = await provider.getBalance(address);

    // Convert to human-readable format
    const balanceFormatted = ethers.formatEther(balanceWei);

    return {
      balance: balanceWei.toString(),
      balanceFormatted: parseFloat(balanceFormatted).toFixed(6),
      symbol: networkConfig.symbol,
      network: networkConfig.name,
    };
  } catch (error) {
    console.error('Error fetching balance:', error);
    throw new Error('Failed to fetch wallet balance');
  }
}

// Validate address format
export function isValidAddress(address: string): boolean {
  try {
    return ethers.isAddress(address);
  } catch {
    return false;
  }
}

// Get network info
export function getNetworkInfo(network: keyof typeof NETWORKS) {
  return NETWORKS[network];
}
