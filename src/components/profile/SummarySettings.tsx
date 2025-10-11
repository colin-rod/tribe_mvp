'use client'

import { useState } from 'react'
import { DigestPreferences } from '@/lib/types/profile'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { IconOptionSelector, type IconOption } from '@/components/ui/IconOptionSelector'
import { cn } from '@/lib/utils'

// Icon components for frequency options
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

interface SummarySettingsProps {
  digestPrefs: DigestPreferences
  onUpdate: (prefs: DigestPreferences) => void
  loading?: boolean
}

const CONTENT_TYPES = [
  {
    id: 'responses',
    label: 'Responses',
    description: 'Family member responses to your memories',
    key: 'include_responses' as keyof DigestPreferences
  },
  {
    id: 'prompts',
    label: 'AI Prompts',
    description: 'Suggested prompts and milestone reminders',
    key: 'include_prompts' as keyof DigestPreferences
  },
  {
    id: 'metrics',
    label: 'Metrics & Insights',
    description: 'Engagement statistics and family activity summaries',
    key: 'include_metrics' as keyof DigestPreferences
  }
]

const WEEKDAYS = [
  'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'
]

const MONTH_DAYS = Array.from({ length: 28 }, (_, i) => i + 1)

export default function SummarySettings({ digestPrefs, onUpdate, loading = false }: SummarySettingsProps) {
  const [showPreview, setShowPreview] = useState(false)

  // Icon-based frequency options
  const frequencyIconOptions: IconOption<DigestPreferences['frequency']>[] = [
    {
      value: 'daily',
      label: 'Daily',
      description: 'Receive summary every day',
      icon: <CalendarDayIcon />
    },
    {
      value: 'weekly',
      label: 'Weekly',
      description: 'Receive summary once per week',
      icon: <CalendarWeekIcon />
    },
    {
      value: 'monthly',
      label: 'Monthly',
      description: 'Receive summary once per month',
      icon: <CalendarMonthIcon />
    }
  ]

  const handleFrequencyChange = (frequency: DigestPreferences['frequency']) => {
    const updates: Partial<DigestPreferences> = { frequency }

    // Reset delivery_day when changing frequency
    if (frequency === 'daily') {
      updates.delivery_day = undefined
    } else if (frequency === 'weekly' && !digestPrefs.delivery_day) {
      updates.delivery_day = 'Sunday'
    } else if (frequency === 'monthly' && !digestPrefs.delivery_day) {
      updates.delivery_day = '1'
    }

    onUpdate({ ...digestPrefs, ...updates })
  }

  const handleContentTypeChange = (key: keyof DigestPreferences, enabled: boolean) => {
    onUpdate({ ...digestPrefs, [key]: enabled })
  }

  const handleTimeChange = (time: string) => {
    onUpdate({ ...digestPrefs, delivery_time: time })
  }

  const handleDayChange = (day: string) => {
    onUpdate({ ...digestPrefs, delivery_day: day })
  }

  const getNextDeliveryText = () => {
    const now = new Date()
    const [hours, minutes] = digestPrefs.delivery_time.split(':').map(Number)

    if (digestPrefs.frequency === 'daily') {
      const tomorrow = new Date(now)
      tomorrow.setDate(tomorrow.getDate() + 1)
      tomorrow.setHours(hours, minutes, 0, 0)
      return `Tomorrow at ${digestPrefs.delivery_time}`
    } else if (digestPrefs.frequency === 'weekly') {
      const dayIndex = WEEKDAYS.indexOf(digestPrefs.delivery_day || 'Sunday')
      const daysUntilNext = (dayIndex - now.getDay() + 7) % 7 || 7
      const nextDate = new Date(now)
      nextDate.setDate(nextDate.getDate() + daysUntilNext)
      return `${digestPrefs.delivery_day} at ${digestPrefs.delivery_time}`
    } else {
      const dayNum = parseInt(digestPrefs.delivery_day || '1')
      return `${dayNum}${getOrdinalSuffix(dayNum)} of month at ${digestPrefs.delivery_time}`
    }
  }

  const getOrdinalSuffix = (num: number) => {
    const j = num % 10
    const k = num % 100
    if (j === 1 && k !== 11) return 'st'
    if (j === 2 && k !== 12) return 'nd'
    if (j === 3 && k !== 13) return 'rd'
    return 'th'
  }

  const generatePreviewContent = () => {
    const contentItems = []

    if (digestPrefs.include_responses) {
      contentItems.push('3 new responses from family members')
    }
    if (digestPrefs.include_prompts) {
      contentItems.push('2 suggested prompts for this week')
    }
    if (digestPrefs.include_metrics) {
      contentItems.push('Weekly engagement summary')
    }

    return contentItems
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h3 className="text-lg font-medium text-gray-900">Summary Settings</h3>
        <p className="mt-1 text-sm text-gray-600">
          Configure when and what content to include in your email summaries.
        </p>
      </div>

      {/* Enable/Disable Toggle */}
      <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
        <div>
          <h4 className="text-sm font-medium text-gray-900">Email Summaries</h4>
          <p className="text-sm text-gray-600">
            Receive summarized memories via email
          </p>
        </div>
        <div className="flex items-center">
          <input
            type="checkbox"
            id="digest-enabled"
            checked={digestPrefs.enabled}
            onChange={(e) => onUpdate({ ...digestPrefs, enabled: e.target.checked })}
            disabled={loading}
            className="h-4 w-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
          />
          <label htmlFor="digest-enabled" className="ml-2 text-sm text-gray-700">
            {digestPrefs.enabled ? 'Enabled' : 'Disabled'}
          </label>
        </div>
      </div>

      {digestPrefs.enabled && (
        <>
          {/* Frequency Selection */}
          <div className="space-y-4">
            <h4 className="text-sm font-medium text-gray-900">Frequency</h4>
            <IconOptionSelector
              options={frequencyIconOptions}
              value={digestPrefs.frequency}
              onChange={(value) => handleFrequencyChange(value as DigestPreferences['frequency'])}
              mode="single"
              size="md"
              columns={{ mobile: 1, tablet: 2, desktop: 3 }}
              ariaLabel="Summary frequency"
              disabled={loading}
            />
          </div>

          {/* Delivery Time */}
          <div className="space-y-4">
            <h4 className="text-sm font-medium text-gray-900">Delivery Time</h4>
            <div className="flex items-center space-x-4">
              <div className="flex-1 max-w-xs">
                <Input
                  type="time"
                  value={digestPrefs.delivery_time}
                  onChange={(e) => handleTimeChange(e.target.value)}
                  disabled={loading}
                  className="w-full"
                />
              </div>
              <span className="text-sm text-gray-600">
                in your local timezone
              </span>
            </div>
          </div>

          {/* Day Selection for Weekly/Monthly */}
          {digestPrefs.frequency !== 'daily' && (
            <div className="space-y-4">
              <h4 className="text-sm font-medium text-gray-900">
                {digestPrefs.frequency === 'weekly' ? 'Day of Week' : 'Day of Month'}
              </h4>
              <div className="grid grid-cols-4 md:grid-cols-7 gap-2">
                {(digestPrefs.frequency === 'weekly' ? WEEKDAYS : MONTH_DAYS).map((day) => {
                  const dayValue = day.toString()
                  const isSelected = digestPrefs.delivery_day === dayValue

                  return (
                    <button
                      key={dayValue}
                      type="button"
                      onClick={() => handleDayChange(dayValue)}
                      disabled={loading}
                      className={cn(
                        'px-3 py-2 text-sm rounded-md border transition-colors',
                        isSelected
                          ? 'border-primary-600 bg-primary-600 text-white'
                          : 'border-gray-300 text-gray-700 hover:border-gray-400 hover:bg-gray-50'
                      )}
                    >
                      {digestPrefs.frequency === 'weekly' ? String(day).slice(0, 3) : day}
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* Content Types */}
          <div className="space-y-4">
            <h4 className="text-sm font-medium text-gray-900">Content to Include</h4>
            <div className="space-y-4">
              {CONTENT_TYPES.map((contentType) => (
                <div key={contentType.id} className="flex items-start">
                  <div className="flex items-center h-5">
                    <input
                      id={contentType.id}
                      type="checkbox"
                      checked={digestPrefs[contentType.key] as boolean}
                      onChange={(e) => handleContentTypeChange(contentType.key, e.target.checked)}
                      disabled={loading}
                      className="h-4 w-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                    />
                  </div>
                  <div className="ml-3">
                    <label htmlFor={contentType.id} className="text-sm font-medium text-gray-700">
                      {contentType.label}
                    </label>
                    <p className="text-sm text-gray-500">{contentType.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Schedule Summary */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h4 className="text-sm font-medium text-blue-900">Next Summary</h4>
                <p className="text-sm text-blue-700">
                  Your next {digestPrefs.frequency} summary will be delivered {getNextDeliveryText()}
                </p>
              </div>
            </div>
          </div>

          {/* Preview Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-medium text-gray-900">Preview</h4>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowPreview(!showPreview)}
                disabled={loading}
              >
                {showPreview ? 'Hide Preview' : 'Show Preview'}
              </Button>
            </div>

            {showPreview && (
              <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h5 className="text-sm font-medium text-gray-900">
                      Your {digestPrefs.frequency.charAt(0).toUpperCase() + digestPrefs.frequency.slice(1)} Summary
                    </h5>
                    <span className="text-xs text-gray-500">
                      {new Date().toLocaleDateString()}
                    </span>
                  </div>

                  <div className="space-y-2">
                    {generatePreviewContent().length > 0 ? (
                      generatePreviewContent().map((item, index) => (
                        <div key={index} className="flex items-center text-sm text-gray-700">
                          <div className="w-2 h-2 bg-primary-600 rounded-full mr-3 flex-shrink-0" />
                          {item}
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-gray-500 italic">
                        No content types selected. Choose what to include above.
                      </p>
                    )}
                  </div>

                  {generatePreviewContent().length > 0 && (
                    <div className="mt-4 pt-3 border-t border-gray-200">
                      <p className="text-xs text-gray-500">
                        This is a preview of your summary content. Actual content will vary based on your family&apos;s activity.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
