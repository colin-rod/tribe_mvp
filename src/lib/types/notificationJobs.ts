import type { Database } from './database'

export const NOTIFICATION_JOB_TYPES = ['immediate', 'digest', 'milestone'] as const
export type NotificationJobType = (typeof NOTIFICATION_JOB_TYPES)[number]

export const NOTIFICATION_JOB_URGENCY_LEVELS = ['normal', 'urgent', 'low'] as const
export type NotificationJobUrgency = (typeof NOTIFICATION_JOB_URGENCY_LEVELS)[number]

export const NOTIFICATION_JOB_DELIVERY_METHODS = ['email', 'sms', 'whatsapp', 'push'] as const
export type NotificationJobDeliveryMethod = (typeof NOTIFICATION_JOB_DELIVERY_METHODS)[number]

export const NOTIFICATION_JOB_STATUSES = [
  'pending',
  'processing',
  'sent',
  'failed',
  'skipped',
  'cancelled'
] as const
export type NotificationJobStatus = (typeof NOTIFICATION_JOB_STATUSES)[number]

export interface NotificationJobContent {
  subject: string
  body: string
  media_urls?: string[]
  milestone_type?: string
  [key: string]: unknown
}

export type NotificationJobRecord = Database['public']['Tables']['notification_jobs']['Row']

export type NotificationJobMetadata = Record<string, unknown>
