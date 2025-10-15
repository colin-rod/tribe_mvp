'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Alert } from '@/components/ui/Alert'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { PasswordStrengthIndicator } from '@/components/ui/PasswordStrengthIndicator'
import type { PasswordStrength } from '@/lib/types/profile'
import {
  clearPasswordResetRateLimit,
  completePasswordReset,
  preparePasswordRecoverySession,
  type RecoverySessionStatus,
} from '@/lib/auth/password-reset'
import {
  evaluatePasswordStrength,
  isValidPassword,
  PASSWORD_MIN_LENGTH,
  PASSWORD_REQUIREMENTS,
} from '@/lib/validation/password'

interface FormErrors {
  password?: string
  confirmPassword?: string
}

export default function ResetPasswordForm() {
  const router = useRouter()
  const [status, setStatus] = useState<'checking' | 'ready' | 'error' | 'success'>('checking')
  const [sessionEmail, setSessionEmail] = useState<string | undefined>()
  const [formErrors, setFormErrors] = useState<FormErrors>({})
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordStrength, setPasswordStrength] = useState<PasswordStrength>({
    score: 0,
    feedback: [...PASSWORD_REQUIREMENTS],
    warning: 'Create a unique password to keep your account secure.',
  })
  const [submitting, setSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  useEffect(() => {
    let active = true

    const initialize = async () => {
      const result: RecoverySessionStatus = await preparePasswordRecoverySession()

      if (!active) return

      if (!result.isValid) {
        setStatus('error')
        setErrorMessage(result.error ?? 'We could not verify your reset link. Please request a new one.')
        return
      }

      setSessionEmail(result.email)
      setStatus('ready')
    }

    void initialize()

    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    setPasswordStrength(evaluatePasswordStrength(password))
  }, [password])

  const validateForm = () => {
    const errors: FormErrors = {}

    if (!isValidPassword(password)) {
      errors.password = `Use at least ${PASSWORD_MIN_LENGTH} characters, including uppercase, lowercase, and a number.`
    }

    if (password !== confirmPassword) {
      errors.confirmPassword = 'Passwords do not match.'
    }

    setFormErrors(errors)

    return Object.keys(errors).length === 0
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (status !== 'ready' || submitting) {
      return
    }

    if (!validateForm()) {
      return
    }

    setSubmitting(true)
    setErrorMessage(null)

    try {
      const result = await completePasswordReset(password)

      if (!result.success) {
        setErrorMessage(result.error ?? 'We were unable to update your password. Please try again.')
        return
      }

      if (result.email) {
        clearPasswordResetRateLimit(result.email)
      }

      setStatus('success')
      setTimeout(() => {
        router.push('/login')
      }, 4000)
    } finally {
      setSubmitting(false)
    }
  }

  if (status === 'checking') {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 bg-gray-200 rounded w-3/4 mx-auto" />
        <div className="h-32 bg-gray-200 rounded" />
      </div>
    )
  }

  if (status === 'error') {
    return (
      <div className="space-y-6">
        <Alert variant="error" title="Reset link issue">
          {errorMessage ?? 'Your reset link is invalid or expired. Please request a new email to continue.'}
        </Alert>
        <div className="text-center">
          <Link href="/forgot-password" className="font-medium text-primary-600 hover:text-primary-500">
            Request a new reset link
          </Link>
        </div>
      </div>
    )
  }

  if (status === 'success') {
    return (
      <div className="space-y-4 text-center">
        <Alert variant="success" title="Password updated">
          Your password has been reset. Redirecting you to the sign-in page...
        </Alert>
        <p className="text-sm text-gray-600">
          If you are not redirected automatically,{' '}
          <Link href="/login" className="font-medium text-primary-600 hover:text-primary-500">
            return to sign in
          </Link>
          .
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2 text-center">
        <h2 className="text-3xl font-bold tracking-tight text-gray-900">Choose a new password</h2>
        <p className="text-sm text-gray-600">
          {sessionEmail
            ? `Resetting password for ${sessionEmail}.`
            : 'Enter a strong password to secure your account.'}
        </p>
      </div>

      {errorMessage && (
        <Alert variant="error" title="Unable to update password">
          {errorMessage}
        </Alert>
      )}

      <form className="space-y-6" onSubmit={handleSubmit} noValidate>
        <div className="space-y-4">
          <Input
            type="password"
            label="New password"
            placeholder="Create a strong password"
            required
            value={password}
            onChange={(event) => {
              setPassword(event.target.value)
              if (formErrors.password) {
                setFormErrors((prev) => ({ ...prev, password: undefined }))
              }
            }}
            errorMessage={formErrors.password}
            helperText="Use at least 8 characters, including uppercase, lowercase, and numbers."
            showPassword
            autoFocus
          />

          <PasswordStrengthIndicator strength={passwordStrength} />

          {passwordStrength.feedback.length > 0 && (
            <ul className="text-xs text-neutral-600 space-y-1" aria-live="polite">
              {passwordStrength.feedback.map((requirement) => (
                <li key={requirement} className="flex items-center">
                  <span className="w-1.5 h-1.5 rounded-full bg-neutral-400 mr-2" aria-hidden="true" />
                  {requirement}
                </li>
              ))}
            </ul>
          )}

          <Input
            type="password"
            label="Confirm new password"
            placeholder="Re-enter your password"
            required
            value={confirmPassword}
            onChange={(event) => {
              setConfirmPassword(event.target.value)
              if (formErrors.confirmPassword) {
                setFormErrors((prev) => ({ ...prev, confirmPassword: undefined }))
              }
            }}
            errorMessage={formErrors.confirmPassword}
            showPassword
          />
        </div>

        <Button type="submit" className="w-full" loading={submitting} disabled={submitting}>
          {submitting ? 'Updating password...' : 'Update password'}
        </Button>
      </form>
    </div>
  )
}
