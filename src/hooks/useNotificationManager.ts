'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { NotificationPreferences } from '@/lib/types/profile'

export function useNotificationManager() {
  const [preferences, setPreferences] = useState<NotificationPreferences | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const getDefaultPreferences = (): NotificationPreferences => ({
    response_notifications: 'immediate',
    prompt_frequency: 'every_3_days',
    enabled_prompt_types: ['milestone', 'activity', 'fun'],
    quiet_hours: { start: '22:00', end: '07:00' },
    delivery_notifications: true,
    system_notifications: true,
    weekly_digest: true,
    weekly_digest_day: 'sunday',
    monthly_summary: false,
    browser_notifications: true,
    email_notifications: true,
    digest_email_time: '09:00'
  })

  const loadPreferences = useCallback(async () => {
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      // Use the database function to get preferences with defaults
      const { data, error } = await supabase
        .rpc('get_notification_preferences', { user_uuid: user.id })

      if (error) throw error

      setPreferences(data || getDefaultPreferences())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load preferences')
      // Set default preferences even on error so UI can still function
      setPreferences(getDefaultPreferences())
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadPreferences()
  }, [loadPreferences])

  const updatePreferences = async (updates: Partial<NotificationPreferences>) => {
    if (!preferences) return false

    setSaving(true)
    setError(null)

    try {
      const newPreferences = { ...preferences, ...updates }
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const { error } = await supabase
        .from('profiles')
        .update({
          notification_preferences: newPreferences,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id)

      if (error) throw error

      setPreferences(newPreferences)
      return true
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update preferences')
      return false
    } finally {
      setSaving(false)
    }
  }

  const sendTestNotification = async (type: 'browser' | 'email' = 'browser') => {
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const { notificationService } = await import('@/lib/services/notificationService')

      if (type === 'browser') {
        await notificationService.sendBrowserNotification(user.id, {
          title: 'Test Notification',
          body: 'This is a test notification from Tribe.',
          tag: 'tribe-test'
        })
        return true
      } else if (type === 'email') {
        await notificationService.sendTestEmailNotification(
          user.id,
          user.email || '',
          'system'
        )
        return true
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send test notification')
      return false
    }
    return false
  }

  const isInQuietHours = (date: Date = new Date()): boolean => {
    if (!preferences?.quiet_hours) return false

    const now = date.toTimeString().slice(0, 5) // HH:MM format
    const { start, end } = preferences.quiet_hours

    // Handle overnight quiet hours (e.g., 22:00 to 07:00)
    if (start > end) {
      return now >= start || now <= end
    }

    // Handle same-day quiet hours (e.g., 12:00 to 14:00)
    return now >= start && now <= end
  }

  const getNextNotificationTime = (): Date | null => {
    if (!preferences?.quiet_hours) return null

    const now = new Date()
    if (!isInQuietHours(now)) return null

    const { end } = preferences.quiet_hours
    const [hours, minutes] = end.split(':').map(Number)

    const nextNotification = new Date(now)
    nextNotification.setHours(hours, minutes, 0, 0)

    // If end time is earlier than current time, it's tomorrow
    if (nextNotification <= now) {
      nextNotification.setDate(nextNotification.getDate() + 1)
    }

    return nextNotification
  }

  return {
    preferences,
    loading,
    saving,
    error,
    updatePreferences,
    sendTestNotification,
    isInQuietHours,
    getNextNotificationTime,
    refreshPreferences: loadPreferences
  }
}
