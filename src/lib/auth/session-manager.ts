/**
 * Session Manager
 * CRO-99: Missing Authentication Session Management
 *
 * Centralized session management utilities for refresh, validation, and invalidation
 */

import { SupabaseClient, Session, User } from '@supabase/supabase-js'
import { createLogger } from '../logger'
import {
  SessionState,
  SessionValidationResult,
  SessionMetadata,
  validateSessionTiming,
  shouldRefreshSession,
  calculateSessionExpiry,
  SESSION_SECURITY,
} from '../config/session'

const logger = createLogger('session-manager')

/**
 * Session refresh result
 */
export interface SessionRefreshResult {
  success: boolean
  session: Session | null
  user: User | null
  error?: string
  wasRefreshed: boolean
}

/**
 * Session invalidation result
 */
export interface SessionInvalidationResult {
  success: boolean
  error?: string
}

/**
 * Extract session metadata from Supabase session
 */
export function extractSessionMetadata(
  session: Session,
  request?: {
    headers: Headers
  }
): SessionMetadata {
  // Extract JWT expiry from access token
  const accessToken = session.access_token
  let expiresAt = new Date()

  try {
    // Decode JWT to get expiry (without verification - just for metadata)
    const payload = JSON.parse(
      Buffer.from(accessToken.split('.')[1], 'base64').toString()
    )
    expiresAt = new Date(payload.exp * 1000)
  } catch (error) {
    logger.warn('Failed to decode JWT for expiry', {
      error: error instanceof Error ? error.message : String(error),
    })
    // Fallback to calculating expiry
    expiresAt = calculateSessionExpiry('jwt')
  }

  // Extract user agent and IP if available
  const userAgent = request?.headers.get('user-agent') || undefined
  const ipAddress =
    request?.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
    request?.headers.get('x-real-ip') ||
    undefined

  return {
    userId: session.user.id,
    sessionId: session.access_token.substring(0, 20), // Use part of token as session ID
    userAgent: SESSION_SECURITY.ENABLE_FINGERPRINTING ? userAgent : undefined,
    ipAddress: SESSION_SECURITY.ENABLE_FINGERPRINTING ? ipAddress : undefined,
    createdAt: new Date(session.user.created_at || Date.now()),
    lastActivity: new Date(),
    expiresAt,
  }
}

/**
 * Validate session and determine if refresh is needed
 */
export async function validateSession(
  supabase: SupabaseClient,
  request?: {
    headers: Headers
  }
): Promise<SessionValidationResult> {
  try {
    // Get current session using getSession (safe for initial check)
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession()

    if (sessionError) {
      logger.warn('Session retrieval error', {
        error: sessionError.message,
      })
      return {
        isValid: false,
        state: SessionState.INVALID,
        requiresRefresh: false,
        errors: [sessionError.message],
      }
    }

    if (!session) {
      return {
        isValid: false,
        state: SessionState.TERMINATED,
        requiresRefresh: false,
        errors: ['No active session'],
      }
    }

    // Extract session metadata
    const metadata = extractSessionMetadata(session, request)

    // Validate using getUser() for security (best practice)
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      logger.warn('User validation failed', {
        error: userError?.message,
        hasUser: !!user,
      })
      return {
        isValid: false,
        state: SessionState.INVALID,
        requiresRefresh: false,
        errors: [userError?.message || 'User validation failed'],
      }
    }

    // Validate session timing
    const timingValidation = validateSessionTiming(metadata)

    if (!timingValidation.isValid) {
      return timingValidation
    }

    // Session is valid
    logger.debug('Session validated successfully', {
      userId: user.id,
      state: timingValidation.state,
      requiresRefresh: timingValidation.requiresRefresh,
      expiresAt: metadata.expiresAt,
    })

    return {
      isValid: true,
      state: timingValidation.state,
      expiresAt: metadata.expiresAt,
      lastActivity: metadata.lastActivity,
      requiresRefresh: timingValidation.requiresRefresh,
    }
  } catch (error) {
    logger.errorWithStack('Session validation error', error as Error)
    return {
      isValid: false,
      state: SessionState.INVALID,
      requiresRefresh: false,
      errors: [(error as Error).message],
    }
  }
}

