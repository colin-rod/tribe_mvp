/**
 * Session Health Monitoring
 * CRO-99: Missing Authentication Session Management
 *
 * Utilities for monitoring session health, tracking activity, and managing session lifecycle
 */

import { createLogger } from '../logger'
import { SessionState, SESSION_TIMEOUTS } from '../config/session'
import { SupabaseClient } from '@supabase/supabase-js'
import { validateSession, getSessionInfo } from './session-manager'

const logger = createLogger('session-health')

/**
 * Session health status
 */
export interface SessionHealthStatus {
  healthy: boolean
  state: SessionState
  issues: string[]
  warnings: string[]
  metadata?: {
    userId: string
    expiresAt?: Date
    lastActivity?: Date
    timeUntilExpiry?: number
    idleTime?: number
  }
}

/**
 * Session activity tracking
 */
export interface SessionActivity {
  userId: string
  timestamp: Date
  action: string
  path?: string
  metadata?: Record<string, unknown>
}

// In-memory session activity store (replace with Redis in production)
const sessionActivityStore = new Map<string, SessionActivity[]>()

/**
 * Track session activity
 */
export function trackSessionActivity(activity: SessionActivity): void {
  const { userId } = activity
  const activities = sessionActivityStore.get(userId) || []

  activities.push(activity)

  // Keep only last 100 activities per user
  if (activities.length > 100) {
    activities.shift()
  }

  sessionActivityStore.set(userId, activities)

  logger.debug('Session activity tracked', {
    userId,
    action: activity.action,
    totalActivities: activities.length,
  })
}

/**
 * Get session activity history
 */
export function getSessionActivity(userId: string, limit = 10): SessionActivity[] {
  const activities = sessionActivityStore.get(userId) || []
  return activities.slice(-limit)
}

/**
 * Get last activity timestamp
 */
export function getLastActivity(userId: string): Date | null {
  const activities = sessionActivityStore.get(userId) || []
  if (activities.length === 0) {
    return null
  }
  return activities[activities.length - 1].timestamp
}

/**
 * Clear session activity for user
 */
export function clearSessionActivity(userId: string): void {
  sessionActivityStore.delete(userId)
  logger.debug('Session activity cleared', { userId })
}

/**
 * Check session health
 */
export async function checkSessionHealth(
  supabase: SupabaseClient,
  request?: {
    headers: Headers
  }
): Promise<SessionHealthStatus> {
  try {
    const validation = await validateSession(supabase, request)

    if (!validation.isValid) {
      return {
        healthy: false,
        state: validation.state,
        issues: validation.errors || ['Session is invalid'],
        warnings: [],
      }
    }

    const sessionInfo = await getSessionInfo(supabase, request)

    if (!sessionInfo.hasSession || !sessionInfo.user) {
      return {
        healthy: false,
        state: SessionState.TERMINATED,
        issues: ['No active session'],
        warnings: [],
      }
    }

    const issues: string[] = []
    const warnings: string[] = []

    // Calculate time until expiry
    const now = new Date()
    const expiresAt = validation.expiresAt || sessionInfo.metadata?.expiresAt
    const lastActivity = validation.lastActivity || sessionInfo.metadata?.lastActivity

    let timeUntilExpiry: number | undefined
    let idleTime: number | undefined

    if (expiresAt) {
      timeUntilExpiry = expiresAt.getTime() - now.getTime()

      // Warn if expiring soon (within 10 minutes)
      if (timeUntilExpiry < 10 * 60 * 1000 && timeUntilExpiry > 0) {
        warnings.push(`Session expires in ${Math.round(timeUntilExpiry / 1000 / 60)} minutes`)
      }
    }

    if (lastActivity) {
      idleTime = now.getTime() - lastActivity.getTime()

      // Warn if idle for more than 20 minutes
      if (idleTime > 20 * 60 * 1000) {
        warnings.push(`Session idle for ${Math.round(idleTime / 1000 / 60)} minutes`)
      }
    }

    // Check if session requires refresh
    if (validation.requiresRefresh) {
      warnings.push('Session requires refresh')
    }

    return {
      healthy: validation.isValid && issues.length === 0,
      state: validation.state,
      issues,
      warnings,
      metadata: {
        userId: sessionInfo.user.id,
        expiresAt,
        lastActivity,
        timeUntilExpiry,
        idleTime,
      },
    }
  } catch (error) {
    logger.errorWithStack('Session health check error', error as Error)
    return {
      healthy: false,
      state: SessionState.INVALID,
      issues: ['Health check failed: ' + (error as Error).message],
      warnings: [],
    }
  }
}

