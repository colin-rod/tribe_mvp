import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import { updateGroupNotificationSettings } from '@/lib/group-management'
import { GroupCacheManager } from '@/lib/group-cache'
import { createLogger } from '@/lib/logger'
import { z } from 'zod'

const logger = createLogger('GroupSettingsAPI')

// Schema for group notification settings
const groupNotificationSettingsSchema = z.object({
  notification_settings: z.object({
    email_notifications: z.boolean().optional(),
    sms_notifications: z.boolean().optional(),
    push_notifications: z.boolean().optional(),
    quiet_hours: z.object({
      start: z.string().regex(/^\d{2}:\d{2}$/),
      end: z.string().regex(/^\d{2}:\d{2}$/)
    }).optional(),
    digest_day: z.enum(['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']).optional(),
    batch_updates: z.boolean().optional(),
    auto_add_new_recipients: z.boolean().optional()
  }).optional(),
  default_frequency: z.enum(['every_update', 'daily_digest', 'weekly_digest', 'milestones_only']).optional(),
  default_channels: z.array(z.enum(['email', 'sms', 'whatsapp'])).optional(),
  apply_to_existing_members: z.boolean().default(false),
  access_settings: z.object({
    allow_self_removal: z.boolean().optional(),
    allow_preference_override: z.boolean().optional(),
    require_confirmation: z.boolean().optional()
  }).optional()
})

