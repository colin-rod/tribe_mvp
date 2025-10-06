import { createClient } from '@/lib/supabase/client'
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
 * Compile a new digest from ready updates
 */
export async function compileDigest(request: Omit<CompileDigestRequest, 'parent_id'>): Promise<CompileDigestResponse> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) throw new Error('Not authenticated')

  logger.info('Starting digest compilation', { request, userId: user.id })

  try {
    const { data, error } = await supabase.functions.invoke('compile-digest', {
      body: {
        ...request,
        parent_id: user.id
      }
    })

    if (error) {
      logger.error('Digest compilation failed', { error, userId: user.id })
      throw new Error(`Failed to compile digest: ${error.message}`)
    }

    if (!data.success) {
      throw new Error(data.error || 'Unknown compilation error')
    }

    logger.info('Digest compiled successfully', { digestId: data.digest_id, userId: user.id })

    return {
      success: true,
      digest: data.digest,
      preview_data: await getDigestPreview(data.digest_id)
    }
  } catch (error) {
    logger.error('Digest compilation error', { error, userId: user.id })
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

/**
 * Get complete preview data for a digest
 */
export async function getDigestPreview(digestId: string): Promise<DigestPreviewData> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) throw new Error('Not authenticated')

  logger.info('Fetching digest preview', { digestId, userId: user.id })

  // Fetch digest
  const { data: digest, error: digestError } = await supabase
    .from('digests')
    .select('*')
    .eq('id', digestId)
    .eq('parent_id', user.id)
    .single()

  if (digestError) {
    throw new Error(`Failed to fetch digest: ${digestError.message}`)
  }

  // Fetch all digest_updates with full update and recipient data (including narratives)
  const { data: digestUpdates, error: updatesError } = await supabase
    .from('digest_updates')
    .select(`
      *,
      narrative_data,
      updates:update_id (
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
        frequency
      )
    `)
    .eq('digest_id', digestId)
    .order('recipient_id')
    .order('display_order')

  if (updatesError) {
    throw new Error(`Failed to fetch digest updates: ${updatesError.message}`)
  }

  // Group by recipient
  const recipientMap = new Map<string, RecipientDigestPreview>()

  digestUpdates?.forEach((du: Record<string, unknown>) => {
    const recipientId = du.recipient_id as string
    const recipient = du.recipients as Record<string, unknown>
    const update = du.updates as Record<string, unknown>
    const children = update.children as Record<string, unknown>

    if (!recipientMap.has(recipientId)) {
      recipientMap.set(recipientId, {
        recipient_id: recipientId,
        recipient_name: recipient.name as string,
        recipient_email: recipient.email as string,
        relationship: recipient.relationship as string,
        frequency_preference: recipient.frequency as string,
        updates: [],
        narrative: du.narrative_data as import('@/lib/types/digest').DigestNarrative | undefined, // CRO-267: Include AI narrative
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

  logger.info('Digest preview fetched', {
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
 * Customize digest for specific recipient
 */
export async function customizeDigestForRecipient(request: CustomizeDigestRequest): Promise<void> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) throw new Error('Not authenticated')

  logger.info('Customizing digest for recipient', {
    digestId: request.digest_id,
    recipientId: request.recipient_id,
    updateCount: request.updates.length,
    userId: user.id
  })

  // Verify digest ownership
  const { data: digest, error: digestError } = await supabase
    .from('digests')
    .select('id')
    .eq('id', request.digest_id)
    .eq('parent_id', user.id)
    .single()

  if (digestError || !digest) {
    throw new Error('Digest not found or access denied')
  }

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
      .from('digest_updates')
      .update(updateData)
      .eq('digest_id', request.digest_id)
      .eq('recipient_id', request.recipient_id)
      .eq('update_id', update.update_id)

    if (error) {
      logger.error('Failed to update digest entry', { error, updateId: update.update_id })
      throw new Error(`Failed to customize: ${error.message}`)
    }
  }

  logger.info('Digest customized successfully', {
    digestId: request.digest_id,
    recipientId: request.recipient_id,
    userId: user.id
  })
}

/**
 * Approve digest and optionally send
 */
export async function approveDigest(request: ApproveDigestRequest): Promise<void> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) throw new Error('Not authenticated')

  logger.info('Approving digest', { request, userId: user.id })

  const updateData: Record<string, unknown> = {
    status: 'approved',
    approved_at: new Date().toISOString()
  }

  if (request.scheduled_for) {
    updateData.status = 'scheduled'
    // In production, this would trigger a scheduled job
  }

  const { error } = await supabase
    .from('digests')
    .update(updateData)
    .eq('id', request.digest_id)
    .eq('parent_id', user.id)
    .in('status', ['ready', 'compiling'])

  if (error) {
    logger.error('Failed to approve digest', { error, digestId: request.digest_id, userId: user.id })
    throw new Error(`Failed to approve digest: ${error.message}`)
  }

  // If sending immediately, trigger send process
  if (request.send_immediately) {
    await sendDigest(request.digest_id)
  }

  logger.info('Digest approved successfully', { digestId: request.digest_id, userId: user.id })
}

/**
 * Send digest to all recipients
 */
async function sendDigest(digestId: string): Promise<void> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) throw new Error('Not authenticated')

  logger.info('Sending digest', { digestId, userId: user.id })

  // Update status to sending
  await supabase
    .from('digests')
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
    .from('digests')
    .update({
      status: 'sent',
      sent_at: new Date().toISOString()
    })
    .eq('id', digestId)

  if (error) {
    throw new Error(`Failed to send digest: ${error.message}`)
  }

  // Update all related updates to 'sent_in_digest'
  await supabase
    .from('updates')
    .update({ distribution_status: 'sent_in_digest' })
    .eq('digest_id', digestId)

  logger.info('Digest sent successfully', { digestId, userId: user.id })
}

