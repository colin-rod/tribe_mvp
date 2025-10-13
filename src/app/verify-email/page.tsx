'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { resendVerificationEmail } from '@/lib/supabase/auth'
import { Button } from '@/components/ui/Button'
import { Alert } from '@/components/ui/Alert'
import {
  isRateLimited,
  incrementRateLimit,
  getRemainingAttempts,
  getRateLimitResetTime,
  formatTimeUntilReset,
} from '@/lib/utils/rate-limit'

/**
 * Email Verification Page
 * CRO-268: Email Verification for New Signups
 *
 * Handles two states:
 * 1. Pending verification - Shows "check your email" message with resend option
 * 2. Success - Shows success message after email verification, auto-redirects to onboarding
 */
export default function VerifyEmailPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [user, setUser] = useState<{ email?: string } | null>(null)
  const [loading, setLoading] = useState(true)
  const [resending, setResending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [remainingAttempts, setRemainingAttempts] = useState(3)
  const [resetTime, setResetTime] = useState<number | null>(null)

  // Check if user just verified their email (from callback URL)
  const verified = searchParams?.get('verified') === 'true'

  // Check if there was an error during verification
  const verificationError = searchParams?.get('error')

  useEffect(() => {
    const checkUser = async () => {
      const supabase = createClient()
      const { data: { user: currentUser } } = await supabase.auth.getUser()

      if (!currentUser) {
        // No user logged in, redirect to login
        router.push('/login')
        return
      }

      if (currentUser.email_confirmed_at) {
        // Email already verified, redirect to onboarding or dashboard
        router.push('/onboarding')
        return
      }

      setUser(currentUser)
      setLoading(false)

      // Update rate limit state
      if (currentUser.email) {
        const rateLimitKey = `verify_resend_${currentUser.email}`
        setRemainingAttempts(getRemainingAttempts(rateLimitKey))
        setResetTime(getRateLimitResetTime(rateLimitKey))
      }
    }

    checkUser()
  }, [router])

  // Handle verification success with auto-redirect
  useEffect(() => {
    if (verified) {
      // Show success message for 3 seconds then redirect
      const timer = setTimeout(() => {
        router.push('/onboarding')
      }, 3000)

      return () => clearTimeout(timer)
    }
  }, [verified, router])

  // Update reset time display every second
  useEffect(() => {
    if (resetTime) {
      const interval = setInterval(() => {
        const now = Date.now()
        if (now >= resetTime) {
          // Rate limit has expired, update state
          if (user?.email) {
            const rateLimitKey = `verify_resend_${user.email}`
            setRemainingAttempts(getRemainingAttempts(rateLimitKey))
            setResetTime(null)
          }
        }
      }, 1000)

      return () => clearInterval(interval)
    }
  }, [resetTime, user?.email])

  const handleResendEmail = async () => {
    if (!user?.email) {
      setError('No email address found. Please try logging in again.')
      return
    }

    const rateLimitKey = `verify_resend_${user.email}`

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
      const { error: resendError } = await resendVerificationEmail(user.email)

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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600" />
      </div>
    )
  }

  // Success state - Email verified
  if (verified) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-50 px-4">
        <div className="max-w-md w-full space-y-8 text-center">
          {/* Success Icon */}
          <div className="mx-auto flex items-center justify-center h-24 w-24 rounded-full bg-success-100">
            <svg
              className="h-16 w-16 text-success-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>

          <div>
            <h1 className="text-3xl font-bold text-neutral-900">
              Email Verified!
            </h1>
            <p className="mt-2 text-neutral-600">
              Your email has been successfully verified.
            </p>
            <p className="mt-1 text-sm text-neutral-500">
              Redirecting you to get started...
            </p>
          </div>

          {/* Progress indicator */}
          <div className="w-full bg-neutral-200 rounded-full h-2">
            <div
              className="bg-success-600 h-2 rounded-full transition-all duration-3000 ease-linear"
              style={{ width: '100%', animation: 'progress 3s linear' }}
            />
          </div>

          <style jsx>{`
            @keyframes progress {
              from {
                width: 0%;
              }
              to {
                width: 100%;
              }
            }
          `}</style>
        </div>
      </div>
    )
  }

  // Pending verification state
  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-50 px-4">
      <div className="max-w-md w-full space-y-8">
        {/* Header */}
        <div className="text-center">
          {/* Email Icon */}
          <div className="mx-auto flex items-center justify-center h-24 w-24 rounded-full bg-primary-100">
            <svg
              className="h-16 w-16 text-primary-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
              />
            </svg>
          </div>

          <h1 className="mt-6 text-3xl font-bold text-neutral-900">
            Check Your Email
          </h1>
          <p className="mt-2 text-neutral-600">
            We sent a verification link to
          </p>
          {user?.email && (
            <p className="mt-1 text-sm font-medium text-primary-600">
              {user.email}
            </p>
          )}
        </div>

        {/* Instructions */}
        <div className="bg-white shadow-sm rounded-lg p-6 space-y-4">
          <p className="text-sm text-neutral-700">
            Click the link in the email to verify your account and get started with Tribe.
          </p>

          <div className="text-xs text-neutral-500 space-y-2">
            <p>The verification link will expire in 24 hours.</p>
            <p>
              Didn&apos;t receive the email? Check your spam folder or click the button below to resend.
            </p>
          </div>
        </div>

        {/* Error/Success Messages */}
        {verificationError && (
          <Alert variant="error" title="Verification Failed">
            The verification link is invalid or has expired. Please request a new verification email.
          </Alert>
        )}

        {error && (
          <Alert variant="error" dismissible onDismiss={() => setError(null)}>
            {error}
          </Alert>
        )}

        {success && (
          <Alert variant="success" dismissible onDismiss={() => setSuccess(null)}>
            {success}
          </Alert>
        )}

        {/* Resend Button */}
        <div className="space-y-3">
          <Button
            onClick={handleResendEmail}
            disabled={remainingAttempts === 0 || resending}
            loading={resending}
            variant="primary"
            className="w-full"
            aria-label="Resend verification email"
          >
            {resending ? 'Sending...' : 'Resend Verification Email'}
          </Button>

          {/* Rate limit info */}
          {remainingAttempts < 3 && remainingAttempts > 0 && (
            <p className="text-xs text-center text-neutral-500">
              {remainingAttempts} {remainingAttempts === 1 ? 'attempt' : 'attempts'} remaining
            </p>
          )}

          {remainingAttempts === 0 && resetTime && (
            <p className="text-xs text-center text-warning-600">
              Rate limit reached. Try again in {formatTimeUntilReset(resetTime)}.
            </p>
          )}
        </div>

        {/* Back to login link */}
        <div className="text-center">
          <Link
            href="/login"
            className="text-sm font-medium text-primary-600 hover:text-primary-500 transition-colors"
          >
            Back to Login
          </Link>
        </div>
      </div>
    </div>
  )
}
