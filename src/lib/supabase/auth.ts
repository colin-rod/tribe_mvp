import { createClient } from './client'
import type { AuthError, Provider } from '@supabase/supabase-js'

// Client-side auth utilities
export async function signUp(email: string, password: string, name?: string) {
  const supabase = createClient()

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`,
      data: {
        name: name || ''
      }
    },
  })

  // If signup was successful and name was provided, update the profile
  if (data.user && name && !error) {
    // Profile is automatically created via database trigger, so we just update it
    await supabase
      .from('profiles')
      .update({ name: name.trim() })
      .eq('id', data.user.id)
  }

  return { data, error }
}

export async function signIn(email: string, password: string) {
  const supabase = createClient()

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  return { data, error }
}

export async function signInWithProvider(
  provider: Provider,
  options: { nextPath?: string; scopes?: string } = {}
) {
  const supabase = createClient()

  const nextPath = options.nextPath ?? '/dashboard'
  const isSafePath =
    nextPath.startsWith('/') && !nextPath.startsWith('//') && !nextPath.includes('..')

  const redirectTo = isSafePath
    ? `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback?next=${encodeURIComponent(nextPath)}`
    : `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`

  return supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo,
      scopes: options.scopes,
    },
  })
}

/**
 * Sign out and clear all sessions
 * CRO-99: Enhanced logout that clears all sessions properly
 * @param scope - 'local' (current session), 'global' (all sessions), or 'others' (all except current)
 */
export async function signOut(scope: 'local' | 'global' | 'others' = 'local') {
  const supabase = createClient()

  // Sign out with specified scope
  const { error } = await supabase.auth.signOut({ scope })

  // Clear any local storage items that might persist
  if (typeof window !== 'undefined') {
    try {
      // Clear any cached session data
      localStorage.removeItem('supabase.auth.token')
      sessionStorage.clear()
    } catch {
      // Silently fail if storage clearing fails
      // This is non-critical and shouldn't block logout
    }
  }

  return { error }
}

export async function resetPassword(email: string) {
  const supabase = createClient()

  const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/reset-password`,
  })

  return { data, error }
}

// Note: Server-side auth utilities have been moved to individual components
// that can properly import next/headers in Server Components

// Auth validation utilities
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

export function isValidPassword(password: string): boolean {
  // At least 8 characters, 1 uppercase, 1 lowercase, 1 number
  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{8,}$/
  return passwordRegex.test(password)
}

export function getPasswordStrength(password: string): 'weak' | 'medium' | 'strong' {
  if (password.length < 6) return 'weak'
  if (password.length >= 8 && /(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password)) {
    return 'strong'
  }
  return 'medium'
}

// Error message utilities
export function getAuthErrorMessage(error: AuthError | null): string {
  if (!error) return ''

  switch (error.message) {
    case 'Invalid login credentials':
      return 'Invalid email or password. Please check your credentials and try again.'
    case 'User already registered':
      return 'An account with this email already exists. Try signing in instead.'
    case 'Email not confirmed':
      return 'Please check your email and click the confirmation link before signing in.'
    case 'Password should be at least 6 characters':
      return 'Password must be at least 6 characters long.'
    default:
      return error.message || 'An unexpected error occurred. Please try again.'
  }
}
