import { createClient } from '@/lib/supabase/client'
import { createLogger } from '@/lib/logger'
import type { Database } from '@/lib/types/database'

const logger = createLogger('GroupNotificationService')

export interface NotificationRecipient {
  id: string
  name: string
  email?: string
  phone?: string
  preference_token: string
  relationship: string
  group_memberships: GroupMembership[]
  notification_preferences?: any
}

export interface GroupMembership {
  group_id: string
  group_name: string
  notification_frequency?: string
  preferred_channels?: string[]
  content_types?: string[]
  mute_until?: string
  mute_settings?: any
  is_active: boolean
}

export interface NotificationJob {
  id: string
  recipient_id: string
  group_id: string
  update_id: string
  scheduled_for: string
  notification_type: 'immediate' | 'digest' | 'milestone'
  urgency_level: 'normal' | 'urgent' | 'low'
  content: any
  delivery_method: 'email' | 'sms' | 'whatsapp'
  status: 'pending' | 'sent' | 'failed' | 'skipped'
}

export interface DeliveryResult {
  recipient_id: string
  group_id: string
  delivery_method: string
  status: 'delivered' | 'muted' | 'failed' | 'scheduled'
  reason?: string
  scheduled_for?: string
  message_id?: string
}

/**
 * Enhanced notification service that handles group-based preferences and mute settings
 */
export class GroupNotificationService {
  private supabase = createClient()

  /**
   * Get all active recipients for a group with their effective notification settings
   */
  async getGroupRecipients(groupId: string, parentId: string): Promise<NotificationRecipient[]> {
    try {
      const { data: memberships, error } = await this.supabase
        .from('group_memberships')
        .select(`
          *,
          recipients!inner(
            id,
            name,
            email,
            phone,
            preference_token,
            relationship,
            notification_preferences,
            parent_id
          ),
          recipient_groups!inner(
            id,
            name,
            default_frequency,
            default_channels,
            notification_settings
          )
        `)
        .eq('group_id', groupId)
        .eq('is_active', true)
        .eq('recipients.parent_id', parentId)
        .eq('recipients.is_active', true)

      if (error) {
        logger.errorWithStack('Error fetching group recipients:', error as Error)
        throw new Error('Failed to fetch group recipients')
      }

      // Transform data and check for mutes
      const recipients: NotificationRecipient[] = []

      for (const membership of memberships || []) {
        const recipient = membership.recipients
        const group = membership.recipient_groups

        // Check if recipient is currently muted
        const isMuted = await this.isRecipientMuted(recipient.id, groupId)

        if (!isMuted) {
          recipients.push({
            id: recipient.id,
            name: recipient.name,
            email: recipient.email,
            phone: recipient.phone,
            preference_token: recipient.preference_token,
            relationship: recipient.relationship,
            notification_preferences: recipient.notification_preferences,
            group_memberships: [{
              group_id: groupId,
              group_name: group.name,
              notification_frequency: membership.notification_frequency,
              preferred_channels: membership.preferred_channels,
              content_types: membership.content_types,
              mute_until: membership.mute_until,
              mute_settings: membership.mute_settings,
              is_active: membership.is_active
            }]
          })
        }
      }

      return recipients

    } catch (error) {
      logger.errorWithStack('Error in getGroupRecipients:', error as Error)
      throw error
    }
  }

  /**
   * Check if a recipient is currently muted for a group or globally
   */
  async isRecipientMuted(
    recipientId: string,
    groupId?: string,
    urgencyLevel: 'normal' | 'urgent' | 'low' = 'normal'
  ): Promise<boolean> {
    try {
      const { data, error } = await this.supabase
        .rpc('is_recipient_muted', {
          p_recipient_id: recipientId,
          p_group_id: groupId
        })

      if (error) {
        logger.errorWithStack('Error checking mute status:', error as Error)
        return false // Default to not muted if error
      }

      // If not muted, return false
      if (!data) return false

      // If muted, check if urgent notifications should still be delivered
      if (urgencyLevel === 'urgent') {
        const { data: muteSettings } = await this.supabase
          .rpc('get_mute_settings', {
            p_recipient_id: recipientId,
            p_group_id: groupId
          })

        const preserveUrgent = muteSettings?.preserve_urgent !== false
        return !preserveUrgent // If preserve_urgent is true, don't suppress urgent notifications
      }

      return data

    } catch (error) {
      logger.errorWithStack('Error checking mute status:', error as Error)
      return false
    }
  }

