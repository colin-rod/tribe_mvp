import { createClient } from '@/lib/supabase/client'
import { createLogger } from '@/lib/logger'
import type { DraftUpdate, DraftUpdateRequest, DraftWorkspaceSummary, ChildDraftSummary, DraftFilters } from '@/lib/types/digest'

const logger = createLogger('DraftService')

/**
 * Create a new draft update
 */
export async function createDraft(data: DraftUpdateRequest): Promise<DraftUpdate> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) throw new Error('Not authenticated')

  logger.info('Creating new draft', { childId: data.child_id, userId: user.id })

  const { data: draft, error } = await supabase
    .from('updates')
    .insert({
      parent_id: user.id,
      child_id: data.child_id,
      content: data.content || '',
      subject: data.subject,
      rich_content: data.rich_content,
      content_format: data.content_format || 'plain',
      media_urls: data.media_urls || [],
      milestone_type: data.milestone_type,
      distribution_status: 'draft',
      version: 1,
      edit_count: 0,
      last_edited_at: new Date().toISOString()
    })
    .select()
    .single()

  if (error) {
    logger.error('Failed to create draft', { error, userId: user.id })
    throw new Error(`Failed to create draft: ${error.message}`)
  }

  logger.info('Draft created successfully', { draftId: draft.id, userId: user.id })
  return draft as DraftUpdate
}

/**
 * Update an existing draft
 */
export async function updateDraft(draftId: string, data: Partial<DraftUpdateRequest>): Promise<DraftUpdate> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) throw new Error('Not authenticated')

  logger.info('Updating draft', { draftId, userId: user.id })

  const updateData: Record<string, unknown> = {
    last_edited_at: new Date().toISOString()
  }

  if (data.content !== undefined) updateData.content = data.content
  if (data.subject !== undefined) updateData.subject = data.subject
  if (data.rich_content !== undefined) updateData.rich_content = data.rich_content
  if (data.content_format !== undefined) updateData.content_format = data.content_format
  if (data.media_urls !== undefined) updateData.media_urls = data.media_urls
  if (data.milestone_type !== undefined) updateData.milestone_type = data.milestone_type

  const { data: draft, error } = await supabase
    .from('updates')
    .update(updateData)
    .eq('id', draftId)
    .eq('parent_id', user.id)
    .eq('distribution_status', 'draft')  // Can only update drafts
    .select()
    .single()

  if (error) {
    logger.error('Failed to update draft', { error, draftId, userId: user.id })
    throw new Error(`Failed to update draft: ${error.message}`)
  }

  logger.info('Draft updated successfully', { draftId, version: draft.version, userId: user.id })
  return draft as DraftUpdate
}

/**
 * Add media to an existing draft
 */
export async function addMediaToDraft(draftId: string, newMediaUrls: string[]): Promise<DraftUpdate> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) throw new Error('Not authenticated')

  logger.info('Adding media to draft', { draftId, mediaCount: newMediaUrls.length, userId: user.id })

  // First, get current media URLs
  const { data: currentDraft, error: fetchError } = await supabase
    .from('updates')
    .select('media_urls')
    .eq('id', draftId)
    .eq('parent_id', user.id)
    .single()

  if (fetchError) {
    throw new Error(`Failed to fetch draft: ${fetchError.message}`)
  }

  const currentMediaUrls = (currentDraft.media_urls as string[]) || []
  const combinedMediaUrls = [...currentMediaUrls, ...newMediaUrls]

  // Update with combined media URLs
  const { data: updatedDraft, error: updateError } = await supabase
    .from('updates')
    .update({
      media_urls: combinedMediaUrls,
      last_edited_at: new Date().toISOString()
    })
    .eq('id', draftId)
    .eq('parent_id', user.id)
    .select()
    .single()

  if (updateError) {
    logger.error('Failed to add media to draft', { error: updateError, draftId, userId: user.id })
    throw new Error(`Failed to add media: ${updateError.message}`)
  }

  logger.info('Media added successfully', {
    draftId,
    oldCount: currentMediaUrls.length,
    newCount: combinedMediaUrls.length,
    userId: user.id
  })

  return updatedDraft as DraftUpdate
}

/**
 * Add or update text content in a draft
 */
