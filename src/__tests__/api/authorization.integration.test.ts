/**
 * Integration tests for API authorization and IDOR vulnerability fixes
 */

import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  requireAuth,
  verifyResourceOwnership,
  verifyNotificationPermissions,
  checkRateLimit,
  resetRateLimitStore
} from '@/lib/middleware/authorization'

// Mock Supabase
jest.mock('@/lib/supabase/server')
jest.mock('next/headers', () => ({
  cookies: jest.fn(() => Promise.resolve({}))
}))

const mockSupabase = {
  auth: {
    getUser: jest.fn()
  },
  from: jest.fn(() => ({
    select: jest.fn(() => ({
      eq: jest.fn(() => ({
        single: jest.fn(),
        eq: jest.fn(() => ({
          single: jest.fn()
        }))
      }))
    }))
  }))
}

;(createClient as jest.Mock).mockReturnValue(mockSupabase)

describe('Authorization Middleware Integration Tests', () => {

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Authentication Tests', () => {
    it('should reject requests without valid authentication', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null
      })

      const request = new NextRequest('http://localhost/api/test')
      const result = await requireAuth(request)

      expect(result).toHaveProperty('status', 401)
    })

    it('should accept requests with valid authentication', async () => {
      const mockUser = { id: 'user-123', email: 'test@example.com' }
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null
      })

      const request = new NextRequest('http://localhost/api/test')
      const result = await requireAuth(request)

      expect(result).toHaveProperty('user')
      if ('user' in result) {
        expect(result.user.id).toBe('user-123')
      } else {
        throw new Error('Expected authenticated user in result')
      }
    })

    it('should handle authentication errors gracefully', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'Invalid JWT' }
      })

      const request = new NextRequest('http://localhost/api/test')
      const result = await requireAuth(request)

      expect(result).toHaveProperty('status', 401)
    })
  })

  describe('Resource Ownership Tests', () => {
    it('should verify user owns update resource', async () => {
      mockSupabase.from.mockReturnValue({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            single: jest.fn(() => Promise.resolve({
              data: { parent_id: 'user-123' },
              error: null
            }))
          }))
        }))
      })

      const isOwner = await verifyResourceOwnership('user-123', 'update', 'update-456')
      expect(isOwner).toBe(true)
    })

    it('should reject access to resources owned by other users', async () => {
      mockSupabase.from.mockReturnValue({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            single: jest.fn(() => Promise.resolve({
              data: { parent_id: 'other-user-789' },
              error: null
            }))
          }))
        }))
      })

      const isOwner = await verifyResourceOwnership('user-123', 'update', 'update-456')
      expect(isOwner).toBe(false)
    })

    it('should handle missing resources gracefully', async () => {
      mockSupabase.from.mockReturnValue({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            single: jest.fn(() => Promise.resolve({
              data: null,
              error: { code: 'PGRST116', message: 'Resource not found' }
            }))
          }))
        }))
      })

      const isOwner = await verifyResourceOwnership('user-123', 'update', 'nonexistent')
      expect(isOwner).toBe(false)
    })
  })

  describe('Notification Permission Tests', () => {
    it('should allow sending to owned recipients', async () => {
      mockSupabase.from.mockReturnValue({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            eq: jest.fn(() => Promise.resolve({
              data: [
                { email: 'recipient1@example.com' },
                { email: 'recipient2@example.com' }
              ],
              error: null
            }))
          }))
        }))
      })

      const { allowed, ownedEmails } = await verifyNotificationPermissions(
        'user-123',
        ['recipient1@example.com', 'recipient2@example.com']
      )

      expect(allowed).toBe(true)
      expect(ownedEmails).toContain('recipient1@example.com')
      expect(ownedEmails).toContain('recipient2@example.com')
    })

    it('should reject sending to unowned recipients', async () => {
      mockSupabase.from.mockReturnValue({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            eq: jest.fn(() => Promise.resolve({
              data: [
                { email: 'recipient1@example.com' }
              ],
              error: null
            }))
          }))
        }))
      })

      const { allowed } = await verifyNotificationPermissions(
        'user-123',
        ['recipient1@example.com', 'unauthorized@example.com']
      )

      expect(allowed).toBe(false)
    })

    it('should handle case insensitive email matching', async () => {
      mockSupabase.from.mockReturnValue({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            eq: jest.fn(() => Promise.resolve({
              data: [
                { email: 'Test@Example.com' }
              ],
              error: null
            }))
          }))
        }))
      })

      const { allowed, ownedEmails } = await verifyNotificationPermissions(
        'user-123',
        ['test@example.com']
      )

      expect(allowed).toBe(true)
      expect(ownedEmails).toContain('test@example.com')
    })
  })

  describe('Rate Limiting Tests', () => {
    beforeEach(() => {
      resetRateLimitStore()
    })

    it('should allow requests within rate limit', () => {
      const userId = 'user-123'
      const result1 = checkRateLimit(userId, 5, 1)
      const result2 = checkRateLimit(userId, 5, 1)
      const result3 = checkRateLimit(userId, 5, 1)

      expect(result1).toBe(true)
      expect(result2).toBe(true)
      expect(result3).toBe(true)
    })

    it('should reject requests exceeding rate limit', () => {
      const userId = 'user-123'

      // Make maximum allowed requests
      for (let i = 0; i < 3; i++) {
        expect(checkRateLimit(userId, 3, 1)).toBe(true)
      }

      // Next request should be rejected
      expect(checkRateLimit(userId, 3, 1)).toBe(false)
    })

    it('should reset rate limit after time window', async () => {
      const userId = 'user-123'

      // Fill rate limit
      for (let i = 0; i < 2; i++) {
        checkRateLimit(userId, 2, 0.001) // 0.001 minute = 60ms
      }

      // Should be at limit
      expect(checkRateLimit(userId, 2, 0.001)).toBe(false)

      // Wait for window to reset
      await new Promise(resolve => setTimeout(resolve, 70))

      // Should be allowed again
      expect(checkRateLimit(userId, 2, 0.001)).toBe(true)
    })

    it('should maintain separate rate limits per user', () => {
      const user1 = 'user-123'
      const user2 = 'user-456'

      // Fill rate limit for user1
      for (let i = 0; i < 2; i++) {
        expect(checkRateLimit(user1, 2, 1)).toBe(true)
      }

      // user1 should be at limit
      expect(checkRateLimit(user1, 2, 1)).toBe(false)

      // user2 should still be allowed
      expect(checkRateLimit(user2, 2, 1)).toBe(true)
      expect(checkRateLimit(user2, 2, 1)).toBe(true)
      expect(checkRateLimit(user2, 2, 1)).toBe(false)
    })
  })
})

