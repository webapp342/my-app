import { NextRequest, NextResponse } from 'next/server'
import { ethers } from 'ethers'
import { supabase } from '@/lib/supabase'
import { decodePrivateKey } from '@/lib/crypto'

const BSC_RPC_URL = 'https://bsc-dataseed1.binance.org/' // BSC mainnet
const BSC_CHAIN_ID = 56

export async function POST(request: NextRequest) {
  try {
    const { fromAddress, toAddress, amount, gasLimit, gasPrice } = await request.json()

    if (!fromAddress || !toAddress || !amount) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 })
    }

    // Validate addresses
    if (!ethers.isAddress(fromAddress) || !ethers.isAddress(toAddress)) {
      return NextResponse.json({ error: 'Invalid address format' }, { status: 400 })
    }

    // Validate amount
    if (isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
      return NextResponse.json({ error: 'Invalid amount' }, { status: 400 })
    }

    console.log('Sending BNB (blockchain-only operation):', {
      fromAddress,
      toAddress,
      amount,
      gasLimit,
      gasPrice
    })

    // Get user's private key from wallets table (only for wallet access, no transaction logging)
    console.log('Looking for wallet address:', fromAddress)
    
    // First, let's try to find any wallet for debugging
    const { data: allWallets } = await supabase
      .from('wallets')
      .select('address, private_key_encrypted')
      .limit(10)
    
    console.log('Available wallets:', allWallets)
    
    // Now search for the specific wallet (case-insensitive)
    const { data: wallet, error: walletError } = await supabase
      .from('wallets')
      .select('private_key_encrypted, address')
      .ilike('address', fromAddress)
      .single()

    if (walletError || !wallet) {
      console.error('Wallet not found:', walletError)
      return NextResponse.json({ 
        error: 'Wallet not found in database. Please create or import a wallet first.',
        details: `No wallet found for address: ${fromAddress}`,
        code: 'WALLET_NOT_FOUND'
      }, { status: 404 })
    }

    if (!wallet.private_key_encrypted) {
      return NextResponse.json({ error: 'Private key not found' }, { status: 404 })
    }

    // Decode private key (base64 encoded, not AES encrypted)
    let privateKey: string
    try {
      privateKey = decodePrivateKey(wallet.private_key_encrypted)
      if (!privateKey.startsWith('0x')) {
        privateKey = '0x' + privateKey
      }
      console.log('Private key decoded successfully, length:', privateKey.length)
    } catch (decodeError) {
      console.error('Failed to decode private key:', decodeError)
      return NextResponse.json({ error: 'Failed to decode private key' }, { status: 500 })
    }

    // Create provider and ethers wallet
    const provider = new ethers.JsonRpcProvider(BSC_RPC_URL)
    const ethersWallet = new ethers.Wallet(privateKey, provider)

    // Verify wallet address matches
    if (ethersWallet.address.toLowerCase() !== fromAddress.toLowerCase()) {
      console.error('Wallet address mismatch:', ethersWallet.address, 'vs', fromAddress)
      return NextResponse.json({ error: 'Wallet address mismatch' }, { status: 400 })
    }

    // Check balance
    const balance = await provider.getBalance(ethersWallet.address)
    const amountWei = ethers.parseEther(amount.toString())
    const gasLimitBN = BigInt(gasLimit || '21000')
    const gasPriceBN = BigInt(gasPrice || ethers.parseUnits('5', 'gwei').toString())
    const gasCost = gasLimitBN * gasPriceBN
    const totalCost = amountWei + gasCost

    if (balance < totalCost) {
      const balanceETH = ethers.formatEther(balance)
      const totalCostETH = ethers.formatEther(totalCost)
      return NextResponse.json({ 
        error: `Insufficient balance. Balance: ${balanceETH} BNB, Required: ${totalCostETH} BNB` 
      }, { status: 400 })
    }

    // Prepare transaction
    const transaction = {
      to: toAddress,
      value: amountWei,
      gasLimit: gasLimitBN,
      gasPrice: gasPriceBN,
      chainId: BSC_CHAIN_ID
    }

    console.log('Sending transaction:', {
      to: transaction.to,
      value: ethers.formatEther(transaction.value),
      gasLimit: transaction.gasLimit.toString(),
      gasPrice: ethers.formatUnits(transaction.gasPrice, 'gwei') + ' gwei'
    })

    // Send transaction
    let txResponse
    try {
      txResponse = await ethersWallet.sendTransaction(transaction)
      console.log('Transaction sent:', txResponse.hash)
    } catch (sendError: unknown) {
      console.error('Failed to send transaction:', sendError)
      
      // Handle specific error types
      const error = sendError as { code?: string; message?: string }
      if (error.code === 'INSUFFICIENT_FUNDS') {
        return NextResponse.json({ error: 'Insufficient funds for gas' }, { status: 400 })
      } else if (error.code === 'NONCE_EXPIRED') {
        return NextResponse.json({ error: 'Transaction failed: nonce expired' }, { status: 400 })
      } else if (error.code === 'REPLACEMENT_UNDERPRICED') {
        return NextResponse.json({ error: 'Transaction failed: gas price too low' }, { status: 400 })
      } else {
        return NextResponse.json({ 
          error: `Transaction failed: ${error.message || 'Unknown error'}` 
        }, { status: 500 })
      }
    }

    // Wait for transaction confirmation (optional - can be removed for faster response)
    try {
      console.log('Waiting for transaction confirmation...')
      const receipt = await txResponse.wait(1) // Wait for 1 confirmation
      console.log('Transaction confirmed:', receipt?.hash)
      
      // Note: We don't save to database as requested - this page only handles blockchain operations

      return NextResponse.json({
        success: true,
        transactionHash: txResponse.hash,
        blockNumber: receipt?.blockNumber,
        gasUsed: receipt?.gasUsed?.toString(),
        status: 'confirmed'
      })

    } catch (confirmError) {
      console.error('Transaction confirmation failed:', confirmError)
      
      // Transaction might still be pending
      return NextResponse.json({
        success: true,
        transactionHash: txResponse.hash,
        status: 'pending',
        message: 'Transaction sent but confirmation failed. Check BSCScan for status.'
      })
    }

  } catch (error) {
    console.error('Send BNB error:', error)
    return NextResponse.json(
      { error: 'Failed to send BNB transaction' },
      { status: 500 }
    )
  }
} 