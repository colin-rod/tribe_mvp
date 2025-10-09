import { createClient } from './supabase/client'
import { createLogger } from '@/lib/logger'
import type { GroupMembership, GroupNotificationSettings, NotificationChannel } from './group-management'

const logger = createLogger('GroupNotificationIntegration')

type NotificationFrequency = 'every_update' | 'daily_digest' | 'weekly_digest' | 'milestones_only'

interface GroupContext {
  group_id: string
  group_name: string
  role: string
  created_at: string
}

interface GroupMembershipWithGroup extends GroupMembership {
  recipient_groups?: {
    id: string
    name: string
    default_frequency: string
    default_channels: NotificationChannel[]
    notification_settings: GroupNotificationSettings | null
  }
}

interface RecipientWithMemberships {
  id: string
  name: string
  email?: string | null
  phone?: string | null
  preference_token?: string
  group_memberships?: GroupMembershipWithGroup[]
}

interface RecipientRecord {
  id: string
  name: string
  email?: string | null
  phone?: string | null
  preference_token?: string
}

interface UpdateRecord {
  id: string
  content?: string | null
  created_at: string
}

interface DeliveryJobInsert {
  update_id: string
  recipient_id: string
  group_context: string
  channel: NotificationChannel
  priority: number
  scheduled_for: string | null
}

interface DeliveryJobWithRelations {
  id: string
  recipient_id: string
  channel: NotificationChannel
  group_context: string | null
  recipients: RecipientRecord
  updates: UpdateRecord
}

interface DigestContent {
  subject: string
  html: string
  text: string
}

type DigestUpdate = UpdateRecord & { group_context: GroupContext }

const DEFAULT_GROUP_CONTEXT: GroupContext = {
  group_id: 'default',
  group_name: 'Family',
  role: 'member',
  created_at: ''
}

/**
 * Integration layer between group management and notification system
 */
export interface NotificationRecipient {
  id: string
  name: string
  email?: string
  phone?: string
  effective_frequency: NotificationFrequency
  effective_channels: NotificationChannel[]
  effective_content_types: string[]
  group_context: GroupContext
}

export interface GroupNotificationContext {
  update_id: string
  parent_id: string
  child_id: string
  content_type: 'milestone' | 'activity' | 'photo' | 'text'
  urgency: 'low' | 'medium' | 'high'
  target_groups?: string[]
}

/**
 * Resolves effective notification settings for recipients across groups
 */
export class GroupNotificationResolver {
  /**
   * Get all notification recipients for an update with their effective settings
   */
  static async resolveNotificationRecipients(
    context: GroupNotificationContext
  ): Promise<NotificationRecipient[]> {
    const supabase = createClient()

    try {
      // Get all active recipients for the parent, considering group memberships
      const { data: recipients, error } = await supabase
        .rpc('get_notification_recipients_with_groups', {
          p_parent_id: context.parent_id,
          p_content_type: context.content_type,
          p_target_groups: context.target_groups
        })

      if (error) {
        logger.errorWithStack('Error resolving notification recipients:', error as Error)
        throw new Error('Failed to resolve notification recipients')
      }

      // Process each recipient to determine effective settings
      const notificationRecipients: NotificationRecipient[] = []

      for (const recipient of (recipients as RecipientWithMemberships[] | null) || []) {
        const effectiveSettings = await this.calculateEffectiveSettings(
          recipient.group_memberships ?? [],
          context
        )

        // Skip recipients who shouldn't receive this type of notification
        if (!this.shouldReceiveNotification(effectiveSettings, context)) {
          continue
        }

        notificationRecipients.push({
          id: recipient.id,
          name: recipient.name,
          email: recipient.email ?? undefined,
          phone: recipient.phone ?? undefined,
          effective_frequency: effectiveSettings.frequency,
          effective_channels: effectiveSettings.channels,
          effective_content_types: effectiveSettings.content_types,
          group_context: {
            group_id: effectiveSettings.primary_group_id,
            group_name: effectiveSettings.primary_group_name,
            role: effectiveSettings.role,
            created_at: effectiveSettings.created_at
          }
        })
      }

      return notificationRecipients
    } catch (error) {
      logger.errorWithStack('Error in resolveNotificationRecipients:', error as Error)
      throw error
    }
  }

