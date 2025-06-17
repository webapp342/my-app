import { NextRequest, NextResponse } from 'next/server'
import { 
  processERC20Transfer, 
  processNativeTransfer, 
  getAllWalletAddresses 
} from '@/lib/alchemy-service'

export async function POST(request: NextRequest) {
  try {
    // Verify webhook authentication if token is provided
    const authToken = process.env.ALCHEMY_WEBHOOK_AUTH_TOKEN
    if (authToken) {
      const signature = request.headers.get('x-alchemy-signature')
      if (!signature || signature !== authToken) {
        return NextResponse.json(
          { error: 'Unauthorized webhook request' },
          { status: 401 }
        )
      }
    }

    const payload = await request.json()
    console.log('Alchemy webhook received:', payload)

    // Get wallet addresses to monitor
    const walletAddresses = await getAllWalletAddresses()
    if (walletAddresses.length === 0) {
      console.log('No wallet addresses to monitor')
      return NextResponse.json({ status: 'no_wallets' })
    }

    // Handle different types of webhook events
    const { type, event } = payload

    switch (type) {
      case 'ADDRESS_ACTIVITY':
        await handleAddressActivity(event, walletAddresses)
        break
      
      case 'MINED_TRANSACTION':
        await handleMinedTransaction(event, walletAddresses)
        break
      
      case 'DROPPED_TRANSACTION':
        console.log('Transaction dropped:', event.hash)
        break
      
      default:
        console.log('Unknown webhook type:', type)
    }

    return NextResponse.json({ 
      status: 'success',
      processed: true 
    })

  } catch (error) {
    console.error('Error processing Alchemy webhook:', error)
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

async function handleAddressActivity(event: any, walletAddresses: string[]) {
  const { activity } = event
  
  if (!activity || !Array.isArray(activity)) {
    console.log('No activity data in webhook')
    return
  }

  for (const transaction of activity) {
    try {
      // Check if this is a token transfer
      if (transaction.log && transaction.log.topics) {
        await processERC20Transfer(transaction.log, walletAddresses)
      }
      
      // Check if this is a native transfer
      if (transaction.value && transaction.value !== '0x0') {
        await processNativeTransfer(transaction, walletAddresses)
      }
    } catch (error) {
      console.error('Error processing transaction:', error)
    }
  }
}

async function handleMinedTransaction(event: any, walletAddresses: string[]) {
  const { transaction } = event
  
  if (!transaction) {
    console.log('No transaction data in mined event')
    return
  }

  try {
    // Process native transfers
    if (transaction.value && transaction.value !== '0x0') {
      await processNativeTransfer(transaction, walletAddresses)
    }

    // Process logs for ERC20 transfers
    if (transaction.logs && Array.isArray(transaction.logs)) {
      for (const log of transaction.logs) {
        await processERC20Transfer(log, walletAddresses)
      }
    }
  } catch (error) {
    console.error('Error processing mined transaction:', error)
  }
}

// Health check endpoint
export async function GET() {
  return NextResponse.json({
    status: 'healthy',
    message: 'Alchemy webhook endpoint is active',
    timestamp: new Date().toISOString()
  })
} 