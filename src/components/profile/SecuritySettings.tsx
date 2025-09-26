'use client'

import { createLogger } from '@/lib/logger'

const logger = createLogger('SecuritySettings')
import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useProfileManager } from '@/hooks/useProfileManager'
import { securitySchema, calculatePasswordStrength, type SecurityFormData } from '@/lib/validation/profile'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { CheckIcon } from '@heroicons/react/24/outline'

interface SecuritySettingsProps {
  onSuccess?: () => void
}

export default function SecuritySettings({ onSuccess }: SecuritySettingsProps) {
  const { updateSecurity, loading, error } = useProfileManager()
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false
  })
  const [passwordStrength, setPasswordStrength] = useState({
    score: 0,
    label: 'No password',
    color: 'bg-gray-300'
  })

  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors, isValid, isDirty }
  } = useForm<SecurityFormData>({
    resolver: zodResolver(securitySchema),
    mode: 'onChange',
    defaultValues: {
      currentPassword: '',
      newPassword: '',
      confirmPassword: ''
    }
  })

  const newPassword = watch('newPassword')

  // Update password strength when new password changes
  useEffect(() => {
    const strength = calculatePasswordStrength(newPassword || '')
    setPasswordStrength(strength)
  }, [newPassword])

  const togglePasswordVisibility = (field: keyof typeof showPasswords) => {
    setShowPasswords(prev => ({
      ...prev,
      [field]: !prev[field]
    }))
  }

  const onSubmit = async (data: SecurityFormData) => {
    try {
      await updateSecurity(data)
      onSuccess?.()
      reset()
      setPasswordStrength({ score: 0, label: 'No password', color: 'bg-gray-300' })
    } catch (err) {
      // Error is already handled in the hook
      logger.error('Failed to update security:', { error: err })
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900">Security Settings</h3>
        <p className="mt-1 text-sm text-gray-600">
          Change your password and manage security preferences.
        </p>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-md">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Current Password */}
        <div>
          <label htmlFor="currentPassword" className="block text-sm font-medium text-gray-700 mb-2">
            Current Password *
          </label>
          <div className="relative">
            <Input
              {...register('currentPassword')}
              id="currentPassword"
              type={showPasswords.current ? 'text' : 'password'}
              disabled={loading}
              className={errors.currentPassword ? 'border-red-300 pr-12' : 'pr-12'}
              placeholder="Enter your current password"
            />
            <button
              type="button"
              onClick={() => togglePasswordVisibility('current')}
              disabled={loading}
              className="absolute inset-y-0 right-0 pr-3 flex items-center"
            >
              {showPasswords.current ? (
                <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
                </svg>
              ) : (
                <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              )}
            </button>
          </div>
          {errors.currentPassword && (
            <p className="mt-1 text-sm text-red-600">{errors.currentPassword.message}</p>
          )}
        </div>

        {/* New Password */}
        <div>
          <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700 mb-2">
            New Password *
          </label>
          <div className="relative">
            <Input
              {...register('newPassword')}
              id="newPassword"
              type={showPasswords.new ? 'text' : 'password'}
              disabled={loading}
              className={errors.newPassword ? 'border-red-300 pr-12' : 'pr-12'}
              placeholder="Enter your new password"
            />
            <button
              type="button"
              onClick={() => togglePasswordVisibility('new')}
              disabled={loading}
              className="absolute inset-y-0 right-0 pr-3 flex items-center"
            >
              {showPasswords.new ? (
                <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
                </svg>
              ) : (
                <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              )}
            </button>
          </div>

          {/* Password Strength Indicator */}
          {newPassword && (
            <div className="mt-3">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm text-gray-600">Password strength:</span>
                <span className="text-sm font-medium">{passwordStrength.label}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className={`h-2 rounded-full transition-all duration-300 ${passwordStrength.color}`}
                  style={{ width: `${(passwordStrength.score / 5) * 100}%` }}
                />
              </div>
            </div>
          )}

          {errors.newPassword && (
            <p className="mt-1 text-sm text-red-600">{errors.newPassword.message}</p>
          )}

          {/* Password Requirements */}
          <div className="mt-3">
            <p className="text-sm text-gray-600 mb-2">Password requirements:</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 text-xs text-gray-500">
              <div className="flex items-center">
                <CheckIcon
                  className={`mr-2 h-4 w-4 ${newPassword && newPassword.length >= 8 ? 'text-green-500' : 'text-gray-400'}`}
                  aria-hidden="true"
                />
                At least 8 characters
              </div>
              <div className="flex items-center">
                <CheckIcon
                  className={`mr-2 h-4 w-4 ${newPassword && /[a-z]/.test(newPassword) ? 'text-green-500' : 'text-gray-400'}`}
                  aria-hidden="true"
                />
                One lowercase letter
              </div>
              <div className="flex items-center">
                <CheckIcon
                  className={`mr-2 h-4 w-4 ${newPassword && /[A-Z]/.test(newPassword) ? 'text-green-500' : 'text-gray-400'}`}
                  aria-hidden="true"
                />
                One uppercase letter
              </div>
              <div className="flex items-center">
                <CheckIcon
                  className={`mr-2 h-4 w-4 ${newPassword && /[0-9]/.test(newPassword) ? 'text-green-500' : 'text-gray-400'}`}
                  aria-hidden="true"
                />
                One number
              </div>
              <div className="flex items-center sm:col-span-2">
                <CheckIcon
                  className={`mr-2 h-4 w-4 ${newPassword && /[^a-zA-Z0-9]/.test(newPassword) ? 'text-green-500' : 'text-gray-400'}`}
                  aria-hidden="true"
                />
                One special character
              </div>
            </div>
          </div>
        </div>

        {/* Confirm Password */}
        <div>
          <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">
            Confirm New Password *
          </label>
          <div className="relative">
            <Input
              {...register('confirmPassword')}
              id="confirmPassword"
              type={showPasswords.confirm ? 'text' : 'password'}
              disabled={loading}
              className={errors.confirmPassword ? 'border-red-300 pr-12' : 'pr-12'}
              placeholder="Confirm your new password"
            />
            <button
              type="button"
              onClick={() => togglePasswordVisibility('confirm')}
              disabled={loading}
              className="absolute inset-y-0 right-0 pr-3 flex items-center"
            >
              {showPasswords.confirm ? (
                <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
                </svg>
              ) : (
                <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              )}
            </button>
          </div>
          {errors.confirmPassword && (
            <p className="mt-1 text-sm text-red-600">{errors.confirmPassword.message}</p>
          )}
        </div>

        {/* Security Information */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h4 className="text-sm font-medium text-blue-800">Security Tips</h4>
              <div className="mt-1 text-sm text-blue-700">
                <ul className="list-disc list-inside space-y-1">
                  <li>Use a unique password that you don't use elsewhere</li>
                  <li>Consider using a password manager</li>
                  <li>You'll be logged out of all devices after changing your password</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Submit Button */}
        <div className="flex justify-end">
          <Button
            type="submit"
            disabled={loading || !isDirty || !isValid}
            className="min-w-[140px]"
          >
            {loading ? (
              <>
                <LoadingSpinner size="sm" className="mr-2" />
                Updating...
              </>
            ) : (
              'Change Password'
            )}
          </Button>
        </div>
      </form>
    </div>
  )
}
