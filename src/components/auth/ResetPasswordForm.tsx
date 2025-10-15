'use client'

/**
 * Reset Password Form Component
 * CRO-262: Password Reset Flow
 *
 * Allows users to set a new password after clicking reset link from email
 */

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { FormField } from '@/components/ui/FormField'
import { Alert } from '@/components/ui/Alert'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { PasswordStrengthIndicator } from '@/components/ui/PasswordStrengthIndicator'
import { updatePassword } from '@/lib/auth/password-reset'
import {
  calculatePasswordStrength,
  validatePassword,
  validatePasswordMatch
} from '@/lib/validation/password'
import { cn } from '@/lib/utils'
import { KeyIcon, EyeIcon, EyeSlashIcon, CheckCircleIcon } from '@heroicons/react/24/outline'

interface ResetPasswordFormProps {
  className?: string
}

export function ResetPasswordForm({ className }: ResetPasswordFormProps) {
  const router = useRouter()
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [validationErrors, setValidationErrors] = useState<{
    newPassword?: string
    confirmPassword?: string
  }>({})

  const passwordStrength = calculatePasswordStrength(newPassword)

  // Validate form
  useEffect(() => {
    const errors: typeof validationErrors = {}

    if (newPassword) {
      const validation = validatePassword(newPassword)
      if (!validation.isValid) {
        errors.newPassword = validation.errors[0]
      } else if (passwordStrength.score < 2) {
        errors.newPassword = 'Password is too weak. Please choose a stronger password.'
      }
    }

    if (confirmPassword) {
      const matchValidation = validatePasswordMatch(newPassword, confirmPassword)
      if (!matchValidation.isValid) {
        errors.confirmPassword = matchValidation.error
      }
    }

    setValidationErrors(errors)
  }, [newPassword, confirmPassword, passwordStrength.score])

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewPassword(e.target.value)
    if (error) setError(null)
  }

  const handleConfirmPasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setConfirmPassword(e.target.value)
    if (error) setError(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Clear previous states
    setError(null)

    // Validate
    if (!newPassword) {
      setValidationErrors(prev => ({
        ...prev,
        newPassword: 'Password is required'
      }))
      return
    }

    if (!confirmPassword) {
      setValidationErrors(prev => ({
        ...prev,
        confirmPassword: 'Please confirm your password'
      }))
      return
    }

    if (Object.keys(validationErrors).length > 0) {
      return
    }

    setLoading(true)

    try {
      const result = await updatePassword(newPassword)

      if (!result.success) {
        setError(result.error || 'Failed to reset password')
      } else {
        setSuccess(true)

        // Redirect to login after 2 seconds
        setTimeout(() => {
          router.push('/login?reset=success')
        }, 2000)
      }
    } catch (err) {
      setError('An unexpected error occurred. Please try again.')
      // eslint-disable-next-line no-console
      console.error('Password update error:', err)
    } finally {
      setLoading(false)
    }
  }

  const isFormValid =
    newPassword &&
    confirmPassword &&
    Object.keys(validationErrors).length === 0 &&
    passwordStrength.score >= 2

  // Success state
  if (success) {
    return (
      <div className={cn('w-full max-w-md', className)}>
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
            <CheckCircleIcon className="w-10 h-10 text-green-600" aria-hidden="true" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Password reset successful!
          </h2>
          <p className="text-sm text-gray-600 mb-4">
            Your password has been updated. Redirecting you to sign in...
          </p>
          <LoadingSpinner size="md" className="mx-auto" />
        </div>
      </div>
    )
  }

  return (
    <div className={cn('w-full max-w-md', className)}>
      <div className="mb-6 text-center">
        <div className="inline-flex items-center justify-center w-12 h-12 bg-indigo-100 rounded-full mb-4">
          <KeyIcon className="w-6 h-6 text-indigo-600" aria-hidden="true" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Reset your password
        </h2>
        <p className="text-sm text-gray-600">
          Choose a new password for your account.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <FormField
          label="New password"
          required
          error={validationErrors.newPassword}
        >
          <div className="relative">
            <Input
              type={showNewPassword ? 'text' : 'password'}
              value={newPassword}
              onChange={handlePasswordChange}
              placeholder="Enter new password"
              disabled={loading}
              autoComplete="new-password"
              autoFocus
              className={cn(validationErrors.newPassword && 'border-red-500')}
              aria-invalid={!!validationErrors.newPassword}
              aria-describedby="new-password-strength"
            />
            <button
              type="button"
              onClick={() => setShowNewPassword(!showNewPassword)}
              className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 rounded"
              aria-label={showNewPassword ? 'Hide password' : 'Show password'}
            >
              {showNewPassword ? (
                <EyeSlashIcon className="w-5 h-5" aria-hidden="true" />
              ) : (
                <EyeIcon className="w-5 h-5" aria-hidden="true" />
              )}
            </button>
          </div>
          {newPassword && (
            <div id="new-password-strength">
              <PasswordStrengthIndicator strength={passwordStrength} />
            </div>
          )}
        </FormField>

        <FormField
          label="Confirm new password"
          required
          error={validationErrors.confirmPassword}
        >
          <div className="relative">
            <Input
              type={showConfirmPassword ? 'text' : 'password'}
              value={confirmPassword}
              onChange={handleConfirmPasswordChange}
              placeholder="Confirm new password"
              disabled={loading}
              autoComplete="new-password"
              className={cn(validationErrors.confirmPassword && 'border-red-500')}
              aria-invalid={!!validationErrors.confirmPassword}
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 rounded"
              aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
            >
              {showConfirmPassword ? (
                <EyeSlashIcon className="w-5 h-5" aria-hidden="true" />
              ) : (
                <EyeIcon className="w-5 h-5" aria-hidden="true" />
              )}
            </button>
          </div>
        </FormField>

        <Button
          type="submit"
          className="w-full"
          disabled={!isFormValid || loading}
        >
          {loading ? (
            <>
              <LoadingSpinner size="sm" className="mr-2" />
              Resetting password...
            </>
          ) : (
            'Reset password'
          )}
        </Button>
      </form>

      {/* Error Message */}
      {error && (
        <Alert
          variant="error"
          className="mt-4"
          title="Password reset failed"
        >
          {error}
        </Alert>
      )}

      {/* Password Requirements */}
      <div className="mt-6 p-4 bg-gray-50 rounded-lg">
        <p className="text-xs font-medium text-gray-900 mb-2">
          Password requirements:
        </p>
        <ul className="text-xs text-gray-600 space-y-1">
          <li className="flex items-start">
            <span className="mr-2">•</span>
            <span>At least 6 characters (8+ recommended)</span>
          </li>
          <li className="flex items-start">
            <span className="mr-2">•</span>
            <span>Mix of uppercase and lowercase letters</span>
          </li>
          <li className="flex items-start">
            <span className="mr-2">•</span>
            <span>At least one number</span>
          </li>
          <li className="flex items-start">
            <span className="mr-2">•</span>
            <span>Special characters recommended</span>
          </li>
        </ul>
      </div>
    </div>
  )
}
