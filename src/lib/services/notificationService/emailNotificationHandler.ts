import { NextRequest, NextResponse } from 'next/server'
import { ZodError, ZodSchema } from 'zod'
import { requireAuth, verifyNotificationPermissions, type AuthenticatedUser } from '@/lib/middleware/authorization'
import { checkRateLimit, type RateLimitConfig, type RateLimitInfo } from '@/lib/middleware/rateLimiting'
import { serverEmailService } from '@/lib/services/serverEmailService'
import type { EmailDeliveryResult, EmailOptions } from '@/lib/types/email'

type NotificationLogger = {
  info: (message: string, context?: Record<string, unknown>) => void
  warn: (message: string, context?: Record<string, unknown>) => void
  errorWithStack: (message: string, error: Error, context?: Record<string, unknown>) => void
}

export type NotificationEmailType = 'response' | 'prompt' | 'digest' | 'system' | 'preference'

export interface NotificationEmailPayload {
  to: string
  type: NotificationEmailType
  templateData?: Record<string, unknown>
  options?: Partial<EmailOptions>
}

export interface NotificationTransformResult<TMeta = undefined> {
  notifications: NotificationEmailPayload[]
  meta?: TMeta
}

export interface NotificationDispatchResult {
  payload: NotificationEmailPayload
  delivery: EmailDeliveryResult
}

export interface NotificationDispatchSummary<TMeta = undefined> {
  deliveries: NotificationDispatchResult[]
  meta?: TMeta
}

export interface NotificationRouteContext {
  request: NextRequest
  user: AuthenticatedUser
  logger: NotificationLogger
}

interface PermissionDeniedDetails<TMeta> {
  transformResult: NotificationTransformResult<TMeta>
  ownedEmails: string[]
  unauthorizedEmails: string[]
  rateLimitInfo: RateLimitInfo
}

interface NotificationRouteOptions<TInput, TMeta = undefined> {
  schema: ZodSchema<TInput>
  rateLimit: RateLimitConfig
  logger: NotificationLogger
  transformPayload: (
    data: TInput,
    context: NotificationRouteContext
  ) => Promise<NotificationTransformResult<TMeta>> | NotificationTransformResult<TMeta>
  buildSuccessResponse: (
    context: NotificationRouteContext,
    summary: NotificationDispatchSummary<TMeta>,
    ownedEmails: string[],
    rateLimitInfo: RateLimitInfo
  ) => NextResponse
  handlePermissionDenied?: (
    context: NotificationRouteContext,
    details: PermissionDeniedDetails<TMeta>
  ) => NextResponse
}

function buildRateLimitExceededResponse(info: RateLimitInfo): NextResponse {
  const retryAfter = Math.max(0, Math.ceil((info.resetTime - Date.now()) / 1000))

  const response = NextResponse.json(
    {
      error: 'Rate limit exceeded. Please try again later.',
      details: {
        limit: info.total,
        remaining: info.remaining,
        resetTime: new Date(info.resetTime).toISOString(),
        retryAfter
      }
    },
    {
      status: 429
    }
  )

  response.headers.set('X-RateLimit-Limit', info.total.toString())
  response.headers.set('X-RateLimit-Remaining', info.remaining.toString())
  response.headers.set('X-RateLimit-Reset', Math.ceil(info.resetTime / 1000).toString())
  response.headers.set('Retry-After', retryAfter.toString())

  return response
}

function applyRateLimitHeaders(response: NextResponse, info: RateLimitInfo): NextResponse {
  response.headers.set('X-RateLimit-Limit', info.total.toString())
  response.headers.set('X-RateLimit-Remaining', info.remaining.toString())
  response.headers.set('X-RateLimit-Reset', Math.ceil(info.resetTime / 1000).toString())
  return response
}

export async function handleEmailNotificationRequest<TInput, TMeta = undefined>(
  request: NextRequest,
  options: NotificationRouteOptions<TInput, TMeta>
): Promise<NextResponse> {
  const { schema, rateLimit, logger, transformPayload, buildSuccessResponse, handlePermissionDenied } = options

  try {
    const body = await request.json()
    const parsed = schema.parse(body)

    const authResult = await requireAuth(request)
    if (authResult instanceof NextResponse) {
      return authResult
    }

    const { user } = authResult
    const context: NotificationRouteContext = { request, user, logger }

    const rateLimitResult = checkRateLimit(request, rateLimit, user.id)
    if (!rateLimitResult.allowed) {
      return buildRateLimitExceededResponse(rateLimitResult.info)
    }

    const transformResult = await transformPayload(parsed, context)

    if (!transformResult.notifications.length) {
      const response = NextResponse.json(
        { error: 'No notification payload provided' },
        { status: 400 }
      )
      return applyRateLimitHeaders(response, rateLimitResult.info)
    }

    const recipientEmails = transformResult.notifications.map(notification => notification.to)
    const permissionResult = await verifyNotificationPermissions(user.id, recipientEmails)

    if (!permissionResult.allowed) {
      const ownedSet = new Set(permissionResult.ownedEmails.map(email => email.toLowerCase()))
      const unauthorizedEmails = transformResult.notifications
        .map(notification => notification.to)
        .filter(email => !ownedSet.has(email.toLowerCase()))

      logger.warn('Unauthorized notification email attempt', {
        userId: user.id,
        requestedEmails: recipientEmails,
        authorized: permissionResult.ownedEmails.length,
        unauthorizedEmails
      })

      const response = handlePermissionDenied
        ? handlePermissionDenied(context, {
            transformResult,
            ownedEmails: permissionResult.ownedEmails,
            unauthorizedEmails,
            rateLimitInfo: rateLimitResult.info
          })
        : NextResponse.json(
            { error: 'You are not authorized to send emails to these recipients' },
            { status: 403 }
          )

      return applyRateLimitHeaders(response, rateLimitResult.info)
    }

    if (!serverEmailService.isConfigured()) {
      const response = NextResponse.json(
        { error: 'Email service not properly configured' },
        { status: 500 }
      )
      return applyRateLimitHeaders(response, rateLimitResult.info)
    }

    const deliveries: NotificationDispatchResult[] = []

    for (const payload of transformResult.notifications) {
      try {
        const delivery = await serverEmailService.sendTemplatedEmail(
          payload.to,
          payload.type,
          payload.templateData || {},
          payload.options || {}
        )

        deliveries.push({ payload, delivery })
      } catch (error) {
        logger.errorWithStack('Failed to dispatch notification email', error as Error, {
          userId: user.id,
          recipient: payload.to,
          type: payload.type
        })

        deliveries.push({
          payload,
          delivery: {
            success: false,
            error: 'Internal server error',
            statusCode: 500
          }
        })
      }
    }

    const summary: NotificationDispatchSummary<TMeta> = {
      deliveries,
      meta: transformResult.meta
    }

    const response = buildSuccessResponse(context, summary, permissionResult.ownedEmails, rateLimitResult.info)

    return applyRateLimitHeaders(response, rateLimitResult.info)
  } catch (error) {
    logger.errorWithStack('Notification email handler error', error as Error)

    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.issues },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
