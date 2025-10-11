import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import { createLogger } from '@/lib/logger'
import { z } from 'zod'

const logger = createLogger('JobsListAPI')

// Query parameters schema
const querySchema = z.object({
  status: z.enum(['pending', 'processing', 'sent', 'failed', 'skipped', 'cancelled']).optional(),
  delivery_method: z.enum(['email', 'sms', 'whatsapp', 'push']).optional(),
  notification_type: z.enum(['immediate', 'digest', 'milestone']).optional(),
  recipient_id: z.string().uuid().optional(),
  group_id: z.string().uuid().optional(),
  limit: z.coerce.number().min(1).max(100).default(20),
  offset: z.coerce.number().min(0).default(0),
  sort_by: z.enum(['created_at', 'scheduled_for', 'processed_at', 'status']).default('created_at'),
  sort_order: z.enum(['asc', 'desc']).default('desc')
})

/**
 * GET /api/jobs - List notification jobs with filtering and pagination
 *
 * Query parameters:
 * - status: Filter by job status
 * - delivery_method: Filter by delivery method
 * - notification_type: Filter by notification type
 * - recipient_id: Filter by recipient
 * - group_id: Filter by group
 * - limit: Number of results (1-100, default 20)
 * - offset: Pagination offset (default 0)
 * - sort_by: Sort field (default: created_at)
 * - sort_order: Sort direction (asc/desc, default: desc)
 *
 * Authorization: Only returns jobs for recipients owned by the authenticated user
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

    // Parse and validate query parameters
    const searchParams = request.nextUrl.searchParams
    const queryParams = {
      status: searchParams.get('status'),
      delivery_method: searchParams.get('delivery_method'),
      notification_type: searchParams.get('notification_type'),
      recipient_id: searchParams.get('recipient_id'),
      group_id: searchParams.get('group_id'),
      limit: searchParams.get('limit') || '20',
      offset: searchParams.get('offset') || '0',
      sort_by: searchParams.get('sort_by') || 'created_at',
      sort_order: searchParams.get('sort_order') || 'desc'
    }

    let validatedParams
    try {
      validatedParams = querySchema.parse(queryParams)
    } catch (error) {
      if (error instanceof z.ZodError) {
        return NextResponse.json(
          { error: 'Invalid query parameters', details: error.errors },
          { status: 400 }
        )
      }
      throw error
    }

    // Build query with authorization filter
    let query = supabase
      .from('notification_jobs')
      .select(`
        *,
        recipient:recipients!notification_jobs_recipient_id_fkey(
          id,
          name,
          email,
          relationship,
          parent_id
        ),
        group:recipient_groups!notification_jobs_group_id_fkey(
          id,
          name
        )
      `, { count: 'exact' })
      .eq('recipient.parent_id', user.id) // Authorization: only user's recipients

    // Apply filters
    if (validatedParams.status) {
      query = query.eq('status', validatedParams.status)
    }
    if (validatedParams.delivery_method) {
      query = query.eq('delivery_method', validatedParams.delivery_method)
    }
    if (validatedParams.notification_type) {
      query = query.eq('notification_type', validatedParams.notification_type)
    }
    if (validatedParams.recipient_id) {
      query = query.eq('recipient_id', validatedParams.recipient_id)
    }
    if (validatedParams.group_id) {
      query = query.eq('group_id', validatedParams.group_id)
    }

    // Apply sorting
    const ascending = validatedParams.sort_order === 'asc'
    query = query.order(validatedParams.sort_by, { ascending })

    // Apply pagination
    query = query.range(
      validatedParams.offset,
      validatedParams.offset + validatedParams.limit - 1
    )

    // Execute query
    const { data: jobs, error: queryError, count } = await query

    if (queryError) {
      logger.error('Query error', { error: queryError.message })
      throw queryError
    }

    // Transform response
    const transformedJobs = (jobs || []).map(job => {
      // Calculate processing time if completed
      let processingTimeMs: number | null = null
      if (job.processed_at && job.created_at) {
        const created = new Date(job.created_at).getTime()
        const processed = new Date(job.processed_at).getTime()
        processingTimeMs = processed - created
      }

      // Calculate time until scheduled
      let timeUntilScheduledMs: number | null = null
      if (!job.processed_at && job.scheduled_for) {
        const now = Date.now()
        const scheduled = new Date(job.scheduled_for).getTime()
        timeUntilScheduledMs = Math.max(0, scheduled - now)
      }

      return {
        id: job.id,
        status: job.status,
        notification_type: job.notification_type,
        urgency_level: job.urgency_level,
        delivery_method: job.delivery_method,
        scheduled_for: job.scheduled_for,
        processed_at: job.processed_at,
        created_at: job.created_at,
        retry_count: job.retry_count,
        max_retries: job.max_retries,
        message_id: job.message_id,
        failure_reason: job.failure_reason,
        processing_time_ms: processingTimeMs,
        time_until_scheduled_ms: timeUntilScheduledMs,
        is_overdue: job.status === 'pending' && timeUntilScheduledMs !== null && timeUntilScheduledMs === 0,
        recipient: {
          id: job.recipient.id,
          name: job.recipient.name,
          relationship: job.recipient.relationship
        },
        group: job.group ? {
          id: job.group.id,
          name: job.group.name
        } : null
      }
    })

    return NextResponse.json({
      jobs: transformedJobs,
      pagination: {
        total: count || 0,
        limit: validatedParams.limit,
        offset: validatedParams.offset,
        has_more: (count || 0) > validatedParams.offset + validatedParams.limit
      },
      filters: {
        status: validatedParams.status,
        delivery_method: validatedParams.delivery_method,
        notification_type: validatedParams.notification_type,
        recipient_id: validatedParams.recipient_id,
        group_id: validatedParams.group_id
      },
      sort: {
        by: validatedParams.sort_by,
        order: validatedParams.sort_order
      }
    })

  } catch (error) {
    logger.errorWithStack('Jobs list API error', error as Error)

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
