import { NextRequest, NextResponse } from 'next/server'
import { createLogger } from '@/lib/logger'
import { rateLimitKeySchema } from '@/lib/validation/security'

const logger = createLogger('RateLimiting')

export interface RateLimitConfig {
  maxRequests: number
  windowMinutes: number
  skipSuccessfulRequests?: boolean
  skipFailedRequests?: boolean
  keyGenerator?: (request: NextRequest, userId?: string) => string
}

export interface RateLimitInfo {
  count: number
  resetTime: number
  remaining: number
  total: number
}

/**
 * Enhanced in-memory rate limiter with multiple features
 * In production, this should be replaced with Redis
 */
class EnhancedRateLimiter {
  private limits = new Map<string, RateLimitInfo>()
  private cleanupInterval: NodeJS.Timeout | null = null

  constructor() {
    // Clean up expired entries every 5 minutes
    this.cleanupInterval = setInterval(() => {
      this.cleanup()
    }, 5 * 60 * 1000)
  }

  private cleanup(): void {
    const now = Date.now()
    let cleaned = 0

    for (const [key, info] of this.limits.entries()) {
      if (now > info.resetTime) {
        this.limits.delete(key)
        cleaned++
      }
    }

    if (cleaned > 0) {
      logger.debug(`Cleaned up ${cleaned} expired rate limit entries`)
    }
  }

  checkLimit(key: string, config: RateLimitConfig): { allowed: boolean; info: RateLimitInfo } {
    try {
      // Validate key format for security
      rateLimitKeySchema.parse(key)

      const now = Date.now()
      const windowMs = config.windowMinutes * 60 * 1000

      let info = this.limits.get(key)

      // Initialize or reset if window expired
      if (!info || now > info.resetTime) {
        info = {
          count: 0,
          resetTime: now + windowMs,
          remaining: config.maxRequests,
          total: config.maxRequests
        }
      }

      // Check if limit exceeded
      const allowed = info.count < config.maxRequests

      if (allowed) {
        info.count++
        info.remaining = Math.max(0, config.maxRequests - info.count)
        this.limits.set(key, info)
      }

      return { allowed, info }
    } catch (error) {
      logger.error('Rate limit check error', { key, error: (error as Error).message })
      // Fail securely - deny request if validation fails
      return {
        allowed: false,
        info: {
          count: config.maxRequests,
          resetTime: Date.now() + (config.windowMinutes * 60 * 1000),
          remaining: 0,
          total: config.maxRequests
        }
      }
    }
  }

  reset(key: string): void {
    this.limits.delete(key)
  }

  getInfo(key: string): RateLimitInfo | null {
    return this.limits.get(key) || null
  }

  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval)
      this.cleanupInterval = null
    }
    this.limits.clear()
  }
}

// Global rate limiter instance
const rateLimiter = new EnhancedRateLimiter()

/**
 * Default key generators for different scenarios
 */
export const KeyGenerators = {
  // User-based limiting
  user: (request: NextRequest, userId?: string) => `user:${userId || 'anonymous'}`,

  // IP-based limiting
  ip: (request: NextRequest) => {
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0] ||
              request.headers.get('x-real-ip') ||
              'unknown'
    return `ip:${ip}`
  },

  // Combined user + IP limiting
  userIp: (request: NextRequest, userId?: string) => {
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0] ||
              request.headers.get('x-real-ip') ||
              'unknown'
    return `user-ip:${userId || 'anonymous'}:${ip}`
  },

  // Endpoint-specific limiting
  endpoint: (request: NextRequest, userId?: string) => {
    const path = request.nextUrl.pathname
    return `endpoint:${userId || 'anonymous'}:${path}`
  },

  // Global limiting
  global: () => 'global'
}

/**
 * Check rate limit with enhanced configuration
 */
export function checkRateLimit(
  request: NextRequest,
  config: RateLimitConfig,
  userId?: string
): { allowed: boolean; info: RateLimitInfo } {
  const keyGenerator = config.keyGenerator || KeyGenerators.user
  const key = keyGenerator(request, userId)

  const result = rateLimiter.checkLimit(key, config)

  if (!result.allowed) {
    logger.warn('Rate limit exceeded', {
      key,
      userId,
      path: request.nextUrl.pathname,
      ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip'),
      userAgent: request.headers.get('user-agent'),
      count: result.info.count,
      maxRequests: config.maxRequests,
      windowMinutes: config.windowMinutes
    })
  }

  return result
}

/**
 * Simple rate limit check (backwards compatible)
 */
export function simpleRateLimit(userId: string, maxRequests: number = 10, windowMinutes: number = 1): boolean {
  const key = `user:${userId || 'anonymous'}`

  const { allowed } = rateLimiter.checkLimit(key, {
    maxRequests,
    windowMinutes
  })

  return allowed
}

/**
 * Middleware for applying rate limiting to API routes
 */
export function withRateLimit(config: RateLimitConfig) {
  return function rateLimitMiddleware(
    handler: (request: NextRequest, ...args: unknown[]) => Promise<NextResponse>
  ) {
    return async (request: NextRequest, ...args: unknown[]): Promise<NextResponse> => {
      // Extract user ID if available (for user-based limiting)
      let userId: string | undefined

      try {
        // This is a simple extraction - in real implementation,
        // you'd integrate with your auth system
        const authHeader = request.headers.get('authorization')
        if (authHeader) {
          // Extract user ID from token if possible
          // This is implementation-specific
        }
      } catch {
        // Ignore auth extraction errors for rate limiting
      }

      const { allowed, info } = checkRateLimit(request, config, userId)

      if (!allowed) {
        return NextResponse.json(
          {
            error: 'Rate limit exceeded. Please try again later.',
            details: {
              limit: info.total,
              remaining: info.remaining,
              resetTime: new Date(info.resetTime).toISOString(),
              retryAfter: Math.ceil((info.resetTime - Date.now()) / 1000)
            }
          },
          {
            status: 429,
            headers: {
              'X-RateLimit-Limit': info.total.toString(),
              'X-RateLimit-Remaining': info.remaining.toString(),
              'X-RateLimit-Reset': Math.ceil(info.resetTime / 1000).toString(),
              'Retry-After': Math.ceil((info.resetTime - Date.now()) / 1000).toString()
            }
          }
        )
      }

      // Add rate limit headers to successful responses
      const response = await handler(request, ...args)

      response.headers.set('X-RateLimit-Limit', info.total.toString())
      response.headers.set('X-RateLimit-Remaining', info.remaining.toString())
      response.headers.set('X-RateLimit-Reset', Math.ceil(info.resetTime / 1000).toString())

      return response
    }
  }
}

/**
 * Predefined rate limit configurations
 */
export const RateLimitConfigs = {
  // General API endpoints
  standard: { maxRequests: 100, windowMinutes: 15 },

  // Email sending (more restrictive)
  email: { maxRequests: 50, windowMinutes: 10 },

  // Bulk operations (very restrictive)
  bulk: { maxRequests: 10, windowMinutes: 60 },

  // Test endpoints
  testing: { maxRequests: 20, windowMinutes: 5 },

  // Authentication endpoints
  auth: { maxRequests: 5, windowMinutes: 15 },

  // Read-only endpoints (more permissive)
  readonly: { maxRequests: 200, windowMinutes: 15 },

  // Critical security endpoints (very restrictive)
  security: { maxRequests: 3, windowMinutes: 60 }
}

// Export the rate limiter instance for advanced usage
export { rateLimiter }

// Cleanup on process termination
process.on('SIGTERM', () => {
  rateLimiter.destroy()
})

process.on('SIGINT', () => {
  rateLimiter.destroy()
})
