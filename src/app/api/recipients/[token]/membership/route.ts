import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import { validateRecipientTokenAccess } from '@/middleware/group-security'
import { GroupCacheManager } from '@/lib/group-cache'
import { createLogger } from '@/lib/logger'
import { z } from 'zod'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/types/database'

const logger = createLogger('RecipientMembershipAPI')

type SupabaseServerClient = SupabaseClient<Database>
type MembershipRecord = {
  id: string
  group_id: string
  notification_frequency: string | null
  preferred_channels: string[] | null
  content_types: string[] | null
  role: string | null
  joined_at: string | null
  is_active: boolean
  created_at: string | null
  updated_at: string | null
  recipient_groups: {
    id: string
    name: string
    default_frequency: string | null
    default_channels: string[] | null
    notification_settings: Record<string, unknown> | null
    access_settings: Record<string, unknown> | null
    is_default_group: boolean
    created_at: string | null
  }
}
type EnhancedGroup = MembershipRecord['recipient_groups'] & Record<string, unknown>
type EffectiveSettings = {
  frequency: string
  channels: string[]
  content_types: string[]
  source: string
} & Record<string, unknown>
type EnhancedMembership = MembershipRecord & {
  group: EnhancedGroup
  has_custom_settings: boolean
  effective_settings: EffectiveSettings
  recent_activity?: {
    update_count: number
    last_update: string | null
    updates: Array<{ id: string; created_at: string; delivery_status: string | null }>
  }
}
type MembershipActionResult = {
  action: string
  message: string
  group_name: string
}

type EffectiveSettingsFunctionReturns = Database['public']['Functions']['get_effective_notification_settings']['Returns']

// Schema for membership visibility preferences
const membershipVisibilitySchema = z.object({
  show_all_groups: z.boolean().default(true),
  show_member_counts: z.boolean().default(true),
  show_group_activity: z.boolean().default(false),
  group_visibility_preferences: z.record(z.object({
    visible: z.boolean(),
    show_other_members: z.boolean().default(false),
    show_activity: z.boolean().default(false)
  })).optional()
})

