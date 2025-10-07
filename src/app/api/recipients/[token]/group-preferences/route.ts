import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import { validateRecipientTokenAccess } from '@/middleware/group-security'
import { GroupCacheManager } from '@/lib/group-cache'
import { createLogger } from '@/lib/logger'
import { z } from 'zod'
import type { Tables, TablesUpdate } from '@/lib/types/database.types'

const logger = createLogger('GroupPreferencesAPI')

type RecipientRow = Tables<'recipients'>
type RecipientGroupRow = Tables<'recipient_groups'>

type MembershipWithGroup = RecipientRow & {
  recipient_groups: Pick<
    RecipientGroupRow,
    'id' | 'name' | 'default_frequency' | 'default_channels' | 'notification_settings' | 'is_default_group'
  > | null
}

type MembershipData = Pick<RecipientRow, 'id' | 'is_active'>

// Schema for group-specific preference updates
const groupPreferencesSchema = z.object({
  group_id: z.string().uuid(),
  frequency: z.enum(['every_update', 'daily_digest', 'weekly_digest', 'milestones_only']).optional(),
  preferred_channels: z.array(z.enum(['email', 'sms', 'whatsapp'])).min(1, 'At least one channel is required').optional(),
  content_types: z.array(z.enum(['photos', 'text', 'milestones'])).min(1, 'At least one content type is required').optional()
})

// Schema for resetting group preferences
const resetGroupPreferencesSchema = z.object({
  group_id: z.string().uuid()
})

