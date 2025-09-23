'use client'

import { createLogger } from '@/lib/logger'

  const logger = createLogger('NotificationSection')
import React, { useState, useEffect } from 'react'
import { User } from '@supabase/supabase-js'
import { Button } from '@/components/ui/Button'
import { FormMessage } from '@/components/ui/FormMessage'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { cn } from '@/lib/utils'
import { useNotificationManager } from '@/hooks/useNotificationManager'
import QuietHoursConfig from './QuietHoursConfig'
import DigestSettings from './DigestSettings'
import NotificationTesting from './NotificationTesting'
import type { NotificationPreferences, DigestPreferences } from '@/lib/types/profile'
import {
  BellIcon,
  EnvelopeIcon,
  DevicePhoneMobileIcon,
  ChatBubbleLeftRightIcon,
  ClockIcon,
  NewspaperIcon,
  MegaphoneIcon,
  Cog6ToothIcon,
  ShieldCheckIcon,
  CalendarIcon,
  PlayIcon,
  StopIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline'

interface NotificationSectionProps {
  user: User
}

interface TabInfo {
  id: string
  label: string
  description: string
  icon: React.ComponentType<{ className?: string }>
}

type NotificationTab = 'preferences' | 'testing'

const NOTIFICATION_TABS: TabInfo[] = [
  {
    id: 'preferences',
    label: 'Preferences',
    description: 'Configure notification settings and timing',
    icon: Cog6ToothIcon
  },
  {
    id: 'testing',
    label: 'Testing & Preview',
    description: 'Test notifications and view analytics',
    icon: PlayIcon
  }
]

type PreferenceTab = 'general' | 'quiet-hours' | 'digests' | 'advanced'

const PREFERENCE_TABS: TabInfo[] = [
  {
    id: 'general',
    label: 'General',
    description: 'Basic notification settings and channels',
    icon: BellIcon
  },
  {
    id: 'quiet-hours',
    label: 'Quiet Hours',
    description: 'Set times when you don\'t want notifications',
    icon: ClockIcon
  },
  {
    id: 'digests',
    label: 'Digests',
    description: 'Configure email digest preferences',
    icon: NewspaperIcon
  },
  {
    id: 'advanced',
    label: 'Advanced',
    description: 'Fine-tune notification timing and behavior',
    icon: Cog6ToothIcon
  }
]

interface NotificationHistory {
  id: string
  type: string
  title: string
  timestamp: Date
  status: 'sent' | 'failed' | 'pending'
}

interface BrowserPermissionStatus {
  permission: NotificationPermission
  supported: boolean
}

const RESPONSE_TIMING_OPTIONS = [
  { value: 'immediate', label: 'Immediate', description: 'Get notified right away' },
  { value: 'hourly', label: 'Hourly', description: 'Bundle notifications every hour' },
  { value: 'daily_digest', label: 'Daily Digest', description: 'Include in daily digest only' },
  { value: 'off', label: 'Off', description: 'No response notifications' }
] as const

const PROMPT_FREQUENCY_OPTIONS = [
  { value: 'daily', label: 'Daily', description: 'Get AI prompts every day' },
  { value: 'every_3_days', label: 'Every 3 Days', description: 'Get prompts twice a week' },
  { value: 'weekly', label: 'Weekly', description: 'Get prompts once a week' },
  { value: 'off', label: 'Off', description: 'No AI prompts' }
] as const

const PROMPT_TYPES = [
  { id: 'milestone', label: 'Milestones', description: 'Age-based developmental milestones' },
  { id: 'activity', label: 'Activities', description: 'Fun activities to try with your child' },
  { id: 'fun', label: 'Fun Facts', description: 'Interesting facts about child development' },
  { id: 'photos', label: 'Photo Ideas', description: 'Creative photo suggestions' }
]

export function NotificationSection({ user }: NotificationSectionProps) {
  const {
    preferences,
    loading,
    saving,
    error,
    updatePreferences,
    sendTestNotification,
    isInQuietHours,
    getNextNotificationTime
  } = useNotificationManager()

  const [activeTab, setActiveTab] = useState<NotificationTab>('preferences')
  const [activePreferenceTab, setActivePreferenceTab] = useState<PreferenceTab>('general')
  const [testNotificationSent, setTestNotificationSent] = useState(false)
  const [notificationHistory, setNotificationHistory] = useState<NotificationHistory[]>([])
  const [browserPermission, setBrowserPermission] = useState<BrowserPermissionStatus>({
    permission: 'default',
    supported: false
  })

  // Check browser notification support and permission
  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setBrowserPermission({
        permission: Notification.permission,
        supported: true
      })
    }
  }, [])

  const handlePreferenceUpdate = async (updates: Partial<NotificationPreferences>) => {
    const success = await updatePreferences(updates)
    if (success) {
      // Add to notification history for testing
      setNotificationHistory(prev => [{
        id: Date.now().toString(),
        type: 'preference_update',
        title: 'Notification preferences updated',
        timestamp: new Date(),
        status: 'sent'
      }, ...prev.slice(0, 4)]) // Keep last 5 entries
    }
  }

  const handleBrowserPermissionRequest = async () => {
    if (!browserPermission.supported) return

    try {
      const permission = await Notification.requestPermission()
      setBrowserPermission(prev => ({ ...prev, permission }))

      if (permission === 'granted') {
        await handlePreferenceUpdate({ browser_notifications: true })
      }
    } catch (err) {
      logger.error('Failed to request notification permission:', { error: err })
    }
  }

  const handleTestNotification = async (type: 'browser' | 'email' = 'browser') => {
    const success = await sendTestNotification(type)
    if (success) {
      setTestNotificationSent(true)
      setNotificationHistory(prev => [{
        id: Date.now().toString(),
        type: 'test',
        title: `Test ${type} notification sent`,
        timestamp: new Date(),
        status: 'sent'
      }, ...prev.slice(0, 4)])

      setTimeout(() => setTestNotificationSent(false), 3000)
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

  const TabButton = ({ tab, isActive, onClick }: {
    tab: TabInfo
    isActive: boolean
    onClick: () => void
  }) => {
    const Icon = tab.icon
    return (
      <button
        type="button"
        onClick={onClick}
        className={cn(
          'flex-1 flex items-center justify-center px-4 py-3 text-sm font-medium rounded-lg transition-colors',
          isActive
            ? 'bg-primary-100 text-primary-700 border border-primary-200'
            : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50 border border-transparent'
        )}
      >
        <Icon className="w-4 h-4 mr-2" />
        {tab.label}
      </button>
    )
  }

  if (loading && !preferences) {
    return (
      <div className="flex items-center justify-center py-12">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  if (!preferences) {
    return (
      <div className="p-6">
        <FormMessage
          type="error"
          message="Failed to load notification preferences"
          details={error || 'Please try refreshing the page'}
        />
      </div>
    )
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-2">Notification Management</h2>
        <p className="text-sm text-gray-600">
          Comprehensive control over your notification experience across all channels and timing.
        </p>
      </div>

      {/* Tab Navigation */}
      <div className="mb-8">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
          {NOTIFICATION_TABS.map((tab) => (
            <TabButton
              key={tab.id}
              tab={tab}
              isActive={activeTab === tab.id}
              onClick={() => setActiveTab(tab.id as NotificationTab)}
            />
          ))}
        </div>
        <div className="mt-2">
          <p className="text-xs text-gray-500">
            {NOTIFICATION_TABS.find(tab => tab.id === activeTab)?.description}
          </p>
        </div>
      </div>

      <div className="space-y-8">
        {/* Tab Content */}
        {activeTab === 'preferences' && (
          <div className="space-y-6">
            {/* Global Channel Settings */}
            <div className="border border-gray-200 rounded-lg p-6">
              <div className="mb-6">
                <h3 className="text-base font-medium text-gray-900">Notification Channels</h3>
                <p className="text-sm text-gray-600">Master controls for how you receive notifications</p>
              </div>

              <div className="space-y-4">
                {/* Email Notifications */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center flex-1">
                    <EnvelopeIcon className="w-5 h-5 text-gray-400 mr-3" aria-hidden="true" />
                    <div>
                      <label className="text-sm font-medium text-gray-900">
                        Email Notifications
                      </label>
                      <p className="text-sm text-gray-600">
                        Receive notifications via email
                      </p>
                    </div>
                  </div>
                  <ToggleSwitch
                    checked={preferences.email_notifications}
                    onChange={(checked) => handlePreferenceUpdate({ email_notifications: checked })}
                    disabled={saving}
                  />
                </div>

                {/* Browser Notifications */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center flex-1">
                    <BellIcon className="w-5 h-5 text-gray-400 mr-3" aria-hidden="true" />
                    <div>
                      <label className="text-sm font-medium text-gray-900">
                        Browser Notifications
                      </label>
                      <p className="text-sm text-gray-600">
                        Push notifications in your browser
                        {browserPermission.permission === 'denied' && (
                          <span className="text-red-600 ml-1">(Permission denied)</span>
                        )}
                        {!browserPermission.supported && (
                          <span className="text-gray-500 ml-1">(Not supported)</span>
                        )}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    {browserPermission.permission === 'default' && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleBrowserPermissionRequest}
                        disabled={saving || !browserPermission.supported}
                      >
                        Enable
                      </Button>
                    )}
                    <ToggleSwitch
                      checked={preferences.browser_notifications && browserPermission.permission === 'granted'}
                      onChange={(checked) => {
                        if (checked && browserPermission.permission !== 'granted') {
                          handleBrowserPermissionRequest()
                        } else {
                          handlePreferenceUpdate({ browser_notifications: checked })
                        }
                      }}
                      disabled={saving || browserPermission.permission === 'denied' || !browserPermission.supported}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Quiet Hours Status */}
            {preferences.quiet_hours && (
              <div className={cn(
                'border rounded-lg p-4',
                isInQuietHours()
                  ? 'border-purple-200 bg-purple-50'
                  : 'border-blue-200 bg-blue-50'
              )}>
                <div className="flex items-start">
                  <div className="flex-shrink-0">
                    {isInQuietHours() ? (
                      <StopIcon className="w-5 h-5 text-purple-600" />
                    ) : (
                      <ClockIcon className="w-5 h-5 text-blue-600" />
                    )}
                  </div>
                  <div className="ml-3">
                    <h4 className={cn(
                      'text-sm font-medium',
                      isInQuietHours() ? 'text-purple-900' : 'text-blue-900'
                    )}>
                      {isInQuietHours() ? 'Quiet Hours Active' : 'Quiet Hours Configured'}
                    </h4>
                    <p className={cn(
                      'text-sm mt-1',
                      isInQuietHours() ? 'text-purple-700' : 'text-blue-700'
                    )}>
                      {isInQuietHours()
                        ? `Notifications paused until ${getNextNotificationTime()?.toLocaleTimeString()}`
                        : `Next quiet period: ${preferences.quiet_hours.start} - ${preferences.quiet_hours.end}`
                      }
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Test Notifications */}
            <div className="border border-gray-200 rounded-lg p-6">
              <div className="mb-4">
                <h3 className="text-base font-medium text-gray-900">Test Notifications</h3>
                <p className="text-sm text-gray-600">Send test notifications to verify your settings</p>
              </div>

              <div className="flex flex-wrap gap-3">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleTestNotification('browser')}
                  disabled={!preferences.browser_notifications || browserPermission.permission !== 'granted' || saving}
                >
                  <BellIcon className="w-4 h-4 mr-2" />
                  Test Browser
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleTestNotification('email')}
                  disabled={!preferences.email_notifications || saving}
                >
                  <EnvelopeIcon className="w-4 h-4 mr-2" />
                  Test Email
                </Button>
              </div>

              {notificationHistory.length > 0 && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <h4 className="text-sm font-medium text-gray-900 mb-2">Recent Activity</h4>
                  <div className="space-y-2">
                    {notificationHistory.map((item) => (
                      <div key={item.id} className="flex items-center text-sm">
                        <div className="flex-shrink-0 mr-2">
                          {item.status === 'sent' ? (
                            <CheckCircleIcon className="w-4 h-4 text-green-500" />
                          ) : item.status === 'failed' ? (
                            <ExclamationTriangleIcon className="w-4 h-4 text-red-500" />
                          ) : (
                            <ClockIcon className="w-4 h-4 text-yellow-500" />
                          )}
                        </div>
                        <span className="text-gray-900">{item.title}</span>
                        <span className="text-gray-500 ml-auto">
                          {item.timestamp.toLocaleTimeString()}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Testing Tab */}
        {activeTab === 'testing' && (
          <NotificationTesting />
        )}
      </div>

      {/* Expandable sections for preferences */}
      {activeTab === 'preferences' && (
        <div className="space-y-6">
          {/* Quiet Hours Section */}
          <QuietHoursConfig onSuccess={() => {}} />

          {/* Digests Section */}
          <DigestSettings
            digestPrefs={{
              enabled: preferences.weekly_digest,
              frequency: 'weekly',
              delivery_day: preferences.weekly_digest_day,
              delivery_time: preferences.digest_email_time,
              content_types: [],
              include_metrics: true,
              include_responses: true,
              include_prompts: true
            }}
            onUpdate={async (digestPrefs: DigestPreferences) => {
              await handlePreferenceUpdate({
                weekly_digest: digestPrefs.enabled,
                weekly_digest_day: digestPrefs.delivery_day || 'sunday',
                digest_email_time: digestPrefs.delivery_time
              })
            }}
            loading={saving}
          />

          {/* Advanced Settings */}
          <div className="space-y-6">
            {/* Response Notifications */}
            <div className="border border-gray-200 rounded-lg p-6">
              <div className="mb-6">
                <h3 className="text-base font-medium text-gray-900">Response Notifications</h3>
                <p className="text-sm text-gray-600">Control when you receive notifications about family responses</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {RESPONSE_TIMING_OPTIONS.map((option) => (
                  <div
                    key={option.value}
                    className={cn(
                      'relative rounded-lg border p-4 cursor-pointer transition-colors',
                      preferences.response_notifications === option.value
                        ? 'border-primary-600 bg-primary-50'
                        : 'border-gray-300 hover:border-gray-400'
                    )}
                    onClick={() => handlePreferenceUpdate({ response_notifications: option.value })}
                  >
                    <div className="flex items-center">
                      <input
                        type="radio"
                        name="response_timing"
                        value={option.value}
                        checked={preferences.response_notifications === option.value}
                        onChange={() => handlePreferenceUpdate({ response_notifications: option.value })}
                        disabled={saving}
                        className="h-4 w-4 text-primary-600 border-gray-300 focus:ring-primary-500"
                      />
                      <div className="ml-3">
                        <label className="text-sm font-medium text-gray-900 cursor-pointer">
                          {option.label}
                        </label>
                        <p className="text-xs text-gray-600">{option.description}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* AI Prompt Frequency */}
            <div className="border border-gray-200 rounded-lg p-6">
              <div className="mb-6">
                <h3 className="text-base font-medium text-gray-900">AI Prompt Frequency</h3>
                <p className="text-sm text-gray-600">How often you'd like to receive AI-generated prompts and suggestions</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {PROMPT_FREQUENCY_OPTIONS.map((option) => (
                  <div
                    key={option.value}
                    className={cn(
                      'relative rounded-lg border p-4 cursor-pointer transition-colors',
                      preferences.prompt_frequency === option.value
                        ? 'border-primary-600 bg-primary-50'
                        : 'border-gray-300 hover:border-gray-400'
                    )}
                    onClick={() => handlePreferenceUpdate({ prompt_frequency: option.value })}
                  >
                    <div className="flex items-center">
                      <input
                        type="radio"
                        name="prompt_frequency"
                        value={option.value}
                        checked={preferences.prompt_frequency === option.value}
                        onChange={() => handlePreferenceUpdate({ prompt_frequency: option.value })}
                        disabled={saving}
                        className="h-4 w-4 text-primary-600 border-gray-300 focus:ring-primary-500"
                      />
                      <div className="ml-3">
                        <label className="text-sm font-medium text-gray-900 cursor-pointer">
                          {option.label}
                        </label>
                        <p className="text-xs text-gray-600">{option.description}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Prompt Types */}
            {preferences.prompt_frequency !== 'off' && (
              <div className="border border-gray-200 rounded-lg p-6">
                <div className="mb-6">
                  <h3 className="text-base font-medium text-gray-900">Prompt Types</h3>
                  <p className="text-sm text-gray-600">Choose what types of AI prompts you'd like to receive</p>
                </div>

                <div className="space-y-4">
                  {PROMPT_TYPES.map((promptType) => (
                    <div key={promptType.id} className="flex items-start">
                      <div className="flex items-center h-5">
                        <input
                          id={promptType.id}
                          type="checkbox"
                          checked={preferences.enabled_prompt_types.includes(promptType.id)}
                          onChange={(e) => {
                            const updatedTypes = e.target.checked
                              ? [...preferences.enabled_prompt_types, promptType.id]
                              : preferences.enabled_prompt_types.filter(type => type !== promptType.id)
                            handlePreferenceUpdate({ enabled_prompt_types: updatedTypes })
                          }}
                          disabled={saving}
                          className="h-4 w-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                        />
                      </div>
                      <div className="ml-3">
                        <label htmlFor={promptType.id} className="text-sm font-medium text-gray-700">
                          {promptType.label}
                        </label>
                        <p className="text-sm text-gray-500">{promptType.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* System Notifications */}
            <div className="border border-gray-200 rounded-lg p-6">
              <div className="mb-6">
                <h3 className="text-base font-medium text-gray-900">System Notifications</h3>
                <p className="text-sm text-gray-600">Notifications about platform updates and important announcements</p>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center flex-1">
                    <ShieldCheckIcon className="w-5 h-5 text-gray-400 mr-3" aria-hidden="true" />
                    <div>
                      <label className="text-sm font-medium text-gray-900">
                        System Notifications
                      </label>
                      <p className="text-sm text-gray-600">
                        Important updates about your account and the platform
                      </p>
                    </div>
                  </div>
                  <ToggleSwitch
                    checked={preferences.system_notifications}
                    onChange={(checked) => handlePreferenceUpdate({ system_notifications: checked })}
                    disabled={saving}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center flex-1">
                    <CalendarIcon className="w-5 h-5 text-gray-400 mr-3" aria-hidden="true" />
                    <div>
                      <label className="text-sm font-medium text-gray-900">
                        Delivery Confirmations
                      </label>
                      <p className="text-sm text-gray-600">
                        Confirmations when your updates are successfully sent to family
                      </p>
                    </div>
                  </div>
                  <ToggleSwitch
                    checked={preferences.delivery_notifications}
                    onChange={(checked) => handlePreferenceUpdate({ delivery_notifications: checked })}
                    disabled={saving}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Testing Tab */}
      {activeTab === 'testing' && (
        <NotificationTesting />
      )}

      {/* Global Messages */}
      {error && (
        <FormMessage
          type="error"
          message="Failed to update notification preferences"
          details={error}
          className="mt-6"
        />
      )}

      {testNotificationSent && (
        <FormMessage
          type="success"
          message="Test notification sent!"
          details="Check your enabled notification channels for the test message."
          className="mt-6"
        />
      )}

      {saving && (
        <div className="fixed bottom-4 right-4 bg-white border border-gray-200 rounded-lg shadow-lg p-4 flex items-center">
          <LoadingSpinner size="sm" className="mr-2" />
          <span className="text-sm text-gray-600">Saving preferences...</span>
        </div>
      )}
    </div>
  )
}