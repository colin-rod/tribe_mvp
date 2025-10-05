import { createClient } from '@/lib/supabase/client'
import { createLogger } from '@/lib/logger'
import { serverEmailService } from './serverEmailService'
import { smsService } from './smsService'
import { notificationTemplateService } from './notificationTemplateService'
import { getEnv } from '@/lib/env'
const logger = createLogger('GroupNotificationService')

export interface NotificationPreferences {
  frequency?: string
  channels?: string[]
  content_types?: string[]
  [key: string]: unknown
}

export interface MuteSettings {
  preserve_urgent?: boolean
  mute_until?: string
  [key: string]: unknown
}

export type NotificationContent = Record<string, unknown>

export interface NotificationRecipient {
  id: string
  name: string
  email?: string
  phone?: string
  preference_token: string
  relationship: string
  group_memberships: GroupMembership[]
  notification_preferences?: NotificationPreferences
}

export interface GroupMembership {
  group_id: string
  group_name: string
  frequency?: string
  preferred_channels?: string[]
  content_types?: string[]
  mute_until?: string
  mute_settings?: MuteSettings
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
  content: NotificationContent
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
        .from('recipients')
        .select(`
          id,
          name,
          email,
          phone,
          preference_token,
          relationship,
          parent_id,
          group_id,
          frequency,
          preferred_channels,
          content_types,
          is_active,
          recipient_groups!inner(
            id,
            name,
            default_frequency,
            default_channels
          )
        `)
        .eq('group_id', groupId)
        .eq('is_active', true)
        .eq('parent_id', parentId)

      if (error) {
        logger.errorWithStack('Error fetching group recipients:', error as Error)
        throw new Error('Failed to fetch group recipients')
      }

      type MembershipWithRelations = {
        id: string
        name: string
        email: string | null
        phone: string | null
        preference_token: string
        relationship: string
        parent_id: string
        group_id: string | null
        frequency: string | null
        preferred_channels: string[] | null
        content_types: string[] | null
        is_active: boolean | null
        recipient_groups: {
          id: string
          name: string
          default_frequency: string | null
          default_channels: string[] | null
        }
      }

      // Transform data and check for mutes
      const recipients: NotificationRecipient[] = []

