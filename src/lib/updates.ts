import { createClient } from './supabase/client'
import type { DistributionStatus, MilestoneType } from './validation/update'
import { createLogger } from '@/lib/logger'


const logger = createLogger('Updates')
export interface Update {
  id: string
  parent_id: string
  child_id: string
  content: string
  /** Optional email subject line for email-formatted updates */
  subject?: string
  /** Rich content stored as JSONB for advanced formatting (Quill Delta, HTML, etc.) */
  rich_content?: Record<string, unknown>
  /** Format type indicating how the content should be rendered and distributed */
  content_format?: 'plain' | 'rich' | 'email' | 'sms' | 'whatsapp'
  media_urls: string[]
  milestone_type?: MilestoneType
  ai_analysis: Record<string, unknown>
  suggested_recipients: string[]
  confirmed_recipients: string[]
  distribution_status: DistributionStatus
  created_at: string
  scheduled_for?: string
  sent_at?: string
}

export interface CreateUpdateRequest {
  child_id: string
  content: string
  /** Optional email subject line for email-formatted updates */
  subject?: string
  /** Rich content stored as JSONB for advanced formatting (Quill Delta, HTML, etc.) */
  rich_content?: Record<string, unknown>
  /** Format type indicating how the content should be rendered and distributed */
  content_format?: 'plain' | 'rich' | 'email' | 'sms' | 'whatsapp'
  milestone_type?: MilestoneType
  media_urls?: string[]
  scheduled_for?: Date
  confirmed_recipients?: string[]
  ai_analysis?: Record<string, unknown>
  suggested_recipients?: string[]
}

export type UpdateWithStats = Update & {
  response_count: number
  last_response_at: string | null
  has_unread_responses: boolean
  // Engagement fields
  like_count: number
  comment_count: number
  isLiked: boolean
}

/**
 * Create a new update
 */
export async function createUpdate(updateData: CreateUpdateRequest): Promise<Update> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) throw new Error('Not authenticated')

  const { data, error } = await supabase
    .from('updates')
    .insert({
      parent_id: user.id,
      child_id: updateData.child_id,
      content: updateData.content,
      subject: updateData.subject,
      rich_content: updateData.rich_content,
      content_format: updateData.content_format || 'plain',
      milestone_type: updateData.milestone_type,
      media_urls: updateData.media_urls || [],
      ai_analysis: updateData.ai_analysis || {},
      suggested_recipients: updateData.suggested_recipients || [],
      confirmed_recipients: updateData.confirmed_recipients || [],
      distribution_status: updateData.scheduled_for ? 'scheduled' : 'draft',
      scheduled_for: updateData.scheduled_for?.toISOString()
    })
    .select()
    .single()

  if (error) throw error
  return data
}

/**
 * Get updates for the current user
 */
export async function getUpdates(limit?: number): Promise<Update[]> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) throw new Error('Not authenticated')

  let query = supabase
    .from('updates')
    .select(`
      *,
      children:child_id (
        name,
        birth_date,
        profile_photo_url
      )
    `)
    .eq('parent_id', user.id)
    .order('created_at', { ascending: false })

  if (limit) {
    query = query.limit(limit)
  }

  const { data, error } = await query

  if (error) throw error
  return data || []
}

/**
 * Get a specific update by ID
 */
export async function getUpdateById(updateId: string): Promise<Update | null> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) throw new Error('Not authenticated')

  const { data, error } = await supabase
    .from('updates')
    .select(`
      *,
      children:child_id (
        name,
        birth_date,
        profile_photo_url
      )
    `)
    .eq('id', updateId)
    .eq('parent_id', user.id)
    .single()

  if (error) {
    if (error.code === 'PGRST116') return null
    throw error
  }
  return data
}

/**
 * Update an existing update
 */
