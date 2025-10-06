/**
 * @deprecated This file is deprecated as of October 6, 2025
 *
 * Group management functionality has been replaced with recipient-centric preferences.
 * See DEPRECATION_NOTICE.md for migration details.
 *
 * USE INSTEAD: src/lib/types/preferences.ts
 */

import { createClient } from './supabase/client'
import { createLogger } from '@/lib/logger'

const logger = createLogger('GroupManagement')

export type NotificationChannel = 'email' | 'sms' | 'whatsapp'

export interface GroupNotificationSettings {
  email_notifications?: boolean
  sms_notifications?: boolean
  whatsapp_notifications?: boolean
  quiet_hours?: {
    start: string
    end: string
  }
  [key: string]: unknown
}

/**
 * Enhanced group membership management interfaces
 * Note: No group_memberships table - recipients link directly to groups
 */
export interface GroupMembership {
  id: string
  group_id: string | null
  frequency: string | null
  preferred_channels: string[] | null
  content_types: string[] | null
  is_active: boolean | null
  created_at: string | null
  updated_at: string | null
}

export interface GroupWithMembers {
  id: string
  parent_id: string
  name: string
  default_frequency: string
  default_channels: string[]
  member_count: number
  members: (GroupMembership & {
    recipient: {
      id: string
      name: string
      email?: string | null
      phone?: string | null
      relationship: string
    }
  })[]
}

export interface RecipientGroupView {
  group_id: string | null
  group_name: string
  default_frequency: string
  default_channels: string[]
  member_frequency?: string | null
  member_preferred_channels?: string[] | null
  member_content_types?: string[] | null
  created_at: string | null
  is_active: boolean | null
}

interface GroupMembershipWithGroup extends GroupMembership {
  recipient_groups: {
    id: string
    name: string
    default_frequency: string | null
    default_channels: string[] | null
  }
}

interface GroupMembershipWithRecipient extends GroupMembership {
  name: string
  email: string | null
  phone: string | null
  relationship: string
  parent_id: string
}

/**
 * Get all groups for a recipient (public access via token)
 */
export async function getRecipientGroups(token: string): Promise<RecipientGroupView[]> {
  const supabase = createClient()

  // First validate the token and get recipient info
  const { data: recipient, error: recipientError } = await supabase
    .from('recipients')
    .select('id, parent_id')
    .eq('preference_token', token)
    .eq('is_active', true)
    .single()

  if (recipientError || !recipient) {
    throw new Error('Invalid or expired token')
  }

  // Get group memberships with group details
  const { data, error } = await supabase
    .from('recipients')
    .select(`
      id,
      group_id,
      frequency,
      preferred_channels,
      content_types,
      is_active,
      created_at,
      updated_at,
      recipient_groups!inner(
        id,
        name,
        default_frequency,
        default_channels
      )
    `)
    .eq('id', recipient.id)
    .eq('is_active', true)

  if (error) {
    logger.errorWithStack('Error fetching recipient groups:', error as Error)
    throw new Error('Failed to fetch groups')
  }

  const memberships = (data ?? []) as GroupMembershipWithGroup[]

  return memberships.map((membership) => ({
    group_id: membership.group_id,
    group_name: membership.recipient_groups.name,
    default_frequency: membership.recipient_groups.default_frequency || '',
    default_channels: membership.recipient_groups.default_channels || [],
    member_frequency: membership.frequency,
    member_preferred_channels: membership.preferred_channels,
    member_content_types: membership.content_types,
    created_at: membership.created_at,
    is_active: membership.is_active
  } as RecipientGroupView))
}

/**
 * Update recipient's notification settings for a specific group
 */
export async function updateRecipientGroupSettings(
  token: string,
  groupId: string,
  settings: {
    frequency?: string
    preferred_channels?: string[]
    content_types?: string[]
  }
): Promise<boolean> {
  const supabase = createClient()

  // Validate token and get recipient
  const { data: recipient, error: recipientError } = await supabase
    .from('recipients')
    .select('id')
    .eq('preference_token', token)
    .eq('is_active', true)
    .single()

  if (recipientError || !recipient) {
    throw new Error('Invalid or expired token')
  }

  // Update the recipient settings
  const { error } = await supabase
    .from('recipients')
    .update(settings)
    .eq('id', recipient.id)
    .eq('group_id', groupId)
    .eq('is_active', true)

  if (error) {
    logger.errorWithStack('Error updating recipient group settings:', error as Error)
    throw new Error('Failed to update group settings')
  }

  return true
}