  /**
   * Calculate effective notification settings considering group hierarchy
   */
  private static async calculateEffectiveSettings(
    groupMemberships: GroupMembershipWithGroup[],
    context: GroupNotificationContext
  ): Promise<{
    frequency: NotificationFrequency
    channels: NotificationChannel[]
    content_types: string[]
    primary_group_id: string
    primary_group_name: string
    role: string
    created_at: string
  }> {
    // Priority order: individual override > group settings > platform defaults
    let effectiveFrequency: NotificationFrequency = 'weekly_digest'
    let effectiveChannels: NotificationChannel[] = ['email']
    let effectiveContentTypes: string[] = ['photos', 'text', 'milestones']

    // Find the most relevant group membership
    let primaryMembership = groupMemberships[0] // Default to first membership

    // If target groups specified, prioritize those
    if (context.target_groups && context.target_groups.length > 0) {
      primaryMembership =
        groupMemberships.find(m => context.target_groups?.includes(m.group_id)) ||
        primaryMembership
    }

    // Apply group defaults
    if (primaryMembership?.recipient_groups) {
      const groupSettings = primaryMembership.recipient_groups
      effectiveFrequency = (groupSettings.default_frequency as NotificationFrequency) || effectiveFrequency
      effectiveChannels = (groupSettings.default_channels as NotificationChannel[] | undefined) || effectiveChannels

      // Apply group notification settings
      if (groupSettings.notification_settings) {
        const settings = groupSettings.notification_settings
        if (settings.email_notifications === false) {
          effectiveChannels = effectiveChannels.filter(c => c !== 'email')
        }
        if (settings.sms_notifications === false) {
          effectiveChannels = effectiveChannels.filter(c => c !== 'sms')
        }
        if (settings.whatsapp_notifications === false) {
          effectiveChannels = effectiveChannels.filter(c => c !== 'whatsapp')
        }
      }
    }

    // Apply individual membership overrides
    if (primaryMembership?.frequency) {
      effectiveFrequency = primaryMembership.frequency
    }
    if (primaryMembership?.preferred_channels && primaryMembership.preferred_channels.length > 0) {
      effectiveChannels = primaryMembership.preferred_channels
    }
    if (primaryMembership?.content_types) {
      effectiveContentTypes = primaryMembership.content_types
    }

    return {
      frequency: effectiveFrequency,
      channels: effectiveChannels,
      content_types: effectiveContentTypes,
      primary_group_id: primaryMembership?.group_id || DEFAULT_GROUP_CONTEXT.group_id,
      primary_group_name: primaryMembership?.recipient_groups?.name || DEFAULT_GROUP_CONTEXT.group_name,
      role: primaryMembership?.role || DEFAULT_GROUP_CONTEXT.role,
      created_at: primaryMembership?.created_at || DEFAULT_GROUP_CONTEXT.created_at
    }
  }

  /**
   * Determine if recipient should receive notification based on settings and context
   */
  private static shouldReceiveNotification(
    settings: { frequency: NotificationFrequency; channels: NotificationChannel[]; content_types: string[] },
    context: GroupNotificationContext
  ): boolean {
    // Check content type preference
    if (!settings.content_types.includes(context.content_type)) {
      return false
    }

    // Check if any valid channels are available
    if (settings.channels.length === 0) {
      return false
    }

    // Apply frequency-based filtering
    switch (settings.frequency) {
      case 'milestones_only':
        return context.content_type === 'milestone'
      case 'every_update':
        return true
      case 'daily_digest':
      case 'weekly_digest':
        // These will be handled by digest processing
        return context.urgency === 'high' // Only immediate for high urgency
      default:
        return true
    }
  }
}

/**
 * Group-aware notification delivery coordinator
 */
export class GroupNotificationDelivery {
  /**
   * Create delivery jobs with group context
   */
  static async createGroupedDeliveryJobs(
    updateId: string,
    recipients: NotificationRecipient[]
  ): Promise<{ immediate: DeliveryJobInsert[]; digest: DeliveryJobInsert[] }> {
    const supabase = createClient()

    const immediateJobs: DeliveryJobInsert[] = []
    const digestJobs: DeliveryJobInsert[] = []

    for (const recipient of recipients) {
      const baseJob = {
        update_id: updateId,
        recipient_id: recipient.id,
        group_context: JSON.stringify(recipient.group_context)
      }

      // Create jobs for each preferred channel
      for (const channel of recipient.effective_channels) {
        const scheduledFor = this.calculateDeliveryTime(recipient.effective_frequency)

        const job: DeliveryJobInsert = {
          ...baseJob,
          channel,
          priority: this.calculatePriority(recipient.effective_frequency, channel),
          scheduled_for: scheduledFor
        }

        if (recipient.effective_frequency === 'every_update') {
          immediateJobs.push(job)
        } else {
          digestJobs.push(job)
        }
      }
    }

    // Insert immediate delivery jobs
    if (immediateJobs.length > 0) {
      const { error: immediateError } = await supabase
        .from('delivery_jobs')
        .insert(immediateJobs)

      if (immediateError) {
        logger.errorWithStack('Error creating immediate delivery jobs:', immediateError as Error)
      }
    }

    // Insert digest delivery jobs
    if (digestJobs.length > 0) {
      const { error: digestError } = await supabase
        .from('delivery_jobs')
        .insert(digestJobs)

      if (digestError) {
        logger.errorWithStack('Error creating digest delivery jobs:', digestError as Error)
      }
    }

    return { immediate: immediateJobs, digest: digestJobs }
  }

