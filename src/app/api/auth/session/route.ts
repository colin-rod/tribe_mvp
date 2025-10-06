/**
 * Session Health Check API
 * CRO-99: Missing Authentication Session Management
 *
 * GET /api/auth/session - Check session health and status
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import { createLogger } from '@/lib/logger'
import { checkSessionHealth } from '@/lib/auth/session-health'
import { getSessionInfo } from '@/lib/auth/session-manager'

const logger = createLogger('SessionHealthAPI')

/**
 * GET /api/auth/session
 * Check current session health and metadata
 */
export async function GET(request: NextRequest) {
  const requestId = crypto.randomUUID()
  const startTime = Date.now()

  try {
    logger.debug('Session health check requested', {
      requestId,
      path: request.nextUrl.pathname,
    })

    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)

    // Get session info
    const sessionInfo = await getSessionInfo(supabase, {
      headers: request.headers,
    })

    if (!sessionInfo.hasSession || !sessionInfo.user) {
      return NextResponse.json(
        {
          authenticated: false,
          message: 'No active session',
        },
        { status: 401 }
      )
    }

    // Check session health
    const healthStatus = await checkSessionHealth(supabase, {
      headers: request.headers,
    })

    // Return session health information
    const response = {
      authenticated: true,
      healthy: healthStatus.healthy,
      state: healthStatus.state,
      user: {
        id: sessionInfo.user.id,
        email: sessionInfo.user.email,
      },
      session: {
        expiresAt: healthStatus.metadata?.expiresAt?.toISOString(),
        lastActivity: healthStatus.metadata?.lastActivity?.toISOString(),
        timeUntilExpiry: healthStatus.metadata?.timeUntilExpiry
          ? Math.round(healthStatus.metadata.timeUntilExpiry / 1000)
          : undefined,
        idleTime: healthStatus.metadata?.idleTime
          ? Math.round(healthStatus.metadata.idleTime / 1000)
          : undefined,
      },
      issues: healthStatus.issues,
      warnings: healthStatus.warnings,
      timestamp: new Date().toISOString(),
    }

    logger.info('Session health check completed', {
      requestId,
      userId: sessionInfo.user.id,
      healthy: healthStatus.healthy,
      state: healthStatus.state,
      duration: Date.now() - startTime,
    })

    return NextResponse.json(response, { status: 200 })
  } catch (error) {
    logger.errorWithStack('Session health check error', error as Error, {
      requestId,
      duration: Date.now() - startTime,
    })

    return NextResponse.json(
      {
        error: 'Failed to check session health',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
