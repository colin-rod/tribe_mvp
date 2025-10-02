import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import { getUserGroups, createGroup } from '@/lib/recipient-groups'
import { groupCreationSchema } from '@/lib/group-security-validator'
import { GroupCacheManager } from '@/lib/group-cache'
import { createLogger } from '@/lib/logger'
import { z } from 'zod'

const logger = createLogger('GroupsAPI')

/**
 * GET /api/groups - Get all groups for authenticated user
 */
export async function GET(_request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    // Use cached version for better performance
    const groups = await GroupCacheManager.getUserGroups(user.id)

    return NextResponse.json({
      groups,
      total_count: groups.length,
      default_groups: groups.filter(g => g.is_default_group).length,
      custom_groups: groups.filter(g => !g.is_default_group).length
    })

  } catch (error) {
    logger.errorWithStack('Error fetching user groups:', error as Error)
    return NextResponse.json(
      { error: 'Failed to fetch groups' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/groups - Create new group
 */
export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const body = await request.json()

    // Validate input
    const validatedData = groupCreationSchema.parse(body)

    // Check if user has reached group limit
    const existingGroups = await getUserGroups()
    if (existingGroups.length >= 25) {
      return NextResponse.json(
        { error: 'Maximum number of groups (25) reached' },
        { status: 400 }
      )
    }

    // Check for name uniqueness
    if (existingGroups.some(g => g.name.toLowerCase() === validatedData.name.toLowerCase())) {
      return NextResponse.json(
        { error: 'Group name already exists' },
        { status: 409 }
      )
    }

    // Create the group
    const newGroup = await createGroup({
      name: validatedData.name,
      default_frequency: validatedData.default_frequency,
      default_channels: validatedData.default_channels,
      is_default_group: false
    })

    // Update group with notification settings if provided
    if (validatedData.notification_settings) {
      const { error: updateError } = await supabase
        .from('recipient_groups')
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore - Supabase type inference limitation with JSONB columns
        .update({ notification_settings: validatedData.notification_settings })
        .eq('id', newGroup.id)
        .eq('parent_id', user.id)

      if (updateError) {
        logger.errorWithStack('Error updating group notification settings:', updateError as Error)
      }
    }

    // Invalidate cache
    GroupCacheManager.invalidateUserCache(user.id)

    return NextResponse.json({
      group: newGroup,
      message: 'Group created successfully'
    }, { status: 201 })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input data', details: error.errors },
        { status: 400 }
      )
    }

    logger.errorWithStack('Error creating group:', error as Error)
    return NextResponse.json(
      { error: 'Failed to create group' },
      { status: 500 }
    )
  }
}