/**
 * Get detailed group information with all members (authenticated parent access)
 */
export async function getGroupWithMembers(groupId: string): Promise<GroupWithMembers> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) throw new Error('Not authenticated')

  // Get group details
  const { data: group, error: groupError } = await supabase
    .from('recipient_groups')
    .select('*')
    .eq('id', groupId)
    .eq('parent_id', user.id)
    .single()

  if (groupError || !group) {
    throw new Error('Group not found or access denied')
  }

  // Get all recipients in this group
  const { data: memberships, error: membershipError } = await supabase
    .from('recipients')
    .select(`
      id,
      name,
      email,
      phone,
      relationship,
      parent_id,
      group_id,
      frequency,
      preferred_channels,
      content_types,
      is_active,
      created_at,
      updated_at
    `)
    .eq('group_id', groupId)
    .eq('is_active', true)

  if (membershipError) {
    logger.errorWithStack('Error fetching group members:', membershipError as Error)
    throw new Error('Failed to fetch group members')
  }

  const membershipRecords = (memberships ?? []) as GroupMembershipWithRecipient[]

  return {
    ...group,
    default_frequency: group.default_frequency || '',
    default_channels: group.default_channels || [],
    member_count: membershipRecords.length,
    members: membershipRecords.map((membership) => ({
      id: membership.id,
      group_id: membership.group_id,
      frequency: membership.frequency,
      preferred_channels: membership.preferred_channels,
      content_types: membership.content_types,
      is_active: membership.is_active,
      created_at: membership.created_at,
      updated_at: membership.updated_at,
      recipient: {
        id: membership.id,
        name: membership.name,
        email: membership.email,
        phone: membership.phone,
        relationship: membership.relationship
      }
    }))
  } as GroupWithMembers
}

/**
 * Add recipients to a group (bulk operation)
 */
export async function addRecipientsToGroup(
  groupId: string,
  recipientIds: string[],
  defaultSettings?: {
    frequency?: string
    preferred_channels?: string[]
    content_types?: string[]
    role?: 'member' | 'admin'
  }
): Promise<GroupMembership[]> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) throw new Error('Not authenticated')

  // Verify group ownership
  const { data: group } = await supabase
    .from('recipient_groups')
    .select('id')
    .eq('id', groupId)
    .eq('parent_id', user.id)
    .single()

  if (!group) {
    throw new Error('Group not found or access denied')
  }

  // Verify all recipients belong to the user
  const { data: recipients } = await supabase
    .from('recipients')
    .select('id')
    .in('id', recipientIds)
    .eq('parent_id', user.id)
    .eq('is_active', true)

  if (!recipients || recipients.length !== recipientIds.length) {
    throw new Error('Some recipients not found or access denied')
  }

  // Update recipients to join the group
  const updateData: Record<string, unknown> = {
    group_id: groupId,
    ...(defaultSettings?.frequency && { frequency: defaultSettings.frequency }),
    ...(defaultSettings?.preferred_channels && { preferred_channels: defaultSettings.preferred_channels }),
    ...(defaultSettings?.content_types && { content_types: defaultSettings.content_types })
  }

  const { data, error } = await supabase
    .from('recipients')
    .update(updateData)
    .in('id', recipientIds)
    .select()

  if (error) {
    logger.errorWithStack('Error adding recipients to group:', error as Error)
    throw new Error('Failed to add recipients to group')
  }

  return (data || []) as GroupMembership[]
}

/**
 * Remove recipient from group
 */
export async function removeRecipientFromGroup(
  groupId: string,
  recipientId: string
): Promise<boolean> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) throw new Error('Not authenticated')

  // Verify ownership through the recipient
  const { data: recipient } = await supabase
    .from('recipients')
    .select('id')
    .eq('id', recipientId)
    .eq('parent_id', user.id)
    .single()

  if (!recipient) {
    throw new Error('Recipient not found or access denied')
  }

  const { error } = await supabase
    .from('recipients')
    .update({ group_id: null, is_active: false })
    .eq('id', recipientId)
    .eq('group_id', groupId)

  if (error) {
    logger.errorWithStack('Error removing recipient from group:', error as Error)
    throw new Error('Failed to remove recipient from group')
  }

  return true
}

