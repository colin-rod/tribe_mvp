/**
 * Client-side rate limiting utility using localStorage
 * Used for rate-limiting email verification resend requests
 *
 * CRO-268: Email Verification for New Signups
 */

export interface RateLimitConfig {
  maxAttempts: number
  windowMs: number
}

export interface RateLimitState {
  attempts: number
  expiresAt: number
}

const DEFAULT_CONFIG: RateLimitConfig = {
  maxAttempts: 3,
  windowMs: 60 * 60 * 1000, // 1 hour
}

/**
 * Get the current rate limit state for a given key
 */
export function getRateLimitState(key: string): RateLimitState | null {
  if (typeof window === 'undefined') {
    return null
  }

  try {
    const stored = localStorage.getItem(key)
    if (!stored) {
      return null
    }

    const state: RateLimitState = JSON.parse(stored)

    // Check if the rate limit window has expired
    if (Date.now() > state.expiresAt) {
      localStorage.removeItem(key)
      return null
    }

    return state
  } catch {
    // If parsing fails, remove the corrupted data
    localStorage.removeItem(key)
    return null
  }
}

/**
 * Check if a request is allowed under the rate limit
 */
export function isRateLimited(
  key: string,
  config: RateLimitConfig = DEFAULT_CONFIG
): boolean {
  const state = getRateLimitState(key)

  if (!state) {
    return false
  }

  return state.attempts >= config.maxAttempts
}

/**
 * Get the number of remaining attempts before rate limit
 */
export function getRemainingAttempts(
  key: string,
  config: RateLimitConfig = DEFAULT_CONFIG
): number {
  const state = getRateLimitState(key)

  if (!state) {
    return config.maxAttempts
  }

  return Math.max(0, config.maxAttempts - state.attempts)
}

/**
 * Get the time when the rate limit will reset (in milliseconds)
 */
export function getRateLimitResetTime(key: string): number | null {
  const state = getRateLimitState(key)

  if (!state) {
    return null
  }

  return state.expiresAt
}

/**
 * Increment the rate limit counter for a given key
 */
export function incrementRateLimit(
  key: string,
  config: RateLimitConfig = DEFAULT_CONFIG
): RateLimitState {
  if (typeof window === 'undefined') {
    throw new Error('Rate limiting is only available in the browser')
  }

  const state = getRateLimitState(key)

  const newState: RateLimitState = state
    ? {
        attempts: state.attempts + 1,
        expiresAt: state.expiresAt,
      }
    : {
        attempts: 1,
        expiresAt: Date.now() + config.windowMs,
      }

  try {
    localStorage.setItem(key, JSON.stringify(newState))
  } catch {
    // If localStorage is full or unavailable, fail silently
    // The rate limit will not be enforced, but the request will proceed
  }

  return newState
}

/**
 * Clear the rate limit for a given key
 */
export function clearRateLimit(key: string): void {
  if (typeof window === 'undefined') {
    return
  }

  try {
    localStorage.removeItem(key)
  } catch {
    // Fail silently if localStorage is unavailable
  }
}

/**
 * Format the time until rate limit reset in a human-readable format
 */
export function formatTimeUntilReset(expiresAt: number): string {
  const now = Date.now()
  const diff = Math.max(0, expiresAt - now)

  const minutes = Math.floor(diff / (60 * 1000))
  const seconds = Math.floor((diff % (60 * 1000)) / 1000)

  if (minutes > 0) {
    return `${minutes} minute${minutes !== 1 ? 's' : ''}`
  }

  return `${seconds} second${seconds !== 1 ? 's' : ''}`
}