export async function addTextToDraft(draftId: string, text: string, append: boolean = false): Promise<DraftUpdate> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) throw new Error('Not authenticated')

  logger.info('Adding text to draft', { draftId, append, textLength: text.length, userId: user.id })

  let finalContent = text

  if (append) {
    // Get current content and append
    const { data: currentDraft, error: fetchError } = await supabase
      .from('updates')
      .select('content')
      .eq('id', draftId)
      .eq('parent_id', user.id)
      .single()

    if (fetchError) {
      throw new Error(`Failed to fetch draft: ${fetchError.message}`)
    }

    const currentContent = currentDraft.content || ''
    finalContent = currentContent + (currentContent ? '\n\n' : '') + text
  }

  const { data: updatedDraft, error: updateError } = await supabase
    .from('updates')
    .update({
      content: finalContent,
      last_edited_at: new Date().toISOString()
    })
    .eq('id', draftId)
    .eq('parent_id', user.id)
    .select()
    .single()

  if (updateError) {
    logger.error('Failed to add text to draft', { error: updateError, draftId, userId: user.id })
    throw new Error(`Failed to add text: ${updateError.message}`)
  }

  logger.info('Text added successfully', { draftId, finalLength: finalContent.length, userId: user.id })
  return updatedDraft as DraftUpdate
}

/**
 * Mark a draft as ready for digest compilation
 */
export async function markDraftAsReady(draftId: string): Promise<DraftUpdate> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) throw new Error('Not authenticated')

  logger.info('Marking draft as ready', { draftId, userId: user.id })

  const { data: draft, error } = await supabase
    .from('updates')
    .update({
      distribution_status: 'ready',
      last_edited_at: new Date().toISOString()
    })
    .eq('id', draftId)
    .eq('parent_id', user.id)
    .eq('distribution_status', 'draft')
    .select()
    .single()

  if (error) {
    logger.error('Failed to mark draft as ready', { error, draftId, userId: user.id })
    throw new Error(`Failed to mark as ready: ${error.message}`)
  }

  logger.info('Draft marked as ready', { draftId, userId: user.id })
  return draft as DraftUpdate
}

/**
 * Mark a ready update back to draft status
 */
export async function markReadyAsDraft(updateId: string): Promise<DraftUpdate> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) throw new Error('Not authenticated')

  logger.info('Marking ready update as draft', { updateId, userId: user.id })

  const { data: draft, error } = await supabase
    .from('updates')
    .update({
      distribution_status: 'draft',
      last_edited_at: new Date().toISOString()
    })
    .eq('id', updateId)
    .eq('parent_id', user.id)
    .eq('distribution_status', 'ready')
    .select()
    .single()

  if (error) {
    logger.error('Failed to mark as draft', { error, updateId, userId: user.id })
    throw new Error(`Failed to mark as draft: ${error.message}`)
  }

  logger.info('Update marked as draft', { updateId, userId: user.id })
  return draft as DraftUpdate
}

/**
 * Delete a draft
 */
export async function deleteDraft(draftId: string): Promise<void> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) throw new Error('Not authenticated')

  logger.info('Deleting draft', { draftId, userId: user.id })

  const { error } = await supabase
    .from('updates')
    .delete()
    .eq('id', draftId)
    .eq('parent_id', user.id)
    .in('distribution_status', ['draft', 'ready'])

  if (error) {
    logger.error('Failed to delete draft', { error, draftId, userId: user.id })
    throw new Error(`Failed to delete draft: ${error.message}`)
  }

  logger.info('Draft deleted successfully', { draftId, userId: user.id })
}

/**
 * Get all drafts for current user
 */
