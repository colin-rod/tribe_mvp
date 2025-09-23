'use client'

import React, { useState, useEffect } from 'react'
import { User } from '@supabase/supabase-js'
import { Button } from '@/components/ui/Button'
import { FormMessage } from '@/components/ui/FormMessage'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { cn } from '@/lib/utils'
import type { NotificationFormData, FormState } from '@/lib/types/profile'
import {
  BellIcon,
  EnvelopeIcon,
  DevicePhoneMobileIcon,
  ChatBubbleLeftRightIcon,
  ClockIcon,
  NewspaperIcon,
  MegaphoneIcon
} from '@heroicons/react/24/outline'

interface NotificationSectionProps {
  user: User
}

interface NotificationGroup {
  id: string
  title: string
  description: string
  icon: React.ComponentType<{ className?: string }>
  settings: {
    key: keyof NotificationFormData
    label: string
    description: string
    channels: ('email' | 'push' | 'sms')[]
  }[]
}

const NOTIFICATION_GROUPS: NotificationGroup[] = [
  {
    id: 'updates',
    title: 'Updates & Content',
    description: 'Notifications about new updates and content',
    icon: NewspaperIcon,
    settings: [
      {
        key: 'updateReminders',
        label: 'Update Reminders',
        description: 'Reminders to share new updates with your family',
        channels: ['email', 'push']
      }
    ]
  },
  {
    id: 'responses',
    title: 'Responses & Interactions',
    description: 'When family members respond to your updates',
    icon: ChatBubbleLeftRightIcon,
    settings: [
      {
        key: 'responseNotifications',
        label: 'New Responses',
        description: 'When someone responds to your updates',
        channels: ['email', 'push', 'sms']
      }
    ]
  },
  {
    id: 'digest',
    title: 'Digest & Summary',
    description: 'Periodic summaries of activity',
    icon: ClockIcon,
    settings: [
      {
        key: 'weeklyDigest',
        label: 'Weekly Digest',
        description: 'Summary of your week in updates and responses',
        channels: ['email']
      }
    ]
  },
  {
    id: 'marketing',
    title: 'Product Updates',
    description: 'News about Tribe features and updates',
    icon: MegaphoneIcon,
    settings: [
      {
        key: 'marketingEmails',
        label: 'Product News',
        description: 'New features, tips, and Tribe announcements',
        channels: ['email']
      }
    ]
  }
]

