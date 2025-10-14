import { NextRequest, NextResponse } from 'next/server'
import { serverEmailService } from '@/lib/services/serverEmailService'
import { z } from 'zod'
import { createLogger } from '@/lib/logger'
import { requireAuth, verifyNotificationPermissions } from '@/lib/middleware/authorization'
import { checkRateLimit } from '@/lib/middleware/rateLimiting'

const logger = createLogger('NotificationBulkEmailAPI')

const bulkEmailSchema = z.object({
  emails: z.array(z.object({
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
  })).min(1, 'At least one email required').max(100, 'Maximum 100 emails per request')
})

export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const body = await request.json()
    const validatedData = bulkEmailSchema.parse(body)

    // Check authentication
    const authResult = await requireAuth(request)
    if (authResult instanceof NextResponse) {
      return authResult
    }
    const { user } = authResult

    // Check rate limiting - stricter for bulk emails
    const rateLimitResult = checkRateLimit(request, { maxRequests: 100, windowMinutes: 60 }, user.id)
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

    // Extract all recipient emails
    const recipientEmails = validatedData.emails.map(email => email.to)

    // Verify user can send emails to all recipients
    const { allowed, ownedEmails } = await verifyNotificationPermissions(user.id, recipientEmails)
    if (!allowed) {
      const unauthorizedEmails = recipientEmails.filter(email => !ownedEmails.includes(email.toLowerCase()))
      logger.warn('Unauthorized bulk email send attempt', {
        userId: user.id,
        totalRequested: recipientEmails.length,
        authorized: ownedEmails.length,
        unauthorizedEmails
      })
      return NextResponse.json(
        {
          error: 'You are not authorized to send emails to some recipients',
          details: {
            totalRequested: recipientEmails.length,
            authorized: ownedEmails.length,
            unauthorized: unauthorizedEmails.length
          }
        },
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

    // Email options will be handled by sendTemplatedEmail

    // Send emails in batches using the individual email method
    // Only send to authorized emails
    const authorizedEmails = validatedData.emails.filter(email =>
      ownedEmails.includes(email.to.toLowerCase())
    )

    const results = []
    for (const emailData of authorizedEmails) {
      try {
        const result = await serverEmailService.sendTemplatedEmail(
          emailData.to,
          emailData.type,
          emailData.templateData || {},
          emailData.options || {}
        )
        results.push({
          to: emailData.to,
          success: result.success,
          messageId: result.messageId,
          error: result.error
        })
      } catch (error) {
        results.push({
          to: emailData.to,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        })
      }
    }

    // Log security event for audit trail
    logger.info('Bulk email send completed', {
      userId: user.id,
      totalRequested: validatedData.emails.length,
      totalSent: authorizedEmails.length,
      successfulSends: results.filter(r => r.success).length
    })

    const successCount = results.filter(r => r.success).length
    const failureCount = results.length - successCount

    const response = NextResponse.json({
      success: failureCount === 0,
      results,
      summary: {
        total: results.length,
        successful: successCount,
        failed: failureCount
      }
    })

    response.headers.set('X-RateLimit-Limit', rateLimitResult.info.total.toString())
    response.headers.set('X-RateLimit-Remaining', rateLimitResult.info.remaining.toString())
    response.headers.set('X-RateLimit-Reset', Math.ceil(rateLimitResult.info.resetTime / 1000).toString())

    return response

  } catch (error) {
    logger.errorWithStack('Send bulk emails API error', error as Error)

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