import { createClient } from '@/lib/supabase/client'
import { createLogger } from '@/lib/logger'
import type { Json, Tables } from '@/lib/types/database.types'
import type {
  Summary,
  CompileSummaryRequest,
  CompileSummaryResponse,
  SummaryPreviewData,
  RecipientSummaryPreview,
  ApproveSummaryRequest,
  SummaryStats,
  AutoPublishReminder,
  SummaryNarrative,
  AIInclusionRationale,
  RenderStyle
} from '@/lib/types/summary'

const logger = createLogger('SummaryService')
type SummaryRow = Tables<'summaries'>
export type SummaryListItem = Pick<Summary, 'id' | 'title' | 'status' | 'total_recipients' | 'sent_at' | 'digest_date' | 'created_at'>
type SummaryMemoryWithRelations = {
  recipients: {
    id: string
    name: string | null
    email: string | null
    relationship: string | null
    frequency_preference: string | null
  } | null
  narrative_data: Json | null
  render_style: string | null
  display_order: number
  custom_caption: string | null
  ai_rationale: { reasoning?: string } | null
  memories: {
    id: string
    content: string | null
    subject: string | null
    rich_content: Json | null
    content_format: string | null
    media_urls: string[] | null
    children: {
      name: string | null
      birth_date: string | null
      profile_photo_url: string | null
    } | null
    milestone_type: string | null
    created_at: string | null
  } | null
}

/**
 * Compile a new summary from approved memories
 */
export async function compileSummary(request: Omit<CompileSummaryRequest, 'parent_id'>): Promise<CompileSummaryResponse> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) throw new Error('Not authenticated')

  logger.info('Starting summary compilation', { request, userId: user.id })

  try {
    const { data, error } = await supabase.functions.invoke('compile-summary', {
      body: {
        ...request,
        parent_id: user.id
      }
    })

    if (error) {
      logger.error('Summary compilation failed', { error, userId: user.id })
      throw new Error(`Failed to compile summary: ${error.message}`)
    }

    if (!data.success) {
      throw new Error(data.error || 'Unknown compilation error')
    }

    logger.info('Summary compiled successfully', { summaryId: data.summary_id, userId: user.id })

    return {
      success: true,
      summary: data.summary,
      preview_data: await getSummaryPreview(data.summary_id)
    }
  } catch (error) {
    logger.error('Summary compilation error', { error, userId: user.id })
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

/**
 * Get complete preview data for a summary
 */
export async function getSummaryPreview(summaryId: string): Promise<SummaryPreviewData> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) throw new Error('Not authenticated')

  logger.info('Fetching summary preview', { summaryId, userId: user.id })

  // Fetch summary
  const { data: summary, error: summaryError } = await supabase
    .from('summaries')
    .select('*')
    .eq('id', summaryId)
    .eq('parent_id', user.id)
    .single()

  if (summaryError) {
    throw new Error(`Failed to fetch summary: ${summaryError.message}`)
  }

  // Fetch all summary_memories with full memory and recipient data (including narratives)
  const { data: summaryMemories, error: memoriesError } = await supabase
    .from('summary_memories')
    .select(`
      *,
      narrative_data,
      photo_count,
      render_style,
      memories:memory_id (
        *,
        children:child_id (
          name,
          birth_date,
          profile_photo_url
        )
      ),
      recipients:recipient_id (
        id,
        name,
        email,
        relationship,
        frequency_preference
      )
    `)
    .eq('summary_id', summaryId)
    .eq('included', true)
    .order('display_order', { ascending: true })

  if (memoriesError) {
    throw new Error(`Failed to fetch summary memories: ${memoriesError.message}`)
  }

  // Group by recipient
  const recipientMap = new Map<string, RecipientSummaryPreview>()

  const summaryMemoryRecords = (summaryMemories ?? []) as unknown as SummaryMemoryWithRelations[]

  for (const sm of summaryMemoryRecords) {
    const recipient = sm.recipients
    if (!recipient) continue

    const narrative = (sm.narrative_data as unknown as SummaryNarrative | null) ?? undefined
    const renderStyle: RenderStyle = sm.render_style === 'gallery' ? 'gallery' : 'narrative'
    const aiRationale = (sm.ai_rationale as unknown as AIInclusionRationale | null) ?? undefined

    if (!recipientMap.has(recipient.id)) {
      recipientMap.set(recipient.id, {
        recipient_id: recipient.id,
        recipient_name: recipient.name ?? 'Unknown Recipient',
        recipient_email: recipient.email ?? '',
        relationship: recipient.relationship ?? 'Family',
        frequency_preference: recipient.frequency_preference ?? 'every_update',
        memories: [],
        narrative,
        render_style: renderStyle,
        email_subject: `${summary.title} - Memory Summary`,
        email_preview_html: '',
        ai_rationale: aiRationale?.reasoning ?? '',
        customizations_made: 0
      })
    }

    const preview = recipientMap.get(recipient.id)!
    const memory = sm.memories
    if (!memory) continue

    preview.memories.push({
      memory_id: memory.id,
      content: memory.content || '',
      subject: memory.subject ?? undefined,
      rich_content: memory.rich_content as unknown as Record<string, unknown> | undefined,
      content_format: memory.content_format || 'plain',
      media_urls: memory.media_urls ?? [],
      child_name: memory.children?.name ?? '',
      child_age: calculateAge(memory.children?.birth_date ?? undefined),
      milestone_type: memory.milestone_type ?? undefined,
      created_at: memory.created_at ?? '',
      display_order: sm.display_order,
      custom_caption: sm.custom_caption ?? undefined,
      ai_rationale: aiRationale,
      can_edit: true,
      can_remove: true,
      can_reorder: true
    })
  }

  return {
    summary: summary as unknown as Summary,
    recipients: Array.from(recipientMap.values())
  }
}

