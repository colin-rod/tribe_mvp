'use client'

import { createLogger } from '@/lib/logger'

const logger = createLogger('NotificationSettings')
import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useProfileManager } from '@/hooks/useProfileManager'
import { notificationPreferencesSchema, type NotificationPreferencesData } from '@/lib/validation/profile'
import type { NotificationPreferences } from '@/lib/types/profile'
import { Button } from '@/components/ui/Button'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'

interface NotificationSettingsProps {
  onSuccess?: () => void
}

export default function NotificationSettings({ onSuccess }: NotificationSettingsProps) {
  const { profile, updateNotificationPreferences, loading, error, refreshProfile, getNotificationPreferences, convertToFormData } = useProfileManager()

  const {
    register,
    handleSubmit,
    reset,
    formState: { isDirty }
  } = useForm<NotificationPreferencesData>({
    resolver: zodResolver(notificationPreferencesSchema),
    defaultValues: {
      emailNotifications: true,
      pushNotifications: false,
      responseNotifications: true,
      weeklyDigest: true,
      marketingEmails: false
    }
  })

  // Load profile data when component mounts
  useEffect(() => {
    if (!profile) {
      refreshProfile()
    }
  }, [profile, refreshProfile])

  // Set form values when profile loads
  useEffect(() => {
    const preferences = getNotificationPreferences()
    if (preferences) {
      const formData = convertToFormData(preferences)
      reset(formData)
    }
  }, [profile, reset, getNotificationPreferences, convertToFormData])

  const onSubmit = async (data: NotificationPreferencesData) => {
    try {
      await updateNotificationPreferences(data)
      onSuccess?.()
      reset(data)
    } catch (err) {
      // Error is already handled in the hook
      logger.error('Failed to update notification preferences:', { error: err })
    }
  }

  if (!profile) {
    return (
      <div className="flex items-center justify-center py-8">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900">Notification Preferences</h3>
        <p className="mt-1 text-sm text-gray-600">
          Choose how you want to be notified about activity in your account.
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
        <div className="space-y-4">
          {/* Email Notifications */}
          <div className="flex items-start">
            <div className="flex items-center h-5">
              <input
                {...register('emailNotifications')}
                id="emailNotifications"
                type="checkbox"
                disabled={loading}
                className="h-4 w-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
              />
            </div>
            <div className="ml-3">
              <label htmlFor="emailNotifications" className="text-sm font-medium text-gray-700">
                Email Notifications
              </label>
              <p className="text-sm text-gray-500">
                Receive email notifications for important account activity.
              </p>
            </div>
          </div>

          {/* Push Notifications */}
          <div className="flex items-start">
            <div className="flex items-center h-5">
              <input
                {...register('pushNotifications')}
                id="pushNotifications"
                type="checkbox"
                disabled={loading}
                className="h-4 w-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
              />
            </div>
            <div className="ml-3">
              <label htmlFor="pushNotifications" className="text-sm font-medium text-gray-700">
                Push Notifications
              </label>
              <p className="text-sm text-gray-500">
                Receive push notifications on your devices (coming soon).
              </p>
            </div>
          </div>

          {/* Response Notifications */}
          <div className="flex items-start">
            <div className="flex items-center h-5">
              <input
                {...register('responseNotifications')}
                id="responseNotifications"
                type="checkbox"
                disabled={loading}
                className="h-4 w-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
              />
            </div>
            <div className="ml-3">
              <label htmlFor="responseNotifications" className="text-sm font-medium text-gray-700">
                Response Notifications
              </label>
              <p className="text-sm text-gray-500">
                Get notified when recipients respond to your updates.
              </p>
            </div>
          </div>

          {/* Weekly Digest */}
          <div className="flex items-start">
            <div className="flex items-center h-5">
              <input
                {...register('weeklyDigest')}
                id="weeklyDigest"
                type="checkbox"
                disabled={loading}
                className="h-4 w-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
              />
            </div>
            <div className="ml-3">
              <label htmlFor="weeklyDigest" className="text-sm font-medium text-gray-700">
                Weekly Digest
              </label>
              <p className="text-sm text-gray-500">
                Receive a weekly summary of your activity and responses.
              </p>
            </div>
          </div>

          {/* Marketing Emails */}
          <div className="flex items-start">
            <div className="flex items-center h-5">
              <input
                {...register('marketingEmails')}
                id="marketingEmails"
                type="checkbox"
                disabled={loading}
                className="h-4 w-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
              />
            </div>
            <div className="ml-3">
              <label htmlFor="marketingEmails" className="text-sm font-medium text-gray-700">
                Marketing Emails
              </label>
              <p className="text-sm text-gray-500">
                Receive emails about new features, tips, and product updates.
              </p>
            </div>
          </div>
        </div>

        {/* Information */}
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h4 className="text-sm font-medium text-gray-900">About Notifications</h4>
              <div className="mt-1 text-sm text-gray-600">
                <p>
                  We'll only send you notifications that are relevant to your account activity.
                  You can change these preferences at any time. Some security notifications
                  cannot be disabled.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Submit Button */}
        <div className="flex justify-end">
          <Button
            type="submit"
            disabled={loading || !isDirty}
            className="min-w-[140px]"
          >
            {loading ? (
              <>
                <LoadingSpinner size="sm" className="mr-2" />
                Saving...
              </>
            ) : (
              'Save Preferences'
            )}
          </Button>
        </div>
      </form>
    </div>
  )
}