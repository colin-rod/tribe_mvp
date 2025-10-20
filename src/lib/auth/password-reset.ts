import { resetPassword } from '@/lib/supabase/auth'
import { createClient } from '@/lib/supabase/client'
import {
  clearRateLimit,
  formatTimeUntilReset,
  getRateLimitResetTime,
  getRemainingAttempts,
  incrementRateLimit,
  isRateLimited,
  type RateLimitConfig,
} from '@/lib/utils/rate-limit'
import { isValidEmail } from '@/lib/supabase/auth'

const RATE_LIMIT_CONFIG: RateLimitConfig = {
  maxAttempts: 3,
  windowMs: 60 * 60 * 1000,
}

const RATE_LIMIT_PREFIX = 'password_reset'

export interface PasswordResetRateLimitInfo {
  remainingAttempts: number
  resetAt: number | null
}

export interface PasswordResetRequestResult extends PasswordResetRateLimitInfo {
  success: boolean
  rateLimited: boolean
  message: string
  errorMessage?: string
}

export interface RecoverySessionStatus {
  isValid: boolean
  email?: string
  error?: string
}

function normalizeEmail(email: string): string {
  return email.trim()
}

function getRateLimitKey(email: string): string {
  if (typeof window === 'undefined') {
    return RATE_LIMIT_PREFIX
  }

  const normalized = normalizeEmail(email).toLowerCase()
  if (!normalized) {
    return RATE_LIMIT_PREFIX
  }

  return `${RATE_LIMIT_PREFIX}_${encodeURIComponent(normalized)}`
}

export function getPasswordResetRateLimitInfo(email: string): PasswordResetRateLimitInfo {
  const key = getRateLimitKey(email)
  return {
    remainingAttempts: getRemainingAttempts(key, RATE_LIMIT_CONFIG),
    resetAt: getRateLimitResetTime(key),
  }
}

export async function requestPasswordReset(email: string): Promise<PasswordResetRequestResult> {
  const normalizedEmail = normalizeEmail(email)
  const key = getRateLimitKey(normalizedEmail)

  if (isRateLimited(key, RATE_LIMIT_CONFIG)) {
    const resetAt = getRateLimitResetTime(key)
    return {
      success: false,
      rateLimited: true,
      remainingAttempts: 0,
      resetAt,
      message: resetAt
        ? `Too many password reset requests. Try again in ${formatTimeUntilReset(resetAt)}.`
        : 'Too many password reset requests. Please try again later.',
    }
  }

  let errorMessage: string | undefined

  try {
    const { error } = await resetPassword(normalizedEmail)
    if (error) {
      errorMessage = error.message
    }
  } catch (error) {
    errorMessage = error instanceof Error ? error.message : 'Unknown error'
  }

  // Increment rate limit regardless of Supabase response to prevent enumeration
  incrementRateLimit(key, RATE_LIMIT_CONFIG)

  const { remainingAttempts, resetAt } = getPasswordResetRateLimitInfo(normalizedEmail)

  return {
    success: true,
    rateLimited: false,
    remainingAttempts,
    resetAt,
    errorMessage,
    message: 'If an account exists for that email, you will receive password reset instructions shortly.',
  }
}

interface RecoveryTokens {
  access_token: string
  refresh_token: string
  type: string
}

function extractRecoveryTokens(): RecoveryTokens | null {
  if (typeof window === 'undefined') {
    return null
  }

  const hash = window.location.hash.startsWith('#')
    ? window.location.hash.slice(1)
    : window.location.hash

  if (!hash) {
    return null
  }

  const params = new URLSearchParams(hash)
  const type = params.get('type') ?? ''
  const access_token = params.get('access_token') ?? ''
  const refresh_token = params.get('refresh_token') ?? ''

  if (type !== 'recovery' || !access_token || !refresh_token) {
    return null
  }

  return { type, access_token, refresh_token }
}

export async function preparePasswordRecoverySession(): Promise<RecoverySessionStatus> {
  if (typeof window === 'undefined') {
    return {
      isValid: false,
      error: 'Password reset is only available in the browser.',
    }
  }

  const supabase = createClient()

  // First, check if a session already exists (e.g., tokens already processed)
  const { data: existingSession, error: existingSessionError } = await supabase.auth.getSession()

  if (existingSessionError) {
    return {
      isValid: false,
      error: 'We could not verify your reset link. Please request a new one.',
    }
  }

  if (existingSession.session?.user) {
    return {
      isValid: true,
      email: existingSession.session.user.email ?? undefined,
    }
  }

  const tokens = extractRecoveryTokens()

  if (!tokens) {
    return {
      isValid: false,
      error: 'Your password reset link is invalid or has expired. Please request a new one.',
    }
  }

  const { data, error } = await supabase.auth.setSession({
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token,
  })

  if (error || !data.session?.user) {
    return {
      isValid: false,
      error: 'We could not verify your reset link. Please request a new one.',
    }
  }

  // Clean up URL hash so tokens aren't visible after processing
  window.history.replaceState({}, document.title, window.location.pathname + window.location.search)

  return {
    isValid: true,
    email: data.session.user.email ?? undefined,
  }
}

export async function completePasswordReset(newPassword: string): Promise<{ success: boolean; error?: string; email?: string }> {
  const supabase = createClient()

  const { data: sessionData } = await supabase.auth.getSession()
  const email = sessionData?.session?.user?.email ?? undefined

  const { error } = await supabase.auth.updateUser({ password: newPassword })

  if (error) {
    return { success: false, error: error.message }
  }

  await supabase.auth.signOut()

  return { success: true, email }
}

export function clearPasswordResetRateLimit(email: string): void {
  clearRateLimit(getRateLimitKey(email))
}

export function isEmailEligibleForReset(email: string): boolean {
  return isValidEmail(email)
}
