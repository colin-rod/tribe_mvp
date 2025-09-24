import { NextRequest, NextResponse } from 'next/server'
import { serverEmailService } from '@/lib/services/serverEmailService'
import { z } from 'zod'
import { createLogger } from '@/lib/logger'
import { requireAuth, verifyNotificationPermissions, checkRateLimit } from '@/lib/middleware/authorization'

const logger = createLogger('NotificationSendEmailAPI')

const sendEmailSchema = z.object({
  to: z.string().email('Invalid email address'),
  type: z.enum(['response', 'prompt', 'digest', 'system', 'preference']),
  templateData: z.record(z.any()).optional(),
  options: z.object({
    from: z.string().email().optional(),
    fromName: z.string().optional(),
    replyTo: z.string().email().optional(),
    categories: z.array(z.string()).optional(),
    customArgs: z.record(z.string()).optional()
  }).optional()
})

export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const body = await request.json()
    const validatedData = sendEmailSchema.parse(body)

    // Check authentication
    const authResult = await requireAuth(request)
    if (authResult instanceof NextResponse) {
      return authResult
    }
    const { user } = authResult

    // Check rate limiting
    if (!checkRateLimit(user.id, 50, 10)) { // 50 emails per 10 minutes
      return NextResponse.json(
        { error: 'Rate limit exceeded. Please try again later.' },
        { status: 429 }
      )
    }

    // Verify user can send email to this recipient
    const { allowed, ownedEmails } = await verifyNotificationPermissions(user.id, [validatedData.to])
    if (!allowed) {
      logger.warn('Unauthorized email send attempt', {
        userId: user.id,
        requestedEmail: validatedData.to,
        ownedEmails
      })
      return NextResponse.json(
        { error: 'You are not authorized to send emails to this recipient' },
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

    // Send the email
    const result = await serverEmailService.sendTemplatedEmail(
      validatedData.to,
      validatedData.type,
      validatedData.templateData || {},
      validatedData.options || {}
    )

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to send email' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      messageId: result.messageId,
      statusCode: result.statusCode
    })

  } catch (error) {
    logger.errorWithStack('Send email API error', error as Error)

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