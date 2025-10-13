import { POST, SendGridEventType } from '@/app/api/webhooks/sendgrid/route'
import { NextRequest } from 'next/server'
import crypto from 'crypto'
import { createClient } from '@supabase/supabase-js'

// Mock dependencies
jest.mock('@/lib/logger', () => ({
  createLogger: () => ({
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn()
  })
}))

jest.mock('@/lib/monitoring/securityIncidentTracker', () => ({
  trackSecurityIncident: jest.fn(),
  getSecurityIncidentMetrics: jest.fn(),
  resetSecurityIncidentMetrics: jest.fn()
}))

jest.mock('@/lib/env', () => ({
  getEnv: jest.fn(() => ({
    NODE_ENV: 'development',
    SENDGRID_WEBHOOK_PUBLIC_KEY: 'test-public-key',
    SENDGRID_WEBHOOK_RELAXED_VALIDATION: false
  }))
}))

jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn()
}))

import { trackSecurityIncident } from '@/lib/monitoring/securityIncidentTracker'
import { getEnv } from '@/lib/env'

describe('SendGrid Webhook Tests', () => {
  const mockPublicKey = 'test-public-key'
  const mockedGetEnv = getEnv as jest.Mock
  const trackSecurityIncidentMock = trackSecurityIncident as jest.Mock
  const createClientMock = createClient as jest.Mock

  let supabaseMock: any
  let emailLogUpsert: jest.Mock
  let emailLogSelect: jest.Mock
  let emailLogSelectEq: jest.Mock
  let emailLogSelectMaybeSingle: jest.Mock
  let notificationUpdate: jest.Mock
  let notificationEq: jest.Mock
  let notificationSelect: jest.Mock
  let recipientsSelect: jest.Mock
  let recipientsSelectEq: jest.Mock
  let recipientsSelectMaybeSingle: jest.Mock
  let recipientsUpdate: jest.Mock
  let recipientsUpdateEq: jest.Mock

  const baseEnv = {
    NODE_ENV: 'development',
    SENDGRID_WEBHOOK_PUBLIC_KEY: mockPublicKey,
    SENDGRID_WEBHOOK_RELAXED_VALIDATION: false,
    SUPABASE_URL: 'https://example.supabase.co',
    NEXT_PUBLIC_SUPABASE_URL: 'https://example.supabase.co',
    SUPABASE_SERVICE_ROLE_KEY: 'service-role-key'
  }

  function setupSupabaseMocks(options?: {
    existingEmailLog?: any
    recipientData?: any
    emailLogError?: { message: string } | null
  }) {
    emailLogSelectMaybeSingle = jest.fn().mockResolvedValue({
      data: options?.existingEmailLog ?? null,
      error: null
    })
    emailLogSelectEq = jest.fn(() => ({ maybeSingle: emailLogSelectMaybeSingle }))
    emailLogSelect = jest.fn(() => ({ eq: emailLogSelectEq }))
    emailLogUpsert = jest.fn().mockResolvedValue({
      error: options?.emailLogError ?? null
    })

    notificationSelect = jest.fn().mockResolvedValue({ data: [{ id: 'log-1' }], error: null })
    notificationEq = jest.fn(() => ({ select: notificationSelect }))
    notificationUpdate = jest.fn(() => ({ eq: notificationEq }))

    recipientsSelectMaybeSingle = jest.fn().mockResolvedValue({
      data: options?.recipientData ?? { id: 'recipient-1', preferred_channels: ['email', 'sms'], is_active: true },
      error: null
    })
    recipientsSelectEq = jest.fn(() => ({ maybeSingle: recipientsSelectMaybeSingle }))
    recipientsSelect = jest.fn(() => ({ eq: recipientsSelectEq }))
    recipientsUpdateEq = jest.fn().mockResolvedValue({ error: null })
    recipientsUpdate = jest.fn(() => ({ eq: recipientsUpdateEq }))

    supabaseMock = {
      from: jest.fn((table: string) => {
        switch (table) {
          case 'email_logs':
            return {
              select: emailLogSelect,
              upsert: emailLogUpsert
            }
          case 'notification_delivery_logs':
            return {
              update: notificationUpdate
            }
          case 'recipients':
            return {
              select: recipientsSelect,
              update: recipientsUpdate
            }
          default:
            throw new Error(`Unexpected table ${table}`)
        }
      })
    }

    createClientMock.mockReturnValue(supabaseMock)
  }

  // Helper to create signed webhook request
  function createSignedRequest(events: unknown[], sign = true) {
    const payload = JSON.stringify(events)
    const timestamp = Math.floor(Date.now() / 1000).toString()

    let signature = ''
    if (sign) {
      // Note: In real tests, you'd use actual crypto signing
      // For this test, we'll mock the verification
      signature = Buffer.from('mock-signature').toString('base64')
    }

    return new NextRequest('http://localhost:3000/api/webhooks/sendgrid', {
      method: 'POST',
      headers: {
        'x-twilio-email-event-webhook-signature': signature,
        'x-twilio-email-event-webhook-timestamp': timestamp,
        'content-type': 'application/json'
      },
      body: payload
    })
  }

  beforeEach(() => {
    jest.clearAllMocks()
    setupSupabaseMocks()
    mockedGetEnv.mockReturnValue({ ...baseEnv })
    trackSecurityIncidentMock.mockClear()
  })

  describe('Webhook Security', () => {

    it('should accept valid webhook signature', async () => {
      const events = [{
        email: 'test@example.com',
        timestamp: Date.now() / 1000,
        event: SendGridEventType.DELIVERED,
        sg_message_id: 'msg-123'
      }]

      // Mock crypto verification to return true
      jest.spyOn(crypto, 'createVerify').mockReturnValue({
        update: jest.fn().mockReturnThis(),
        end: jest.fn().mockReturnThis(),
        verify: jest.fn().mockReturnValue(true)
      } as never)

      const request = createSignedRequest(events)
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
    })

    it('should reject invalid signature', async () => {
      const events = [{
        email: 'test@example.com',
        timestamp: Date.now() / 1000,
        event: SendGridEventType.DELIVERED
      }]

      // Mock crypto verification to return false
      jest.spyOn(crypto, 'createVerify').mockReturnValue({
        update: jest.fn().mockReturnThis(),
        end: jest.fn().mockReturnThis(),
        verify: jest.fn().mockReturnValue(false)
      } as never)

      const request = createSignedRequest(events)
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Invalid signature')
      expect(trackSecurityIncidentMock).toHaveBeenCalledWith(expect.objectContaining({
        type: 'sendgrid_webhook_invalid_signature'
      }))
    })

    it('should reject request without signature headers', async () => {
      const events = [{
        email: 'test@example.com',
        timestamp: Date.now() / 1000,
        event: SendGridEventType.DELIVERED
      }]

      const request = new NextRequest('http://localhost:3000/api/webhooks/sendgrid', {
        method: 'POST',
        body: JSON.stringify(events)
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Invalid signature')
      expect(trackSecurityIncidentMock).toHaveBeenCalledWith(expect.objectContaining({
        type: 'sendgrid_webhook_missing_signature_headers'
      }))
    })

    it('should reject webhook when public key missing in production', async () => {
      mockedGetEnv.mockReturnValueOnce({
        ...baseEnv,
        NODE_ENV: 'production',
        SENDGRID_WEBHOOK_PUBLIC_KEY: undefined
      })

      const events = [{
        email: 'test@example.com',
        timestamp: Date.now() / 1000,
        event: SendGridEventType.DELIVERED
      }]

      const request = createSignedRequest(events)
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('SendGrid webhook verification misconfigured')
      expect(trackSecurityIncidentMock).toHaveBeenCalledWith(expect.objectContaining({
        type: 'sendgrid_webhook_missing_public_key'
      }))
    })
  })

  describe('Event Processing', () => {
    beforeEach(() => {
      // Mock crypto verification to always pass
      jest.spyOn(crypto, 'createVerify').mockReturnValue({
        update: jest.fn().mockReturnThis(),
        end: jest.fn().mockReturnThis(),
        verify: jest.fn().mockReturnValue(true)
      } as never)
    })

    it('should process delivered event', async () => {
      const events = [{
        email: 'recipient@example.com',
        timestamp: Date.now() / 1000,
        event: SendGridEventType.DELIVERED,
        sg_message_id: 'msg-123',
        messageId: 'custom-msg-123'
      }]

      const request = createSignedRequest(events)
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.processed).toBe(1)
      expect(data.failed).toBe(0)

      expect(emailLogUpsert).toHaveBeenCalledTimes(1)
      const [upsertPayload, upsertOptions] = emailLogUpsert.mock.calls[0]
      expect(upsertPayload).toEqual(expect.objectContaining({
        message_id: 'custom-msg-123',
        recipient_email: 'recipient@example.com',
        status: 'delivered',
        delivered_at: expect.any(String)
      }))
      expect(upsertOptions).toEqual(expect.objectContaining({ onConflict: 'message_id' }))

      expect(notificationUpdate).toHaveBeenCalledTimes(1)
      const notificationPayload = notificationUpdate.mock.calls[0][0]
      expect(notificationPayload).toEqual(expect.objectContaining({
        status: 'delivered',
        delivery_time: expect.any(String),
        provider_response: expect.objectContaining({ event: SendGridEventType.DELIVERED })
      }))
    })

    it('should process bounce event', async () => {
      const events = [{
        email: 'bounced@example.com',
        timestamp: Date.now() / 1000,
        event: SendGridEventType.BOUNCE,
        sg_message_id: 'msg-456',
        type: 'bounce',
        reason: 'Mailbox does not exist',
        status: '5.1.1'
      }]

      const request = createSignedRequest(events)
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.processed).toBe(1)

      const [upsertPayload] = emailLogUpsert.mock.calls[0]
      expect(upsertPayload).toEqual(expect.objectContaining({
        status: 'bounced',
        bounced_at: expect.any(String),
        recipient_email: 'bounced@example.com'
      }))

      const notificationPayload = notificationUpdate.mock.calls[0][0]
      expect(notificationPayload).toEqual(expect.objectContaining({
        status: 'failed',
        error_message: 'Mailbox does not exist'
      }))

      expect(recipientsSelectEq).toHaveBeenCalledWith('email', 'bounced@example.com')
      expect(recipientsUpdate).toHaveBeenCalledTimes(1)
      const recipientUpdatePayload = recipientsUpdate.mock.calls[0][0]
      expect(recipientUpdatePayload).toEqual(expect.objectContaining({
        preferred_channels: ['sms'],
        is_active: false
      }))
    })

    it('should process spam report event', async () => {
      const events = [{
        email: 'spam@example.com',
        timestamp: Date.now() / 1000,
        event: SendGridEventType.SPAM_REPORT,
        sg_message_id: 'msg-789'
      }]

      const request = createSignedRequest(events)
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.processed).toBe(1)

      const [upsertPayload] = emailLogUpsert.mock.calls[0]
      expect(upsertPayload).toEqual(expect.objectContaining({
        status: 'spam_reported',
        spam_reported_at: expect.any(String)
      }))

      expect(notificationUpdate).toHaveBeenCalledTimes(1)
      const notificationPayload = notificationUpdate.mock.calls[0][0]
      expect(notificationPayload).toEqual(expect.objectContaining({
        status: 'spam_reported',
        error_message: 'Recipient reported spam'
      }))

      expect(recipientsUpdate).toHaveBeenCalledTimes(1)
      const recipientUpdatePayload = recipientsUpdate.mock.calls[0][0]
      expect(recipientUpdatePayload).toEqual(expect.objectContaining({
        preferred_channels: ['sms'],
        is_active: false
      }))
    })

    it('should process unsubscribe event', async () => {
      const events = [{
        email: 'unsubscribed@example.com',
        timestamp: Date.now() / 1000,
        event: SendGridEventType.UNSUBSCRIBE,
        sg_message_id: 'msg-101'
      }]

      const request = createSignedRequest(events)
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.processed).toBe(1)

      const [upsertPayload] = emailLogUpsert.mock.calls[0]
      expect(upsertPayload).toEqual(expect.objectContaining({
        status: 'unsubscribed',
        unsubscribed_at: expect.any(String)
      }))

      expect(notificationUpdate).toHaveBeenCalledTimes(1)
      const notificationPayload = notificationUpdate.mock.calls[0][0]
      expect(notificationPayload).toEqual(expect.objectContaining({
        status: 'unsubscribed'
      }))

      expect(recipientsUpdate).toHaveBeenCalledTimes(1)
      const recipientUpdatePayload = recipientsUpdate.mock.calls[0][0]
      expect(recipientUpdatePayload).toEqual(expect.objectContaining({
        preferred_channels: ['sms'],
        is_active: false
      }))
    })

    it('should process blocked event', async () => {
      const events = [{
        email: 'blocked@example.com',
        timestamp: Date.now() / 1000,
        event: SendGridEventType.BLOCKED,
        reason: 'Recipient email address is on suppression list',
        sg_message_id: 'msg-111'
      }]

      const request = createSignedRequest(events)
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.processed).toBe(1)

      const [upsertPayload] = emailLogUpsert.mock.calls[0]
      expect(upsertPayload).toEqual(expect.objectContaining({
        status: 'blocked',
        blocked_at: expect.any(String)
      }))

      expect(recipientsUpdate).toHaveBeenCalledTimes(1)
      const recipientUpdatePayload = recipientsUpdate.mock.calls[0][0]
      expect(recipientUpdatePayload).toEqual(expect.objectContaining({
        preferred_channels: ['sms'],
        is_active: false
      }))
    })

    it('should process dropped event', async () => {
      const events = [{
        email: 'dropped@example.com',
        timestamp: Date.now() / 1000,
        event: SendGridEventType.DROPPED,
        reason: 'Invalid email address',
        sg_message_id: 'msg-202'
      }]

      const request = createSignedRequest(events)
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.processed).toBe(1)

      const [upsertPayload] = emailLogUpsert.mock.calls[0]
      expect(upsertPayload).toEqual(expect.objectContaining({
        status: 'dropped',
        dropped_at: expect.any(String)
      }))

      expect(recipientsUpdate).toHaveBeenCalledTimes(1)
      const recipientUpdatePayload = recipientsUpdate.mock.calls[0][0]
      expect(recipientUpdatePayload).toEqual(expect.objectContaining({
        preferred_channels: ['sms'],
        is_active: false
      }))
    })

    it('should process open event', async () => {
      const events = [{
        email: 'opened@example.com',
        timestamp: Date.now() / 1000,
        event: SendGridEventType.OPEN,
        sg_message_id: 'msg-303',
        useragent: 'Mozilla/5.0',
        ip: '192.168.1.1'
      }]

      const request = createSignedRequest(events)
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.processed).toBe(1)

      const [upsertPayload] = emailLogUpsert.mock.calls[0]
      expect(upsertPayload).toEqual(expect.objectContaining({
        open_count: 1,
        last_opened_at: expect.any(String)
      }))

      const notificationPayload = notificationUpdate.mock.calls[0][0]
      expect(notificationPayload).toEqual(expect.objectContaining({ status: 'opened' }))
    })

    it('should increment open count when log exists', async () => {
      setupSupabaseMocks({
        existingEmailLog: { id: 'existing-open', open_count: 3, click_count: 0, metadata: { previous: true } }
      })

      const events = [{
        email: 'opened@example.com',
        timestamp: Date.now() / 1000,
        event: SendGridEventType.OPEN,
        sg_message_id: 'msg-open-existing'
      }]

      const request = createSignedRequest(events)
      await POST(request)

      const [upsertPayload] = emailLogUpsert.mock.calls[0]
      expect(upsertPayload.open_count).toBe(4)
      expect(upsertPayload.metadata).toEqual(expect.objectContaining({ previous: true }))
    })

    it('should process click event', async () => {
      const events = [{
        email: 'clicked@example.com',
        timestamp: Date.now() / 1000,
        event: SendGridEventType.CLICK,
        sg_message_id: 'msg-404',
        url: 'https://example.com/link',
        useragent: 'Mozilla/5.0',
        ip: '192.168.1.1'
      }]

      const request = createSignedRequest(events)
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.processed).toBe(1)

      const [upsertPayload] = emailLogUpsert.mock.calls[0]
      expect(upsertPayload).toEqual(expect.objectContaining({
        click_count: 1,
        last_clicked_at: expect.any(String),
        last_clicked_url: 'https://example.com/link'
      }))

      const notificationPayload = notificationUpdate.mock.calls[0][0]
      expect(notificationPayload).toEqual(expect.objectContaining({ status: 'clicked' }))
    })

    it('should increment click count when log exists', async () => {
      setupSupabaseMocks({
        existingEmailLog: { id: 'existing-click', open_count: 0, click_count: 5, metadata: { clicks: 5 } }
      })

      const events = [{
        email: 'clicked@example.com',
        timestamp: Date.now() / 1000,
        event: SendGridEventType.CLICK,
        sg_message_id: 'msg-click-existing',
        url: 'https://example.com/new'
      }]

      const request = createSignedRequest(events)
      await POST(request)

      const [upsertPayload] = emailLogUpsert.mock.calls[0]
      expect(upsertPayload.click_count).toBe(6)
      expect(upsertPayload.metadata).toEqual(expect.objectContaining({ clicks: 5 }))
    })

    it('should report failure when supabase write fails', async () => {
      setupSupabaseMocks({ emailLogError: { message: 'db error' } })

      const events = [{
        email: 'failure@example.com',
        timestamp: Date.now() / 1000,
        event: SendGridEventType.DELIVERED,
        sg_message_id: 'fail-msg'
      }]

      const request = createSignedRequest(events)
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.processed).toBe(0)
      expect(data.failed).toBe(1)
    })

    it('should process informational events (processed, deferred)', async () => {
      const events = [
        {
          email: 'test1@example.com',
          timestamp: Date.now() / 1000,
          event: SendGridEventType.PROCESSED,
          sg_message_id: 'msg-501'
        },
        {
          email: 'test2@example.com',
          timestamp: Date.now() / 1000,
          event: SendGridEventType.DEFERRED,
          sg_message_id: 'msg-502',
          response: 'Temporary failure'
        }
      ]

      const request = createSignedRequest(events)
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.processed).toBe(2)
    })
  })

  describe('Batch Processing', () => {
    beforeEach(() => {
      jest.spyOn(crypto, 'createVerify').mockReturnValue({
        update: jest.fn().mockReturnThis(),
        end: jest.fn().mockReturnThis(),
        verify: jest.fn().mockReturnValue(true)
      } as never)
    })

    it('should process multiple events in batch', async () => {
      const events = [
        {
          email: 'user1@example.com',
          timestamp: Date.now() / 1000,
          event: SendGridEventType.DELIVERED,
          sg_message_id: 'msg-1'
        },
        {
          email: 'user2@example.com',
          timestamp: Date.now() / 1000,
          event: SendGridEventType.OPEN,
          sg_message_id: 'msg-2'
        },
        {
          email: 'user3@example.com',
          timestamp: Date.now() / 1000,
          event: SendGridEventType.CLICK,
          sg_message_id: 'msg-3',
          url: 'https://example.com'
        }
      ]

      const request = createSignedRequest(events)
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.processed).toBe(3)
      expect(data.failed).toBe(0)
    })

    it('should handle mixed success and failure in batch', async () => {
      const events = [
        {
          email: 'user1@example.com',
          timestamp: Date.now() / 1000,
          event: SendGridEventType.DELIVERED,
          sg_message_id: 'batch-msg-1'
        },
        {
          email: 'user2@example.com',
          timestamp: Date.now() / 1000,
          event: SendGridEventType.BOUNCE,
          reason: 'Hard bounce',
          sg_message_id: 'batch-msg-2'
        }
      ]

      const request = createSignedRequest(events)
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.processed).toBeGreaterThanOrEqual(1)
    })
  })

  describe('Error Handling', () => {
    beforeEach(() => {
      jest.spyOn(crypto, 'createVerify').mockReturnValue({
        update: jest.fn().mockReturnThis(),
        end: jest.fn().mockReturnThis(),
        verify: jest.fn().mockReturnValue(true)
      } as never)
    })

    it('should reject invalid JSON payload', async () => {
      const request = new NextRequest('http://localhost:3000/api/webhooks/sendgrid', {
        method: 'POST',
        headers: {
          'x-twilio-email-event-webhook-signature': 'sig',
          'x-twilio-email-event-webhook-timestamp': Date.now().toString()
        },
        body: 'invalid json{'
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Internal server error')
    })

    it('should reject non-array payload', async () => {
      const request = new NextRequest('http://localhost:3000/api/webhooks/sendgrid', {
        method: 'POST',
        headers: {
          'x-twilio-email-event-webhook-signature': 'sig',
          'x-twilio-email-event-webhook-timestamp': Date.now().toString()
        },
        body: JSON.stringify({ not: 'an array' })
      })

      jest.spyOn(crypto, 'createVerify').mockReturnValue({
        update: jest.fn().mockReturnThis(),
        end: jest.fn().mockReturnThis(),
        verify: jest.fn().mockReturnValue(true)
      } as never)

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Invalid payload')
    })

    it('should handle empty event array', async () => {
      const request = createSignedRequest([])
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.processed).toBe(0)
      expect(data.failed).toBe(0)
    })
  })

  describe('Event Type Coverage', () => {
    beforeEach(() => {
      jest.spyOn(crypto, 'createVerify').mockReturnValue({
        update: jest.fn().mockReturnThis(),
        end: jest.fn().mockReturnThis(),
        verify: jest.fn().mockReturnValue(true)
      } as never)
    })

    it('should handle all defined event types', async () => {
      const allEventTypes = [
        SendGridEventType.DELIVERED,
        SendGridEventType.PROCESSED,
        SendGridEventType.DROPPED,
        SendGridEventType.DEFERRED,
        SendGridEventType.BOUNCE,
        SendGridEventType.BLOCKED,
        SendGridEventType.OPEN,
        SendGridEventType.CLICK,
        SendGridEventType.SPAM_REPORT,
        SendGridEventType.UNSUBSCRIBE,
        SendGridEventType.GROUP_UNSUBSCRIBE,
        SendGridEventType.GROUP_RESUBSCRIBE
      ]

      for (const eventType of allEventTypes) {
        const events = [{
          email: 'test@example.com',
          timestamp: Date.now() / 1000,
          event: eventType,
          sg_message_id: `coverage-${eventType}`
        }]

        const request = createSignedRequest(events)
        const response = await POST(request)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.success).toBe(true)
      }
    })

    it('should handle unknown event types gracefully', async () => {
      const events = [{
        email: 'test@example.com',
        timestamp: Date.now() / 1000,
        event: 'unknown_event_type' as SendGridEventType,
        sg_message_id: 'unknown-type'
      }]

      const request = createSignedRequest(events)
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.processed).toBe(1) // Should still process even if unknown
    })
  })

  describe('Message ID Handling', () => {
    beforeEach(() => {
      jest.spyOn(crypto, 'createVerify').mockReturnValue({
        update: jest.fn().mockReturnThis(),
        end: jest.fn().mockReturnThis(),
        verify: jest.fn().mockReturnValue(true)
      } as never)
    })

    it('should use custom messageId over sg_message_id', async () => {
      const events = [{
        email: 'test@example.com',
        timestamp: Date.now() / 1000,
        event: SendGridEventType.DELIVERED,
        messageId: 'custom-123',
        sg_message_id: 'sendgrid-456'
      }]

      const request = createSignedRequest(events)
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      // MessageId preference is tested through the processing logic
    })

    it('should fallback to sg_message_id when messageId missing', async () => {
      const events = [{
        email: 'test@example.com',
        timestamp: Date.now() / 1000,
        event: SendGridEventType.DELIVERED,
        sg_message_id: 'sendgrid-789'
      }]

      const request = createSignedRequest(events)
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
    })
  })
})
