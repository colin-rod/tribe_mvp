import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import { GroupCacheManager } from '@/lib/group-cache'
import { createLogger } from '@/lib/logger'
import { z } from 'zod'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/types/database'

const logger = createLogger('BulkPreferencesAPI')

// Schema for bulk preference operations
const bulkPreferenceOperationSchema = z.object({
  operation: z.enum(['update', 'reset', 'copy', 'apply_template']),
  target: z.object({
    type: z.enum(['groups', 'recipients', 'all']),
    ids: z.array(z.string().uuid()).optional(), // Specific group/recipient IDs
    filters: z.object({
      group_type: z.enum(['default', 'custom', 'all']).optional(),
      relationship_type: z.array(z.string()).optional(),
      has_custom_settings: z.boolean().optional(),
      last_activity: z.string().optional() // ISO date
    }).optional()
  }),
  settings: z.object({
    notification_frequency: z.enum(['every_update', 'daily_digest', 'weekly_digest', 'milestones_only']).optional(),
    preferred_channels: z.array(z.enum(['email', 'sms', 'whatsapp'])).optional(),
    content_types: z.array(z.enum(['photos', 'text', 'milestones'])).optional(),
    quiet_hours: z.object({
      start: z.string().regex(/^\d{2}:\d{2}$/),
      end: z.string().regex(/^\d{2}:\d{2}$/)
    }).optional()
  }).optional(),
  template_id: z.string().uuid().optional(), // For apply_template operation
  source_group_id: z.string().uuid().optional(), // For copy operation
  preserve_custom_overrides: z.boolean().default(true),
  send_notifications: z.boolean().default(false)
})

const bulkPreferenceQuerySchema = z.object({
  group_ids: z.array(z.string().uuid()).optional(),
  recipient_ids: z.array(z.string().uuid()).optional(),
  include_inactive: z.boolean().default(false),
  group_type: z.enum(['default', 'custom', 'all']).default('all'),
  settings_summary: z.boolean().default(false)
})

type BulkPreferenceOperation = z.infer<typeof bulkPreferenceOperationSchema>
type BulkPreferenceTarget = BulkPreferenceOperation['target']
type BulkPreferenceSettings = NonNullable<BulkPreferenceOperation['settings']>
type BulkPreferenceQuery = z.infer<typeof bulkPreferenceQuerySchema>
type SupabaseServerClient = SupabaseClient<Database>
type TargetGroup = {
  id: string
  name: string
  is_default_group: boolean
}
type TargetRecipient = {
  recipient_id: string
  group_id: string
  notification_frequency: string | null
  preferred_channels: string[] | null
  content_types: string[] | null
}
type OperationResult = {
  recipient_id: string
  group_id: string
  success: boolean
  updates_applied?: string[]
  skipped_reason?: string | null
  error?: string
  action?: string
}

/**
 * GET /api/preferences/bulk - Get bulk preference information
 */