describe('API Route Authorization Tests', () => {

  // Mock the actual API route imports
  const mockEmailService = {
    isConfigured: jest.fn(() => true),
    sendTemplatedEmail: jest.fn(() => Promise.resolve({
      success: true,
      messageId: 'test-message-id',
      statusCode: 200
    }))
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Email API Authorization', () => {
    it('should prevent unauthorized users from sending emails', async () => {
      // Mock unauthenticated request
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null
      })

      const request = new NextRequest('http://localhost/api/notifications/send-email', {
        method: 'POST',
        body: JSON.stringify({
          to: 'test@example.com',
          type: 'system',
          templateData: {}
        })
      })

      // Import and call the actual route handler
      // This would require proper mocking setup in a real test environment
      const result = await requireAuth(request)
      expect(result).toHaveProperty('status', 401)
    })

    it('should prevent users from sending emails to unauthorized recipients', async () => {
      const mockUser = { id: 'user-123', email: 'sender@example.com' }
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null
      })

      // Mock that user doesn't own the target recipient
      mockSupabase.from.mockReturnValue({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            eq: jest.fn(() => Promise.resolve({
              data: [], // No recipients found for this user
              error: null
            }))
          }))
        }))
      })

      const { allowed } = await verifyNotificationPermissions(
        'user-123',
        ['unauthorized@example.com']
      )

      expect(allowed).toBe(false)
    })
  })
})

describe('Security Regression Tests', () => {
  describe('IDOR Vulnerability Prevention', () => {
    it('should prevent horizontal privilege escalation in updates', async () => {
      mockSupabase.from.mockReturnValue({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            single: jest.fn(() => Promise.resolve({
              data: { parent_id: 'other-user' },
              error: null
            }))
          }))
        }))
      })

      const canAccess = await verifyResourceOwnership('user-123', 'update', 'update-belonging-to-other-user')
      expect(canAccess).toBe(false)
    })

    it('should prevent access to other users children', async () => {
      mockSupabase.from.mockReturnValue({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            single: jest.fn(() => Promise.resolve({
              data: { parent_id: 'other-parent' },
              error: null
            }))
          }))
        }))
      })

      const canAccess = await verifyResourceOwnership('user-123', 'child', 'child-belonging-to-other-parent')
      expect(canAccess).toBe(false)
    })

    it('should prevent sending notifications on behalf of other users', async () => {
      // Mock that current user has no recipients
      mockSupabase.from.mockReturnValue({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            eq: jest.fn(() => Promise.resolve({
              data: [],
              error: null
            }))
          }))
        }))
      })

      const { allowed } = await verifyNotificationPermissions(
        'user-123',
        ['victim@example.com']
      )

      expect(allowed).toBe(false)
    })
  })
})
