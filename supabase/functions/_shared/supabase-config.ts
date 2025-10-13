export interface SupabaseConfig {
  supabaseUrl: string
  supabaseServiceRoleKey: string
}

export function getSupabaseConfig(): SupabaseConfig {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

  const missing: string[] = []
  if (!supabaseUrl) missing.push('SUPABASE_URL')
  if (!supabaseServiceRoleKey) missing.push('SUPABASE_SERVICE_ROLE_KEY')

  if (missing.length > 0) {
    const message = `Missing required Supabase environment variable(s): ${missing.join(', ')}`
    console.error(`Fatal: ${message}`)
    throw new Error(message)
  }

  // TypeScript knows these are defined after the checks above, but we need explicit assertion
  return {
    supabaseUrl: supabaseUrl as string,
    supabaseServiceRoleKey: supabaseServiceRoleKey as string
  }
}
