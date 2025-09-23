'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useNotificationManager } from '@/hooks/useNotificationManager'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import type { QuietHours } from '@/lib/types/profile'

// Schema for form validation
const quietHoursSchema = z.object({
  enabled: z.boolean(),
  start: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format'),
  end: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format'),
  timezone: z.string(),
  weekdays_only: z.boolean().optional(),
  holiday_mode: z.boolean().optional()
})

type QuietHoursFormData = z.infer<typeof quietHoursSchema>

interface QuietHoursConfigProps {
  onSuccess?: () => void
}

export default function QuietHoursConfig({ onSuccess }: QuietHoursConfigProps) {
  const { preferences, updatePreferences, loading, error } = useNotificationManager()
  const [currentTime, setCurrentTime] = useState<string>('')
  const [detectedTimezone, setDetectedTimezone] = useState<string>('')

  // Detect user's timezone
  useEffect(() => {
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone
    setDetectedTimezone(timezone)

    // Update current time every minute for preview
    const updateTime = () => {
      const now = new Date()
      setCurrentTime(now.toLocaleTimeString('en-US', {
        hour12: false,
        hour: '2-digit',
        minute: '2-digit',
        timeZone: timezone
      }))
    }

    updateTime()
    const interval = setInterval(updateTime, 60000)

    return () => clearInterval(interval)
  }, [])

  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { isDirty, errors }
  } = useForm<QuietHoursFormData>({
    resolver: zodResolver(quietHoursSchema),
    defaultValues: {
      enabled: false,
      start: '22:00',
      end: '07:00',
      timezone: detectedTimezone,
      weekdays_only: false,
      holiday_mode: false
    }
  })

  const watchedValues = watch()

  // Component loads preferences automatically via useNotificationManager

  // Set form values when preferences load
  useEffect(() => {
    if (preferences && preferences.quiet_hours) {
      const quietHours = preferences.quiet_hours as QuietHours
      reset({
        enabled: quietHours.enabled ?? false,
        start: quietHours.start ?? '22:00',
        end: quietHours.end ?? '07:00',
        timezone: quietHours.timezone ?? detectedTimezone,
        weekdays_only: quietHours.weekdays_only ?? false,
        holiday_mode: quietHours.holiday_mode ?? false
      })
    } else {
      reset({
        enabled: false,
        start: '22:00',
        end: '07:00',
        timezone: detectedTimezone,
        weekdays_only: false,
        holiday_mode: false
      })
    }
  }, [preferences, reset, detectedTimezone])

  const onSubmit = async (data: QuietHoursFormData) => {
    if (!preferences) return

    try {
      const quietHours = {
        enabled: data.enabled,
        start: data.start,
        end: data.end,
        timezone: data.timezone,
        weekdays_only: data.weekdays_only,
        holiday_mode: data.holiday_mode
      }

      const success = await updatePreferences({ quiet_hours: quietHours })
      if (success) {
        onSuccess?.()
        reset(data)
      }
    } catch (err) {
      console.error('Failed to update quiet hours:', err)
    }
  }

  // Helper function to check if current time is within quiet hours
  const isCurrentlyQuiet = () => {
    if (!watchedValues.enabled || !currentTime) return false

    const now = currentTime
    const start = watchedValues.start
    const end = watchedValues.end

    // Handle overnight quiet hours (e.g., 22:00 to 07:00)
    if (start > end) {
      return now >= start || now <= end
    }

    // Handle same-day quiet hours (e.g., 12:00 to 14:00)
    return now >= start && now <= end
  }

  // Helper function to format time for display
  const formatTimeForDisplay = (time: string) => {
    const [hours, minutes] = time.split(':')
    const hour = parseInt(hours, 10)
    const period = hour >= 12 ? 'PM' : 'AM'
    const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour
    return `${displayHour}:${minutes} ${period}`
  }

  // Helper function to get next quiet hours period
  const getNextQuietPeriod = () => {
    if (!watchedValues.enabled) return null

    const now = new Date()
    const today = new Date(now)
    const tomorrow = new Date(now)
    tomorrow.setDate(tomorrow.getDate() + 1)

    const [startHour, startMin] = watchedValues.start.split(':').map(Number)
    const [endHour, endMin] = watchedValues.end.split(':').map(Number)

    const startToday = new Date(today)
    startToday.setHours(startHour, startMin, 0, 0)

    const endToday = new Date(today)
    endToday.setHours(endHour, endMin, 0, 0)

    // If end time is earlier than start time, it's overnight
    if (watchedValues.start > watchedValues.end) {
      if (now.getTime() < endToday.getTime()) {
        // Currently in quiet hours that started yesterday
        return `Until ${formatTimeForDisplay(watchedValues.end)} today`
      } else if (now.getTime() < startToday.getTime()) {
        // Before today's quiet hours start
        return `Starting ${formatTimeForDisplay(watchedValues.start)} today`
      } else {
        // After today's quiet hours start
        const endTomorrow = new Date(tomorrow)
        endTomorrow.setHours(endHour, endMin, 0, 0)
        return `Until ${formatTimeForDisplay(watchedValues.end)} tomorrow`
      }
    } else {
      // Same-day quiet hours
      if (now.getTime() < startToday.getTime()) {
        return `Starting ${formatTimeForDisplay(watchedValues.start)} today`
      } else if (now.getTime() < endToday.getTime()) {
        return `Until ${formatTimeForDisplay(watchedValues.end)} today`
      } else {
        const startTomorrow = new Date(tomorrow)
        startTomorrow.setHours(startHour, startMin, 0, 0)
        return `Starting ${formatTimeForDisplay(watchedValues.start)} tomorrow`
      }
    }
  }

  if (loading && !preferences) {
    return (
      <div className="flex items-center justify-center py-8">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900">Quiet Hours</h3>
        <p className="mt-1 text-sm text-gray-600">
          Set times when you don't want to receive notifications. Perfect for sleep, family time, or focus periods.
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
        {/* Enable/Disable Toggle */}
        <div className="flex items-start">
          <div className="flex items-center h-5">
            <input
              {...register('enabled')}
              id="enabled"
              type="checkbox"
              disabled={loading}
              className="h-4 w-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
            />
          </div>
          <div className="ml-3">
            <label htmlFor="enabled" className="text-sm font-medium text-gray-700">
              Enable Quiet Hours
            </label>
            <p className="text-sm text-gray-500">
              Turn on quiet hours to pause notifications during specific times.
            </p>
          </div>
        </div>

        {watchedValues.enabled && (
          <>
            {/* Time Range Selector */}
            <div className="bg-gray-50 rounded-lg p-4 space-y-4">
              <h4 className="text-sm font-medium text-gray-900">Time Range</h4>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Start Time */}
                <div>
                  <label htmlFor="start" className="block text-sm font-medium text-gray-700 mb-1">
                    Start Time
                  </label>
                  <Input
                    {...register('start')}
                    id="start"
                    type="time"
                    disabled={loading}
                    className={errors.start ? 'border-red-300' : ''}
                  />
                  {errors.start && (
                    <p className="mt-1 text-sm text-red-600">{errors.start.message}</p>
                  )}
                </div>

                {/* End Time */}
                <div>
                  <label htmlFor="end" className="block text-sm font-medium text-gray-700 mb-1">
                    End Time
                  </label>
                  <Input
                    {...register('end')}
                    id="end"
                    type="time"
                    disabled={loading}
                    className={errors.end ? 'border-red-300' : ''}
                  />
                  {errors.end && (
                    <p className="mt-1 text-sm text-red-600">{errors.end.message}</p>
                  )}
                </div>
              </div>

              {/* Visual Time Range Display */}
              <div className="mt-4">
                <div className="text-sm text-gray-600 mb-2">Quiet Hours Period</div>
                <div className="bg-white rounded-md border border-gray-200 p-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium text-gray-900">
                      {formatTimeForDisplay(watchedValues.start)}
                    </span>
                    <div className="flex-1 mx-4">
                      <div className="relative">
                        <div className="h-2 bg-primary-100 rounded-full">
                          <div className="h-2 bg-primary-600 rounded-full w-full"></div>
                        </div>
                        <div className="absolute inset-y-0 left-0 flex items-center">
                          <div className="w-3 h-3 bg-primary-600 rounded-full border-2 border-white shadow"></div>
                        </div>
                        <div className="absolute inset-y-0 right-0 flex items-center">
                          <div className="w-3 h-3 bg-primary-600 rounded-full border-2 border-white shadow"></div>
                        </div>
                      </div>
                    </div>
                    <span className="font-medium text-gray-900">
                      {formatTimeForDisplay(watchedValues.end)}
                    </span>
                  </div>
                  <div className="mt-2 text-xs text-gray-500 text-center">
                    {watchedValues.start > watchedValues.end ? 'Overnight' : 'Same day'} quiet period
                  </div>
                </div>
              </div>
            </div>

            {/* Timezone Display */}
            <div className="bg-blue-50 rounded-lg p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h4 className="text-sm font-medium text-blue-900">Timezone Information</h4>
                  <div className="mt-1 text-sm text-blue-700">
                    <p>Current time: <span className="font-medium">{currentTime}</span></p>
                    <p>Timezone: <span className="font-medium">{detectedTimezone}</span></p>
                  </div>
                </div>
              </div>
            </div>

            {/* Quiet Hours Preview */}
            <div className={`rounded-lg p-4 ${isCurrentlyQuiet() ? 'bg-purple-50 border border-purple-200' : 'bg-gray-50 border border-gray-200'}`}>
              <div className="flex">
                <div className="flex-shrink-0">
                  {isCurrentlyQuiet() ? (
                    <svg className="h-5 w-5 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                    </svg>
                  ) : (
                    <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-5 5v-5zM4.815 5.185A9.972 9.972 0 0112 3c1.41 0 2.73.28 3.95.785M18.815 5.185A9.972 9.972 0 0121 12c0 1.41-.28 2.73-.785 3.95M5.185 18.815A9.972 9.972 0 003 12c0-1.41.28-2.73.785-3.95" />
                    </svg>
                  )}
                </div>
                <div className="ml-3">
                  <h4 className={`text-sm font-medium ${isCurrentlyQuiet() ? 'text-purple-900' : 'text-gray-900'}`}>
                    {isCurrentlyQuiet() ? 'Quiet Hours Active' : 'Preview'}
                  </h4>
                  <div className={`mt-1 text-sm ${isCurrentlyQuiet() ? 'text-purple-700' : 'text-gray-600'}`}>
                    {isCurrentlyQuiet() ? (
                      <p>Notifications are currently paused. {getNextQuietPeriod()}</p>
                    ) : (
                      <p>Next quiet period: {getNextQuietPeriod()}</p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Additional Options */}
            <div className="space-y-4">
              {/* Weekdays Only */}
              <div className="flex items-start">
                <div className="flex items-center h-5">
                  <input
                    {...register('weekdays_only')}
                    id="weekdays_only"
                    type="checkbox"
                    disabled={loading}
                    className="h-4 w-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                  />
                </div>
                <div className="ml-3">
                  <label htmlFor="weekdays_only" className="text-sm font-medium text-gray-700">
                    Weekdays Only
                  </label>
                  <p className="text-sm text-gray-500">
                    Apply quiet hours only on weekdays (Monday-Friday).
                  </p>
                </div>
              </div>

              {/* Holiday Mode */}
              <div className="flex items-start">
                <div className="flex items-center h-5">
                  <input
                    {...register('holiday_mode')}
                    id="holiday_mode"
                    type="checkbox"
                    disabled={loading}
                    className="h-4 w-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                  />
                </div>
                <div className="ml-3">
                  <label htmlFor="holiday_mode" className="text-sm font-medium text-gray-700">
                    Holiday Mode
                  </label>
                  <p className="text-sm text-gray-500">
                    Extend quiet hours for holidays and vacation periods.
                  </p>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Information */}
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h4 className="text-sm font-medium text-gray-900">About Quiet Hours</h4>
              <div className="mt-1 text-sm text-gray-600">
                <p>
                  During quiet hours, you won't receive notifications via email or push notifications.
                  Urgent notifications and security alerts will still be delivered.
                  Notifications will be queued and delivered when quiet hours end.
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
              'Save Settings'
            )}
          </Button>
        </div>
      </form>
    </div>
  )
}