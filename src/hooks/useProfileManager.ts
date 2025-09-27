'use client'

import { useState, useCallback, useRef } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { createClient } from '@/lib/supabase/client'
import { uploadChildPhoto } from '@/lib/photo-upload'
import type { Database } from '@/lib/types/database'
import type { PersonalInfoFormData, SecurityFormData, NotificationPreferencesData } from '@/lib/validation/profile'
import type { NotificationPreferences, NotificationFormData } from '@/lib/types/profile'
import { convertFormToPreferences, convertPreferencesToForm, safeConvertToFormData } from '@/lib/types/profile'
import { createLogger } from '@/lib/logger'

type Profile = Database['public']['Tables']['profiles']['Row']
type ProfileUpdate = Database['public']['Tables']['profiles']['Update']

export interface UseProfileManagerReturn {
  profile: Profile | null
  loading: boolean
  error: string | null
  updatePersonalInfo: (data: PersonalInfoFormData) => Promise<void>
  updateSecurity: (data: SecurityFormData) => Promise<void>
  updateNotificationPreferences: (data: NotificationPreferencesData | Partial<NotificationPreferences>) => Promise<void>
  getNotificationPreferences: () => NotificationPreferences | null
  convertFormData: (formData: NotificationPreferencesData) => Partial<NotificationPreferences>
  convertToFormData: (preferences: NotificationPreferences) => NotificationPreferencesData
  exportData: () => Promise<void>
  refreshProfile: () => Promise<void>
}

