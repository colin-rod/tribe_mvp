import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import { getGroupWithMembers, addRecipientsToGroup } from '@/lib/group-management'
import { bulkMembershipSchema } from '@/lib/group-security-validator'
import { GroupCacheManager } from '@/lib/group-cache'
import { validateParentGroupAccess } from '@/middleware/group-security'
import { createLogger } from '@/lib/logger'
import { z } from 'zod'

const logger = createLogger('GroupMembersAPI')

/**
 * GET /api/groups/[groupId]/members - Get all members of a group
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ groupId: string }> }
) {
  try {
    const { groupId } = await params
    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    // Validate access to group
    const securityContext = await validateParentGroupAccess(groupId, user.id)
    if (!securityContext.can_view) {
      return NextResponse.json(
        { error: 'Group not found or access denied' },
        { status: 404 }
      )
    }

    // Get group with members using cached data
    const members = await GroupCacheManager.getGroupMembers(groupId, user.id)

    return NextResponse.json({
      group_id: groupId,
      members,
      total_count: members.length,
      active_count: members.filter(m => m.is_active).length
    })

  } catch (error) {
    logger.errorWithStack('Error fetching group members:', error as Error)
    return NextResponse.json(
      { error: 'Failed to fetch group members' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/groups/[groupId]/members - Add recipients to group
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ groupId: string }> }
) {
  try {
    const { groupId } = await params
    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const body = await request.json()

    // Validate input
    const validatedData = bulkMembershipSchema.parse(body)

    // Validate access to group
    const securityContext = await validateParentGroupAccess(groupId, user.id)
    if (!securityContext.can_modify) {
      return NextResponse.json(
        { error: 'Group not found or access denied' },
        { status: 404 }
      )
    }

    // Check if group exists and get current member count
    const groupWithMembers = await getGroupWithMembers(groupId)
    if (!groupWithMembers) {
      return NextResponse.json(
        { error: 'Group not found' },
        { status: 404 }
      )
    }

    // Check group size limits
    const currentMemberCount = groupWithMembers.member_count
    const newMemberCount = validatedData.recipient_ids.length

    if (currentMemberCount + newMemberCount > 100) {
      return NextResponse.json(
        { error: 'Adding these recipients would exceed the maximum group size (100)' },
        { status: 400 }
      )
    }

    // Verify all recipients belong to the user and aren't already in the group
    const { data: existingRecipients, error: recipientError } = await supabase
      .from('recipients')
      .select('id, name')
      .in('id', validatedData.recipient_ids)
      .eq('parent_id', user.id)
      .eq('is_active', true)

    if (recipientError || !existingRecipients || existingRecipients.length !== validatedData.recipient_ids.length) {
      return NextResponse.json(
        { error: 'Some recipients not found or access denied' },
        { status: 400 }
      )
    }

    // Check for existing memberships
    // Note: Using type assertion because group_memberships table exists in DB but types need regeneration
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: existingMemberships } = await (supabase as any)
      .from('group_memberships')
      .select('recipient_id')
      .eq('group_id', groupId)
      .in('recipient_id', validatedData.recipient_ids)
      .eq('is_active', true)

    const alreadyMemberIds = (existingMemberships as { recipient_id: string }[] | null)?.map(m => m.recipient_id) || []
    const newRecipientIds = validatedData.recipient_ids.filter(id => !alreadyMemberIds.includes(id))

    if (newRecipientIds.length === 0) {
      return NextResponse.json(
        { error: 'All specified recipients are already members of this group' },
        { status: 400 }
      )
    }

    // Add recipients to group
    const newMemberships = await addRecipientsToGroup(
      groupId,
      newRecipientIds,
      validatedData.default_settings
    )

    // Invalidate caches
    GroupCacheManager.invalidateGroupCache(groupId)
    GroupCacheManager.invalidateUserCache(user.id)

    return NextResponse.json({
      message: `Successfully added ${newMemberships.length} recipients to group`,
      added_members: newMemberships.length,
      skipped_existing: alreadyMemberIds.length,
      new_memberships: newMemberships
    }, { status: 201 })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input data', details: error.errors },
        { status: 400 }
      )
    }

    logger.errorWithStack('Error adding members to group:', error as Error)
    return NextResponse.json(
      { error: 'Failed to add members to group' },
      { status: 500 }
    )
  }
}