export async function updateUpdate(
  updateId: string,
  updates: Partial<Omit<Update, 'id' | 'parent_id' | 'created_at'>>
): Promise<Update> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) throw new Error('Not authenticated')

  const { data, error } = await supabase
    .from('updates')
    .update(updates)
    .eq('id', updateId)
    .eq('parent_id', user.id)
    .select()
    .single()

  if (error) throw error
  return data
}

/**
 * Delete an update
 */
export async function deleteUpdate(updateId: string): Promise<void> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) throw new Error('Not authenticated')

  // First get the update to check for media files
  const { data: update, error: fetchError } = await supabase
    .from('updates')
    .select('media_urls')
    .eq('id', updateId)
    .eq('parent_id', user.id)
    .single()

  if (fetchError) throw fetchError

  // Delete the update from database
  const { error } = await supabase
    .from('updates')
    .delete()
    .eq('id', updateId)
    .eq('parent_id', user.id)

  if (error) throw error

  // Delete associated media files from storage
  if (update.media_urls && update.media_urls.length > 0) {
    try {
      const filePaths = update.media_urls.map((url: string) => {
        // Extract file path from URL
        const urlParts = url.split('/')
        const fileName = urlParts[urlParts.length - 1].split('?')[0]
        return `${user.id}/updates/${updateId}/${fileName}`
      })

      const { error: storageError } = await supabase.storage
        .from('media')
        .remove(filePaths)

      if (storageError) {
        logger.warn('Failed to delete media files from storage:', { data: storageError })
      }
    } catch (error) {
      logger.warn('Error deleting media files:', { data: error })
    }
  }
}

/**
 * Mark an update as sent
 */
export async function markUpdateAsSent(updateId: string): Promise<Update> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) throw new Error('Not authenticated')

  const { data, error } = await supabase
    .from('updates')
    .update({
      distribution_status: 'sent',
      sent_at: new Date().toISOString()
    })
    .eq('id', updateId)
    .eq('parent_id', user.id)
    .select()
    .single()

  if (error) throw error
  return data
}

/**
 * Update recipients for an update
 */
export async function updateUpdateRecipients(
  updateId: string,
  suggestedRecipients: string[],
  confirmedRecipients: string[]
): Promise<Update> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) throw new Error('Not authenticated')

  const { data, error } = await supabase
    .from('updates')
    .update({
      suggested_recipients: suggestedRecipients,
      confirmed_recipients: confirmedRecipients
    })
    .eq('id', updateId)
    .eq('parent_id', user.id)
    .select()
    .single()

  if (error) throw error
  return data
}

/**
 * Update AI analysis for an update
 */
export async function updateUpdateAIAnalysis(
  updateId: string,
  aiAnalysis: Record<string, unknown>
): Promise<Update> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) throw new Error('Not authenticated')

  const { data, error } = await supabase
    .from('updates')
    .update({
      ai_analysis: aiAnalysis
    })
    .eq('id', updateId)
    .eq('parent_id', user.id)
    .select()
    .single()

  if (error) throw error
  return data
}

/**
 * Update media URLs for an update
 */
export async function updateUpdateMediaUrls(
  updateId: string,
  mediaUrls: string[]
): Promise<Update> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) throw new Error('Not authenticated')

  const { data, error } = await supabase
    .from('updates')
    .update({
      media_urls: mediaUrls
    })
    .eq('id', updateId)
    .eq('parent_id', user.id)
    .select()
    .single()

  if (error) throw error
  return data
}

/**
 * Get updates by child ID
 */
export async function getUpdatesByChild(childId: string): Promise<Update[]> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) throw new Error('Not authenticated')

  const { data, error } = await supabase
    .from('updates')
    .select('*')
    .eq('parent_id', user.id)
    .eq('child_id', childId)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data || []
}

/**
 * Get recent updates (last 30 days)
 */
