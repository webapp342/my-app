import { NextRequest, NextResponse } from 'next/server';
import { ethers } from 'ethers';

const BSC_RPC_URL = 'https://bsc-dataseed1.binance.org/'; // BSC mainnet

export async function POST(request: NextRequest) {
  try {
    const { from, to, amount } = await request.json();

    if (!from || !to || !amount) {
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      );
    }

    // Validate addresses
    if (!ethers.isAddress(from) || !ethers.isAddress(to)) {
      return NextResponse.json(
        { error: 'Invalid address format' },
        { status: 400 }
      );
    }

    // Validate amount
    if (isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
      return NextResponse.json({ error: 'Invalid amount' }, { status: 400 });
    }

    // Create provider
    const provider = new ethers.JsonRpcProvider(BSC_RPC_URL);

    // Convert amount to Wei
    const valueWei = ethers.parseEther(amount.toString());

    // Create transaction object for estimation
    const transaction = {
      from: from,
      to: to,
      value: valueWei,
    };

    try {
      // Estimate gas limit
      const gasLimit = await provider.estimateGas(transaction);

      // Get current gas price
      const feeData = await provider.getFeeData();
      let gasPrice = feeData.gasPrice || ethers.parseUnits('5', 'gwei'); // Fallback to 5 gwei

      // For BSC, use slightly higher gas price to ensure transaction goes through
      gasPrice = (gasPrice * BigInt(110)) / BigInt(100); // Add 10% buffer

      // Calculate estimated fee in BNB
      const estimatedFee = gasLimit * gasPrice;
      const estimatedFeeETH = ethers.formatEther(estimatedFee);

      console.log('Gas estimation:', {
        gasLimit: gasLimit.toString(),
        gasPrice: gasPrice.toString(),
        estimatedFeeETH,
      });

      return NextResponse.json({
        success: true,
        gasLimit: gasLimit.toString(),
        gasPrice: gasPrice.toString(),
        estimatedFee: estimatedFee.toString(),
        estimatedFeeETH: estimatedFeeETH,
        network: 'BSC',
      });
    } catch (estimationError) {
      console.error('Gas estimation failed:', estimationError);

      // If estimation fails, provide fallback values
      const fallbackGasLimit = '21000'; // Standard ETH transfer gas limit
      const fallbackGasPrice = ethers.parseUnits('5', 'gwei');
      const fallbackFee = BigInt(fallbackGasLimit) * fallbackGasPrice;
      const fallbackFeeETH = ethers.formatEther(fallbackFee);

      return NextResponse.json({
        success: true,
        gasLimit: fallbackGasLimit,
        gasPrice: fallbackGasPrice.toString(),
        estimatedFee: fallbackFee.toString(),
        estimatedFeeETH: fallbackFeeETH,
        network: 'BSC',
        fallback: true,
        warning: 'Used fallback gas estimation',
      });
    }
  } catch (error) {
    console.error('Gas estimation error:', error);
    return NextResponse.json(
      { error: 'Failed to estimate gas' },
      { status: 500 }
    );
  }
}
