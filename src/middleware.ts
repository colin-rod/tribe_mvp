import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { getEnv, getFeatureFlags } from './lib/env'
import { createLogger } from './lib/logger'

const logger = createLogger('middleware')

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  try {
    const env = getEnv()
    const features = getFeatureFlags()

    if (!features.supabaseEnabled) {
      logger.warn('Supabase not configured - skipping auth middleware')
      return response
    }

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
    const isProtectedPage = request.nextUrl.pathname.startsWith('/dashboard')

    logger.debug('Middleware auth check', {
      path: request.nextUrl.pathname,
      hasUser: !!user,
      isAuthPage,
      isProtectedPage
    })

    // Redirect authenticated users away from auth pages
    if (user && isAuthPage) {
      logger.info('Redirecting authenticated user from auth page to dashboard', {
        from: request.nextUrl.pathname,
        userId: user.id
      })
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }

    // Redirect unauthenticated users to login for protected pages
    if (!user && isProtectedPage) {
      logger.info('Redirecting unauthenticated user to login', {
        from: request.nextUrl.pathname
      })
      const redirectUrl = new URL('/login', request.url)
      redirectUrl.searchParams.set('redirectedFrom', request.nextUrl.pathname)
      return NextResponse.redirect(redirectUrl)
    }

    return response
  } catch (error) {
    logger.errorWithStack('Middleware error', error as Error, {
      path: request.nextUrl.pathname,
      userAgent: request.headers.get('user-agent')
    })

    // In case of environment or other errors, allow request to continue
    // This prevents the app from being completely broken by config issues
    return response
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