import { Alchemy, Network, AlchemySubscription, AlchemyEventType } from 'alchemy-sdk'
import { supabase } from './supabase'
import { ethers } from 'ethers'

// Common ERC20 tokens on BSC
export const BSC_TOKENS = {
  USDT: {
    address: '0x55d398326f99059fF775485246999027B3197955',
    symbol: 'USDT',
    decimals: 18,
    name: 'Tether USD'
  },
  BUSD: {
    address: '0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56',
    symbol: 'BUSD',
    decimals: 18,
    name: 'Binance USD'
  },
  WETH: {
    address: '0x2170Ed0880ac9A755fd29B2688956BD959F933F8',
    symbol: 'WETH',
    decimals: 18,
    name: 'Wrapped Ethereum'
  },
  BNB: {
    address: null, // Native token
    symbol: 'BNB',
    decimals: 18,
    name: 'Binance Coin'
  }
}

// Alchemy configuration for BSC
const settings = {
  apiKey: process.env.ALCHEMY_API_KEY,
  network: Network.BNB_MAINNET, // BSC Mainnet
}

export const alchemy = new Alchemy(settings)

// Get all wallet addresses from database
export async function getAllWalletAddresses(): Promise<string[]> {
  try {
    const { data: wallets, error } = await supabase
      .from('wallets')
      .select('address')
      .eq('network', 'BSC_MAINNET')

    if (error) {
      console.error('Error fetching wallets:', error)
      return []
    }

    return wallets.map(wallet => wallet.address.toLowerCase())
  } catch (error) {
    console.error('Error in getAllWalletAddresses:', error)
    return []
  }
}

// Get user ID by wallet address
export async function getUserIdByWalletAddress(address: string): Promise<string | null> {
  try {
    const { data: wallet, error } = await supabase
      .from('wallets')
      .select('user_id')
      .eq('address', address)
      .eq('network', 'BSC_MAINNET')
      .single()

    if (error || !wallet) {
      console.error('Error fetching user by wallet address:', error)
      return null
    }

    return wallet.user_id
  } catch (error) {
    console.error('Error in getUserIdByWalletAddress:', error)
    return null
  }
}

// Check if transaction already exists
export async function transactionExists(txHash: string): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('transactions')
      .select('id')
      .eq('tx_hash', txHash)
      .single()

    return !error && !!data
  } catch (error) {
    return false
  }
}

// Save transaction to database
export async function saveTransaction(transactionData: {
  userId: string
  txHash: string
  fromAddress: string
  toAddress: string
  amount: string
  tokenAddress?: string | null
  tokenSymbol: string
  tokenDecimals: number
  network: string
  type: 'deposit' | 'withdraw'
  blockNumber?: number
  gasUsed?: string
  gasPrice?: string
}) {
  try {
    const { error } = await supabase
      .from('transactions')
      .insert({
        user_id: transactionData.userId,
        tx_hash: transactionData.txHash,
        from_address: transactionData.fromAddress,
        to_address: transactionData.toAddress,
        amount: parseFloat(transactionData.amount),
        token_address: transactionData.tokenAddress,
        token_symbol: transactionData.tokenSymbol,
        token_decimals: transactionData.tokenDecimals,
        network: transactionData.network,
        type: transactionData.type,
        status: 'confirmed',
        block_number: transactionData.blockNumber,
        gas_used: transactionData.gasUsed ? parseFloat(transactionData.gasUsed) : null,
        gas_price: transactionData.gasPrice ? parseFloat(transactionData.gasPrice) : null
      })

    if (error) {
      console.error('Error saving transaction:', error)
      return false
    }

    return true
  } catch (error) {
    console.error('Error in saveTransaction:', error)
    return false
  }
}

// Update user balance
export async function updateUserBalance(
  userId: string,
  tokenSymbol: string,
  tokenAddress: string | null,
  amount: string,
  network: string = 'BSC_MAINNET'
) {
  try {
    // First, try to get existing balance
    const { data: existingBalance } = await supabase
      .from('balances')
      .select('amount')
      .eq('user_id', userId)
      .eq('token_symbol', tokenSymbol)
      .eq('network', network)
      .single()

    const currentAmount = existingBalance?.amount || 0
    const newAmount = currentAmount + parseFloat(amount)

    const { error } = await supabase
      .from('balances')
      .upsert({
        user_id: userId,
        token_symbol: tokenSymbol,
        token_address: tokenAddress,
        amount: newAmount,
        network: network,
        last_updated: new Date().toISOString()
      }, {
        onConflict: 'user_id,token_symbol,network'
      })

    if (error) {
      console.error('Error updating balance:', error)
      return false
    }

    return true
  } catch (error) {
    console.error('Error in updateUserBalance:', error)
    return false
  }
}

