import { getAuthenticatedSupabaseContext } from '@/lib/data/supabaseClient'
import {
  fetchDigestPreviewRows,
  fetchDigestsForUser,
  fetchDigestById,
  requireDigestOwnership
} from '@/lib/data/digestRepository'
import { createLogger } from '@/lib/logger'
import type {
  Digest,
  CompileDigestRequest,
  CompileDigestResponse,
  DigestPreviewData,
  RecipientDigestPreview,
  CustomizeDigestRequest,
  ApproveDigestRequest,
  DigestStats,
  AIInclusionRationale
} from '@/lib/types/digest'

const logger = createLogger('DigestService')

/**
 * Compile a new summary from ready memories
 */
export async function compileDigest(request: Omit<CompileDigestRequest, 'parent_id'>): Promise<CompileDigestResponse> {
  const { supabase, user } = await getAuthenticatedSupabaseContext()

  logger.info('Starting summary compilation', { request, userId: user.id })

  try {
    const { data, error } = await supabase.functions.invoke('compile-digest', {
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

    logger.info('Summary compiled successfully', { digestId: data.digest_id, userId: user.id })

    return {
      success: true,
      digest: data.digest,
      preview_data: await getDigestPreview(data.digest_id)
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
export async function getDigestPreview(digestId: string): Promise<DigestPreviewData> {
  const { supabase, user } = await getAuthenticatedSupabaseContext()

  logger.info('Fetching summary preview', { digestId, userId: user.id })

  // Fetch digest
  const digest = await requireDigestOwnership(supabase, digestId, user.id)

  // Fetch all digest_updates with full update and recipient data (including narratives)
  const digestUpdates = await fetchDigestPreviewRows(supabase, digestId)

  // Group by recipient
  const recipientMap = new Map<string, RecipientDigestPreview>()

  digestUpdates?.forEach((du) => {
    const recipientId = du.recipient_id as string
    const recipient = du.recipients as unknown as Record<string, unknown>
    const update = du.updates as unknown as Record<string, unknown>
    const children = update.children as Record<string, unknown>

    if (!recipientMap.has(recipientId)) {
      recipientMap.set(recipientId, {
        recipient_id: recipientId,
        recipient_name: recipient.name as string,
        recipient_email: recipient.email as string,
        relationship: recipient.relationship as string,
        frequency_preference: recipient.frequency as string,
        updates: [],
        narrative: du.narrative_data as unknown as import('@/lib/types/digest').DigestNarrative | undefined, // CRO-267: Include AI narrative
        email_subject: digest.title || 'New Update',
        email_preview_html: '',
        ai_rationale: ((du.ai_rationale as Record<string, unknown>)?.recipient_rationale as string) || '',
        customizations_made: 0
      })
    }

    const recipientPreview = recipientMap.get(recipientId)!

    if (du.included) {
      const age = calculateAge(children.birth_date as string)

      recipientPreview.updates.push({
        update_id: String(update.id),
        content: update.content as string,
        subject: update.subject as string | undefined,
        rich_content: update.rich_content as Record<string, unknown> | undefined,
        content_format: update.content_format as string,
        media_urls: (update.media_urls as string[]) || [],
        child_name: children.name as string,
        child_age: age,
        milestone_type: update.milestone_type as string | undefined,
        created_at: update.created_at as string,
        display_order: du.display_order as number,
        custom_caption: du.custom_caption as string | undefined,
        ai_rationale: du.ai_rationale as AIInclusionRationale | undefined,
        can_edit: true,
        can_remove: true,
        can_reorder: true
      })

      // Track customizations
      if (du.custom_caption || du.custom_subject) {
        recipientPreview.customizations_made++
      }
    }
  })

  const recipients = Array.from(recipientMap.values())

  logger.info('Summary preview fetched', {
    digestId,
    recipientCount: recipients.length,
    userId: user.id
  })

  return {
    digest: digest as unknown as Digest,
    recipients
  }
}

/**
 * Customize summary for specific recipient
 */
export async function customizeDigestForRecipient(request: CustomizeDigestRequest): Promise<void> {
  const { supabase, user } = await getAuthenticatedSupabaseContext()

  logger.info('Customizing summary for recipient', {
    digestId: request.digest_id,
    recipientId: request.recipient_id,
    updateCount: request.updates.length,
    userId: user.id
  })

  // Verify digest ownership
  await requireDigestOwnership(supabase, request.digest_id, user.id)

  // Update each digest_update
  for (const update of request.updates) {
    const updateData: Record<string, unknown> = {
      included: update.included,
      updated_at: new Date().toISOString()
    }

    if (update.display_order !== undefined) updateData.display_order = update.display_order
    if (update.custom_caption !== undefined) updateData.custom_caption = update.custom_caption
    if (update.custom_subject !== undefined) updateData.custom_subject = update.custom_subject

    const { error } = await supabase
      .from('summary_memories')
      .update(updateData)
      .eq('digest_id', request.digest_id)
      .eq('recipient_id', request.recipient_id)
      .eq('update_id', update.update_id)

    if (error) {
      logger.error('Failed to update summary entry', { error, updateId: update.update_id })
      throw new Error(`Failed to customize: ${error.message}`)
    }
  }

  logger.info('Summary customized successfully', {
    digestId: request.digest_id,
    recipientId: request.recipient_id,
    userId: user.id
  })
}

/**
 * Approve summary and optionally send
 */
export async function approveDigest(request: ApproveDigestRequest): Promise<void> {
  const { supabase, user } = await getAuthenticatedSupabaseContext()

  logger.info('Approving summary', { request, userId: user.id })

  const updateData: Record<string, unknown> = {
    status: 'approved',
    approved_at: new Date().toISOString()
  }

  if (request.scheduled_for) {
    updateData.status = 'scheduled'
    // In production, this would trigger a scheduled job
  }

  const { error } = await supabase
    .from('summaries')
    .update(updateData)
    .eq('id', request.digest_id)
    .eq('parent_id', user.id)
    .in('status', ['ready', 'compiling'])

  if (error) {
    logger.error('Failed to approve summary', { error, digestId: request.digest_id, userId: user.id })
    throw new Error(`Failed to approve summary: ${error.message}`)
  }

  // If sending immediately, trigger send process
  if (request.send_immediately) {
    await sendDigest(request.digest_id)
  }

  logger.info('Summary approved successfully', { digestId: request.digest_id, userId: user.id })
}

/**
 * Send summary to all recipients
 */
async function sendDigest(digestId: string): Promise<void> {
  const { supabase, user } = await getAuthenticatedSupabaseContext()

  logger.info('Sending summary', { digestId, userId: user.id })

  // Update status to sending
  await supabase
    .from('summaries')
    .update({ status: 'sending' })
    .eq('id', digestId)

  // In production, this would:
  // 1. Fetch preview data
  // 2. For each recipient, render email template
  // 3. Send via email service
  // 4. Track delivery status
  // 5. Update digest status to 'sent'

  // For now, just mark as sent
  const { error } = await supabase
    .from('summaries')
    .update({
      status: 'sent',
      sent_at: new Date().toISOString()
    })
    .eq('id', digestId)

  if (error) {
    throw new Error(`Failed to send summary: ${error.message}`)
  }

  // Update all related updates to 'sent_in_digest'
  await supabase
    .from('memories')
    .update({ distribution_status: 'sent_in_digest' })
    .eq('digest_id', digestId)

  logger.info('Summary sent successfully', { digestId, userId: user.id })
}

/**
 * Get summary by ID
 */
export async function getDigestById(digestId: string): Promise<Digest | null> {
  const { supabase, user } = await getAuthenticatedSupabaseContext()

  return fetchDigestById(supabase, digestId, user.id)
}

/**
 * Get all summaries for current user
 */
export async function getDigests(): Promise<Digest[]> {
  const { supabase, user } = await getAuthenticatedSupabaseContext()

  return fetchDigestsForUser(supabase, user.id)
}

/**
 * Get summary statistics
 */
export async function getDigestStats(): Promise<DigestStats> {
  const { supabase, user } = await getAuthenticatedSupabaseContext()

  const allDigests = await fetchDigestsForUser(supabase, user.id)
  const thisMonth = new Date()
  thisMonth.setDate(1)
  thisMonth.setHours(0, 0, 0, 0)

  const sentThisMonth = allDigests.filter(d =>
    d.status === 'sent' && new Date(d.sent_at!) >= thisMonth
  ).length

  const pendingReview = allDigests.filter(d => d.status === 'ready').length

  const totalUpdates = allDigests.reduce((sum, d) => sum + d.total_updates, 0)
  const totalRecipients = allDigests.reduce((sum, d) => sum + d.total_recipients, 0)

  const sentDigests = allDigests.filter(d => d.status === 'sent')
  const lastSent = sentDigests.length > 0
    ? sentDigests.sort((a, b) =>
        new Date(b.sent_at!).getTime() - new Date(a.sent_at!).getTime()
      )[0]
    : null

  return {
    total_digests: allDigests.length,
    sent_this_month: sentThisMonth,
    pending_review: pendingReview,
    average_updates_per_digest: allDigests.length > 0 ? totalUpdates / allDigests.length : 0,
    average_recipients_per_digest: allDigests.length > 0 ? totalRecipients / allDigests.length : 0,
    last_sent_at: lastSent?.sent_at
  }
}

/**
 * Delete a summary (only if not sent)
 */
export async function deleteDigest(digestId: string): Promise<void> {
  const { supabase, user } = await getAuthenticatedSupabaseContext()

  logger.info('Deleting summary', { digestId, userId: user.id })

  // Can only delete non-sent summaries
  const { error } = await supabase
    .from('summaries')
    .delete()
    .eq('id', digestId)
    .eq('parent_id', user.id)
    .neq('status', 'sent')

  if (error) {
    logger.error('Failed to delete summary', { error, digestId, userId: user.id })
    throw new Error(`Failed to delete summary: ${error.message}`)
  }

  // Memories will automatically revert to 'ready' status via database triggers
  // or we can manually update them here

  logger.info('Summary deleted successfully', { digestId, userId: user.id })
}

/**
 * Helper function to calculate age from birth date
 */
function calculateAge(birthDate: string): string {
  const birth = new Date(birthDate)
  const now = new Date()

  const years = now.getFullYear() - birth.getFullYear()
  const months = now.getMonth() - birth.getMonth()
  const days = now.getDate() - birth.getDate()

  let ageMonths = years * 12 + months
  if (days < 0) {
    ageMonths--
  }

  if (ageMonths < 12) {
    return `${ageMonths} month${ageMonths === 1 ? '' : 's'}`
  } else if (ageMonths < 24) {
    const remainingMonths = ageMonths - 12
    if (remainingMonths === 0) {
      return '1 year'
    }
    return `1 year ${remainingMonths} month${remainingMonths === 1 ? '' : 's'}`
  } else {
    const fullYears = Math.floor(ageMonths / 12)
    const remainingMonths = ageMonths % 12
    if (remainingMonths === 0) {
      return `${fullYears} years`
    }
    return `${fullYears} years ${remainingMonths} month${remainingMonths === 1 ? '' : 's'}`
  }
}