'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Alert } from '@/components/ui/Alert'
import { Button } from '@/components/ui/Button'
import { resendVerificationEmail } from '@/lib/supabase/auth'
import {
  isRateLimited,
  incrementRateLimit,
  getRemainingAttempts,
  getRateLimitResetTime,
  formatTimeUntilReset,
} from '@/lib/utils/rate-limit'

/**
 * Verification Banner Component
 * CRO-268: Email Verification for New Signups
 *
 * Displays a warning banner for users with unverified email addresses
 * Includes a button to resend the verification email with rate limiting
 */

interface VerificationBannerProps {
  userEmail: string
  onDismiss?: () => void
  dismissible?: boolean
}

export function VerificationBanner({
  userEmail,
  onDismiss,
  dismissible = false,
}: VerificationBannerProps) {
  const router = useRouter()
  const [resending, setResending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [remainingAttempts, setRemainingAttempts] = useState(3)
  const [resetTime, setResetTime] = useState<number | null>(null)

  const rateLimitKey = `verify_resend_${userEmail}`

  useEffect(() => {
    // Initialize rate limit state
    setRemainingAttempts(getRemainingAttempts(rateLimitKey))
    setResetTime(getRateLimitResetTime(rateLimitKey))
  }, [rateLimitKey])

  // Update reset time display every second
  useEffect(() => {
    if (resetTime) {
      const interval = setInterval(() => {
        const now = Date.now()
        if (now >= resetTime) {
          // Rate limit has expired, update state
          setRemainingAttempts(getRemainingAttempts(rateLimitKey))
          setResetTime(null)
        }
      }, 1000)

      return () => clearInterval(interval)
    }
  }, [resetTime, rateLimitKey])

  const handleResendEmail = async () => {
    // Check rate limit
    if (isRateLimited(rateLimitKey)) {
      const resetAt = getRateLimitResetTime(rateLimitKey)
      const timeUntil = resetAt ? formatTimeUntilReset(resetAt) : 'later'
      setError(`Too many requests. Please try again in ${timeUntil}.`)
      return
    }

    setResending(true)
    setError(null)
    setSuccess(null)

    try {
      const { error: resendError } = await resendVerificationEmail(userEmail)

      if (resendError) {
        setError('Failed to send verification email. Please try again.')
        return
      }

      // Increment rate limit
      incrementRateLimit(rateLimitKey)
      setRemainingAttempts(getRemainingAttempts(rateLimitKey))
      setResetTime(getRateLimitResetTime(rateLimitKey))

      setSuccess('Verification email sent! Please check your inbox.')
    } catch {
      setError('An unexpected error occurred. Please try again.')
    } finally {
      setResending(false)
    }
  }

  const handleGoToVerifyPage = () => {
    router.push('/verify-email')
  }

  // Show error message if resend failed
  if (error) {
    return (
      <Alert
        variant="error"
        title="Failed to Resend Email"
        dismissible
        onDismiss={() => setError(null)}
      >
        {error}
      </Alert>
    )
  }

  // Show success message if resend succeeded
  if (success) {
    return (
      <Alert
        variant="success"
        title="Verification Email Sent"
        dismissible
        onDismiss={() => setSuccess(null)}
      >
        {success}
      </Alert>
    )
  }

  // Main verification banner
  return (
    <Alert
      variant="warning"
      title="Email Verification Required"
      dismissible={dismissible}
      onDismiss={onDismiss}
    >
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="text-sm">
          <p>
            Please verify your email address to access all features.
            {remainingAttempts < 3 && remainingAttempts > 0 && (
              <span className="ml-1 text-xs">
                ({remainingAttempts} {remainingAttempts === 1 ? 'attempt' : 'attempts'} remaining)
              </span>
            )}
          </p>
          {remainingAttempts === 0 && resetTime && (
            <p className="mt-1 text-xs">
              Rate limit reached. Try again in {formatTimeUntilReset(resetTime)}.
            </p>
          )}
        </div>

        <div className="flex gap-2 flex-shrink-0">
          <Button
            size="sm"
            variant="outline"
            onClick={handleGoToVerifyPage}
            className="whitespace-nowrap"
          >
            View Details
          </Button>
          <Button
            size="sm"
            variant="warning"
            onClick={handleResendEmail}
            disabled={remainingAttempts === 0 || resending}
            loading={resending}
            className="whitespace-nowrap"
          >
            {resending ? 'Sending...' : 'Resend Email'}
          </Button>
        </div>
      </div>
    </Alert>
  )
}
