/**
 * Security validation tests
 */
import { describe, test, expect } from '@jest/globals'
import { NextRequest, NextResponse } from 'next/server'

// Mock JSDOM for server-side testing
const mockWindow = {
  document: {
    createElement: () => ({
      innerHTML: '',
      textContent: ''
    })
  }
}

// Mock DOMPurify
jest.mock('jsdom', () => ({
  JSDOM: jest.fn().mockImplementation(() => ({ window: mockWindow }))
}))

jest.mock('dompurify', () => ({
  __esModule: true,
  default: jest.fn().mockImplementation(() => ({
    sanitize: jest.fn().mockImplementation((html: string) => {
      // Basic sanitization mock - removes script tags
      return html.replace(/<script[^>]*>.*?<\/script>/gi, '')
    })
  }))
}))

jest.mock('../lib/middleware/authorization', () => ({
  requireAuth: jest.fn()
}))

describe('Security Validation', () => {
  describe('Email Schema Validation', () => {
    test('should validate correct email addresses', async () => {
      const { emailSchema } = await import('../lib/validation/security')

      expect(() => emailSchema.parse('test@example.com')).not.toThrow()
      expect(() => emailSchema.parse('user.name+tag@domain.co.uk')).not.toThrow()
    })

    test('should reject invalid email addresses', async () => {
      const { emailSchema } = await import('../lib/validation/security')

      expect(() => emailSchema.parse('invalid-email')).toThrow()
      expect(() => emailSchema.parse('user@')).toThrow()
      expect(() => emailSchema.parse('@domain.com')).toThrow()
      expect(() => emailSchema.parse('user..name@domain.com')).toThrow()
    })

    test('should reject emails with suspicious content', async () => {
      const { emailSchema } = await import('../lib/validation/security')

      expect(() => emailSchema.parse('javascript:alert@domain.com')).toThrow()
      expect(() => emailSchema.parse('test<script>@domain.com')).toThrow()
    })
  })

  describe('HTML Sanitization', () => {
    test('should remove malicious script tags', async () => {
      const { sanitizeHtml } = await import('../lib/validation/security')

      const maliciousHtml = '<p>Safe content</p><script>alert("XSS")</script>'
      const sanitized = sanitizeHtml(maliciousHtml)

      expect(sanitized).toContain('<p>Safe content</p>')
      expect(sanitized).not.toContain('<script>')
      expect(sanitized).not.toContain('alert')
    })

    test('should handle sanitization errors gracefully', async () => {
      const { sanitizeHtml } = await import('../lib/validation/security')

      const htmlWithTags = '<div><script>evil()</script><p>Good content</p></div>'
      const sanitized = sanitizeHtml(htmlWithTags)

      // Should not throw and should return some content
      expect(typeof sanitized).toBe('string')
    })
  })

  describe('Text Sanitization', () => {
    test('should remove control characters', async () => {
      const { sanitizeText } = await import('../lib/validation/security')

      const textWithControlChars = 'Normal text\x00\x01\x02with control chars'
      const sanitized = sanitizeText(textWithControlChars)

      expect(sanitized).toBe('Normal textwith control chars')
      expect(sanitized).not.toMatch(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/)
    })

    test('should preserve valid newlines and tabs', async () => {
      const { sanitizeText } = await import('../lib/validation/security')

      const textWithValidChars = 'Line 1\nLine 2\tTabbed'
      const sanitized = sanitizeText(textWithValidChars)

      expect(sanitized).toBe('Line 1\nLine 2\tTabbed')
    })
  })

  describe('URL Validation', () => {
    test('should validate HTTPS URLs', async () => {
      const { urlSchema } = await import('../lib/validation/security')

      expect(() => urlSchema.parse('https://example.com')).not.toThrow()
      expect(() => urlSchema.parse('http://example.com')).not.toThrow()
    })

    test('should reject non-HTTP protocols', async () => {
      const { urlSchema } = await import('../lib/validation/security')

      expect(() => urlSchema.parse('javascript:void(0)')).toThrow()
      expect(() => urlSchema.parse('data:text/html,<script>')).toThrow()
      expect(() => urlSchema.parse('file:///etc/passwd')).toThrow()
    })

    test('should block localhost in production', async () => {
      const originalEnv = process.env.NODE_ENV
      process.env.NODE_ENV = 'production'

      try {
        const { urlSchema } = await import('../lib/validation/security')

        expect(() => urlSchema.parse('http://localhost:3000')).toThrow()
        expect(() => urlSchema.parse('http://127.0.0.1:8080')).toThrow()
        expect(() => urlSchema.parse('http://192.168.1.1')).toThrow()
      } finally {
        process.env.NODE_ENV = originalEnv
      }
    })
  })

  describe('Secure String Schema', () => {
    test('should create schema with length limits', async () => {
      const { createSecureStringSchema } = await import('../lib/validation/security')

      const schema = createSecureStringSchema(5, 20, false)

      expect(() => schema.parse('Valid text')).not.toThrow()
      expect(() => schema.parse('Hi')).toThrow() // Too short (2 chars < 5)
      expect(() => schema.parse('This text is way too long for the limit')).toThrow() // Too long
    })

    test('should reject malicious patterns', async () => {
      const { createSecureStringSchema } = await import('../lib/validation/security')

      const schema = createSecureStringSchema(1, 100, false)

      expect(() => schema.parse('SELECT * FROM users')).toThrow()
      expect(() => schema.parse('<script>alert("xss")</script>')).toThrow()
      expect(() => schema.parse('javascript:void(0)')).toThrow()
    })
  })

  describe('Validation Patterns', () => {
    test('should export validation patterns', async () => {
      const { ValidationPatterns } = await import('../lib/validation/security')

      expect(ValidationPatterns.UUID).toBeInstanceOf(RegExp)
      expect(ValidationPatterns.ALPHANUMERIC).toBeInstanceOf(RegExp)
      expect(ValidationPatterns.PHONE).toBeInstanceOf(RegExp)
      expect(ValidationPatterns.SLUG).toBeInstanceOf(RegExp)
    })

    test('UUID pattern should work correctly', async () => {
      const { ValidationPatterns } = await import('../lib/validation/security')

      expect(ValidationPatterns.UUID.test('550e8400-e29b-41d4-a716-446655440000')).toBe(true)
      expect(ValidationPatterns.UUID.test('not-a-uuid')).toBe(false)
    })

    test('phone pattern should validate E.164 format', async () => {
      const { ValidationPatterns } = await import('../lib/validation/security')

      expect(ValidationPatterns.PHONE.test('+1234567890')).toBe(true)
      expect(ValidationPatterns.PHONE.test('1234567890')).toBe(true)
      expect(ValidationPatterns.PHONE.test('+44123456789')).toBe(true)
      expect(ValidationPatterns.PHONE.test('invalid-phone')).toBe(false)
    })
  })
})

