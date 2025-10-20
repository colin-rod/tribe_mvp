import { POST } from '@/app/api/notifications/send-bulk-emails/route'
import { NextRequest, NextResponse } from 'next/server'
import { serverEmailService } from '@/lib/services/serverEmailService'
import { requireAuth, verifyNotificationPermissions } from '@/lib/middleware/authorization'
import { checkRateLimit } from '@/lib/middleware/rateLimiting'

jest.mock('@/lib/services/serverEmailService')
jest.mock('@/lib/middleware/authorization')
jest.mock('@/lib/middleware/rateLimiting')

const mockServerEmailService = serverEmailService as jest.Mocked<typeof serverEmailService>
const mockRequireAuth = requireAuth as jest.MockedFunction<typeof requireAuth>
const mockVerifyNotificationPermissions = verifyNotificationPermissions as jest.MockedFunction<typeof verifyNotificationPermissions>
const mockCheckRateLimit = checkRateLimit as jest.MockedFunction<typeof checkRateLimit>

describe('Bulk Email Notification API', () => {
  const mockUser = { id: 'user-123', email: 'parent@example.com' }

  beforeEach(() => {
    jest.clearAllMocks()

    mockRequireAuth.mockResolvedValue({ user: mockUser } as never)
    mockVerifyNotificationPermissions.mockResolvedValue({
      allowed: true,
      ownedEmails: ['child1@example.com', 'child2@example.com']
    })
    mockCheckRateLimit.mockReturnValue({
      allowed: true,
      info: {
        count: 1,
        total: 100,
        remaining: 99,
        resetTime: Date.now() + 3600000
      }
    })
    mockServerEmailService.isConfigured.mockReturnValue(true)
    mockServerEmailService.sendTemplatedEmail.mockResolvedValue({
      success: true,
      messageId: 'msg-1',
      statusCode: 202
    })
  })

  it('sends bulk emails to authorized recipients', async () => {
    const requestBody = {
      emails: [
        {
          to: 'child1@example.com',
          type: 'response' as const,
          templateData: { message: 'Hello' }
        },
        {
          to: 'child2@example.com',
          type: 'digest' as const,
          templateData: { summary: 'Weekly update' }
        }
      ]
    }

    const request = new NextRequest('http://localhost:3000/api/notifications/send-bulk-emails', {
      method: 'POST',
      body: JSON.stringify(requestBody)
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.summary.total).toBe(2)
    expect(data.summary.successful).toBe(2)
    expect(response.headers.get('X-RateLimit-Limit')).toBe('100')
    expect(response.headers.get('X-RateLimit-Remaining')).toBe('99')
    expect(response.headers.get('X-RateLimit-Reset')).toBeTruthy()

    expect(mockServerEmailService.sendTemplatedEmail).toHaveBeenCalledTimes(2)
    expect(mockServerEmailService.sendTemplatedEmail).toHaveBeenCalledWith(
      'child1@example.com',
      'response',
      { message: 'Hello' },
      {}
    )
  })

  it('enforces rate limits for bulk emails', async () => {
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

    const request = new NextRequest('http://localhost:3000/api/notifications/send-bulk-emails', {
      method: 'POST',
      body: JSON.stringify({
        emails: [
          {
            to: 'child1@example.com',
            type: 'response' as const
          }
        ]
      })
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(429)
    expect(data.error).toContain('Rate limit exceeded')
    expect(data.details.limit).toBe(100)
    expect(data.details.remaining).toBe(0)
    expect(response.headers.get('Retry-After')).toBeDefined()
  })

  it('prevents sending to unauthorized recipients', async () => {
    mockVerifyNotificationPermissions.mockResolvedValue({
      allowed: false,
      ownedEmails: ['child1@example.com']
    })

    const request = new NextRequest('http://localhost:3000/api/notifications/send-bulk-emails', {
      method: 'POST',
      body: JSON.stringify({
        emails: [
          {
            to: 'child2@example.com',
            type: 'response' as const
          }
        ]
      })
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(403)
    expect(data.error).toContain('not authorized')
  })

  it('requires authentication', async () => {
    mockRequireAuth.mockResolvedValue(new NextResponse(
      JSON.stringify({ error: 'Unauthorized' }),
      { status: 401 }
    ))

    const request = new NextRequest('http://localhost:3000/api/notifications/send-bulk-emails', {
      method: 'POST',
      body: JSON.stringify({
        emails: [
          {
            to: 'child1@example.com',
            type: 'response' as const
          }
        ]
      })
    })

    const response = await POST(request)

    expect(response.status).toBe(401)
  })
})