export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const url = new URL(request.url)
    const queryParams = Object.fromEntries(url.searchParams.entries())

    // Parse array parameters
    const parsedParams = {
      ...queryParams,
      group_ids: queryParams.group_ids ? queryParams.group_ids.split(',') : undefined,
      recipient_ids: queryParams.recipient_ids ? queryParams.recipient_ids.split(',') : undefined
    }

    const validatedQuery: BulkPreferenceQuery = bulkPreferenceQuerySchema.parse(parsedParams)

    // Base query for groups
    let groupQuery = supabase
      .from('recipient_groups')
      .select(`
        id,
        name,
        default_frequency,
        default_channels,
        notification_settings,
        is_default_group,
        created_at,
        updated_at
      `)
      .eq('parent_id', user.id)

    // Apply group filters
    if (validatedQuery.group_ids && validatedQuery.group_ids.length > 0) {
      groupQuery = groupQuery.in('id', validatedQuery.group_ids)
    }

    if (validatedQuery.group_type !== 'all') {
      groupQuery = groupQuery.eq('is_default_group', validatedQuery.group_type === 'default')
    }

    const { data: groups, error: groupsError } = await groupQuery

    if (groupsError) {
      logger.errorWithStack('Error fetching groups:', groupsError as Error)
      return NextResponse.json({ error: 'Failed to fetch groups' }, { status: 500 })
    }

    // Get membership information
    const groupIds = groups?.map(g => g.id) || []
    const membershipQuery = supabase
      .from('group_memberships')
      .select(`
        group_id,
        recipient_id,
        notification_frequency,
        preferred_channels,
        content_types,
        role,
        is_active,
        recipients!inner(
          id,
          name,
          email,
          relationship,
          is_active
        )
      `)
      .in('group_id', groupIds)

    if (!validatedQuery.include_inactive) {
      membershipQuery.eq('is_active', true)
    }

    if (validatedQuery.recipient_ids && validatedQuery.recipient_ids.length > 0) {
      membershipQuery.in('recipient_id', validatedQuery.recipient_ids)
    }

    const { data: memberships, error: membershipsError } = await membershipQuery

    if (membershipsError) {
      logger.errorWithStack('Error fetching memberships:', membershipsError as Error)
      return NextResponse.json({ error: 'Failed to fetch memberships' }, { status: 500 })
    }

    // Organize data
    const groupsWithMembers = groups?.map(group => {
      const groupMemberships = memberships?.filter(m => m.group_id === group.id) || []

      return {
        ...group,
        member_count: groupMemberships.length,
        members_with_custom_settings: groupMemberships.filter(m =>
          m.notification_frequency || m.preferred_channels || m.content_types
        ).length,
        members: groupMemberships.map(m => ({
          ...m,
          recipient: m.recipients
        }))
      }
    }) || []

    // Generate summary if requested
    let summary: Record<string, unknown> = {}
    if (validatedQuery.settings_summary) {
      const allMemberships = memberships || []
      const frequencyDistribution = new Map<string, number>()
      const channelDistribution = new Map<string, number>()

      allMemberships.forEach(m => {
        const freq = m.notification_frequency || 'default'
        frequencyDistribution.set(freq, (frequencyDistribution.get(freq) || 0) + 1)

        if (m.preferred_channels) {
          m.preferred_channels.forEach((channel: string) => {
            channelDistribution.set(channel, (channelDistribution.get(channel) || 0) + 1)
          })
        }
      })

      summary = {
        total_groups: groupsWithMembers.length,
        total_recipients: allMemberships.length,
        recipients_with_custom_settings: allMemberships.filter(m =>
          m.notification_frequency || m.preferred_channels || m.content_types
        ).length,
        frequency_distribution: Array.from(frequencyDistribution.entries()).map(([freq, count]) => ({
          frequency: freq,
          count
        })),
        channel_distribution: Array.from(channelDistribution.entries()).map(([channel, count]) => ({
          channel,
          count
        }))
      }
    }

    return NextResponse.json({
      groups: groupsWithMembers,
      summary,
      total_count: groupsWithMembers.length
    })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid query parameters', details: error.errors },
        { status: 400 }
      )
    }

    logger.errorWithStack('Error fetching bulk preferences:', error as Error)
    return NextResponse.json(
      { error: 'Failed to fetch bulk preferences' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/preferences/bulk - Execute bulk preference operations
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const validatedData: BulkPreferenceOperation = bulkPreferenceOperationSchema.parse(body)

    // Get target groups/recipients based on filters
    const targetGroups = await getTargetGroups(supabase, user.id, validatedData.target)
    const targetRecipients = await getTargetRecipients(supabase, user.id, validatedData.target, targetGroups)

    let results: OperationResult[] = []
    let successCount = 0
    let errorCount = 0

    // Execute the operation
    switch (validatedData.operation) {
      case 'update':
        const updateResults = await executeUpdateOperation(
          supabase,
          targetRecipients,
          validatedData.settings!,
          validatedData.preserve_custom_overrides
        )
        results = updateResults.results
        successCount = updateResults.successCount
        errorCount = updateResults.errorCount
        break

      case 'reset':
        const resetResults = await executeResetOperation(supabase, targetRecipients)
        results = resetResults.results
        successCount = resetResults.successCount
        errorCount = resetResults.errorCount
        break

      case 'copy':
        if (!validatedData.source_group_id) {
          return NextResponse.json(
            { error: 'source_group_id required for copy operation' },
            { status: 400 }
          )
        }
        const copyResults = await executeCopyOperation(
          supabase,
          user.id,
          validatedData.source_group_id,
          targetRecipients,
          validatedData.preserve_custom_overrides
        )
        results = copyResults.results
        successCount = copyResults.successCount
        errorCount = copyResults.errorCount
        break

      case 'apply_template':
        if (!validatedData.template_id) {
          return NextResponse.json(
            { error: 'template_id required for apply_template operation' },
            { status: 400 }
          )
        }
        const templateResults = await executeTemplateOperation(
          supabase,
          user.id,
          validatedData.template_id,
          targetRecipients
        )
        results = templateResults.results
        successCount = templateResults.successCount
        errorCount = templateResults.errorCount
        break
    }

    // Invalidate caches
    GroupCacheManager.invalidateUserCache(user.id)
    targetRecipients.forEach(recipient => {
      GroupCacheManager.invalidateRecipientCache(recipient.recipient_id)
    })

    // Send notifications if requested
    if (validatedData.send_notifications && successCount > 0) {
      // This would integrate with your notification system
      logger.info(`Bulk operation completed. ${successCount} recipients updated.`)
    }

    const statusCode = errorCount === 0 ? 200 : (successCount === 0 ? 500 : 207)

    return NextResponse.json({
      message: `Bulk ${validatedData.operation} operation completed`,
      operation: validatedData.operation,
      target_count: targetRecipients.length,
      success_count: successCount,
      error_count: errorCount,
      results
    }, { status: statusCode })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input data', details: error.errors },
        { status: 400 }
      )
    }

    logger.errorWithStack('Error executing bulk operation:', error as Error)
    return NextResponse.json(
      { error: 'Failed to execute bulk operation' },
      { status: 500 }
    )
  }
}

