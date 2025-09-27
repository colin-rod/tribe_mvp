'use client'

import { createBrowserClient } from '@supabase/ssr'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '../types/database'
import { createLogger } from '../logger'

const logger = createLogger('supabase-client')

type SupabaseClientType = SupabaseClient<Database>

export function createClient() {
  try {
    // Use direct process.env access for NEXT_PUBLIC_ variables
    // These get replaced at build time by Next.js
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

    // Check if we're in a valid state to create a real client
    const hasValidConfig = supabaseUrl &&
                          supabaseAnonKey &&
                          supabaseUrl !== 'development-fallback-key' &&
                          supabaseUrl !== ''

    if (!hasValidConfig) {
      // During build time or SSR, always use mock client
      if (typeof window === 'undefined') {
        logger.info('Using mock Supabase client during SSR/build')
        return createMockClient()
      }

      // Client-side: use mock client but log the reason
      logger.warn('Using mock Supabase client due to missing environment variables', {
        hasUrl: !!supabaseUrl,
        hasKey: !!supabaseAnonKey,
        urlValue: supabaseUrl,
        isClient: typeof window !== 'undefined'
      })
      return createMockClient()
    }

    logger.debug('Creating Supabase browser client', {
      hasUrl: !!supabaseUrl,
      hasKey: !!supabaseAnonKey,
      nodeEnv: process.env.NODE_ENV,
      url: supabaseUrl.substring(0, 20) + '...'
    })

    return createBrowserClient<Database>(supabaseUrl, supabaseAnonKey)
  } catch (error) {
    logger.errorWithStack('Failed to create Supabase client', error as Error)

    // Always return mock client on error to prevent app crash
    logger.warn('Using mock Supabase client due to initialization error')
    return createMockClient()
  }
}

function createMockClient(): SupabaseClientType {
  const mockQueryBuilder = {
    select: () => mockQueryBuilder,
    insert: () => mockQueryBuilder,
    update: () => mockQueryBuilder,
    delete: () => mockQueryBuilder,
    eq: () => mockQueryBuilder,
    neq: () => mockQueryBuilder,
    gt: () => mockQueryBuilder,
    gte: () => mockQueryBuilder,
    lt: () => mockQueryBuilder,
    lte: () => mockQueryBuilder,
    like: () => mockQueryBuilder,
    ilike: () => mockQueryBuilder,
    is: () => mockQueryBuilder,
    in: () => mockQueryBuilder,
    contains: () => mockQueryBuilder,
    containedBy: () => mockQueryBuilder,
    rangeGt: () => mockQueryBuilder,
    rangeGte: () => mockQueryBuilder,
    rangeLt: () => mockQueryBuilder,
    rangeLte: () => mockQueryBuilder,
    rangeAdjacent: () => mockQueryBuilder,
    overlaps: () => mockQueryBuilder,
    textSearch: () => mockQueryBuilder,
    match: () => mockQueryBuilder,
    not: () => mockQueryBuilder,
    or: () => mockQueryBuilder,
    filter: () => mockQueryBuilder,
    order: () => mockQueryBuilder,
    limit: () => mockQueryBuilder,
    range: () => mockQueryBuilder,
    abortSignal: () => mockQueryBuilder,
    single: () => Promise.resolve({ data: null, error: null }),
    maybeSingle: () => Promise.resolve({ data: null, error: null }),
    csv: () => Promise.resolve({ data: '', error: null }),
    geojson: () => Promise.resolve({ data: null, error: null }),
    explain: () => Promise.resolve({ data: '', error: null }),
    rollback: () => mockQueryBuilder,
    returns: () => mockQueryBuilder,
    then: (resolve: any) => Promise.resolve({ data: [], error: null }).then(resolve),
    catch: (reject: any) => Promise.resolve({ data: [], error: null }).catch(reject),
  }

  return {
    from: () => mockQueryBuilder,
    rpc: () => Promise.resolve({ data: [], error: null }),
    auth: {
      getUser: () => Promise.resolve({ data: { user: null }, error: null }),
      getSession: () => Promise.resolve({ data: { session: null }, error: null }),
      onAuthStateChange: () => ({ data: { subscription: {} }, error: null }),
      signOut: () => Promise.resolve({ error: null }),
      signUp: () => Promise.resolve({ data: { user: null, session: null }, error: null }),
      signInWithPassword: () => Promise.resolve({ data: { user: null, session: null }, error: null }),
      admin: {
        createUser: () => Promise.resolve({ data: { user: null }, error: null }),
        deleteUser: () => Promise.resolve({ data: { user: null }, error: null }),
      },
    },
    channel: () => ({
      on: () => ({ subscribe: () => {} }),
      unsubscribe: () => Promise.resolve('ok'),
    }),
    removeChannel: () => {},
    removeAllChannels: () => Promise.resolve([]),
  } as unknown as SupabaseClientType
}

// Export a lazy-loaded singleton instance for use in client components
let _supabase: ReturnType<typeof createClient> | null = null

export const supabase = new Proxy({} as ReturnType<typeof createClient>, {
  get(_, prop) {
    if (!_supabase) {
      _supabase = createClient()
    }
    return (_supabase as SupabaseClientType)[prop]
  }
})
