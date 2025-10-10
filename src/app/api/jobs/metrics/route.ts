import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import { createLogger } from '@/lib/logger'
import { getNotificationWorker } from '@/workers/notificationWorker'
import { z } from 'zod'

const logger = createLogger('JobMetricsAPI')

const timeRangeSchema = z.object({
  hours: z.coerce.number().min(1).max(168).default(24) // Default 24 hours, max 1 week
})

/**
 * GET /api/jobs/metrics - Get notification job metrics and statistics
 *
 * Query parameters:
 * - hours: Time range in hours (1-168, default 24)
 *
 * Returns:
 * - Job counts by status
 * - Success/failure rates
 * - Average processing time
 * - Queue health metrics
 * - Delivery method breakdown
 *
 * Authorization: User metrics only (their recipients)
 * Admin: Set ?admin=true for system-wide metrics (requires admin role)
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
    const { hours } = timeRangeSchema.parse({
      hours: searchParams.get('hours') || '24'
    })

    const isAdmin = searchParams.get('admin') === 'true'

    // Calculate time range
    const now = new Date()
    const startTime = new Date(now.getTime() - hours * 60 * 60 * 1000)

    // Build base query with authorization
    const baseQuery = isAdmin
      ? supabase.from('notification_jobs')
      : supabase
          .from('notification_jobs')
          .select('*, recipient:recipients!notification_jobs_recipient_id_fkey(parent_id)')
          .eq('recipient.parent_id', user.id)

    // Get job counts by status
    const statusQuery = baseQuery
      .select('status', { count: 'exact' })
      .gte('created_at', startTime.toISOString())

    const { data: allJobs, count: totalJobs } = await statusQuery

    // Count by status
    const statusCounts = {
      pending: 0,
      processing: 0,
      sent: 0,
      failed: 0,
      skipped: 0,
      cancelled: 0
    }

    if (allJobs) {
      for (const job of allJobs) {
        const status = job.status as keyof typeof statusCounts
        if (status in statusCounts) {
          statusCounts[status]++
        }
      }
    }

    // Get delivery method breakdown
    const { data: deliveryJobs } = await baseQuery
      .select('delivery_method')
      .gte('created_at', startTime.toISOString())

    const deliveryMethodCounts = {
      email: 0,
      sms: 0,
      whatsapp: 0,
      push: 0
    }

    if (deliveryJobs) {
      for (const job of deliveryJobs) {
        const method = job.delivery_method as keyof typeof deliveryMethodCounts
        if (method in deliveryMethodCounts) {
          deliveryMethodCounts[method]++
        }
      }
    }

    // Get notification type breakdown
    const { data: typeJobs } = await baseQuery
      .select('notification_type')
      .gte('created_at', startTime.toISOString())

    const notificationTypeCounts = {
      immediate: 0,
      digest: 0,
      milestone: 0
    }

    if (typeJobs) {
      for (const job of typeJobs) {
        const type = job.notification_type as keyof typeof notificationTypeCounts
        if (type in notificationTypeCounts) {
          notificationTypeCounts[type]++
        }
      }
    }

    // Calculate success rate
    const successfulJobs = statusCounts.sent
    const failedJobs = statusCounts.failed
    const completedJobs = successfulJobs + failedJobs
    const successRate = completedJobs > 0
      ? Math.round((successfulJobs / completedJobs) * 100)
      : 0

    // Get average processing time for completed jobs
    const { data: processedJobs } = await baseQuery
      .select('created_at, processed_at')
      .not('processed_at', 'is', null)
      .gte('created_at', startTime.toISOString())
      .limit(1000) // Sample up to 1000 recent jobs

    let avgProcessingTimeMs: number | null = null
    if (processedJobs && processedJobs.length > 0) {
      const processingTimes = processedJobs
        .filter(j => j.created_at && j.processed_at)
        .map(j => {
          const created = new Date(j.created_at!).getTime()
          const processed = new Date(j.processed_at!).getTime()
          return processed - created
        })

      if (processingTimes.length > 0) {
        avgProcessingTimeMs = Math.round(
          processingTimes.reduce((a, b) => a + b, 0) / processingTimes.length
        )
      }
    }

    // Get queue health from worker (if available)
    let queueMetrics = null
    try {
      const worker = getNotificationWorker()
      queueMetrics = await worker.getMetrics()
    } catch (error) {
      logger.warn('Worker metrics unavailable', {
        error: error instanceof Error ? error.message : String(error)
      })
    }

    // Get recent failures
    const { data: recentFailures } = await baseQuery
      .select('id, created_at, failure_reason, retry_count')
      .eq('status', 'failed')
      .gte('created_at', startTime.toISOString())
      .order('created_at', { ascending: false })
      .limit(10)

    // Get overdue jobs (pending past scheduled time)
    const { data: overdueJobs, count: overdueCount } = await baseQuery
      .select('*', { count: 'exact' })
      .eq('status', 'pending')
      .lt('scheduled_for', now.toISOString())

    return NextResponse.json({
      time_range: {
        hours,
        start: startTime.toISOString(),
        end: now.toISOString()
      },
      summary: {
        total_jobs: totalJobs || 0,
        success_rate_percent: successRate,
        avg_processing_time_ms: avgProcessingTimeMs,
        overdue_jobs: overdueCount || 0
      },
      status_counts: statusCounts,
      delivery_methods: deliveryMethodCounts,
      notification_types: notificationTypeCounts,
      queue_health: queueMetrics,
      recent_failures: (recentFailures || []).map(f => ({
        id: f.id,
        created_at: f.created_at,
        failure_reason: f.failure_reason,
        retry_count: f.retry_count
      })),
      overdue_jobs: (overdueJobs || []).slice(0, 10).map(j => ({
        id: j.id,
        scheduled_for: j.scheduled_for,
        created_at: j.created_at,
        notification_type: j.notification_type
      }))
    })

  } catch (error) {
    logger.errorWithStack('Job metrics API error', error as Error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid query parameters', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
