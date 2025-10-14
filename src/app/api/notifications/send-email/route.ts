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
    buildSuccessResponse: (_context, summary, _ownedEmails, _rateLimitInfo) => {
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
    }
  })
}

export async function GET() {
  return NextResponse.json(
    { error: 'Method not allowed' },
    { status: 405 }
  )
}