/**
 * Update group notification settings for all members
 */
export async function updateGroupNotificationSettings(
  groupId: string,
  settings: {
    notification_settings?: GroupNotificationSettings
    default_frequency?: string
    default_channels?: string[]
    apply_to_existing_members?: boolean
  }
): Promise<boolean> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) throw new Error('Not authenticated')

  // Update group settings (notification_settings column doesn't exist, only default_frequency and default_channels)
  const groupUpdates: Partial<{
    default_frequency: string
    default_channels: string[]
  }> = {}

  if (settings.default_frequency) {
    groupUpdates.default_frequency = settings.default_frequency
  }
  if (settings.default_channels) {
    groupUpdates.default_channels = settings.default_channels
  }

  let groupError: Error | null = null
  if (Object.keys(groupUpdates).length > 0) {
    const { error } = await supabase
      .from('recipient_groups')
      .update(groupUpdates)
      .eq('id', groupId)
      .eq('parent_id', user.id)

    if (error) {
      groupError = error
    }
  }

  if (groupError) {
    logger.errorWithStack('Error updating group settings:', groupError as Error)
    throw new Error('Failed to update group settings')
  }

  // Optionally apply to existing members who haven't overridden settings
  if (settings.apply_to_existing_members) {
    const memberUpdates: Partial<Pick<GroupMembership, 'frequency' | 'preferred_channels'>> = {}
    if (settings.default_frequency) {
      memberUpdates.frequency = settings.default_frequency as GroupMembership['frequency']
    }
    if (settings.default_channels) {
      memberUpdates.preferred_channels = settings.default_channels as GroupMembership['preferred_channels']
    }

    if (Object.keys(memberUpdates).length > 0) {
      const { error: memberError } = await supabase
        .from('recipients')
        .update(memberUpdates)
        .eq('group_id', groupId)
        .is('frequency', null) // Only update members without custom settings
        .eq('is_active', true)

      if (memberError) {
        logger.errorWithStack('Error updating member settings:', memberError as Error)
        // Don't throw here, group update succeeded
        return false
      }
    }
  }

  return true
}

/**
 * Get group membership analytics
 */
export async function getGroupAnalytics(): Promise<{
  total_groups: number
  total_active_memberships: number
  average_group_size: number
  groups_by_size: { size_range: string; count: number }[]
  frequency_distribution: { frequency: string; count: number }[]
}> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) throw new Error('Not authenticated')

  // Get basic stats
  const groupsResult = await supabase
    .from('recipient_groups')
    .select('id')
    .eq('parent_id', user.id)

  const groups = groupsResult.data || []
  const groupIds = groups.map(g => g.id)

  const membershipsResult = await supabase
    .from('recipients')
    .select('group_id, frequency')
    .eq('is_active', true)
    .in('group_id', groupIds)

  const memberships = membershipsResult.data || []

  // Calculate group sizes
  const groupSizes = new Map<string, number>()
  memberships.forEach(m => {
    if (m.group_id) {
      groupSizes.set(m.group_id, (groupSizes.get(m.group_id) || 0) + 1)
    }
  })

  const sizeCounts = { small: 0, medium: 0, large: 0 }
  Array.from(groupSizes.values()).forEach(size => {
    if (size <= 3) sizeCounts.small++
    else if (size <= 10) sizeCounts.medium++
    else sizeCounts.large++
  })

  // Frequency distribution
  const frequencyDist = new Map<string, number>()
  memberships.forEach(m => {
    const freq = m.frequency || 'default'
    frequencyDist.set(freq, (frequencyDist.get(freq) || 0) + 1)
  })

  return {
    total_groups: groups.length,
    total_active_memberships: memberships.length,
    average_group_size: groups.length > 0 ? memberships.length / groups.length : 0,
    groups_by_size: [
      { size_range: '1-3 members', count: sizeCounts.small },
      { size_range: '4-10 members', count: sizeCounts.medium },
      { size_range: '11+ members', count: sizeCounts.large }
    ],
    frequency_distribution: Array.from(frequencyDist.entries()).map(([frequency, count]) => ({
      frequency,
      count
    }))
  }
}
