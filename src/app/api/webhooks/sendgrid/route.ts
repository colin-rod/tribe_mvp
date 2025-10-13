import { NextRequest, NextResponse } from 'next/server'
import { createLogger } from '@/lib/logger'
import crypto from 'crypto'
import { getEnv, type Env } from '@/lib/env'
import { trackSecurityIncident } from '@/lib/monitoring/securityIncidentTracker'
import { createClient as createSupabaseClient, type SupabaseClient } from '@supabase/supabase-js'

const logger = createLogger('SendGridWebhook')

type ServiceRoleClient = SupabaseClient<any, 'public', any>

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
    const message = error instanceof Error ? error.message : String(error)
    logger.error('Webhook signature verification failed', {
      error: message
    })
    trackSecurityIncident({
      type: 'sendgrid_webhook_signature_verification_error',
      severity: 'high',
      source: 'sendgrid_webhook',
      description: 'Exception thrown during SendGrid webhook signature verification',
      metadata: {
        error: message
      }
    })
    return false
  }
}

function createServiceRoleClient(env: Env): ServiceRoleClient | null {
  const supabaseUrl = env.SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    logger.error('Supabase service role configuration missing for SendGrid webhook', {
      hasUrl: !!supabaseUrl,
      hasServiceRoleKey: !!serviceRoleKey
    })
    return null
  }

  try {
    return createSupabaseClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }) as ServiceRoleClient
  } catch (error) {
    logger.error('Failed to create Supabase service role client for SendGrid webhook', {
      error: error instanceof Error ? error.message : String(error)
    })
    return null
  }
}

function resolveMessageIdentifier(event: SendGridEvent, explicit?: string): string | null {
  return explicit || event.sg_message_id || event['smtp-id'] || null
}

