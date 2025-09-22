'use client'

import { createBrowserClient } from '@supabase/ssr'
import type { Database } from '../types/database'

export function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    // During build time, return a mock client to prevent build errors
    if (typeof window === 'undefined') {
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

    throw new Error(
      'Missing Supabase environment variables. Please add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to your environment variables.'
    )
  }

  return createBrowserClient<Database>(supabaseUrl, supabaseAnonKey)
}

// Export a singleton instance for use in client components
export const supabase = createClient()