import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import { getRecipientGroups, updateRecipientGroupSettings } from '@/lib/group-management'
import { recipientGroupSettingsSchema } from '@/lib/group-security-validator'
import { validateRecipientTokenAccess } from '@/middleware/group-security'
import { GroupCacheManager } from '@/lib/group-cache'
import { createLogger } from '@/lib/logger'
import { z } from 'zod'

const logger = createLogger('RecipientGroupsAPI')

/**
 * GET /api/recipients/[token]/groups - Get all groups for recipient
 */
export async function GET(
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

    // Set token in session for RLS policies
    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)
    // @ts-expect-error - Supabase RPC type inference issue
    await supabase.rpc('set_config', {
      parameter: 'app.preference_token',
      value: token
    })

    // Get recipient's group memberships
    const groups = await getRecipientGroups(token)

    // Group information for better UX
    const groupsByType = {
      default_groups: groups.filter(g => g.group_name.match(/^(Close Family|Extended Family|Friends)$/)),
      custom_groups: groups.filter(g => !g.group_name.match(/^(Close Family|Extended Family|Friends)$/))
    }

    return NextResponse.json({
      groups,
      summary: {
        total_groups: groups.length,
        default_groups: groupsByType.default_groups.length,
        custom_groups: groupsByType.custom_groups.length,
        groups_with_custom_settings: groups.filter(g =>
          g.member_frequency ||
          g.member_preferred_channels ||
          g.member_content_types
        ).length
      },
      grouped: groupsByType
    })

  } catch (error) {
    logger.errorWithStack('Error fetching recipient groups:', error as Error)
    return NextResponse.json(
      { error: 'Failed to fetch groups' },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/recipients/[token]/groups - Update recipient's group settings
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

    // Validate input - expecting array of group setting updates
    const updateSchema = z.array(recipientGroupSettingsSchema)
    const validatedUpdates = updateSchema.parse(body.group_settings || [])

    if (validatedUpdates.length === 0) {
      return NextResponse.json(
        { error: 'No group settings provided' },
        { status: 400 }
      )
    }

    // Verify all groups belong to the recipient
    const recipientGroups = await getRecipientGroups(token)
    const recipientGroupIds = recipientGroups.map(g => g.group_id)

    const invalidGroups = validatedUpdates.filter(update =>
      !recipientGroupIds.includes(update.group_id)
    )

    if (invalidGroups.length > 0) {
      return NextResponse.json(
        { error: 'Some groups do not belong to this recipient' },
        { status: 400 }
      )
    }

    // Apply updates
    const results = []
    let successCount = 0
    let errorCount = 0

    for (const update of validatedUpdates) {
      try {
        const success = await updateRecipientGroupSettings(
          token,
          update.group_id,
          {
            frequency: update.frequency,
            preferred_channels: update.preferred_channels,
            content_types: update.content_types
          }
        )

        results.push({
          group_id: update.group_id,
          success,
          error: null
        })

        if (success) successCount++
      } catch (error) {
        results.push({
          group_id: update.group_id,
          success: false,
          error: (error as Error).message
        })
        errorCount++
      }
    }

    // Invalidate recipient cache
    GroupCacheManager.invalidateRecipientCache(securityContext.recipient_id)

    const statusCode = errorCount === 0 ? 200 : (successCount === 0 ? 500 : 207) // 207 = Multi-Status

    return NextResponse.json({
      message: `Updated ${successCount} of ${validatedUpdates.length} group settings`,
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

    logger.errorWithStack('Error updating recipient group settings:', error as Error)
    return NextResponse.json(
      { error: 'Failed to update group settings' },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/recipients/[token]/groups - Bulk update settings across all groups
 */
export async function PATCH(
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

    // Validate bulk update settings
    const bulkUpdateSchema = z.object({
      frequency: z.enum(['every_update', 'daily_digest', 'weekly_digest', 'milestones_only']).optional(),
      preferred_channels: z.array(z.enum(['email', 'sms', 'whatsapp'])).optional(),
      content_types: z.array(z.enum(['photos', 'text', 'milestones'])).optional(),
      apply_to_groups: z.array(z.string().uuid()).optional() // If not provided, applies to all groups
    })

    const validatedData = bulkUpdateSchema.parse(body)

    // Get recipient's groups
    const recipientGroups = await getRecipientGroups(token)

    const groupsWithIds = recipientGroups.filter(
      (group): group is typeof group & { group_id: string } => typeof group.group_id === 'string'
    )

    // Determine which groups to update
    const targetGroups = validatedData.apply_to_groups
      ? groupsWithIds.filter(g => validatedData.apply_to_groups!.includes(g.group_id))
      : groupsWithIds

    if (targetGroups.length === 0) {
      return NextResponse.json(
        { error: 'No valid groups found to update' },
        { status: 400 }
      )
    }

    // Apply bulk updates
    const results = []
    let successCount = 0

    for (const group of targetGroups) {
      try {
        const success = await updateRecipientGroupSettings(
          token,
          group.group_id,
          {
            frequency: validatedData.frequency,
            preferred_channels: validatedData.preferred_channels,
            content_types: validatedData.content_types
          }
        )

        results.push({
          group_id: group.group_id,
          group_name: group.group_name,
          success
        })

        if (success) successCount++
      } catch (error) {
        results.push({
          group_id: group.group_id,
          group_name: group.group_name,
          success: false,
          error: (error as Error).message
        })
      }
    }

    // Invalidate cache
    GroupCacheManager.invalidateRecipientCache(securityContext.recipient_id)

    return NextResponse.json({
      message: `Bulk updated settings for ${successCount} of ${targetGroups.length} groups`,
      success_count: successCount,
      total_groups: targetGroups.length,
      results
    })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input data', details: error.errors },
        { status: 400 }
      )
    }

    logger.errorWithStack('Error bulk updating recipient group settings:', error as Error)
    return NextResponse.json(
      { error: 'Failed to bulk update group settings' },
      { status: 500 }
    )
  }
}
