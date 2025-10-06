/**
 * Logout All Sessions API Endpoint
 * CRO-99: Missing Authentication Session Management
 *
 * POST /api/auth/logout-all - Sign out from all sessions (all devices)
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import { createLogger } from '@/lib/logger'
import { invalidateAllSessions } from '@/lib/auth/session-manager'
import { clearSessionActivity } from '@/lib/auth/session-health'

const logger = createLogger('LogoutAllAPI')

/**
 * POST /api/auth/logout-all
 * Sign out from all sessions across all devices
 * Query params:
 * - scope: 'global' (default) - logout all sessions including current
 *          'others' - logout all sessions except current
 */
export async function POST(request: NextRequest) {
  const requestId = crypto.randomUUID()
  const startTime = Date.now()

  try {
    // Get scope from query params
    const { searchParams } = new URL(request.url)
    const scope = (searchParams.get('scope') as 'global' | 'others') || 'global'

    logger.info('Logout all sessions requested', {
      requestId,
      scope,
      userAgent: request.headers.get('user-agent'),
    })

    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)

    // Get user before logout for logging
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      logger.warn('Logout all failed - user not authenticated', {
        requestId,
        error: userError?.message,
      })

      return NextResponse.json(
        {
          success: false,
          error: 'Authentication required',
        },
        { status: 401 }
      )
    }

    const userId = user.id

    logger.info('Invalidating all sessions', {
      requestId,
      userId,
      scope,
    })

    // Invalidate all sessions
    const result = await invalidateAllSessions(supabase, scope)

    if (!result.success) {
      logger.error('Logout all failed', {
        requestId,
        userId,
        scope,
        error: result.error,
      })

      return NextResponse.json(
        {
          success: false,
          error: result.error || 'Failed to logout all sessions',
        },
        { status: 500 }
      )
    }

    // Clear session activity
    clearSessionActivity(userId)

    logger.info('Logout all successful', {
      requestId,
      userId,
      scope,
      duration: Date.now() - startTime,
    })

    // Return success response
    const response = NextResponse.json(
      {
        success: true,
        message:
          scope === 'global'
            ? 'Logged out from all devices'
            : 'Logged out from all other devices',
        scope,
      },
      { status: 200 }
    )

    // Clear server-side cookies if scope is global
    if (scope === 'global') {
      response.cookies.delete('sb-access-token')
      response.cookies.delete('sb-refresh-token')
    }

    return response
  } catch (error) {
    logger.errorWithStack('Logout all error', error as Error, {
      requestId,
      duration: Date.now() - startTime,
    })

    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
