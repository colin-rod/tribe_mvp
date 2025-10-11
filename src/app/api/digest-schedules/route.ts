import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import { createLogger } from '@/lib/logger'
import { z } from 'zod'

const logger = createLogger('DigestSchedulesAPI')

// Schema for creating/updating digest schedules
const digestScheduleSchema = z.object({
  recipient_id: z.string().uuid(),
  group_id: z.string().uuid(),
  frequency: z.enum(['daily', 'weekly', 'monthly']),
  delivery_time: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d):([0-5]\d)$/), // HH:MM:SS
  delivery_day: z.number().int().min(1).max(31).optional(), // Day of week (1-7) or month (1-31)
  timezone: z.string().default('UTC'),
  max_updates_per_digest: z.number().int().min(1).max(50).default(10),
  include_content_types: z.array(z.string()).default(['photos', 'text', 'milestones']),
  is_active: z.boolean().default(true),
  digest_settings: z.record(z.unknown()).optional()
})

const querySchema = z.object({
  recipient_id: z.string().uuid().optional(),
  group_id: z.string().uuid().optional(),
  frequency: z.enum(['daily', 'weekly', 'monthly']).optional(),
  is_active: z.coerce.boolean().optional()
})

/**
 * GET /api/digest-schedules - List digest schedules for authenticated user
 *
 * Query parameters:
 * - recipient_id: Filter by recipient
 * - group_id: Filter by group
 * - frequency: Filter by frequency (daily, weekly, monthly)
 * - is_active: Filter by active status
 */