  /**
   * Get effective notification settings for a recipient in a group
   */
  async getEffectiveSettings(recipientId: string, groupId: string): Promise<{
    frequency: string
    channels: string[]
    content_types: string[]
    source: 'member_override' | 'group_default' | 'system_default'
  }> {
    try {
      const { data, error } = await this.supabase
        .rpc('get_effective_notification_settings', {
          p_recipient_id: recipientId,
          p_group_id: groupId
        })

      if (error || !data) {
        // Fallback to manual resolution
        const { data: membership } = await this.supabase
          .from('group_memberships')
          .select(`
            notification_frequency,
            preferred_channels,
            content_types,
            recipient_groups!inner(
              default_frequency,
              default_channels
            )
          `)
          .eq('recipient_id', recipientId)
          .eq('group_id', groupId)
          .eq('is_active', true)
          .single()

        if (membership) {
          return {
            frequency: membership.notification_frequency || membership.recipient_groups.default_frequency || 'every_update',
            channels: membership.preferred_channels || membership.recipient_groups.default_channels || ['email'],
            content_types: membership.content_types || ['photos', 'text', 'milestones'],
            source: membership.notification_frequency ? 'member_override' : 'group_default'
          }
        }

        // System defaults
        return {
          frequency: 'every_update',
          channels: ['email'],
          content_types: ['photos', 'text', 'milestones'],
          source: 'system_default'
        }
      }

      return data

    } catch (error) {
      logger.errorWithStack('Error getting effective settings:', error as Error)
      return {
        frequency: 'every_update',
        channels: ['email'],
        content_types: ['photos', 'text', 'milestones'],
        source: 'system_default'
      }
    }
  }

  /**
   * Determine if a notification should be delivered based on recipient settings
   */
  async shouldDeliverNotification(
    recipientId: string,
    groupId: string,
    notificationType: 'update' | 'milestone' | 'digest' = 'update',
    urgencyLevel: 'normal' | 'urgent' | 'low' = 'normal'
  ): Promise<boolean> {
    try {
      const { data, error } = await this.supabase
        .rpc('should_deliver_notification', {
          p_recipient_id: recipientId,
          p_group_id: groupId,
          p_notification_type: notificationType,
          p_urgency_level: urgencyLevel
        })

      if (error) {
        logger.errorWithStack('Error checking delivery eligibility:', error as Error)
        return true // Default to deliver if error
      }

      return data || false

    } catch (error) {
      logger.errorWithStack('Error in shouldDeliverNotification:', error as Error)
      return true
    }
  }

  /**
   * Create notification jobs for a group update
   */
  async createNotificationJobs(
    updateId: string,
    groupId: string,
    parentId: string,
    content: any,
    options: {
      notificationType?: 'immediate' | 'digest' | 'milestone'
      urgencyLevel?: 'normal' | 'urgent' | 'low'
      scheduleDelay?: number // minutes
    } = {}
  ): Promise<NotificationJob[]> {
    try {
      const {
        notificationType = 'immediate',
        urgencyLevel = 'normal',
        scheduleDelay = 0
      } = options

      // Get all eligible recipients
      const recipients = await this.getGroupRecipients(groupId, parentId)
      const jobs: NotificationJob[] = []

      for (const recipient of recipients) {
        // Check if notification should be delivered
        const shouldDeliver = await this.shouldDeliverNotification(
          recipient.id,
          groupId,
          notificationType === 'immediate' ? 'update' : notificationType,
          urgencyLevel
        )

        if (!shouldDeliver) {
          logger.info(`Skipping notification for recipient ${recipient.id} - muted or filtered`)
          continue
        }

        // Get effective settings
        const settings = await this.getEffectiveSettings(recipient.id, groupId)

        // Determine delivery schedule based on frequency setting
        let scheduledFor = new Date()
        if (scheduleDelay > 0) {
          scheduledFor.setMinutes(scheduledFor.getMinutes() + scheduleDelay)
        }

        if (notificationType === 'immediate' && settings.frequency !== 'every_update') {
          // Schedule for digest delivery
          scheduledFor = this.calculateDigestDeliveryTime(settings.frequency)
        }

        // Create jobs for each preferred channel
        for (const channel of settings.channels) {
          if (this.canDeliverViaChannel(recipient, channel)) {
            jobs.push({
              id: `${updateId}_${recipient.id}_${channel}_${Date.now()}`,
              recipient_id: recipient.id,
              group_id: groupId,
              update_id: updateId,
              scheduled_for: scheduledFor.toISOString(),
              notification_type: notificationType,
              urgency_level: urgencyLevel,
              content: {
                ...content,
                recipient_name: recipient.name,
                preference_token: recipient.preference_token,
                effective_settings: settings
              },
              delivery_method: channel as 'email' | 'sms' | 'whatsapp',
              status: 'pending'
            })
          }
        }
      }

      // Store jobs in database
      if (jobs.length > 0) {
        const { error } = await this.supabase
          .from('notification_jobs')
          .insert(jobs.map(job => ({
            ...job,
            created_at: new Date().toISOString()
          })))

        if (error) {
          logger.errorWithStack('Error storing notification jobs:', error as Error)
          throw new Error('Failed to create notification jobs')
        }
      }

      logger.info(`Created ${jobs.length} notification jobs for update ${updateId}`)
      return jobs

    } catch (error) {
      logger.errorWithStack('Error creating notification jobs:', error as Error)
      throw error
    }
  }