describe('Security Middleware', () => {
  test('should export security configurations', async () => {
    const { SecurityConfigs } = await import('../lib/middleware/security')

    expect(SecurityConfigs.debug).toBeDefined()
    expect(SecurityConfigs.publicApi).toBeDefined()
    expect(SecurityConfigs.adminOnly).toBeDefined()
    expect(SecurityConfigs.development).toBeDefined()

    expect(SecurityConfigs.debug.allowInProduction).toBe(false)
    expect(SecurityConfigs.publicApi.allowInProduction).toBe(true)
    expect(SecurityConfigs.adminOnly.requireAuth).toBe(true)
  })
})

describe('withSecurity authentication enforcement', () => {
  test('adminOnly should reject unauthenticated requests', async () => {
    const { requireAuth } = await import('../lib/middleware/authorization')
    const mockRequireAuth = requireAuth as jest.MockedFunction<typeof requireAuth>
    mockRequireAuth.mockResolvedValueOnce(
      NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    )

    const { withSecurity, SecurityConfigs } = await import('../lib/middleware/security')
    const handler = jest.fn().mockResolvedValue(NextResponse.json({ ok: true }))
    const request = new NextRequest('https://example.com/api/admin', {
      method: 'GET',
      headers: new Headers({ 'user-agent': 'jest', referer: 'https://example.com' })
    })

    const securedHandler = withSecurity(SecurityConfigs.adminOnly)(handler)
    const response = await securedHandler(request)

    expect(mockRequireAuth).toHaveBeenCalledTimes(1)
    expect(handler).not.toHaveBeenCalled()
    expect(response.status).toBe(401)

    mockRequireAuth.mockReset()
  })
})

describe('Rate Limiting', () => {
  test('should export rate limit configurations', async () => {
    const { RateLimitConfigs } = await import('../lib/middleware/rateLimiting')

    expect(RateLimitConfigs.standard).toBeDefined()
    expect(RateLimitConfigs.email).toBeDefined()
    expect(RateLimitConfigs.bulk).toBeDefined()
    expect(RateLimitConfigs.testing).toBeDefined()
    expect(RateLimitConfigs.auth).toBeDefined()

    expect(RateLimitConfigs.email.maxRequests).toBeLessThan(RateLimitConfigs.standard.maxRequests)
    expect(RateLimitConfigs.bulk.maxRequests).toBeLessThan(RateLimitConfigs.email.maxRequests)
  })

  test('should export key generators', async () => {
    const { KeyGenerators } = await import('../lib/middleware/rateLimiting')

    expect(typeof KeyGenerators.user).toBe('function')
    expect(typeof KeyGenerators.ip).toBe('function')
    expect(typeof KeyGenerators.userIp).toBe('function')
    expect(typeof KeyGenerators.endpoint).toBe('function')
    expect(typeof KeyGenerators.global).toBe('function')
  })
})