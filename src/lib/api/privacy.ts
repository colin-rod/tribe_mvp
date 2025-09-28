import { createClient } from '@/lib/supabase/client'
import { createLogger } from '@/lib/logger'
import type { PrivacyFormData } from '@/lib/types/profile'

const logger = createLogger('privacy-api')

export interface PrivacySettings {
  id: string
  user_id: string
  profile_visibility: 'public' | 'private' | 'friends'
  data_sharing: boolean
  analytics_opt_out: boolean
  delete_after_inactivity: boolean
  last_export_requested_at?: string
  last_export_completed_at?: string
  last_export_download_url?: string
  last_export_expires_at?: string
  deletion_requested_at?: string
  deletion_scheduled_for?: string
  deletion_completed_at?: string
  created_at: string
  updated_at: string
}

export interface DataExportJob {
  id: string
  user_id: string
  export_type: 'full' | 'minimal' | 'media_only'
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'expired'
  file_size_bytes?: number
  download_url?: string
  expires_at?: string
  started_at?: string
  completed_at?: string
  error_message?: string
  created_at: string
}

export interface DataDeletionAudit {
  id: string
  user_id: string
  deletion_type: 'user_requested' | 'inactivity_cleanup' | 'gdpr_compliance' | 'account_closure'
  deleted_tables: string[]
  deleted_records_count: number
  deleted_files_count: number
  deleted_storage_bytes: number
  retained_data?: string[]
  retention_period?: string
  requested_by?: string
  approved_by?: string
  executed_at: string
  notes?: string
  created_at: string
}

export class PrivacyAPIError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: unknown
  ) {
    super(message)
    this.name = 'PrivacyAPIError'
  }
}

/**
 * Get current user's privacy settings
 */
export async function getPrivacySettings(): Promise<PrivacySettings | null> {
  const supabase = createClient()

  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      throw new PrivacyAPIError('User not authenticated', 'AUTH_REQUIRED')
    }

    const { data, error } = await supabase
      .from('privacy_settings')
      .select('*')
      .eq('user_id', user.id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        // No privacy settings found, create default ones
        return await createDefaultPrivacySettings()
      }
      throw new PrivacyAPIError('Failed to fetch privacy settings', 'FETCH_ERROR', error)
    }

    return data
  } catch (error) {
    if (error instanceof PrivacyAPIError) {
      throw error
    }
    logger.errorWithStack('Error getting privacy settings:', error as Error)
    throw new PrivacyAPIError('Internal error getting privacy settings', 'INTERNAL_ERROR', error)
  }
}

/**
 * Create default privacy settings for current user
 */
export async function createDefaultPrivacySettings(): Promise<PrivacySettings> {
  const supabase = createClient()

  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      throw new PrivacyAPIError('User not authenticated', 'AUTH_REQUIRED')
    }

    const { data, error } = await supabase
      .rpc('create_default_privacy_settings', { user_id: user.id })

    if (error) {
      throw new PrivacyAPIError('Failed to create default privacy settings', 'CREATE_ERROR', error)
    }

    // Fetch the created settings
    const settings = await getPrivacySettings()
    if (!settings) {
      throw new PrivacyAPIError('Failed to retrieve created privacy settings', 'FETCH_ERROR')
    }

    return settings
  } catch (error) {
    if (error instanceof PrivacyAPIError) {
      throw error
    }
    logger.errorWithStack('Error creating default privacy settings:', error as Error)
    throw new PrivacyAPIError('Internal error creating privacy settings', 'INTERNAL_ERROR', error)
  }
}

/**
 * Update privacy settings
 */