// Helper functions

async function getTargetGroups(
  supabase: SupabaseServerClient,
  userId: string,
  target: BulkPreferenceTarget
): Promise<TargetGroup[]> {
  let groupQuery = supabase
    .from('recipient_groups')
    .select('id, name, is_default_group')
    .eq('parent_id', userId)

  if (target.type === 'groups' && target.ids) {
    groupQuery = groupQuery.in('id', target.ids)
  }

  if (target.filters?.group_type && target.filters.group_type !== 'all') {
    groupQuery = groupQuery.eq('is_default_group', target.filters.group_type === 'default')
  }

  const { data: groups } = await groupQuery
  return (groups as TargetGroup[]) || []
}

async function getTargetRecipients(
  supabase: SupabaseServerClient,
  userId: string,
  target: BulkPreferenceTarget,
  targetGroups: TargetGroup[]
): Promise<TargetRecipient[]> {
  let membershipQuery = supabase
    .from('group_memberships')
    .select(`
      recipient_id,
      group_id,
      notification_frequency,
      preferred_channels,
      content_types,
      recipients!inner(
        id,
        name,
        relationship,
        parent_id,
        last_seen_at
      )
    `)
    .eq('is_active', true)

  // Filter by target type
  if (target.type === 'recipients' && target.ids) {
    membershipQuery = membershipQuery.in('recipient_id', target.ids)
  } else if (target.type === 'groups') {
    membershipQuery = membershipQuery.in('group_id', targetGroups.map(g => g.id))
  }

  // Apply additional filters
  if (target.filters?.relationship_type) {
    membershipQuery = membershipQuery.in('recipients.relationship', target.filters.relationship_type)
  }

  if (target.filters?.has_custom_settings !== undefined) {
    if (target.filters.has_custom_settings) {
      membershipQuery = membershipQuery.or('notification_frequency.not.is.null,preferred_channels.not.is.null,content_types.not.is.null')
    } else {
      membershipQuery = membershipQuery.is('notification_frequency', null)
        .is('preferred_channels', null)
        .is('content_types', null)
    }
  }

  // Ensure recipient belongs to the authenticated user
  membershipQuery = membershipQuery.eq('recipients.parent_id', userId)

  const { data: memberships } = await membershipQuery
  return (memberships as TargetRecipient[]) || []
}