function toIsoTimestamp(epochSeconds?: number): string {
  if (!epochSeconds) {
    return new Date().toISOString()
  }

  return new Date(epochSeconds * 1000).toISOString()
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
    const isProduction = env.NODE_ENV === 'production'
    const relaxedValidation = env.SENDGRID_WEBHOOK_RELAXED_VALIDATION

    // Get raw body for signature verification
    const rawBody = await request.text()

    // Verify webhook signature if public key is configured
    if (env.SENDGRID_WEBHOOK_PUBLIC_KEY) {
      const signature = request.headers.get('x-twilio-email-event-webhook-signature')
      const timestamp = request.headers.get('x-twilio-email-event-webhook-timestamp')

      if (!signature || !timestamp) {
        logger.error('Missing SendGrid webhook signature headers', {
          hasSignature: !!signature,
          hasTimestamp: !!timestamp
        })
        trackSecurityIncident({
          type: 'sendgrid_webhook_missing_signature_headers',
          severity: 'high',
          source: 'sendgrid_webhook',
          description: 'SendGrid webhook request missing signature headers',
          metadata: {
            hasSignature: !!signature,
            hasTimestamp: !!timestamp
          }
        })

        return NextResponse.json(
          { error: 'Invalid signature' },
          { status: 401 }
        )
      }

      const isValid = verifyWebhookSignature(
        rawBody,
        signature,
        timestamp,
        env.SENDGRID_WEBHOOK_PUBLIC_KEY
      )

      if (!isValid) {
        logger.error('Invalid webhook signature')
        trackSecurityIncident({
          type: 'sendgrid_webhook_invalid_signature',
          severity: 'high',
          source: 'sendgrid_webhook',
          description: 'SendGrid webhook signature verification failed',
          metadata: {
            signatureLength: signature.length,
            timestamp
          }
        })

        return NextResponse.json(
          { error: 'Invalid signature' },
          { status: 401 }
        )
      }
    } else {
      if (isProduction && !relaxedValidation) {
        logger.error('SendGrid webhook signature verification blocked - public key missing in production')
        trackSecurityIncident({
          type: 'sendgrid_webhook_missing_public_key',
          severity: 'critical',
          source: 'sendgrid_webhook',
          description: 'SENDGRID_WEBHOOK_PUBLIC_KEY is missing in production environment'
        })

        return NextResponse.json(
          { error: 'SendGrid webhook verification misconfigured' },
          { status: 401 }
        )
      }

      logger.warn('SendGrid webhook signature verification skipped - SENDGRID_WEBHOOK_PUBLIC_KEY not configured', {
        environment: env.NODE_ENV,
        relaxedValidation
      })
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

    const supabase = createServiceRoleClient(env)

    // Process each event
    const results = await Promise.all(
      events.map(event => processWebhookEvent(event, supabase))
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
async function processWebhookEvent(
  event: SendGridEvent,
  supabase: ServiceRoleClient | null
): Promise<{ success: boolean; error?: string }> {
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
        await handleDeliveredEvent(event, messageId, supabase)
        break

      case SendGridEventType.BOUNCE:
        await handleBounceEvent(event, messageId, supabase)
        break

      case SendGridEventType.BLOCKED:
        await handleBlockedEvent(event, messageId, supabase)
        break

      case SendGridEventType.DROPPED:
        await handleDroppedEvent(event, messageId, supabase)
        break

      case SendGridEventType.SPAM_REPORT:
        await handleSpamReportEvent(event, messageId, supabase)
        break

      case SendGridEventType.UNSUBSCRIBE:
      case SendGridEventType.GROUP_UNSUBSCRIBE:
        await handleUnsubscribeEvent(event, messageId, supabase)
        break

      case SendGridEventType.OPEN:
        await handleOpenEvent(event, messageId, supabase)
        break

      case SendGridEventType.CLICK:
        await handleClickEvent(event, messageId, supabase)
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
async function handleDeliveredEvent(
  event: SendGridEvent,
  messageId: string | undefined,
  supabase: ServiceRoleClient | null
) {
  logger.info('Email delivered successfully', {
    email: event.email,
    messageId,
    timestamp: new Date(event.timestamp * 1000).toISOString()
  })

  const identifier = resolveMessageIdentifier(event, messageId)
  const eventTimestamp = toIsoTimestamp(event.timestamp)

  await Promise.all([
    upsertEmailLog(supabase, identifier, event.email, {
      status: 'delivered',
      delivered_at: eventTimestamp,
      last_event_at: eventTimestamp,
      last_event_type: event.event
    }, {
      metadata: {
        delivered_response: event.response || null,
        smtp_id: event['smtp-id'] || null
      }
    }),
    updateNotificationDeliveryLog(supabase, identifier, {
      status: 'delivered',
      delivery_time: eventTimestamp,
      error_message: null,
      error_code: null,
      provider_response: event
    })
  ])
}

/**
 * Handle bounce events (hard and soft bounces)
 */
async function handleBounceEvent(
  event: SendGridEvent,
  messageId: string | undefined,
  supabase: ServiceRoleClient | null
) {
  const bounceType = event.type || 'unknown' // 'bounce' or 'blocked'
  const bounceReason = event.reason || 'Unknown'

  logger.error('Email bounced', {
    email: event.email,
    messageId,
    bounceType,
    reason: bounceReason,
    status: event.status
  })

  const identifier = resolveMessageIdentifier(event, messageId)
  const eventTimestamp = toIsoTimestamp(event.timestamp)
  const metadata = {
    bounce_reason: bounceReason,
    bounce_status: event.status || null,
    bounce_type: bounceType
  }

  await Promise.all([
    upsertEmailLog(supabase, identifier, event.email, {
      status: 'bounced',
      bounced_at: eventTimestamp,
      last_event_at: eventTimestamp,
      last_event_type: event.event
    }, { metadata }),
    updateNotificationDeliveryLog(supabase, identifier, {
      status: 'failed',
      delivery_time: eventTimestamp,
      error_message: bounceReason,
      error_code: event.status || null,
      provider_response: event
    })
  ])

  await disableEmailChannelForRecipient(supabase, event.email, {
    reason: 'bounce',
    occurred_at: eventTimestamp,
    message_id: identifier
  })
}

/**
 * Handle blocked events
 */
async function handleBlockedEvent(
  event: SendGridEvent,
  messageId: string | undefined,
  supabase: ServiceRoleClient | null
) {
  logger.error('Email blocked', {
    email: event.email,
    messageId,
    reason: event.reason
  })

  const identifier = resolveMessageIdentifier(event, messageId)
  const eventTimestamp = toIsoTimestamp(event.timestamp)
  const reason = event.reason || 'Blocked by provider'

  await Promise.all([
    upsertEmailLog(supabase, identifier, event.email, {
      status: 'blocked',
      blocked_at: eventTimestamp,
      last_event_at: eventTimestamp,
      last_event_type: event.event
    }, {
      metadata: {
        block_reason: reason
      }
    }),
    updateNotificationDeliveryLog(supabase, identifier, {
      status: 'failed',
      delivery_time: eventTimestamp,
      error_message: reason,
      error_code: event.status || null,
      provider_response: event
    })
  ])

  await disableEmailChannelForRecipient(supabase, event.email, {
    reason: 'blocked',
    occurred_at: eventTimestamp,
    message_id: identifier
  })
}

/**
 * Handle dropped events
 */
async function handleDroppedEvent(
  event: SendGridEvent,
  messageId: string | undefined,
  supabase: ServiceRoleClient | null
) {
  logger.error('Email dropped by SendGrid', {
    email: event.email,
    messageId,
    reason: event.reason
  })

  const identifier = resolveMessageIdentifier(event, messageId)
  const eventTimestamp = toIsoTimestamp(event.timestamp)
  const reason = event.reason || 'Dropped by provider'

  await Promise.all([
    upsertEmailLog(supabase, identifier, event.email, {
      status: 'dropped',
      dropped_at: eventTimestamp,
      last_event_at: eventTimestamp,
      last_event_type: event.event
    }, {
      metadata: {
        drop_reason: reason
      }
    }),
    updateNotificationDeliveryLog(supabase, identifier, {
      status: 'failed',
      delivery_time: eventTimestamp,
      error_message: reason,
      error_code: event.status || null,
      provider_response: event
    })
  ])

  await disableEmailChannelForRecipient(supabase, event.email, {
    reason: 'dropped',
    occurred_at: eventTimestamp,
    message_id: identifier
  })
}

/**
 * Handle spam reports
 */
async function handleSpamReportEvent(
  event: SendGridEvent,
  messageId: string | undefined,
  supabase: ServiceRoleClient | null
) {
  logger.error('Email marked as spam', {
    email: event.email,
    messageId
  })

  const identifier = resolveMessageIdentifier(event, messageId)
  const eventTimestamp = toIsoTimestamp(event.timestamp)

  await Promise.all([
    upsertEmailLog(supabase, identifier, event.email, {
      status: 'spam_reported',
      spam_reported_at: eventTimestamp,
      last_event_at: eventTimestamp,
      last_event_type: event.event
    }, {
      metadata: {
        spam_reported: true,
        spam_metadata: {
          useragent: event.useragent || null,
          ip: event.ip || null
        }
      }
    }),
    updateNotificationDeliveryLog(supabase, identifier, {
      status: 'spam_reported',
      delivery_time: eventTimestamp,
      error_message: 'Recipient reported spam',
      error_code: null,
      provider_response: event
    })
  ])

  await disableEmailChannelForRecipient(supabase, event.email, {
    reason: 'spam_report',
    occurred_at: eventTimestamp,
    message_id: identifier
  })
}

/**
 * Handle unsubscribe events
 */
async function handleUnsubscribeEvent(
  event: SendGridEvent,
  messageId: string | undefined,
  supabase: ServiceRoleClient | null
) {
  logger.info('User unsubscribed', {
    email: event.email,
    messageId
  })

  const identifier = resolveMessageIdentifier(event, messageId)
  const eventTimestamp = toIsoTimestamp(event.timestamp)

  await Promise.all([
    upsertEmailLog(supabase, identifier, event.email, {
      status: 'unsubscribed',
      unsubscribed_at: eventTimestamp,
      last_event_at: eventTimestamp,
      last_event_type: event.event
    }, {
      metadata: {
        unsubscribe_source: event.event
      }
    }),
    updateNotificationDeliveryLog(supabase, identifier, {
      status: 'unsubscribed',
      delivery_time: eventTimestamp,
      error_message: null,
      error_code: null,
      provider_response: event
    })
  ])

  await disableEmailChannelForRecipient(supabase, event.email, {
    reason: 'unsubscribe',
    occurred_at: eventTimestamp,
    message_id: identifier
  })
}

/**
 * Handle email open events (if tracking enabled)
 */
async function handleOpenEvent(
  event: SendGridEvent,
  messageId: string | undefined,
  supabase: ServiceRoleClient | null
) {
  logger.debug('Email opened', {
    email: event.email,
    messageId,
    userAgent: event.useragent,
    ip: event.ip
  })

  const identifier = resolveMessageIdentifier(event, messageId)
  const eventTimestamp = toIsoTimestamp(event.timestamp)

  await Promise.all([
    upsertEmailLog(supabase, identifier, event.email, {
      last_opened_at: eventTimestamp,
      last_event_at: eventTimestamp,
      last_event_type: event.event
    }, {
      incrementOpen: true,
      metadata: {
        last_open_ip: event.ip || null,
        last_open_user_agent: event.useragent || null
      }
    }),
    updateNotificationDeliveryLog(supabase, identifier, {
      status: 'opened',
      delivery_time: eventTimestamp,
      provider_response: event
    })
  ])
}

/**
 * Handle link click events (if tracking enabled)
 */
async function handleClickEvent(
  event: SendGridEvent,
  messageId: string | undefined,
  supabase: ServiceRoleClient | null
) {
  logger.debug('Email link clicked', {
    email: event.email,
    messageId,
    url: event.url,
    userAgent: event.useragent,
    ip: event.ip
  })

  const identifier = resolveMessageIdentifier(event, messageId)
  const eventTimestamp = toIsoTimestamp(event.timestamp)

  await Promise.all([
    upsertEmailLog(supabase, identifier, event.email, {
      last_clicked_at: eventTimestamp,
      last_clicked_url: event.url || null,
      last_event_at: eventTimestamp,
      last_event_type: event.event
    }, {
      incrementClick: true,
      metadata: {
        last_click_ip: event.ip || null,
        last_click_user_agent: event.useragent || null,
        last_clicked_url: event.url || null
      }
    }),
    updateNotificationDeliveryLog(supabase, identifier, {
      status: 'clicked',
      delivery_time: eventTimestamp,
      provider_response: event
    })
  ])
}

function isSupabaseNoRowError(error: { code?: string } | null | undefined) {
  return error?.code === 'PGRST116'
}

function mergeMetadata(
  current: unknown,
  updates: Record<string, unknown> | undefined
): Record<string, unknown> | undefined {
  if (!updates) {
    return undefined
  }

  if (current && typeof current === 'object' && !Array.isArray(current)) {
    return { ...(current as Record<string, unknown>), ...updates }
  }

  return updates
}

async function upsertEmailLog(
  supabase: ServiceRoleClient | null,
  messageId: string | null,
  recipientEmail: string,
  updates: Record<string, unknown>,
  options?: {
    metadata?: Record<string, unknown>
    incrementOpen?: boolean
    incrementClick?: boolean
  }
) {
  if (!supabase) {
    logger.warn('Supabase client unavailable - skipping email log update')
    return
  }

  if (!messageId) {
    logger.warn('Missing message identifier for email log update', {
      recipientEmail
    })
    return
  }

  const payload: Record<string, unknown> = {
    message_id: messageId,
    recipient_email: recipientEmail,
    updated_at: new Date().toISOString(),
    ...updates
  }

  let existingLog: any | null = null

  if (options?.incrementOpen || options?.incrementClick || options?.metadata) {
    const { data, error } = await supabase
      .from('email_logs')
      .select('id, open_count, click_count, metadata')
      .eq('message_id', messageId)
      .maybeSingle()

    if (error && !isSupabaseNoRowError(error)) {
      throw new Error(`Failed to fetch email log: ${error.message}`)
    }

    existingLog = data ?? null

    if (existingLog?.id) {
      payload.id = existingLog.id
    }

    if (options?.incrementOpen) {
      const currentOpen = existingLog?.open_count ?? 0
      payload.open_count = currentOpen + 1
    }

    if (options?.incrementClick) {
      const currentClick = existingLog?.click_count ?? 0
      payload.click_count = currentClick + 1
    }

    const mergedMetadata = mergeMetadata(existingLog?.metadata, options?.metadata)
    if (mergedMetadata) {
      payload.metadata = mergedMetadata
    }
  }

  const { error: upsertError } = await supabase
    .from('email_logs')
    .upsert(payload, { onConflict: 'message_id' })

  if (upsertError) {
    throw new Error(`Failed to update email log: ${upsertError.message}`)
  }
}

async function updateNotificationDeliveryLog(
  supabase: ServiceRoleClient | null,
  messageId: string | null,
  updates: Record<string, unknown>
) {
  if (!supabase) {
    logger.warn('Supabase client unavailable - skipping notification delivery log update')
    return
  }

  if (!messageId) {
    logger.warn('Missing message identifier for notification delivery log update')
    return
  }

  const payload: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(updates)) {
    if (value !== undefined) {
      payload[key] = value
    }
  }

  if (Object.keys(payload).length === 0) {
    return
  }

  const { data, error } = await supabase
    .from('notification_delivery_logs')
    .update(payload)
    .eq('provider_message_id', messageId)
    .select('id')

  if (error) {
    throw new Error(`Failed to update notification delivery log: ${error.message}`)
  }

  if (!data || data.length === 0) {
    logger.warn('No notification delivery logs updated for message', {
      messageId
    })
  }
}

async function disableEmailChannelForRecipient(
  supabase: ServiceRoleClient | null,
  email: string | undefined,
  context: { reason: string; occurred_at: string; message_id: string | null }
) {
  if (!supabase) {
    logger.warn('Supabase client unavailable - skipping recipient preference update')
    return
  }

  if (!email) {
    logger.warn('No recipient email provided for preference update')
    return
  }

  const { data: recipient, error } = await supabase
    .from('recipients')
    .select('id, preferred_channels, is_active')
    .eq('email', email)
    .maybeSingle()

  if (error && !isSupabaseNoRowError(error)) {
    throw new Error(`Failed to fetch recipient preferences: ${error.message}`)
  }

  if (!recipient) {
    logger.warn('Recipient not found for email preference update', {
      email,
      reason: context.reason
    })
    return
  }

  const preferredChannels: string[] = Array.isArray(recipient.preferred_channels)
    ? recipient.preferred_channels
    : []

  const updatedChannels = preferredChannels.filter(channel => channel !== 'email')

  const { error: updateError } = await supabase
    .from('recipients')
    .update({
      preferred_channels: updatedChannels,
      is_active: false
    })
    .eq('id', recipient.id)

  if (updateError) {
    throw new Error(`Failed to update recipient preferences: ${updateError.message}`)
  }

  logger.info('Recipient email channel disabled', {
    email,
    reason: context.reason,
    messageId: context.message_id,
    occurredAt: context.occurred_at
  })
}

// Prevent caching of webhook responses
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
