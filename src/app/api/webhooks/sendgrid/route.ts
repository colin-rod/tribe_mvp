import { NextRequest, NextResponse } from 'next/server'
import { createLogger } from '@/lib/logger'
import crypto from 'crypto'
import { getEnv } from '@/lib/env'

const logger = createLogger('SendGridWebhook')

// SendGrid Event Types
export enum SendGridEventType {
  DELIVERED = 'delivered',
  PROCESSED = 'processed',
  DROPPED = 'dropped',
  DEFERRED = 'deferred',
  BOUNCE = 'bounce',
  BLOCKED = 'blocked',
  OPEN = 'open',
  CLICK = 'click',
  SPAM_REPORT = 'spamreport',
  UNSUBSCRIBE = 'unsubscribe',
  GROUP_UNSUBSCRIBE = 'group_unsubscribe',
  GROUP_RESUBSCRIBE = 'group_resubscribe'
}

// SendGrid webhook event structure
export interface SendGridEvent {
  email: string
  timestamp: number
  event: SendGridEventType
  'smtp-id'?: string
  sg_event_id?: string
  sg_message_id?: string
  useragent?: string
  ip?: string
  url?: string
  reason?: string
  status?: string
  response?: string
  attempt?: string
  category?: string[]
  type?: string
  messageId?: string // Our custom message ID from X-Tribe-Message-ID header
  service?: string
}

/**
 * Verify SendGrid webhook signature
 *
 * SendGrid signs webhook requests using ECDSA with SHA256.
 * This prevents webhook spoofing attacks.
 *
 * @see https://docs.sendgrid.com/for-developers/tracking-events/getting-started-event-webhook-security-features
 */
function verifyWebhookSignature(
  payload: string,
  signature: string | null,
  timestamp: string | null,
  publicKey: string
): boolean {
  if (!signature || !timestamp) {
    return false
  }

  try {
    const timestampedPayload = timestamp + payload
    const verify = crypto.createVerify('sha256')
    verify.update(timestampedPayload)
    verify.end()

    const publicKeyFormatted = `-----BEGIN PUBLIC KEY-----\n${publicKey}\n-----END PUBLIC KEY-----`
    return verify.verify(publicKeyFormatted, signature, 'base64')
  } catch (error) {
    logger.error('Webhook signature verification failed', {
      error: error instanceof Error ? error.message : String(error)
    })
    return false
  }
}

/**
 * Handle SendGrid webhook events for email delivery tracking
 *
 * This endpoint receives delivery status updates from SendGrid including:
 * - Delivered: Email successfully delivered
 * - Bounce: Email bounced (hard or soft)
 * - Blocked: Email blocked by recipient server
 * - Dropped: Email dropped by SendGrid (invalid, spam, etc.)
 * - Spam Report: Recipient marked as spam
 * - Unsubscribe: Recipient unsubscribed
 *
 * Security:
 * - Verifies webhook signature to prevent spoofing
 * - Only accepts POST requests
 * - Validates event structure
 *
 * @see https://docs.sendgrid.com/for-developers/tracking-events/event
 */
