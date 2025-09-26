import { z } from 'zod'
import DOMPurify from 'dompurify'
import { JSDOM } from 'jsdom'

// Create server-side DOMPurify instance
const createDOMPurify = () => {
  const window = new JSDOM('').window
  return DOMPurify(window as unknown as Window)
}

/**
 * Comprehensive email validation regex that covers most valid email formats
 * Based on RFC 5322 specification with practical limitations
 */
const EMAIL_REGEX = /^[a-zA-Z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-zA-Z0-9!#$%&'*+/=?^_`{|}~-]+)*@(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]*[a-zA-Z0-9])?\.)+[a-zA-Z0-9](?:[a-zA-Z0-9-]*[a-zA-Z0-9])?$/

/**
 * Enhanced email validation that combines regex with Zod's built-in validation
 */
export const emailSchema = z
  .string()
  .min(1, 'Email is required')
  .max(320, 'Email address too long') // RFC 5321 limit
  .regex(EMAIL_REGEX, 'Invalid email format')
  .email('Invalid email address')
  .refine((email) => {
    // Additional validation for security
    const parts = email.split('@')
    if (parts.length !== 2) return false

    const [local, domain] = parts

    // Local part validation
    if (local.length > 64) return false // RFC 5321 limit
    if (local.startsWith('.') || local.endsWith('.')) return false
    if (local.includes('..')) return false

    // Domain part validation
    if (domain.length > 253) return false // RFC 1035 limit
    if (domain.startsWith('.') || domain.endsWith('.')) return false
    if (domain.includes('..')) return false

    // Check for suspicious patterns
    const suspiciousPatterns = [
      /javascript:/i,
      /data:/i,
      /vbscript:/i,
      /<script/i,
      /<\/script/i,
      /on\w+=/i,
      /style\s*=/i
    ]

    return !suspiciousPatterns.some(pattern => pattern.test(email))
  }, 'Email contains invalid or suspicious content')

/**
 * HTML content sanitization
 */
export const sanitizeHtml = (html: string): string => {
  try {
    const purify = createDOMPurify()

    // Configure DOMPurify for strict email content
    const config = {
      ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'u', 'b', 'i', 'span', 'div', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'ul', 'ol', 'li', 'a'],
      ALLOWED_ATTR: ['href', 'style', 'class'],
      ALLOWED_URI_REGEXP: /^(?:(?:https?|mailto):|[^a-z]|[a-z+.-]+(?:[^a-z+.-:]|$))/i,
      SANITIZE_DOM: true,
      KEEP_CONTENT: true,
      FORBID_TAGS: ['script', 'iframe', 'object', 'embed', 'form', 'input', 'textarea', 'select', 'button'],
      FORBID_ATTR: ['onclick', 'onload', 'onmouseover', 'onfocus', 'onblur', 'onchange', 'onsubmit', 'onreset']
    }

    return purify.sanitize(html, config)
  } catch {
    // Fallback: strip all HTML tags if sanitization fails
    return html.replace(/<[^>]*>/g, '')
  }
}

/**
 * Text content sanitization for plain text fields
 */
export const sanitizeText = (text: string): string => {
  // Remove null bytes and other control characters except newlines and tabs
  return text.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
}

/**
 * URL validation with security checks
 */
export const urlSchema = z
  .string()
  .url('Invalid URL format')
  .refine((url) => {
    try {
      const parsed = new URL(url)

      // Only allow http and https protocols
      if (!['http:', 'https:'].includes(parsed.protocol)) {
        return false
      }

      // Block localhost and internal IPs in production
      if (process.env.NODE_ENV === 'production') {
        const hostname = parsed.hostname.toLowerCase()

        // Block localhost
        if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1') {
          return false
        }

        // Block private IP ranges
        const privateIPRegex = /^(10\.|172\.(1[6-9]|2[0-9]|3[0-1])\.|192\.168\.)/
        if (privateIPRegex.test(hostname)) {
          return false
        }
      }

      return true
    } catch {
      return false
    }
  }, 'URL contains invalid or restricted content')

/**
 * Enhanced string validation with length limits and content filtering
 */
export const createSecureStringSchema = (
  minLength: number = 0,
  maxLength: number = 1000,
  allowHtml: boolean = false
) => {
  let schema = z.string().min(minLength).max(maxLength)

  if (allowHtml) {
    schema = schema.transform(sanitizeHtml).refine((value) => {
      // Check for remaining malicious patterns after sanitization
      const maliciousPatterns = [
        /<script[\s\S]*?>[\s\S]*?<\/script>/gi,
        /javascript:/gi,
        /vbscript:/gi,
        /on\w+\s*=/gi
      ]
      return !maliciousPatterns.some(pattern => pattern.test(value))
    }, 'Content contains potentially malicious code')
  } else {
    schema = schema.transform(sanitizeText).refine((value) => {
      // Check for SQL injection patterns
      const sqlPatterns = [
        /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION)\b)/i,
        /('|(\\x27)|(\\x2D){2})/i,
        /(\||\\x7C)/i,
        /(\*|\\x2A)/i
      ]

      // Check for XSS patterns
      const xssPatterns = [
        /<script[\s\S]*?>[\s\S]*?<\/script>/gi,
        /<iframe[\s\S]*?>[\s\S]*?<\/iframe>/gi,
        /javascript:/gi,
        /vbscript:/gi,
        /on\w+\s*=/gi,
        /data:text\/html/gi
      ]

      const suspiciousPatterns = [...sqlPatterns, ...xssPatterns]
      return !suspiciousPatterns.some(pattern => pattern.test(value))
    }, 'Content contains potentially malicious code')
  }

  return schema
}

/**
 * Token validation schema
 */
export const tokenSchema = z
  .string()
  .min(1, 'Token is required')
  .max(255, 'Token too long')
  .regex(/^[a-zA-Z0-9_-]+$/, 'Token contains invalid characters')

/**
 * Rate limit key validation
 */
export const rateLimitKeySchema = z
  .string()
  .min(1)
  .max(100)
  .regex(/^[a-zA-Z0-9_:-]+$/, 'Invalid rate limit key format')

/**
 * Request metadata validation
 */
export const requestMetadataSchema = z.object({
  userAgent: z.string().max(500).optional(),
  ip: z.string().ip().optional(),
  referer: z.string().url().optional()
}).partial()

/**
 * Common validation patterns
 */
export const ValidationPatterns = {
  UUID: /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
  ALPHANUMERIC: /^[a-zA-Z0-9]+$/,
  SAFE_STRING: /^[a-zA-Z0-9\s\-._@]+$/,
  PHONE: /^\+?[1-9]\d{1,14}$/, // E.164 format
  SLUG: /^[a-z0-9]+(?:-[a-z0-9]+)*$/
}

/**
 * Security headers validation
 */
export const securityHeadersSchema = z.object({
  'content-security-policy': z.string().optional(),
  'x-frame-options': z.enum(['DENY', 'SAMEORIGIN']).optional(),
  'x-content-type-options': z.literal('nosniff').optional(),
  'x-xss-protection': z.literal('1; mode=block').optional(),
  'strict-transport-security': z.string().optional()
})

export { EMAIL_REGEX }
