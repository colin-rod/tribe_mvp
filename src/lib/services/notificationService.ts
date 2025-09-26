'use client'

import { createLogger } from '@/lib/logger'

const logger = createLogger('NotificationService')

import { createClient } from '@/lib/supabase/client'
import { clientEmailService } from './clientEmailService'
import type { NotificationDeliveryMethod, NotificationStatus, NotificationDigestType } from '@/lib/types/profile'

export interface NotificationHistoryEntry {
  id: string
  user_id: string
  type: 'response' | 'prompt' | 'delivery' | 'system' | 'digest'
  title: string
  content?: string
  metadata: NotificationMetadata
  read_at?: string
  sent_at: string
  delivery_method: NotificationDeliveryMethod
  delivery_status: NotificationStatus
  created_at: string
}

export interface DigestQueueEntry {
  id: string
  user_id: string
  digest_type: NotificationDigestType
  content: NotificationData
  scheduled_for: string
  sent_at?: string
  delivery_status: NotificationStatus | 'processing'
  retry_count: number
  error_message?: string
  created_at: string
}

type NotificationMetadata = Record<string, unknown>

interface NotificationData extends NotificationMetadata {
  senderName?: string
  babyName?: string
  period?: string
  unreadCount?: number
  title?: string
  updateContent?: string
  promptText?: string
  content?: string
  replyUrl?: string
  responseUrl?: string
  digestUrl?: string
  actionUrl?: string
  actionText?: string
  recipientName?: string
  preferenceUrl?: string
  updates?: Array<{
    senderName?: string
    content?: string
    timestamp?: string
  }>
}

type NotificationHistorySummary = Pick<NotificationHistoryEntry, 'type' | 'delivery_method' | 'delivery_status' | 'sent_at'>

export class NotificationService {
  private supabase = createClient()

  // Create notification history entry
  async createNotificationHistory(entry: Omit<NotificationHistoryEntry, 'id' | 'created_at' | 'sent_at'>): Promise<NotificationHistoryEntry> {
    const { data, error } = await this.supabase
      .from('notification_history')
      .insert({
        ...entry,
        metadata: entry.metadata || {}
      })
      .select()
      .single()

    if (error) {
      throw new Error(`Failed to create notification history: ${error.message}`)
    }

    return data
  }

  // Get notification history for user
  async getNotificationHistory(
    userId: string,
    options: {
      limit?: number
      offset?: number
      type?: string
      unread_only?: boolean
    } = {}
  ): Promise<NotificationHistoryEntry[]> {
    const { limit = 20, offset = 0, type, unread_only } = options

    let query = this.supabase
      .from('notification_history')
      .select('*')
      .eq('user_id', userId)
      .order('sent_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (type) {
      query = query.eq('type', type)
    }

    if (unread_only) {
      query = query.is('read_at', null)
    }

    const { data, error } = await query

    if (error) {
      throw new Error(`Failed to fetch notification history: ${error.message}`)
    }

    return data || []
  }

  // Mark notification as read
  async markNotificationAsRead(notificationId: string): Promise<void> {
    const { error } = await this.supabase
      .from('notification_history')
      .update({ read_at: new Date().toISOString() })
      .eq('id', notificationId)

    if (error) {
      throw new Error(`Failed to mark notification as read: ${error.message}`)
    }
  }

  // Send browser notification
  async sendBrowserNotification(
    userId: string,
    notification: {
      title: string
      body: string
      icon?: string
      tag?: string
      data?: NotificationMetadata
    }
  ): Promise<boolean> {
    try {
      // Check if browser notifications are supported and permitted
      if (!('Notification' in window)) {
        throw new Error('Browser notifications not supported')
      }

      if (Notification.permission === 'denied') {
        throw new Error('Browser notifications are denied')
      }

      // Request permission if not already granted
      if (Notification.permission === 'default') {
        const permission = await Notification.requestPermission()
        if (permission !== 'granted') {
          throw new Error('Browser notification permission not granted')
        }
      }

      // Send the notification
      const browserNotification = new Notification(notification.title, {
        body: notification.body,
        icon: notification.icon || '/favicon.ico',
        tag: notification.tag || `tribe-${Date.now()}`,
        data: notification.data
      })

      // Create history entry
      await this.createNotificationHistory({
        user_id: userId,
        type: 'system',
        title: notification.title,
        content: notification.body,
        metadata: {
          notification_type: 'browser',
          tag: notification.tag,
          data: notification.data
        },
        delivery_method: 'browser',
        delivery_status: 'sent'
      })

      // Auto-close notification after 5 seconds
      setTimeout(() => {
        browserNotification.close()
      }, 5000)

      return true
    } catch (error) {
      // Create failed history entry
      await this.createNotificationHistory({
        user_id: userId,
        type: 'system',
        title: notification.title,
        content: notification.body,
        metadata: {
          notification_type: 'browser',
          error: error instanceof Error ? error.message : 'Unknown error'
        },
        delivery_method: 'browser',
        delivery_status: 'failed'
      })

      throw error
    }
  }

