import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createLogger } from '@/lib/logger'
import { RateLimitConfigs } from '@/lib/middleware/rateLimiting'
import { handleEmailNotificationRequest } from '@/lib/services/notificationService/emailNotificationHandler'
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
  return handleEmailNotificationRequest(request, {
    schema: sendEmailSchema,
    rateLimit: RateLimitConfigs.email,
    logger,
    transformPayload: validatedData => ({
      notifications: [{
        to: validatedData.to,
        type: validatedData.type,
        templateData: validatedData.templateData || {},
        options: validatedData.options || {}
      }]
    }),
    buildSuccessResponse: (_context, summary) => {
      const delivery = summary.deliveries[0]

      if (!delivery || !delivery.delivery.success) {
        const statusCode = delivery?.delivery.statusCode || 500
        return NextResponse.json(
          {
            error: delivery?.delivery.error || 'Failed to send email',
            statusCode,
            retryable: statusCode === 503
          },
          { status: statusCode }
        )
      }

      const statusCode = delivery.delivery.statusCode
    // Check rate limiting with enhanced system
    const rateLimitResult = checkRateLimit(request, RateLimitConfigs.email, user.id)
    if (!rateLimitResult.allowed) {
      const { info } = rateLimitResult
      const retryAfterSeconds = Math.max(1, Math.ceil((info.resetTime - Date.now()) / 1000))

      const response = NextResponse.json(
        {
          error: 'Rate limit exceeded. Please try again later.',
          details: {
            limit: info.total,
            remaining: info.remaining,
            resetTime: new Date(info.resetTime).toISOString(),
            retryAfter: retryAfterSeconds
          }
        },
        { status: 429 }
      )

      response.headers.set('X-RateLimit-Limit', info.total.toString())
      response.headers.set('X-RateLimit-Remaining', info.remaining.toString())
      response.headers.set('X-RateLimit-Reset', Math.ceil(info.resetTime / 1000).toString())
      response.headers.set('Retry-After', retryAfterSeconds.toString())

      return response
    }

      return NextResponse.json({
        success: true,
        messageId: delivery.delivery.messageId,
        jobId: delivery.delivery.messageId,
        status: statusCode === 202 ? 'queued' : 'sent',
        statusCode,
        message: statusCode === 202
          ? 'Email queued for delivery'
          : 'Email sent successfully'
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

    // Send the email (queued for background delivery)
    const result = await serverEmailService.sendTemplatedEmail(
      validatedData.to,
      validatedData.type,
      validatedData.templateData || {},
      validatedData.options || {}
    )

    if (!result.success) {
      // Queue unavailable - return 503
      const statusCode = result.statusCode || 500
      return NextResponse.json(
        {
          error: result.error || 'Failed to send email',
          statusCode,
          retryable: statusCode === 503
        },
        { status: statusCode }
      )
    }

    // Email queued successfully - return job info
    const response = NextResponse.json({
      success: true,
      messageId: result.messageId,
      jobId: result.messageId, // Job ID is the same as message ID
      status: result.statusCode === 202 ? 'queued' : 'sent',
      statusCode: result.statusCode,
      message: result.statusCode === 202
        ? 'Email queued for delivery'
        : 'Email sent successfully'
    })

    response.headers.set('X-RateLimit-Limit', rateLimitResult.info.total.toString())
    response.headers.set('X-RateLimit-Remaining', rateLimitResult.info.remaining.toString())
    response.headers.set('X-RateLimit-Reset', Math.ceil(rateLimitResult.info.resetTime / 1000).toString())

    return response

  } catch (error) {
    logger.errorWithStack('Send email API error', error as Error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      )
    }
  })
}

export async function GET() {
  return NextResponse.json(
    { error: 'Method not allowed' },
    { status: 405 }
  )
}