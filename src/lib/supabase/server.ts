import { createServerClient, type CookieOptions } from '@supabase/ssr'
import type { Database } from '../types/database'
import { getEnv, getFeatureFlags } from '../env'
import { createLogger } from '../logger'

const logger = createLogger('supabase-server')

export function createClient(cookieStore: {
  get: (name: string) => { value: string } | undefined
  set: (name: string, value: string, options?: any) => void
}) {
  try {
    const env = getEnv()
    const features = getFeatureFlags()

    if (!features.supabaseEnabled) {
      logger.warn('Supabase not properly configured - returning mock client')
      return createMockClient()
    }

    logger.debug('Creating Supabase server client', {
      hasUrl: !!env.NEXT_PUBLIC_SUPABASE_URL,
      hasKey: !!env.NEXT_PUBLIC_SUPABASE_ANON_KEY
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
              logger.warn('Failed to set cookie in Server Component', { name, error: (error as Error).message })
            }
          },
          remove(name: string, options: CookieOptions) {
            try {
              cookieStore.set(name, '', { ...options, maxAge: 0 })
            } catch (error) {
              logger.warn('Failed to remove cookie in Server Component', { name, error: (error as Error).message })
            }
          },
        },
      }
    )
  } catch (error) {
    logger.errorWithStack('Failed to create Supabase server client', error as Error)
    return createMockClient()
  }
}

function createMockClient() {
  logger.info('Using mock Supabase client')
  return {
    from: () => ({
      select: () => Promise.resolve({ data: [], error: null }),
      insert: () => Promise.resolve({ data: [], error: null }),
      update: () => Promise.resolve({ data: [], error: null }),
      delete: () => Promise.resolve({ data: [], error: null }),
    }),
    auth: {
      getUser: () => Promise.resolve({ data: { user: null }, error: null }),
    },
  } as any
}