'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { IconOptionSelector, type IconOption } from '@/components/ui/IconOptionSelector'
import {
  updateRecipientPreferences,
  resetToGroupDefaults,
  type PreferenceUpdate,
  type RecipientWithGroup
} from '@/lib/preference-links'
import {
  getPreferenceOptions,
} from '@/lib/preference-links'
import { updatePreferencesSchema } from '@/lib/validation/recipients'
import { z } from 'zod'

// Icon components for preferences
const BoltIcon = () => (
  <svg className="w-full h-full" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
  </svg>
)

const CalendarDayIcon = () => (
  <svg className="w-full h-full" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
  </svg>
)

const CalendarWeekIcon = () => (
  <svg className="w-full h-full" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
  </svg>
)

const CalendarMonthIcon = () => (
  <svg className="w-full h-full" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
  </svg>
)

const EmailIcon = () => (
  <svg className="w-full h-full" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
  </svg>
)

const PhoneIcon = () => (
  <svg className="w-full h-full" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
  </svg>
)

const WhatsAppIcon = () => (
  <svg className="w-full h-full" fill="currentColor" viewBox="0 0 24 24">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
  </svg>
)

interface PreferenceFormProps {
  recipient: RecipientWithGroup
  token: string
  onSuccess: () => void
}

type FormErrors = {
  frequency?: string
  preferred_channels?: string
  content_types?: string
  submit?: string
}

