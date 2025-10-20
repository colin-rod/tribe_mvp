'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { Alert } from '@/components/ui/Alert'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import {
  getPasswordResetRateLimitInfo,
  isEmailEligibleForReset,
  requestPasswordReset,
  type PasswordResetRateLimitInfo,
  type PasswordResetRequestResult,
} from '@/lib/auth/password-reset'
import { formatTimeUntilReset } from '@/lib/utils/rate-limit'

interface AlertState {
  type: 'success' | 'error'
  message: string
}

export default function ForgotPasswordForm() {
  const [email, setEmail] = useState('')
  const [emailError, setEmailError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [alert, setAlert] = useState<AlertState | null>(null)
  const [rateLimitInfo, setRateLimitInfo] = useState<PasswordResetRateLimitInfo>(() =>
    getPasswordResetRateLimitInfo('')
  )
  const [cooldownDisplay, setCooldownDisplay] = useState<string | null>(null)

  useEffect(() => {
    if (!rateLimitInfo.resetAt) {
      setCooldownDisplay(null)
      return
    }

    const updateDisplay = () => {
      if (rateLimitInfo.resetAt) {
        setCooldownDisplay(formatTimeUntilReset(rateLimitInfo.resetAt))
      }
    }

    updateDisplay()
    const timer = window.setInterval(updateDisplay, 1000)

    return () => window.clearInterval(timer)
  }, [rateLimitInfo.resetAt])

  const remainingAttemptsText = useMemo(() => {
    if (rateLimitInfo.remainingAttempts === 3) {
      return 'You can request up to 3 password resets per hour.'
    }

    if (rateLimitInfo.remainingAttempts === 0) {
      return cooldownDisplay
        ? `You have reached the hourly limit. Try again in ${cooldownDisplay}.`
        : 'You have reached the hourly limit for password reset requests.'
    }

    return `${rateLimitInfo.remainingAttempts} password reset ${
      rateLimitInfo.remainingAttempts === 1 ? 'request remains' : 'requests remain'
    } this hour.`
  }, [rateLimitInfo.remainingAttempts, cooldownDisplay])

  const handleEmailChange = (value: string) => {
    setEmail(value)
    setEmailError(null)
    setAlert(null)
    setRateLimitInfo(getPasswordResetRateLimitInfo(value))
  }

  const validateEmail = () => {
    if (!email) {
      setEmailError('Please enter your email address.')
      return false
    }

    if (!isEmailEligibleForReset(email)) {
      setEmailError('Enter a valid email address to continue.')
      return false
    }

    return true
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (submitting) return

    if (!validateEmail()) {
      return
    }

    setSubmitting(true)
    setAlert(null)

    try {
      const result: PasswordResetRequestResult = await requestPasswordReset(email)
      setRateLimitInfo({
        remainingAttempts: result.remainingAttempts,
        resetAt: result.resetAt,
      })

      if (result.rateLimited) {
        setAlert({
          type: 'error',
          message: result.message,
        })
        return
      }

      setAlert({
        type: 'success',
        message: result.message,
      })

      if (result.remainingAttempts === 0 && result.resetAt) {
        setCooldownDisplay(formatTimeUntilReset(result.resetAt))
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-center text-3xl font-bold tracking-tight text-gray-900">
          Reset your password
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          Enter the email associated with your account and we will send you a link to reset your password.
        </p>
      </div>

      <form className="space-y-6" onSubmit={handleSubmit} noValidate>
        {alert && (
          <Alert
            variant={alert.type === 'success' ? 'success' : 'error'}
            title={alert.type === 'success' ? 'Request received' : 'Please wait'}
          >
            {alert.message}
          </Alert>
        )}

        <Input
          type="email"
          label="Email address"
          placeholder="you@example.com"
          autoComplete="email"
          autoFocus
          required
          value={email}
          onChange={(event) => handleEmailChange(event.target.value)}
          errorMessage={emailError ?? undefined}
          helperText={remainingAttemptsText}
        />

        <div className="space-y-3">
          <Button type="submit" className="w-full" loading={submitting} disabled={submitting}>
            {submitting ? 'Sending reset email...' : 'Send reset instructions'}
          </Button>

          <p className="text-center text-sm text-gray-600">
            Remembered your password?{' '}
            <Link href="/login" className="font-medium text-primary-600 hover:text-primary-500">
              Return to sign in
            </Link>
          </p>

        </div>
      </form>
    </div>
  )
}
