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
 */
export interface GroupMembership {
  id: string
  recipient_id: string
  group_id: string
  notification_frequency?: 'every_update' | 'daily_digest' | 'weekly_digest' | 'milestones_only'
  preferred_channels?: ('email' | 'sms' | 'whatsapp')[]
  content_types?: ('photos' | 'text' | 'milestones')[]
  role: 'member' | 'admin'
  joined_at: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface GroupWithMembers {
  id: string
  parent_id: string
  name: string
  default_frequency: string
  default_channels: string[]
  notification_settings: GroupNotificationSettings | null
  member_count: number
  members: (GroupMembership & {
    recipient: {
      id: string
      name: string
      email?: string
      phone?: string
      relationship: string
    }
  })[]
}

export interface RecipientGroupView {
  group_id: string
  group_name: string
  default_frequency: string
  default_channels: string[]
  notification_settings: GroupNotificationSettings | null
  member_notification_frequency?: string
  member_preferred_channels?: string[]
  member_content_types?: string[]
  role: string
  joined_at: string
  is_active: boolean
}

interface GroupMembershipWithGroup extends GroupMembership {
  recipient_groups: {
    id: string
    name: string
    default_frequency: string
    default_channels: string[]
    notification_settings: GroupNotificationSettings | null
  }
}

interface GroupMembershipWithRecipient extends GroupMembership {
  recipients: {
    id: string
    name: string
    email?: string | null
    phone?: string | null
    relationship: string
  }
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
    .from('group_memberships')
    .select(`
      *,
      recipient_groups!inner(
        id,
        name,
        default_frequency,
        default_channels,
        notification_settings
      )
    `)
    .eq('recipient_id', recipient.id)
    .eq('is_active', true)

  if (error) {
    logger.errorWithStack('Error fetching recipient groups:', error as Error)
    throw new Error('Failed to fetch groups')
  }

  const memberships = (data ?? []) as GroupMembershipWithGroup[]

  return memberships.map((membership) => ({
    group_id: membership.group_id,
    group_name: membership.recipient_groups.name,
    default_frequency: membership.recipient_groups.default_frequency,
    default_channels: membership.recipient_groups.default_channels,
    notification_settings: membership.recipient_groups.notification_settings,
    member_notification_frequency: membership.notification_frequency,
    member_preferred_channels: membership.preferred_channels,
    member_content_types: membership.content_types,
    role: membership.role,
    joined_at: membership.joined_at,
    is_active: membership.is_active
  }))
}

/**
 * Update recipient's notification settings for a specific group
 */
export async function updateRecipientGroupSettings(
  token: string,
  groupId: string,
  settings: {
    notification_frequency?: string
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

  // Update the group membership settings
  const { error } = await supabase
    .from('group_memberships')
    .update(settings)
    .eq('recipient_id', recipient.id)
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

  // Get all memberships with recipient details
  const { data: memberships, error: membershipError } = await supabase
    .from('group_memberships')
    .select(`
      *,
      recipients!inner(
        id,
        name,
        email,
        phone,
        relationship
      )
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
    notification_settings: (group.notification_settings ?? null) as GroupNotificationSettings | null,
    member_count: membershipRecords.length,
    members: membershipRecords.map((membership) => ({
      ...membership,
      recipient: membership.recipients
    }))
  }
}

/**
 * Add recipients to a group (bulk operation)
 */
export async function addRecipientsToGroup(
  groupId: string,
  recipientIds: string[],
  defaultSettings?: {
    notification_frequency?: string
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

  // Create memberships
  const memberships: Partial<GroupMembership>[] = recipientIds.map(recipientId => ({
    recipient_id: recipientId,
    group_id: groupId,
    notification_frequency: defaultSettings?.notification_frequency,
    preferred_channels: defaultSettings?.preferred_channels,
    content_types: defaultSettings?.content_types,
    role: defaultSettings?.role || 'member'
  }))

  const { data, error } = await supabase
    .from('group_memberships')
    .upsert(memberships, {
      onConflict: 'recipient_id,group_id',
      ignoreDuplicates: false
    })
    .select()

  if (error) {
    logger.errorWithStack('Error adding recipients to group:', error as Error)
    throw new Error('Failed to add recipients to group')
  }

  return data || []
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
    .from('group_memberships')
    .update({ is_active: false })
    .eq('recipient_id', recipientId)
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

  // Update group settings
  const groupUpdates: Partial<{
    notification_settings: GroupNotificationSettings
    default_frequency: string
    default_channels: string[]
  }> = {}

  if (settings.notification_settings) {
    groupUpdates.notification_settings = settings.notification_settings
  }
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
    const memberUpdates: Partial<Pick<GroupMembership, 'notification_frequency' | 'preferred_channels'>> = {}
    if (settings.default_frequency) {
      memberUpdates.notification_frequency = settings.default_frequency
    }
    if (settings.default_channels) {
      memberUpdates.preferred_channels = settings.default_channels
    }

    if (Object.keys(memberUpdates).length > 0) {
      const { error: memberError } = await supabase
        .from('group_memberships')
        .update(memberUpdates)
        .eq('group_id', groupId)
        .is('notification_frequency', null) // Only update members without custom settings
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
  notification_frequency_distribution: { frequency: string; count: number }[]
}> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) throw new Error('Not authenticated')

  // Get basic stats
  const [groupsResult, membershipsResult] = await Promise.all([
    supabase
      .from('recipient_groups')
      .select('id')
      .eq('parent_id', user.id),
    supabase
      .from('group_memberships')
      .select('group_id, notification_frequency')
      .eq('is_active', true)
      .in('group_id',
        supabase
          .from('recipient_groups')
          .select('id')
          .eq('parent_id', user.id)
      )
  ])

  const groups = groupsResult.data || []
  const memberships = membershipsResult.data || []

  // Calculate group sizes
  const groupSizes = new Map<string, number>()
  memberships.forEach(m => {
    groupSizes.set(m.group_id, (groupSizes.get(m.group_id) || 0) + 1)
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
    const freq = m.notification_frequency || 'default'
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
    notification_frequency_distribution: Array.from(frequencyDist.entries()).map(([frequency, count]) => ({
      frequency,
      count
    }))
  }
}
