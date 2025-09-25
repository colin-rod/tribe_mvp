import { NextRequest, NextResponse } from 'next/server'
import { createLogger } from '@/lib/logger'
import { sanitizeText, createSecureStringSchema } from '@/lib/validation/security'

const logger = createLogger('SecurityMiddleware')

export interface SecurityConfig {
  requireAuth?: boolean
  allowInProduction?: boolean
  rateLimitConfig?: {
    maxRequests: number
    windowMinutes: number
  }
  sanitizeQuery?: boolean
  sanitizeHeaders?: boolean
  allowedMethods?: string[]
  requireHttps?: boolean
}

/**
 * Security middleware for debug and sensitive endpoints
 */
export function withSecurity(config: SecurityConfig = {}) {
  return function securityMiddleware(
    handler: (request: NextRequest, ...args: any[]) => Promise<NextResponse>
  ) {
    return async (request: NextRequest, ...args: any[]): Promise<NextResponse> => {
      try {
        // Check if endpoint is allowed in production
        if (!config.allowInProduction && process.env.NODE_ENV === 'production') {
          return NextResponse.json(
            { error: 'Endpoint not available in production' },
            { status: 404 }
          )
        }

        // Check HTTPS requirement
        if (config.requireHttps &&
            process.env.NODE_ENV === 'production' &&
            request.nextUrl.protocol !== 'https:') {
          return NextResponse.json(
            { error: 'HTTPS required' },
            { status: 400 }
          )
        }

        // Check allowed methods
        if (config.allowedMethods && !config.allowedMethods.includes(request.method)) {
          return NextResponse.json(
            { error: `Method ${request.method} not allowed` },
            { status: 405 }
          )
        }

        // Sanitize query parameters if requested
        if (config.sanitizeQuery) {
          const sanitizedUrl = sanitizeUrlParameters(request.nextUrl)
          if (sanitizedUrl !== request.nextUrl.toString()) {
            logger.warn('Potentially malicious query parameters detected', {
              original: request.nextUrl.toString(),
              sanitized: sanitizedUrl,
              ip: getClientIP(request),
              userAgent: request.headers.get('user-agent')
            })
          }
        }

        // Sanitize headers if requested
        if (config.sanitizeHeaders) {
          const suspiciousHeaders = detectSuspiciousHeaders(request)
          if (suspiciousHeaders.length > 0) {
            logger.warn('Suspicious headers detected', {
              headers: suspiciousHeaders,
              ip: getClientIP(request),
              userAgent: request.headers.get('user-agent')
            })
          }
        }

        // Log access for audit trail
        logger.info('Security endpoint accessed', {
          path: request.nextUrl.pathname,
          method: request.method,
          ip: getClientIP(request),
          userAgent: request.headers.get('user-agent'),
          referer: request.headers.get('referer')
        })

        const response = await handler(request, ...args)

        // Add security headers to response
        response.headers.set('X-Content-Type-Options', 'nosniff')
        response.headers.set('X-Frame-Options', 'DENY')
        response.headers.set('X-XSS-Protection', '1; mode=block')
        response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
        response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate')
        response.headers.set('Pragma', 'no-cache')

        // Add CSP for debug endpoints
        if (request.nextUrl.pathname.includes('/debug')) {
          response.headers.set(
            'Content-Security-Policy',
            "default-src 'none'; script-src 'none'; style-src 'none'; img-src 'none'; connect-src 'none'; font-src 'none'; object-src 'none'; media-src 'none'; frame-src 'none';"
          )
        }

        return response

      } catch (error) {
        logger.errorWithStack('Security middleware error', error as Error, {
          path: request.nextUrl.pathname,
          method: request.method,
          ip: getClientIP(request)
        })

        return NextResponse.json(
          { error: 'Internal security error' },
          { status: 500 }
        )
      }
    }
  }
}

/**
 * Extract client IP address from request
 */
function getClientIP(request: NextRequest): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    request.headers.get('cf-connecting-ip') ||
    'unknown'
  )
}

/**
 * Sanitize URL parameters to prevent injection attacks
 */