// Process ERC20 transfer event
export async function processERC20Transfer(log: any, walletAddresses: string[]) {
  try {
    // ERC20 Transfer event signature: Transfer(address,address,uint256)
    const transferEventSignature = '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef'
    
    if (log.topics[0] !== transferEventSignature || log.topics.length < 3) {
      return
    }

    const fromAddress = ethers.getAddress('0x' + log.topics[1].slice(26))
    const toAddress = ethers.getAddress('0x' + log.topics[2].slice(26))
    const amount = ethers.getBigInt(log.data)
    const tokenAddress = ethers.getAddress(log.address)

    // Check if this is a deposit to one of our wallets
    if (!walletAddresses.includes(toAddress.toLowerCase())) {
      return
    }

    // Check if transaction already exists
    if (await transactionExists(log.transactionHash)) {
      console.log('Transaction already exists:', log.transactionHash)
      return
    }

    // Get token info
    const tokenInfo = Object.values(BSC_TOKENS).find(
      token => token.address?.toLowerCase() === tokenAddress.toLowerCase()
    )

    if (!tokenInfo) {
      console.log('Unknown token:', tokenAddress)
      return
    }

    // Get user ID
    const userId = await getUserIdByWalletAddress(toAddress)
    if (!userId) {
      console.log('No user found for wallet:', toAddress)
      return
    }

    // Format amount
    const formattedAmount = ethers.formatUnits(amount, tokenInfo.decimals)

    // Save transaction
    const saved = await saveTransaction({
      userId,
      txHash: log.transactionHash,
      fromAddress,
      toAddress,
      amount: formattedAmount,
      tokenAddress,
      tokenSymbol: tokenInfo.symbol,
      tokenDecimals: tokenInfo.decimals,
      network: 'BSC_MAINNET',
      type: 'deposit',
      blockNumber: parseInt(log.blockNumber)
    })

    if (saved) {
      // Update balance
      await updateUserBalance(userId, tokenInfo.symbol, tokenAddress, formattedAmount)
      console.log(`Processed deposit: ${formattedAmount} ${tokenInfo.symbol} to ${toAddress}`)
    }

  } catch (error) {
    console.error('Error processing ERC20 transfer:', error)
  }
}

// Process native BNB transfer
export async function processNativeTransfer(tx: any, walletAddresses: string[]) {
  try {
    const toAddress = tx.to?.toLowerCase()
    
    // Check if this is a deposit to one of our wallets
    if (!toAddress || !walletAddresses.includes(toAddress)) {
      return
    }

    // Check if transaction already exists
    if (await transactionExists(tx.hash)) {
      console.log('Transaction already exists:', tx.hash)
      return
    }

    // Get user ID
    const userId = await getUserIdByWalletAddress(toAddress)
    if (!userId) {
      console.log('No user found for wallet:', toAddress)
      return
    }

    // Format amount
    const formattedAmount = ethers.formatEther(tx.value)

    // Save transaction
    const saved = await saveTransaction({
      userId,
      txHash: tx.hash,
      fromAddress: tx.from,
      toAddress: tx.to,
      amount: formattedAmount,
      tokenAddress: null,
      tokenSymbol: 'BNB',
      tokenDecimals: 18,
      network: 'BSC_MAINNET',
      type: 'deposit',
      blockNumber: tx.blockNumber,
      gasUsed: tx.gasUsed?.toString(),
      gasPrice: tx.gasPrice?.toString()
    })

    if (saved) {
      // Update balance
      await updateUserBalance(userId, 'BNB', null, formattedAmount)
      console.log(`Processed BNB deposit: ${formattedAmount} BNB to ${toAddress}`)
    }

  } catch (error) {
    console.error('Error processing native transfer:', error)
  }
}

// Start monitoring transfers
export async function startTransferMonitoring() {
  try {
    console.log('Starting Alchemy transfer monitoring...')
    
    // Get all wallet addresses
    const walletAddresses = await getAllWalletAddresses()
    if (walletAddresses.length === 0) {
      console.log('No wallet addresses found to monitor')
      return
    }

    console.log(`Monitoring ${walletAddresses.length} wallet addresses`)

    // Monitor ERC20 transfers
    alchemy.ws.on(
      {
        method: AlchemySubscription.LOGS,
        topics: [
          '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef' // Transfer event
        ]
      },
      (log) => processERC20Transfer(log, walletAddresses)
    )

    // Monitor native BNB transfers
    alchemy.ws.on(
      {
        method: AlchemySubscription.PENDING_TRANSACTIONS,
        toAddress: walletAddresses,
        hashesOnly: false
      },
      (tx) => processNativeTransfer(tx, walletAddresses)
    )

    console.log('Alchemy monitoring started successfully')

  } catch (error) {
    console.error('Error starting transfer monitoring:', error)
  }
}

// Get token balance from Alchemy
export async function getTokenBalance(
  walletAddress: string,
  tokenAddress?: string
): Promise<{ balance: string; symbol: string; decimals: number }> {
  try {
    if (!tokenAddress) {
      // Get native BNB balance
      const balance = await alchemy.core.getBalance(walletAddress)
      return {
        balance: ethers.formatEther(balance),
        symbol: 'BNB',
        decimals: 18
      }
    }

    // Get ERC20 token balance
    const tokenBalances = await alchemy.core.getTokenBalances(walletAddress, [tokenAddress])
    const tokenBalance = tokenBalances.tokenBalances[0]

    if (!tokenBalance) {
      throw new Error('Token balance not found')
    }

    // Get token metadata
    const metadata = await alchemy.core.getTokenMetadata(tokenAddress)
    
    return {
      balance: ethers.formatUnits(tokenBalance.tokenBalance || '0', metadata.decimals || 18),
      symbol: metadata.symbol || 'UNKNOWN',
      decimals: metadata.decimals || 18
    }

  } catch (error) {
    console.error('Error getting token balance:', error)
    throw error
  }
} 