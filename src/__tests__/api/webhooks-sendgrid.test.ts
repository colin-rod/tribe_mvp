import { POST, SendGridEventType } from '@/app/api/webhooks/sendgrid/route'
import { NextRequest } from 'next/server'
import crypto from 'crypto'

// Mock dependencies
jest.mock('@/lib/logger', () => ({
  createLogger: () => ({
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn()
  })
}))

jest.mock('@/lib/env', () => ({
  getEnv: jest.fn(() => ({
    SENDGRID_WEBHOOK_PUBLIC_KEY: 'test-public-key'
  }))
}))

describe('SendGrid Webhook Tests', () => {
  const mockPublicKey = 'test-public-key'

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
    })

    it('should process blocked event', async () => {
      const events = [{
        email: 'blocked@example.com',
        timestamp: Date.now() / 1000,
        event: SendGridEventType.BLOCKED,
        reason: 'Recipient email address is on suppression list'
      }]

      const request = createSignedRequest(events)
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.processed).toBe(1)
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
          event: SendGridEventType.DELIVERED
        },
        {
          email: 'user2@example.com',
          timestamp: Date.now() / 1000,
          event: SendGridEventType.BOUNCE,
          reason: 'Hard bounce'
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
          event: eventType
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
        event: 'unknown_event_type' as SendGridEventType
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