function sanitizeUrlParameters(url: URL): string {
  const sanitizedSearchParams = new URLSearchParams()

  for (const [key, value] of url.searchParams.entries()) {
    try {
      // Validate parameter name
      const sanitizedKey = sanitizeText(key)
      if (sanitizedKey !== key) {
        logger.warn('Suspicious query parameter name detected', { original: key, sanitized: sanitizedKey })
        continue // Skip suspicious parameters
      }

      // Sanitize parameter value
      const sanitizedValue = sanitizeText(value)

      // Apply length limits
      if (sanitizedKey.length > 50) {
        logger.warn('Query parameter name too long', { key: sanitizedKey })
        continue
      }

      if (sanitizedValue.length > 1000) {
        logger.warn('Query parameter value too long', { key: sanitizedKey, valueLength: sanitizedValue.length })
        continue
      }

      sanitizedSearchParams.append(sanitizedKey, sanitizedValue)
    } catch (error) {
      logger.warn('Error sanitizing query parameter', { key, error: (error as Error).message })
    }
  }

  const sanitizedUrl = new URL(url.pathname, url.origin)
  sanitizedUrl.search = sanitizedSearchParams.toString()
  return sanitizedUrl.toString()
}

/**
 * Detect suspicious headers that might indicate attacks
 */
function detectSuspiciousHeaders(request: NextRequest): string[] {
  const suspiciousHeaders: string[] = []

  const suspiciousPatterns = [
    /script/i,
    /javascript:/i,
    /vbscript:/i,
    /data:/i,
    /<.*>/,
    /\${.*}/,
    /\%\{.*}/,
    /\{\{.*\}\}/
  ]

  for (const [name, value] of request.headers.entries()) {
    if (value) {
      for (const pattern of suspiciousPatterns) {
        if (pattern.test(value)) {
          suspiciousHeaders.push(`${name}: ${value.substring(0, 100)}`)
          break
        }
      }
    }
  }

  return suspiciousHeaders
}

/**
 * Validate request body for security issues
 */
export function validateRequestBody(body: any): { valid: boolean; errors: string[] } {
  const errors: string[] = []

  if (!body) {
    return { valid: true, errors: [] }
  }

  try {
    // Convert body to string for analysis if it's an object
    const bodyStr = typeof body === 'string' ? body : JSON.stringify(body)

    // Check for common injection patterns
    const maliciousPatterns = [
      { pattern: /<script[\s\S]*?>[\s\S]*?<\/script>/gi, type: 'XSS script tag' },
      { pattern: /javascript:/gi, type: 'JavaScript protocol' },
      { pattern: /vbscript:/gi, type: 'VBScript protocol' },
      { pattern: /on\w+\s*=/gi, type: 'Event handler' },
      { pattern: /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION)\b)/gi, type: 'SQL keyword' },
      { pattern: /(\||\\x7C)/gi, type: 'Pipe character' },
      { pattern: /data:text\/html/gi, type: 'Data URI HTML' },
      { pattern: /\${.*}/g, type: 'Template injection' },
      { pattern: /\{\{.*\}\}/g, type: 'Template injection (handlebars)' }
    ]

    for (const { pattern, type } of maliciousPatterns) {
      if (pattern.test(bodyStr)) {
        errors.push(`Potentially malicious ${type} detected`)
      }
    }

    // Check body size
    if (bodyStr.length > 1024 * 1024) { // 1MB limit
      errors.push('Request body too large')
    }

    // Check for nested depth (prevent JSON bomb attacks)
    if (typeof body === 'object') {
      const depth = getObjectDepth(body)
      if (depth > 10) {
        errors.push('Request body structure too deep')
      }
    }

  } catch (error) {
    errors.push('Failed to validate request body')
  }

  return { valid: errors.length === 0, errors }
}

/**
 * Calculate object nesting depth
 */
function getObjectDepth(obj: any, currentDepth = 0): number {
  if (currentDepth > 20) return 20 // Prevent stack overflow

  if (typeof obj !== 'object' || obj === null) {
    return currentDepth
  }

  if (Array.isArray(obj)) {
    return Math.max(currentDepth, ...obj.map(item => getObjectDepth(item, currentDepth + 1)))
  }

  const values = Object.values(obj)
  if (values.length === 0) return currentDepth

  return Math.max(currentDepth, ...values.map(value => getObjectDepth(value, currentDepth + 1)))
}

/**
 * Create a secure string validator for input fields
 */
export const secureStringValidator = createSecureStringSchema(1, 1000, false)

/**
 * Predefined security configurations for common scenarios
 */
export const SecurityConfigs = {
  debug: {
    allowInProduction: false,
    sanitizeQuery: true,
    sanitizeHeaders: true,
    allowedMethods: ['GET'],
    requireHttps: true
  },

  publicApi: {
    allowInProduction: true,
    sanitizeQuery: true,
    sanitizeHeaders: true,
    requireHttps: true
  },

  adminOnly: {
    requireAuth: true,
    allowInProduction: true,
    sanitizeQuery: true,
    sanitizeHeaders: true,
    requireHttps: true
  },

  development: {
    allowInProduction: false,
    sanitizeQuery: false,
    sanitizeHeaders: false,
    allowedMethods: ['GET', 'POST']
  }
}