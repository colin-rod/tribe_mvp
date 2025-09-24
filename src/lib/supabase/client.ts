'use client'

import { createBrowserClient } from '@supabase/ssr'
import type { Database } from '../types/database'
import { getClientEnv } from '../env'
import { createLogger } from '../logger'

const logger = createLogger('supabase-client')

export function createClient() {
  try {
    // Get environment variables - this will validate and throw if missing
    const env = getClientEnv()

    // Double-check that we have the required values
    if (!env.NEXT_PUBLIC_SUPABASE_URL || !env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      // During build time, use mock client
      if (typeof window === 'undefined') {
        logger.info('Using mock Supabase client during build - environment variables not available')
        return createMockClient()
      }

      // At runtime on client, this is a critical error
      const errorMsg = [
        'Supabase client initialization failed - missing environment variables.',
        '',
        'This error indicates that NEXT_PUBLIC_* variables were not properly embedded during build.',
        '',
        'Possible causes:',
        '1. Environment variables not set in your deployment platform',
        '2. Build cache issues preventing variable embedding',
        '3. Variables set after build completed',
        '',
        `Current values:`,
        `  NEXT_PUBLIC_SUPABASE_URL: ${env.NEXT_PUBLIC_SUPABASE_URL ? 'present' : 'MISSING'}`,
        `  NEXT_PUBLIC_SUPABASE_ANON_KEY: ${env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'present' : 'MISSING'}`,
        '',
        'Solution: Rebuild your application with proper environment variables set.'
      ].join('\n')

      logger.error(errorMsg)
      throw new Error(errorMsg)
    }

    logger.debug('Creating Supabase browser client', {
      hasUrl: !!env.NEXT_PUBLIC_SUPABASE_URL,
      hasKey: !!env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      nodeEnv: env.NODE_ENV
    })

    return createBrowserClient<Database>(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
  } catch (error) {
    logger.errorWithStack('Failed to create Supabase client', error as Error)

    // During build time or SSR, return mock client to prevent build failures
    if (typeof window === 'undefined') {
      logger.warn('Using mock Supabase client due to initialization error during build/SSR')
      return createMockClient()
    }

    // In production, use mock client to prevent app crash, but log the error
    if (process.env.NODE_ENV === 'production' && typeof window !== 'undefined') {
      logger.error('Using mock Supabase client in production due to environment variable issue')
      return createMockClient()
    }

    // Re-throw client-side errors in development
    throw error
  }
}

function createMockClient() {
  return {
    from: () => ({
      select: () => ({ data: [], error: null }),
      insert: () => ({ data: [], error: null }),
      update: () => ({ data: [], error: null }),
      delete: () => ({ data: [], error: null }),
    }),
    auth: {
      getUser: () => Promise.resolve({ data: { user: null }, error: null }),
    },
    channel: () => ({
      on: () => ({ subscribe: () => {} }),
    }),
    removeChannel: () => {},
  } as any
}

// Export a lazy-loaded singleton instance for use in client components
let _supabase: ReturnType<typeof createClient> | null = null

export const supabase = new Proxy({} as ReturnType<typeof createClient>, {
  get(target, prop) {
    if (!_supabase) {
      _supabase = createClient()
    }
    return (_supabase as any)[prop]
  }
})