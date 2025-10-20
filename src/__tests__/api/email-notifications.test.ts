import { POST as sendEmailPOST, GET as sendEmailGET } from '@/app/api/notifications/send-email/route'
import { POST as sendBulkPOST, GET as sendBulkGET } from '@/app/api/notifications/send-bulk-emails/route'
import { NextRequest, NextResponse } from 'next/server'
import { serverEmailService } from '@/lib/services/serverEmailService'
import { requireAuth, verifyNotificationPermissions } from '@/lib/middleware/authorization'
import { checkRateLimit, RateLimitConfigs } from '@/lib/middleware/rateLimiting'

// Mock dependencies
jest.mock('@/lib/services/serverEmailService')
jest.mock('@/lib/middleware/authorization')
jest.mock('@/lib/middleware/rateLimiting')

const mockServerEmailService = serverEmailService as jest.Mocked<typeof serverEmailService>
const mockRequireAuth = requireAuth as jest.MockedFunction<typeof requireAuth>
const mockVerifyNotificationPermissions = verifyNotificationPermissions as jest.MockedFunction<typeof verifyNotificationPermissions>
const mockCheckRateLimit = checkRateLimit as jest.MockedFunction<typeof checkRateLimit>

describe('Email Notification System Tests', () => {
  const mockUser = { id: 'user-123', email: 'parent@example.com' }

  beforeEach(() => {
    jest.clearAllMocks()

    // Default mock implementations
    mockRequireAuth.mockResolvedValue({ user: mockUser } as never)
    mockVerifyNotificationPermissions.mockResolvedValue({
      allowed: true,
      ownedEmails: ['recipient@example.com']
    })
    mockCheckRateLimit.mockReturnValue({
      allowed: true,
      info: {
        count: 1,
        total: 100,
        remaining: 99,
        resetTime: Date.now() + 60000
      }
    })
    mockServerEmailService.isConfigured.mockReturnValue(true)
  })

  describe('POST /api/notifications/send-email', () => {
    it('should send email successfully', async () => {
      const emailData = {
        to: 'recipient@example.com',
        type: 'response' as const,
        templateData: {
          senderName: 'John',
          message: 'Baby took first steps today!'
        },
        options: {
          fromName: 'Baby Updates'
        }
      }

      mockServerEmailService.sendTemplatedEmail.mockResolvedValue({
        success: true,
        messageId: 'msg-123',
        statusCode: 202
      })

      const request = new NextRequest('http://localhost:3000/api/notifications/send-email', {
        method: 'POST',
        body: JSON.stringify(emailData)
      })

      const response = await sendEmailPOST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.messageId).toBe('msg-123')
      expect(data.statusCode).toBe(202)

      expect(response.headers.get('X-RateLimit-Limit')).toBe('100')
      expect(response.headers.get('X-RateLimit-Remaining')).toBe('99')
      expect(response.headers.get('X-RateLimit-Reset')).toBeTruthy()

      expect(mockServerEmailService.sendTemplatedEmail).toHaveBeenCalledWith(
        'recipient@example.com',
        'response',
        emailData.templateData,
        emailData.options
      )
      expect(response.headers.get('X-RateLimit-Limit')).toBeDefined()
      expect(response.headers.get('X-RateLimit-Remaining')).toBeDefined()
    })

    it('should enforce authentication', async () => {
      mockRequireAuth.mockResolvedValue(new NextResponse(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401 }
      ))

      const request = new NextRequest('http://localhost:3000/api/notifications/send-email', {
        method: 'POST',
        body: JSON.stringify({
          to: 'test@example.com',
          type: 'response'
        })
      })

      const response = await sendEmailPOST(request)

      expect(response.status).toBe(401)
    })

    it('should enforce rate limiting', async () => {
      const resetTime = Date.now() + 3600000
      mockCheckRateLimit.mockReturnValue({
        allowed: false,
        info: {
          count: 100,
          total: 100,
          remaining: 0,
          resetTime
        }
      })

      const request = new NextRequest('http://localhost:3000/api/notifications/send-email', {
        method: 'POST',
        body: JSON.stringify({
          to: 'test@example.com',
          type: 'response'
        })
      })

      const response = await sendEmailPOST(request)
      const data = await response.json()

      expect(response.status).toBe(429)
      expect(data.error).toContain('Rate limit exceeded')
      expect(data.details.limit).toBe(100)
      expect(data.details.remaining).toBe(0)
      expect(data.details.retryAfter).toBeGreaterThan(0)
      expect(response.headers.get('X-RateLimit-Limit')).toBe('100')
      expect(response.headers.get('X-RateLimit-Remaining')).toBe('0')
      expect(response.headers.get('Retry-After')).toBeDefined()
    })

    it('should verify notification permissions', async () => {
      mockVerifyNotificationPermissions.mockResolvedValue({
        allowed: false,
        ownedEmails: ['other@example.com']
      })

      const request = new NextRequest('http://localhost:3000/api/notifications/send-email', {
        method: 'POST',
        body: JSON.stringify({
          to: 'unauthorized@example.com',
          type: 'response'
        })
      })

      const response = await sendEmailPOST(request)
      const data = await response.json()

      expect(response.status).toBe(403)
      expect(data.error).toContain('not authorized')
      expect(mockVerifyNotificationPermissions).toHaveBeenCalledWith(
        'user-123',
        ['unauthorized@example.com']
      )
      expect(response.headers.get('X-RateLimit-Limit')).toBeDefined()
    })

    it('should validate email type', async () => {
      const request = new NextRequest('http://localhost:3000/api/notifications/send-email', {
        method: 'POST',
        body: JSON.stringify({
          to: 'test@example.com',
          type: 'invalid_type' // Invalid
        })
      })

      const response = await sendEmailPOST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Invalid request data')
      expect(data.details).toBeDefined()
    })

    it('should validate email format', async () => {
      const request = new NextRequest('http://localhost:3000/api/notifications/send-email', {
        method: 'POST',
        body: JSON.stringify({
          to: 'not-an-email',
          type: 'response'
        })
      })

      const response = await sendEmailPOST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Invalid request data')
    })

    it('should check email service configuration', async () => {
      mockServerEmailService.isConfigured.mockReturnValue(false)

      const request = new NextRequest('http://localhost:3000/api/notifications/send-email', {
        method: 'POST',
        body: JSON.stringify({
          to: 'test@example.com',
          type: 'response'
        })
      })

      const response = await sendEmailPOST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Email service not properly configured')
    })

    it('should handle email service failures', async () => {
      mockServerEmailService.sendTemplatedEmail.mockResolvedValue({
        success: false,
        error: 'SendGrid API error: Invalid API key'
      })

      const request = new NextRequest('http://localhost:3000/api/notifications/send-email', {
        method: 'POST',
        body: JSON.stringify({
          to: 'test@example.com',
          type: 'response'
        })
      })

      const response = await sendEmailPOST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toContain('SendGrid API error')
    })

    it('should send different email types', async () => {
      const emailTypes = ['response', 'prompt', 'digest', 'system', 'preference'] as const

      for (const type of emailTypes) {
        mockServerEmailService.sendTemplatedEmail.mockResolvedValue({
          success: true,
          messageId: `msg-${type}`,
          statusCode: 202
        })

        const request = new NextRequest('http://localhost:3000/api/notifications/send-email', {
          method: 'POST',
          body: JSON.stringify({
            to: 'test@example.com',
            type,
            templateData: { content: `Test ${type} email` }
          })
        })

        const response = await sendEmailPOST(request)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.success).toBe(true)
        expect(mockServerEmailService.sendTemplatedEmail).toHaveBeenCalledWith(
          'test@example.com',
          type,
          expect.any(Object),
          expect.any(Object)
        )
      }
    })

    it('should include custom options', async () => {
      mockServerEmailService.sendTemplatedEmail.mockResolvedValue({
        success: true,
        messageId: 'msg-custom',
        statusCode: 202
      })

      const customOptions = {
        from: 'custom@example.com',
        fromName: 'Custom Sender',
        replyTo: 'reply@example.com',
        categories: ['updates', 'family'],
        customArgs: { userId: 'user-123', source: 'web' }
      }

      const request = new NextRequest('http://localhost:3000/api/notifications/send-email', {
        method: 'POST',
        body: JSON.stringify({
          to: 'test@example.com',
          type: 'response',
          templateData: {},
          options: customOptions
        })
      })

      const response = await sendEmailPOST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(mockServerEmailService.sendTemplatedEmail).toHaveBeenCalledWith(
        'test@example.com',
        'response',
        {},
        customOptions
      )
    })

    it('should validate option limits', async () => {
      const request = new NextRequest('http://localhost:3000/api/notifications/send-email', {
        method: 'POST',
        body: JSON.stringify({
          to: 'test@example.com',
          type: 'response',
          options: {
            categories: Array(15).fill('category') // Max is 10
          }
        })
      })

      const response = await sendEmailPOST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Invalid request data')
    })

    it('should handle malformed JSON', async () => {
      const request = new NextRequest('http://localhost:3000/api/notifications/send-email', {
        method: 'POST',
        body: 'invalid json{'
      })

      const response = await sendEmailPOST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Internal server error')
    })
  })

  describe('GET /api/notifications/send-email', () => {
    it('should reject GET requests', async () => {
      const response = await sendEmailGET()
      const data = await response.json()

      expect(response.status).toBe(405)
      expect(data.error).toBe('Method not allowed')
    })
  })

  describe('Rate Limiting Integration', () => {
    it('should use email-specific rate limit config', async () => {
      const request = new NextRequest('http://localhost:3000/api/notifications/send-email', {
        method: 'POST',
        body: JSON.stringify({
          to: 'test@example.com',
          type: 'response'
        })
      })

      await sendEmailPOST(request)

      expect(mockCheckRateLimit).toHaveBeenCalledWith(
        request,
        RateLimitConfigs.email,
        'user-123'
      )
    })

    it('should provide detailed rate limit info on rejection', async () => {
      const resetTime = Date.now() + 120000 // 2 minutes

      mockCheckRateLimit.mockReturnValue({
        allowed: false,
        info: {
          count: 50,
          total: 50,
          remaining: 0,
          resetTime
        }
      })

      const request = new NextRequest('http://localhost:3000/api/notifications/send-email', {
        method: 'POST',
        body: JSON.stringify({
          to: 'test@example.com',
          type: 'response'
        })
      })

      const response = await sendEmailPOST(request)
      const data = await response.json()

      expect(response.status).toBe(429)
      expect(data.details.limit).toBe(50)
      expect(data.details.remaining).toBe(0)
      expect(data.details.retryAfter).toBeGreaterThan(0)
      expect(data.details.resetTime).toBeDefined()
      expect(response.headers.get('Retry-After')).toBeDefined()
    })
  })

  describe('Error Scenarios', () => {
    it('should handle service layer exceptions', async () => {
      mockServerEmailService.sendTemplatedEmail.mockRejectedValue(
        new Error('Network timeout')
      )

      const request = new NextRequest('http://localhost:3000/api/notifications/send-email', {
        method: 'POST',
        body: JSON.stringify({
          to: 'test@example.com',
          type: 'response'
        })
      })

      const response = await sendEmailPOST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Internal server error')
    })

    it('should handle permission check failures', async () => {
      mockVerifyNotificationPermissions.mockRejectedValue(
        new Error('Database connection failed')
      )

      const request = new NextRequest('http://localhost:3000/api/notifications/send-email', {
        method: 'POST',
        body: JSON.stringify({
          to: 'test@example.com',
          type: 'response'
        })
      })

      const response = await sendEmailPOST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
    })
  })

  describe('POST /api/notifications/send-bulk-emails', () => {
    beforeEach(() => {
      mockVerifyNotificationPermissions.mockResolvedValue({
        allowed: true,
        ownedEmails: ['recipient@example.com', 'second@example.com']
      })
    })

    it('should send bulk emails successfully', async () => {
      mockServerEmailService.sendTemplatedEmail
        .mockResolvedValueOnce({ success: true, messageId: 'msg-1', statusCode: 202 })
        .mockResolvedValueOnce({ success: true, messageId: 'msg-2', statusCode: 202 })

      const request = new NextRequest('http://localhost:3000/api/notifications/send-bulk-emails', {
        method: 'POST',
        body: JSON.stringify({
          emails: [
            { to: 'recipient@example.com', type: 'response' as const },
            { to: 'second@example.com', type: 'prompt' as const }
          ]
        })
      })

      const response = await sendBulkPOST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.summary.total).toBe(2)
      expect(data.summary.successful).toBe(2)
      expect(data.success).toBe(true)
      expect(mockCheckRateLimit).toHaveBeenCalledWith(
        request,
        RateLimitConfigs.bulk,
        'user-123'
      )
      expect(response.headers.get('X-RateLimit-Limit')).toBeDefined()
    })

    it('should handle unauthorized recipients gracefully', async () => {
      mockVerifyNotificationPermissions.mockResolvedValue({
        allowed: false,
        ownedEmails: ['recipient@example.com']
      })

      const request = new NextRequest('http://localhost:3000/api/notifications/send-bulk-emails', {
        method: 'POST',
        body: JSON.stringify({
          emails: [
            { to: 'recipient@example.com', type: 'response' as const },
            { to: 'blocked@example.com', type: 'prompt' as const }
          ]
        })
      })

      const response = await sendBulkPOST(request)
      const data = await response.json()

      expect(response.status).toBe(403)
      expect(data.details.totalRequested).toBe(2)
      expect(data.details.unauthorized).toBe(1)
      expect(response.headers.get('X-RateLimit-Limit')).toBeDefined()
    })

    it('should surface configuration errors', async () => {
      mockServerEmailService.isConfigured.mockReturnValue(false)

      const request = new NextRequest('http://localhost:3000/api/notifications/send-bulk-emails', {
        method: 'POST',
        body: JSON.stringify({
          emails: [
            { to: 'recipient@example.com', type: 'response' as const }
          ]
        })
      })

      const response = await sendBulkPOST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Email service not properly configured')
    })

    it('should report partial failures per recipient', async () => {
      mockServerEmailService.sendTemplatedEmail
        .mockResolvedValueOnce({ success: true, messageId: 'msg-1', statusCode: 202 })
        .mockResolvedValueOnce({ success: false, error: 'Send error', statusCode: 500 })

      const request = new NextRequest('http://localhost:3000/api/notifications/send-bulk-emails', {
        method: 'POST',
        body: JSON.stringify({
          emails: [
            { to: 'recipient@example.com', type: 'response' as const },
            { to: 'second@example.com', type: 'prompt' as const }
          ]
        })
      })

      const response = await sendBulkPOST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.summary.failed).toBe(1)
      expect(data.results.some((result: { success: boolean }) => !result.success)).toBe(true)
      expect(data.success).toBe(false)
    })
  })

  describe('GET /api/notifications/send-bulk-emails', () => {
    it('should reject GET requests', async () => {
      const response = await sendBulkGET()
      const data = await response.json()

      expect(response.status).toBe(405)
      expect(data.error).toBe('Method not allowed')
    })
  })
})
