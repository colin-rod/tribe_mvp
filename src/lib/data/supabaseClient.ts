import type { SupabaseClient, User } from '@supabase/supabase-js'

import { createClient } from '@/lib/supabase/client'
import type { Database } from '@/lib/types/database'

export type SupabaseClientType = SupabaseClient<Database>

export interface AuthenticatedSupabaseContext {
  supabase: SupabaseClientType
  user: User
}

/**
 * Creates a Supabase client and resolves the currently authenticated user.
 * Throws descriptive errors when authentication state cannot be determined.
 */
export async function getAuthenticatedSupabaseContext(
  client: SupabaseClientType = createClient()
): Promise<AuthenticatedSupabaseContext> {
  const supabase = client
  const {
    data: { user },
    error
  } = await supabase.auth.getUser()

  if (error) {
    throw new Error(`Failed to retrieve authenticated user: ${error.message}`)
  }

  if (!user) {
    throw new Error('Not authenticated')
  }

  return { supabase, user }
}

/**
 * Convenience wrapper to create a typed Supabase client without immediately
 * resolving authentication state. Useful for repositories that don't require
 * the current user context.
 */
export function createSupabaseClient(): SupabaseClientType {
  return createClient()
}
