import { NextRequest, NextResponse } from 'next/server';
import { getPortfolioData } from '@/lib/portfolio-service';
import { isValidAddress } from '@/lib/blockchain';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const address = searchParams.get('address');

    console.log(`[PORTFOLIO API] Received request for address: ${address}`);
    console.log(
      `[PORTFOLIO API] BSCScan API Key available: ${process.env.BSCSCAN_API_KEY ? 'YES' : 'NO'}`
    );

    if (!address) {
      console.error('[PORTFOLIO API] Error: Address parameter missing');
      return NextResponse.json(
        { error: 'Address is required' },
        { status: 400 }
      );
    }

    if (!isValidAddress(address)) {
      console.error(
        `[PORTFOLIO API] Error: Invalid address format: ${address}`
      );
      return NextResponse.json(
        { error: 'Invalid address format' },
        { status: 400 }
      );
    }

    console.log('[PORTFOLIO API] Starting portfolio data fetch...');
    const portfolioData = await getPortfolioData(address);

    console.log('[PORTFOLIO API] Portfolio data fetched successfully');
    return NextResponse.json(portfolioData);
  } catch (error) {
    console.error('[PORTFOLIO API] Error in portfolio API:', error);

    if (error instanceof Error) {
      console.error('[PORTFOLIO API] Error message:', error.message);
      console.error('[PORTFOLIO API] Error stack:', error.stack);

      if (error.message.includes('API key')) {
        return NextResponse.json(
          { error: 'BSCScan API key not configured' },
          { status: 500 }
        );
      }

      if (error.message.includes('fetch')) {
        return NextResponse.json(
          { error: 'Network error - unable to fetch data from BSCScan' },
          { status: 503 }
        );
      }
    }

    return NextResponse.json(
      { error: 'Failed to fetch portfolio data' },
      { status: 500 }
    );
  }
}