  /**
   * Calculate delivery priority based on frequency and channel
   */
  private static calculatePriority(frequency: NotificationFrequency, channel: NotificationChannel): number {
    const basePriority = {
      'every_update': 1, // Highest priority
      'daily_digest': 2,
      'weekly_digest': 3,
      'milestones_only': 4
    }[frequency] || 3

    const channelAdjustment = {
      'sms': 0, // SMS gets slight boost
      'email': 1,
      'whatsapp': 1
    }[channel] || 1

    return basePriority + channelAdjustment
  }

  /**
   * Calculate when notification should be delivered
   */
  private static calculateDeliveryTime(frequency: NotificationFrequency): string | null {
    const now = new Date()

    switch (frequency) {
      case 'every_update':
        return now.toISOString()
      case 'daily_digest': {
        const tomorrow = new Date(now)
        tomorrow.setDate(tomorrow.getDate() + 1)
        tomorrow.setHours(8, 0, 0, 0)
        return tomorrow.toISOString()
      }
      case 'weekly_digest': {
        const nextSunday = new Date(now)
        const daysUntilSunday = (7 - now.getDay()) % 7 || 7
        nextSunday.setDate(now.getDate() + daysUntilSunday)
        nextSunday.setHours(8, 0, 0, 0)
        return nextSunday.toISOString()
      }
      default:
        return null
    }
  }
}

/**
 * Digest processing for group-based notifications
 */
export class GroupDigestProcessor {
  /**
   * Process pending digest notifications for all users
   */
  static async processDigests(digestType: 'daily' | 'weekly'): Promise<{
    processed: number
    errors: number
  }> {
    const supabase = createClient()

    try {
      // Get all pending digest jobs
      const { data: pendingJobs, error } = await supabase
        .from('delivery_jobs')
        .select(`
          *,
          recipients!inner(*),
          updates!inner(*),
          group_memberships!inner(
            *,
            recipient_groups!inner(*)
          )
        `)
        .eq('status', 'queued')
        .lte('scheduled_for', new Date().toISOString())
        .or(`channel.eq.email,channel.eq.whatsapp`) // Process email and WhatsApp digests

      if (error) {
        logger.errorWithStack('Error fetching pending digest jobs:', error as Error)
        return { processed: 0, errors: 1 }
      }

      // Group jobs by recipient and channel
      const groupedJobs = this.groupJobsByRecipientAndChannel((pendingJobs ?? []) as DeliveryJobWithRelations[])

      let processed = 0
      let errors = 0

      for (const [recipientKey, jobs] of groupedJobs.entries()) {
        try {
          await this.sendDigestNotification(recipientKey, jobs, digestType)
          processed += jobs.length

          // Mark jobs as sent
          const jobIds = jobs.map(job => job.id)
          await supabase
            .from('delivery_jobs')
            .update({
              status: 'sent',
              sent_at: new Date().toISOString()
            })
            .in('id', jobIds)

        } catch (error) {
          logger.errorWithStack(`Error processing digest for ${recipientKey}:`, error as Error)
          errors += jobs.length
        }
      }

      return { processed, errors }
    } catch (error) {
      logger.errorWithStack('Error in processDigests:', error as Error)
      return { processed: 0, errors: 1 }
    }
  }

  /**
   * Group delivery jobs by recipient and channel for digest creation
   */
  private static groupJobsByRecipientAndChannel(
    jobs: DeliveryJobWithRelations[]
  ): Map<string, DeliveryJobWithRelations[]> {
    const grouped = new Map<string, DeliveryJobWithRelations[]>()

    for (const job of jobs) {
      const key = `${job.recipient_id}_${job.channel}`
      if (!grouped.has(key)) {
        grouped.set(key, [])
      }
      grouped.get(key)!.push(job)
    }

    return grouped
  }

  /**
   * Send digest notification for a recipient
   */
  private static async sendDigestNotification(
    recipientKey: string,
    jobs: DeliveryJobWithRelations[],
    digestType: 'daily' | 'weekly'
  ): Promise<void> {
    if (jobs.length === 0) {
      return
    }
    const [recipientId, channel] = recipientKey.split('_') as [string, NotificationChannel]
    const recipient = jobs[0].recipients
    const updates = jobs.map(job => job.updates)

    // Group updates by child and group context
    const groupedUpdates = this.groupUpdatesByContext(updates, jobs)

    // Create digest content
    const digestContent = await this.createDigestContent(
      recipient,
      groupedUpdates,
      digestType
    )

    // Send via appropriate channel
    switch (channel) {
      case 'email':
        await this.sendEmailDigest(recipient, digestContent)
        break
      case 'whatsapp':
        await this.sendWhatsAppDigest(recipient, digestContent)
        break
      default:
        logger.warn(`Unsupported digest channel: ${channel} for recipient ${recipientId}`)
    }
  }

