import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import { validateRecipientTokenAccess } from '@/middleware/group-security'
import { GroupCacheManager } from '@/lib/group-cache'
import { createLogger } from '@/lib/logger'
import { z } from 'zod'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/types/database'

const logger = createLogger('MuteAPI')

type SupabaseServerClient = SupabaseClient<Database>
type GroupMembershipMuteRecord = {
  group_id: string
  notification_frequency: string | null
  mute_until: string | null
  mute_settings: Record<string, unknown> | null
  is_active: boolean
  recipient_groups: {
    id: string
    name: string
    is_default_group: boolean
  }
}
type GroupMuteStatus = {
  group_id: string
  group_name: string
  is_default_group: boolean
  is_muted: boolean
  mute_until: string | null
  mute_expires_in: number | null
  mute_settings: {
    reason: string | null
    preserve_urgent: boolean
    auto_summary: boolean
    muted_by: string
    muted_at: string | null
  }
}
type NotificationPreferences = Record<string, unknown> & {
  mute_settings?: Record<string, unknown>
}
type RecipientNotificationPreferencesRow = {
  notification_preferences: NotificationPreferences | null
}

// Schema for mute operations
const muteOperationSchema = z.object({
  action: z.enum(['mute', 'unmute', 'snooze']),
  scope: z.enum(['all', 'group', 'specific_groups']),
  group_ids: z.array(z.string().uuid()).optional(),
  duration: z.object({
    type: z.enum(['minutes', 'hours', 'days', 'weeks', 'months', 'indefinite']),
    value: z.number().positive().optional()
  }).optional(),
  reason: z.string().max(500).optional(),
  preserve_urgent: z.boolean().default(true), // Keep urgent/milestone notifications
  auto_summary: z.boolean().default(false) // Send summary when unmuted
})

const muteQuerySchema = z.object({
  include_expired: z.boolean().default(false),
  group_id: z.string().uuid().optional()
})