export function useProfileManager(): UseProfileManagerReturn {
  const { user, refreshSession } = useAuth()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const loggerRef = useRef(createLogger('useProfileManager'))

  const supabase = createClient()

  const refreshProfile = useCallback(async () => {
    if (!user) return

    try {
      setLoading(true)
      setError(null)

      const { data, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      if (profileError) {
        throw new Error(`Failed to fetch profile: ${profileError.message}`)
      }

      setProfile(data)
    } catch (err) {
      loggerRef.current.errorWithStack('Failed to fetch profile', err as Error, { userId: user?.id })
      setError(err instanceof Error ? err.message : 'Failed to fetch profile')
    } finally {
      setLoading(false)
    }
  }, [user, supabase])

  const updatePersonalInfo = useCallback(async (data: PersonalInfoFormData) => {
    if (!user || !profile) {
      throw new Error('User or profile not found')
    }

    try {
      setLoading(true)
      setError(null)

      const updates: ProfileUpdate = {
        name: data.name.trim(),
        email: data.email.trim(),
        updated_at: new Date().toISOString()
      }

      // Handle profile photo upload if provided
      if (data.profile_photo) {
        try {
          // Upload to same storage structure as child photos for consistency
          const photoUrl = await uploadChildPhoto(data.profile_photo, `profile_${user.id}`)
          // You may want to add a profile_photo_url field to the profiles table
          loggerRef.current.info('Profile photo uploaded successfully', { photoUrl, userId: user.id })
        } catch (photoError) {
          loggerRef.current.warn('Failed to upload profile photo', { error: String(photoError), userId: user.id })
          // Continue with other updates even if photo upload fails
        }
      }

      // Update profile in database
      const { data: updatedProfile, error: updateError } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', user.id)
        .select()
        .single()

      if (updateError) {
        throw new Error(`Failed to update profile: ${updateError.message}`)
      }

      // Update user metadata if email changed
      if (data.email !== user.email) {
        const { error: authError } = await supabase.auth.updateUser({
          email: data.email
        })

        if (authError) {
          loggerRef.current.warn('Failed to update auth email', { error: authError.message, userId: user.id })
          // Continue anyway since the profile was updated
        }
      }

      // Update user metadata if name changed
      if (data.name !== user.user_metadata?.name) {
        const { error: metadataError } = await supabase.auth.updateUser({
          data: { name: data.name }
        })

        if (metadataError) {
          loggerRef.current.warn('Failed to update user metadata', { error: metadataError.message, userId: user.id })
        }
      }

      setProfile(updatedProfile)

      // Refresh the session to get updated metadata
      await refreshSession()
    } catch (err) {
      loggerRef.current.errorWithStack('Failed to update personal info', err as Error, { userId: user.id })
      const errorMessage = err instanceof Error ? err.message : 'Failed to update personal information'
      setError(errorMessage)
      throw new Error(errorMessage)
    } finally {
      setLoading(false)
    }
  }, [user, profile, supabase, refreshSession])

  const updateSecurity = useCallback(async (data: SecurityFormData) => {
    if (!user) {
      throw new Error('User not found')
    }

    try {
      setLoading(true)
      setError(null)

      // Update password using Supabase auth
      const { error: passwordError } = await supabase.auth.updateUser({
        password: data.newPassword
      })

      if (passwordError) {
        throw new Error(`Failed to update password: ${passwordError.message}`)
      }

      // Refresh the session after password change
      await refreshSession()
    } catch (err) {
      loggerRef.current.errorWithStack('Failed to update security settings', err as Error, { userId: user.id })
      const errorMessage = err instanceof Error ? err.message : 'Failed to update security settings'
      setError(errorMessage)
      throw new Error(errorMessage)
    } finally {
      setLoading(false)
    }
  }, [user, supabase, refreshSession])

  const updateNotificationPreferences = useCallback(async (data: NotificationPreferencesData | Partial<NotificationPreferences>) => {
    if (!user || !profile) {
      throw new Error('User or profile not found')
    }

    try {
      setLoading(true)
      setError(null)

      // Convert form data to database format if needed
      let notificationPreferences: Partial<NotificationPreferences>

      if ('emailNotifications' in data) {
        // Form data - convert to database format
        const safeFormData = safeConvertToFormData(data as Partial<NotificationFormData>)
        notificationPreferences = convertFormToPreferences(safeFormData)
      } else {
        // Already in database format
        notificationPreferences = data as Partial<NotificationPreferences>
      }

      const updates: ProfileUpdate = {
        notification_preferences: notificationPreferences,
        updated_at: new Date().toISOString()
      }

      const { data: updatedProfile, error: updateError } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', user.id)
        .select()
        .single()

      if (updateError) {
        throw new Error(`Failed to update notification preferences: ${updateError.message}`)
      }

      setProfile(updatedProfile)
    } catch (err) {
      loggerRef.current.errorWithStack('Failed to update notification preferences', err as Error, { userId: user.id })
      const errorMessage = err instanceof Error ? err.message : 'Failed to update notification preferences'
      setError(errorMessage)
      throw new Error(errorMessage)
    } finally {
      setLoading(false)
    }
  }, [user, profile, supabase])

  const getNotificationPreferences = useCallback((): NotificationPreferences | null => {
    if (!profile?.notification_preferences) return null
    // Type assertion is safe here as we know the structure from the database
    return profile.notification_preferences as unknown as NotificationPreferences
  }, [profile])

  const convertFormData = useCallback((formData: NotificationPreferencesData): Partial<NotificationPreferences> => {
    const safeFormData = safeConvertToFormData(formData as Partial<NotificationFormData>)
    return convertFormToPreferences(safeFormData)
  }, [])

  const convertToFormData = useCallback((preferences: NotificationPreferences): NotificationPreferencesData => {
    const fullFormData = convertPreferencesToForm(preferences)
    // Convert to the simplified NotificationPreferencesData format
    return {
      emailNotifications: fullFormData.emailNotifications,
      pushNotifications: fullFormData.pushNotifications,
      responseNotifications: fullFormData.responseNotifications,
      weeklyDigest: fullFormData.weeklyDigest,
      marketingEmails: fullFormData.marketingEmails
    }
  }, [])

  const exportData = useCallback(async () => {
    if (!user) {
      throw new Error('User not found')
    }

    try {
      setLoading(true)
      setError(null)

      // Import the data export functionality
      const { exportUserData } = await import('@/lib/data-export')
      await exportUserData(user.id)
    } catch (err) {
      loggerRef.current.errorWithStack('Failed to export user data', err as Error, { userId: user.id })
      const errorMessage = err instanceof Error ? err.message : 'Failed to export data'
      setError(errorMessage)
      throw new Error(errorMessage)
    } finally {
      setLoading(false)
    }
  }, [user])

  return {
    profile,
    loading,
    error,
    updatePersonalInfo,
    updateSecurity,
    updateNotificationPreferences,
    getNotificationPreferences,
    convertFormData,
    convertToFormData,
    exportData,
    refreshProfile
  }
}