  // Send test email notification using SendGrid
  async sendTestEmailNotification(
    userId: string,
    userEmail: string,
    notificationType: 'response' | 'prompt' | 'digest' | 'system' = 'system'
  ): Promise<boolean> {
    try {
      // Use the email service to send actual email
      const result = await clientEmailService.sendTestEmail(userEmail, notificationType)

      if (!result.success) {
        throw new Error(result.error || 'Email delivery failed')
      }

      // Create history entry for successful email
      await this.createNotificationHistory({
        user_id: userId,
        type: notificationType,
        title: 'Test Email Notification',
        content: `This is a test ${notificationType} notification sent to verify your email settings.`,
        metadata: {
          email: userEmail,
          test_notification: true,
          sendgrid_message_id: result.messageId,
          sendgrid_status_code: result.statusCode
        },
        delivery_method: 'email',
        delivery_status: 'sent'
      })

      return true
    } catch (error) {
      // Create failed history entry
      await this.createNotificationHistory({
        user_id: userId,
        type: notificationType,
        title: 'Test Email Notification',
        content: `Failed test ${notificationType} notification`,
        metadata: {
          email: userEmail,
          test_notification: true,
          error: error instanceof Error ? error.message : 'Unknown error'
        },
        delivery_method: 'email',
        delivery_status: 'failed'
      })

      throw error
    }
  }

  // Send email notification for updates/responses
  async sendEmailNotification(
    userId: string,
    userEmail: string,
    type: 'response' | 'prompt' | 'digest' | 'system',
    templateData: NotificationData = {},
    metadata: NotificationMetadata = {}
  ): Promise<boolean> {
    try {
      // Use the email service to send templated email
      const result = await clientEmailService.sendTemplatedEmail(userEmail, type, templateData)

      if (!result.success) {
        throw new Error(result.error || 'Email delivery failed')
      }

      // Create history entry for successful email
      await this.createNotificationHistory({
        user_id: userId,
        type,
        title: this.getNotificationTitle(type, templateData),
        content: this.getNotificationContent(type, templateData),
        metadata: {
          email: userEmail,
          sendgrid_message_id: result.messageId,
          sendgrid_status_code: result.statusCode,
          template_data: templateData,
          ...metadata
        },
        delivery_method: 'email',
        delivery_status: 'sent'
      })

      return true
    } catch (error) {
      // Create failed history entry
      await this.createNotificationHistory({
        user_id: userId,
        type,
        title: this.getNotificationTitle(type, templateData),
        content: `Failed ${type} notification`,
        metadata: {
          email: userEmail,
          error: error instanceof Error ? error.message : 'Unknown error',
          template_data: templateData,
          ...metadata
        },
        delivery_method: 'email',
        delivery_status: 'failed'
      })

      throw error
    }
  }

  // Send bulk email notifications
  async sendBulkEmailNotifications(
    recipients: Array<{
      userId: string
      userEmail: string
      type: 'response' | 'prompt' | 'digest' | 'system'
      templateData?: NotificationData
      metadata?: NotificationMetadata
    }>
  ): Promise<Array<{ userId: string; success: boolean; error?: string }>> {
    const results: Array<{ userId: string; success: boolean; error?: string }> = []

    // Process in batches to avoid overwhelming the email service
    const BATCH_SIZE = 10
    for (let i = 0; i < recipients.length; i += BATCH_SIZE) {
      const batch = recipients.slice(i, i + BATCH_SIZE)

      const batchPromises = batch.map(async (recipient) => {
        try {
          await this.sendEmailNotification(
            recipient.userId,
            recipient.userEmail,
            recipient.type,
            recipient.templateData,
            recipient.metadata
          )
          return { userId: recipient.userId, success: true }
        } catch (error) {
          return {
            userId: recipient.userId,
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
          }
        }
      })

      const batchResults = await Promise.all(batchPromises)
      results.push(...batchResults)

      // Small delay between batches to be nice to the email service
      if (i + BATCH_SIZE < recipients.length) {
        await new Promise(resolve => setTimeout(resolve, 100))
      }
    }

    return results
  }

  // Helper method to generate notification titles
  private getNotificationTitle(type: string, data: NotificationData): string {
    switch (type) {
      case 'response':
        return `${data.senderName || 'Someone'} responded to your update${data.babyName ? ` about ${data.babyName}` : ''}`
      case 'prompt':
        return `Update request${data.babyName ? ` about ${data.babyName}` : ''}`
      case 'digest':
        return `Your ${data.period || 'daily'} update digest (${data.unreadCount || 0} new updates)`
      case 'system':
        return data.title || 'System Notification'
      default:
        return 'Notification'
    }
  }

