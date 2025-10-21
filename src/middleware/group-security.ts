import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'

type RecipientGroupMembershipRow = {
  group_id: string
  is_active: boolean
}

/**
 * Security context for group operations
 */
export interface GroupSecurityContext {
  user_id: string
  group_id: string
  access_level: 'owner' | 'member' | 'none'
  can_modify: boolean
  can_view: boolean
}

/**
 * Token-based security context for recipient access
 */
export interface RecipientSecurityContext {
  recipient_id: string
  token: string
  parent_id: string
  groups: string[]
  can_modify_settings: boolean
}

/**
 * Validate parent access to group resources
 */
export async function validateParentGroupAccess(
  groupId: string,
  userId?: string
): Promise<GroupSecurityContext> {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  // Get authenticated user if not provided
  if (!userId) {
    const { data: { user }, error } = await supabase.auth.getUser()
    if (error || !user) {
      throw new Error('Authentication required')
    }
    userId = user.id
  }

  // Check group ownership
  const { data: group, error } = await supabase
    .from('recipient_groups')
    .select('id, parent_id, name')
    .eq('id', groupId)
    .single()

  type GroupData = {
    id: string
    parent_id: string
    name: string
  }

  if (error || !group) {
    return {
      user_id: userId,
      group_id: groupId,
      access_level: 'none',
      can_modify: false,
      can_view: false
    }
  }

  const isOwner = (group as GroupData).parent_id === userId

  return {
    user_id: userId,
    group_id: groupId,
    access_level: isOwner ? 'owner' : 'none',
    can_modify: isOwner,
    can_view: isOwner
  }
}

/**
 * Validate recipient token access to their groups
 */
export async function validateRecipientTokenAccess(
  token: string
): Promise<RecipientSecurityContext> {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  // Validate token and get recipient
  const { data: recipient, error } = await supabase
    .from('recipients')
    .select(`
      id,
      parent_id,
      group_memberships!inner(
        group_id,
        is_active
      )
    `)
    .eq('preference_token', token)
    .eq('is_active', true)
    .single()

  type RecipientData = {
    id: string
    parent_id: string
    group_memberships: RecipientGroupMembershipRow[] | RecipientGroupMembershipRow
  }

  if (error || !recipient) {
    throw new Error('Invalid or expired access token')
  }

  const typedRecipient = recipient as unknown as RecipientData

  // Get active group memberships
  const activeGroups = Array.isArray(typedRecipient.group_memberships)
    ? (typedRecipient.group_memberships as RecipientGroupMembershipRow[])
        .filter(membership => membership.is_active)
        .map(membership => membership.group_id)
    : []

  return {
    recipient_id: typedRecipient.id,
    token,
    parent_id: typedRecipient.parent_id,
    groups: activeGroups,
    can_modify_settings: true
  }
}