async function executeUpdateOperation(
  supabase: SupabaseServerClient,
  targetRecipients: TargetRecipient[],
  settings: BulkPreferenceSettings,
  preserveCustomOverrides: boolean
) {
  const results: OperationResult[] = []
  let successCount = 0
  let errorCount = 0

  for (const recipient of targetRecipients) {
    try {
      const updateData: {
        notification_frequency?: typeof settings.notification_frequency
        preferred_channels?: typeof settings.preferred_channels
        content_types?: typeof settings.content_types
      } = {}

      // Only update if preserveCustomOverrides is false or recipient doesn't have custom settings
      const hasCustomSettings = recipient.notification_frequency ||
                               recipient.preferred_channels ||
                               recipient.content_types

      if (!preserveCustomOverrides || !hasCustomSettings) {
        if (settings.notification_frequency) updateData.notification_frequency = settings.notification_frequency
        if (settings.preferred_channels) updateData.preferred_channels = settings.preferred_channels
        if (settings.content_types) updateData.content_types = settings.content_types
      }

      if (Object.keys(updateData).length > 0) {
        const { error } = await (supabase as any)
          .from('group_memberships')
          .update(updateData)
          .eq('recipient_id', recipient.recipient_id)
          .eq('group_id', recipient.group_id)

        if (error) throw error
      }

      results.push({
        recipient_id: recipient.recipient_id,
        group_id: recipient.group_id,
        success: true,
        updates_applied: Object.keys(updateData),
        skipped_reason: preserveCustomOverrides && hasCustomSettings ? 'has_custom_settings' : null
      })
      successCount++
    } catch (error) {
      results.push({
        recipient_id: recipient.recipient_id,
        group_id: recipient.group_id,
        success: false,
        error: (error as Error).message
      })
      errorCount++
    }
  }

  return { results, successCount, errorCount }
}

async function executeResetOperation(
  supabase: SupabaseServerClient,
  targetRecipients: TargetRecipient[]
) {
  const results: OperationResult[] = []
  let successCount = 0
  let errorCount = 0

  for (const recipient of targetRecipients) {
    try {
      const { error } = await (supabase as any)
        .from('group_memberships')
        .update({
          notification_frequency: null,
          preferred_channels: null,
          content_types: null
        })
        .eq('recipient_id', recipient.recipient_id)
        .eq('group_id', recipient.group_id)

      if (error) throw error

      results.push({
        recipient_id: recipient.recipient_id,
        group_id: recipient.group_id,
        success: true,
        action: 'reset_to_group_defaults'
      })
      successCount++
    } catch (error) {
      results.push({
        recipient_id: recipient.recipient_id,
        group_id: recipient.group_id,
        success: false,
        error: (error as Error).message
      })
      errorCount++
    }
  }

  return { results, successCount, errorCount }
}

async function executeCopyOperation(
  supabase: SupabaseServerClient,
  userId: string,
  sourceGroupId: string,
  targetRecipients: TargetRecipient[],
  preserveCustomOverrides: boolean
) {
  // Get source group settings
  const { data: sourceGroup } = await supabase
    .from('recipient_groups')
    .select('default_frequency, default_channels, notification_settings')
    .eq('id', sourceGroupId)
    .eq('parent_id', userId)
    .single()

  if (!sourceGroup) {
    throw new Error('Source group not found or access denied')
  }

  const settings: BulkPreferenceSettings = {
    notification_frequency: (sourceGroup as any)?.default_frequency,
    preferred_channels: (sourceGroup as any)?.default_channels,
    content_types: (sourceGroup as any)?.notification_settings?.content_types || ['photos', 'text', 'milestones']
  }

  return executeUpdateOperation(supabase, targetRecipients, settings, preserveCustomOverrides)
}

async function executeTemplateOperation(
  _supabase: SupabaseServerClient,
  _userId: string,
  templateId: string,
  _targetRecipients: TargetRecipient[]
) {
  // This would integrate with your template system
  // For now, return a placeholder implementation
  const results: OperationResult[] = []
  const successCount = 0
  const errorCount = 0

  // Template functionality would go here
  logger.info(`Template operation requested for template ${templateId}`)

  return { results, successCount, errorCount }
}
