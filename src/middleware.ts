import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { createLogger } from './lib/logger'
import { applySecurityHeaders } from './lib/security/csp'
import { ensureStartupConfiguration } from './middleware/startup-validation'
import { enforceAuthGuards } from './middleware/guards/auth'
import { resolveLegacyRedirect } from './middleware/redirects'

const logger = createLogger('middleware')

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  try {
    const { env } = ensureStartupConfiguration()

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

    const {
      data: { user },
    } = await supabase.auth.getUser()

    const authResponse = await enforceAuthGuards({ request, user, supabase })
    if (authResponse) {
      applySecurityHeaders(authResponse.headers)
      return authResponse
    }

    const legacyRedirect = resolveLegacyRedirect(request)
    if (legacyRedirect) {
      applySecurityHeaders(legacyRedirect.headers)
      return legacyRedirect
    }

    applySecurityHeaders(response.headers)
    return response
  } catch (error) {
    logger.errorWithStack('Middleware error - application cannot continue', error as Error, {
      path: request.nextUrl.pathname,
      userAgent: request.headers.get('user-agent'),
      nodeEnv: process.env.NODE_ENV,
      context: 'middleware-error-handler',
    })

    if ((error as Error).message.includes('startup') || (error as Error).message.includes('Supabase')) {
      logger.error('Configuration error detected - returning 500 status', {
        error: (error as Error).message,
        path: request.nextUrl.pathname,
        context: 'middleware-configuration-error',
      })

      return new NextResponse(
        JSON.stringify({
          error: 'Application Configuration Error',
          message: 'The application is not properly configured. Please check environment variables.',
          details: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined,
          timestamp: new Date().toISOString(),
        }),
        {
          status: 500,
          headers: {
            'Content-Type': 'application/json',
          },
        }
      )
    }

    return new NextResponse(
      JSON.stringify({
        error: 'Internal Server Error',
        message: 'An unexpected error occurred',
        timestamp: new Date().toISOString(),
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
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
