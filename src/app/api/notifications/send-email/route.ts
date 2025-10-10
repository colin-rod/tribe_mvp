import { NextRequest, NextResponse } from 'next/server'
import { serverEmailService } from '@/lib/services/serverEmailService'
import { z } from 'zod'
import { createLogger } from '@/lib/logger'
import { requireAuth, verifyNotificationPermissions } from '@/lib/middleware/authorization'
import { checkRateLimit, RateLimitConfigs } from '@/lib/middleware/rateLimiting'
import { emailSchema } from '@/lib/validation/security'

const logger = createLogger('NotificationSendEmailAPI')

const sendEmailSchema = z.object({
  to: emailSchema,
  type: z.enum(['response', 'prompt', 'digest', 'system', 'preference']),
  templateData: z.record(z.any()).optional(),
  options: z.object({
    from: emailSchema.optional(),
    fromName: z.string().max(100).optional(),
    replyTo: emailSchema.optional(),
    categories: z.array(z.string().max(50)).max(10).optional(),
    customArgs: z.record(z.string().max(255)).optional()
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

    // Check rate limiting with enhanced system
    const rateLimitResult = checkRateLimit(request, RateLimitConfigs.email, user.id)
    if (!rateLimitResult.allowed) {
      return rateLimitResult.response
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