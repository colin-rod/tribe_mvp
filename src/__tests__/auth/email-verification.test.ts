/**
 * Email Verification Tests
 * CRO-268: Email Verification for New Signups
 */

import {
  getRateLimitState,
  isRateLimited,
  getRemainingAttempts,
  incrementRateLimit,
  clearRateLimit,
  formatTimeUntilReset,
} from '@/lib/utils/rate-limit'

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {}

  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString()
    },
    removeItem: (key: string) => {
      delete store[key]
    },
    clear: () => {
      store = {}
    },
  }
})()

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
})

describe('Rate Limiting Utility', () => {
  const testKey = 'test_rate_limit'

  beforeEach(() => {
    localStorage.clear()
  })

  describe('getRateLimitState', () => {
    it('should return null when no state exists', () => {
      const state = getRateLimitState(testKey)
      expect(state).toBeNull()
    })

    it('should return state when it exists and is not expired', () => {
      const futureTime = Date.now() + 60000 // 1 minute in future
      const mockState = { attempts: 1, expiresAt: futureTime }
      localStorage.setItem(testKey, JSON.stringify(mockState))

      const state = getRateLimitState(testKey)
      expect(state).toEqual(mockState)
    })

    it('should return null and clear state when expired', () => {
      const pastTime = Date.now() - 1000 // 1 second in past
      const mockState = { attempts: 1, expiresAt: pastTime }
      localStorage.setItem(testKey, JSON.stringify(mockState))

      const state = getRateLimitState(testKey)
      expect(state).toBeNull()
      expect(localStorage.getItem(testKey)).toBeNull()
    })

    it('should handle corrupted data gracefully', () => {
      localStorage.setItem(testKey, 'invalid json')

      const state = getRateLimitState(testKey)
      expect(state).toBeNull()
      expect(localStorage.getItem(testKey)).toBeNull()
    })
  })

  describe('isRateLimited', () => {
    it('should return false when no attempts have been made', () => {
      expect(isRateLimited(testKey)).toBe(false)
    })

    it('should return false when under limit', () => {
      const futureTime = Date.now() + 60000
      const mockState = { attempts: 2, expiresAt: futureTime }
      localStorage.setItem(testKey, JSON.stringify(mockState))

      expect(isRateLimited(testKey, { maxAttempts: 3, windowMs: 60000 })).toBe(false)
    })

    it('should return true when at limit', () => {
      const futureTime = Date.now() + 60000
      const mockState = { attempts: 3, expiresAt: futureTime }
      localStorage.setItem(testKey, JSON.stringify(mockState))

      expect(isRateLimited(testKey, { maxAttempts: 3, windowMs: 60000 })).toBe(true)
    })

    it('should return true when over limit', () => {
      const futureTime = Date.now() + 60000
      const mockState = { attempts: 5, expiresAt: futureTime }
      localStorage.setItem(testKey, JSON.stringify(mockState))

      expect(isRateLimited(testKey, { maxAttempts: 3, windowMs: 60000 })).toBe(true)
    })
  })

  describe('getRemainingAttempts', () => {
    it('should return max attempts when no state exists', () => {
      expect(getRemainingAttempts(testKey, { maxAttempts: 3, windowMs: 60000 })).toBe(3)
    })

    it('should return correct remaining attempts', () => {
      const futureTime = Date.now() + 60000
      const mockState = { attempts: 1, expiresAt: futureTime }
      localStorage.setItem(testKey, JSON.stringify(mockState))

      expect(getRemainingAttempts(testKey, { maxAttempts: 3, windowMs: 60000 })).toBe(2)
    })

    it('should return 0 when at limit', () => {
      const futureTime = Date.now() + 60000
      const mockState = { attempts: 3, expiresAt: futureTime }
      localStorage.setItem(testKey, JSON.stringify(mockState))

      expect(getRemainingAttempts(testKey, { maxAttempts: 3, windowMs: 60000 })).toBe(0)
    })

    it('should not return negative values', () => {
      const futureTime = Date.now() + 60000
      const mockState = { attempts: 5, expiresAt: futureTime }
      localStorage.setItem(testKey, JSON.stringify(mockState))

      expect(getRemainingAttempts(testKey, { maxAttempts: 3, windowMs: 60000 })).toBe(0)
    })
  })

  describe('incrementRateLimit', () => {
    it('should create initial state on first increment', () => {
      const result = incrementRateLimit(testKey, { maxAttempts: 3, windowMs: 60000 })

      expect(result.attempts).toBe(1)
      expect(result.expiresAt).toBeGreaterThan(Date.now())
    })

    it('should increment attempts', () => {
      const futureTime = Date.now() + 60000
      const mockState = { attempts: 1, expiresAt: futureTime }
      localStorage.setItem(testKey, JSON.stringify(mockState))

      const result = incrementRateLimit(testKey)

      expect(result.attempts).toBe(2)
      expect(result.expiresAt).toBe(futureTime)
    })

    it('should persist state to localStorage', () => {
      incrementRateLimit(testKey)

      const stored = localStorage.getItem(testKey)
      expect(stored).not.toBeNull()

      if (stored) {
        const parsed = JSON.parse(stored)
        expect(parsed.attempts).toBe(1)
      }
    })
  })

  describe('clearRateLimit', () => {
    it('should remove rate limit state', () => {
      const mockState = { attempts: 2, expiresAt: Date.now() + 60000 }
      localStorage.setItem(testKey, JSON.stringify(mockState))

      clearRateLimit(testKey)

      expect(localStorage.getItem(testKey)).toBeNull()
    })

    it('should not throw when clearing non-existent key', () => {
      expect(() => clearRateLimit('nonexistent')).not.toThrow()
    })
  })

  describe('formatTimeUntilReset', () => {
    it('should format minutes correctly', () => {
      const futureTime = Date.now() + 120000 // 2 minutes
      expect(formatTimeUntilReset(futureTime)).toContain('minute')
    })

    it('should format seconds correctly', () => {
      const futureTime = Date.now() + 30000 // 30 seconds
      expect(formatTimeUntilReset(futureTime)).toContain('second')
    })

    it('should handle singular minute', () => {
      const futureTime = Date.now() + 60000 // 1 minute
      const result = formatTimeUntilReset(futureTime)
      expect(result).toBe('1 minute')
    })

    it('should handle singular second', () => {
      const futureTime = Date.now() + 1000 // 1 second
      const result = formatTimeUntilReset(futureTime)
      expect(result).toBe('1 second')
    })

    it('should handle past times gracefully', () => {
      const pastTime = Date.now() - 1000 // 1 second ago
      const result = formatTimeUntilReset(pastTime)
      expect(result).toContain('second')
    })
  })

  describe('Integration: Rate Limiting Flow', () => {
    it('should enforce rate limiting after max attempts', () => {
      const config = { maxAttempts: 3, windowMs: 60000 }

      // Make 3 attempts
      for (let i = 0; i < 3; i++) {
        expect(isRateLimited(testKey, config)).toBe(false)
        incrementRateLimit(testKey, config)
      }

      // 4th attempt should be blocked
      expect(isRateLimited(testKey, config)).toBe(true)
      expect(getRemainingAttempts(testKey, config)).toBe(0)
    })

    it('should reset after expiry time', () => {
      const config = { maxAttempts: 3, windowMs: 100 } // 100ms window

      // Make 3 attempts
      for (let i = 0; i < 3; i++) {
        incrementRateLimit(testKey, config)
      }

      expect(isRateLimited(testKey, config)).toBe(true)

      // Wait for expiry
      return new Promise<void>((resolve) => {
        setTimeout(() => {
          expect(isRateLimited(testKey, config)).toBe(false)
          expect(getRemainingAttempts(testKey, config)).toBe(3)
          resolve()
        }, 150)
      })
    })

    it('should allow clearing rate limit manually', () => {
      const config = { maxAttempts: 3, windowMs: 60000 }

      // Hit rate limit
      for (let i = 0; i < 3; i++) {
        incrementRateLimit(testKey, config)
      }

      expect(isRateLimited(testKey, config)).toBe(true)

      // Clear and verify
      clearRateLimit(testKey)
      expect(isRateLimited(testKey, config)).toBe(false)
      expect(getRemainingAttempts(testKey, config)).toBe(3)
    })
  })
})

