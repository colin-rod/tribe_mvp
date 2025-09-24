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

    // Check if we're in a valid state to create a real client
    const hasValidConfig = env.NEXT_PUBLIC_SUPABASE_URL &&
                          env.NEXT_PUBLIC_SUPABASE_ANON_KEY &&
                          env.NEXT_PUBLIC_SUPABASE_URL !== 'development-fallback-key' &&
                          env.NEXT_PUBLIC_SUPABASE_URL !== ''

    if (!hasValidConfig) {
      // During build time or SSR, always use mock client
      if (typeof window === 'undefined') {
        logger.info('Using mock Supabase client during SSR/build')
        return createMockClient()
      }

      // Client-side: use mock client but log the reason
      logger.warn('Using mock Supabase client due to missing environment variables', {
        hasUrl: !!env.NEXT_PUBLIC_SUPABASE_URL,
        hasKey: !!env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        urlValue: env.NEXT_PUBLIC_SUPABASE_URL,
        isClient: typeof window !== 'undefined'
      })
      return createMockClient()
    }

    logger.debug('Creating Supabase browser client', {
      hasUrl: !!env.NEXT_PUBLIC_SUPABASE_URL,
      hasKey: !!env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      nodeEnv: env.NODE_ENV,
      url: env.NEXT_PUBLIC_SUPABASE_URL.substring(0, 20) + '...'
    })

    return createBrowserClient<Database>(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
  } catch (error) {
    logger.errorWithStack('Failed to create Supabase client', error as Error)

    // Always return mock client on error to prevent app crash
    logger.warn('Using mock Supabase client due to initialization error')
    return createMockClient()
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