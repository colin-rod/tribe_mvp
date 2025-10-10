import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { getEnv, getFeatureFlags } from './lib/env'
import { createLogger } from './lib/logger'
import { applySecurityHeaders } from './lib/security/csp'

const logger = createLogger('middleware')

/**
 * Startup validation to ensure critical environment variables are configured
 * This runs on every request to catch configuration issues early
 */
function validateStartupConfiguration() {
  try {
    const env = getEnv() // This will throw if environment is invalid
    const features = getFeatureFlags()

    // Critical validation: Supabase must be enabled for the app to function
    if (!features.supabaseEnabled) {
      const error = new Error(
        'Application startup failed: Supabase is not properly configured. ' +
        'This application requires valid NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY ' +
        'environment variables to function. Please check your environment configuration.'
      )
      logger.error('Startup validation failed - Supabase not enabled', {
        hasUrl: !!env.NEXT_PUBLIC_SUPABASE_URL,
        hasKey: !!env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        nodeEnv: process.env.NODE_ENV,
        context: 'middleware-startup-validation'
      })
      throw error
    }

    // Validate critical environment variables are not fallback values
    if (env.NEXT_PUBLIC_SUPABASE_URL === 'http://localhost:54321' && process.env.NODE_ENV === 'production') {
      const error = new Error(
        'Production environment detected but Supabase URL is set to localhost. ' +
        'Please configure a production Supabase URL.'
      )
      logger.error('Production environment with localhost Supabase URL', {
        url: env.NEXT_PUBLIC_SUPABASE_URL,
        nodeEnv: process.env.NODE_ENV,
        context: 'middleware-startup-validation'
      })
      throw error
    }

    if (env.NEXT_PUBLIC_SUPABASE_ANON_KEY === 'development-fallback-key') {
      const error = new Error(
        'Supabase anonymous key is set to a development fallback value. ' +
        'Please configure a valid Supabase anonymous key.'
      )
      logger.error('Development fallback key detected', {
        nodeEnv: process.env.NODE_ENV,
        context: 'middleware-startup-validation'
      })
      throw error
    }

    logger.debug('Startup validation successful', {
      supabaseEnabled: features.supabaseEnabled,
      emailEnabled: features.emailEnabled,
      urlDomain: new URL(env.NEXT_PUBLIC_SUPABASE_URL).hostname,
      nodeEnv: process.env.NODE_ENV,
      context: 'middleware-startup-validation'
    })

    return { env, features }
  } catch (error) {
    logger.errorWithStack('Startup validation failed - application cannot continue', error as Error)
    throw error
  }
}

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  try {
    // Perform startup validation on every request to catch configuration issues early
    const { env } = validateStartupConfiguration()

    const supabase = createServerClient(
      env.NEXT_PUBLIC_SUPABASE_URL,
      env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          request.cookies.set({
            name,
            value,
            ...options,
          })
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          response.cookies.set({
            name,
            value,
            ...options,
          })
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set({
            name,
            value: '',
            ...options,
          })
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          response.cookies.set({
            name,
            value: '',
            ...options,
          })
        },
      },
    }
  )

    const { data: { user } } = await supabase.auth.getUser()

    const isAuthPage = request.nextUrl.pathname.startsWith('/login') ||
                      request.nextUrl.pathname.startsWith('/signup')
    const isOnboardingPage = request.nextUrl.pathname.startsWith('/onboarding')
    const isProtectedPage = request.nextUrl.pathname.startsWith('/dashboard')

    logger.debug('Middleware auth check', {
      path: request.nextUrl.pathname,
      hasUser: !!user,
      isAuthPage,
      isOnboardingPage,
      isProtectedPage
    })

    // Redirect authenticated users away from auth pages
    if (user && isAuthPage) {
      logger.info('Redirecting authenticated user from auth page to dashboard', {
        from: request.nextUrl.pathname,
        userId: user.id
      })
      const dashboardRedirect = NextResponse.redirect(new URL('/dashboard', request.url))
      applySecurityHeaders(dashboardRedirect.headers)
      return dashboardRedirect
    }

    // Redirect unauthenticated users to login for protected pages
    if (!user && isProtectedPage) {
      logger.info('Redirecting unauthenticated user to login', {
        from: request.nextUrl.pathname
      })
      const redirectUrl = new URL('/login', request.url)
      redirectUrl.searchParams.set('redirectedFrom', request.nextUrl.pathname)
      const redirectResponse = NextResponse.redirect(redirectUrl)
      applySecurityHeaders(redirectResponse.headers)
      return redirectResponse
    }

    // Redirect old digest routes to new memory-book routes
    if (request.nextUrl.pathname.startsWith('/dashboard/digests')) {
      const newPath = request.nextUrl.pathname.replace('/dashboard/digests', '/dashboard/memory-book')
      logger.info('Redirecting from old digest route to memory-book', {
        from: request.nextUrl.pathname,
        to: newPath
      })
      const redirectResponse = NextResponse.redirect(new URL(newPath + request.nextUrl.search, request.url))
      applySecurityHeaders(redirectResponse.headers)
      return redirectResponse
    }

    // Check onboarding completion for protected pages
    if (user && isProtectedPage && !isOnboardingPage) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('onboarding_completed')
        .eq('id', user.id)
        .single()

      if (profile && !profile.onboarding_completed) {
        logger.info('Redirecting user with incomplete onboarding', {
          from: request.nextUrl.pathname,
          userId: user.id
        })
        const onboardingRedirect = NextResponse.redirect(new URL('/onboarding', request.url))
        applySecurityHeaders(onboardingRedirect.headers)
        return onboardingRedirect
      }
    }

    // Apply security headers to response
    applySecurityHeaders(response.headers)

    return response
  } catch (error) {
    logger.errorWithStack('Middleware error - application cannot continue', error as Error, {
      path: request.nextUrl.pathname,
      userAgent: request.headers.get('user-agent'),
      nodeEnv: process.env.NODE_ENV,
      context: 'middleware-error-handler'
    })

    // For startup validation errors, return a 500 error instead of allowing continuation
    // This ensures configuration issues are immediately visible
    if ((error as Error).message.includes('startup') || (error as Error).message.includes('Supabase')) {
      logger.error('Configuration error detected - returning 500 status', {
        error: (error as Error).message,
        path: request.nextUrl.pathname,
        context: 'middleware-configuration-error'
      })

      return new NextResponse(
        JSON.stringify({
          error: 'Application Configuration Error',
          message: 'The application is not properly configured. Please check environment variables.',
          details: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined,
          timestamp: new Date().toISOString()
        }),
        {
          status: 500,
          headers: {
            'Content-Type': 'application/json',
          },
        }
      )
    }

    // For other errors, still return 500 to avoid masking issues
    return new NextResponse(
      JSON.stringify({
        error: 'Internal Server Error',
        message: 'An unexpected error occurred',
        timestamp: new Date().toISOString()
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    )
  }
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}