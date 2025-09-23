'use client'

import { createClient } from '@/lib/supabase/client'
import type { NotificationPreferences, NotificationDeliveryMethod, NotificationStatus, NotificationDigestType } from '@/lib/types/profile'

export interface NotificationHistoryEntry {
  id: string
  user_id: string
  type: 'response' | 'prompt' | 'delivery' | 'system' | 'digest'
  title: string
  content?: string
  metadata: Record<string, any>
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
  content: Record<string, any>
  scheduled_for: string
  sent_at?: string
  delivery_status: NotificationStatus | 'processing'
  retry_count: number
  error_message?: string
  created_at: string
}

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
      data?: any
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

  // Send test email notification (placeholder for actual email service)
  async sendTestEmailNotification(
    userId: string,
    userEmail: string,
    notificationType: 'response' | 'prompt' | 'digest' | 'system' = 'system'
  ): Promise<boolean> {
    try {
      // TODO: Replace with actual email service (Resend, SendGrid, etc.)
      console.log(`Would send test email to ${userEmail} for notification type: ${notificationType}`)

      // For now, simulate email sending
      await new Promise(resolve => setTimeout(resolve, 1000))

      // Create history entry for successful email
      await this.createNotificationHistory({
        user_id: userId,
        type: notificationType,
        title: 'Test Email Notification',
        content: `This is a test ${notificationType} notification sent to verify your email settings.`,
        metadata: {
          email: userEmail,
          test_notification: true
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

  // Check if user is in quiet hours
  async isInQuietHours(userId: string, checkTime?: Date): Promise<boolean> {
    const { data, error } = await this.supabase
      .rpc('is_in_quiet_hours', {
        user_uuid: userId,
        check_time: checkTime?.toISOString() || new Date().toISOString()
      })

    if (error) {
      console.warn('Failed to check quiet hours:', error.message)
      return false
    }

    return data || false
  }

  // Schedule digest notification
  async scheduleDigest(
    userId: string,
    digestType: NotificationDigestType,
    scheduledFor: Date,
    content: Record<string, any> = {}
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

    // Process analytics data
    const analytics = {
      total: data?.length || 0,
      by_type: {} as Record<string, number>,
      by_method: {} as Record<string, number>,
      by_status: {} as Record<string, number>,
      delivery_rate: 0,
      recent_activity: [] as Array<{ date: string; count: number }>
    }

    if (data) {
      // Count by type, method, and status
      data.forEach(notification => {
        analytics.by_type[notification.type] = (analytics.by_type[notification.type] || 0) + 1
        analytics.by_method[notification.delivery_method] = (analytics.by_method[notification.delivery_method] || 0) + 1
        analytics.by_status[notification.delivery_status] = (analytics.by_status[notification.delivery_status] || 0) + 1
      })

      // Calculate delivery rate
      const successful = (analytics.by_status.sent || 0) + (analytics.by_status.delivered || 0)
      analytics.delivery_rate = analytics.total > 0 ? (successful / analytics.total) * 100 : 0

      // Group by date for recent activity
      const activityByDate = data.reduce((acc, notification) => {
        const date = notification.sent_at.split('T')[0]
        acc[date] = (acc[date] || 0) + 1
        return acc
      }, {} as Record<string, number>)

      analytics.recent_activity = Object.entries(activityByDate)
        .map(([date, count]) => ({ date, count: count as number }))
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