export default function PreferenceForm({ recipient, token, onSuccess }: PreferenceFormProps) {
  const [preferences, setPreferences] = useState<PreferenceUpdate>({
    frequency: recipient.frequency as PreferenceUpdate['frequency'],
    preferred_channels: recipient.preferred_channels as PreferenceUpdate['preferred_channels'],
    content_types: recipient.content_types as PreferenceUpdate['content_types'],
    importance_threshold: (recipient.importance_threshold || 'all_updates') as PreferenceUpdate['importance_threshold']
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isResetting, setIsResetting] = useState(false)
  const [errors, setErrors] = useState<FormErrors>({})

  const options = getPreferenceOptions()

  // Icon-based frequency options
  const frequencyIconOptions: IconOption<PreferenceUpdate['frequency']>[] = [
    {
      value: 'instant',
      label: 'Instant',
      description: 'Right away, as they happen',
      icon: <BoltIcon />
    },
    {
      value: 'daily',
      label: 'Daily',
      description: 'Once per day digest',
      icon: <CalendarDayIcon />
    },
    {
      value: 'weekly',
      label: 'Weekly',
      description: 'Once per week digest',
      icon: <CalendarWeekIcon />
    },
    {
      value: 'monthly',
      label: 'Monthly',
      description: 'Once per month digest',
      icon: <CalendarMonthIcon />
    }
  ]

  // Icon-based channel options
  const channelIconOptions: IconOption<'email' | 'sms' | 'whatsapp'>[] = [
    {
      value: 'email',
      label: 'Email',
      description: 'Email notifications',
      icon: <EmailIcon />
    },
    {
      value: 'sms',
      label: 'SMS',
      description: 'Text messages',
      icon: <PhoneIcon />
    },
    {
      value: 'whatsapp',
      label: 'WhatsApp',
      description: 'WhatsApp messages',
      icon: <WhatsAppIcon />
    }
  ]

  // Content type icon options
  const contentTypeIconOptions: IconOption<'photos' | 'text' | 'milestones'>[] = [
    {
      value: 'photos',
      label: 'Photos',
      description: 'Pictures and videos',
      emoji: '📸'
    },
    {
      value: 'text',
      label: 'Text',
      description: 'Text updates',
      emoji: '📝'
    },
    {
      value: 'milestones',
      label: 'Milestones',
      description: 'Important moments',
      emoji: '⭐'
    }
  ]

  // Importance threshold icon options
  const importanceThresholdOptions: IconOption<NonNullable<PreferenceUpdate['importance_threshold']>>[] = [
    {
      value: 'all_updates',
      label: 'All Updates',
      description: 'Receive every memory shared',
      emoji: '📋'
    },
    {
      value: 'medium_and_up',
      label: 'Medium & Up',
      description: 'Moderate and important updates only',
      emoji: '⚠️'
    },
    {
      value: 'high_only',
      label: 'High Priority',
      description: 'Only the most important moments',
      emoji: '🔥'
    }
  ]

  const handleFrequencyChange = (frequency: PreferenceUpdate['frequency']) => {
    setPreferences(prev => ({ ...prev, frequency }))
    setErrors(prev => ({ ...prev, frequency: undefined }))
  }

  const handleImportanceThresholdChange = (threshold: NonNullable<PreferenceUpdate['importance_threshold']>) => {
    setPreferences(prev => ({ ...prev, importance_threshold: threshold }))
  }

  const validateForm = (): boolean => {
    try {
      updatePreferencesSchema.parse(preferences)
      setErrors({})
      return true
    } catch (error) {
      if (error instanceof z.ZodError) {
        const newErrors: FormErrors = {}
        error.errors.forEach(err => {
          if (err.path[0] === 'frequency') {
            newErrors.frequency = err.message
          } else if (err.path[0] === 'preferred_channels') {
            newErrors.preferred_channels = err.message
          } else if (err.path[0] === 'content_types') {
            newErrors.content_types = err.message
          }
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
      await updateRecipientPreferences(token, preferences)
      onSuccess()
    } catch (error) {
      setErrors({
        submit: error instanceof Error ? error.message : 'Failed to update preferences'
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleResetToDefaults = async () => {
    if (!recipient.group) {
      return
    }

    setIsResetting(true)
    setErrors({})

    try {
      await resetToGroupDefaults(token)
      // Update local state to match group defaults
      setPreferences({
        frequency: recipient.group.default_frequency as PreferenceUpdate['frequency'],
        preferred_channels: recipient.group.default_channels as PreferenceUpdate['preferred_channels'],
        content_types: ['photos', 'text'] as PreferenceUpdate['content_types']
      })
      onSuccess()
    } catch (error) {
      setErrors({
        submit: error instanceof Error ? error.message : 'Failed to reset preferences'
      })
    } finally {
      setIsResetting(false)
    }
  }

  const hasChangedFromDefaults = recipient.group && (
    preferences.frequency !== recipient.group.default_frequency ||
    !arraysEqual(preferences.preferred_channels, recipient.group.default_channels)
  )

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* Frequency Selection */}
      <div>
        <label className="text-base font-medium text-gray-900">
          How often would you like to receive memories?
        </label>
        <p className="text-sm text-gray-500 mt-1 mb-4">
          Choose how frequently you want to be notified about new memories
        </p>

        <IconOptionSelector
          options={frequencyIconOptions}
          value={preferences.frequency}
          onChange={(value) => handleFrequencyChange(value as PreferenceUpdate['frequency'])}
          mode="single"
          size="md"
          columns={{ mobile: 1, tablet: 2, desktop: 4 }}
          ariaLabel="Memory frequency"
          badges={recipient.group && recipient.group.default_frequency ? {
            [recipient.group.default_frequency]: (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-blue-600 text-white shadow-sm">
                Default
              </span>
            )
          } : undefined}
        />

        {errors.frequency && (
          <p className="mt-2 text-sm text-red-600" role="alert">
            {errors.frequency}
          </p>
        )}
      </div>

      {/* Importance Threshold Selection */}
      <div>
        <label className="text-base font-medium text-gray-900">
          What types of memories do you want to receive?
        </label>
        <p className="text-sm text-gray-500 mt-1 mb-4">
          Control which memories reach you based on their importance
        </p>

        <IconOptionSelector
          options={importanceThresholdOptions}
          value={preferences.importance_threshold || 'all_updates'}
          onChange={(value) => handleImportanceThresholdChange(value as NonNullable<PreferenceUpdate['importance_threshold']>)}
          mode="single"
          size="md"
          columns={{ mobile: 1, tablet: 2, desktop: 3 }}
          ariaLabel="Memory importance threshold"
        />

        {/* Helpful info box */}
        <div className="mt-4 bg-indigo-50 border border-indigo-200 rounded-md p-3">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-indigo-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-indigo-700">
                <strong>Smart filtering:</strong> Our AI automatically categorizes each memory.
                You&apos;ll only receive memories that meet or exceed your chosen importance level.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Channel Selection */}
      <div>
        <label className="text-base font-medium text-gray-900">
          How would you like to receive memories?
        </label>
        <p className="text-sm text-gray-500 mt-1 mb-4">
          Select one or more ways to receive notifications (at least one required)
        </p>

        <IconOptionSelector
          options={channelIconOptions}
          value={preferences.preferred_channels}
          onChange={(value) => setPreferences(prev => ({ ...prev, preferred_channels: value as PreferenceUpdate['preferred_channels'] }))}
          mode="multi"
          size="md"
          columns={{ mobile: 1, tablet: 2, desktop: 3 }}
          ariaLabel="Communication channels"
          badges={recipient.group && recipient.group.default_channels.length > 0 ?
            Object.fromEntries(
              recipient.group.default_channels.map(channel => [
                channel,
                <span key={channel} className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-blue-600 text-white shadow-sm">
                  Default
                </span>
              ])
            ) : undefined
          }
        />

        {errors.preferred_channels && (
          <p className="mt-2 text-sm text-red-600" role="alert">
            {errors.preferred_channels}
          </p>
        )}
      </div>

      {/* Content Type Selection */}
      <div>
        <label className="text-base font-medium text-gray-900">
          What types of content would you like to receive?
        </label>
        <p className="text-sm text-gray-500 mt-1 mb-4">
          Choose what types of memories you want to see (at least one required)
        </p>

        <IconOptionSelector
          options={contentTypeIconOptions}
          value={preferences.content_types}
          onChange={(value) => setPreferences(prev => ({ ...prev, content_types: value as PreferenceUpdate['content_types'] }))}
          mode="multi"
          size="md"
          columns={{ mobile: 1, tablet: 2, desktop: 3 }}
          ariaLabel="Content types"
        />

        {errors.content_types && (
          <p className="mt-2 text-sm text-red-600" role="alert">
            {errors.content_types}
          </p>
        )}
      </div>

      {/* Group Override Warning - Only shown when preferences differ from defaults */}
      {recipient.group && hasChangedFromDefaults && (
        <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-blue-800">
                You have custom preferences that override the group defaults.
              </h3>
              <div className="mt-2 text-sm text-blue-700">
                <p>
                  <span className="font-medium">Group &quot;{recipient.group.name}&quot; defaults:</span>
                </p>
                <p>
                  • Frequency: {options.frequencies.find(f => f.value === recipient.group!.default_frequency)?.label}
                </p>
                <p>
                  • Channels: {recipient.group.default_channels.map(ch =>
                    options.channels.find(c => c.value === ch)?.label
                  ).join(', ')}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Error message */}
      {errors.submit && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
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
      <div className="flex flex-col sm:flex-row gap-4">
        <Button
          type="submit"
          disabled={isSubmitting || isResetting}
          className="flex-1"
        >
          {isSubmitting ? (
            <>
              <LoadingSpinner size="sm" className="mr-2" />
              Saving Preferences...
            </>
          ) : (
            'Save Preferences'
          )}
        </Button>

        {recipient.group && hasChangedFromDefaults && (
          <Button
            type="button"
            variant="outline"
            onClick={handleResetToDefaults}
            disabled={isSubmitting || isResetting}
            className="flex-1 sm:flex-initial"
          >
            {isResetting ? (
              <>
                <LoadingSpinner size="sm" className="mr-2" />
                Resetting...
              </>
            ) : (
              'Reset to Group Defaults'
            )}
          </Button>
        )}
      </div>
    </form>
  )
}

// Utility function to compare arrays
function arraysEqual(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false
  const sortedA = [...a].sort()
  const sortedB = [...b].sort()
  return sortedA.every((val, i) => val === sortedB[i])
}