  /**
   * Group updates by group context for better digest organization
   */
  private static groupUpdatesByContext(
    updates: UpdateRecord[],
    jobs: DeliveryJobWithRelations[]
  ): Record<string, DigestUpdate[]> {
    const grouped: Record<string, DigestUpdate[]> = {}

    updates.forEach((update, index) => {
      const job = jobs[index]
      const groupContext = this.parseGroupContext(job.group_context)
      const groupId = groupContext.group_id || DEFAULT_GROUP_CONTEXT.group_id

      if (!grouped[groupId]) {
        grouped[groupId] = []
      }

      grouped[groupId].push({
        ...update,
        group_context: groupContext
      })
    })

    return grouped
  }

  private static parseGroupContext(rawContext: string | null): GroupContext {
    if (!rawContext) {
      return { ...DEFAULT_GROUP_CONTEXT }
    }

    try {
      const parsed = JSON.parse(rawContext) as Partial<GroupContext>
      return {
        group_id: parsed.group_id || DEFAULT_GROUP_CONTEXT.group_id,
        group_name: parsed.group_name || DEFAULT_GROUP_CONTEXT.group_name,
        role: parsed.role || DEFAULT_GROUP_CONTEXT.role,
        created_at: parsed.created_at || DEFAULT_GROUP_CONTEXT.created_at
      }
    } catch {
      return { ...DEFAULT_GROUP_CONTEXT }
    }
  }

  /**
   * Create digest content organized by groups
   */
  private static async createDigestContent(
    recipient: RecipientRecord,
    groupedUpdates: Record<string, DigestUpdate[]>,
    digestType: 'daily' | 'weekly'
  ): Promise<DigestContent> {
    const totalUpdates = Object.values(groupedUpdates).flat().length
    const groupCount = Object.keys(groupedUpdates).length

    const subject = `Your ${digestType} update digest (${totalUpdates} updates from ${groupCount} groups)`

    const preferenceLink = recipient.preference_token
      ? `${process.env.NEXT_PUBLIC_APP_URL}/preferences/${recipient.preference_token}`
      : `${process.env.NEXT_PUBLIC_APP_URL ?? ''}/preferences`

    let html = `
      <h1>Hello ${recipient.name}!</h1>
      <p>Here's your ${digestType} digest of baby updates:</p>
    `

    let text = `Hello ${recipient.name}!\n\nHere's your ${digestType} digest of baby updates:\n\n`

    // Process each group's updates
    for (const [, updates] of Object.entries(groupedUpdates)) {
      const groupName = updates[0]?.group_context.group_name || 'Unknown Group'

      html += `
        <h2>${groupName} (${updates.length} updates)</h2>
        <div style="margin-left: 20px;">
      `

      text += `${groupName} (${updates.length} updates):\n`

      for (const update of updates) {
        const updateContent = update.content || 'New memory'
        html += `
          <div style="border-bottom: 1px solid #eee; padding: 10px 0;">
            <p>${updateContent}</p>
            <small>Posted on ${new Date(update.created_at).toLocaleDateString()}</small>
          </div>
        `

        text += `- ${updateContent} (${new Date(update.created_at).toLocaleDateString()})\n`
      }

      html += '</div>'
      text += '\n'
    }

    html += `
      <hr>
      <p><small>
        You received this digest because you&apos;re a member of these groups.
        <a href="${preferenceLink}">
          Manage your notification preferences
        </a>
      </small></p>
    `

    text += `\nYou received this digest because you're a member of these groups.\nManage your preferences: ${preferenceLink}`

    return { subject, html, text }
  }

  /**
   * Send email digest
   */
  private static async sendEmailDigest(recipient: RecipientRecord, content: DigestContent): Promise<void> {
    if (!recipient.email) {
      logger.warn(`Attempted to send email digest without recipient email for ${recipient.id}`)
      return
    }

    logger.info(`Sending email digest to ${recipient.email}`, {
      subject: content.subject
    })
    // Implementation would use the existing email service
  }

  /**
   * Send WhatsApp digest
   */
  private static async sendWhatsAppDigest(recipient: RecipientRecord, content: DigestContent): Promise<void> {
    if (!recipient.phone) {
      logger.warn(`Attempted to send WhatsApp digest without recipient phone for ${recipient.id}`)
      return
    }

    logger.info(`Sending WhatsApp digest to ${recipient.phone}`, {
      subject: content.subject
    })
    // Implementation would use WhatsApp API
  }
}
