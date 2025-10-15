import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import { createLogger } from '@/lib/logger'
import { z } from 'zod'
import { normalizePaginationParams } from '@/lib/utils/pagination'

const logger = createLogger('JobsListAPI')

// Helper function to transform job data
function transformJob(job: Record<string, unknown>) {
  // Calculate processing time if completed
  let processingTimeMs: number | null = null
  if (job.processed_at && job.created_at) {
    const created = new Date(job.processed_at as string).getTime()
    const processed = new Date(job.created_at as string).getTime()
    processingTimeMs = processed - created
  }

  // Calculate time until scheduled
  let timeUntilScheduledMs: number | null = null
  if (!job.processed_at && job.scheduled_for) {
    const now = Date.now()
    const scheduled = new Date(job.scheduled_for as string).getTime()
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
    recipient: job.recipient ? {
      id: (job.recipient as Record<string, unknown>).id,
      name: (job.recipient as Record<string, unknown>).name || job.recipient_name,
      relationship: (job.recipient as Record<string, unknown>).relationship
    } : {
      id: job.recipient_id,
      name: job.recipient_name,
      relationship: null
    },
    group: job.group ? {
      id: (job.group as Record<string, unknown>).id,
      name: (job.group as Record<string, unknown>).name || job.group_name
    } : job.group_id ? {
      id: job.group_id,
      name: job.group_name
    } : null
  }
}

// Query parameters schema
const querySchema = z.object({
  status: z.enum(['pending', 'processing', 'sent', 'failed', 'skipped', 'cancelled']).optional(),
  delivery_method: z.enum(['email', 'sms', 'whatsapp', 'push']).optional(),
  notification_type: z.enum(['immediate', 'digest', 'milestone']).optional(),
  recipient_id: z.string().uuid().optional(),
  group_id: z.string().uuid().optional(),
  limit: z.coerce.number().min(1).max(100).default(20),
  offset: z.coerce.number().min(0).default(0), // Deprecated - use cursor instead
  cursor: z.string().optional(), // Base64-encoded cursor for pagination
  sort_by: z.enum(['created_at', 'scheduled_for', 'processed_at', 'status']).default('created_at'),
  sort_order: z.enum(['asc', 'desc']).default('desc')
})

/**
 * GET /api/jobs - List notification jobs with filtering and pagination
 * CRO-123: Now supports cursor-based pagination for efficient deep pagination
 *
 * Query parameters:
 * - status: Filter by job status
 * - delivery_method: Filter by delivery method
 * - notification_type: Filter by notification type
 * - recipient_id: Filter by recipient
 * - group_id: Filter by group
 * - limit: Number of results (1-100, default 20)
 * - cursor: Base64-encoded cursor for pagination (preferred over offset)
 * - offset: Pagination offset (default 0, deprecated - use cursor instead)
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
      cursor: searchParams.get('cursor'),
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

    // Normalize pagination parameters
    const paginationParams = normalizePaginationParams({
      limit: validatedParams.limit,
      offset: validatedParams.offset,
      cursor: validatedParams.cursor
    })

    // Use cursor-based RPC function if cursor provided
    if (paginationParams.cursor && validatedParams.sort_by === 'created_at') {
      // Use cursor-based function for created_at sorting
      // @ts-expect-error - New cursor function not yet in generated types (requires migration)
      const { data: jobs, error: queryError } = await supabase.rpc('get_notification_jobs_cursor' as 'analyze_content_formats', {
        p_parent_id: user.id,
        p_status: validatedParams.status || null,
        p_delivery_method: validatedParams.delivery_method || null,
        p_notification_type: validatedParams.notification_type || null,
        p_recipient_id: validatedParams.recipient_id || null,
        p_group_id: validatedParams.group_id || null,
        p_limit: paginationParams.limit + 1, // Fetch one extra to check hasMore
        p_sort_by: validatedParams.sort_by,
        p_cursor_timestamp: paginationParams.cursor.createdAt,
        p_cursor_id: paginationParams.cursor.id
      } as never)

      if (queryError) {
        logger.error('Query error', { error: queryError.message })
        throw queryError
      }

      // Build pagination response
      const jobsArray = (jobs || []) as Array<Record<string, unknown>>
      const hasMore = jobsArray.length > paginationParams.limit
      const visibleJobs = hasMore ? jobsArray.slice(0, paginationParams.limit) : jobsArray

      // Transform jobs
      const transformedJobs = visibleJobs.map(transformJob)

      // Build next cursor
      let nextCursor: string | undefined
      if (hasMore && visibleJobs.length > 0) {
        const lastJob = visibleJobs[visibleJobs.length - 1]
        const cursorObj = {
          createdAt: lastJob.created_at,
          id: lastJob.id
        }
        nextCursor = Buffer.from(JSON.stringify(cursorObj)).toString('base64')
      }

      return NextResponse.json({
        jobs: transformedJobs,
        pagination: {
          limit: paginationParams.limit,
          hasMore,
          nextCursor
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
    }

    // Fall back to traditional query for offset pagination or non-cursor-supported sorting
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
    const offset = paginationParams.offset || 0
    query = query.range(
      offset,
      offset + paginationParams.limit - 1
    )

    // Execute query
    const { data: jobs, error: queryError, count } = await query

    if (queryError) {
      logger.error('Query error', { error: queryError.message })
      throw queryError
    }

    // Transform response
    const transformedJobs = (jobs || []).map((job) => transformJob(job as Record<string, unknown>))

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
