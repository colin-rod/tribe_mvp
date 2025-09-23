'use client'

import React, { useState, useEffect } from 'react'
import { User } from '@supabase/supabase-js'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { FormField } from '@/components/ui/FormField'
import { FormMessage } from '@/components/ui/FormMessage'
import { PasswordStrengthIndicator } from '@/components/ui/PasswordStrengthIndicator'
import { ConfirmationDialog } from '@/components/ui/ConfirmationDialog'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { cn } from '@/lib/utils'
import type { SecurityFormData, FormState, FormValidationResult, PasswordStrength } from '@/lib/types/profile'
import { ShieldCheckIcon, KeyIcon, DevicePhoneMobileIcon } from '@heroicons/react/24/outline'

interface SecuritySectionProps {
  user: User
}

// Password strength calculation
const calculatePasswordStrength = (password: string): PasswordStrength => {
  if (!password) {
    return { score: 0, feedback: ['Enter a password'] }
  }

  let score = 0
  const feedback: string[] = []

  // Length check
  if (password.length >= 8) {
    score += 1
  } else {
    feedback.push('Use at least 8 characters')
  }

  // Character variety checks
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) {
    score += 1
  } else {
    feedback.push('Use both uppercase and lowercase letters')
  }

  if (/\d/.test(password)) {
    score += 1
  } else {
    feedback.push('Include at least one number')
  }

  if (/[^a-zA-Z0-9]/.test(password)) {
    score += 1
  } else {
    feedback.push('Include special characters (!@#$%^&*)')
  }

  // Additional strength checks
  if (password.length >= 12) {
    score = Math.min(score + 1, 4)
  }

  return {
    score: score as PasswordStrength['score'],
    feedback: feedback.length > 0 ? feedback : ['Strong password!']
  }
}

