import type { SupabaseClientType } from './supabaseClient'
import { createSupabaseClient } from './supabaseClient'
import type { Database } from '@/lib/types/database'

type NotificationHistoryTable = Database['public']['Tables']['notification_history']
export type NotificationHistoryRow = NotificationHistoryTable['Row']
export type NotificationHistoryInsert = NotificationHistoryTable['Insert']
export type NotificationHistoryUpdate = NotificationHistoryTable['Update']

export interface NotificationHistoryQueryOptions {
  limit?: number
  offset?: number
  type?: string
  unreadOnly?: boolean
}

function applyHistoryFilters(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  builder: any,
  options: NotificationHistoryQueryOptions
) {
  const { type, unreadOnly } = options

  if (type) {
    builder = builder.eq('type', type)
  }

  if (unreadOnly) {
    builder = builder.is('read_at', null)
  }

  return builder
}

export function createNotificationRepository(supabase: SupabaseClientType = createSupabaseClient()) {
  return {
    client: supabase,

    async createHistoryEntry(entry: NotificationHistoryInsert): Promise<NotificationHistoryRow> {
      const { data, error } = await supabase
        .from('notification_history')
        .insert(entry)
        .select()
        .single()

      if (error) {
        throw new Error(`Failed to create notification history: ${error.message}`)
      }

      return data as NotificationHistoryRow
    },

    async listHistory(
      userId: string,
      { limit = 20, offset = 0, type, unreadOnly }: NotificationHistoryQueryOptions = {}
    ): Promise<NotificationHistoryRow[]> {
      let query = supabase
        .from('notification_history')
        .select('*')
        .eq('user_id', userId)
        .order('sent_at', { ascending: false })
        .range(offset, offset + limit - 1)

      query = applyHistoryFilters(query, { type, unreadOnly })

      const { data, error } = await query

      if (error) {
        throw new Error(`Failed to fetch notification history: ${error.message}`)
      }

      return (data ?? []) as NotificationHistoryRow[]
    },

    async markHistoryEntryRead(notificationId: string, timestamp: string): Promise<void> {
      const { error } = await supabase
        .from('notification_history')
        .update({ read_at: timestamp })
        .eq('id', notificationId)

      if (error) {
        throw new Error(`Failed to mark notification as read: ${error.message}`)
      }
    }
  }
}
