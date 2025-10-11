import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import { createLogger } from '@/lib/logger'
import { z } from 'zod'

const logger = createLogger('DigestScheduleDetailAPI')

const updateSchema = z.object({
  frequency: z.enum(['daily', 'weekly', 'monthly']).optional(),
  delivery_time: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d):([0-5]\d)$/).optional(),
  delivery_day: z.number().int().min(1).max(31).optional(),
  timezone: z.string().optional(),
  max_updates_per_digest: z.number().int().min(1).max(50).optional(),
  include_content_types: z.array(z.string()).optional(),
  is_active: z.boolean().optional(),
  digest_settings: z.record(z.unknown()).optional()
})

/**
 * GET /api/digest-schedules/:scheduleId - Get a specific digest schedule
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { scheduleId: string } }
) {
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

    const scheduleId = params.scheduleId

    // Validate schedule ID
    const uuidSchema = z.string().uuid()
    try {
      uuidSchema.parse(scheduleId)
    } catch {
      return NextResponse.json(
        { error: 'Invalid schedule ID format' },
        { status: 400 }
      )
    }

    // Fetch schedule with authorization check
    const { data: schedule, error: queryError } = await supabase
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
      .eq('id', scheduleId)
      .single()

    if (queryError || !schedule) {
      return NextResponse.json(
        { error: 'Schedule not found' },
        { status: 404 }
      )
    }

    // Check authorization
    if (schedule.recipient.parent_id !== user.id) {
      logger.warn('Unauthorized schedule access', {
        scheduleId,
        userId: user.id
      })
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      )
    }

    return NextResponse.json({
      schedule: {
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
      }
    })

  } catch (error) {
    logger.errorWithStack('Get digest schedule error', error as Error)

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/digest-schedules/:scheduleId - Update a digest schedule
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { scheduleId: string } }
) {
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

    const scheduleId = params.scheduleId

    // Validate schedule ID
    const uuidSchema = z.string().uuid()
    try {
      uuidSchema.parse(scheduleId)
    } catch {
      return NextResponse.json(
        { error: 'Invalid schedule ID format' },
        { status: 400 }
      )
    }

    // Parse and validate request body
    const body = await request.json()
    let validatedData
    try {
      validatedData = updateSchema.parse(body)
    } catch (error) {
      if (error instanceof z.ZodError) {
        return NextResponse.json(
          { error: 'Invalid request data', details: error.errors },
          { status: 400 }
        )
      }
      throw error
    }

    // Fetch existing schedule with authorization check
    const { data: existingSchedule, error: fetchError } = await supabase
      .from('digest_schedules')
      .select(`
        *,
        recipient:recipients!digest_schedules_recipient_id_fkey(parent_id)
      `)
      .eq('id', scheduleId)
      .single()

    if (fetchError || !existingSchedule) {
      return NextResponse.json(
        { error: 'Schedule not found' },
        { status: 404 }
      )
    }

    // Check authorization
    if (existingSchedule.recipient.parent_id !== user.id) {
      logger.warn('Unauthorized schedule update attempt', {
        scheduleId,
        userId: user.id
      })
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      )
    }

    // Update schedule
    const { data: updatedSchedule, error: updateError } = await supabase
      .from('digest_schedules')
      .update({
        ...validatedData,
        updated_at: new Date().toISOString()
      })
      .eq('id', scheduleId)
      .select()
      .single()

    if (updateError) {
      logger.error('Update error', { error: updateError.message })
      throw updateError
    }

    logger.info('Digest schedule updated', {
      scheduleId,
      userId: user.id
    })

    return NextResponse.json({
      success: true,
      schedule: updatedSchedule
    })

  } catch (error) {
    logger.errorWithStack('Update digest schedule error', error as Error)

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/digest-schedules/:scheduleId - Delete a digest schedule
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { scheduleId: string } }
) {
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

    const scheduleId = params.scheduleId

    // Validate schedule ID
    const uuidSchema = z.string().uuid()
    try {
      uuidSchema.parse(scheduleId)
    } catch {
      return NextResponse.json(
        { error: 'Invalid schedule ID format' },
        { status: 400 }
      )
    }

    // Fetch schedule with authorization check
    const { data: schedule, error: fetchError } = await supabase
      .from('digest_schedules')
      .select(`
        *,
        recipient:recipients!digest_schedules_recipient_id_fkey(parent_id)
      `)
      .eq('id', scheduleId)
      .single()

    if (fetchError || !schedule) {
      return NextResponse.json(
        { error: 'Schedule not found' },
        { status: 404 }
      )
    }

    // Check authorization
    if (schedule.recipient.parent_id !== user.id) {
      logger.warn('Unauthorized schedule deletion attempt', {
        scheduleId,
        userId: user.id
      })
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      )
    }

    // Delete schedule
    const { error: deleteError } = await supabase
      .from('digest_schedules')
      .delete()
      .eq('id', scheduleId)

    if (deleteError) {
      logger.error('Delete error', { error: deleteError.message })
      throw deleteError
    }

    logger.info('Digest schedule deleted', {
      scheduleId,
      userId: user.id
    })

    return NextResponse.json({
      success: true,
      message: 'Digest schedule deleted successfully'
    })

  } catch (error) {
    logger.errorWithStack('Delete digest schedule error', error as Error)

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