export async function POST(request: NextRequest) {
  try {
    const env = getEnv()

    // Get raw body for signature verification
    const rawBody = await request.text()

    // Verify webhook signature if public key is configured
    if (env.SENDGRID_WEBHOOK_PUBLIC_KEY) {
      const signature = request.headers.get('x-twilio-email-event-webhook-signature')
      const timestamp = request.headers.get('x-twilio-email-event-webhook-timestamp')

      const isValid = verifyWebhookSignature(
        rawBody,
        signature,
        timestamp,
        env.SENDGRID_WEBHOOK_PUBLIC_KEY
      )

      if (!isValid) {
        logger.error('Invalid webhook signature')
        return NextResponse.json(
          { error: 'Invalid signature' },
          { status: 401 }
        )
      }
    } else {
      logger.warn('SendGrid webhook signature verification skipped - SENDGRID_WEBHOOK_PUBLIC_KEY not configured')
    }

    // Parse events
    const events: SendGridEvent[] = JSON.parse(rawBody)

    if (!Array.isArray(events)) {
      logger.error('Invalid webhook payload - expected array')
      return NextResponse.json(
        { error: 'Invalid payload' },
        { status: 400 }
      )
    }

    // Process each event
    const results = await Promise.all(
      events.map(event => processWebhookEvent(event))
    )

    const successCount = results.filter(r => r.success).length
    const failureCount = results.filter(r => !r.success).length

    logger.info('Webhook batch processed', {
      total: events.length,
      success: successCount,
      failures: failureCount
    })

    return NextResponse.json({
      success: true,
      processed: successCount,
      failed: failureCount
    })
  } catch (error) {
    logger.error('Webhook processing error', {
      error: error instanceof Error ? error.message : String(error)
    })

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * Process individual webhook event
 */
async function processWebhookEvent(event: SendGridEvent): Promise<{ success: boolean; error?: string }> {
  try {
    logger.info('Processing SendGrid event', {
      event: event.event,
      email: event.email,
      messageId: event.messageId || event.sg_message_id,
      timestamp: event.timestamp
    })

    // Extract our custom message ID if available
    const messageId = event.messageId || event.sg_message_id

    // Handle different event types
    switch (event.event) {
      case SendGridEventType.DELIVERED:
        await handleDeliveredEvent(event, messageId)
        break

      case SendGridEventType.BOUNCE:
        await handleBounceEvent(event, messageId)
        break

      case SendGridEventType.BLOCKED:
        await handleBlockedEvent(event, messageId)
        break

      case SendGridEventType.DROPPED:
        await handleDroppedEvent(event, messageId)
        break

      case SendGridEventType.SPAM_REPORT:
        await handleSpamReportEvent(event, messageId)
        break

      case SendGridEventType.UNSUBSCRIBE:
      case SendGridEventType.GROUP_UNSUBSCRIBE:
        await handleUnsubscribeEvent(event, messageId)
        break

      case SendGridEventType.OPEN:
        await handleOpenEvent(event, messageId)
        break

      case SendGridEventType.CLICK:
        await handleClickEvent(event, messageId)
        break

      case SendGridEventType.PROCESSED:
      case SendGridEventType.DEFERRED:
        // Informational events - log only
        logger.debug('Informational event', {
          event: event.event,
          email: event.email
        })
        break

      default:
        logger.warn('Unknown event type', { event: event.event })
    }

    return { success: true }
  } catch (error) {
    logger.error('Event processing failed', {
      event: event.event,
      email: event.email,
      error: error instanceof Error ? error.message : String(error)
    })

    return {
      success: false,
      error: error instanceof Error ? error.message : String(error)
    }
  }
}

/**
 * Handle successful delivery
 */
async function handleDeliveredEvent(event: SendGridEvent, messageId?: string) {
  logger.info('Email delivered successfully', {
    email: event.email,
    messageId,
    timestamp: new Date(event.timestamp * 1000).toISOString()
  })

  // TODO: Update database with delivery status
  // - Mark email as delivered in email_logs table
  // - Update notification status if applicable
}

/**
 * Handle bounce events (hard and soft bounces)
 */
async function handleBounceEvent(event: SendGridEvent, messageId?: string) {
  const bounceType = event.type || 'unknown' // 'bounce' or 'blocked'
  const bounceReason = event.reason || 'Unknown'

  logger.error('Email bounced', {
    email: event.email,
    messageId,
    bounceType,
    reason: bounceReason,
    status: event.status
  })

  // TODO: Update database with bounce status
  // - Mark email as bounced in email_logs table
  // - Add email to suppression list if hard bounce
  // - Consider retrying if soft bounce (already handled by queue)
  // - Update user notification preferences if needed
}

/**
 * Handle blocked events
 */
async function handleBlockedEvent(event: SendGridEvent, messageId?: string) {
  logger.error('Email blocked', {
    email: event.email,
    messageId,
    reason: event.reason
  })

  // TODO: Update database with blocked status
  // - Mark email as blocked in email_logs table
  // - Add email to suppression list
  // - Consider notifying admin if this is unexpected
}

/**
 * Handle dropped events
 */
async function handleDroppedEvent(event: SendGridEvent, messageId?: string) {
  logger.error('Email dropped by SendGrid', {
    email: event.email,
    messageId,
    reason: event.reason
  })

  // TODO: Update database with dropped status
  // - Mark email as dropped in email_logs table
  // - Investigate reason (invalid email, spam, etc.)
  // - Remove from suppression list if correctable
}

/**
 * Handle spam reports
 */
async function handleSpamReportEvent(event: SendGridEvent, messageId?: string) {
  logger.error('Email marked as spam', {
    email: event.email,
    messageId
  })

  // TODO: Update database with spam report
  // - Mark email as spam in email_logs table
  // - Add email to suppression list
  // - Automatically unsubscribe user from future emails
  // - Alert admin for review
}

/**
 * Handle unsubscribe events
 */
async function handleUnsubscribeEvent(event: SendGridEvent, messageId?: string) {
  logger.info('User unsubscribed', {
    email: event.email,
    messageId
  })

  // TODO: Update database with unsubscribe
  // - Update user notification preferences to disable all emails
  // - Add to unsubscribe list
  // - Remove from active recipient lists
}

/**
 * Handle email open events (if tracking enabled)
 */
async function handleOpenEvent(event: SendGridEvent, messageId?: string) {
  logger.debug('Email opened', {
    email: event.email,
    messageId,
    userAgent: event.useragent,
    ip: event.ip
  })

  // TODO: Track email opens for engagement metrics
  // - Increment open count in email_logs table
  // - Update last_opened_at timestamp
  // - Track engagement score for future optimization
}

/**
 * Handle link click events (if tracking enabled)
 */
async function handleClickEvent(event: SendGridEvent, messageId?: string) {
  logger.debug('Email link clicked', {
    email: event.email,
    messageId,
    url: event.url,
    userAgent: event.useragent,
    ip: event.ip
  })

  // TODO: Track email clicks for engagement metrics
  // - Increment click count in email_logs table
  // - Track which links are clicked most
  // - Update engagement score for future optimization
}

// Prevent caching of webhook responses
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