/**
 * PUT /api/recipients/[token]/group-preferences - Update group-specific preferences
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params
    const body = await request.json()

    if (!token || token.trim() === '') {
      return NextResponse.json({ error: 'Invalid token' }, { status: 400 })
    }

    // Validate token access
    const securityContext = await validateRecipientTokenAccess(token)
    if (!securityContext.can_modify_settings) {
      return NextResponse.json(
        { error: 'Invalid or expired access token' },
        { status: 403 }
      )
    }

    // Validate input
    const validatedData = groupPreferencesSchema.parse(body)

    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)

    // Set token in session for RLS policies
    // @ts-expect-error - RPC type inference issue
    await supabase.rpc('set_config', {
      parameter: 'app.preference_token',
      value: token
    })

    // Verify group membership
    const { data: membership, error: membershipError } = await supabase
      .from('recipients')
      .select('id, is_active')
      .eq('recipient_id', securityContext.recipient_id)
      .eq('group_id', validatedData.group_id)
      .returns<MembershipData>()
      .single()

    if (membershipError || !membership) {
      return NextResponse.json(
        { error: 'Group membership not found' },
        { status: 404 }
      )
    }

    const typedMembership = membership
    if (!typedMembership.is_active) {
      return NextResponse.json(
        { error: 'Cannot update preferences for inactive group membership' },
        { status: 403 }
      )
    }

    // Prepare update data
    const updateData: TablesUpdate<'recipients'> = {
      updated_at: new Date().toISOString()
    }

    if (validatedData.frequency) {
      updateData.frequency = validatedData.frequency
    }

    if (validatedData.preferred_channels) {
      updateData.preferred_channels = validatedData.preferred_channels
    }

    if (validatedData.content_types) {
      updateData.content_types = validatedData.content_types
    }

    // Update group membership preferences
    const { error: updateError } = await supabase
      .from('recipients')
      .update(updateData)
      .eq('id', typedMembership.id)

    if (updateError) {
      logger.errorWithStack('Error updating group preferences:', updateError as Error)
      return NextResponse.json(
        { error: 'Failed to update group preferences' },
        { status: 500 }
      )
    }

    // Invalidate cache
    GroupCacheManager.invalidateRecipientCache(securityContext.recipient_id)

    // Get updated effective settings
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: effectiveSettings } = await (supabase.rpc as any)(
      'get_effective_notification_settings',
      {
        p_recipient_id: securityContext.recipient_id,
        p_group_id: validatedData.group_id
      }
    )

    return NextResponse.json({
      message: 'Group preferences updated successfully',
      effective_settings: effectiveSettings || {
        frequency: validatedData.frequency || 'every_update',
        channels: validatedData.preferred_channels || ['email'],
        content_types: validatedData.content_types || ['photos', 'text', 'milestones'],
        source: 'member_override'
      }
    })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input data', details: error.errors },
        { status: 400 }
      )
    }

    logger.errorWithStack('Error updating group preferences:', error as Error)
    return NextResponse.json(
      { error: 'Failed to update group preferences' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/recipients/[token]/group-preferences - Reset to group defaults
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params
    const body = await request.json()

    if (!token || token.trim() === '') {
      return NextResponse.json({ error: 'Invalid token' }, { status: 400 })
    }

    // Validate token access
    const securityContext = await validateRecipientTokenAccess(token)
    if (!securityContext.can_modify_settings) {
      return NextResponse.json(
        { error: 'Invalid or expired access token' },
        { status: 403 }
      )
    }

    // Validate input
    const validatedData = resetGroupPreferencesSchema.parse(body)

    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)

    // Set token in session for RLS policies
    // @ts-expect-error - Supabase RPC type inference issue
    await supabase.rpc('set_config', {
      parameter: 'app.preference_token',
      value: token
    })

    // Verify group membership
    const { data: membership, error: membershipError } = await supabase
      .from('recipients')
      .select('id, is_active')
      .eq('recipient_id', securityContext.recipient_id)
      .eq('group_id', validatedData.group_id)
      .returns<MembershipData>()
      .single()

    if (membershipError || !membership) {
      return NextResponse.json(
        { error: 'Group membership not found' },
        { status: 404 }
      )
    }

    // Reset to group defaults by clearing custom settings
    const resetData: TablesUpdate<'recipients'> = {
      frequency: null,
      preferred_channels: null,
      content_types: null,
      updated_at: new Date().toISOString()
    }

    const { error: updateError } = await supabase
      .from('recipients')
      .update(resetData)
      .eq('id', membership.id)

    if (updateError) {
      logger.errorWithStack('Error resetting group preferences:', updateError as Error)
      return NextResponse.json(
        { error: 'Failed to reset group preferences' },
        { status: 500 }
      )
    }

    // Invalidate cache
    GroupCacheManager.invalidateRecipientCache(securityContext.recipient_id)

    // Get group defaults
    const { data: group, error: groupError } = await supabase
      .from('recipient_groups')
      .select('default_frequency, default_channels')
      .eq('id', validatedData.group_id)
      .single()

    if (groupError) {
      logger.errorWithStack('Error fetching group defaults:', groupError as Error)
    }

    return NextResponse.json({
      message: 'Group preferences reset to defaults successfully',
      effective_settings: {
        frequency: (group as { default_frequency?: string } | null)?.default_frequency || 'every_update',
        channels: (group as { default_channels?: string[] } | null)?.default_channels || ['email'],
        content_types: ['photos', 'text', 'milestones'],
        source: 'group_default'
      }
    })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input data', details: error.errors },
        { status: 400 }
      )
    }

    logger.errorWithStack('Error resetting group preferences:', error as Error)
    return NextResponse.json(
      { error: 'Failed to reset group preferences' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/recipients/[token]/group-preferences - Get group-specific preference options
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params
    const url = new URL(request.url)
    const groupId = url.searchParams.get('group_id')

    if (!token || token.trim() === '') {
      return NextResponse.json({ error: 'Invalid token' }, { status: 400 })
    }

    // Validate token access
    const securityContext = await validateRecipientTokenAccess(token)
    if (!securityContext.can_modify_settings) {
      return NextResponse.json(
        { error: 'Invalid or expired access token' },
        { status: 403 }
      )
    }

    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)

    if (groupId) {
      // Get specific group preferences
      const { data: membership, error: membershipError } = await supabase
        .from('recipients')
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
        .eq('recipient_id', securityContext.recipient_id)
        .eq('group_id', groupId)
        .single()

      if (membershipError || !membership) {
        return NextResponse.json(
          { error: 'Group membership not found' },
          { status: 404 }
        )
      }

      // Get effective settings
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: effectiveSettings } = await (supabase.rpc as any)(
        'get_effective_notification_settings',
        {
          p_recipient_id: securityContext.recipient_id,
          p_group_id: groupId
        }
      )

      type MembershipType = {
        frequency?: string | null
        preferred_channels?: string[] | null
        content_types?: string[] | null
      }

      return NextResponse.json({
        membership,
        effective_settings: effectiveSettings,
        has_custom_settings: !!(
          (membership as MembershipType).frequency ||
          (membership as MembershipType).preferred_channels ||
          (membership as MembershipType).content_types
        )
      })
    } else {
      // Get all group preferences
      const { data: memberships, error: membershipsError } = await supabase
        .from('recipients')
        .select(`
          *,
          recipient_groups!inner(
            id,
            name,
            default_frequency,
            default_channels,
            notification_settings,
            is_default_group
          )
        `)
        .eq('recipient_id', securityContext.recipient_id)
        .eq('is_active', true)
        .returns<MembershipWithGroup[]>()

      if (membershipsError) {
        logger.errorWithStack('Error fetching group memberships:', membershipsError as Error)
        return NextResponse.json(
          { error: 'Failed to fetch group memberships' },
          { status: 500 }
        )
      }

      const enhancedMemberships = await Promise.all(
        (memberships ?? []).map(async membership => {
          let effectiveSettings: unknown = null

          if (membership.group_id) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const { data } = await (supabase.rpc as any)(
              'get_effective_notification_settings',
              {
                p_recipient_id: securityContext.recipient_id,
                p_group_id: membership.group_id
              }
            )
            effectiveSettings = data
          }

          return {
            ...membership,
            effective_settings: effectiveSettings,
            has_custom_settings: Boolean(
              membership.frequency ||
              membership.preferred_channels ||
              membership.content_types
            )
          }
        })
      )

      return NextResponse.json({
        memberships: enhancedMemberships,
        summary: {
          total_groups: enhancedMemberships.length,
          groups_with_custom_settings: enhancedMemberships.filter(m => m.has_custom_settings).length,
          default_groups: enhancedMemberships.filter(m => m.recipient_groups?.is_default_group ?? false).length,
          custom_groups: enhancedMemberships.filter(m => !(m.recipient_groups?.is_default_group ?? false)).length
        }
      })
    }

  } catch (error) {
    logger.errorWithStack('Error fetching group preferences:', error as Error)
    return NextResponse.json(
      { error: 'Failed to fetch group preferences' },
      { status: 500 }
    )
  }
}