export async function getRecentUpdates(): Promise<Update[]> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) throw new Error('Not authenticated')

  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

  const { data, error } = await supabase
    .from('updates')
    .select(`
      *,
      children:child_id (
        name,
        birth_date,
        profile_photo_url
      )
    `)
    .eq('parent_id', user.id)
    .gte('created_at', thirtyDaysAgo.toISOString())
    .order('created_at', { ascending: false })

  if (error) throw error
  return data || []
}

/**
 * Schedule an update for later sending
 */
export async function scheduleUpdate(
  updateId: string,
  scheduledFor: Date
): Promise<Update> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) throw new Error('Not authenticated')

  const { data, error } = await supabase
    .from('updates')
    .update({
      scheduled_for: scheduledFor.toISOString(),
      distribution_status: 'scheduled'
    })
    .eq('id', updateId)
    .eq('parent_id', user.id)
    .select()
    .single()

  if (error) throw error
  return data
}

/**
 * Get draft updates
 */
export async function getDraftUpdates(): Promise<Update[]> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) throw new Error('Not authenticated')

  const { data, error } = await supabase
    .from('updates')
    .select(`
      *,
      children:child_id (
        name,
        birth_date,
        profile_photo_url
      )
    `)
    .eq('parent_id', user.id)
    .eq('distribution_status', 'draft')
    .order('created_at', { ascending: false })

  if (error) throw error
  return data || []
}

/**
 * Update subject and content format for an update
 */
export async function updateUpdateContent(
  updateId: string,
  content?: string,
  subject?: string,
  richContent?: Record<string, unknown>,
  contentFormat?: 'plain' | 'rich' | 'email' | 'sms' | 'whatsapp'
): Promise<Update> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) throw new Error('Not authenticated')

  const updateData: Partial<Update> = {}
  if (content !== undefined) updateData.content = content
  if (subject !== undefined) updateData.subject = subject
  if (richContent !== undefined) updateData.rich_content = richContent
  if (contentFormat !== undefined) updateData.content_format = contentFormat

  const { data, error } = await supabase
    .from('updates')
    .update(updateData)
    .eq('id', updateId)
    .eq('parent_id', user.id)
    .select()
    .single()

  if (error) throw error
  return data
}

/**
 * Get recent updates with response counts for dashboard display
 */
export async function getRecentUpdatesWithStats(limit: number = 5): Promise<UpdateWithStats[]> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) throw new Error('Not authenticated')

  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

  // Get basic update data with child information and engagement counts
  const { data: updates, error } = await supabase
    .from('updates')
    .select(`
      *,
      children:child_id (
        id,
        name,
        birth_date,
        profile_photo_url
      )
    `)
    .eq('parent_id', user.id)
    .gte('created_at', thirtyDaysAgo.toISOString())
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) throw error

  if (!updates || updates.length === 0) {
    return []
  }

  // Get the update IDs for batch queries
  const updateIds = updates.map(update => update.id)

  // Get user's likes for these updates in a single query
  const { data: userLikes } = await supabase
    .from('likes')
    .select('update_id')
    .eq('parent_id', user.id)
    .in('update_id', updateIds)

  const likedUpdateIds = new Set(userLikes?.map(like => like.update_id) || [])

  // Get response counts and engagement data for each update
  const updatesWithStats = await Promise.all(
    updates.map(async (update) => {
      const { count } = await supabase
        .from('responses')
        .select('*', { count: 'exact', head: true })
        .eq('update_id', update.id)

      const { data: lastResponse } = await supabase
        .from('responses')
        .select('received_at')
        .eq('update_id', update.id)
        .order('received_at', { ascending: false })
        .limit(1)
        .single()

      return {
        ...update,
        response_count: count || 0,
        last_response_at: lastResponse?.received_at || null,
        has_unread_responses: false, // For now, we'll implement this later
        // Engagement fields
        like_count: update.like_count || 0,
        comment_count: update.comment_count || 0,
        isLiked: likedUpdateIds.has(update.id)
      }
    })
  )

  return updatesWithStats as UpdateWithStats[]
}