/**
 * GET /api/groups/[groupId]/settings - Get group notification settings
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

    if (!groupId || !groupId.match(/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/)) {
      return NextResponse.json({ error: 'Invalid group ID format' }, { status: 400 })
    }

    // Get group with available settings (notification_settings and access_settings don't exist in schema)
    const { data: group, error } = await supabase
      .from('recipient_groups')
      .select(`
        id,
        name,
        default_frequency,
        default_channels,
        is_default_group,
        created_at,
        updated_at
      `)
      .eq('id', groupId)
      .eq('parent_id', user.id)
      .single()

    if (error || !group) {
      return NextResponse.json({ error: 'Group not found or access denied' }, { status: 404 })
    }

    // Get member count via recipients table (group_memberships table doesn't exist)
    const { data: memberStats } = await supabase
      .from('recipients')
      .select('frequency, preferred_channels, content_types')
      .eq('group_id', groupId)
      .eq('is_active', true)

    type MemberStats = {
      frequency: string | null
      preferred_channels: string[] | null
      content_types: string[] | null
    }

    const membersWithCustomSettings = (memberStats as MemberStats[] | null)?.filter(m =>
      m.frequency !== group.default_frequency ||
      JSON.stringify(m.preferred_channels) !== JSON.stringify(group.default_channels) ||
      m.content_types
    ).length || 0

    return NextResponse.json({
      group: {
        ...group,
        member_count: memberStats?.length || 0,
        members_with_custom_settings: membersWithCustomSettings
      }
    })

  } catch (error) {
    logger.errorWithStack('Error fetching group settings:', error as Error)
    return NextResponse.json(
      { error: 'Failed to fetch group settings' },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/groups/[groupId]/settings - Update group notification settings
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ groupId: string }> }
) {
  try {
    const { groupId } = await params
    const body = await request.json()
    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    if (!groupId || !groupId.match(/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/)) {
      return NextResponse.json({ error: 'Invalid group ID format' }, { status: 400 })
    }

    // Validate input
    const validatedData = groupNotificationSettingsSchema.parse(body)

    // Check if group exists and user owns it
    const { data: existingGroup, error: groupError } = await supabase
      .from('recipient_groups')
      .select('id, is_default_group')
      .eq('id', groupId)
      .eq('parent_id', user.id)
      .single()

    type ExistingGroup = {
      id: string
      is_default_group: boolean
    }

    if (groupError || !existingGroup) {
      return NextResponse.json({ error: 'Group not found or access denied' }, { status: 404 })
    }

    // Prevent modification of certain settings for default groups
    if ((existingGroup as ExistingGroup).is_default_group && validatedData.access_settings?.allow_self_removal === false) {
      return NextResponse.json(
        { error: 'Cannot disable self-removal for default groups' },
        { status: 400 }
      )
    }

    // Update group settings using the library function
    const success = await updateGroupNotificationSettings(groupId, {
      notification_settings: validatedData.notification_settings,
      default_frequency: validatedData.default_frequency,
      default_channels: validatedData.default_channels,
      apply_to_existing_members: validatedData.apply_to_existing_members
    })

    if (!success) {
      return NextResponse.json(
        { error: 'Failed to update group settings' },
        { status: 500 }
      )
    }

    // Update access settings separately
    if (validatedData.access_settings) {
      const { error: accessError } = await supabase
        .from('recipient_groups')
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore - Supabase type inference limitation with JSONB columns
        .update(validatedData.access_settings)
        .eq('id', groupId)
        .eq('parent_id', user.id)

      if (accessError) {
        logger.errorWithStack('Error updating access settings:', accessError as Error)
        // Continue - notification settings were updated successfully
      }
    }

    // Invalidate cache
    GroupCacheManager.invalidateUserCache(user.id)

    // Get updated group data
    const { data: updatedGroup } = await supabase
      .from('recipient_groups')
      .select(`
        id,
        name,
        default_frequency,
        default_channels,
        updated_at
      `)
      .eq('id', groupId)
      .eq('parent_id', user.id)
      .single()

    return NextResponse.json({
      message: 'Group settings updated successfully',
      group: updatedGroup,
      applied_to_existing_members: validatedData.apply_to_existing_members
    })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input data', details: error.errors },
        { status: 400 }
      )
    }

    logger.errorWithStack('Error updating group settings:', error as Error)
    return NextResponse.json(
      { error: 'Failed to update group settings' },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/groups/[groupId]/settings - Partially update group settings
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ groupId: string }> }
) {
  try {
    const { groupId } = await params
    const body = await request.json()
    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    if (!groupId || !groupId.match(/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/)) {
      return NextResponse.json({ error: 'Invalid group ID format' }, { status: 400 })
    }

    // Schema for partial updates
    const partialUpdateSchema = z.object({
      setting_path: z.string(),
      value: z.any(),
      apply_to_members: z.boolean().default(false)
    })

    const validatedData = partialUpdateSchema.parse(body)

    // Get current group settings (notification_settings and access_settings columns don't exist)
    const { data: group, error: groupError } = await supabase
      .from('recipient_groups')
      .select('id, default_frequency, default_channels')
      .eq('id', groupId)
      .eq('parent_id', user.id)
      .single()

    type GroupSettings = {
      id: string
      default_frequency: string
      default_channels: string[]
    }

    if (groupError || !group) {
      return NextResponse.json({ error: 'Group not found or access denied' }, { status: 404 })
    }

    // Since notification_settings doesn't exist, we'll work with default_frequency and default_channels
    const currentSettings: Record<string, unknown> = {
      default_frequency: (group as GroupSettings).default_frequency,
      default_channels: (group as GroupSettings).default_channels
    }
    const updatedSettings = { ...currentSettings } as Record<string, unknown>
    const pathParts = validatedData.setting_path.split('.')

    // Handle nested path updates
    if (pathParts.length === 1) {
      updatedSettings[pathParts[0]] = validatedData.value
    } else if (pathParts.length === 2) {
      if (!updatedSettings[pathParts[0]]) {
        updatedSettings[pathParts[0]] = {}
      }
      (updatedSettings[pathParts[0]] as Record<string, unknown>)[pathParts[1]] = validatedData.value
    }

    const { error: updateError } = await supabase
      .from('recipient_groups')
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore - Supabase type inference limitation with JSONB columns
      .update({ notification_settings: updatedSettings })
      .eq('id', groupId)
      .eq('parent_id', user.id)

    if (updateError) {
      logger.errorWithStack('Error updating group setting:', updateError as Error)
      return NextResponse.json(
        { error: 'Failed to update setting' },
        { status: 500 }
      )
    }

    // Optionally apply to members
    if (validatedData.apply_to_members) {
      // Apply specific setting to all members without custom overrides
      const memberUpdate: Partial<{
        frequency: string | null
        preferred_channels: string[] | null
      }> = {}

      if (validatedData.setting_path === 'default_frequency') {
        memberUpdate.frequency = validatedData.value
      } else if (validatedData.setting_path === 'default_channels') {
        memberUpdate.preferred_channels = validatedData.value
      }

      if (Object.keys(memberUpdate).length > 0) {
        await supabase
          .from('recipients')
          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          // @ts-ignore - Supabase type inference limitation with dynamic updates
          .update(memberUpdate)
          .eq('group_id', groupId)
          .is('frequency', null)
          .eq('is_active', true)
      }
    }

    // Invalidate cache
    GroupCacheManager.invalidateUserCache(user.id)

    return NextResponse.json({
      message: 'Setting updated successfully',
      setting_path: validatedData.setting_path,
      new_value: validatedData.value,
      applied_to_members: validatedData.apply_to_members
    })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input data', details: error.errors },
        { status: 400 }
      )
    }

    logger.errorWithStack('Error updating group setting:', error as Error)
    return NextResponse.json(
      { error: 'Failed to update setting' },
      { status: 500 }
    )
  }
}
