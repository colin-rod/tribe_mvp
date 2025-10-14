import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createLogger } from '@/lib/logger'
import { validateSessionMiddleware } from './session-validation'

const logger = createLogger('AuthorizationMiddleware')

export interface AuthenticatedUser {
  id: string
  email?: string
}

/**
 * Middleware to ensure the user is authenticated and extract user information
 * Enhanced with session validation and automatic refresh (CRO-99)
 */
export async function requireAuth(request: NextRequest): Promise<{ user: AuthenticatedUser } | NextResponse> {
  try {
    // Use enhanced session validation middleware
    const sessionResult = await validateSessionMiddleware(request)

    // If session validation returned an error response, return it
    if (sessionResult instanceof NextResponse) {
      return sessionResult
    }

    // If session is not valid, return error
    if (!sessionResult.isValid || !sessionResult.user) {
      logger.warn('Session validation failed in requireAuth', {
        isValid: sessionResult.isValid,
        hasUser: !!sessionResult.user,
      })
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Log successful authentication with session details
    logger.debug('User authenticated with valid session', {
      userId: sessionResult.user.id,
      sessionState: sessionResult.session?.state,
      wasRefreshed: sessionResult.wasRefreshed,
    })

    return {
      user: {
        id: sessionResult.user.id,
        email: sessionResult.user.email,
      },
    }
  } catch (error) {
    logger.errorWithStack('Authentication middleware error', error as Error)
    return NextResponse.json(
      { error: 'Internal authentication error' },
      { status: 500 }
    )
  }
}

/**
 * Legacy authentication without session validation (for backward compatibility)
 * @deprecated Use requireAuth instead - it now includes session validation
 */
export async function requireAuthLegacy(_request: NextRequest): Promise<{ user: AuthenticatedUser } | NextResponse> {
  try {
    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError) {
      logger.warn('Authentication error', { error: authError.message })
      return NextResponse.json(
        { error: 'Authentication failed' },
        { status: 401 }
      )
    }

    if (!user) {
      logger.warn('No authenticated user found')
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    return { user: { id: user.id, email: user.email } }
  } catch (error) {
    logger.errorWithStack('Authentication middleware error', error as Error)
    return NextResponse.json(
      { error: 'Internal authentication error' },
      { status: 500 }
    )
  }
}

/**
 * Verify that the authenticated user owns the specified resource
 */
export async function verifyResourceOwnership(
  userId: string,
  resourceType: 'update' | 'child' | 'recipient' | 'notification',
  resourceId: string
): Promise<boolean> {
  try {
    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)

    let query
    let userField

    switch (resourceType) {
      case 'update':
        query = supabase.from('memories').select('parent_id').eq('id', resourceId)
        userField = 'parent_id'
        break

      case 'child':
        query = supabase.from('children').select('parent_id').eq('id', resourceId)
        userField = 'parent_id'
        break

      case 'recipient':
        query = supabase.from('recipients').select('user_id').eq('id', resourceId)
        userField = 'user_id'
        break

      case 'notification':
        // For notifications, verify the user owns the associated update or recipient
        query = supabase.from('notification_history').select('user_id').eq('id', resourceId)
        userField = 'user_id'
        break

      default:
        logger.error('Invalid resource type for ownership verification', { resourceType })
        return false
    }

    const { data, error } = await query.single()

    if (error) {
      logger.warn('Resource ownership verification failed', {
        resourceType,
        resourceId,
        error: error.message
      })
      return false
    }

    const isOwner = (data as Record<string, unknown>)[userField] === userId

    if (!isOwner) {
      logger.warn('Resource ownership violation detected', {
        userId,
        resourceType,
        resourceId,
        actualOwner: (data as Record<string, unknown>)[userField]
      })
    }

    return isOwner
  } catch (error) {
    logger.errorWithStack('Resource ownership verification error', error as Error, {
      userId,
      resourceType,
      resourceId
    })
    return false
  }
}

/**
 * Middleware to verify user can send notifications (must own recipients or be admin)
 */
export async function verifyNotificationPermissions(
  userId: string,
  recipientEmails: string[]
): Promise<{ allowed: boolean; ownedEmails: string[] }> {
  try {
    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)

    // Get all recipients owned by this user
    const { data: userRecipients, error } = await supabase
      .from('recipients')
      .select('email')
      .eq('user_id', userId)
      .eq('is_active', true)

    if (error) {
      logger.error('Failed to fetch user recipients', {
        userId,
        error: error.message
      })
      return { allowed: false, ownedEmails: [] }
    }

    const ownedEmails = (userRecipients || []).map((r: { email: string | null }) => r.email?.toLowerCase() || '').filter(Boolean)
    const requestedEmails = recipientEmails.map(e => e.toLowerCase())

    // Check if all requested emails are owned by the user
    const unauthorizedEmails = requestedEmails.filter(
      email => !ownedEmails.includes(email)
    )

    if (unauthorizedEmails.length > 0) {
      logger.warn('Unauthorized email notification attempt', {
        userId,
        requestedEmails,
        ownedEmails,
        unauthorizedEmails
      })
    }

    return {
      allowed: unauthorizedEmails.length === 0,
      ownedEmails: requestedEmails.filter(email => ownedEmails.includes(email))
    }
  } catch (error) {
    logger.errorWithStack('Notification permission verification error', error as Error, {
      userId,
      recipientEmails
    })
    return { allowed: false, ownedEmails: [] }
  }
}

/**
 * Higher-order function to wrap API routes with authentication and authorization
 */
export function withAuth<T extends unknown[]>(
  handler: (request: NextRequest, user: AuthenticatedUser, ...args: T) => Promise<NextResponse>
) {
  return async (request: NextRequest, ...args: T): Promise<NextResponse> => {
    const authResult = await requireAuth(request)

    if (authResult instanceof NextResponse) {
      // Authentication failed
      return authResult
    }

    try {
      return await handler(request, authResult.user, ...args)
    } catch (error) {
      logger.errorWithStack('API handler error', error as Error, {
        userId: authResult.user.id,
        path: request.nextUrl.pathname
      })

      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      )
    }
  }
}
