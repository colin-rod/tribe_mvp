'use client'

/**
 * Forgot Password Form Component
 * CRO-262: Password Reset Flow
 *
 * Allows users to request a password reset email
 * Includes client-side rate limiting (3 requests per hour)
 */

import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { FormField } from '@/components/ui/FormField'
import { Alert } from '@/components/ui/Alert'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { isValidEmail } from '@/lib/supabase/auth'
import {
  requestPasswordReset,
  getRateLimitState,
  formatTimeRemaining,
  getRateLimitTimeRemaining
} from '@/lib/auth/password-reset'
import { cn } from '@/lib/utils'
import { EnvelopeIcon, ClockIcon } from '@heroicons/react/24/outline'

interface ForgotPasswordFormProps {
  onSuccess?: () => void
  className?: string
}

export function ForgotPasswordForm({ onSuccess, className }: ForgotPasswordFormProps) {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [validationError, setValidationError] = useState<string | null>(null)
  const [rateLimitState, setRateLimitState] = useState(getRateLimitState())
  const [timeRemaining, setTimeRemaining] = useState<number>(0)

  // Update rate limit state on mount and when time remaining changes
  useEffect(() => {
    const updateRateLimit = () => {
      const state = getRateLimitState()
      setRateLimitState(state)

      if (state.isLimited) {
        setTimeRemaining(getRateLimitTimeRemaining())
      }
    }

    updateRateLimit()

    // Update every second if rate limited
    if (rateLimitState.isLimited) {
      const interval = setInterval(updateRateLimit, 1000)
      return () => clearInterval(interval)
    }
  }, [rateLimitState.isLimited])

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEmail(e.target.value)
    // Clear errors when user starts typing
    if (validationError || error) {
      setValidationError(null)
      setError(null)
    }
    if (success) {
      setSuccess(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Clear previous states
    setValidationError(null)
    setError(null)
    setSuccess(false)

    // Validate email
    if (!email) {
      setValidationError('Email is required')
      return
    }

    if (!isValidEmail(email)) {
      setValidationError('Please enter a valid email address')
      return
    }

    // Check rate limit
    const currentRateLimit = getRateLimitState()
    if (currentRateLimit.isLimited) {
      const remaining = getRateLimitTimeRemaining()
      setError(`Too many attempts. Please try again in ${formatTimeRemaining(remaining)}.`)
      return
    }

    setLoading(true)

    try {
      const result = await requestPasswordReset(email)

      if (!result.success && result.error) {
        setError(result.error)
      } else {
        setSuccess(true)
        setEmail('') // Clear email field

        // Update rate limit state
        setRateLimitState(getRateLimitState())

        if (onSuccess) {
          onSuccess()
        }
      }
    } catch (err) {
      setError('An unexpected error occurred. Please try again.')
      // eslint-disable-next-line no-console
      console.error('Password reset error:', err)
    } finally {
      setLoading(false)
    }
  }

  const attemptsRemaining = Math.max(0, 3 - rateLimitState.attempts)

  return (
    <div className={cn('w-full max-w-md', className)}>
      <div className="mb-6 text-center">
        <div className="inline-flex items-center justify-center w-12 h-12 bg-indigo-100 rounded-full mb-4">
          <EnvelopeIcon className="w-6 h-6 text-indigo-600" aria-hidden="true" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Forgot your password?
        </h2>
        <p className="text-sm text-gray-600">
          {`Enter your email address and we'll send you a link to reset your password.`}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <FormField
          label="Email address"
          required
          error={validationError || undefined}
        >
          <Input
            type="email"
            value={email}
            onChange={handleEmailChange}
            placeholder="you@example.com"
            disabled={loading || rateLimitState.isLimited}
            autoComplete="email"
            autoFocus
            className={cn(validationError && 'border-red-500')}
            aria-invalid={!!validationError}
            aria-describedby={validationError ? 'email-error' : undefined}
          />
        </FormField>

        {/* Rate Limit Warning */}
        {rateLimitState.attempts > 0 && !rateLimitState.isLimited && (
          <div className="flex items-center gap-2 text-xs text-amber-600 bg-amber-50 px-3 py-2 rounded-md">
            <ClockIcon className="w-4 h-4 shrink-0" aria-hidden="true" />
            <span>
              {attemptsRemaining} attempt{attemptsRemaining !== 1 ? 's' : ''} remaining in this hour
            </span>
          </div>
        )}

        {/* Rate Limited Message */}
        {rateLimitState.isLimited && (
          <Alert variant="warning" title="Too many attempts">
            Please wait {formatTimeRemaining(timeRemaining)} before trying again.
          </Alert>
        )}

        <Button
          type="submit"
          className="w-full"
          disabled={loading || !email || rateLimitState.isLimited}
        >
          {loading ? (
            <>
              <LoadingSpinner size="sm" className="mr-2" />
              Sending...
            </>
          ) : (
            'Send reset link'
          )}
        </Button>
      </form>

      {/* Success Message */}
      {success && (
        <Alert
          variant="success"
          className="mt-4"
          title="Check your email"
        >
          {`If an account exists with that email, we've sent a password reset link.
          Please check your inbox and spam folder.`}
        </Alert>
      )}

      {/* Error Message */}
      {error && (
        <Alert
          variant="error"
          className="mt-4"
          title="Unable to send reset link"
        >
          {error}
        </Alert>
      )}

      {/* Security Note */}
      <div className="mt-6 p-4 bg-gray-50 rounded-lg">
        <p className="text-xs text-gray-600">
          <strong className="font-medium text-gray-900">Security note:</strong>{' '}
          {`For security reasons, we don't reveal whether an email exists in our system.
          You'll receive an email only if your address is registered.`}
        </p>
      </div>

      {/* Help Text */}
      <div className="mt-4 text-center">
        <p className="text-sm text-gray-600">
          Remember your password?{' '}
          <a
            href="/login"
            className="font-medium text-indigo-600 hover:text-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 rounded"
          >
            Sign in
          </a>
        </p>
      </div>
    </div>
  )
}
