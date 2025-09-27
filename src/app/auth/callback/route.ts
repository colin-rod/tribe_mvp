import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createLogger } from '@/lib/logger'

const logger = createLogger('auth-callback')

// Allowed redirect URLs to prevent open redirect attacks
const getAllowedRedirectUrls = (): string[] => {
  return [
    '/dashboard',
    '/profile',
    '/settings',
    '/onboarding',
    '/updates',
    '/children',
    '/recipients'
  ]
}

// Validate redirect URL to prevent open redirect attacks
function isValidRedirectUrl(url: string): boolean {
  try {
    // Must be a relative path starting with '/'
    if (!url.startsWith('/')) {
      return false
    }

    // Must not contain '../' or other path traversal attempts
    if (url.includes('..')) {
      return false
    }

    // Must not contain protocol schemes
    if (url.includes('://') || url.includes('javascript:') || url.includes('data:')) {
      return false
    }

    // Check against allowlist of known safe paths
    const allowedUrls = getAllowedRedirectUrls()
    const basePath = url.split('?')[0] // Remove query parameters for comparison

    return allowedUrls.some(allowed =>
      basePath === allowed || basePath.startsWith(allowed + '/')
    )
  } catch (error) {
    logger.warn('Error validating redirect URL', { url, error: String(error) })
    return false
  }
}

// Generate CSRF token verification
function validateCsrfProtection(request: NextRequest): boolean {
  try {
    // Check for state parameter (PKCE state)
    const { searchParams } = new URL(request.url)
    const state = searchParams.get('state')

    // In production, you would validate this against a stored state
    // For now, we ensure the state parameter exists
    if (!state) {
      logger.warn('Missing state parameter in auth callback')
      return false
    }

    // Additional CSRF protection via referrer check
    const referer = request.headers.get('referer')
    if (referer) {
      try {
        const refererUrl = new URL(referer)
        const requestUrl = new URL(request.url)

        // Ensure referrer is from same origin
        if (refererUrl.origin !== requestUrl.origin) {
          logger.warn('CSRF attempt detected - invalid referrer', {
            referer: refererUrl.origin,
            origin: requestUrl.origin
          })
          return false
        }
      } catch {
        logger.warn('Invalid referrer header format', { referer })
      }
    }

    return true
  } catch (error) {
    logger.error('Error validating CSRF protection', { error: String(error) })
    return false
  }
}

// Sanitize error responses to prevent information disclosure
function createErrorResponse(origin: string, errorType: 'auth_failed' | 'invalid_request' | 'security_violation'): NextResponse {
  const baseErrorUrl = `${origin}/auth/login`

  switch (errorType) {
    case 'auth_failed':
      return NextResponse.redirect(`${baseErrorUrl}?error=authentication_failed`)
    case 'invalid_request':
      return NextResponse.redirect(`${baseErrorUrl}?error=invalid_request`)
    case 'security_violation':
      return NextResponse.redirect(`${baseErrorUrl}?error=security_check_failed`)
    default:
      return NextResponse.redirect(`${baseErrorUrl}?error=authentication_failed`)
  }
}

export async function GET(request: NextRequest) {
  const requestId = crypto.randomUUID()
  const startTime = Date.now()

  try {
    logger.info('Auth callback initiated', {
      requestId,
      userAgent: request.headers.get('user-agent'),
      origin: request.headers.get('origin'),
      referer: request.headers.get('referer')
    })

    const { searchParams, origin } = new URL(request.url)
    const code = searchParams.get('code')
    const state = searchParams.get('state')
    const next = searchParams.get('next') ?? '/dashboard'
    const error = searchParams.get('error')
    const errorDescription = searchParams.get('error_description')

    // Log received parameters (sanitized)
    logger.debug('Auth callback parameters received', {
      requestId,
      hasCode: !!code,
      hasState: !!state,
      nextUrl: next,
      hasError: !!error,
      errorType: error
    })

    // Check for OAuth errors first
    if (error) {
      logger.warn('OAuth provider returned error', {
        requestId,
        error,
        errorDescription: errorDescription?.substring(0, 200) // Limit length
      })
      return createErrorResponse(origin, 'auth_failed')
    }

    // Validate required parameters
    if (!code) {
      logger.warn('Missing authorization code in callback', { requestId })
      return createErrorResponse(origin, 'invalid_request')
    }

    // Validate CSRF protection
    if (!validateCsrfProtection(request)) {
      logger.error('CSRF protection validation failed', {
        requestId,
        hasState: !!state,
        origin
      })
      return createErrorResponse(origin, 'security_violation')
    }

    // Validate redirect URL
    if (!isValidRedirectUrl(next)) {
      logger.warn('Invalid redirect URL attempted', {
        requestId,
        attemptedUrl: next
      })
      // Use safe default instead of failing
      const safeNext = '/dashboard'
      logger.info('Using safe redirect URL', {
        requestId,
        safeUrl: safeNext
      })
    }

    const finalRedirectUrl = isValidRedirectUrl(next) ? next : '/dashboard'

    // Exchange code for session
    try {
      const cookieStore = await cookies()
      const supabase = createClient(cookieStore)

      logger.debug('Attempting code exchange', { requestId })
      const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)

      if (exchangeError) {
        logger.error('Code exchange failed', {
          requestId,
          errorCode: exchangeError.message,
          errorType: exchangeError.name === 'AuthError' ? 'auth_error' : 'unknown_error'
        })
        return createErrorResponse(origin, 'auth_failed')
      }

      if (!data.session || !data.user) {
        logger.error('Code exchange succeeded but no session/user returned', {
          requestId,
          hasSession: !!data.session,
          hasUser: !!data.user
        })
        return createErrorResponse(origin, 'auth_failed')
      }

      // Log successful authentication (sanitized)
      logger.info('Authentication successful', {
        requestId,
        userId: data.user.id,
        userEmail: data.user.email ? '[REDACTED]' : null,
        provider: data.user.app_metadata?.provider,
        sessionId: data.session.access_token.substring(0, 10) + '...',
        duration: Date.now() - startTime
      })

      // Construct secure redirect URL
      const forwardedHost = request.headers.get('x-forwarded-host')
      const isLocalEnv = process.env.NODE_ENV === 'development'

      let redirectUrl: string
      if (isLocalEnv) {
        redirectUrl = `${origin}${finalRedirectUrl}`
      } else if (forwardedHost) {
        redirectUrl = `https://${forwardedHost}${finalRedirectUrl}`
      } else {
        redirectUrl = `${origin}${finalRedirectUrl}`
      }

      logger.info('Redirecting authenticated user', {
        requestId,
        userId: data.user.id,
        redirectUrl: finalRedirectUrl, // Log only the path, not full URL
        isLocal: isLocalEnv
      })

      const response = NextResponse.redirect(redirectUrl)

      // Add security headers
      response.headers.set('X-Content-Type-Options', 'nosniff')
      response.headers.set('X-Frame-Options', 'DENY')
      response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')

      return response

    } catch (sessionError) {
      logger.errorWithStack('Unexpected error during session exchange', sessionError as Error, {
        requestId,
        duration: Date.now() - startTime
      })
      return createErrorResponse(origin, 'auth_failed')
    }

  } catch (error) {
    logger.errorWithStack('Unexpected error in auth callback', error as Error, {
      requestId,
      duration: Date.now() - startTime
    })

    // Fallback error response
    const { origin } = new URL(request.url)
    return createErrorResponse(origin, 'invalid_request')
  }
}