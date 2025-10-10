/**
 * Session Management Configuration
 * CRO-99: Missing Authentication Session Management
 *
 * Defines session timeout policies, refresh intervals, and security settings
 */

import { createLogger } from '../logger'

const logger = createLogger('session-config')

/**
 * Session timeout configuration (in milliseconds)
 */
export const SESSION_TIMEOUTS = {
  // Idle timeout - user inactive for this duration will be logged out
  IDLE_TIMEOUT: 30 * 60 * 1000, // 30 minutes

  // Absolute timeout - maximum session duration regardless of activity
  ABSOLUTE_TIMEOUT: 12 * 60 * 60 * 1000, // 12 hours

  // Grace period before hard logout (warning time)
  GRACE_PERIOD: 5 * 60 * 1000, // 5 minutes

  // Token refresh interval - check for token refresh
  REFRESH_CHECK_INTERVAL: 5 * 60 * 1000, // 5 minutes

  // Token expiry buffer - refresh token this duration before expiry
  REFRESH_BUFFER: 10 * 60 * 1000, // 10 minutes
} as const

/**
 * Session security configuration
 */
export const SESSION_SECURITY = {
  // Maximum concurrent sessions per user
  MAX_CONCURRENT_SESSIONS: 5,

  // Enable session fingerprinting (user agent, IP tracking)
  ENABLE_FINGERPRINTING: true,

  // Enable automatic token rotation on refresh
  ENABLE_TOKEN_ROTATION: true,

  // Require re-authentication for sensitive operations
  REQUIRE_REAUTH_FOR_SENSITIVE: true,

  // Session validation interval (how often to validate session health)
  VALIDATION_INTERVAL: 60 * 1000, // 1 minute
} as const

/**
 * Supabase JWT configuration
 * Based on Supabase best practices
 */
export const JWT_CONFIG = {
  // JWT expiration time (aligned with Supabase default)
  JWT_EXPIRY: 60 * 60 * 1000, // 1 hour

  // Minimum JWT expiry (Supabase recommendation)
  MIN_JWT_EXPIRY: 5 * 60 * 1000, // 5 minutes

  // Refresh token reuse interval (Supabase default)
  REFRESH_REUSE_INTERVAL: 10 * 1000, // 10 seconds
} as const

/**
 * Session state enumeration
 */
export enum SessionState {
  ACTIVE = 'active',
  IDLE = 'idle',
  EXPIRED = 'expired',
  INVALID = 'invalid',
  REQUIRES_REFRESH = 'requires_refresh',
  TERMINATED = 'terminated',
}

/**
 * Session validation result
 */
export interface SessionValidationResult {
  isValid: boolean
  state: SessionState
  expiresAt?: Date
  lastActivity?: Date
  requiresRefresh: boolean
  errors?: string[]
}

/**
 * Session metadata for tracking
 */
export interface SessionMetadata {
  userId: string
  sessionId?: string
  userAgent?: string
  ipAddress?: string
  createdAt: Date
  lastActivity: Date
  expiresAt: Date
}

/**
 * Calculate session expiry time
 */
export function calculateSessionExpiry(
  type: 'idle' | 'absolute' | 'jwt' = 'idle'
): Date {
  const now = new Date()

  switch (type) {
    case 'idle':
      return new Date(now.getTime() + SESSION_TIMEOUTS.IDLE_TIMEOUT)
    case 'absolute':
      return new Date(now.getTime() + SESSION_TIMEOUTS.ABSOLUTE_TIMEOUT)
    case 'jwt':
      return new Date(now.getTime() + SESSION_TIMEOUTS.REFRESH_BUFFER)
    default:
      return new Date(now.getTime() + SESSION_TIMEOUTS.IDLE_TIMEOUT)
  }
}

/**
 * Check if session should be refreshed
 */
export function shouldRefreshSession(expiresAt: Date): boolean {
  const now = new Date()
  const timeUntilExpiry = expiresAt.getTime() - now.getTime()

  // Refresh if token expires within the buffer period
  return timeUntilExpiry <= SESSION_TIMEOUTS.REFRESH_BUFFER
}

/**
 * Check if session is expired
 */
export function isSessionExpired(expiresAt: Date): boolean {
  const now = new Date()
  return now >= expiresAt
}

/**
 * Check if session is idle (no activity within idle timeout)
 */
export function isSessionIdle(lastActivity: Date): boolean {
  const now = new Date()
  const idleTime = now.getTime() - lastActivity.getTime()
  return idleTime >= SESSION_TIMEOUTS.IDLE_TIMEOUT
}

/**
 * Validate session timing
 */
export function validateSessionTiming(metadata: SessionMetadata): SessionValidationResult {
  const now = new Date()

  // Check if session has expired
  if (isSessionExpired(metadata.expiresAt)) {
    return {
      isValid: false,
      state: SessionState.EXPIRED,
      expiresAt: metadata.expiresAt,
      lastActivity: metadata.lastActivity,
      requiresRefresh: false,
      errors: ['Session has expired'],
    }
  }

  // Check if session is idle
  if (isSessionIdle(metadata.lastActivity)) {
    return {
      isValid: false,
      state: SessionState.IDLE,
      expiresAt: metadata.expiresAt,
      lastActivity: metadata.lastActivity,
      requiresRefresh: false,
      errors: ['Session is idle - no activity detected'],
    }
  }

  // Check if session should be refreshed
  const requiresRefresh = shouldRefreshSession(metadata.expiresAt)

  if (requiresRefresh) {
    logger.debug('Session requires refresh', {
      userId: metadata.userId,
      expiresAt: metadata.expiresAt,
      timeUntilExpiry: metadata.expiresAt.getTime() - now.getTime(),
    })
  }

  return {
    isValid: true,
    state: requiresRefresh ? SessionState.REQUIRES_REFRESH : SessionState.ACTIVE,
    expiresAt: metadata.expiresAt,
    lastActivity: metadata.lastActivity,
    requiresRefresh,
  }
}

/**
 * Get session configuration for environment
 */
export function getSessionConfig(): {
  timeouts: typeof SESSION_TIMEOUTS
  security: typeof SESSION_SECURITY
  jwt: typeof JWT_CONFIG
} {
  return {
    timeouts: SESSION_TIMEOUTS,
    security: SESSION_SECURITY,
    jwt: JWT_CONFIG,
  }
}

/**
 * Log session configuration on initialization
 */
logger.info('Session configuration loaded', {
  idleTimeout: SESSION_TIMEOUTS.IDLE_TIMEOUT / 1000 / 60 + ' minutes',
  absoluteTimeout: SESSION_TIMEOUTS.ABSOLUTE_TIMEOUT / 1000 / 60 / 60 + ' hours',
  jwtExpiry: JWT_CONFIG.JWT_EXPIRY / 1000 / 60 + ' minutes',
  maxConcurrentSessions: SESSION_SECURITY.MAX_CONCURRENT_SESSIONS,
  fingerprintingEnabled: SESSION_SECURITY.ENABLE_FINGERPRINTING,
})
