'use client'

import React, { useState, useEffect } from 'react'
import { User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { FormField } from '@/components/ui/FormField'
import { FormMessage } from '@/components/ui/FormMessage'
import { PasswordStrengthIndicator } from '@/components/ui/PasswordStrengthIndicator'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { cn } from '@/lib/utils'
import type { SecurityFormData, FormState, FormValidationResult, PasswordStrength } from '@/lib/types/profile'
import { KeyIcon } from '@heroicons/react/24/outline'

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

export function SecuritySection({ user: _user }: SecuritySectionProps) {
  const [formData, setFormData] = useState<SecurityFormData>({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
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
      // Update password using Supabase Auth
      const { error } = await supabase.auth.updateUser({
        password: formData.newPassword
      })

      if (error) {
        throw new Error(error.message)
      }

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

  return (
    <div className="p-6">
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-2">Security Settings</h2>
        <p className="text-sm text-gray-600">Manage your password to keep your account secure.</p>
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

    </div>
  )
}