/**
 * Get digest by ID
 */
export async function getDigestById(digestId: string): Promise<Digest | null> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) throw new Error('Not authenticated')

  const { data: digest, error } = await supabase
    .from('digests')
    .select('*')
    .eq('id', digestId)
    .eq('parent_id', user.id)
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      return null
    }
    throw new Error(`Failed to fetch digest: ${error.message}`)
  }

  return digest as unknown as Digest
}

/**
 * Get all digests for current user
 */
export async function getDigests(): Promise<Digest[]> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) throw new Error('Not authenticated')

  const { data: digests, error } = await supabase
    .from('digests')
    .select('*')
    .eq('parent_id', user.id)
    .order('created_at', { ascending: false })

  if (error) {
    throw new Error(`Failed to fetch digests: ${error.message}`)
  }

  return (digests as unknown as Digest[]) || []
}

/**
 * Get digest statistics
 */
export async function getDigestStats(): Promise<DigestStats> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) throw new Error('Not authenticated')

  const { data: digests, error } = await supabase
    .from('digests')
    .select('*')
    .eq('parent_id', user.id)

  if (error) {
    throw new Error(`Failed to fetch digest stats: ${error.message}`)
  }

  const allDigests = (digests as unknown as Digest[]) || []
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
 * Delete a digest (only if not sent)
 */
export async function deleteDigest(digestId: string): Promise<void> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) throw new Error('Not authenticated')

  logger.info('Deleting digest', { digestId, userId: user.id })

  // Can only delete non-sent digests
  const { error } = await supabase
    .from('digests')
    .delete()
    .eq('id', digestId)
    .eq('parent_id', user.id)
    .neq('status', 'sent')

  if (error) {
    logger.error('Failed to delete digest', { error, digestId, userId: user.id })
    throw new Error(`Failed to delete digest: ${error.message}`)
  }

  // Updates will automatically revert to 'ready' status via database triggers
  // or we can manually update them here

  logger.info('Digest deleted successfully', { digestId, userId: user.id })
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