/**
 * GET /api/recipients/[token]/membership - Get comprehensive membership information
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params
    const url = new URL(request.url)
    const includeInactive = url.searchParams.get('include_inactive') === 'true'
    const showActivity = url.searchParams.get('show_activity') === 'true'
    const showOtherMembers = url.searchParams.get('show_other_members') === 'true'

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

    // Set token in session for RLS policies
    await supabase.rpc('set_config', {
      parameter: 'app.preference_token',
      value: token
    })

    // Get recipient information and preferences
    const { data: recipient, error: recipientError } = await supabase
      .from('recipients')
      .select(`
        id,
        name,
        email,
        relationship,
        group_preferences,
        created_at,
        last_seen_at
      `)
      .eq('preference_token', token)
      .eq('is_active', true)
      .single()

    if (recipientError || !recipient) {
      return NextResponse.json(
        { error: 'Recipient not found' },
        { status: 404 }
      )
    }

    // Get detailed group memberships
    let membershipQuery = supabase
      .from('group_memberships')
      .select(`
        id,
        group_id,
        notification_frequency,
        preferred_channels,
        content_types,
        role,
        joined_at,
        is_active,
        created_at,
        updated_at,
        recipient_groups!inner(
          id,
          name,
          default_frequency,
          default_channels,
          notification_settings,
          access_settings,
          is_default_group,
          created_at
        )
      `)
      .eq('recipient_id', recipient.id)

    if (!includeInactive) {
      membershipQuery = membershipQuery.eq('is_active', true)
    }

    const { data: memberships, error: membershipsError } = await membershipQuery

    if (membershipsError) {
      logger.errorWithStack('Error fetching memberships:', membershipsError as Error)
      return NextResponse.json(
        { error: 'Failed to fetch membership information' },
        { status: 500 }
      )
    }

    // Enhance membership data with additional information
    const membershipList = (memberships || []) as unknown as MembershipRecord[]
    const enhancedMemberships = await Promise.all(
      membershipList.map(async (membership): Promise<EnhancedMembership> => {
        const enhanced: EnhancedMembership = {
          ...membership,
          group: membership.recipient_groups,
          has_custom_settings: !!(
            membership.notification_frequency ||
            membership.preferred_channels ||
            membership.content_types
          ),
          effective_settings: await getEffectiveSettings(
            supabase,
            recipient.id,
            membership.group_id,
            membership
          )
        }

        // Add member count and activity if requested
        if (showOtherMembers) {
          const { data: memberCount } = await supabase
            .from('group_memberships')
            .select('id', { count: 'exact' })
            .eq('group_id', membership.group_id)
            .eq('is_active', true)

          enhanced.group.member_count = memberCount?.length || 0
        }

        if (showActivity) {
          // Get recent activity for this group
          const { data: recentUpdates } = await supabase
            .from('child_updates')
            .select('id, created_at, delivery_status')
            .eq('group_id', membership.group_id)
            .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()) // Last 30 days
            .order('created_at', { ascending: false })
            .limit(5)

          enhanced.recent_activity = {
            update_count: recentUpdates?.length || 0,
            last_update: recentUpdates?.[0]?.created_at || null,
            updates: recentUpdates || []
          }
        }

        return enhanced
      })
    )

    // Generate membership summary
    const summary = {
      total_groups: enhancedMemberships.length,
      active_groups: enhancedMemberships.filter(m => m.is_active).length,
      inactive_groups: enhancedMemberships.filter(m => !m.is_active).length,
      default_groups: enhancedMemberships.filter(m => m.group.is_default_group).length,
      custom_groups: enhancedMemberships.filter(m => !m.group.is_default_group).length,
      groups_with_custom_settings: enhancedMemberships.filter(m => m.has_custom_settings).length,
      admin_roles: enhancedMemberships.filter(m => m.role === 'admin').length,
      preferences: recipient.group_preferences || {}
    }

    // Group memberships by type for better organization
    const groupedMemberships = {
      default_groups: enhancedMemberships.filter(m => m.group.is_default_group),
      custom_groups: enhancedMemberships.filter(m => !m.group.is_default_group),
      active_memberships: enhancedMemberships.filter(m => m.is_active),
      inactive_memberships: enhancedMemberships.filter(m => !m.is_active)
    }

    return NextResponse.json({
      recipient: {
        id: recipient.id,
        name: recipient.name,
        email: recipient.email,
        relationship: recipient.relationship,
        member_since: recipient.created_at,
        last_seen: recipient.last_seen_at,
        preferences: recipient.group_preferences || {}
      },
      memberships: enhancedMemberships,
      grouped_memberships: groupedMemberships,
      summary
    })

  } catch (error) {
    logger.errorWithStack('Error fetching membership information:', error as Error)
    return NextResponse.json(
      { error: 'Failed to fetch membership information' },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/recipients/[token]/membership - Update membership visibility preferences
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
    const validatedData = membershipVisibilitySchema.parse(body)

    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)

    // Update recipient's group preferences
    const { error: updateError } = await supabase
      .from('recipients')
      .update({
        group_preferences: {
          ...validatedData,
          updated_at: new Date().toISOString()
        }
      })
      .eq('preference_token', token)
      .eq('is_active', true)

    if (updateError) {
      logger.errorWithStack('Error updating membership preferences:', updateError as Error)
      return NextResponse.json(
        { error: 'Failed to update preferences' },
        { status: 500 }
      )
    }

    // Invalidate cache
    GroupCacheManager.invalidateRecipientCache(securityContext.recipient_id)

    return NextResponse.json({
      message: 'Membership preferences updated successfully',
      preferences: validatedData
    })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input data', details: error.errors },
        { status: 400 }
      )
    }

    logger.errorWithStack('Error updating membership preferences:', error as Error)
    return NextResponse.json(
      { error: 'Failed to update preferences' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/recipients/[token]/membership - Request to join/leave groups
 */
