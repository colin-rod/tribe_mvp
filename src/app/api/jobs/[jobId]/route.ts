import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import { createLogger } from '@/lib/logger'
import { z } from 'zod'

const logger = createLogger('JobStatusAPI')

/**
 * GET /api/jobs/:jobId - Get status of a specific notification job
 *
 * Returns detailed information about a notification job including:
 * - Current status (pending, processing, sent, failed, etc.)
 * - Delivery method and timing
 * - Recipient information
 * - Error details if failed
 * - Delivery logs
 *
 * Authorization: User must own the recipient associated with the job
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { jobId: string } }
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

    const jobId = params.jobId

    // Validate job ID format
    const uuidSchema = z.string().uuid()
    try {
      uuidSchema.parse(jobId)
    } catch {
      return NextResponse.json(
        { error: 'Invalid job ID format' },
        { status: 400 }
      )
    }

    // Fetch job with authorization check
    const { data: job, error: jobError } = await supabase
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
        ),
        update:memories!notification_jobs_update_id_fkey(
          id,
          content,
          subject,
          milestone_type
        )
      `)
      .eq('id', jobId)
      .single()

    if (jobError || !job) {
      logger.warn('Job not found', { jobId, userId: user.id })
      return NextResponse.json(
        { error: 'Job not found' },
        { status: 404 }
      )
    }

    // Check authorization - user must own the recipient
    if (job.recipient.parent_id !== user.id) {
      logger.warn('Unauthorized job access attempt', {
        jobId,
        userId: user.id,
        recipientParentId: job.recipient.parent_id
      })
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      )
    }

    // Fetch delivery logs for this job
    const { data: deliveryLogs } = await supabase
      .from('notification_delivery_logs')
      .select('*')
      .eq('job_id', jobId)
      .order('created_at', { ascending: false })

    // Calculate processing time if completed
    let processingTimeMs: number | null = null
    if (job.processed_at && job.created_at) {
      const created = new Date(job.created_at).getTime()
      const processed = new Date(job.processed_at).getTime()
      processingTimeMs = processed - created
    }

    // Calculate time until scheduled (if not yet processed)
    let timeUntilScheduledMs: number | null = null
    if (!job.processed_at && job.scheduled_for) {
      const now = Date.now()
      const scheduled = new Date(job.scheduled_for).getTime()
      timeUntilScheduledMs = Math.max(0, scheduled - now)
    }

    // Build response
    const response = {
      job: {
        id: job.id,
        status: job.status,
        notification_type: job.notification_type,
        urgency_level: job.urgency_level,
        delivery_method: job.delivery_method,
        scheduled_for: job.scheduled_for,
        processed_at: job.processed_at,
        created_at: job.created_at,
        updated_at: job.updated_at,
        retry_count: job.retry_count,
        max_retries: job.max_retries,
        message_id: job.message_id,
        failure_reason: job.failure_reason,
        content: job.content,
        metadata: job.metadata,

        // Computed fields
        processing_time_ms: processingTimeMs,
        time_until_scheduled_ms: timeUntilScheduledMs,
        is_overdue: job.status === 'pending' && timeUntilScheduledMs !== null && timeUntilScheduledMs === 0,
        can_retry: job.status === 'failed' && job.retry_count < job.max_retries
      },
      recipient: {
        id: job.recipient.id,
        name: job.recipient.name,
        email: job.recipient.email,
        relationship: job.recipient.relationship
      },
      group: job.group ? {
        id: job.group.id,
        name: job.group.name
      } : null,
      update: job.update ? {
        id: job.update.id,
        subject: job.update.subject,
        content: job.update.content?.substring(0, 100), // First 100 chars
        milestone_type: job.update.milestone_type
      } : null,
      delivery_logs: deliveryLogs?.map(log => ({
        id: log.id,
        status: log.status,
        delivery_method: log.delivery_method,
        provider_message_id: log.provider_message_id,
        error_message: log.error_message,
        error_code: log.error_code,
        delivery_time: log.delivery_time,
        delivery_duration_ms: log.delivery_duration_ms,
        created_at: log.created_at
      })) || []
    }

    return NextResponse.json(response)

  } catch (error) {
    logger.errorWithStack('Job status API error', error as Error)

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/jobs/:jobId - Cancel a pending notification job
 *
 * Only pending jobs can be cancelled. Jobs that are already processing,
 * sent, or failed cannot be cancelled.
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { jobId: string } }
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

    const jobId = params.jobId

    // Validate job ID format
    const uuidSchema = z.string().uuid()
    try {
      uuidSchema.parse(jobId)
    } catch {
      return NextResponse.json(
        { error: 'Invalid job ID format' },
        { status: 400 }
      )
    }

    // Fetch job with authorization check
    const { data: job, error: jobError } = await supabase
      .from('notification_jobs')
      .select(`
        *,
        recipient:recipients!notification_jobs_recipient_id_fkey(parent_id)
      `)
      .eq('id', jobId)
      .single()

    if (jobError || !job) {
      return NextResponse.json(
        { error: 'Job not found' },
        { status: 404 }
      )
    }

    // Check authorization
    if (job.recipient.parent_id !== user.id) {
      logger.warn('Unauthorized job cancellation attempt', {
        jobId,
        userId: user.id
      })
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      )
    }

    // Only pending jobs can be cancelled
    if (job.status !== 'pending') {
      return NextResponse.json(
        {
          error: 'Only pending jobs can be cancelled',
          current_status: job.status
        },
        { status: 400 }
      )
    }

    // Cancel the job
    const { error: updateError } = await supabase
      .from('notification_jobs')
      .update({
        status: 'cancelled',
        updated_at: new Date().toISOString()
      })
      .eq('id', jobId)

    if (updateError) {
      throw updateError
    }

    logger.info('Job cancelled', { jobId, userId: user.id })

    return NextResponse.json({
      success: true,
      message: 'Job cancelled successfully',
      job_id: jobId
    })

  } catch (error) {
    logger.errorWithStack('Job cancellation error', error as Error)

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
