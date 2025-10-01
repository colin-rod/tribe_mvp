import { Redis } from 'https://deno.land/x/upstash_redis@v1.22.1/mod.ts'

export interface RateLimitConfig {
  limit: number // number of requests
  window: number // time window in seconds
  prefix?: string // optional prefix for the key
}

export interface RateLimitResult {
  success: boolean
  limit: number
  remaining: number
  reset: number // timestamp when the limit resets
}

/**
 * Rate limiter using Upstash Redis
 * Implements a sliding window counter for accurate rate limiting
 */
export class RateLimiter {
  private redis: Redis

  constructor() {
    const url = Deno.env.get('UPSTASH_REDIS_REST_URL')
    const token = Deno.env.get('UPSTASH_REDIS_REST_TOKEN')

    if (!url || !token) {
      throw new Error('Missing Upstash Redis credentials: UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN required')
    }

    this.redis = new Redis({
      url,
      token,
    })
  }

  /**
   * Check if a request should be rate limited
   * @param identifier - Unique identifier (user ID, IP, parent_id, etc.)
   * @param config - Rate limit configuration
   * @returns RateLimitResult with success status and metadata
   */
  async limit(
    identifier: string,
    config: RateLimitConfig
  ): Promise<RateLimitResult> {
    const { limit, window, prefix = 'rate_limit' } = config
    const key = `${prefix}:${identifier}`
    const now = Date.now()
    const windowStart = now - (window * 1000)

    try {
      // Use Redis sorted set to implement sliding window
      // Score is timestamp, value is unique request ID
      const requestId = `${now}-${Math.random()}`

      // Pipeline multiple commands for efficiency
      const pipeline = this.redis.pipeline()

      // Add current request to sorted set
      pipeline.zadd(key, { score: now, member: requestId })

      // Remove old entries outside the window
      pipeline.zremrangebyscore(key, 0, windowStart)

      // Count requests in current window
      pipeline.zcard(key)

      // Set expiry to window + buffer
      pipeline.expire(key, window + 10)

      const results = await pipeline.exec()
      const count = results[2] as number

      const success = count <= limit
      const remaining = Math.max(0, limit - count)
      const reset = now + (window * 1000)

      return {
        success,
        limit,
        remaining,
        reset,
      }
    } catch (error) {
      console.error('Rate limiter error:', error)
      // Fail open - allow request if rate limiter fails
      return {
        success: true,
        limit,
        remaining: limit,
        reset: now + (window * 1000),
      }
    }
  }

  /**
   * Reset rate limit for a specific identifier
   * Useful for testing or manual overrides
   */
  async reset(identifier: string, prefix = 'rate_limit'): Promise<void> {
    const key = `${prefix}:${identifier}`
    await this.redis.del(key)
  }

  /**
   * Get current rate limit status without incrementing
   */
  async status(
    identifier: string,
    config: RateLimitConfig
  ): Promise<RateLimitResult> {
    const { limit, window, prefix = 'rate_limit' } = config
    const key = `${prefix}:${identifier}`
    const now = Date.now()
    const windowStart = now - (window * 1000)

    try {
      // Remove old entries
      await this.redis.zremrangebyscore(key, 0, windowStart)

      // Get current count
      const count = await this.redis.zcard(key) as number

      const remaining = Math.max(0, limit - count)
      const reset = now + (window * 1000)

      return {
        success: count < limit,
        limit,
        remaining,
        reset,
      }
    } catch (error) {
      console.error('Rate limiter status check error:', error)
      return {
        success: true,
        limit,
        remaining: limit,
        reset: now + (window * 1000),
      }
    }
  }
}

/**
 * Rate limit configurations for different operations
 */
export const RATE_LIMITS = {
  // AI Analysis: 10 requests per minute per parent
  AI_ANALYSIS: {
    limit: 10,
    window: 60, // 1 minute
    prefix: 'ai_analysis',
  },
  // Stricter limit for expensive operations
  AI_ANALYSIS_STRICT: {
    limit: 5,
    window: 60, // 1 minute
    prefix: 'ai_analysis_strict',
  },
  // Global IP-based limit to prevent abuse
  GLOBAL_IP: {
    limit: 50,
    window: 60, // 1 minute
    prefix: 'global_ip',
  },
} as const
