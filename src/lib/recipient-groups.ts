import { createClient } from './supabase/client'
import type { Database } from './types/database'

/**
 * Interface for recipient group with enhanced data
 * Matches the database schema with additional computed fields
 */
export interface RecipientGroup {
  id: string
  parent_id: string
  name: string
  default_frequency: string
  default_channels: string[]
  is_default_group: boolean
  created_at: string
  recipient_count?: number
}

/**
 * Interface for creating new recipient groups
 */
export interface CreateGroupData {
  name: string
  default_frequency?: string
  default_channels?: string[]
  is_default_group?: boolean
}

/**
 * Interface for updating existing recipient groups
 */
export interface UpdateGroupData {
  name?: string
  default_frequency?: string
  default_channels?: string[]
}

/**
 * Creates the three default recipient groups for a new user
 * Called automatically during user signup process
 *
 * @param userId - The authenticated user's ID
 * @returns Promise resolving to array of created groups
 */
export async function createDefaultGroups(userId: string): Promise<RecipientGroup[]> {
  const supabase = createClient()

  const defaultGroups = [
    {
      parent_id: userId,
      name: 'Close Family',
      default_frequency: 'daily_digest',
      default_channels: ['email'],
      is_default_group: true
    },
    {
      parent_id: userId,
      name: 'Extended Family',
      default_frequency: 'weekly_digest',
      default_channels: ['email'],
      is_default_group: true
    },
    {
      parent_id: userId,
      name: 'Friends',
      default_frequency: 'weekly_digest',
      default_channels: ['email'],
      is_default_group: true
    }
  ]

  const { data, error } = await supabase
    .from('recipient_groups')
    .insert(defaultGroups)
    .select()

  if (error) {
    console.error('Error creating default groups:', error)
    throw new Error('Failed to create default recipient groups')
  }

  return data || []
}

/**
 * Gets all recipient groups for the authenticated user with recipient counts
 * Groups are ordered with default groups first, then by name
 *
 * @returns Promise resolving to array of groups with recipient counts
 */
export async function getUserGroups(): Promise<(RecipientGroup & { recipient_count: number })[]> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) throw new Error('Not authenticated')

  // Get groups with recipient counts using a join query
  const { data, error } = await supabase
    .from('recipient_groups')
    .select(`
      *,
      recipients!group_id(count)
    `)
    .eq('parent_id', user.id)
    .order('is_default_group', { ascending: false })
    .order('name')

  if (error) {
    console.error('Error fetching user groups:', error)
    throw new Error('Failed to fetch recipient groups')
  }

  // Transform the data to include recipient counts
  return data?.map(group => ({
    ...group,
    recipient_count: Array.isArray(group.recipients) && group.recipients.length > 0
      ? group.recipients[0].count || 0
      : 0
  })) || []
}

/**
 * Creates a new custom recipient group
 *
 * @param groupData - Group data for creation
 * @returns Promise resolving to created group
 */
export async function createGroup(groupData: CreateGroupData): Promise<RecipientGroup> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) throw new Error('Not authenticated')

  // Validate group name is unique for this user
  const { data: existingGroups } = await supabase
    .from('recipient_groups')
    .select('name')
    .eq('parent_id', user.id)
    .eq('name', groupData.name)

  if (existingGroups && existingGroups.length > 0) {
    throw new Error('A group with this name already exists')
  }

  const { data, error } = await supabase
    .from('recipient_groups')
    .insert({
      parent_id: user.id,
      name: groupData.name,
      default_frequency: groupData.default_frequency || 'weekly_digest',
      default_channels: groupData.default_channels || ['email'],
      is_default_group: groupData.is_default_group || false
    })
    .select()
    .single()

  if (error) {
    console.error('Error creating group:', error)
    throw new Error('Failed to create recipient group')
  }

  return data
}

/**
 * Updates an existing recipient group
 * Default groups cannot have their names changed
 *
 * @param groupId - ID of the group to update
 * @param updates - Partial group data to update
 * @returns Promise resolving to updated group
 */
export async function updateGroup(groupId: string, updates: UpdateGroupData): Promise<RecipientGroup> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) throw new Error('Not authenticated')

  // Check if group exists and belongs to user
  const { data: existingGroup } = await supabase
    .from('recipient_groups')
    .select('*')
    .eq('id', groupId)
    .eq('parent_id', user.id)
    .single()

  if (!existingGroup) {
    throw new Error('Group not found or access denied')
  }

  // Prevent renaming default groups
  if (existingGroup.is_default_group && updates.name && updates.name !== existingGroup.name) {
    throw new Error('Cannot rename default groups')
  }

  // If updating name, check for uniqueness
  if (updates.name && updates.name !== existingGroup.name) {
    const { data: nameConflict } = await supabase
      .from('recipient_groups')
      .select('id')
      .eq('parent_id', user.id)
      .eq('name', updates.name)

    if (nameConflict && nameConflict.length > 0) {
      throw new Error('A group with this name already exists')
    }
  }

  const { data, error } = await supabase
    .from('recipient_groups')
    .update(updates)
    .eq('id', groupId)
    .eq('parent_id', user.id)
    .select()
    .single()

  if (error) {
    console.error('Error updating group:', error)
    throw new Error('Failed to update recipient group')
  }

  return data
}

