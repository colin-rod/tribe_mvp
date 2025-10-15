/**
 * Password Reset Utilities
 * CRO-262: Password Reset Flow
 *
 * Client-side utilities for password reset including rate limiting
 */

import { createClient } from '@/lib/supabase/client'

const RATE_LIMIT_KEY = 'password_reset_attempts'
const RATE_LIMIT_MAX = 3
const RATE_LIMIT_WINDOW = 60 * 60 * 1000 // 1 hour in milliseconds

export interface RateLimitState {
  attempts: number
  firstAttemptTime: number
  isLimited: boolean
  resetTime?: number
}

/**
 * Get current rate limit state from localStorage
 */
export function getRateLimitState(): RateLimitState {
  if (typeof window === 'undefined') {
    return { attempts: 0, firstAttemptTime: 0, isLimited: false }
  }

  try {
    const stored = localStorage.getItem(RATE_LIMIT_KEY)
    if (!stored) {
      return { attempts: 0, firstAttemptTime: 0, isLimited: false }
    }

    const data = JSON.parse(stored)
    const now = Date.now()
    const timeSinceFirst = now - data.firstAttemptTime

    // Reset if window has passed
    if (timeSinceFirst > RATE_LIMIT_WINDOW) {
      localStorage.removeItem(RATE_LIMIT_KEY)
      return { attempts: 0, firstAttemptTime: 0, isLimited: false }
    }

    // Check if limited
    const isLimited = data.attempts >= RATE_LIMIT_MAX
    const resetTime = isLimited ? data.firstAttemptTime + RATE_LIMIT_WINDOW : undefined

    return {
      attempts: data.attempts,
      firstAttemptTime: data.firstAttemptTime,
      isLimited,
      resetTime
    }
  } catch {
    return { attempts: 0, firstAttemptTime: 0, isLimited: false }
  }
}

/**
 * Record a password reset attempt
 */
export function recordResetAttempt(): RateLimitState {
  if (typeof window === 'undefined') {
    return { attempts: 0, firstAttemptTime: 0, isLimited: false }
  }

  const currentState = getRateLimitState()
  const now = Date.now()

  const newState = {
    attempts: currentState.attempts + 1,
    firstAttemptTime: currentState.firstAttemptTime || now
  }

  try {
    localStorage.setItem(RATE_LIMIT_KEY, JSON.stringify(newState))
  } catch {
    // Silently fail if localStorage is not available
  }

  return getRateLimitState()
}

/**
 * Request a password reset email
 * Always returns success to prevent user enumeration
 */
export async function requestPasswordReset(email: string): Promise<{
  success: boolean
  error?: string
}> {
  // Check rate limit
  const rateLimitState = getRateLimitState()
  if (rateLimitState.isLimited) {
    const resetTime = rateLimitState.resetTime || Date.now()
    const minutesRemaining = Math.ceil((resetTime - Date.now()) / 60000)
    return {
      success: false,
      error: `Too many attempts. Please try again in ${minutesRemaining} minute${minutesRemaining !== 1 ? 's' : ''}.`
    }
  }

  const supabase = createClient()

  try {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`
    })

    // Record the attempt
    recordResetAttempt()

    // Always return success to prevent user enumeration
    // Even if the email doesn't exist, we don't want to reveal that
    if (error) {
      // eslint-disable-next-line no-console
      console.error('Password reset error:', error)
    }

    return { success: true }
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Password reset error:', error)
    // Still return success to prevent enumeration
    return { success: true }
  }
}

/**
 * Update password with new value
 * Used after user clicks reset link from email
 */
export async function updatePassword(newPassword: string): Promise<{
  success: boolean
  error?: string
}> {
  const supabase = createClient()

  try {
    const { error } = await supabase.auth.updateUser({
      password: newPassword
    })

    if (error) {
      return {
        success: false,
        error: error.message || 'Failed to update password'
      }
    }

    return { success: true }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update password'
    }
  }
}

/**
 * Get time remaining until rate limit resets
 */
export function getRateLimitTimeRemaining(): number {
  const state = getRateLimitState()
  if (!state.isLimited || !state.resetTime) {
    return 0
  }
  return Math.max(0, state.resetTime - Date.now())
}

/**
 * Format time remaining for display
 */
export function formatTimeRemaining(milliseconds: number): string {
  const minutes = Math.ceil(milliseconds / 60000)
  if (minutes <= 1) {
    return 'less than a minute'
  }
  return `${minutes} minutes`
}
