'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { getPreferenceOptions } from '@/lib/preference-links'
import { cn } from '@/lib/utils'
import { createLogger } from '@/lib/logger'
import { z } from 'zod'
import {
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline'

const logger = createLogger('GroupPreferenceSettings')

// Validation schema for group-specific preferences
const groupPreferencesSchema = z.object({
  notification_frequency: z.enum(['every_update', 'daily_digest', 'weekly_digest', 'milestones_only']).optional(),
  preferred_channels: z.array(z.enum(['email', 'sms', 'whatsapp'])).min(1, 'At least one channel is required').optional(),
  content_types: z.array(z.enum(['photos', 'text', 'milestones'])).min(1, 'At least one content type is required').optional()
})

type GroupPreferencePayload = z.infer<typeof groupPreferencesSchema>
type FrequencyValue = 'every_update' | 'daily_digest' | 'weekly_digest' | 'milestones_only'
type ChannelValue = 'email' | 'sms' | 'whatsapp'
type ContentTypeValue = 'photos' | 'text' | 'milestones'

interface PreferenceFormState {
  notification_frequency: FrequencyValue | ''
  preferred_channels: ChannelValue[]
  content_types: ContentTypeValue[]
}

export interface GroupMembership {
  id: string
  group_id: string
  group: {
    id: string
    name: string
    default_frequency: string
    default_channels: string[]
    is_default_group: boolean
  }
  notification_frequency?: string
  preferred_channels?: string[]
  content_types?: string[]
  role: string
  is_active: boolean
  has_custom_settings: boolean
  effective_settings: {
    frequency: string
    channels: string[]
    content_types: string[]
    source: 'member_override' | 'group_default' | 'system_default'
  }
}

interface GroupPreferenceSettingsProps {
  membership: GroupMembership
  token: string
  onUpdate: () => void
  onCancel: () => void
}

export function GroupPreferenceSettings({
  membership,
  token,
  onUpdate,
  onCancel
}: GroupPreferenceSettingsProps) {
  const [preferences, setPreferences] = useState<PreferenceFormState>({
    notification_frequency: (membership.notification_frequency as FrequencyValue | undefined) || '',
    preferred_channels: (membership.preferred_channels as ChannelValue[] | undefined) || [],
    content_types: (membership.content_types as ContentTypeValue[] | undefined) || ['photos', 'text', 'milestones']
  })
  const [useGroupDefaults, setUseGroupDefaults] = useState(!membership.has_custom_settings)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const options = getPreferenceOptions()

  const handleFrequencyChange = (frequency: FrequencyValue) => {
    setPreferences(prev => ({ ...prev, notification_frequency: frequency }))
    setUseGroupDefaults(false)
    setErrors(prev => ({ ...prev, notification_frequency: '' }))
  }

  const handleChannelChange = (channel: ChannelValue, checked: boolean) => {
    setPreferences(prev => {
      const newChannels = checked
        ? [...prev.preferred_channels, channel]
        : prev.preferred_channels.filter(c => c !== channel)

      return { ...prev, preferred_channels: newChannels }
    })
    setUseGroupDefaults(false)
    setErrors(prev => ({ ...prev, preferred_channels: '' }))
  }

  const handleContentTypeChange = (contentType: ContentTypeValue, checked: boolean) => {
    setPreferences(prev => {
      const newContentTypes = checked
        ? [...prev.content_types, contentType]
        : prev.content_types.filter(c => c !== contentType)

      return { ...prev, content_types: newContentTypes }
    })
    setUseGroupDefaults(false)
    setErrors(prev => ({ ...prev, content_types: '' }))
  }

  const handleUseGroupDefaults = () => {
    setUseGroupDefaults(true)
    setPreferences({
      notification_frequency: '',
      preferred_channels: [],
      content_types: ['photos', 'text', 'milestones']
    })
    setErrors({})
  }

  const validateForm = (): boolean => {
    if (useGroupDefaults) {
      setErrors({})
      return true
    }

    try {
      const validationData: GroupPreferencePayload = {}

      if (preferences.notification_frequency) {
        validationData.notification_frequency = preferences.notification_frequency
      }

      if (preferences.preferred_channels.length > 0) {
        validationData.preferred_channels = preferences.preferred_channels
      }

      if (preferences.content_types.length > 0) {
        validationData.content_types = preferences.content_types
      }

      groupPreferencesSchema.parse(validationData)
      setErrors({})
      return true
    } catch (error) {
      if (error instanceof z.ZodError) {
        const newErrors: Record<string, string> = {}
        error.errors.forEach(err => {
          const field = err.path[0] as string
          newErrors[field] = err.message
        })
        setErrors(newErrors)
      }
      return false
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) {
      return
    }

    setIsSubmitting(true)
    setErrors({})

    try {
      if (useGroupDefaults) {
        // Reset to group defaults
        const response = await fetch(`/api/recipients/${token}/group-preferences`, {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            group_id: membership.group_id
          })
        })

        if (!response.ok) {
          const { error } = await response.json()
          throw new Error(error || 'Failed to reset to group defaults')
        }
      } else {
        // Update custom preferences
        const updateData: GroupPreferencePayload = {}

        if (preferences.notification_frequency) {
          updateData.notification_frequency = preferences.notification_frequency
        }

        if (preferences.preferred_channels.length > 0) {
          updateData.preferred_channels = preferences.preferred_channels
        }

        if (preferences.content_types.length > 0) {
          updateData.content_types = preferences.content_types
        }

        const response = await fetch(`/api/recipients/${token}/group-preferences`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            group_id: membership.group_id,
            ...updateData
          })
        })

        if (!response.ok) {
          const { error } = await response.json()
          throw new Error(error || 'Failed to update preferences')
        }
      }

      onUpdate()
    } catch (error) {
      logger.errorWithStack('Error updating group preferences:', error as Error)
      setErrors({
        submit: error instanceof Error ? error.message : 'Failed to update preferences'
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const getEffectiveFrequency = (): FrequencyValue => {
    if (useGroupDefaults || !preferences.notification_frequency) {
      return membership.group.default_frequency as FrequencyValue
    }
    return preferences.notification_frequency
  }

  const getEffectiveChannels = (): ChannelValue[] => {
    if (useGroupDefaults || preferences.preferred_channels.length === 0) {
      return membership.group.default_channels as ChannelValue[]
    }
    return preferences.preferred_channels
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Use Group Defaults Toggle */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <input
            id="use-group-defaults"
            type="checkbox"
            checked={useGroupDefaults}
            onChange={(e) => {
              if (e.target.checked) {
                handleUseGroupDefaults()
              } else {
                setUseGroupDefaults(false)
                setPreferences({
                  notification_frequency: membership.effective_settings.frequency as FrequencyValue,
                  preferred_channels: [...membership.effective_settings.channels] as ChannelValue[],
                  content_types: [...membership.effective_settings.content_types] as ContentTypeValue[]
                })
              }
            }}
            className="mt-1 h-4 w-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
          />
          <div className="flex-1">
            <label htmlFor="use-group-defaults" className="text-sm font-medium text-blue-900 cursor-pointer">
              Use group default settings
            </label>
            <p className="text-sm text-blue-700 mt-1">
              Automatically inherit settings from the &quot;{membership.group.name}&quot; group.
              When group defaults change, your settings will update automatically.
            </p>
          </div>
        </div>
      </div>

      {/* Frequency Selection */}
      <div>
        <label className="text-base font-medium text-gray-900">
          Notification Frequency
        </label>
        <p className="text-sm text-gray-500 mt-1 mb-3">
          How often would you like to receive updates from this group?
        </p>

        <fieldset className="space-y-3">
          <legend className="sr-only">Notification frequency</legend>
          {options.frequencies.map((option) => {
            const isGroupDefault = membership.group.default_frequency === option.value
            const isSelected = getEffectiveFrequency() === option.value
            const isCustomSelected = !useGroupDefaults && preferences.notification_frequency === option.value

            return (
              <div key={option.value} className={cn(
                "flex items-start p-3 rounded-md border transition-colors",
                isGroupDefault && useGroupDefaults && "bg-blue-50 border-blue-200",
                isCustomSelected && "bg-green-50 border-green-200",
                !isSelected && "border-gray-200 hover:bg-gray-50"
              )}>
                <div className="flex items-center h-5">
                  <input
                    id={`frequency-${option.value}`}
                    name="frequency"
                    type="radio"
                    checked={isSelected}
                    onChange={() => handleFrequencyChange(option.value as FrequencyValue)}
                    disabled={useGroupDefaults}
                    className="focus:ring-primary-500 h-4 w-4 text-primary-600 border-gray-300 disabled:opacity-50"
                  />
                </div>
                <div className="ml-3 text-sm flex-1">
                  <div className="flex items-center gap-2">
                    <label
                      htmlFor={`frequency-${option.value}`}
                      className={cn(
                        "font-medium cursor-pointer",
                        useGroupDefaults && "text-gray-500"
                      )}
                    >
                      {option.label}
                    </label>
                    {isGroupDefault && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        Group Default
                      </span>
                    )}
                    {isCustomSelected && (
                      <CheckCircleIcon className="h-4 w-4 text-green-600" />
                    )}
                  </div>
                  <p className={cn(
                    "text-gray-500",
                    useGroupDefaults && "text-gray-400"
                  )}>
                    {option.description}
                  </p>
                </div>
              </div>
            )
          })}
        </fieldset>

        {errors.notification_frequency && (
          <p className="mt-2 text-sm text-red-600" role="alert">
            {errors.notification_frequency}
          </p>
        )}
      </div>

      {/* Channel Selection */}
      <div>
        <label className="text-base font-medium text-gray-900">
          Communication Channels
        </label>
        <p className="text-sm text-gray-500 mt-1 mb-3">
          Select how you&apos;d like to receive notifications from this group
        </p>

        <fieldset className="space-y-3">
          <legend className="sr-only">Communication channels</legend>
          {options.channels.map((option) => {
            const channelValue = option.value as ChannelValue
            const isGroupDefault = membership.group.default_channels.includes(channelValue)
            const isSelected = getEffectiveChannels().includes(channelValue)
            const isCustomSelected = !useGroupDefaults && preferences.preferred_channels.includes(channelValue)

            return (
              <div key={option.value} className={cn(
                "flex items-start p-3 rounded-md border transition-colors",
                isGroupDefault && useGroupDefaults && "bg-blue-50 border-blue-200",
                isCustomSelected && "bg-green-50 border-green-200",
                !isSelected && "border-gray-200 hover:bg-gray-50"
              )}>
                <div className="flex items-center h-5">
                  <input
                    id={`channel-${option.value}`}
                    name="channels"
                    type="checkbox"
                    checked={isSelected}
                    onChange={(e) => handleChannelChange(channelValue, e.target.checked)}
                    disabled={useGroupDefaults}
                    className="focus:ring-primary-500 h-4 w-4 text-primary-600 border-gray-300 rounded disabled:opacity-50"
                  />
                </div>
                <div className="ml-3 text-sm flex-1">
                  <div className="flex items-center gap-2">
                    <label
                      htmlFor={`channel-${option.value}`}
                      className={cn(
                        "font-medium cursor-pointer",
                        useGroupDefaults && "text-gray-500"
                      )}
                    >
                      {option.label}
                    </label>
                    {isGroupDefault && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        Group Default
                      </span>
                    )}
                    {isCustomSelected && (
                      <CheckCircleIcon className="h-4 w-4 text-green-600" />
                    )}
                  </div>
                  <p className={cn(
                    "text-gray-500",
                    useGroupDefaults && "text-gray-400"
                  )}>
                    {option.description}
                  </p>
                </div>
              </div>
            )
          })}
        </fieldset>

        {errors.preferred_channels && (
          <p className="mt-2 text-sm text-red-600" role="alert">
            {errors.preferred_channels}
          </p>
        )}
      </div>

      {/* Content Types Selection */}
      <div>
        <label className="text-base font-medium text-gray-900">
          Content Types
        </label>
        <p className="text-sm text-gray-500 mt-1 mb-3">
          Choose what types of updates you want to receive from this group
        </p>

        <fieldset className="space-y-3">
          <legend className="sr-only">Content types</legend>
          {options.contentTypes.map((option) => {
            const contentValue = option.value as ContentTypeValue
            const isSelected = preferences.content_types.includes(contentValue)

            return (
              <div key={option.value} className={cn(
                "flex items-start p-3 rounded-md border transition-colors",
                isSelected && !useGroupDefaults && "bg-green-50 border-green-200",
                useGroupDefaults && "bg-blue-50 border-blue-200",
                !isSelected && !useGroupDefaults && "border-gray-200 hover:bg-gray-50"
              )}>
                <div className="flex items-center h-5">
                  <input
                    id={`content-${option.value}`}
                    name="content_types"
                    type="checkbox"
                    checked={useGroupDefaults ? true : isSelected}
                    onChange={(e) => handleContentTypeChange(contentValue, e.target.checked)}
                    disabled={useGroupDefaults}
                    className="focus:ring-primary-500 h-4 w-4 text-primary-600 border-gray-300 rounded disabled:opacity-50"
                  />
                </div>
                <div className="ml-3 text-sm flex-1">
                  <div className="flex items-center gap-2">
                    <label
                      htmlFor={`content-${option.value}`}
                      className={cn(
                        "font-medium cursor-pointer",
                        useGroupDefaults && "text-gray-500"
                      )}
                    >
                      {option.label}
                    </label>
                    {isSelected && !useGroupDefaults && (
                      <CheckCircleIcon className="h-4 w-4 text-green-600" />
                    )}
                  </div>
                  <p className={cn(
                    "text-gray-500",
                    useGroupDefaults && "text-gray-400"
                  )}>
                    {option.description}
                  </p>
                </div>
              </div>
            )
          })}
        </fieldset>

        {errors.content_types && (
          <p className="mt-2 text-sm text-red-600" role="alert">
            {errors.content_types}
          </p>
        )}
      </div>

      {/* Preview of Changes */}
      {!useGroupDefaults && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-start gap-2">
            <ExclamationTriangleIcon className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
            <div>
              <h5 className="text-sm font-medium text-green-900 mb-2">
                Custom settings preview
              </h5>
              <div className="text-sm text-green-800 space-y-1">
                <p>
                  <strong>Frequency:</strong> {options.frequencies.find(f => f.value === getEffectiveFrequency())?.label}
                </p>
                <p>
                  <strong>Channels:</strong> {getEffectiveChannels().map(ch =>
                    options.channels.find(c => c.value === ch)?.label
                  ).join(', ')}
                </p>
                <p>
                  <strong>Content:</strong> {preferences.content_types.map(ct =>
                    options.contentTypes.find(c => c.value === ct)?.label
                  ).join(', ')}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Error message */}
      {errors.submit && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-800">{errors.submit}</p>
            </div>
          </div>
        </div>
      )}

      {/* Action buttons */}
      <div className="flex flex-col sm:flex-row gap-3">
        <Button
          type="submit"
          disabled={isSubmitting}
          className="flex-1"
        >
          {isSubmitting ? (
            <>
              <LoadingSpinner size="sm" className="mr-2" />
              {useGroupDefaults ? 'Resetting to Defaults...' : 'Saving Custom Settings...'}
            </>
          ) : (
            <>
              {useGroupDefaults ? (
                <>
                  <ArrowPathIcon className="h-4 w-4 mr-2" />
                  Reset to Group Defaults
                </>
              ) : (
                'Save Custom Settings'
              )}
            </>
          )}
        </Button>

        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={isSubmitting}
          className="flex-1 sm:flex-initial"
        >
          Cancel
        </Button>
      </div>
    </form>
  )
}
