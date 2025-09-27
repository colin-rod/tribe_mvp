import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import { getRecipientGroups } from '@/lib/group-management'
import { validateRecipientTokenAccess } from '@/middleware/group-security'
import { GroupCacheManager } from '@/lib/group-cache'
import { z } from 'zod'
import { createLogger } from '@/lib/logger'

const logger = createLogger('PreferencesAPI')
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params
    const url = new URL(request.url)
    const includeGroups = url.searchParams.get('include_groups') === 'true'
    const includeMuteStatus = url.searchParams.get('include_mute_status') === 'true'

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

    // Get recipient with enhanced data
    const { data, error } = await supabase
      .from('recipients')
      .select(`
        *,
        recipient_groups(*)
      `)
      .eq('preference_token', token)
      .eq('is_active', true)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Invalid or expired token' }, { status: 404 })
      }
      logger.errorWithStack('Error fetching recipient by token:', error as Error)
      return NextResponse.json({ error: 'Failed to fetch recipient' }, { status: 500 })
    }

    const recipient = {
      ...data,
      group: Array.isArray(data.recipient_groups) ? data.recipient_groups[0] : data.recipient_groups
    }

    const enhancedData: Record<string, unknown> = { recipient }

    // Include comprehensive group information if requested
    if (includeGroups) {
      try {
        const groups = await getRecipientGroups(token)
        enhancedData.groups = groups
        enhancedData.group_summary = {
          total_groups: groups.length,
          groups_with_custom_settings: groups.filter(g =>
            g.member_notification_frequency ||
            g.member_preferred_channels ||
            g.member_content_types
          ).length,
          default_groups: groups.filter(g => g.group_name.match(/^(Close Family|Extended Family|Friends)$/)).length,
          custom_groups: groups.filter(g => !g.group_name.match(/^(Close Family|Extended Family|Friends)$/)).length
        }
      } catch (error) {
        logger.errorWithStack('Error fetching recipient groups:', error as Error)
        // Continue without group data rather than fail entirely
        enhancedData.groups = []
        enhancedData.group_summary = { error: 'Failed to load group information' }
      }
    }

    // Include mute status if requested
    if (includeMuteStatus) {
      try {
        // Check global mute status
        const globalMuteSettings = recipient.notification_preferences?.mute_settings
        const globalMuteUntil = globalMuteSettings?.mute_until ? new Date(globalMuteSettings.mute_until) : null
        const isGloballyMuted = globalMuteUntil && globalMuteUntil > new Date()

        // Check group-specific mutes
        const { data: groupMutes } = await supabase
          .from('group_memberships')
          .select(`
            group_id,
            mute_until,
            mute_settings,
            recipient_groups!inner(name)
          `)
          .eq('recipient_id', recipient.id)
          .eq('is_active', true)
          .not('mute_until', 'is', null)

        const activeGroupMutes = (groupMutes || []).filter(m => {
          const muteUntil = new Date(m.mute_until)
          return muteUntil > new Date()
        })

        enhancedData.mute_status = {
          is_globally_muted: isGloballyMuted,
          global_mute_until: globalMuteSettings?.mute_until || null,
          active_group_mutes: activeGroupMutes.length,
          group_mutes: activeGroupMutes.map(m => ({
            group_id: m.group_id,
            group_name: Array.isArray(m.recipient_groups) ? m.recipient_groups[0]?.name : m.recipient_groups?.name,
            mute_until: m.mute_until,
            settings: m.mute_settings
          })),
          has_any_mutes: isGloballyMuted || activeGroupMutes.length > 0
        }
      } catch (error) {
        logger.errorWithStack('Error fetching mute status:', error as Error)
        enhancedData.mute_status = { error: 'Failed to load mute status' }
      }
    }

    return NextResponse.json(enhancedData)
  } catch (error) {
    logger.errorWithStack('Preference API error:', error as Error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

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

    // Enhanced preference schema that supports group-specific updates
    const enhancedPreferencesSchema = z.object({
      // Legacy single-group preferences (maintained for backward compatibility)
      frequency: z.enum(['every_update', 'daily_digest', 'weekly_digest', 'milestones_only']).optional(),
      preferred_channels: z.array(z.enum(['email', 'sms', 'whatsapp'])).optional(),
      content_types: z.array(z.enum(['photos', 'text', 'milestones'])).optional(),

      // New group-specific preferences
      group_preferences: z.record(z.object({
        notification_frequency: z.enum(['every_update', 'daily_digest', 'weekly_digest', 'milestones_only']).optional(),
        preferred_channels: z.array(z.enum(['email', 'sms', 'whatsapp'])).optional(),
        content_types: z.array(z.enum(['photos', 'text', 'milestones'])).optional(),
        use_group_defaults: z.boolean().default(false)
      })).optional(),

      // Global notification preferences
      notification_preferences: z.object({
        email_enabled: z.boolean().optional(),
        sms_enabled: z.boolean().optional(),
        push_enabled: z.boolean().optional(),
        quiet_hours: z.object({
          start: z.string().regex(/^\d{2}:\d{2}$/),
          end: z.string().regex(/^\d{2}:\d{2}$/)
        }).optional(),
        digest_frequency: z.enum(['daily', 'weekly', 'monthly']).optional()
      }).optional(),

      // Update mode: 'legacy' (old system), 'group_specific' (new system), or 'mixed'
      update_mode: z.enum(['legacy', 'group_specific', 'mixed']).default('legacy')
    })

    const preferences = enhancedPreferencesSchema.parse(body)

    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)

    // Set token for RLS policies
    await supabase.rpc('set_config', {
      parameter: 'app.preference_token',
      value: token
    })

    // Get recipient and current group memberships
    const { data: recipient, error: fetchError } = await supabase
      .from('recipients')
      .select(`
        *,
        recipient_groups(*)
      `)
      .eq('preference_token', token)
      .eq('is_active', true)
      .single()

    if (fetchError || !recipient) {
      return NextResponse.json({ error: 'Invalid or expired preference link' }, { status: 404 })
    }

    type UpdateResult =
      | {
        type: 'legacy'
        success: boolean
        updated_fields: string[]
      }
      | {
        type: 'group_specific'
        group_id: string
        success: boolean
        error?: string
        action?: 'reset_to_defaults' | 'custom_preferences'
        updated_fields?: string[]
      }
      | {
        type: 'notification_preferences'
        success: boolean
        updated_fields?: string[]
        error?: string
      }

    const updateResults: UpdateResult[] = []

    if (preferences.update_mode === 'legacy' || (preferences.frequency || preferences.preferred_channels || preferences.content_types)) {
      // Handle legacy preference updates (backward compatibility)
      const group = Array.isArray(recipient.recipient_groups) ? recipient.recipient_groups[0] : recipient.recipient_groups
      const overridesGroupDefault = group ?
        (preferences.frequency && preferences.frequency !== group.default_frequency) ||
        (preferences.preferred_channels && !arraysEqual(preferences.preferred_channels, group.default_channels)) :
        true

      const legacyUpdate: {
        frequency?: typeof preferences.frequency
        preferred_channels?: typeof preferences.preferred_channels
        content_types?: typeof preferences.content_types
        overrides_group_default: boolean
      } = {
        overrides_group_default: overridesGroupDefault ?? true
      }
      if (preferences.frequency) legacyUpdate.frequency = preferences.frequency
      if (preferences.preferred_channels) legacyUpdate.preferred_channels = preferences.preferred_channels
      if (preferences.content_types) legacyUpdate.content_types = preferences.content_types

      const { error: legacyError } = await supabase
        .from('recipients')
        .update(legacyUpdate)
        .eq('preference_token', token)
        .eq('is_active', true)

      if (legacyError) {
        logger.errorWithStack('Error updating legacy preferences:', legacyError as Error)
        return NextResponse.json({ error: 'Failed to update preferences' }, { status: 500 })
      }

      updateResults.push({
        type: 'legacy',
        success: true,
        updated_fields: Object.keys(legacyUpdate)
      })
    }

    if (preferences.update_mode === 'group_specific' && preferences.group_preferences) {
      // Handle group-specific preference updates
      const { data: memberships, error: membershipsError } = await supabase
        .from('group_memberships')
        .select('group_id, recipient_groups!inner(name)')
        .eq('recipient_id', recipient.id)
        .eq('is_active', true)

      if (membershipsError) {
        logger.errorWithStack('Error fetching memberships:', membershipsError as Error)
        return NextResponse.json({ error: 'Failed to fetch group memberships' }, { status: 500 })
      }

      const validGroupIds = (memberships || []).map(m => m.group_id)

      for (const [groupId, groupPrefs] of Object.entries(preferences.group_preferences)) {
        if (!validGroupIds.includes(groupId)) {
          updateResults.push({
            type: 'group_specific',
            group_id: groupId,
            success: false,
            error: 'Group not found or access denied'
          })
          continue
        }

        try {
          if (groupPrefs.use_group_defaults) {
            // Reset to group defaults
            const { error } = await supabase
              .from('group_memberships')
              .update({
                notification_frequency: null,
                preferred_channels: null,
                content_types: null
              })
              .eq('recipient_id', recipient.id)
              .eq('group_id', groupId)

            if (error) throw error

            updateResults.push({
              type: 'group_specific',
              group_id: groupId,
              success: true,
              action: 'reset_to_defaults'
            })
          } else {
            // Apply custom preferences for this group
            const groupUpdate: {
              notification_frequency?: typeof groupPrefs.notification_frequency
              preferred_channels?: typeof groupPrefs.preferred_channels
              content_types?: typeof groupPrefs.content_types
            } = {}
            if (groupPrefs.notification_frequency) groupUpdate.notification_frequency = groupPrefs.notification_frequency
            if (groupPrefs.preferred_channels) groupUpdate.preferred_channels = groupPrefs.preferred_channels
            if (groupPrefs.content_types) groupUpdate.content_types = groupPrefs.content_types

            if (Object.keys(groupUpdate).length > 0) {
              const { error } = await supabase
                .from('group_memberships')
                .update(groupUpdate)
                .eq('recipient_id', recipient.id)
                .eq('group_id', groupId)

              if (error) throw error

              updateResults.push({
                type: 'group_specific',
                group_id: groupId,
                success: true,
                action: 'custom_preferences',
                updated_fields: Object.keys(groupUpdate)
              })
            }
          }
        } catch (error) {
          updateResults.push({
            type: 'group_specific',
            group_id: groupId,
            success: false,
            error: (error as Error).message
          })
        }
      }
    }

    if (preferences.notification_preferences) {
      // Update global notification preferences
      const currentNotificationPrefs = recipient.notification_preferences || {}
      const updatedNotificationPrefs = {
        ...currentNotificationPrefs,
        ...preferences.notification_preferences,
        updated_at: new Date().toISOString()
      }

      const { error: notificationError } = await supabase
        .from('recipients')
        .update({
          notification_preferences: updatedNotificationPrefs
        })
        .eq('preference_token', token)
        .eq('is_active', true)

      if (notificationError) {
        logger.errorWithStack('Error updating notification preferences:', notificationError as Error)
        updateResults.push({
          type: 'notification_preferences',
          success: false,
          error: notificationError.message
        })
      } else {
        updateResults.push({
          type: 'notification_preferences',
          success: true,
          updated_fields: Object.keys(preferences.notification_preferences)
        })
      }
    }

    // Invalidate cache
    GroupCacheManager.invalidateRecipientCache(recipient.id)

    const successCount = updateResults.filter(r => r.success).length
    const errorCount = updateResults.filter(r => !r.success).length

    return NextResponse.json({
      success: errorCount === 0,
      message: `Updated ${successCount} preference group(s)${errorCount > 0 ? ` with ${errorCount} error(s)` : ''}`,
      update_mode: preferences.update_mode,
      results: updateResults,
      summary: {
        total_updates: updateResults.length,
        successful_updates: successCount,
        failed_updates: errorCount
      }
    })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid preference data', details: error.errors }, { status: 400 })
    }
    logger.errorWithStack('Preference update error:', error as Error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

function arraysEqual(arr1: string[], arr2: string[]): boolean {
  if (arr1.length !== arr2.length) return false
  const sorted1 = [...arr1].sort()
  const sorted2 = [...arr2].sort()
  return sorted1.every((val, i) => val === sorted2[i])
}
