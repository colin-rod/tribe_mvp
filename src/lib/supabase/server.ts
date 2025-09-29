import { createServerClient, type CookieOptions } from '@supabase/ssr'
import type { Database } from '../types/database'
import { getEnv } from '../env'
import { createLogger } from '../logger'

const logger = createLogger('supabase-server')

/**
 * Validates Supabase environment configuration for server-side usage
 */
function validateSupabaseServerEnvironment(env: ReturnType<typeof getEnv>) {
  if (!env.NEXT_PUBLIC_SUPABASE_URL) {
    const error = new Error(
      'NEXT_PUBLIC_SUPABASE_URL is required for server-side Supabase client. ' +
      'Please configure this environment variable.'
    )
    logger.error('Missing Supabase URL for server client', {
      context: 'server-side-validation',
      hasUrl: false,
      hasKey: !!env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    })
    throw error
  }

  if (!env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    const error = new Error(
      'NEXT_PUBLIC_SUPABASE_ANON_KEY is required for server-side Supabase client. ' +
      'Please configure this environment variable.'
    )
    logger.error('Missing Supabase anonymous key for server client', {
      context: 'server-side-validation',
      hasUrl: !!env.NEXT_PUBLIC_SUPABASE_URL,
      hasKey: false
    })
    throw error
  }

  // Additional server-side validation
  if (process.env.NODE_ENV === 'production') {
    if (env.NEXT_PUBLIC_SUPABASE_URL.includes('localhost')) {
      const error = new Error(
        'Production server detected but Supabase URL points to localhost. ' +
        'Please configure a production Supabase URL.'
      )
      logger.error('Localhost Supabase URL in production server', {
        context: 'server-side-validation',
        nodeEnv: process.env.NODE_ENV,
        url: env.NEXT_PUBLIC_SUPABASE_URL.substring(0, 50) + '...'
      })
      throw error
    }
  }

  logger.debug('Server-side Supabase environment validation successful', {
    context: 'server-side-validation',
    hasUrl: true,
    hasKey: true,
    urlDomain: new URL(env.NEXT_PUBLIC_SUPABASE_URL).hostname,
    keyLength: env.NEXT_PUBLIC_SUPABASE_ANON_KEY.length,
    nodeEnv: process.env.NODE_ENV
  })
}

export function createClient(cookieStore: {
  get: (name: string) => { value: string } | undefined
  set: (name: string, value: string, options?: CookieOptions) => void
}) {
  try {
    // Get validated environment (this will throw if invalid)
    const env = getEnv()

    // Additional server-side validation
    validateSupabaseServerEnvironment(env)

    logger.debug('Creating Supabase server client', {
      context: 'server-client-creation',
      urlDomain: new URL(env.NEXT_PUBLIC_SUPABASE_URL).hostname,
      keyLength: env.NEXT_PUBLIC_SUPABASE_ANON_KEY.length,
      nodeEnv: process.env.NODE_ENV
    })

    return createServerClient<Database>(
      env.NEXT_PUBLIC_SUPABASE_URL,
      env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value
          },
          set(name: string, value: string, options: CookieOptions) {
            try {
              cookieStore.set(name, value, options)
            } catch (error) {
              logger.warn('Failed to set cookie in Server Component', {
                name,
                error: (error as Error).message,
                context: 'server-cookie-management'
              })
            }
          },
          remove(name: string, options: CookieOptions) {
            try {
              cookieStore.set(name, '', { ...options, maxAge: 0 })
            } catch (error) {
              logger.warn('Failed to remove cookie in Server Component', {
                name,
                error: (error as Error).message,
                context: 'server-cookie-management'
              })
            }
          },
        },
      }
    )
  } catch (error) {
    logger.errorWithStack('Failed to create Supabase server client - application cannot continue', error as Error)

    // Fail fast - don't provide mock fallbacks that mask configuration issues
    if (process.env.NODE_ENV === 'production') {
      logger.error('Production server-side Supabase client creation failed - terminating', {
        context: 'server-client-creation-error',
        nodeEnv: process.env.NODE_ENV,
        error: (error as Error).message
      })
    } else {
      logger.error('Development server-side Supabase client creation failed - check configuration', {
        context: 'server-client-creation-error',
        nodeEnv: process.env.NODE_ENV,
        error: (error as Error).message,
        help: 'Ensure environment variables are properly configured'
      })
    }

    // Re-throw the error to fail fast instead of providing mock fallback
    throw error
  }
}

// Mock client removed - server-side code will fail fast if Supabase is not properly configured
// This ensures configuration issues are caught early rather than masked by fallbacks