export function SecuritySection({ user }: SecuritySectionProps) {
  const [formData, setFormData] = useState<SecurityFormData>({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
    twoFactorEnabled: user.user_metadata?.twoFactorEnabled || false
  })

  const [formState, setFormState] = useState<FormState>({
    loading: false,
    success: false,
    error: null
  })

  const [validation, setValidation] = useState<FormValidationResult>({
    isValid: false,
    errors: {}
  })

  const [passwordStrength, setPasswordStrength] = useState<PasswordStrength>({
    score: 0,
    feedback: []
  })

  const [showPasswordFields, setShowPasswordFields] = useState(false)
  const [showTwoFactorDialog, setShowTwoFactorDialog] = useState(false)

  // Calculate password strength when new password changes
  useEffect(() => {
    if (formData.newPassword) {
      setPasswordStrength(calculatePasswordStrength(formData.newPassword))
    } else {
      setPasswordStrength({ score: 0, feedback: [] })
    }
  }, [formData.newPassword])

  // Validation
  useEffect(() => {
    const errors: Record<string, string> = {}

    if (showPasswordFields) {
      if (!formData.currentPassword) {
        errors.currentPassword = 'Current password is required'
      }

      if (!formData.newPassword) {
        errors.newPassword = 'New password is required'
      } else if (passwordStrength.score < 2) {
        errors.newPassword = 'Password is too weak'
      }

      if (!formData.confirmPassword) {
        errors.confirmPassword = 'Please confirm your new password'
      } else if (formData.newPassword !== formData.confirmPassword) {
        errors.confirmPassword = 'Passwords do not match'
      }

      if (formData.currentPassword && formData.newPassword && formData.currentPassword === formData.newPassword) {
        errors.newPassword = 'New password must be different from current password'
      }
    }

    setValidation({
      isValid: Object.keys(errors).length === 0,
      errors
    })
  }, [formData, showPasswordFields, passwordStrength.score])

  const handleInputChange = (field: keyof SecurityFormData, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    // Clear form state when user starts typing
    if (formState.success || formState.error) {
      setFormState(prev => ({ ...prev, success: false, error: null }))
    }
  }

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validation.isValid) {
      return
    }

    setFormState({ loading: true, success: false, error: null })

    try {
      // TODO: Implement actual password change API call
      await new Promise(resolve => setTimeout(resolve, 1500)) // Simulate API call

      setFormState({
        loading: false,
        success: true,
        error: null,
        lastSaved: new Date()
      })

      // Reset password fields
      setFormData(prev => ({
        ...prev,
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      }))
      setShowPasswordFields(false)

      // Clear success message after 3 seconds
      setTimeout(() => {
        setFormState(prev => ({ ...prev, success: false }))
      }, 3000)
    } catch (error) {
      setFormState({
        loading: false,
        success: false,
        error: error instanceof Error ? error.message : 'Failed to change password'
      })
    }
  }

  const handleTwoFactorToggle = () => {
    if (formData.twoFactorEnabled) {
      // Show confirmation dialog for disabling 2FA
      setShowTwoFactorDialog(true)
    } else {
      // Enable 2FA directly
      enableTwoFactor()
    }
  }

  const enableTwoFactor = async () => {
    setFormState({ loading: true, success: false, error: null })

    try {
      // TODO: Implement 2FA setup
      await new Promise(resolve => setTimeout(resolve, 1000))

      setFormData(prev => ({ ...prev, twoFactorEnabled: true }))
      setFormState({
        loading: false,
        success: true,
        error: null
      })

      setTimeout(() => {
        setFormState(prev => ({ ...prev, success: false }))
      }, 3000)
    } catch (error) {
      setFormState({
        loading: false,
        success: false,
        error: 'Failed to enable two-factor authentication'
      })
    }
  }

  const disableTwoFactor = async () => {
    setFormState({ loading: true, success: false, error: null })

    try {
      // TODO: Implement 2FA disable
      await new Promise(resolve => setTimeout(resolve, 1000))

      setFormData(prev => ({ ...prev, twoFactorEnabled: false }))
      setFormState({
        loading: false,
        success: true,
        error: null
      })

      setTimeout(() => {
        setFormState(prev => ({ ...prev, success: false }))
      }, 3000)
    } catch (error) {
      setFormState({
        loading: false,
        success: false,
        error: 'Failed to disable two-factor authentication'
      })
    }

    setShowTwoFactorDialog(false)
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-2">Security Settings</h2>
        <p className="text-sm text-gray-600">
          Manage your password and account security options.
        </p>
      </div>

      <div className="space-y-8">
        {/* Password Section */}
        <div className="border border-gray-200 rounded-lg p-6">
          <div className="flex items-center mb-4">
            <KeyIcon className="w-5 h-5 text-gray-400 mr-3" aria-hidden="true" />
            <div>
              <h3 className="text-base font-medium text-gray-900">Password</h3>
              <p className="text-sm text-gray-600">Change your account password</p>
            </div>
          </div>

          {!showPasswordFields ? (
            <Button
              variant="outline"
              onClick={() => setShowPasswordFields(true)}
            >
              Change Password
            </Button>
          ) : (
            <form onSubmit={handlePasswordSubmit} className="space-y-4">
              <FormField
                label="Current Password"
                required
                error={validation.errors.currentPassword}
              >
                <Input
                  type="password"
                  value={formData.currentPassword}
                  onChange={(e) => handleInputChange('currentPassword', e.target.value)}
                  placeholder="Enter your current password"
                  className={cn(validation.errors.currentPassword && 'border-red-500')}
                  autoComplete="current-password"
                />
              </FormField>

              <FormField
                label="New Password"
                required
                error={validation.errors.newPassword}
              >
                <Input
                  type="password"
                  value={formData.newPassword}
                  onChange={(e) => handleInputChange('newPassword', e.target.value)}
                  placeholder="Enter your new password"
                  className={cn(validation.errors.newPassword && 'border-red-500')}
                  autoComplete="new-password"
                />
                {formData.newPassword && (
                  <PasswordStrengthIndicator strength={passwordStrength} />
                )}
              </FormField>

              <FormField
                label="Confirm New Password"
                required
                error={validation.errors.confirmPassword}
              >
                <Input
                  type="password"
                  value={formData.confirmPassword}
                  onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                  placeholder="Confirm your new password"
                  className={cn(validation.errors.confirmPassword && 'border-red-500')}
                  autoComplete="new-password"
                />
              </FormField>

              <div className="flex gap-3 pt-2">
                <Button
                  type="submit"
                  disabled={!validation.isValid || formState.loading}
                  className="min-w-[120px]"
                >
                  {formState.loading ? (
                    <>
                      <LoadingSpinner size="sm" className="mr-2" />
                      Changing...
                    </>
                  ) : (
                    'Change Password'
                  )}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowPasswordFields(false)
                    setFormData(prev => ({
                      ...prev,
                      currentPassword: '',
                      newPassword: '',
                      confirmPassword: ''
                    }))
                  }}
                >
                  Cancel
                </Button>
              </div>
            </form>
          )}
        </div>

        {/* Two-Factor Authentication Section */}
        <div className="border border-gray-200 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <ShieldCheckIcon className="w-5 h-5 text-gray-400 mr-3" aria-hidden="true" />
              <div>
                <h3 className="text-base font-medium text-gray-900">Two-Factor Authentication</h3>
                <p className="text-sm text-gray-600">
                  Add an extra layer of security to your account
                </p>
              </div>
            </div>
            <div className="flex items-center">
              <button
                type="button"
                onClick={handleTwoFactorToggle}
                disabled={formState.loading}
                className={cn(
                  'relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out',
                  'focus:outline-none focus:ring-2 focus:ring-primary-600 focus:ring-offset-2',
                  formData.twoFactorEnabled ? 'bg-primary-600' : 'bg-gray-200',
                  formState.loading && 'opacity-50 cursor-not-allowed'
                )}
                role="switch"
                aria-checked={formData.twoFactorEnabled}
                aria-label="Toggle two-factor authentication"
              >
                <span
                  className={cn(
                    'pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow transform ring-0 transition duration-200 ease-in-out',
                    formData.twoFactorEnabled ? 'translate-x-5' : 'translate-x-0'
                  )}
                />
              </button>
            </div>
          </div>

          {formData.twoFactorEnabled && (
            <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-md">
              <div className="flex items-center">
                <ShieldCheckIcon className="w-4 h-4 text-green-400 mr-2" aria-hidden="true" />
                <p className="text-sm text-green-800">
                  Two-factor authentication is enabled. Your account is more secure.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Login Sessions Section */}
        <div className="border border-gray-200 rounded-lg p-6">
          <div className="flex items-center mb-4">
            <DevicePhoneMobileIcon className="w-5 h-5 text-gray-400 mr-3" aria-hidden="true" />
            <div>
              <h3 className="text-base font-medium text-gray-900">Active Sessions</h3>
              <p className="text-sm text-gray-600">Manage devices that have access to your account</p>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-md">
              <div>
                <p className="text-sm font-medium text-gray-900">Current Session</p>
                <p className="text-xs text-gray-500">
                  {navigator.userAgent.includes('Chrome') ? 'Chrome' : 'Browser'} •
                  {' '}Last active now
                </p>
              </div>
              <span className="px-2 py-1 text-xs font-medium text-green-700 bg-green-100 rounded-full">
                Current
              </span>
            </div>
          </div>

          <Button variant="outline" className="mt-4" size="sm">
            View All Sessions
          </Button>
        </div>
      </div>

      {/* Form Messages */}
      {formState.success && (
        <FormMessage
          type="success"
          message="Security settings updated successfully!"
          details={formState.lastSaved ? `Last updated at ${formState.lastSaved.toLocaleTimeString()}` : undefined}
          className="mt-6"
        />
      )}

      {formState.error && (
        <FormMessage
          type="error"
          message="Security update failed"
          details={formState.error}
          className="mt-6"
        />
      )}

      {/* Two-Factor Disable Confirmation Dialog */}
      <ConfirmationDialog
        open={showTwoFactorDialog}
        onClose={() => setShowTwoFactorDialog(false)}
        onConfirm={disableTwoFactor}
        title="Disable Two-Factor Authentication"
        description="Are you sure you want to disable two-factor authentication? This will make your account less secure."
        confirmText="Disable 2FA"
        cancelText="Keep 2FA"
        variant="destructive"
        loading={formState.loading}
      />
    </div>
  )
}