  // Helper method to generate notification content
  private getNotificationContent(type: string, data: NotificationData): string {
    switch (type) {
      case 'response':
        return `${data.senderName || 'Someone'} responded: "${data.updateContent || ''}"`
      case 'prompt':
        return data.promptText || 'Someone would love to hear an update!'
      case 'digest':
        return `You have ${data.unreadCount || 0} new updates from your family and friends.`
      case 'system':
        return data.content || 'System notification'
      default:
        return 'New notification'
    }
  }

  // Check email service status
  async getEmailServiceStatus(): Promise<{ configured: boolean; apiKey: boolean; fromEmail: boolean }> {
    return await clientEmailService.getStatus()
  }

  // Check if user is in quiet hours
  async isInQuietHours(userId: string, checkTime?: Date): Promise<boolean> {
    const { data, error } = await this.supabase
      .rpc('is_in_quiet_hours', {
        user_uuid: userId,
        check_time: checkTime?.toISOString() || new Date().toISOString()
      })

    if (error) {
      logger.warn('Failed to check quiet hours:', { data: error.message })
      return false
    }

    return data || false
  }

  // Schedule digest notification
  async scheduleDigest(
    userId: string,
    digestType: NotificationDigestType,
    scheduledFor: Date,
    _content: NotificationData = {}
  ): Promise<string> {
    const { data, error } = await this.supabase
      .rpc('schedule_digest_for_user', {
        user_uuid: userId,
        digest_type_param: digestType,
        scheduled_time: scheduledFor.toISOString()
      })

    if (error) {
      throw new Error(`Failed to schedule digest: ${error.message}`)
    }

    return data
  }

  // Get digest queue for user
  async getDigestQueue(userId: string): Promise<DigestQueueEntry[]> {
    const { data, error } = await this.supabase
      .from('digest_queue')
      .select('*')
      .eq('user_id', userId)
      .order('scheduled_for', { ascending: false })

    if (error) {
      throw new Error(`Failed to fetch digest queue: ${error.message}`)
    }

    return data || []
  }

  // Get notification analytics for user
  async getNotificationAnalytics(userId: string, days: number = 30) {
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)

    const { data, error } = await this.supabase
      .from('notification_history')
      .select('type, delivery_method, delivery_status, sent_at')
      .eq('user_id', userId)
      .gte('sent_at', startDate.toISOString())

    if (error) {
      throw new Error(`Failed to fetch notification analytics: ${error.message}`)
    }

    const notifications = (data ?? []) as NotificationHistorySummary[]

    // Process analytics data
    const analytics = {
      total: notifications.length,
      by_type: {} as Record<string, number>,
      by_method: {} as Record<string, number>,
      by_status: {} as Record<string, number>,
      delivery_rate: 0,
      recent_activity: [] as Array<{ date: string; count: number }>
    }

    if (notifications.length > 0) {
      // Count by type, method, and status
      notifications.forEach((notification) => {
        analytics.by_type[notification.type] = (analytics.by_type[notification.type] || 0) + 1
        analytics.by_method[notification.delivery_method] = (analytics.by_method[notification.delivery_method] || 0) + 1
        analytics.by_status[notification.delivery_status] = (analytics.by_status[notification.delivery_status] || 0) + 1
      })

      // Calculate delivery rate
      const successful = (analytics.by_status.sent || 0) + (analytics.by_status.delivered || 0)
      analytics.delivery_rate = analytics.total > 0 ? (successful / analytics.total) * 100 : 0

      // Group by date for recent activity
      const activityByDate = notifications.reduce((acc: Record<string, number>, notification) => {
        const date = notification.sent_at.split('T')[0]
        acc[date] = (acc[date] || 0) + 1
        return acc
      }, {} as Record<string, number>)

      analytics.recent_activity = Object.entries(activityByDate)
        .map(([date, count]) => ({ date, count }))
        .sort((a, b) => a.date.localeCompare(b.date))
    }

    return analytics
  }

  // Get browser notification permission status
  getBrowserNotificationStatus(): {
    supported: boolean
    permission: NotificationPermission
  } {
    return {
      supported: 'Notification' in window,
      permission: 'Notification' in window ? Notification.permission : 'denied'
    }
  }

  // Request browser notification permission
  async requestBrowserNotificationPermission(): Promise<NotificationPermission> {
    if (!('Notification' in window)) {
      throw new Error('Browser notifications are not supported')
    }

    if (Notification.permission === 'granted') {
      return 'granted'
    }

    const permission = await Notification.requestPermission()
    return permission
  }
}

// Export singleton instance
export const notificationService = new NotificationService()