      for (const membership of (memberships || []) as MembershipWithRelations[]) {
        const group = membership.recipient_groups

        // Check if recipient is currently muted
        const isMuted = await this.isRecipientMuted(membership.id, groupId)

        if (!isMuted) {
          recipients.push({
            id: membership.id,
            name: membership.name,
            email: membership.email || undefined,
            phone: membership.phone || undefined,
            preference_token: membership.preference_token,
            relationship: membership.relationship,
            notification_preferences: undefined, // Not available on recipients table
            group_memberships: [{
              group_id: groupId,
              group_name: group.name,
              frequency: membership.frequency || undefined,
              preferred_channels: membership.preferred_channels || undefined,
              content_types: membership.content_types || undefined,
              mute_until: undefined, // Not available
              mute_settings: undefined, // Not available
              is_active: membership.is_active || false
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
        // @ts-expect-error - Supabase type inference issue
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
          // @ts-expect-error - Supabase type inference issue
          .rpc('get_mute_settings', {
            p_recipient_id: recipientId,
            p_group_id: groupId
          })

        const preserveUrgent = (muteSettings as { preserve_urgent?: boolean } | null)?.preserve_urgent !== false
        return !preserveUrgent // If preserve_urgent is true, don't suppress urgent notifications
      }

      return Boolean(data)

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
        // @ts-expect-error - Supabase type inference issue
        .rpc('get_effective_notification_settings', {
          p_recipient_id: recipientId,
          p_group_id: groupId
        })

      if (error || !data) {
        // Fallback to manual resolution
        type MembershipWithGroup = {
          frequency?: string
          preferred_channels?: string[]
          content_types?: string[]
          recipient_groups: {
            default_frequency: string
            default_channels: string[]
          }
        }

        const { data: membership } = await this.supabase
          .from('recipients')
          .select(`
            frequency,
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
          const typedMembership = membership as unknown as MembershipWithGroup
          return {
            frequency: typedMembership.frequency || typedMembership.recipient_groups.default_frequency || 'every_update',
            channels: typedMembership.preferred_channels || typedMembership.recipient_groups.default_channels || ['email'],
            content_types: typedMembership.content_types || ['photos', 'text', 'milestones'],
            source: typedMembership.frequency ? 'member_override' : 'group_default'
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

      return data as {
        frequency: string
        channels: string[]
        content_types: string[]
        source: 'member_override' | 'group_default' | 'system_default'
      }

    } catch (error) {
      logger.errorWithStack('Error getting effective settings:', error as Error)
      return {
        frequency: 'every_update',
        channels: ['email'],
        content_types: ['photos', 'text', 'milestones'],
        source: 'system_default' as const
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
        // @ts-expect-error - Supabase type inference issue
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

      return Boolean(data)

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
    content: NotificationContent,
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
          .from('delivery_jobs')
          // @ts-expect-error - Supabase type inference issue
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
        .from('delivery_jobs')
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

      type NotificationJobFromDB = {
        id: string
        recipient_id: string
        group_id: string
        update_id: string
        notification_type: 'immediate' | 'digest' | 'milestone'
        urgency_level: 'normal' | 'urgent' | 'low'
        delivery_method: 'email' | 'sms' | 'whatsapp'
        content: NotificationContent
        scheduled_for: string
        status: 'pending' | 'sent' | 'failed' | 'skipped'
      }

      for (const job of (jobs as unknown as NotificationJobFromDB[])) {
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
          const deliveryResult = await this.deliverNotification(job as NotificationJob)
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
    logger.info(`Delivering ${job.delivery_method} notification to ${job.recipient_id} for update ${job.update_id}`, {
      jobId: job.id,
      notificationType: job.notification_type,
      urgencyLevel: job.urgency_level
    })

    try {
      type RecipientDetails = {
        email?: string
        phone?: string
        name: string
      }

      // Get recipient details for delivery
      const { data: recipient, error: recipientError } = await this.supabase
        .from('recipients')
        .select('email, phone, name')
        .eq('id', job.recipient_id)
        .single()

      if (recipientError || !recipient) {
        logger.error('Failed to fetch recipient details', {
          recipientId: job.recipient_id,
          error: recipientError
        })
        return {
          recipient_id: job.recipient_id,
          group_id: job.group_id,
          delivery_method: job.delivery_method,
          status: 'failed',
          reason: 'Recipient not found'
        }
      }

      const typedRecipient = recipient as unknown as RecipientDetails

      // Prepare template data
      const templateData = {
        ...job.content,
        recipient_name: typedRecipient.name,
        app_domain: getEnv().APP_DOMAIN || 'localhost:3000'
      }

      switch (job.delivery_method) {
        case 'email':
          return await this.deliverEmail(job, typedRecipient.email || '', templateData)
        case 'sms':
          return await this.deliverSMS(job, typedRecipient.phone || '', templateData)
        case 'whatsapp':
          return await this.deliverWhatsApp(job, typedRecipient.phone || '', templateData)
        default:
          logger.error('Unsupported delivery method', {
            deliveryMethod: job.delivery_method,
            jobId: job.id
          })
          return {
            recipient_id: job.recipient_id,
            group_id: job.group_id,
            delivery_method: job.delivery_method,
            status: 'failed',
            reason: `Unsupported delivery method: ${job.delivery_method}`
          }
      }
    } catch (error) {
      logger.errorWithStack('Notification delivery error', error as Error, {
        jobId: job.id,
        recipientId: job.recipient_id,
        deliveryMethod: job.delivery_method
      })
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
   * Deliver notification via email
   */
  private async deliverEmail(
    job: NotificationJob,
    email: string,
    templateData: Record<string, unknown>
  ): Promise<DeliveryResult> {
    if (!email) {
      return {
        recipient_id: job.recipient_id,
        group_id: job.group_id,
        delivery_method: job.delivery_method,
        status: 'failed',
        reason: 'No email address available'
      }
    }

    if (!serverEmailService.isConfigured()) {
      logger.error('Email service not configured')
      return {
        recipient_id: job.recipient_id,
        group_id: job.group_id,
        delivery_method: job.delivery_method,
        status: 'failed',
        reason: 'Email service not configured'
      }
    }

    try {
      const template = notificationTemplateService.generateEmailTemplate(
        job.notification_type,
        templateData
      )

      const result = await serverEmailService.sendEmail({
        to: email,
        subject: template.subject || 'New update from Tribe',
        html: template.html || template.message,
        text: template.message,
        categories: [`tribe-${job.notification_type}`, 'tribe-group-notification'],
        customArgs: {
          jobId: job.id,
          recipientId: job.recipient_id,
          groupId: job.group_id,
          updateId: job.update_id,
          notificationType: job.notification_type,
          urgencyLevel: job.urgency_level
        }
      })

      if (result.success) {
        logger.info('Email delivered successfully', {
          jobId: job.id,
          messageId: result.messageId,
          to: email.substring(0, 3) + '***' + email.substring(email.length - 3)
        })
        return {
          recipient_id: job.recipient_id,
          group_id: job.group_id,
          delivery_method: job.delivery_method,
          status: 'delivered',
          message_id: result.messageId
        }
      } else {
        logger.error('Email delivery failed', {
          jobId: job.id,
          error: result.error,
          statusCode: result.statusCode
        })
        return {
          recipient_id: job.recipient_id,
          group_id: job.group_id,
          delivery_method: job.delivery_method,
          status: 'failed',
          reason: result.error || 'Email delivery failed'
        }
      }
    } catch (error) {
      logger.errorWithStack('Email delivery error', error as Error, {
        jobId: job.id,
        recipientId: job.recipient_id
      })
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
   * Deliver notification via SMS
   */
  private async deliverSMS(
    job: NotificationJob,
    phone: string,
    templateData: Record<string, unknown>
  ): Promise<DeliveryResult> {
    if (!phone) {
      return {
        recipient_id: job.recipient_id,
        group_id: job.group_id,
        delivery_method: job.delivery_method,
        status: 'failed',
        reason: 'No phone number available'
      }
    }

    if (!smsService.isConfigured()) {
      logger.error('SMS service not configured')
      return {
        recipient_id: job.recipient_id,
        group_id: job.group_id,
        delivery_method: job.delivery_method,
        status: 'failed',
        reason: 'SMS service not configured'
      }
    }

    try {
      const template = notificationTemplateService.generateSMSTemplate(
        job.notification_type,
        templateData
      )

      const result = await smsService.sendSMS({
        to: phone,
        message: template.message
      })

      if (result.success) {
        logger.info('SMS delivered successfully', {
          jobId: job.id,
          messageId: result.messageId,
          deliveryStatus: result.deliveryStatus
        })
        return {
          recipient_id: job.recipient_id,
          group_id: job.group_id,
          delivery_method: job.delivery_method,
          status: 'delivered',
          message_id: result.messageId
        }
      } else {
        logger.error('SMS delivery failed', {
          jobId: job.id,
          error: result.error,
          statusCode: result.statusCode
        })
        return {
          recipient_id: job.recipient_id,
          group_id: job.group_id,
          delivery_method: job.delivery_method,
          status: 'failed',
          reason: result.error || 'SMS delivery failed'
        }
      }
    } catch (error) {
      logger.errorWithStack('SMS delivery error', error as Error, {
        jobId: job.id,
        recipientId: job.recipient_id
      })
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
   * Deliver notification via WhatsApp
   */
  private async deliverWhatsApp(
    job: NotificationJob,
    phone: string,
    templateData: Record<string, unknown>
  ): Promise<DeliveryResult> {
    if (!phone) {
      return {
        recipient_id: job.recipient_id,
        group_id: job.group_id,
        delivery_method: job.delivery_method,
        status: 'failed',
        reason: 'No phone number available'
      }
    }

    if (!smsService.isConfigured()) {
      logger.error('WhatsApp service not configured')
      return {
        recipient_id: job.recipient_id,
        group_id: job.group_id,
        delivery_method: job.delivery_method,
        status: 'failed',
        reason: 'WhatsApp service not configured'
      }
    }

    try {
      const template = notificationTemplateService.generateWhatsAppTemplate(
        job.notification_type,
        templateData
      )

      const result = await smsService.sendWhatsApp({
        to: phone,
        message: template.message
      })

      if (result.success) {
        logger.info('WhatsApp message delivered successfully', {
          jobId: job.id,
          messageId: result.messageId,
          deliveryStatus: result.deliveryStatus,
          whatsappStatus: result.whatsappStatus
        })
        return {
          recipient_id: job.recipient_id,
          group_id: job.group_id,
          delivery_method: job.delivery_method,
          status: 'delivered',
          message_id: result.messageId
        }
      } else {
        logger.error('WhatsApp delivery failed', {
          jobId: job.id,
          error: result.error,
          statusCode: result.statusCode
        })
        return {
          recipient_id: job.recipient_id,
          group_id: job.group_id,
          delivery_method: job.delivery_method,
          status: 'failed',
          reason: result.error || 'WhatsApp delivery failed'
        }
      }
    } catch (error) {
      logger.errorWithStack('WhatsApp delivery error', error as Error, {
        jobId: job.id,
        recipientId: job.recipient_id
      })
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
    type JobStatusUpdate = {
      status: 'sent' | 'failed' | 'skipped'
      processed_at: string
      failure_reason?: string
      message_id?: string
    }

    const updateData: JobStatusUpdate = {
      status,
      processed_at: new Date().toISOString()
    }

    if (reason) {
      updateData.failure_reason = reason
    }
    if (messageId) {
      updateData.message_id = messageId
    }

    const { error } = await this.supabase
      .from('delivery_jobs')
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

      type JobAnalytics = {
        channel: 'email' | 'sms' | 'whatsapp'
        status: 'queued' | 'sent' | 'delivered' | 'failed'
      }

      const { data: jobs, error } = await this.supabase
        .from('delivery_jobs')
        .select('channel, status')
        .gte('queued_at', startDate.toISOString())

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

      for (const job of (jobs || []) as JobAnalytics[]) {
        stats.total_sent++

        switch (job.status) {
          case 'delivered':
            stats.total_delivered++
            break
          case 'failed':
            stats.total_failed++
            break
          case 'sent':
            stats.total_delivered++
            break
        }

        channelCounts.set(job.channel, (channelCounts.get(job.channel) || 0) + 1)
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