/**
 * Periodic session health monitoring
 */
export class SessionHealthMonitor {
  private intervalId: NodeJS.Timeout | null = null
  private readonly checkInterval: number

  constructor(checkIntervalMs: number = SESSION_TIMEOUTS.REFRESH_CHECK_INTERVAL) {
    this.checkInterval = checkIntervalMs
  }

  /**
   * Start monitoring session health
   */
  start(
    supabase: SupabaseClient,
    onHealthChange?: (status: SessionHealthStatus) => void
  ): void {
    if (this.intervalId) {
      logger.warn('Session health monitor already running')
      return
    }

    logger.info('Starting session health monitor', {
      checkInterval: this.checkInterval / 1000 + ' seconds',
    })

    this.intervalId = setInterval(async () => {
      try {
        const status = await checkSessionHealth(supabase)

        logger.debug('Session health check completed', {
          healthy: status.healthy,
          state: status.state,
          issues: status.issues.length,
          warnings: status.warnings.length,
        })

        if (onHealthChange) {
          onHealthChange(status)
        }

        // Log warnings and issues
        if (status.warnings.length > 0) {
          logger.warn('Session health warnings', {
            warnings: status.warnings,
            userId: status.metadata?.userId,
          })
        }

        if (status.issues.length > 0) {
          logger.error('Session health issues detected', {
            issues: status.issues,
            state: status.state,
            userId: status.metadata?.userId,
          })
        }
      } catch (error) {
        logger.errorWithStack('Session health monitor error', error as Error)
      }
    }, this.checkInterval)
  }

  /**
   * Stop monitoring session health
   */
  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId)
      this.intervalId = null
      logger.info('Session health monitor stopped')
    }
  }

  /**
   * Check if monitor is running
   */
  isRunning(): boolean {
    return this.intervalId !== null
  }
}

/**
 * Session statistics
 */
export interface SessionStats {
  totalActivities: number
  lastActivityTime?: Date
  sessionDuration?: number
  activityRate?: number // activities per minute
}

/**
 * Get session statistics
 */
export function getSessionStats(userId: string): SessionStats {
  const activities = sessionActivityStore.get(userId) || []

  if (activities.length === 0) {
    return {
      totalActivities: 0,
    }
  }

  const firstActivity = activities[0]
  const lastActivity = activities[activities.length - 1]
  const sessionDuration = lastActivity.timestamp.getTime() - firstActivity.timestamp.getTime()
  const activityRate = sessionDuration > 0
    ? (activities.length / (sessionDuration / 1000 / 60))
    : 0

  return {
    totalActivities: activities.length,
    lastActivityTime: lastActivity.timestamp,
    sessionDuration,
    activityRate,
  }
}

/**
 * Clean up stale session activity data
 */
export function cleanupStaleActivityData(maxAgeMs: number = 24 * 60 * 60 * 1000): void {
  const now = Date.now()
  let cleanedCount = 0

  for (const [userId, activities] of sessionActivityStore.entries()) {
    const lastActivity = activities[activities.length - 1]

    if (now - lastActivity.timestamp.getTime() > maxAgeMs) {
      sessionActivityStore.delete(userId)
      cleanedCount++
    }
  }

  logger.info('Cleaned up stale session activity data', {
    cleanedCount,
    remaining: sessionActivityStore.size,
  })
}