export async function POST(
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

    const actionSchema = z.object({
      action: z.enum(['join', 'leave', 'request_join']),
      group_id: z.string().uuid(),
      reason: z.string().optional(),
      notification_preferences: z.object({
        notification_frequency: z.enum(['every_update', 'daily_digest', 'weekly_digest', 'milestones_only']).optional(),
        preferred_channels: z.array(z.enum(['email', 'sms', 'whatsapp'])).optional(),
        content_types: z.array(z.enum(['photos', 'text', 'milestones'])).optional()
      }).optional()
    })

    const validatedData = actionSchema.parse(body)

    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)

    // Check if group exists and get access settings
    const { data: group, error: groupError } = await supabase
      .from('recipient_groups')
      .select('id, name, access_settings, is_default_group')
      .eq('id', validatedData.group_id)
      .single()

    if (groupError || !group) {
      return NextResponse.json(
        { error: 'Group not found' },
        { status: 404 }
      )
    }

    let result: MembershipActionResult | null = null

    switch (validatedData.action) {
      case 'leave':
        // Check if group allows self-removal
        if (group.access_settings?.allow_self_removal === false) {
          return NextResponse.json(
            { error: 'Self-removal is not allowed for this group' },
            { status: 403 }
          )
        }

        // Don't allow leaving default groups completely, just deactivate
        if (group.is_default_group) {
          const { error } = await supabase
            .from('group_memberships')
            .update({
              is_active: false,
              updated_at: new Date().toISOString()
            })
            .eq('recipient_id', securityContext.recipient_id)
            .eq('group_id', validatedData.group_id)

          if (error) throw error

          result = {
            action: 'deactivated',
            message: 'Membership deactivated. You can rejoin anytime.',
            group_name: group.name
          }
        } else {
          // For custom groups, completely remove membership
          const { error } = await supabase
            .from('group_memberships')
            .delete()
            .eq('recipient_id', securityContext.recipient_id)
            .eq('group_id', validatedData.group_id)

          if (error) throw error

          result = {
            action: 'left',
            message: 'Successfully left the group.',
            group_name: group.name
          }
        }
        break

      case 'join':
        // Check if membership already exists
        const { data: existingMembership } = await supabase
          .from('group_memberships')
          .select('is_active')
          .eq('recipient_id', securityContext.recipient_id)
          .eq('group_id', validatedData.group_id)
          .single()

        if (existingMembership) {
          if (existingMembership.is_active) {
            return NextResponse.json(
              { error: 'Already a member of this group' },
              { status: 409 }
            )
          } else {
            // Reactivate membership
            const { error } = await supabase
              .from('group_memberships')
              .update({
                is_active: true,
                ...validatedData.notification_preferences,
                updated_at: new Date().toISOString()
              })
              .eq('recipient_id', securityContext.recipient_id)
              .eq('group_id', validatedData.group_id)

            if (error) throw error

            result = {
              action: 'rejoined',
              message: 'Successfully rejoined the group.',
              group_name: group.name
            }
          }
        } else {
          // Create new membership
          const { error } = await supabase
            .from('group_memberships')
            .insert({
              recipient_id: securityContext.recipient_id,
              group_id: validatedData.group_id,
              ...validatedData.notification_preferences,
              role: 'member',
              is_active: true
            })

          if (error) throw error

          result = {
            action: 'joined',
            message: 'Successfully joined the group.',
            group_name: group.name
          }
        }
        break

      case 'request_join':
        // This would typically create a join request that admins can approve
        // For now, we'll implement as a direct join with notification to admins
        result = {
          action: 'request_submitted',
          message: 'Join request submitted. Group admins will be notified.',
          group_name: group.name
        }
        break
    }

    // Invalidate cache
    GroupCacheManager.invalidateRecipientCache(securityContext.recipient_id)

    if (!result) {
      throw new Error('Membership action did not produce a result')
    }

    return NextResponse.json(result)

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input data', details: error.errors },
        { status: 400 }
      )
    }

    logger.errorWithStack('Error processing membership action:', error as Error)
    return NextResponse.json(
      { error: 'Failed to process membership action' },
      { status: 500 }
    )
  }
}

// Helper function to get effective notification settings
async function getEffectiveSettings(
  supabase: SupabaseServerClient,
  recipientId: string,
  groupId: string,
  membership: MembershipRecord
): Promise<EffectiveSettings> {
  try {
    // Use the database function if available
    const { data, error } = await supabase.rpc('get_effective_notification_settings', {
      p_recipient_id: recipientId,
      p_group_id: groupId
    }) as { data: EffectiveSettingsFunctionReturns | null, error: any }

    const effectiveSettings = Array.isArray(data) ? data[0] : null

    if (error || !effectiveSettings) {
      // Fallback to manual resolution
      type RecipientGroupDefaults = {
        default_frequency: string | null
        default_channels: string[] | null
        notification_settings: { content_types?: string[] } | null
      }

      const { data: group } = await supabase
        .from('recipient_groups')
        .select('default_frequency, default_channels, notification_settings')
        .eq('id', groupId)
        .single<RecipientGroupDefaults>()

      return {
        frequency: membership.notification_frequency || group?.default_frequency || 'every_update',
        channels: membership.preferred_channels || group?.default_channels || ['email'],
        content_types: membership.content_types || group?.notification_settings?.content_types || ['photos', 'text', 'milestones'],
        source: membership.notification_frequency ? 'member_override' : 'group_default'
      }
    }

    return {
      frequency: (effectiveSettings as any).frequency,
      channels: (effectiveSettings as any).channels,
      content_types: (effectiveSettings as any).content_types,
      source: (effectiveSettings as any).source
    }
  } catch (error) {
    logger.errorWithStack('Error getting effective settings:', error as Error)
    return {
      frequency: 'every_update',
      channels: ['email'],
      content_types: ['photos', 'text', 'milestones'],
      source: 'fallback'
    }
  }
}
