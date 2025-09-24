import { NextRequest, NextResponse } from 'next/server'
import { serverEmailService } from '@/lib/services/serverEmailService'
import { createLogger } from '@/lib/logger'
import { withAuth } from '@/lib/middleware/authorization'

const logger = createLogger('NotificationStatusAPI')

export const GET = withAuth(async (_request: NextRequest, _user) => {
  try {

    // Get email service status
    const status = serverEmailService.getStatus()

    return NextResponse.json({
      configured: status.configured,
      apiKey: status.apiKey,
      fromEmail: status.fromEmail,
      service: 'SendGrid',
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    logger.errorWithStack('Email service status API error', error as Error)

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
})

export async function POST() {
  return NextResponse.json(
    { error: 'Method not allowed' },
    { status: 405 }
  )
}