/**
 * Approve and send a summary
 */
export async function approveSummary(request: ApproveSummaryRequest): Promise<void> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) throw new Error('Not authenticated')

  logger.info('Approving summary', { summaryId: request.summary_id, userId: user.id })

  // Update summary status to approved
  const { error: updateError } = await supabase
    .from('summaries')
    .update({
      status: 'approved',
      approved_at: new Date().toISOString()
    })
    .eq('id', request.summary_id)
    .eq('parent_id', user.id)

  if (updateError) {
    throw new Error(`Failed to approve summary: ${updateError.message}`)
  }

  // Clear "new" badge from all memories in this summary
  const { data: summaryMemories } = await supabase
    .from('summary_memories')
    .select('memory_id')
    .eq('summary_id', request.summary_id)

  if (summaryMemories && summaryMemories.length > 0) {
    const memoryIds = summaryMemories.map(sm => sm.memory_id)

    await supabase
      .from('memories')
      .update({ is_new: false })
      .in('id', memoryIds)
  }

  // If send_immediately, trigger send function
  if (request.send_immediately) {
    const { error: sendError } = await supabase.functions.invoke('send-summary', {
      body: { summary_id: request.summary_id }
    })

    if (sendError) {
      logger.error('Failed to send summary', { summaryId: request.summary_id, error: sendError })
      throw new Error(`Failed to send summary: ${sendError.message}`)
    }
  }

  logger.info('Summary approved successfully', { summaryId: request.summary_id, userId: user.id })
}

/**
 * Get summaries for current user
 */
export async function getSummaries(limit?: number): Promise<Summary[]> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) throw new Error('Not authenticated')

  let query = supabase
    .from('summaries')
    .select('*')
    .eq('parent_id', user.id)
    .order('created_at', { ascending: false })

  if (limit) {
    query = query.limit(limit)
  }

  const { data, error } = await query

  if (error) throw error
  return (data ?? []) as unknown as Summary[]
}

/**
 * Get summary by ID
 */
export async function getSummaryById(summaryId: string): Promise<Summary | null> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) throw new Error('Not authenticated')

  const { data, error } = await supabase
    .from('summaries')
    .select('*')
    .eq('id', summaryId)
    .eq('parent_id', user.id)
    .single()

  if (error) {
    if (error.code === 'PGRST116') return null
    throw error
  }

  return data as unknown as Summary
}

/**
 * Fetches the most recent summaries for the authenticated parent
 */
export async function getRecentSummaries(limit: number = 5): Promise<SummaryListItem[]> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) throw new Error('Not authenticated')

  const { data, error } = await supabase
    .from('summaries')
    .select('id, title, status, total_recipients, sent_at, digest_date, created_at')
    .eq('parent_id', user.id)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) {
    logger.error('Failed to fetch recent summaries', { error, userId: user.id })
    throw new Error(`Failed to fetch recent summaries: ${error.message}`)
  }

  return (data ?? []).map(summary => ({
    id: summary.id,
    title: summary.title,
    status: (summary.status as SummaryListItem['status']) ?? 'ready',
    total_recipients: summary.total_recipients ?? 0,
    sent_at: summary.sent_at ?? undefined,
    digest_date: summary.digest_date,
    created_at: summary.created_at ?? new Date().toISOString()
  }))
}

