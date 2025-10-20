import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createLogger } from '@/lib/logger'
import { RateLimitConfigs } from '@/lib/middleware/rateLimiting'
import { handleEmailNotificationRequest } from '@/lib/services/notificationService/emailNotificationHandler'
import { emailSchema } from '@/lib/validation/security'

const logger = createLogger('NotificationBulkEmailAPI')

const bulkEmailSchema = z.object({
  emails: z.array(z.object({
    to: emailSchema,
    type: z.enum(['response', 'prompt', 'digest', 'system', 'preference']),
    templateData: z.record(z.any()).optional(),
    options: z.object({
      from: emailSchema.optional(),
      fromName: z.string().optional(),
      replyTo: emailSchema.optional(),
      categories: z.array(z.string()).optional(),
      customArgs: z.record(z.string()).optional()
    }).optional()
  })).min(1, 'At least one email required').max(100, 'Maximum 100 emails per request')
})

export async function POST(request: NextRequest) {
  return handleEmailNotificationRequest(request, {
    schema: bulkEmailSchema,
    rateLimit: RateLimitConfigs.bulk,
    logger,
    transformPayload: validatedData => ({
      notifications: validatedData.emails.map(email => ({
        to: email.to,
        type: email.type,
        templateData: email.templateData || {},
        options: email.options || {}
      })),
      meta: {
        totalRequested: validatedData.emails.length
      }
    }),
    buildSuccessResponse: (context, summary, _ownedEmails, _rateLimitInfo) => {
      const results = summary.deliveries.map(delivery => ({
        to: delivery.payload.to,
        success: delivery.delivery.success,
        messageId: delivery.delivery.messageId,
        error: delivery.delivery.error
      }))

      const successCount = results.filter(result => result.success).length
      const failureCount = results.length - successCount

      context.logger.info('Bulk email send completed', {
        userId: context.user.id,
        totalRequested: summary.meta?.totalRequested ?? results.length,
        totalSent: results.length,
        successfulSends: successCount,
        failedSends: failureCount
      })

      return NextResponse.json({
        success: failureCount === 0,
        results,
        summary: {
          total: results.length,
          successful: successCount,
          failed: failureCount
        }
      })
    },
    handlePermissionDenied: (_context, details) => {
      const totalRequested = details.transformResult.notifications.length
      return NextResponse.json(
        {
          error: 'You are not authorized to send emails to some recipients',
          details: {
            totalRequested,
            authorized: details.ownedEmails.length,
            unauthorized: details.unauthorizedEmails.length
          }
        },
        { status: 403 }
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