export async function getDrafts(filters?: DraftFilters): Promise<DraftUpdate[]> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) throw new Error('Not authenticated')

  logger.info('Fetching drafts', { userId: user.id, filters })

  let query = supabase
    .from('updates')
    .select('*')
    .eq('parent_id', user.id)

  // Apply status filter
  if (filters?.status && filters.status !== 'all') {
    query = query.eq('distribution_status', filters.status)
  } else {
    query = query.in('distribution_status', ['draft', 'ready'])
  }

  // Apply child filter
  if (filters?.child_id) {
    query = query.eq('child_id', filters.child_id)
  }

  // Apply date range filter
  if (filters?.date_range) {
    query = query
      .gte('created_at', filters.date_range.start)
      .lte('created_at', filters.date_range.end)
  }

  // Apply media filter
  if (filters?.has_media !== undefined) {
    if (filters.has_media) {
      query = query.not('media_urls', 'is', null)
    } else {
      query = query.or('media_urls.is.null,media_urls.eq.{}')
    }
  }

  // Apply milestone filter
  if (filters?.has_milestone !== undefined) {
    if (filters.has_milestone) {
      query = query.not('milestone_type', 'is', null)
    } else {
      query = query.is('milestone_type', null)
    }
  }

  query = query.order('created_at', { ascending: false })

  const { data: drafts, error } = await query

  if (error) {
    logger.error('Failed to fetch drafts', { error, userId: user.id })
    throw new Error(`Failed to fetch drafts: ${error.message}`)
  }

  logger.info('Drafts fetched successfully', { count: drafts?.length || 0, userId: user.id })
  return (drafts as DraftUpdate[]) || []
}

/**
 * Get draft workspace summary
 */
export async function getDraftWorkspaceSummary(): Promise<DraftWorkspaceSummary> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) throw new Error('Not authenticated')

  logger.info('Fetching draft workspace summary', { userId: user.id })

  // Get all drafts with child information
  const { data: drafts, error } = await supabase
    .from('updates')
    .select(`
      *,
      children:child_id (
        id,
        name,
        profile_photo_url
      )
    `)
    .eq('parent_id', user.id)
    .in('distribution_status', ['draft', 'ready'])
    .order('created_at', { ascending: false })

  if (error) {
    logger.error('Failed to fetch workspace summary', { error, userId: user.id })
    throw new Error(`Failed to fetch workspace summary: ${error.message}`)
  }

  const draftUpdates = (drafts || []) as (DraftUpdate & { children: { id: string; name: string; profile_photo_url?: string } })[]

  // Calculate summary statistics
  const draft_count = draftUpdates.filter(d => d.distribution_status === 'draft').length
  const ready_count = draftUpdates.filter(d => d.distribution_status === 'ready').length
  const total_drafts = draftUpdates.length

  // Find oldest draft
  const oldest_draft_date = draftUpdates.length > 0
    ? draftUpdates[draftUpdates.length - 1].created_at
    : undefined

  // Group by child
  const childrenMap = new Map<string, ChildDraftSummary>()

  draftUpdates.forEach(draft => {
    const childId = draft.child_id
    const existing = childrenMap.get(childId)

    if (existing) {
      if (draft.distribution_status === 'draft') {
        existing.draft_count++
      } else {
        existing.ready_count++
      }
      // Update latest date if this is more recent
      if (new Date(draft.created_at) > new Date(existing.latest_draft_date)) {
        existing.latest_draft_date = draft.created_at
      }
    } else {
      childrenMap.set(childId, {
        child_id: childId,
        child_name: draft.children.name,
        child_avatar: draft.children.profile_photo_url,
        draft_count: draft.distribution_status === 'draft' ? 1 : 0,
        ready_count: draft.distribution_status === 'ready' ? 1 : 0,
        latest_draft_date: draft.created_at
      })
    }
  })

  const summary: DraftWorkspaceSummary = {
    total_drafts,
    draft_count,
    ready_count,
    oldest_draft_date,
    can_compile_digest: ready_count > 0,
    children_with_drafts: Array.from(childrenMap.values())
  }

  logger.info('Workspace summary calculated', { summary, userId: user.id })
  return summary
}

/**
 * Get a single draft by ID
 */
export async function getDraftById(draftId: string): Promise<DraftUpdate | null> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) throw new Error('Not authenticated')

  logger.info('Fetching draft by ID', { draftId, userId: user.id })

  const { data: draft, error } = await supabase
    .from('updates')
    .select('*')
    .eq('id', draftId)
    .eq('parent_id', user.id)
    .in('distribution_status', ['draft', 'ready'])
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      logger.info('Draft not found', { draftId, userId: user.id })
      return null
    }
    logger.error('Failed to fetch draft', { error, draftId, userId: user.id })
    throw new Error(`Failed to fetch draft: ${error.message}`)
  }

  logger.info('Draft fetched successfully', { draftId, userId: user.id })
  return draft as DraftUpdate
}