describe('Email Verification User Flow', () => {
  it('should follow expected user flow', () => {
    const userEmail = 'test@example.com'
    const rateLimitKey = `verify_resend_${userEmail}`
    const config = { maxAttempts: 3, windowMs: 3600000 } // 1 hour

    // User lands on verify-email page
    expect(isRateLimited(rateLimitKey, config)).toBe(false)
    expect(getRemainingAttempts(rateLimitKey, config)).toBe(3)

    // User clicks resend once
    incrementRateLimit(rateLimitKey, config)
    expect(getRemainingAttempts(rateLimitKey, config)).toBe(2)
    expect(isRateLimited(rateLimitKey, config)).toBe(false)

    // User clicks resend again
    incrementRateLimit(rateLimitKey, config)
    expect(getRemainingAttempts(rateLimitKey, config)).toBe(1)
    expect(isRateLimited(rateLimitKey, config)).toBe(false)

    // User clicks resend third time
    incrementRateLimit(rateLimitKey, config)
    expect(getRemainingAttempts(rateLimitKey, config)).toBe(0)
    expect(isRateLimited(rateLimitKey, config)).toBe(true)

    // User is now rate limited
    const state = getRateLimitState(rateLimitKey)
    expect(state).not.toBeNull()
    expect(state?.attempts).toBe(3)
  })
})