  /**
   * Process pending notification jobs
   */
  async processPendingJobs(batchSize: number = 50): Promise<DeliveryResult[]> {
    try {
      // Get pending jobs that are due
      const { data: jobs, error } = await this.supabase
        .from('notification_jobs')
        .select('*')
        .eq('status', 'pending')
        .lte('scheduled_for', new Date().toISOString())
        .order('scheduled_for')
        .limit(batchSize)

      if (error) {
        logger.errorWithStack('Error fetching pending jobs:', error as Error)
        throw new Error('Failed to fetch pending notification jobs')
      }

      if (!jobs || jobs.length === 0) {
        return []
      }

      const results: DeliveryResult[] = []

      for (const job of jobs) {
        try {
          // Double-check if recipient is still eligible for notification
          const shouldDeliver = await this.shouldDeliverNotification(
            job.recipient_id,
            job.group_id,
            job.notification_type === 'immediate' ? 'update' : job.notification_type,
            job.urgency_level
          )

          if (!shouldDeliver) {
            // Mark as skipped
            await this.updateJobStatus(job.id, 'skipped', 'Recipient muted or ineligible')
            results.push({
              recipient_id: job.recipient_id,
              group_id: job.group_id,
              delivery_method: job.delivery_method,
              status: 'muted',
              reason: 'Recipient muted or ineligible'
            })
            continue
          }

          // Attempt delivery
          const deliveryResult = await this.deliverNotification(job)
          results.push(deliveryResult)

          // Update job status
          await this.updateJobStatus(
            job.id,
            deliveryResult.status === 'delivered' ? 'sent' : 'failed',
            deliveryResult.reason,
            deliveryResult.message_id
          )

        } catch (error) {
          logger.errorWithStack(`Error processing job ${job.id}:`, error as Error)
          await this.updateJobStatus(job.id, 'failed', (error as Error).message)
          results.push({
            recipient_id: job.recipient_id,
            group_id: job.group_id,
            delivery_method: job.delivery_method,
            status: 'failed',
            reason: (error as Error).message
          })
        }
      }

      logger.info(`Processed ${results.length} notification jobs`)
      return results

    } catch (error) {
      logger.errorWithStack('Error processing pending jobs:', error as Error)
      throw error
    }
  }

  /**
   * Deliver a single notification
   */
  private async deliverNotification(job: NotificationJob): Promise<DeliveryResult> {
    // This would integrate with your existing email/SMS services
    // For now, this is a placeholder implementation

    logger.info(`Delivering ${job.delivery_method} notification to ${job.recipient_id} for update ${job.update_id}`)

    try {
      // Simulate delivery (replace with actual delivery logic)
      const mockSuccess = Math.random() > 0.1 // 90% success rate

      if (mockSuccess) {
        return {
          recipient_id: job.recipient_id,
          group_id: job.group_id,
          delivery_method: job.delivery_method,
          status: 'delivered',
          message_id: `msg_${Date.now()}_${job.recipient_id}`
        }
      } else {
        return {
          recipient_id: job.recipient_id,
          group_id: job.group_id,
          delivery_method: job.delivery_method,
          status: 'failed',
          reason: 'Simulated delivery failure'
        }
      }

    } catch (error) {
      return {
        recipient_id: job.recipient_id,
        group_id: job.group_id,
        delivery_method: job.delivery_method,
        status: 'failed',
        reason: (error as Error).message
      }
    }
  }

