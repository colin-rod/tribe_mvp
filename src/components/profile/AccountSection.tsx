'use client'

import React, { useState, useEffect } from 'react'
import { User } from '@supabase/supabase-js'
import { EnvelopeIcon, ClockIcon, TrashIcon } from '@heroicons/react/24/outline'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { FormField } from '@/components/ui/FormField'
import { FormMessage } from '@/components/ui/FormMessage'
import { ConfirmationDialog } from '@/components/ui/ConfirmationDialog'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { cn } from '@/lib/utils'
import { createLogger } from '@/lib/logger'
import type { AccountFormData, FormState, FormValidationResult } from '@/lib/types/profile'

const logger = createLogger('AccountSection')

interface AccountSectionProps {
  user: User
}

const TIMEZONE_OPTIONS = [
  { value: 'America/New_York', label: 'Eastern Time (ET)' },
  { value: 'America/Chicago', label: 'Central Time (CT)' },
  { value: 'America/Denver', label: 'Mountain Time (MT)' },
  { value: 'America/Los_Angeles', label: 'Pacific Time (PT)' },
  { value: 'America/Phoenix', label: 'Arizona Time (MST)' },
  { value: 'Europe/London', label: 'London (GMT)' },
  { value: 'Europe/Paris', label: 'Paris (CET)' },
  { value: 'Europe/Berlin', label: 'Berlin (CET)' },
  { value: 'Asia/Tokyo', label: 'Tokyo (JST)' },
  { value: 'Asia/Shanghai', label: 'Shanghai (CST)' },
  { value: 'Australia/Sydney', label: 'Sydney (AEST)' },
  { value: 'Pacific/Auckland', label: 'Auckland (NZST)' }
]

