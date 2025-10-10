/**
 * Integration tests for API authorization and IDOR vulnerability fixes
 */

import { NextRequest } from 'next/server'
import {
  requireAuth,
  verifyResourceOwnership,
  verifyNotificationPermissions,
  checkRateLimit,
  resetRateLimitStore,
} from '@/lib/middleware/authorization'
import { validateSessionMiddleware } from '@/lib/middleware/session-validation'
import { createClient } from '@/lib/supabase/server'

// Mock the session validation middleware
jest.mock('@/lib/middleware/session-validation')
jest.mock('@/lib/supabase/server')

// Mock next/headers
jest.mock('next/headers', () => ({
  cookies: jest.fn(() => ({
    get: jest.fn(),
    set: jest.fn(),
    delete: jest.fn(),
  })),
}))

describe('Authorization Middleware Integration Tests', () => {
  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('Authentication Tests', () => {
    it('should reject requests without valid authentication', async () => {
      ;(validateSessionMiddleware as jest.Mock).mockResolvedValue({
        isValid: false,
        user: null,
      })

      const request = new NextRequest('http://localhost/api/test')
      const result = await requireAuth(request)

      expect(result).toHaveProperty('status', 401)
    })

    it('should accept requests with valid authentication', async () => {
      const mockUser = { id: 'user-123', email: 'test@example.com' }
      ;(validateSessionMiddleware as jest.Mock).mockResolvedValue({
        isValid: true,
        user: mockUser,
        session: { state: 'active' },
        wasRefreshed: false,
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
      ;(validateSessionMiddleware as jest.Mock).mockRejectedValue(
        new Error('Test error')
      )

      const request = new NextRequest('http://localhost/api/test')
      const result = await requireAuth(request)

      expect(result).toHaveProperty('status', 500)
    })
  })

  describe('Resource Ownership Tests', () => {
    let mockSupabase
    beforeEach(() => {
      mockSupabase = {
        from: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn(),
      }
      ;(createClient as jest.Mock).mockReturnValue(mockSupabase)
    })
    it('should verify user owns update resource', async () => {
      mockSupabase.from('updates').select('parent_id').eq('id', 'update-456').single.mockResolvedValue({
        data: { parent_id: 'user-123' },
        error: null,
      })

      const isOwner = await verifyResourceOwnership(
        'user-123',
        'update',
        'update-456'
      )
      expect(isOwner).toBe(true)
    })

    it('should reject access to resources owned by other users', async () => {
      mockSupabase.from('updates').select('parent_id').eq('id', 'update-456').single.mockResolvedValue({
        data: { parent_id: 'other-user-789' },
        error: null,
      })

      const isOwner = await verifyResourceOwnership(
        'user-123',
        'update',
        'update-456'
      )
      expect(isOwner).toBe(false)
    })
  })

  describe('Notification Permission Tests', () => {
    let mockSupabase
    beforeEach(() => {
      mockSupabase = {
        from: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        in: jest.fn().mockReturnThis(),
      }
      ;(createClient as jest.Mock).mockReturnValue(mockSupabase)
    })

    it('should allow sending to owned recipients', async () => {
      const mockOwnedEmails = [
        { email: 'recipient1@example.com' },
        { email: 'recipient2@example.com' },
      ]
      mockSupabase.from().select().eq().in.mockResolvedValue({
        data: mockOwnedEmails,
        error: null,
      })

      const { allowed, ownedEmails } = await verifyNotificationPermissions(
        'user-123',
        ['recipient1@example.com', 'recipient2@example.com']
      )

      expect(allowed).toBe(true)
      expect(ownedEmails).toEqual(['recipient1@example.com', 'recipient2@example.com'])
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
  })
})