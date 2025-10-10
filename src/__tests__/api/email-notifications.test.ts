import { POST, GET } from '@/app/api/notifications/send-email/route'
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

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.messageId).toBe('msg-123')
      expect(data.statusCode).toBe(202)

      expect(mockServerEmailService.sendTemplatedEmail).toHaveBeenCalledWith(
        'recipient@example.com',
        'response',
        emailData.templateData,
        emailData.options
      )
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

      const response = await POST(request)

      expect(response.status).toBe(401)
    })

    it('should enforce rate limiting', async () => {
      mockCheckRateLimit.mockReturnValue({
        allowed: false,
        response: new NextResponse(
          JSON.stringify({
            error: 'Rate limit exceeded',
            details: {
              limit: 100,
              remaining: 0,
              resetTime: Date.now() + 3600000
            }
          }),
          {
            status: 429,
            headers: {
              'X-RateLimit-Limit': '100',
              'X-RateLimit-Remaining': '0',
              'Retry-After': '3600'
            }
          }
        )
      })

      const request = new NextRequest('http://localhost:3000/api/notifications/send-email', {
        method: 'POST',
        body: JSON.stringify({
          to: 'test@example.com',
          type: 'response'
        })
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(429)
      expect(data.error).toContain('Rate limit exceeded')
      expect(data.details.limit).toBe(100)
      expect(data.details.remaining).toBe(0)
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

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(403)
      expect(data.error).toContain('not authorized')
      expect(mockVerifyNotificationPermissions).toHaveBeenCalledWith(
        'user-123',
        ['unauthorized@example.com']
      )
    })

    it('should validate email type', async () => {
      const request = new NextRequest('http://localhost:3000/api/notifications/send-email', {
        method: 'POST',
        body: JSON.stringify({
          to: 'test@example.com',
          type: 'invalid_type' // Invalid
        })
      })

      const response = await POST(request)
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

      const response = await POST(request)
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

      const response = await POST(request)
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

      const response = await POST(request)
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

        const response = await POST(request)
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

      const response = await POST(request)
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

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Invalid request data')
    })

    it('should handle malformed JSON', async () => {
      const request = new NextRequest('http://localhost:3000/api/notifications/send-email', {
        method: 'POST',
        body: 'invalid json{'
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Internal server error')
    })
  })

  describe('GET /api/notifications/send-email', () => {
    it('should reject GET requests', async () => {
      const response = await GET()
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

      await POST(request)

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
        response: new NextResponse(
          JSON.stringify({
            error: 'Rate limit exceeded',
            details: {
              limit: 50,
              remaining: 0,
              resetTime,
              retryAfter: 120
            }
          }),
          { status: 429 }
        )
      })

      const request = new NextRequest('http://localhost:3000/api/notifications/send-email', {
        method: 'POST',
        body: JSON.stringify({
          to: 'test@example.com',
          type: 'response'
        })
      })

      const response = await POST(request)
      const data = await response.json()

      expect(data.details.limit).toBe(50)
      expect(data.details.remaining).toBe(0)
      expect(data.details.retryAfter).toBeGreaterThan(0)
      expect(data.details.resetTime).toBeDefined()
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

      const response = await POST(request)
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

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
    })
  })
})
