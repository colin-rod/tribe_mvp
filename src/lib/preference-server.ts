import { createClient } from './supabase/server'
import { cookies } from 'next/headers'
import type { Recipient } from './recipients'
import type { RecipientGroup } from './recipient-groups'
import { createLogger } from './logger'
import type { RecipientRelationship, UpdateFrequency, DeliveryChannel, ContentType, ImportanceThreshold } from './types/preferences'

const logger = createLogger('PreferenceServer')

/**
 * Interface for enhanced recipient data with group information
 * Used in the preference management interface
 */
export interface RecipientWithGroup extends Omit<Recipient, 'group'> {
  group: RecipientGroup | null
}

/**
 * Server-side function to get recipient information by preference token
 * This function runs on the server and can use next/headers
 *
 * @param token - The unique preference token from the magic link
 * @returns Promise resolving to recipient with group info or null if token is invalid
 */
export async function getRecipientByTokenServer(token: string): Promise<RecipientWithGroup | null> {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  if (!token || token.trim() === '') {
    return null
  }

  const { data, error } = await supabase
    .from('recipients')
    .select(`
      *,
      recipient_groups(*)
    `)
    .eq('preference_token', token)
    .eq('is_active', true)
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      // No matching token found
      return null
    }
    logger.errorWithStack('Failed to fetch recipient by token', error as Error, {
      token: '[REDACTED]'
    })
    return null
  }

  return {
    ...data,
    relationship: data.relationship as RecipientRelationship,
    frequency: data.frequency as UpdateFrequency,
    preferred_channels: data.preferred_channels as DeliveryChannel[],
    content_types: data.content_types as ContentType[],
    importance_threshold: data.importance_threshold as ImportanceThreshold | undefined,
    created_at: data.created_at as string,
    is_active: data.is_active ?? true,
    overrides_group_default: data.overrides_group_default ?? false,
    group: Array.isArray(data.recipient_groups) ? data.recipient_groups[0] : data.recipient_groups
  }
}