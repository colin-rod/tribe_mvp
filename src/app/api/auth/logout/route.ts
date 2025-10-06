/**
 * Logout API Endpoint
 * CRO-99: Missing Authentication Session Management
 *
 * POST /api/auth/logout - Sign out and clear session
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import { createLogger } from '@/lib/logger'
import { invalidateSession } from '@/lib/auth/session-manager'
import { clearSessionActivity } from '@/lib/auth/session-health'

const logger = createLogger('LogoutAPI')

/**
 * POST /api/auth/logout
 * Sign out current session and clear all session data
 */
export async function POST(request: NextRequest) {
  const requestId = crypto.randomUUID()
  const startTime = Date.now()

  try {
    logger.info('Logout requested', {
      requestId,
      userAgent: request.headers.get('user-agent'),
    })

    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)

    // Get user before logout for logging
    const {
      data: { user },
    } = await supabase.auth.getUser()

    const userId = user?.id

    // Invalidate session
    const result = await invalidateSession(supabase)

    if (!result.success) {
      logger.error('Logout failed', {
        requestId,
        userId,
        error: result.error,
      })

      return NextResponse.json(
        {
          success: false,
          error: result.error || 'Logout failed',
        },
        { status: 500 }
      )
    }

    // Clear session activity if we have userId
    if (userId) {
      clearSessionActivity(userId)
    }

    logger.info('Logout successful', {
      requestId,
      userId,
      duration: Date.now() - startTime,
    })

    // Return success response
    const response = NextResponse.json(
      {
        success: true,
        message: 'Logged out successfully',
      },
      { status: 200 }
    )

    // Clear any server-side cookies
    response.cookies.delete('sb-access-token')
    response.cookies.delete('sb-refresh-token')

    return response
  } catch (error) {
    logger.errorWithStack('Logout error', error as Error, {
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