export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)

    // Authenticate user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams
    const queryParams = {
      recipient_id: searchParams.get('recipient_id'),
      group_id: searchParams.get('group_id'),
      frequency: searchParams.get('frequency'),
      is_active: searchParams.get('is_active')
    }

    let validatedQuery
    try {
      validatedQuery = querySchema.parse(queryParams)
    } catch (error) {
      if (error instanceof z.ZodError) {
        return NextResponse.json(
          { error: 'Invalid query parameters', details: error.errors },
          { status: 400 }
        )
      }
      throw error
    }

    // Build query with authorization
    let query = supabase
      .from('digest_schedules')
      .select(`
        *,
        recipient:recipients!digest_schedules_recipient_id_fkey(
          id,
          name,
          email,
          relationship,
          parent_id
        ),
        group:recipient_groups!digest_schedules_group_id_fkey(
          id,
          name
        )
      `)
      .eq('recipient.parent_id', user.id) // Authorization: only user's recipients

    // Apply filters
    if (validatedQuery.recipient_id) {
      query = query.eq('recipient_id', validatedQuery.recipient_id)
    }
    if (validatedQuery.group_id) {
      query = query.eq('group_id', validatedQuery.group_id)
    }
    if (validatedQuery.frequency) {
      query = query.eq('frequency', validatedQuery.frequency)
    }
    if (validatedQuery.is_active !== undefined) {
      query = query.eq('is_active', validatedQuery.is_active)
    }

    const { data: schedules, error: queryError } = await query
      .order('created_at', { ascending: false })

    if (queryError) {
      logger.error('Query error', { error: queryError.message })
      throw queryError
    }

    // Transform response
    const transformedSchedules = (schedules || []).map(schedule => ({
      id: schedule.id,
      recipient_id: schedule.recipient_id,
      group_id: schedule.group_id,
      frequency: schedule.frequency,
      delivery_time: schedule.delivery_time,
      delivery_day: schedule.delivery_day,
      timezone: schedule.timezone,
      max_updates_per_digest: schedule.max_updates_per_digest,
      include_content_types: schedule.include_content_types,
      is_active: schedule.is_active,
      last_digest_sent: schedule.last_digest_sent,
      next_digest_scheduled: schedule.next_digest_scheduled,
      digest_settings: schedule.digest_settings,
      created_at: schedule.created_at,
      updated_at: schedule.updated_at,
      recipient: {
        id: schedule.recipient.id,
        name: schedule.recipient.name,
        relationship: schedule.recipient.relationship
      },
      group: {
        id: schedule.group.id,
        name: schedule.group.name
      }
    }))

    return NextResponse.json({
      schedules: transformedSchedules,
      total: transformedSchedules.length
    })

  } catch (error) {
    logger.errorWithStack('Digest schedules list error', error as Error)

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/digest-schedules - Create a new digest schedule
 */
export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)

    // Authenticate user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Parse and validate request body
    const body = await request.json()
    let validatedData
    try {
      validatedData = digestScheduleSchema.parse(body)
    } catch (error) {
      if (error instanceof z.ZodError) {
        return NextResponse.json(
          { error: 'Invalid request data', details: error.errors },
          { status: 400 }
        )
      }
      throw error
    }

    // Verify recipient belongs to user
    const { data: recipient, error: recipientError } = await supabase
      .from('recipients')
      .select('parent_id')
      .eq('id', validatedData.recipient_id)
      .single()

    if (recipientError || !recipient || recipient.parent_id !== user.id) {
      return NextResponse.json(
        { error: 'Recipient not found or unauthorized' },
        { status: 403 }
      )
    }

    // Verify group belongs to user
    const { data: group, error: groupError } = await supabase
      .from('recipient_groups')
      .select('parent_id')
      .eq('id', validatedData.group_id)
      .single()

    if (groupError || !group || group.parent_id !== user.id) {
      return NextResponse.json(
        { error: 'Group not found or unauthorized' },
        { status: 403 }
      )
    }

    // Calculate next scheduled time based on frequency
    const now = new Date()
    const [hours, minutes, seconds] = validatedData.delivery_time.split(':').map(Number)
    // eslint-disable-next-line prefer-const
    let nextScheduled = new Date()
    nextScheduled.setHours(hours, minutes, seconds, 0)

    if (validatedData.frequency === 'daily') {
      // If time already passed today, schedule for tomorrow
      if (nextScheduled <= now) {
        nextScheduled.setDate(nextScheduled.getDate() + 1)
      }
    } else if (validatedData.frequency === 'weekly') {
      // Schedule for next occurrence of delivery_day
      const targetDay = validatedData.delivery_day || 1 // Default Monday
      const currentDay = nextScheduled.getDay() || 7 // Sunday = 7
      let daysUntilTarget = targetDay - currentDay
      if (daysUntilTarget <= 0 || (daysUntilTarget === 0 && nextScheduled <= now)) {
        daysUntilTarget += 7
      }
      nextScheduled.setDate(nextScheduled.getDate() + daysUntilTarget)
    } else if (validatedData.frequency === 'monthly') {
      // Schedule for next occurrence of delivery_day in month
      const targetDay = validatedData.delivery_day || 1
      nextScheduled.setDate(targetDay)
      if (nextScheduled <= now) {
        nextScheduled.setMonth(nextScheduled.getMonth() + 1)
      }
    }

    // Create digest schedule
    const { data: schedule, error: insertError } = await supabase
      .from('digest_schedules')
      .insert({
        recipient_id: validatedData.recipient_id,
        group_id: validatedData.group_id,
        frequency: validatedData.frequency,
        delivery_time: validatedData.delivery_time,
        delivery_day: validatedData.delivery_day,
        timezone: validatedData.timezone,
        max_updates_per_digest: validatedData.max_updates_per_digest,
        include_content_types: validatedData.include_content_types,
        is_active: validatedData.is_active,
        next_digest_scheduled: nextScheduled.toISOString(),
        digest_settings: validatedData.digest_settings || {}
      })
      .select()
      .single()

    if (insertError) {
      logger.error('Insert error', { error: insertError.message })

      // Handle unique constraint violation
      if (insertError.code === '23505') {
        return NextResponse.json(
          { error: 'Digest schedule already exists for this recipient, group, and frequency' },
          { status: 409 }
        )
      }

      throw insertError
    }

    logger.info('Digest schedule created', {
      scheduleId: schedule.id,
      recipientId: validatedData.recipient_id,
      frequency: validatedData.frequency
    })

    return NextResponse.json({
      success: true,
      schedule
    }, { status: 201 })

  } catch (error) {
    logger.errorWithStack('Create digest schedule error', error as Error)

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