export function NotificationSection({ user }: NotificationSectionProps) {
  const [formData, setFormData] = useState<NotificationFormData>({
    emailNotifications: user.user_metadata?.emailNotifications ?? true,
    pushNotifications: user.user_metadata?.pushNotifications ?? true,
    smsNotifications: user.user_metadata?.smsNotifications ?? false,
    updateReminders: user.user_metadata?.updateReminders ?? true,
    responseNotifications: user.user_metadata?.responseNotifications ?? true,
    weeklyDigest: user.user_metadata?.weeklyDigest ?? true,
    marketingEmails: user.user_metadata?.marketingEmails ?? false
  })

  const [formState, setFormState] = useState<FormState>({
    loading: false,
    success: false,
    error: null
  })

  const [testNotificationSent, setTestNotificationSent] = useState(false)

  const handleToggle = (field: keyof NotificationFormData, value: boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    // Clear form state when user makes changes
    if (formState.success || formState.error) {
      setFormState(prev => ({ ...prev, success: false, error: null }))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    setFormState({ loading: true, success: false, error: null })

    try {
      // TODO: Implement actual API call to update notification preferences
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
        error: error instanceof Error ? error.message : 'Failed to update notification settings'
      })
    }
  }

  const handleTestNotification = async () => {
    try {
      // TODO: Implement test notification
      await new Promise(resolve => setTimeout(resolve, 500))
      setTestNotificationSent(true)
      setTimeout(() => setTestNotificationSent(false), 3000)
    } catch (error) {
      console.error('Failed to send test notification:', error)
    }
  }

  const ToggleSwitch = ({
    checked,
    onChange,
    disabled = false,
    'aria-labelledby': ariaLabelledBy
  }: {
    checked: boolean
    onChange: (checked: boolean) => void
    disabled?: boolean
    'aria-labelledby'?: string
  }) => (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      disabled={disabled}
      className={cn(
        'relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out',
        'focus:outline-none focus:ring-2 focus:ring-primary-600 focus:ring-offset-2',
        checked ? 'bg-primary-600' : 'bg-gray-200',
        disabled && 'opacity-50 cursor-not-allowed'
      )}
      role="switch"
      aria-checked={checked}
      aria-labelledby={ariaLabelledBy}
    >
      <span
        className={cn(
          'pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow transform ring-0 transition duration-200 ease-in-out',
          checked ? 'translate-x-5' : 'translate-x-0'
        )}
      />
    </button>
  )

  return (
    <div className="p-6">
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-2">Notification Preferences</h2>
        <p className="text-sm text-gray-600">
          Choose how and when you want to receive notifications.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Global Settings */}
        <div className="border border-gray-200 rounded-lg p-6">
          <div className="mb-6">
            <h3 className="text-base font-medium text-gray-900">Global Settings</h3>
            <p className="text-sm text-gray-600">Master controls for notification channels</p>
          </div>

          <div className="space-y-4">
            {/* Email Notifications */}
            <div className="flex items-center justify-between">
              <div className="flex items-center flex-1">
                <EnvelopeIcon className="w-5 h-5 text-gray-400 mr-3" aria-hidden="true" />
                <div>
                  <label htmlFor="emailNotifications" className="text-sm font-medium text-gray-900">
                    Email Notifications
                  </label>
                  <p className="text-sm text-gray-600">
                    Receive notifications via email
                  </p>
                </div>
              </div>
              <ToggleSwitch
                checked={formData.emailNotifications}
                onChange={(checked) => handleToggle('emailNotifications', checked)}
                aria-labelledby="emailNotifications"
              />
            </div>

            {/* Push Notifications */}
            <div className="flex items-center justify-between">
              <div className="flex items-center flex-1">
                <BellIcon className="w-5 h-5 text-gray-400 mr-3" aria-hidden="true" />
                <div>
                  <label htmlFor="pushNotifications" className="text-sm font-medium text-gray-900">
                    Push Notifications
                  </label>
                  <p className="text-sm text-gray-600">
                    Browser and mobile push notifications
                  </p>
                </div>
              </div>
              <ToggleSwitch
                checked={formData.pushNotifications}
                onChange={(checked) => handleToggle('pushNotifications', checked)}
                aria-labelledby="pushNotifications"
              />
            </div>

            {/* SMS Notifications */}
            <div className="flex items-center justify-between">
              <div className="flex items-center flex-1">
                <DevicePhoneMobileIcon className="w-5 h-5 text-gray-400 mr-3" aria-hidden="true" />
                <div>
                  <label htmlFor="smsNotifications" className="text-sm font-medium text-gray-900">
                    SMS Notifications
                  </label>
                  <p className="text-sm text-gray-600">
                    Text message notifications for urgent updates
                  </p>
                </div>
              </div>
              <ToggleSwitch
                checked={formData.smsNotifications}
                onChange={(checked) => handleToggle('smsNotifications', checked)}
                aria-labelledby="smsNotifications"
              />
            </div>
          </div>

          {/* Test Notification */}
          <div className="mt-6 pt-6 border-t border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-medium text-gray-900">Test Notification</h4>
                <p className="text-sm text-gray-600">Send a test notification to verify your settings</p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleTestNotification}
                disabled={!formData.emailNotifications && !formData.pushNotifications}
              >
                {testNotificationSent ? 'Test Sent!' : 'Send Test'}
              </Button>
            </div>
          </div>
        </div>

        {/* Specific Notification Types */}
        {NOTIFICATION_GROUPS.map((group) => {
          const Icon = group.icon

          return (
            <div key={group.id} className="border border-gray-200 rounded-lg p-6">
              <div className="flex items-center mb-4">
                <Icon className="w-5 h-5 text-gray-400 mr-3" aria-hidden="true" />
                <div>
                  <h3 className="text-base font-medium text-gray-900">{group.title}</h3>
                  <p className="text-sm text-gray-600">{group.description}</p>
                </div>
              </div>

              <div className="space-y-4">
                {group.settings.map((setting) => (
                  <div key={setting.key} className="flex items-center justify-between">
                    <div className="flex-1">
                      <label htmlFor={setting.key} className="text-sm font-medium text-gray-900">
                        {setting.label}
                      </label>
                      <p className="text-sm text-gray-600">{setting.description}</p>
                      <div className="flex items-center mt-1 space-x-3">
                        {setting.channels.map((channel) => {
                          const isChannelEnabled =
                            (channel === 'email' && formData.emailNotifications) ||
                            (channel === 'push' && formData.pushNotifications) ||
                            (channel === 'sms' && formData.smsNotifications)

                          return (
                            <span
                              key={channel}
                              className={cn(
                                'inline-flex items-center px-2 py-1 rounded-full text-xs font-medium',
                                isChannelEnabled
                                  ? 'bg-green-100 text-green-800'
                                  : 'bg-gray-100 text-gray-500'
                              )}
                            >
                              {channel.charAt(0).toUpperCase() + channel.slice(1)}
                            </span>
                          )
                        })}
                      </div>
                    </div>
                    <ToggleSwitch
                      checked={formData[setting.key] as boolean}
                      onChange={(checked) => handleToggle(setting.key, checked)}
                      disabled={
                        !setting.channels.some(channel =>
                          (channel === 'email' && formData.emailNotifications) ||
                          (channel === 'push' && formData.pushNotifications) ||
                          (channel === 'sms' && formData.smsNotifications)
                        )
                      }
                      aria-labelledby={setting.key}
                    />
                  </div>
                ))}
              </div>
            </div>
          )
        })}

        {/* Save Button */}
        <div className="flex justify-end">
          <Button
            type="submit"
            disabled={formState.loading}
            className="min-w-[120px]"
          >
            {formState.loading ? (
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

      {/* Form Messages */}
      {formState.success && (
        <FormMessage
          type="success"
          message="Notification preferences updated successfully!"
          details={formState.lastSaved ? `Last saved at ${formState.lastSaved.toLocaleTimeString()}` : undefined}
          className="mt-6"
        />
      )}

      {formState.error && (
        <FormMessage
          type="error"
          message="Failed to update notification preferences"
          details={formState.error}
          className="mt-6"
        />
      )}

      {testNotificationSent && (
        <FormMessage
          type="info"
          message="Test notification sent!"
          details="Check your enabled notification channels for the test message."
          className="mt-6"
        />
      )}
    </div>
  )
}