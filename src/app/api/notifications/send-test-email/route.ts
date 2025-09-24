import { NextRequest, NextResponse } from 'next/server'
import { serverEmailService } from '@/lib/services/serverEmailService'
import { z } from 'zod'
import { createLogger } from '@/lib/logger'
import { requireAuth, verifyNotificationPermissions, checkRateLimit } from '@/lib/middleware/authorization'

const logger = createLogger('NotificationTestEmailAPI')

const sendTestEmailSchema = z.object({
  to: z.string().email('Invalid email address'),
  type: z.enum(['response', 'prompt', 'digest', 'system']).optional().default('system')
})

export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const body = await request.json()
    const validatedData = sendTestEmailSchema.parse(body)

    // Check authentication
    const authResult = await requireAuth(request)
    if (authResult instanceof NextResponse) {
      return authResult
    }
    const { user } = authResult

    // Check rate limiting for test emails
    if (!checkRateLimit(user.id, 20, 5)) { // 20 test emails per 5 minutes
      return NextResponse.json(
        { error: 'Rate limit exceeded. Please try again later.' },
        { status: 429 }
      )
    }

    // For test emails, allow sending to user's own email or owned recipients
    const allowedEmails = [user.email]
    const { ownedEmails } = await verifyNotificationPermissions(user.id, [validatedData.to])
    allowedEmails.push(...ownedEmails)

    if (!allowedEmails.includes(validatedData.to.toLowerCase()) && user.email?.toLowerCase() !== validatedData.to.toLowerCase()) {
      logger.warn('Unauthorized test email attempt', {
        userId: user.id,
        requestedEmail: validatedData.to,
        userEmail: user.email,
        ownedEmails
      })
      return NextResponse.json(
        { error: 'You can only send test emails to your own email address or recipients you manage' },
        { status: 403 }
      )
    }

    // Check if email service is configured
    if (!serverEmailService.isConfigured()) {
      return NextResponse.json(
        { error: 'Email service not properly configured' },
        { status: 500 }
      )
    }

    // Send the test email
    const result = await serverEmailService.sendTestEmail(
      validatedData.to,
      validatedData.type
    )

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to send test email' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      messageId: result.messageId,
      statusCode: result.statusCode,
      message: `Test ${validatedData.type} email sent successfully`
    })

  } catch (error) {
    logger.errorWithStack('Send test email API error', error as Error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function GET() {
  return NextResponse.json(
    { error: 'Method not allowed' },
    { status: 405 }
  )
}