/**
 * GET /api/recipients/[token]/mute - Get current mute status
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params
    const url = new URL(request.url)
    const queryParams = Object.fromEntries(url.searchParams.entries())

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

    const validatedQuery = muteQuerySchema.parse(queryParams)

    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)

    // Get recipient's current mute settings
    const { data: recipient, error: recipientError } = await supabase
      .from('recipients')
      .select(`
        id,
        name,
        group_preferences,
        notification_preferences,
        is_active
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

    // Get group-specific mute settings from group_memberships
    let membershipQuery = supabase
      .from('group_memberships')
      .select(`
        group_id,
        notification_frequency,
        mute_until,
        mute_settings,
        is_active,
        recipient_groups!inner(
          id,
          name,
          is_default_group
        )
      `)
      .eq('recipient_id', recipient.id)
      .eq('is_active', true)

    if (validatedQuery.group_id) {
      membershipQuery = membershipQuery.eq('group_id', validatedQuery.group_id)
    }

    const { data: memberships, error: membershipsError } = await membershipQuery

    if (membershipsError) {
      logger.errorWithStack('Error fetching memberships:', membershipsError as Error)
      return NextResponse.json(
        { error: 'Failed to fetch mute status' },
        { status: 500 }
      )
    }

    const now = new Date()

    // Process mute status for each group
    const membershipList = (memberships || []) as unknown as GroupMembershipMuteRecord[]
    const groupMuteStatus: GroupMuteStatus[] = membershipList.map(membership => {
      const muteUntil = membership.mute_until ? new Date(membership.mute_until) : null
      const isCurrentlyMuted = muteUntil && muteUntil > now
      const muteSettings = (membership.mute_settings as Record<string, unknown> | null) || {}

      return {
        group_id: membership.group_id,
        group_name: membership.recipient_groups.name,
        is_default_group: membership.recipient_groups.is_default_group,
        is_muted: !!isCurrentlyMuted,
        mute_until: membership.mute_until,
        mute_expires_in: isCurrentlyMuted
          ? Math.max(0, Math.ceil((muteUntil!.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))
          : null,
        mute_settings: {
          reason: (muteSettings.reason as string | undefined) || null,
          preserve_urgent: (muteSettings.preserve_urgent as boolean | undefined) !== false,
          auto_summary: (muteSettings.auto_summary as boolean | undefined) === true,
          muted_by: (muteSettings.muted_by as string | undefined) || 'recipient',
          muted_at: (muteSettings.muted_at as string | undefined) || null
        }
      }
    })

    // Global mute status
    const globalMuteSettings = recipient.notification_preferences?.mute_settings || {}
    const globalMuteUntil = globalMuteSettings.mute_until ? new Date(globalMuteSettings.mute_until) : null
    const isGloballyMuted = globalMuteUntil && globalMuteUntil > now

    // Calculate summary
    const summary = {
      is_globally_muted: isGloballyMuted,
      global_mute_until: globalMuteSettings.mute_until || null,
      total_groups: groupMuteStatus.length,
      muted_groups: groupMuteStatus.filter(g => g.is_muted).length,
      active_groups: groupMuteStatus.filter(g => !g.is_muted).length,
      has_any_mutes: isGloballyMuted || groupMuteStatus.some(g => g.is_muted),
      upcoming_unmutes: groupMuteStatus
        .filter(g => g.is_muted && g.mute_until)
        .sort((a, b) => new Date(a.mute_until!).getTime() - new Date(b.mute_until!).getTime())
        .slice(0, 3)
    }

    return NextResponse.json({
      recipient: {
        id: recipient.id,
        name: recipient.name
      },
      global_mute: {
        is_muted: isGloballyMuted,
        mute_until: globalMuteSettings.mute_until || null,
        settings: globalMuteSettings
      },
      group_mutes: groupMuteStatus,
      summary
    })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid query parameters', details: error.errors },
        { status: 400 }
      )
    }

    logger.errorWithStack('Error fetching mute status:', error as Error)
    return NextResponse.json(
      { error: 'Failed to fetch mute status' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/recipients/[token]/mute - Apply mute settings
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

    const validatedData = muteOperationSchema.parse(body)

    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)

    const now = new Date()
    let muteUntil: Date | null = null

    // Calculate mute duration
    if (validatedData.duration && validatedData.duration.type !== 'indefinite') {
      const { type, value } = validatedData.duration
      if (!value) {
        return NextResponse.json(
          { error: 'Duration value required for timed mutes' },
          { status: 400 }
        )
      }

      muteUntil = new Date(now)
      switch (type) {
        case 'minutes':
          muteUntil.setMinutes(muteUntil.getMinutes() + value)
          break
        case 'hours':
          muteUntil.setHours(muteUntil.getHours() + value)
          break
        case 'days':
          muteUntil.setDate(muteUntil.getDate() + value)
          break
        case 'weeks':
          muteUntil.setDate(muteUntil.getDate() + (value * 7))
          break
        case 'months':
          muteUntil.setMonth(muteUntil.getMonth() + value)
          break
      }
    }

    const muteSettings = {
      reason: validatedData.reason,
      preserve_urgent: validatedData.preserve_urgent,
      auto_summary: validatedData.auto_summary,
      muted_by: 'recipient',
      muted_at: now.toISOString(),
      mute_until: muteUntil?.toISOString() || null
    }

    const results: Array<Record<string, unknown>> = []

    switch (validatedData.action) {
      case 'mute':
        if (validatedData.scope === 'all') {
          // Global mute - update recipient's notification preferences
          const { error } = await supabase
            .from('recipients')
            .update({
              notification_preferences: {
                ...(await getNotificationPreferences(supabase, securityContext.recipient_id)),
                mute_settings: muteSettings
              }
            })
            .eq('id', securityContext.recipient_id)

          if (error) throw error

          results.push({
            scope: 'global',
            action: 'muted',
            mute_until: muteUntil?.toISOString() || 'indefinite'
          })

        } else if (validatedData.scope === 'group' || validatedData.scope === 'specific_groups') {
          const targetGroupIds = validatedData.group_ids || []

          if (targetGroupIds.length === 0) {
            return NextResponse.json(
              { error: 'Group IDs required for group-specific muting' },
              { status: 400 }
            )
          }

          // Validate group access
          const { data: validGroups } = await supabase
            .from('group_memberships')
            .select('group_id, recipient_groups!inner(name)')
            .eq('recipient_id', securityContext.recipient_id)
            .in('group_id', targetGroupIds)
            .eq('is_active', true)

          if (!validGroups || validGroups.length !== targetGroupIds.length) {
            return NextResponse.json(
              { error: 'Some groups not found or access denied' },
              { status: 404 }
            )
          }

          // Apply mute to each group
          for (const group of validGroups as unknown as Array<{ group_id: string; recipient_groups: { name: string } }>) {
            const { error } = await supabase
              .from('group_memberships')
              .update({
                mute_until: muteUntil?.toISOString() || null,
                mute_settings: muteSettings
              })
              .eq('recipient_id', securityContext.recipient_id)
              .eq('group_id', group.group_id)

            if (error) {
              logger.errorWithStack(`Error muting group ${group.group_id}:`, error as Error)
              results.push({
                group_id: group.group_id,
                group_name: group.recipient_groups.name,
                action: 'failed',
                error: error.message
              })
            } else {
              results.push({
                group_id: group.group_id,
                group_name: group.recipient_groups.name,
                action: 'muted',
                mute_until: muteUntil?.toISOString() || 'indefinite'
              })
            }
          }
        }
        break

      case 'unmute':
        if (validatedData.scope === 'all') {
          // Global unmute
          const currentPrefs = await getNotificationPreferences(supabase, securityContext.recipient_id)
          if ('mute_settings' in currentPrefs) {
            delete currentPrefs.mute_settings
          }

          const { error } = await supabase
            .from('recipients')
            .update({
              notification_preferences: currentPrefs
            })
            .eq('id', securityContext.recipient_id)

          if (error) throw error

          results.push({
            scope: 'global',
            action: 'unmuted'
          })

        } else {
          const targetGroupIds = validatedData.group_ids || []

          // Unmute specific groups
          const { error } = await supabase
            .from('group_memberships')
            .update({
              mute_until: null,
              mute_settings: null
            })
            .eq('recipient_id', securityContext.recipient_id)
            .in('group_id', targetGroupIds)

          if (error) throw error

          results.push({
            action: 'unmuted',
            group_count: targetGroupIds.length
          })
        }
        break

      case 'snooze':
        // Snooze is similar to mute but typically shorter duration
        if (!validatedData.duration || validatedData.duration.type === 'indefinite') {
          return NextResponse.json(
            { error: 'Duration required for snooze operation' },
            { status: 400 }
          )
        }

        // Apply snooze logic (similar to mute but with different semantics)
        const snoozeSettings = {
          ...muteSettings,
          snooze_mode: true
        }

        if (validatedData.scope === 'all') {
          const { error } = await supabase
            .from('recipients')
            .update({
              notification_preferences: {
                ...(await getNotificationPreferences(supabase, securityContext.recipient_id)),
                mute_settings: snoozeSettings
              }
            })
            .eq('id', securityContext.recipient_id)

          if (error) throw error

          results.push({
            scope: 'global',
            action: 'snoozed',
            until: muteUntil?.toISOString()
          })
        } else {
          const targetGroupIds = validatedData.group_ids || []

          const { error } = await supabase
            .from('group_memberships')
            .update({
              mute_until: muteUntil?.toISOString(),
              mute_settings: snoozeSettings
            })
            .eq('recipient_id', securityContext.recipient_id)
            .in('group_id', targetGroupIds)

          if (error) throw error

          results.push({
            action: 'snoozed',
            group_count: targetGroupIds.length,
            until: muteUntil?.toISOString()
          })
        }
        break
    }

    // Invalidate cache
    GroupCacheManager.invalidateRecipientCache(securityContext.recipient_id)

    return NextResponse.json({
      message: `${validatedData.action} operation completed successfully`,
      action: validatedData.action,
      scope: validatedData.scope,
      results,
      mute_until: muteUntil?.toISOString() || null,
      expires_in_hours: muteUntil ? Math.ceil((muteUntil.getTime() - now.getTime()) / (1000 * 60 * 60)) : null
    })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input data', details: error.errors },
        { status: 400 }
      )
    }

    logger.errorWithStack('Error processing mute operation:', error as Error)
    return NextResponse.json(
      { error: 'Failed to process mute operation' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/recipients/[token]/mute - Clear all mute settings
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params

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

    // Clear global mute
          const currentPrefs = await getNotificationPreferences(supabase, securityContext.recipient_id)
          if ('mute_settings' in currentPrefs) {
            delete currentPrefs.mute_settings
          }

    const [globalResult, groupResult] = await Promise.all([
      supabase
        .from('recipients')
        .update({
          notification_preferences: currentPrefs
        })
        .eq('id', securityContext.recipient_id),

      supabase
        .from('group_memberships')
        .update({
          mute_until: null,
          mute_settings: null
        })
        .eq('recipient_id', securityContext.recipient_id)
    ])

    if (globalResult.error) {
      logger.errorWithStack('Error clearing global mute:', globalResult.error as Error)
    }

    if (groupResult.error) {
      logger.errorWithStack('Error clearing group mutes:', groupResult.error as Error)
    }

    // Invalidate cache
    GroupCacheManager.invalidateRecipientCache(securityContext.recipient_id)

    return NextResponse.json({
      message: 'All mute settings cleared successfully',
      global_cleared: !globalResult.error,
      groups_cleared: !groupResult.error
    })

  } catch (error) {
    logger.errorWithStack('Error clearing mute settings:', error as Error)
    return NextResponse.json(
      { error: 'Failed to clear mute settings' },
      { status: 500 }
    )
  }
}

// Helper function to get current notification preferences
async function getNotificationPreferences(
  supabase: SupabaseServerClient,
  recipientId: string
): Promise<NotificationPreferences> {
  const { data: recipient } = await supabase
    .from('recipients')
    .select('notification_preferences')
    .eq('id', recipientId)
    .single<RecipientNotificationPreferencesRow>()

  return recipient?.notification_preferences || {}
}