export async function updatePrivacySettings(settings: Partial<PrivacyFormData>): Promise<PrivacySettings> {
  const supabase = createClient()

  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      throw new PrivacyAPIError('User not authenticated', 'AUTH_REQUIRED')
    }

    // Validate the settings
    const validatedSettings = validatePrivacySettings(settings)

    // Use the database function to update settings
    const { data, error } = await supabase
      .rpc('update_privacy_settings', {
        user_id: user.id,
        profile_visibility_new: validatedSettings.profileVisibility,
        data_sharing_new: validatedSettings.dataSharing,
        analytics_opt_out_new: validatedSettings.analyticsOptOut,
        delete_after_inactivity_new: validatedSettings.deleteAfterInactivity
      })

    if (error || !data) {
      throw new PrivacyAPIError('Failed to update privacy settings', 'UPDATE_ERROR', error)
    }

    // Fetch the updated settings
    const updatedSettings = await getPrivacySettings()
    if (!updatedSettings) {
      throw new PrivacyAPIError('Failed to retrieve updated privacy settings', 'FETCH_ERROR')
    }

    logger.info('Privacy settings updated successfully', {
      user_id: user.id,
      settings: validatedSettings
    })

    return updatedSettings
  } catch (error) {
    if (error instanceof PrivacyAPIError) {
      throw error
    }
    logger.errorWithStack('Error updating privacy settings:', error as Error)
    throw new PrivacyAPIError('Internal error updating privacy settings', 'INTERNAL_ERROR', error)
  }
}

/**
 * Request data export
 */
export async function requestDataExport(exportType: 'full' | 'minimal' | 'media_only' = 'full'): Promise<Blob> {
  const supabase = createClient()

  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      throw new PrivacyAPIError('User not authenticated', 'AUTH_REQUIRED')
    }

    // Get the session for authorization
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      throw new PrivacyAPIError('No active session', 'AUTH_REQUIRED')
    }

    // Call the data export edge function
    const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/data-export`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ export_type: exportType })
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new PrivacyAPIError(
        errorData.error || 'Failed to export data',
        'EXPORT_ERROR',
        errorData
      )
    }

    const blob = await response.blob()
    logger.info('Data export completed successfully', {
      user_id: user.id,
      export_type: exportType,
      file_size: blob.size
    })

    return blob
  } catch (error) {
    if (error instanceof PrivacyAPIError) {
      throw error
    }
    logger.errorWithStack('Error requesting data export:', error as Error)
    throw new PrivacyAPIError('Internal error requesting data export', 'INTERNAL_ERROR', error)
  }
}

/**
 * Request data deletion
 */
export async function requestDataDeletion(
  deletionType: 'user_requested' | 'inactivity_cleanup' | 'gdpr_compliance' | 'account_closure' = 'user_requested',
  confirmDeletion: boolean = false
): Promise<DataDeletionAudit> {
  const supabase = createClient()

  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      throw new PrivacyAPIError('User not authenticated', 'AUTH_REQUIRED')
    }

    if (!confirmDeletion) {
      throw new PrivacyAPIError(
        'Data deletion must be explicitly confirmed',
        'CONFIRMATION_REQUIRED'
      )
    }

    // Get the session for authorization
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      throw new PrivacyAPIError('No active session', 'AUTH_REQUIRED')
    }

    // Call the data deletion edge function
    const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/data-deletion`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        deletion_type: deletionType,
        confirm_deletion: confirmDeletion,
        keep_audit_trail: true
      })
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new PrivacyAPIError(
        errorData.error || 'Failed to delete data',
        'DELETION_ERROR',
        errorData
      )
    }

    const result = await response.json()
    logger.info('Data deletion completed successfully', {
      user_id: user.id,
      deletion_type: deletionType,
      details: result.details
    })

    return result.details
  } catch (error) {
    if (error instanceof PrivacyAPIError) {
      throw error
    }
    logger.errorWithStack('Error requesting data deletion:', error as Error)
    throw new PrivacyAPIError('Internal error requesting data deletion', 'INTERNAL_ERROR', error)
  }
}

/**
 * Get user's data export history
 */
