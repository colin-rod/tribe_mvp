'use client'

import { useState, useCallback } from 'react'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/utils'
import { FREQUENCY_OPTIONS, CHANNEL_OPTIONS, CONTENT_TYPE_OPTIONS } from '@/lib/validation/recipients'
import type { GroupMembership } from './GroupMembershipCard'

interface GroupPreferences {
  frequency: 'every_update' | 'daily_digest' | 'weekly_digest' | 'milestones_only'
  channels: Array<'email' | 'sms' | 'whatsapp'>
  content_types: Array<'photos' | 'text' | 'milestones'>
}

interface GroupPreferenceManagerProps {
  membership: GroupMembership
  onUpdatePreferences: (groupId: string, preferences: Partial<GroupMembership['personal_preferences']>) => Promise<void>
  onResetToDefaults: (groupId: string) => Promise<void>
  onClose: () => void
  isLoading?: boolean
  className?: string
}

export default function GroupPreferenceManager({
  membership,
  onUpdatePreferences,
  onResetToDefaults,
  onClose,
  isLoading = false,
  className
}: GroupPreferenceManagerProps) {
  const [preferences, setPreferences] = useState<GroupPreferences>({
    frequency: membership.personal_preferences.frequency || membership.group_defaults.frequency,
    channels: membership.personal_preferences.channels || membership.group_defaults.channels,
    content_types: membership.personal_preferences.content_types || membership.group_defaults.content_types
  })

  const [useGroupDefaults, setUseGroupDefaults] = useState(!!(
    !membership.personal_preferences.frequency &&
    !membership.personal_preferences.channels &&
    !membership.personal_preferences.content_types
  ))

  const [isProcessing, setIsProcessing] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [showAdvanced, setShowAdvanced] = useState(false)

  const hasChanges = useCallback(() => {
    if (useGroupDefaults) {
      return !!(
        membership.personal_preferences.frequency ||
        membership.personal_preferences.channels ||
        membership.personal_preferences.content_types
      )
    }

    const currentFrequency = membership.personal_preferences.frequency || membership.group_defaults.frequency
    const currentChannels = membership.personal_preferences.channels || membership.group_defaults.channels
    const currentContentTypes = membership.personal_preferences.content_types || membership.group_defaults.content_types

    return (
      preferences.frequency !== currentFrequency ||
      JSON.stringify(preferences.channels.sort()) !== JSON.stringify(currentChannels.sort()) ||
      JSON.stringify(preferences.content_types.sort()) !== JSON.stringify(currentContentTypes.sort())
    )
  }, [preferences, membership, useGroupDefaults])

  const handleSave = async () => {
    setIsProcessing(true)
    setSaveError(null)
    try {
      if (useGroupDefaults) {
        await onResetToDefaults(membership.id)
      } else {
        await onUpdatePreferences(membership.id, {
          frequency: preferences.frequency,
          channels: preferences.channels,
          content_types: preferences.content_types
        })
      }
      onClose()
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update preferences'
      setSaveError(message)
    } finally {
      setIsProcessing(false)
    }
  }

  const handleChannelToggle = (channel: 'email' | 'sms' | 'whatsapp') => {
    setPreferences(prev => ({
      ...prev,
      channels: prev.channels.includes(channel)
        ? prev.channels.filter(c => c !== channel)
        : [...prev.channels, channel]
    }))
    setUseGroupDefaults(false)
  }

  const handleContentTypeToggle = (contentType: 'photos' | 'text' | 'milestones') => {
    setPreferences(prev => ({
      ...prev,
      content_types: prev.content_types.includes(contentType)
        ? prev.content_types.filter(c => c !== contentType)
        : [...prev.content_types, contentType]
    }))
    setUseGroupDefaults(false)
  }

  const handleFrequencyChange = (frequency: GroupPreferences['frequency']) => {
    setPreferences(prev => ({ ...prev, frequency }))
    setUseGroupDefaults(false)
  }

  const handleUseDefaultsToggle = (useDefaults: boolean) => {
    setUseGroupDefaults(useDefaults)
    if (useDefaults) {
      setPreferences({
        frequency: membership.group_defaults.frequency,
        channels: membership.group_defaults.channels,
        content_types: membership.group_defaults.content_types
      })
    }
  }

  if (isLoading) {
    return (
      <div className={cn(
        "bg-white rounded-xl border border-gray-200 shadow-lg p-6 animate-pulse",
        className
      )}>
        <div className="space-y-4">
          <div className="h-6 bg-gray-200 rounded w-3/4" />
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-16 bg-gray-200 rounded" />
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={cn(
      "bg-white rounded-xl border border-gray-200 shadow-lg overflow-hidden",
      className
    )}>
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              Notification Preferences
            </h3>
            <p className="text-sm text-gray-600 mt-1">
              {membership.name}
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="h-8 w-8 p-0 text-gray-400 hover:text-gray-600"
            disabled={isProcessing}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </Button>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {saveError && (
          <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md">
            <p className="text-sm text-destructive">{saveError}</p>
          </div>
        )}

        {/* Use Group Defaults Toggle */}
        <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg">
          <div className="flex items-center h-5">
            <input
              id="use-defaults"
              type="checkbox"
              checked={useGroupDefaults}
              onChange={(e) => handleUseDefaultsToggle(e.target.checked)}
              disabled={isProcessing}
              className="w-4 h-4 text-primary-600 bg-white border-gray-300 rounded focus:ring-primary-500 focus:ring-2"
            />
          </div>
          <div className="flex-1">
            <label htmlFor="use-defaults" className="text-sm font-medium text-gray-900 cursor-pointer">
              Use group default settings
            </label>
            <p className="text-xs text-gray-600 mt-1">
              When enabled, you&apos;ll automatically receive updates according to the group&apos;s default preferences.
              Disable to customize your personal preferences for this group.
            </p>
          </div>
        </div>

        {/* Group Defaults Info */}
        {useGroupDefaults && (
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h4 className="text-sm font-medium text-blue-900 mb-3">Group Default Settings</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-blue-700">Frequency:</span>
                <span className="font-medium text-blue-900">
                  {FREQUENCY_OPTIONS.find(opt => opt.value === membership.group_defaults.frequency)?.label}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-blue-700">Channels:</span>
                <span className="font-medium text-blue-900">
                  {membership.group_defaults.channels
                    .map(ch => CHANNEL_OPTIONS.find(opt => opt.value === ch)?.label)
                    .join(', ')}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-blue-700">Content:</span>
                <span className="font-medium text-blue-900">
                  {membership.group_defaults.content_types
                    .map(ct => CONTENT_TYPE_OPTIONS.find(opt => opt.value === ct)?.label)
                    .join(', ')}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Custom Preferences */}
        {!useGroupDefaults && (
          <div className="space-y-6">
            {/* Frequency Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Notification Frequency
              </label>
              <div className="space-y-2">
                {FREQUENCY_OPTIONS.map((option) => (
                  <label
                    key={option.value}
                    className={cn(
                      "flex items-start gap-3 p-3 border rounded-lg cursor-pointer transition-all duration-200",
                      preferences.frequency === option.value
                        ? "border-primary-500 bg-primary-50 ring-2 ring-primary-500"
                        : "border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50"
                    )}
                  >
                    <input
                      type="radio"
                      name="frequency"
                      value={option.value}
                      checked={preferences.frequency === option.value}
                      onChange={() => handleFrequencyChange(option.value)}
                      disabled={isProcessing}
                      className="mt-0.5 text-primary-600 focus:ring-primary-500"
                    />
                    <div className="flex-1">
                      <div className="text-sm font-medium text-gray-900">{option.label}</div>
                      <div className="text-xs text-gray-600 mt-1">{option.description}</div>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Channels Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Notification Channels
              </label>
              <div className="space-y-2">
                {CHANNEL_OPTIONS.map((option) => (
                  <label
                    key={option.value}
                    className={cn(
                      "flex items-start gap-3 p-3 border rounded-lg cursor-pointer transition-all duration-200",
                      preferences.channels.includes(option.value)
                        ? "border-primary-300 bg-primary-50"
                        : "border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50"
                    )}
                  >
                    <input
                      type="checkbox"
                      checked={preferences.channels.includes(option.value)}
                      onChange={() => handleChannelToggle(option.value)}
                      disabled={isProcessing}
                      className="mt-0.5 text-primary-600 focus:ring-primary-500 rounded"
                    />
                    <div className="flex-1">
                      <div className="text-sm font-medium text-gray-900">{option.label}</div>
                      <div className="text-xs text-gray-600 mt-1">{option.description}</div>
                    </div>
                  </label>
                ))}
              </div>
              {preferences.channels.length === 0 && (
                <p className="text-xs text-red-600 mt-1">Please select at least one notification channel.</p>
              )}
            </div>

            {/* Advanced Settings */}
            <div>
              <button
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-gray-900"
                disabled={isProcessing}
              >
                <svg
                  className={cn("w-4 h-4 transition-transform", showAdvanced && "rotate-90")}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
                Advanced Settings
              </button>

              {showAdvanced && (
                <div className="mt-3 pl-6 space-y-4">
                  {/* Content Types */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-3">
                      Content Types
                    </label>
                    <div className="space-y-2">
                      {CONTENT_TYPE_OPTIONS.map((option) => (
                        <label
                          key={option.value}
                          className={cn(
                            "flex items-start gap-3 p-3 border rounded-lg cursor-pointer transition-all duration-200",
                            preferences.content_types.includes(option.value)
                              ? "border-primary-300 bg-primary-50"
                              : "border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50"
                          )}
                        >
                          <input
                            type="checkbox"
                            checked={preferences.content_types.includes(option.value)}
                            onChange={() => handleContentTypeToggle(option.value)}
                            disabled={isProcessing}
                            className="mt-0.5 text-primary-600 focus:ring-primary-500 rounded"
                          />
                          <div className="flex-1">
                            <div className="text-sm font-medium text-gray-900">{option.label}</div>
                            <div className="text-xs text-gray-600 mt-1">{option.description}</div>
                          </div>
                        </label>
                      ))}
                    </div>
                    {preferences.content_types.length === 0 && (
                      <p className="text-xs text-red-600 mt-1">Please select at least one content type.</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Footer Actions */}
      <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            onClick={onClose}
            disabled={isProcessing}
          >
            Cancel
          </Button>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              onClick={() => handleUseDefaultsToggle(true)}
              disabled={isProcessing || useGroupDefaults}
              size="sm"
            >
              Reset to Defaults
            </Button>
            <Button
              onClick={handleSave}
              disabled={
                isProcessing ||
                !hasChanges() ||
                (!useGroupDefaults && (
                  preferences.channels.length === 0 ||
                  preferences.content_types.length === 0
                ))
              }
              loading={isProcessing}
            >
              Save Preferences
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