/**
 * Refresh session if needed
 */
export async function refreshSessionIfNeeded(
  supabase: SupabaseClient
): Promise<SessionRefreshResult> {
  try {
    // Get current session
    const {
      data: { session: currentSession },
      error: sessionError,
    } = await supabase.auth.getSession()

    if (sessionError || !currentSession) {
      return {
        success: false,
        session: null,
        user: null,
        error: sessionError?.message || 'No active session',
        wasRefreshed: false,
      }
    }

    // Check if refresh is needed
    const metadata = extractSessionMetadata(currentSession)
    const needsRefresh = shouldRefreshSession(metadata.expiresAt)

    if (!needsRefresh) {
      logger.debug('Session does not need refresh', {
        userId: currentSession.user.id,
        expiresAt: metadata.expiresAt,
      })
      return {
        success: true,
        session: currentSession,
        user: currentSession.user,
        wasRefreshed: false,
      }
    }

    // Refresh the session
    logger.info('Refreshing session', {
      userId: currentSession.user.id,
      expiresAt: metadata.expiresAt,
    })

    const {
      data: { session: newSession, user },
      error: refreshError,
    } = await supabase.auth.refreshSession()

    if (refreshError || !newSession) {
      logger.error('Session refresh failed', {
        userId: currentSession.user.id,
        error: refreshError?.message,
      })
      return {
        success: false,
        session: null,
        user: null,
        error: refreshError?.message || 'Refresh failed',
        wasRefreshed: false,
      }
    }

    logger.info('Session refreshed successfully', {
      userId: user?.id,
      newExpiresAt: new Date(newSession.expires_at! * 1000),
    })

    return {
      success: true,
      session: newSession,
      user,
      wasRefreshed: true,
    }
  } catch (error) {
    logger.errorWithStack('Session refresh error', error as Error)
    return {
      success: false,
      session: null,
      user: null,
      error: (error as Error).message,
      wasRefreshed: false,
    }
  }
}

/**
 * Invalidate current session (logout)
 */
export async function invalidateSession(
  supabase: SupabaseClient
): Promise<SessionInvalidationResult> {
  try {
    logger.info('Invalidating session')

    const { error } = await supabase.auth.signOut()

    if (error) {
      logger.error('Session invalidation failed', {
        error: error.message,
      })
      return {
        success: false,
        error: error.message,
      }
    }

    logger.info('Session invalidated successfully')

    return {
      success: true,
    }
  } catch (error) {
    logger.errorWithStack('Session invalidation error', error as Error)
    return {
      success: false,
      error: (error as Error).message,
    }
  }
}

/**
 * Invalidate all sessions for a user (logout everywhere)
 */
export async function invalidateAllSessions(
  supabase: SupabaseClient,
  scope: 'global' | 'others' = 'global'
): Promise<SessionInvalidationResult> {
  try {
    logger.info('Invalidating all sessions', { scope })

    const { error } = await supabase.auth.signOut({ scope })

    if (error) {
      logger.error('Failed to invalidate all sessions', {
        error: error.message,
        scope,
      })
      return {
        success: false,
        error: error.message,
      }
    }

    logger.info('All sessions invalidated successfully', { scope })

    return {
      success: true,
    }
  } catch (error) {
    logger.errorWithStack('Invalidate all sessions error', error as Error)
    return {
      success: false,
      error: (error as Error).message,
    }
  }
}

/**
 * Get session info for debugging/monitoring
 */
export async function getSessionInfo(
  supabase: SupabaseClient,
  request?: {
    headers: Headers
  }
): Promise<{
  hasSession: boolean
  user: User | null
  metadata?: SessionMetadata
  validation?: SessionValidationResult
}> {
  try {
    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session) {
      return {
        hasSession: false,
        user: null,
      }
    }

    const {
      data: { user },
    } = await supabase.auth.getUser()

    const metadata = extractSessionMetadata(session, request)
    const validation = validateSessionTiming(metadata)

    return {
      hasSession: true,
      user,
      metadata,
      validation,
    }
  } catch (error) {
    logger.errorWithStack('Get session info error', error as Error)
    return {
      hasSession: false,
      user: null,
    }
  }
}