/**
 * Get summaries ready for auto-publish
 */
export async function getSummariesForAutoPublish(): Promise<Summary[]> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) throw new Error('Not authenticated')

  const { data, error } = await supabase
    .rpc('get_summaries_for_auto_publish')
    .eq('parent_id', user.id)

  if (error) throw error
  return (data ?? []) as unknown as Summary[]
}

/**
 * Get summaries needing reminder notifications
 */
export async function getSummariesNeedingReminders(): Promise<AutoPublishReminder[]> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) throw new Error('Not authenticated')

  const { data, error } = await supabase
    .rpc('get_summaries_needing_reminders')
    .eq('parent_id', user.id)

  if (error) throw error

  // Transform to AutoPublishReminder format
  const reminderRows = (data ?? []) as unknown as Array<{
    summary_id: string
    parent_id: string
    hours_until_auto_publish: number
  }>

  return reminderRows.map(item => ({
    summary_id: item.summary_id,
    parent_id: item.parent_id,
    hours_remaining: Math.floor(item.hours_until_auto_publish),
    reminder_type: item.hours_until_auto_publish <= 24 ? '24hr' : '48hr',
    summary_title: '',
    memory_count: 0,
    recipient_count: 0
  })) as AutoPublishReminder[]
}

/**
 * Update auto-publish settings for a summary
 */
export async function updateAutoPublishSettings(
  summaryId: string,
  autoPublishHours: number
): Promise<void> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) throw new Error('Not authenticated')

  const { error } = await supabase
    .from('summaries')
    .update({ auto_publish_hours: autoPublishHours })
    .eq('id', summaryId)
    .eq('parent_id', user.id)

  if (error) throw error
}

/**
 * Get summary statistics
 */
export async function getSummaryStats(): Promise<SummaryStats> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) throw new Error('Not authenticated')

  // Get total summaries
  const { count: totalSummaries } = await supabase
    .from('summaries')
    .select('*', { count: 'exact', head: true })
    .eq('parent_id', user.id)

  // Get sent this month
  const startOfMonth = new Date()
  startOfMonth.setDate(1)
  startOfMonth.setHours(0, 0, 0, 0)

  const { count: sentThisMonth } = await supabase
    .from('summaries')
    .select('*', { count: 'exact', head: true })
    .eq('parent_id', user.id)
    .eq('status', 'sent')
    .gte('sent_at', startOfMonth.toISOString())

  // Get pending review
  const { count: pendingReview } = await supabase
    .from('summaries')
    .select('*', { count: 'exact', head: true })
    .eq('parent_id', user.id)
    .eq('status', 'ready')

  // Get averages
  const { data: summaries } = await supabase
    .from('summaries')
    .select('total_updates, total_recipients')
    .eq('parent_id', user.id)
    .returns<Array<Pick<SummaryRow, 'total_updates' | 'total_recipients'>>>()

  const avgMemories = summaries && summaries.length > 0
    ? summaries.reduce((sum, s) => sum + (s.total_updates || 0), 0) / summaries.length
    : 0

  const avgRecipients = summaries && summaries.length > 0
    ? summaries.reduce((sum, s) => sum + (s.total_recipients || 0), 0) / summaries.length
    : 0

  // Get last sent
  const { data: lastSent } = await supabase
    .from('summaries')
    .select('sent_at')
    .eq('parent_id', user.id)
    .eq('status', 'sent')
    .order('sent_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  return {
    total_summaries: totalSummaries || 0,
    sent_this_month: sentThisMonth || 0,
    pending_review: pendingReview || 0,
    average_memories_per_summary: Math.round(avgMemories),
    average_recipients_per_summary: Math.round(avgRecipients),
    last_sent_at: lastSent?.sent_at || undefined
  }
}

/**
 * Helper function to calculate age from birth date
 */
function calculateAge(birthDate?: string): string {
  if (!birthDate) return 'Unknown age'

  const birth = new Date(birthDate)
  const now = new Date()
  const months = (now.getFullYear() - birth.getFullYear()) * 12 + (now.getMonth() - birth.getMonth())

  if (months < 12) {
    return `${months} month${months !== 1 ? 's' : ''}`
  }

  const years = Math.floor(months / 12)
  const remainingMonths = months % 12

  if (remainingMonths === 0) {
    return `${years} year${years !== 1 ? 's' : ''}`
  }

  return `${years} year${years !== 1 ? 's' : ''}, ${remainingMonths} month${remainingMonths !== 1 ? 's' : ''}`
}