  /**
   * Update notification job status
   */
  private async updateJobStatus(
    jobId: string,
    status: 'sent' | 'failed' | 'skipped',
    reason?: string,
    messageId?: string
  ): Promise<void> {
    const updateData: any = {
      status,
      processed_at: new Date().toISOString()
    }

    if (reason) updateData.failure_reason = reason
    if (messageId) updateData.message_id = messageId

    const { error } = await this.supabase
      .from('notification_jobs')
      .update(updateData)
      .eq('id', jobId)

    if (error) {
      logger.errorWithStack(`Error updating job ${jobId}:`, error as Error)
    }
  }

  /**
   * Calculate when to deliver digest notifications
   */
  private calculateDigestDeliveryTime(frequency: string): Date {
    const now = new Date()
    const deliveryTime = new Date()

    switch (frequency) {
      case 'daily_digest':
        // Deliver at 8 AM local time tomorrow
        deliveryTime.setDate(now.getDate() + 1)
        deliveryTime.setHours(8, 0, 0, 0)
        break

      case 'weekly_digest':
        // Deliver next Sunday at 8 AM
        const daysUntilSunday = (7 - now.getDay()) % 7 || 7
        deliveryTime.setDate(now.getDate() + daysUntilSunday)
        deliveryTime.setHours(8, 0, 0, 0)
        break

      case 'milestones_only':
        // Deliver immediately for milestones
        break

      default:
        // Immediate delivery
        break
    }

    return deliveryTime
  }

  /**
   * Check if recipient can receive notifications via a specific channel
   */
  private canDeliverViaChannel(recipient: NotificationRecipient, channel: string): boolean {
    switch (channel) {
      case 'email':
        return !!recipient.email
      case 'sms':
      case 'whatsapp':
        return !!recipient.phone
      default:
        return false
    }
  }

  /**
   * Get notification analytics for a group
   */
  async getNotificationAnalytics(groupId: string, days: number = 30): Promise<{
    total_sent: number
    total_delivered: number
    total_failed: number
    total_muted: number
    delivery_rate: number
    channel_breakdown: { channel: string; count: number }[]
    frequency_breakdown: { frequency: string; count: number }[]
  }> {
    try {
      const startDate = new Date()
      startDate.setDate(startDate.getDate() - days)

      const { data: jobs, error } = await this.supabase
        .from('notification_jobs')
        .select('delivery_method, status')
        .eq('group_id', groupId)
        .gte('created_at', startDate.toISOString())

      if (error) {
        logger.errorWithStack('Error fetching notification analytics:', error as Error)
        throw new Error('Failed to fetch analytics')
      }

      const stats = {
        total_sent: 0,
        total_delivered: 0,
        total_failed: 0,
        total_muted: 0,
        delivery_rate: 0,
        channel_breakdown: [] as { channel: string; count: number }[],
        frequency_breakdown: [] as { frequency: string; count: number }[]
      }

      const channelCounts = new Map<string, number>()

      for (const job of jobs || []) {
        stats.total_sent++

        switch (job.status) {
          case 'sent':
            stats.total_delivered++
            break
          case 'failed':
            stats.total_failed++
            break
          case 'skipped':
            stats.total_muted++
            break
        }

        channelCounts.set(job.delivery_method, (channelCounts.get(job.delivery_method) || 0) + 1)
      }

      stats.delivery_rate = stats.total_sent > 0 ? (stats.total_delivered / stats.total_sent) * 100 : 0
      stats.channel_breakdown = Array.from(channelCounts.entries()).map(([channel, count]) => ({
        channel,
        count
      }))

      return stats

    } catch (error) {
      logger.errorWithStack('Error getting notification analytics:', error as Error)
      throw error
    }
  }
}