'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
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

  const handleFrequencyChange = (frequency: PreferenceUpdate['frequency']) => {
    setPreferences(prev => ({ ...prev, frequency }))
    setErrors(prev => ({ ...prev, frequency: undefined }))
  }

  const handleImportanceThresholdChange = (threshold: NonNullable<PreferenceUpdate['importance_threshold']>) => {
    setPreferences(prev => ({ ...prev, importance_threshold: threshold }))
  }

  const handleChannelChange = (channel: 'email' | 'sms' | 'whatsapp', checked: boolean) => {
    setPreferences(prev => {
      const newChannels = checked
        ? [...prev.preferred_channels, channel]
        : prev.preferred_channels.filter(c => c !== channel)

      return { ...prev, preferred_channels: newChannels as PreferenceUpdate['preferred_channels'] }
    })
    setErrors(prev => ({ ...prev, preferred_channels: undefined }))
  }

  const handleContentTypeChange = (contentType: string, checked: boolean) => {
    setPreferences(prev => {
      const newContentTypes = checked
        ? [...prev.content_types, contentType]
        : prev.content_types.filter(c => c !== contentType)

      return { ...prev, content_types: newContentTypes as PreferenceUpdate['content_types'] }
    })
    setErrors(prev => ({ ...prev, content_types: undefined }))
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
          How often would you like to receive updates?
        </label>
        <p className="text-sm text-gray-500 mt-1">
          Choose how frequently you want to be notified about new updates
        </p>

        <fieldset className="mt-4">
          <legend className="sr-only">Update frequency</legend>
          <div className="space-y-3">
            {options.frequencies.map((option) => {
              const isGroupDefault = recipient.group && recipient.group.default_frequency === option.value
              return (
                <div key={option.value} className={`flex items-start ${isGroupDefault ? 'bg-blue-50 border border-blue-200 rounded-md p-3' : 'p-1'}`}>
                  <div className="flex items-center h-5">
                    <input
                      id={`frequency-${option.value}`}
                      name="frequency"
                      type="radio"
                      checked={preferences.frequency === option.value}
                      onChange={() => handleFrequencyChange(option.value as PreferenceUpdate['frequency'])}
                      className="focus:ring-primary-500 h-4 w-4 text-primary-600 border-gray-300"
                    />
                  </div>
                  <div className="ml-3 text-sm flex-1">
                    <div className="flex items-center gap-2">
                      <label
                        htmlFor={`frequency-${option.value}`}
                        className="font-medium text-gray-700 cursor-pointer"
                      >
                        {option.label}
                      </label>
                      {isGroupDefault && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          Group Default
                        </span>
                      )}
                    </div>
                    <p className="text-gray-500">{option.description}</p>
                  </div>
                </div>
              )
            })}
          </div>
        </fieldset>

        {errors.frequency && (
          <p className="mt-2 text-sm text-red-600" role="alert">
            {errors.frequency}
          </p>
        )}
      </div>

      {/* Importance Threshold Selection - NEW FEATURE */}
      <div>
        <label className="text-base font-medium text-gray-900">
          What types of updates do you want to receive?
        </label>
        <p className="text-sm text-gray-500 mt-1">
          Control which updates reach you based on their importance
        </p>

        <fieldset className="mt-4">
          <legend className="sr-only">Update importance threshold</legend>
          <div className="space-y-3">
            {options.importanceThresholds.map((option) => (
              <div key={option.value} className="flex items-start p-1">
                <div className="flex items-center h-5">
                  <input
                    id={`importance-${option.value}`}
                    name="importance_threshold"
                    type="radio"
                    checked={preferences.importance_threshold === option.value}
                    onChange={() => handleImportanceThresholdChange(option.value as NonNullable<PreferenceUpdate['importance_threshold']>)}
                    className="focus:ring-primary-500 h-4 w-4 text-primary-600 border-gray-300"
                  />
                </div>
                <div className="ml-3 text-sm flex-1">
                  <label
                    htmlFor={`importance-${option.value}`}
                    className="font-medium text-gray-700 cursor-pointer"
                  >
                    {option.label}
                  </label>
                  <p className="text-gray-500">{option.description}</p>
                </div>
              </div>
            ))}
          </div>
        </fieldset>

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
                <strong>Smart filtering:</strong> Our AI automatically categorizes each update.
                You&apos;ll only receive updates that meet or exceed your chosen importance level.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Channel Selection */}
      <div>
        <label className="text-base font-medium text-gray-900">
          How would you like to receive updates?
        </label>
        <p className="text-sm text-gray-500 mt-1">
          Select one or more ways to receive notifications (at least one required)
        </p>

        <fieldset className="mt-4">
          <legend className="sr-only">Communication channels</legend>
          <div className="space-y-3">
            {options.channels.map((option) => {
              const isGroupDefault = recipient.group && recipient.group.default_channels.includes(option.value as 'email' | 'sms' | 'whatsapp')
              return (
                <div key={option.value} className={`flex items-start ${isGroupDefault ? 'bg-blue-50 border border-blue-200 rounded-md p-3' : 'p-1'}`}>
                  <div className="flex items-center h-5">
                    <input
                      id={`channel-${option.value}`}
                      name="channels"
                      type="checkbox"
                      checked={preferences.preferred_channels.includes(option.value as 'email' | 'sms' | 'whatsapp')}
                      onChange={(e) => handleChannelChange(option.value as 'email' | 'sms' | 'whatsapp', e.target.checked)}
                      className="focus:ring-primary-500 h-4 w-4 text-primary-600 border-gray-300 rounded"
                    />
                  </div>
                  <div className="ml-3 text-sm flex-1">
                    <div className="flex items-center gap-2">
                      <label
                        htmlFor={`channel-${option.value}`}
                        className="font-medium text-gray-700 cursor-pointer"
                      >
                        {option.label}
                      </label>
                      {isGroupDefault && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          Group Default
                        </span>
                      )}
                    </div>
                    <p className="text-gray-500">{option.description}</p>
                  </div>
                </div>
              )
            })}
          </div>
        </fieldset>

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
        <p className="text-sm text-gray-500 mt-1">
          Choose what types of updates you want to see (at least one required)
        </p>

        <fieldset className="mt-4">
          <legend className="sr-only">Content types</legend>
          <div className="space-y-3">
            {options.contentTypes.map((option) => (
              <div key={option.value} className="flex items-start">
                <div className="flex items-center h-5">
                  <input
                    id={`content-${option.value}`}
                    name="content_types"
                    type="checkbox"
                    checked={preferences.content_types.includes(option.value as 'photos' | 'text' | 'milestones')}
                    onChange={(e) => handleContentTypeChange(option.value, e.target.checked)}
                    className="focus:ring-primary-500 h-4 w-4 text-primary-600 border-gray-300 rounded"
                  />
                </div>
                <div className="ml-3 text-sm">
                  <label
                    htmlFor={`content-${option.value}`}
                    className="font-medium text-gray-700 cursor-pointer"
                  >
                    {option.label}
                  </label>
                  <p className="text-gray-500">{option.description}</p>
                </div>
              </div>
            ))}
          </div>
        </fieldset>

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