export function AccountSection({ user }: AccountSectionProps) {
  const [formData, setFormData] = useState<AccountFormData>({
    email: user.email || '',
    timezone: user.user_metadata?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone,
    autoSave: user.user_metadata?.autoSave ?? true,
    emailDigest: user.user_metadata?.emailDigest ?? true
  })

  const [formState, setFormState] = useState<FormState>({
    loading: false,
    success: false,
    error: null
  })

  const [validation, setValidation] = useState<FormValidationResult>({
    isValid: true,
    errors: {}
  })

  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [deleteLoading, setDeleteLoading] = useState(false)

  // Validation
  useEffect(() => {
    const errors: Record<string, string> = {}

    if (!formData.email.trim()) {
      errors.email = 'Email is required'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = 'Please enter a valid email address'
    }

    if (!formData.timezone) {
      errors.timezone = 'Timezone is required'
    }

    setValidation({
      isValid: Object.keys(errors).length === 0,
      errors
    })
  }, [formData])

  const handleInputChange = (field: keyof AccountFormData, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    // Clear form state when user starts typing
    if (formState.success || formState.error) {
      setFormState(prev => ({ ...prev, success: false, error: null }))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validation.isValid) {
      return
    }

    setFormState({ loading: true, success: false, error: null })

    try {
      // TODO: Implement actual API call to update account settings
      await new Promise(resolve => setTimeout(resolve, 1000)) // Simulate API call

      setFormState({
        loading: false,
        success: true,
        error: null,
        lastSaved: new Date()
      })

      // Clear success message after 3 seconds
      setTimeout(() => {
        setFormState(prev => ({ ...prev, success: false }))
      }, 3000)
    } catch (error) {
      setFormState({
        loading: false,
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update account settings'
      })
    }
  }

  const handleDeleteAccount = async () => {
    setDeleteLoading(true)

    try {
      // TODO: Implement actual account deletion
      await new Promise(resolve => setTimeout(resolve, 2000)) // Simulate API call

      // This would typically redirect to a goodbye page or sign out
      logger.info('Account deletion would be processed here')
    } catch (error) {
      logger.error('Account deletion failed', { error })
      setFormState({
        loading: false,
        success: false,
        error: 'Failed to delete account. Please try again or contact support.'
      })
    } finally {
      setDeleteLoading(false)
      setShowDeleteDialog(false)
    }
  }

  const currentTime = new Date().toLocaleString('en-US', {
    timeZone: formData.timezone,
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZoneName: 'short'
  })

  return (
    <div className="p-6">
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-2">Account Settings</h2>
        <p className="text-sm text-gray-600">
          Manage your account information and preferences.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Email Section */}
        <div className="border border-gray-200 rounded-lg p-6">
          <div className="flex items-center mb-4">
            <EnvelopeIcon className="w-5 h-5 text-gray-400 mr-3" aria-hidden="true" />
            <div>
              <h3 className="text-base font-medium text-gray-900">Email Address</h3>
              <p className="text-sm text-gray-600">Your primary email for account access and notifications</p>
            </div>
          </div>

          <FormField
            label="Email Address"
            required
            error={validation.errors.email}
            description="We'll send a verification email if you change this"
          >
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => handleInputChange('email', e.target.value)}
              placeholder="Enter your email address"
              className={cn(validation.errors.email && 'border-red-500 focus-visible:ring-red-500')}
              autoComplete="email"
            />
          </FormField>

          {formData.email !== user.email && (
            <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
              <p className="text-sm text-yellow-800">
                Changing your email will require verification of the new address.
              </p>
            </div>
          )}
        </div>

        {/* Timezone Section */}
        <div className="border border-gray-200 rounded-lg p-6">
          <div className="flex items-center mb-4">
            <ClockIcon className="w-5 h-5 text-gray-400 mr-3" aria-hidden="true" />
            <div>
              <h3 className="text-base font-medium text-gray-900">Timezone</h3>
              <p className="text-sm text-gray-600">Used for displaying times and scheduling</p>
            </div>
          </div>

          <FormField
            label="Timezone"
            required
            error={validation.errors.timezone}
            description="All times in the app will be displayed in this timezone"
          >
            <select
              id="timezone"
              value={formData.timezone}
              onChange={(e) => handleInputChange('timezone', e.target.value)}
              className={cn(
                'flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm ring-offset-white',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-600 focus-visible:ring-offset-2',
                'disabled:cursor-not-allowed disabled:opacity-50',
                validation.errors.timezone && 'border-red-500 focus-visible:ring-red-500'
              )}
            >
              <option value="">Select your timezone</option>
              {TIMEZONE_OPTIONS.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </FormField>

          {formData.timezone && (
            <div className="mt-3 p-3 bg-gray-50 border border-gray-200 rounded-md">
              <p className="text-sm text-gray-600">
                Current time in selected timezone: <span className="font-medium">{currentTime}</span>
              </p>
            </div>
          )}
        </div>

        {/* Preferences Section */}
        <div className="border border-gray-200 rounded-lg p-6">
          <div className="mb-4">
            <h3 className="text-base font-medium text-gray-900">Preferences</h3>
            <p className="text-sm text-gray-600">Customize your app experience</p>
          </div>

          <div className="space-y-4">
            {/* Auto-save */}
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <label htmlFor="autoSave" className="text-sm font-medium text-gray-900">
                  Auto-save drafts
                </label>
                <p className="text-sm text-gray-600">
                  Automatically save your work as you type
                </p>
              </div>
              <button
                type="button"
                onClick={() => handleInputChange('autoSave', !formData.autoSave)}
                className={cn(
                  'relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out',
                  'focus:outline-none focus:ring-2 focus:ring-primary-600 focus:ring-offset-2',
                  formData.autoSave ? 'bg-primary-600' : 'bg-gray-200'
                )}
                role="switch"
                aria-checked={formData.autoSave}
                aria-labelledby="autoSave"
              >
                <span
                  className={cn(
                    'pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow transform ring-0 transition duration-200 ease-in-out',
                    formData.autoSave ? 'translate-x-5' : 'translate-x-0'
                  )}
                />
              </button>
            </div>

            {/* Email digest */}
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <label htmlFor="emailDigest" className="text-sm font-medium text-gray-900">
                  Weekly email digest
                </label>
                <p className="text-sm text-gray-600">
                  Receive a summary of your activity via email
                </p>
              </div>
              <button
                type="button"
                onClick={() => handleInputChange('emailDigest', !formData.emailDigest)}
                className={cn(
                  'relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out',
                  'focus:outline-none focus:ring-2 focus:ring-primary-600 focus:ring-offset-2',
                  formData.emailDigest ? 'bg-primary-600' : 'bg-gray-200'
                )}
                role="switch"
                aria-checked={formData.emailDigest}
                aria-labelledby="emailDigest"
              >
                <span
                  className={cn(
                    'pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow transform ring-0 transition duration-200 ease-in-out',
                    formData.emailDigest ? 'translate-x-5' : 'translate-x-0'
                  )}
                />
              </button>
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-end">
          <Button
            type="submit"
            disabled={!validation.isValid || formState.loading}
            className="min-w-[120px]"
          >
            {formState.loading ? (
              <>
                <LoadingSpinner size="sm" className="mr-2" />
                Saving...
              </>
            ) : (
              'Save Changes'
            )}
          </Button>
        </div>
      </form>

      {/* Danger Zone */}
      <div className="mt-12 border border-red-200 rounded-lg p-6 bg-red-50">
        <div className="flex items-center mb-4">
          <TrashIcon className="w-5 h-5 text-red-600 mr-3" aria-hidden="true" />
          <div>
            <h3 className="text-base font-medium text-red-900">Danger Zone</h3>
            <p className="text-sm text-red-700">Irreversible actions for your account</p>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <h4 className="text-sm font-medium text-red-900 mb-2">Delete Account</h4>
            <p className="text-sm text-red-700 mb-4">
              Permanently delete your account and all associated data. This action cannot be undone.
            </p>
            <Button
              variant="destructive"
              onClick={() => setShowDeleteDialog(true)}
              size="sm"
            >
              Delete Account
            </Button>
          </div>
        </div>
      </div>

      {/* Form Messages */}
      {formState.success && (
        <FormMessage
          type="success"
          message="Account settings updated successfully!"
          details={formState.lastSaved ? `Last saved at ${formState.lastSaved.toLocaleTimeString()}` : undefined}
          className="mt-6"
        />
      )}

      {formState.error && (
        <FormMessage
          type="error"
          message="Failed to update account settings"
          details={formState.error}
          className="mt-6"
        />
      )}

      {/* Delete Account Confirmation Dialog */}
      <ConfirmationDialog
        open={showDeleteDialog}
        onClose={() => setShowDeleteDialog(false)}
        onConfirm={handleDeleteAccount}
        title="Delete Account"
        description="Are you absolutely sure you want to delete your account? This will permanently remove all your data, including profiles, updates, and media. This action cannot be undone."
        confirmText="Delete Account"
        cancelText="Keep Account"
        variant="destructive"
        loading={deleteLoading}
      >
        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
          <p className="text-sm text-red-800 font-medium">
            This will permanently delete:
          </p>
          <ul className="mt-2 text-sm text-red-700 list-disc list-inside">
            <li>Your profile and account information</li>
            <li>All children profiles and updates</li>
            <li>Photos and media files</li>
            <li>Recipient lists and groups</li>
            <li>All sent updates and conversations</li>
          </ul>
        </div>
      </ConfirmationDialog>
    </div>
  )
}