export async function getDataExportHistory(): Promise<DataExportJob[]> {
  const supabase = createClient()

  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      throw new PrivacyAPIError('User not authenticated', 'AUTH_REQUIRED')
    }

    const { data, error } = await supabase
      .from('data_export_jobs')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (error) {
      throw new PrivacyAPIError('Failed to fetch export history', 'FETCH_ERROR', error)
    }

    return data || []
  } catch (error) {
    if (error instanceof PrivacyAPIError) {
      throw error
    }
    logger.errorWithStack('Error getting export history:', error as Error)
    throw new PrivacyAPIError('Internal error getting export history', 'INTERNAL_ERROR', error)
  }
}

/**
 * Get user's data deletion audit history
 */
export async function getDataDeletionHistory(): Promise<DataDeletionAudit[]> {
  const supabase = createClient()

  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      throw new PrivacyAPIError('User not authenticated', 'AUTH_REQUIRED')
    }

    const { data, error } = await supabase
      .from('data_deletion_audit')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (error) {
      throw new PrivacyAPIError('Failed to fetch deletion history', 'FETCH_ERROR', error)
    }

    return data || []
  } catch (error) {
    if (error instanceof PrivacyAPIError) {
      throw error
    }
    logger.errorWithStack('Error getting deletion history:', error as Error)
    throw new PrivacyAPIError('Internal error getting deletion history', 'INTERNAL_ERROR', error)
  }
}

/**
 * Validate privacy settings before sending to API
 */
function validatePrivacySettings(settings: Partial<PrivacyFormData>): PrivacyFormData {
  const defaultSettings: PrivacyFormData = {
    profileVisibility: 'friends',
    dataSharing: false,
    analyticsOptOut: false,
    deleteAfterInactivity: false
  }

  const validated: PrivacyFormData = {
    profileVisibility: settings.profileVisibility || defaultSettings.profileVisibility,
    dataSharing: settings.dataSharing ?? defaultSettings.dataSharing,
    analyticsOptOut: settings.analyticsOptOut ?? defaultSettings.analyticsOptOut,
    deleteAfterInactivity: settings.deleteAfterInactivity ?? defaultSettings.deleteAfterInactivity
  }

  // Validate profileVisibility
  if (!['public', 'private', 'friends'].includes(validated.profileVisibility)) {
    throw new PrivacyAPIError('Invalid profile visibility setting', 'VALIDATION_ERROR')
  }

  return validated
}

/**
 * Download file from blob
 */
export function downloadBlob(blob: Blob, filename: string): void {
  try {
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.URL.revokeObjectURL(url)
  } catch (error) {
    logger.errorWithStack('Error downloading file:', error as Error)
    throw new PrivacyAPIError('Failed to download file', 'DOWNLOAD_ERROR', error)
  }
}

/**
 * Convert privacy settings from database format to form format
 */
export function convertPrivacySettingsToForm(settings: PrivacySettings): PrivacyFormData {
  return {
    profileVisibility: settings.profile_visibility,
    dataSharing: settings.data_sharing,
    analyticsOptOut: settings.analytics_opt_out,
    deleteAfterInactivity: settings.delete_after_inactivity
  }
}

/**
 * Update user metadata with privacy settings (for compatibility)
 */
export async function updateUserMetadataPrivacySettings(settings: PrivacyFormData): Promise<void> {
  const supabase = createClient()

  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      throw new PrivacyAPIError('User not authenticated', 'AUTH_REQUIRED')
    }

    const { error } = await supabase.auth.updateUser({
      data: {
        ...user.user_metadata,
        profileVisibility: settings.profileVisibility,
        dataSharing: settings.dataSharing,
        analyticsOptOut: settings.analyticsOptOut,
        deleteAfterInactivity: settings.deleteAfterInactivity
      }
    })

    if (error) {
      throw new PrivacyAPIError('Failed to update user metadata', 'UPDATE_ERROR', error)
    }
  } catch (error) {
    if (error instanceof PrivacyAPIError) {
      throw error
    }
    logger.errorWithStack('Error updating user metadata:', error as Error)
    throw new PrivacyAPIError('Internal error updating user metadata', 'INTERNAL_ERROR', error)
  }
}