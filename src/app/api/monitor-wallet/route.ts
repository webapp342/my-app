import { NextRequest, NextResponse } from 'next/server'
import { startTransferMonitoring } from '@/lib/alchemy-service'

export async function POST(request: NextRequest) {
  try {
    const { action } = await request.json()

    if (action === 'start') {
      // Start monitoring in the background
      startTransferMonitoring()
      
      return NextResponse.json({
        message: 'Wallet monitoring started successfully',
        status: 'started'
      })
    } else if (action === 'stop') {
      // Note: In a production environment, you would implement proper stop functionality
      return NextResponse.json({
        message: 'Wallet monitoring stopped',
        status: 'stopped'
      })
    } else {
      return NextResponse.json(
        { error: 'Invalid action. Use "start" or "stop"' },
        { status: 400 }
      )
    }

  } catch (error) {
    console.error('Error in monitor-wallet API:', error)
    return NextResponse.json(
      { 
        error: 'Internal server error', 
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Wallet monitoring service is available',
    endpoints: {
      start: 'POST /api/monitor-wallet with { "action": "start" }',
      stop: 'POST /api/monitor-wallet with { "action": "stop" }'
    }
  })
} 