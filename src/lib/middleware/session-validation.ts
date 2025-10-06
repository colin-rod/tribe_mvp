/**
 * Session Validation Middleware
 * CRO-99: Missing Authentication Session Management
 *
 * Centralized middleware for validating sessions and handling token refresh
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import { createLogger } from '@/lib/logger'
import {
  validateSession,
  refreshSessionIfNeeded,
  SessionRefreshResult,
} from '@/lib/auth/session-manager'
import { SessionState } from '@/lib/config/session'

const logger = createLogger('session-validation-middleware')

/**
 * Session validation result for middleware
 */
export interface SessionMiddlewareResult {
  isValid: boolean
  user: {
    id: string
    email?: string
  } | null
  session: {
    expiresAt?: Date
    lastActivity?: Date
    state: SessionState
  } | null
  wasRefreshed: boolean
  error?: string
}

/**
 * Validate session and refresh if needed
 * This is the primary middleware for all authenticated routes
 */
export async function validateSessionMiddleware(
  request: NextRequest
): Promise<SessionMiddlewareResult | NextResponse> {
  const startTime = Date.now()
  const requestId = crypto.randomUUID()

  try {
    logger.debug('Session validation started', {
      requestId,
      path: request.nextUrl.pathname,
      method: request.method,
    })

    // Create Supabase client
    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)

    // Validate the session
    const validation = await validateSession(supabase, {
      headers: request.headers,
    })

    logger.debug('Session validation result', {
      requestId,
      isValid: validation.isValid,
      state: validation.state,
      requiresRefresh: validation.requiresRefresh,
    })

    // Handle invalid or expired sessions
    if (!validation.isValid) {
      logger.warn('Session validation failed', {
        requestId,
        state: validation.state,
        errors: validation.errors,
        path: request.nextUrl.pathname,
      })

      // Return unauthorized response
      return NextResponse.json(
        {
          error: 'Session invalid or expired',
          state: validation.state,
          message: validation.errors?.[0] || 'Please sign in again',
        },
        { status: 401 }
      )
    }

    // Get user from validated session
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      logger.error('Failed to get user after session validation', {
        requestId,
        error: userError?.message,
      })

      return NextResponse.json(
        {
          error: 'User validation failed',
          message: 'Unable to verify user identity',
        },
        { status: 401 }
      )
    }

    // Check if session needs refresh
    let refreshResult: SessionRefreshResult | null = null

    if (validation.requiresRefresh) {
      logger.info('Session requires refresh', {
        requestId,
        userId: user.id,
        expiresAt: validation.expiresAt,
      })

      refreshResult = await refreshSessionIfNeeded(supabase)

      if (!refreshResult.success) {
        logger.error('Session refresh failed', {
          requestId,
          userId: user.id,
          error: refreshResult.error,
        })

        // Session refresh failed - return error
        return NextResponse.json(
          {
            error: 'Session refresh failed',
            message: 'Please sign in again',
          },
          { status: 401 }
        )
      }

      logger.info('Session refreshed successfully', {
        requestId,
        userId: user.id,
        wasRefreshed: refreshResult.wasRefreshed,
        duration: Date.now() - startTime,
      })
    }

    // Return successful validation result
    const result: SessionMiddlewareResult = {
      isValid: true,
      user: {
        id: user.id,
        email: user.email,
      },
      session: {
        expiresAt: validation.expiresAt,
        lastActivity: validation.lastActivity,
        state: validation.state,
      },
      wasRefreshed: refreshResult?.wasRefreshed || false,
    }

    logger.debug('Session validation completed successfully', {
      requestId,
      userId: user.id,
      state: validation.state,
      wasRefreshed: result.wasRefreshed,
      duration: Date.now() - startTime,
    })

    return result
  } catch (error) {
    logger.errorWithStack('Session validation middleware error', error as Error, {
      requestId,
      path: request.nextUrl.pathname,
      duration: Date.now() - startTime,
    })

    return NextResponse.json(
      {
        error: 'Internal authentication error',
        message: 'An unexpected error occurred',
      },
      { status: 500 }
    )
  }
}

/**
 * Lightweight session check (no refresh)
 * Use for non-critical endpoints where refresh is not required
 */
export async function checkSessionOnly(
  request: NextRequest
): Promise<SessionMiddlewareResult | NextResponse> {
  const requestId = crypto.randomUUID()

  try {
    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)

    // Validate session without refresh
    const validation = await validateSession(supabase, {
      headers: request.headers,
    })

    if (!validation.isValid) {
      return NextResponse.json(
        {
          error: 'Session invalid',
          state: validation.state,
        },
        { status: 401 }
      )
    }

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json(
        {
          error: 'User validation failed',
        },
        { status: 401 }
      )
    }

    return {
      isValid: true,
      user: {
        id: user.id,
        email: user.email,
      },
      session: {
        expiresAt: validation.expiresAt,
        lastActivity: validation.lastActivity,
        state: validation.state,
      },
      wasRefreshed: false,
    }
  } catch (error) {
    logger.errorWithStack('Session check error', error as Error, { requestId })

    return NextResponse.json(
      {
        error: 'Internal error',
      },
      { status: 500 }
    )
  }
}

/**
 * Higher-order function to wrap API routes with session validation
 * Automatically handles session validation and refresh
 */
export function withSessionValidation<T extends unknown[]>(
  handler: (
    request: NextRequest,
    sessionResult: SessionMiddlewareResult,
    ...args: T
  ) => Promise<NextResponse>
) {
  return async (request: NextRequest, ...args: T): Promise<NextResponse> => {
    const validationResult = await validateSessionMiddleware(request)

    // If validation returned an error response, return it
    if (validationResult instanceof NextResponse) {
      return validationResult
    }

    // If validation failed, return error
    if (!validationResult.isValid) {
      return NextResponse.json(
        {
          error: validationResult.error || 'Session validation failed',
        },
        { status: 401 }
      )
    }

    try {
      // Call the handler with validated session
      return await handler(request, validationResult, ...args)
    } catch (error) {
      logger.errorWithStack('API handler error', error as Error, {
        userId: validationResult.user?.id,
        path: request.nextUrl.pathname,
      })

      return NextResponse.json(
        {
          error: 'Internal server error',
        },
        { status: 500 }
      )
    }
  }
}

/**
 * Session validation for Server Actions
 * Returns session result or throws error
 */
export async function validateServerActionSession(): Promise<SessionMiddlewareResult> {
  try {
    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)

    const validation = await validateSession(supabase)

    if (!validation.isValid) {
      throw new Error(validation.errors?.[0] || 'Session invalid')
    }

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      throw new Error('User validation failed')
    }

    // Attempt refresh if needed
    if (validation.requiresRefresh) {
      const refreshResult = await refreshSessionIfNeeded(supabase)

      if (!refreshResult.success) {
        throw new Error('Session refresh failed')
      }

      return {
        isValid: true,
        user: {
          id: user.id,
          email: user.email,
        },
        session: {
          expiresAt: validation.expiresAt,
          lastActivity: validation.lastActivity,
          state: validation.state,
        },
        wasRefreshed: refreshResult.wasRefreshed,
      }
    }

    return {
      isValid: true,
      user: {
        id: user.id,
        email: user.email,
      },
      session: {
        expiresAt: validation.expiresAt,
        lastActivity: validation.lastActivity,
        state: validation.state,
      },
      wasRefreshed: false,
    }
  } catch (error) {
    logger.errorWithStack('Server action session validation error', error as Error)
    throw error
  }
}
