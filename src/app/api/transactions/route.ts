import { NextRequest, NextResponse } from 'next/server';
import {
  fetchTransactionHistory,
  detectNetwork,
  isValidAddress,
} from '@/lib/transaction-service';
import { TransactionResponse } from '@/types/transaction';

/**
 * GET /api/transactions
 *
 * Fetches and categorizes blockchain transactions for a given address
 *
 * Query Parameters:
 * - address (required): Ethereum or BSC wallet address
 * - network (optional): 'ethereum' or 'bsc' - auto-detected if not provided
 * - page (optional): Page number for pagination (default: 1)
 * - limit (optional): Number of transactions per page (default: 20, max: 100)
 *
 * Returns:
 * - Array of categorized transactions (deposit, withdraw, token_transfer)
 * - Pagination metadata
 * - Network information
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const address = searchParams.get('address');
    const networkParam = searchParams.get('network');
    const pageParam = searchParams.get('page');
    const limitParam = searchParams.get('limit');

    // Validate required parameters
    if (!address) {
      return NextResponse.json(
        { error: 'Address parameter is required' },
        { status: 400 }
      );
    }

    // Validate address format
    if (!isValidAddress(address)) {
      return NextResponse.json(
        { error: 'Invalid address format' },
        { status: 400 }
      );
    }

    // Parse and validate pagination parameters
    const page = Math.max(1, parseInt(pageParam || '1'));
    const limit = Math.min(100, Math.max(1, parseInt(limitParam || '20')));

    // Detect or validate network
    const network = detectNetwork(address, networkParam || undefined);

    if (networkParam && !['ethereum', 'bsc'].includes(networkParam)) {
      return NextResponse.json(
        { error: 'Network must be either "ethereum" or "bsc"' },
        { status: 400 }
      );
    }

    // Check for required API keys
    const etherscanKey = process.env.ETHERSCAN_API_KEY;
    const bscscanKey = process.env.BSCSCAN_API_KEY;

    if (network === 'ethereum' && !etherscanKey) {
      return NextResponse.json(
        { error: 'Etherscan API key not configured' },
        { status: 500 }
      );
    }

    if (network === 'bsc' && !bscscanKey) {
      return NextResponse.json(
        { error: 'BSCScan API key not configured' },
        { status: 500 }
      );
    }

    // Fetch transaction history
    const result = await fetchTransactionHistory(address, network, page, limit);

    // Prepare response
    const response: TransactionResponse = {
      transactions: result.transactions,
      total: result.total,
      page,
      limit,
      hasMore: result.hasMore,
      network,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error in transactions API:', error);

    // Handle specific error types
    if (error instanceof Error) {
      if (error.message.includes('API key')) {
        return NextResponse.json(
          { error: 'API configuration error' },
          { status: 500 }
        );
      }

      if (
        error.message.includes('rate limit') ||
        error.message.includes('too many requests')
      ) {
        return NextResponse.json(
          { error: 'API rate limit exceeded. Please try again later.' },
          { status: 429 }
        );
      }

      if (error.message.includes('No transactions found')) {
        return NextResponse.json({
          transactions: [],
          total: 0,
          page: 1,
          limit: 20,
          hasMore: false,
          network: 'ethereum',
        });
      }
    }

    return NextResponse.json(
      { error: 'Failed to fetch transactions' },
      { status: 500 }
    );
  }
}

/**
 * Handle OPTIONS request for CORS
 */
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