/**
 * Deletes a recipient group
 * Cannot delete default groups
 * Recipients in the group are moved to the default "Friends" group
 *
 * @param groupId - ID of the group to delete
 * @returns Promise resolving to boolean success
 */
export async function deleteGroup(groupId: string): Promise<boolean> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) throw new Error('Not authenticated')

  // Check if group exists and is not a default group
  const { data: existingGroup } = await supabase
    .from('recipient_groups')
    .select('*')
    .eq('id', groupId)
    .eq('parent_id', user.id)
    .single()

  if (!existingGroup) {
    throw new Error('Group not found or access denied')
  }

  if (existingGroup.is_default_group) {
    throw new Error('Cannot delete default groups')
  }

  // Find the default "Friends" group to reassign recipients
  const { data: friendsGroup } = await supabase
    .from('recipient_groups')
    .select('id')
    .eq('parent_id', user.id)
    .eq('name', 'Friends')
    .eq('is_default_group', true)
    .single()

  if (!friendsGroup) {
    throw new Error('Cannot delete group: default Friends group not found')
  }

  // Reassign all recipients to the Friends group
  const { error: updateError } = await supabase
    .from('recipients')
    .update({ group_id: friendsGroup.id })
    .eq('group_id', groupId)
    .eq('parent_id', user.id)

  if (updateError) {
    console.error('Error reassigning recipients:', updateError)
    throw new Error('Failed to reassign recipients before group deletion')
  }

  // Delete the group
  const { error } = await supabase
    .from('recipient_groups')
    .delete()
    .eq('id', groupId)
    .eq('parent_id', user.id)

  if (error) {
    console.error('Error deleting group:', error)
    throw new Error('Failed to delete recipient group')
  }

  return true
}

/**
 * Gets a specific recipient group by ID
 *
 * @param groupId - ID of the group to fetch
 * @returns Promise resolving to group or null if not found
 */
export async function getGroupById(groupId: string): Promise<RecipientGroup | null> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) throw new Error('Not authenticated')

  const { data, error } = await supabase
    .from('recipient_groups')
    .select('*')
    .eq('id', groupId)
    .eq('parent_id', user.id)
    .single()

  if (error) {
    if (error.code === 'PGRST116') return null
    console.error('Error fetching group:', error)
    throw new Error('Failed to fetch recipient group')
  }

  return data
}

/**
 * Gets the default group for a specific type
 *
 * @param groupName - Name of the default group ('Close Family', 'Extended Family', or 'Friends')
 * @returns Promise resolving to group or null if not found
 */
export async function getDefaultGroup(groupName: 'Close Family' | 'Extended Family' | 'Friends'): Promise<RecipientGroup | null> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) throw new Error('Not authenticated')

  const { data, error } = await supabase
    .from('recipient_groups')
    .select('*')
    .eq('parent_id', user.id)
    .eq('name', groupName)
    .eq('is_default_group', true)
    .single()

  if (error) {
    if (error.code === 'PGRST116') return null
    console.error('Error fetching default group:', error)
    throw new Error('Failed to fetch default group')
  }

  return data
}

/**
 * Checks if a user has their default groups set up
 * Used to determine if default groups need to be created
 *
 * @param userId - User ID to check (optional, uses authenticated user if not provided)
 * @returns Promise resolving to boolean indicating if default groups exist
 */
export async function hasDefaultGroups(userId?: string): Promise<boolean> {
  const supabase = createClient()

  let targetUserId = userId
  if (!targetUserId) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Not authenticated')
    targetUserId = user.id
  }

  const { data, error } = await supabase
    .from('recipient_groups')
    .select('id')
    .eq('parent_id', targetUserId)
    .eq('is_default_group', true)

  if (error) {
    console.error('Error checking default groups:', error)
    return false
  }

  // Should have exactly 3 default groups
  return data && data.length === 3
}

/**
 * Gets group statistics for dashboard display
 *
 * @returns Promise resolving to group statistics
 */
export async function getGroupStats(): Promise<{
  totalGroups: number
  totalRecipients: number
  defaultGroups: number
  customGroups: number
}> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) throw new Error('Not authenticated')

  const [groupsResult, recipientsResult] = await Promise.all([
    supabase
      .from('recipient_groups')
      .select('id, is_default_group')
      .eq('parent_id', user.id),
    supabase
      .from('recipients')
      .select('id')
      .eq('parent_id', user.id)
      .eq('is_active', true)
  ])

  const groups = groupsResult.data || []
  const recipients = recipientsResult.data || []

  return {
    totalGroups: groups.length,
    totalRecipients: recipients.length,
    defaultGroups: groups.filter(g => g.is_default_group).length,
    customGroups: groups.filter(g => !g.is_default_group).length
  }
}