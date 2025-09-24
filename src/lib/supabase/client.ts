'use client'

import { createBrowserClient } from '@supabase/ssr'
import type { Database } from '../types/database'
import { getClientEnv } from '../env'
import { createLogger } from '../logger'

const logger = createLogger('supabase-client')

export function createClient() {
  try {
    const env = getClientEnv()

    // Check if we have the required Supabase variables
    if (!env.NEXT_PUBLIC_SUPABASE_URL || !env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      // During build time or when missing config, return a mock client
      if (typeof window === 'undefined') {
        logger.info('Using mock Supabase client during build')
        return createMockClient()
      }

      const errorMsg = 'Missing Supabase environment variables. Please add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to your environment variables.'
      logger.error(errorMsg)
      throw new Error(errorMsg)
    }

    logger.debug('Creating Supabase browser client')
    return createBrowserClient<Database>(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
  } catch (error) {
    logger.errorWithStack('Failed to create Supabase client', error as Error)

    // During build time, return mock client to prevent build failures
    if (typeof window === 'undefined') {
      return createMockClient()
    }

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