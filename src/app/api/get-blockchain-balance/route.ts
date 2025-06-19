import { NextRequest, NextResponse } from 'next/server';
import { ethers } from 'ethers';

const BSC_RPC_URL = 'https://bsc-dataseed1.binance.org/'; // BSC mainnet

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const address = searchParams.get('address');

    if (!address) {
      return NextResponse.json(
        { error: 'Address parameter is required' },
        { status: 400 }
      );
    }

    // Validate address
    if (!ethers.isAddress(address)) {
      return NextResponse.json(
        { error: 'Invalid address format' },
        { status: 400 }
      );
    }

    console.log('Fetching blockchain balance for:', address);

    // Create provider
    const provider = new ethers.JsonRpcProvider(BSC_RPC_URL);

    // Get balance from blockchain
    const balanceWei = await provider.getBalance(address);
    const balanceBNB = ethers.formatEther(balanceWei);

    console.log('Blockchain balance:', balanceBNB, 'BNB');

    return NextResponse.json({
      success: true,
      address: address,
      balance: balanceBNB,
      balanceWei: balanceWei.toString(),
      network: 'BSC_MAINNET',
    });
  } catch (error) {
    console.error('Error fetching blockchain balance:', error);
    return NextResponse.json(
      { error: 'Failed to fetch blockchain balance' },
      { status: 500 }
    );
  }
}
