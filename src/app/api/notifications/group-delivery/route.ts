import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import { GroupNotificationService } from '@/lib/services/groupNotificationService'
import { createLogger } from '@/lib/logger'
import { z } from 'zod'

const logger = createLogger('GroupDeliveryAPI')

// Schema for notification delivery requests
const deliveryRequestSchema = z.object({
  update_id: z.string().uuid(),
  group_id: z.string().uuid(),
  notification_type: z.enum(['immediate', 'digest', 'milestone']).default('immediate'),
  urgency_level: z.enum(['normal', 'urgent', 'low']).default('normal'),
  schedule_delay: z.number().min(0).max(10080).default(0), // Max 1 week delay in minutes
  content: z.object({
    subject: z.string().min(1).max(200),
    body: z.string().min(1),
    media_urls: z.array(z.string().url()).optional(),
    milestone_type: z.string().optional(),
    custom_data: z.record(z.any()).optional()
  }),
  delivery_options: z.object({
    respect_mute_settings: z.boolean().default(true),
    override_quiet_hours: z.boolean().default(false),
    force_immediate: z.boolean().default(false),
    test_mode: z.boolean().default(false)
  }).optional()
})

const batchDeliverySchema = z.object({
  deliveries: z.array(deliveryRequestSchema).min(1).max(50),
  batch_options: z.object({
    parallel_processing: z.boolean().default(true),
    max_retries: z.number().min(0).max(5).default(3),
    retry_delay_minutes: z.number().min(1).max(60).default(5)
  }).optional()
})

type DeliveryRequest = z.infer<typeof deliveryRequestSchema>
type BatchDeliveryRequest = z.infer<typeof batchDeliverySchema>
type DeliveryCollection = {
  deliveries: DeliveryRequest[]
  batch_options?: BatchDeliveryRequest['batch_options']
}
type DeliveryResult = {
  update_id: string
  group_id: string
  success: boolean
  jobs_created?: number
  scheduled_delivery?: string | null
  test_results?: unknown
  error?: string
  job_id?: string
  status?: string
  group_name?: string
  recipient_count?: number
  delivery_method?: string
  notification_type?: string
  created_at?: string
  completed_at?: string | null
}

/**
 * POST /api/notifications/group-delivery - Queue notifications for group delivery
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

    // Check if this is a batch request or single delivery
    const isBatch = Array.isArray(body.deliveries)
    let validatedData: DeliveryCollection

    if (isBatch) {
      validatedData = batchDeliverySchema.parse(body)
    } else {
      validatedData = { deliveries: [deliveryRequestSchema.parse(body)] }
    }

    const notificationService = new GroupNotificationService()
    const results: DeliveryResult[] = []

    for (const delivery of validatedData.deliveries) {
      try {
        // Verify user owns the group and update
        const { data: groupCheck, error: groupError } = await supabase
          .from('recipient_groups')
          .select('id, name')
          .eq('id', delivery.group_id)
          .eq('parent_id', user.id)
          .single()

        if (groupError || !groupCheck) {
          results.push({
            update_id: delivery.update_id,
            group_id: delivery.group_id,
            success: false,
            error: 'Group not found or access denied'
          })
          continue
        }

        const { data: updateCheck, error: updateError } = await supabase
          .from('child_updates')
          .select('id, title')
          .eq('id', delivery.update_id)
          .eq('parent_id', user.id)
          .single()

        if (updateError || !updateCheck) {
          results.push({
            update_id: delivery.update_id,
            group_id: delivery.group_id,
            success: false,
            error: 'Update not found or access denied'
          })
          continue
        }

        // Create notification jobs
        const jobs = await notificationService.createNotificationJobs(
          delivery.update_id,
          delivery.group_id,
          user.id,
          {
            ...delivery.content,
            update_title: updateCheck.title,
            group_name: groupCheck.name,
            delivery_options: delivery.delivery_options
          },
          {
            notificationType: delivery.notification_type,
            urgencyLevel: delivery.urgency_level,
            scheduleDelay: delivery.schedule_delay
          }
        )

        // If test mode, process jobs immediately and return results
        if (delivery.delivery_options?.test_mode) {
          const testResults = await notificationService.processPendingJobs(jobs.length)
          results.push({
            update_id: delivery.update_id,
            group_id: delivery.group_id,
            success: true,
            jobs_created: jobs.length,
            test_results: testResults
          })
        } else {
          results.push({
            update_id: delivery.update_id,
            group_id: delivery.group_id,
            success: true,
            jobs_created: jobs.length,
            scheduled_delivery: jobs.length > 0 ? jobs[0].scheduled_for : null
          })
        }

      } catch (error) {
        logger.errorWithStack(`Error processing delivery for update ${delivery.update_id}:`, error as Error)
        results.push({
          update_id: delivery.update_id,
          group_id: delivery.group_id,
          success: false,
          error: (error as Error).message
        })
      }
    }

    const successCount = results.filter(r => r.success).length
    const failureCount = results.filter(r => !r.success).length
    const totalJobs = results.reduce((sum, r) => sum + (r.jobs_created || 0), 0)

    return NextResponse.json({
      message: `Processed ${validatedData.deliveries.length} delivery request(s)`,
      summary: {
        total_requests: validatedData.deliveries.length,
        successful_requests: successCount,
        failed_requests: failureCount,
        total_jobs_created: totalJobs
      },
      results,
      batch_processing: isBatch
    })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      )
    }

    logger.errorWithStack('Error processing group delivery request:', error as Error)
    return NextResponse.json(
      { error: 'Failed to process delivery request' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/notifications/group-delivery - Get delivery status and analytics
 */
export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const groupId = url.searchParams.get('group_id')
    const updateId = url.searchParams.get('update_id')
    const days = parseInt(url.searchParams.get('days') || '7')
    const includeAnalytics = url.searchParams.get('include_analytics') === 'true'

    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const notificationService = new GroupNotificationService()
    const response: Partial<{
      delivery_status: {
        update_id: string
        total_jobs: number
        pending_jobs: number
        sent_jobs: number
        failed_jobs: number
        skipped_jobs: number
        jobs: Array<{
          id: string
          recipient_name: string
          recipient_email: string
          group_name: string
          delivery_method: string
          status: string
          scheduled_for: string | null
          processed_at: string | null
          failure_reason: string | null
        }>
      }
      analytics: {
        group_id: string
        group_name: string
        period_days: number
        error?: string
      } & Record<string, unknown>
      overview: {
        period_days: number
        total_jobs: number
        status_breakdown: Array<{ status: string; count: number }>
        delivery_method_breakdown: Array<{ method: string; count: number }>
        notification_type_breakdown: Array<{ type: string; count: number }>
      }
    }> = {}

    // Get delivery status for specific update
    if (updateId) {
      const { data: jobs, error: jobsError } = await supabase
        .from('notification_jobs')
        .select(`
          *,
          recipients!inner(name, email),
          recipient_groups!inner(name)
        `)
        .eq('update_id', updateId)
        .in('group_id', (
          await supabase
            .from('recipient_groups')
            .select('id')
            .eq('parent_id', user.id)
        ).data?.map(g => g.id) || [])

      if (jobsError) {
        logger.errorWithStack('Error fetching job status:', jobsError as Error)
        return NextResponse.json({ error: 'Failed to fetch delivery status' }, { status: 500 })
      }

      response.delivery_status = {
        update_id: updateId,
        total_jobs: jobs?.length || 0,
        pending_jobs: jobs?.filter(j => j.status === 'pending').length || 0,
        sent_jobs: jobs?.filter(j => j.status === 'sent').length || 0,
        failed_jobs: jobs?.filter(j => j.status === 'failed').length || 0,
        skipped_jobs: jobs?.filter(j => j.status === 'skipped').length || 0,
        jobs: jobs?.map(job => ({
          id: job.id,
          recipient_name: job.recipients.name,
          recipient_email: job.recipients.email,
          group_name: job.recipient_groups.name,
          delivery_method: job.delivery_method,
          status: job.status,
          scheduled_for: job.scheduled_for,
          processed_at: job.processed_at,
          failure_reason: job.failure_reason
        })) || []
      }
    }

    // Get analytics for specific group
    if (groupId && includeAnalytics) {
      // Verify group ownership
      const { data: group, error: groupError } = await supabase
        .from('recipient_groups')
        .select('id, name')
        .eq('id', groupId)
        .eq('parent_id', user.id)
        .single()

      if (groupError || !group) {
        return NextResponse.json({ error: 'Group not found or access denied' }, { status: 404 })
      }

      try {
        const analytics = await notificationService.getNotificationAnalytics(groupId, days)
        response.analytics = {
          group_id: groupId,
          group_name: group.name,
          period_days: days,
          ...analytics
        }
      } catch (error) {
        logger.errorWithStack('Error fetching analytics:', error as Error)
        response.analytics = {
          group_id: groupId || '',
          group_name: '',
          period_days: 7,
          error: 'Failed to fetch analytics'
        }
      }
    }

    // Get general statistics if no specific filters
    if (!updateId && !groupId) {
      const { data: recentJobs, error: recentError } = await supabase
        .from('notification_jobs')
        .select(`
          id,
          status,
          notification_type,
          delivery_method,
          created_at,
          recipient_groups!inner(parent_id)
        `)
        .eq('recipient_groups.parent_id', user.id)
        .gte('created_at', new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString())
        .order('created_at', { ascending: false })
        .limit(100)

      if (recentError) {
        logger.errorWithStack('Error fetching recent jobs:', recentError as Error)
      } else {
        const statusCounts = new Map<string, number>()
        const methodCounts = new Map<string, number>()
        const typeCounts = new Map<string, number>()

        for (const job of recentJobs || []) {
          statusCounts.set(job.status, (statusCounts.get(job.status) || 0) + 1)
          methodCounts.set(job.delivery_method, (methodCounts.get(job.delivery_method) || 0) + 1)
          typeCounts.set(job.notification_type, (typeCounts.get(job.notification_type) || 0) + 1)
        }

        response.overview = {
          period_days: days,
          total_jobs: recentJobs?.length || 0,
          status_breakdown: Array.from(statusCounts.entries()).map(([status, count]) => ({
            status,
            count
          })),
          delivery_method_breakdown: Array.from(methodCounts.entries()).map(([method, count]) => ({
            method,
            count
          })),
          notification_type_breakdown: Array.from(typeCounts.entries()).map(([type, count]) => ({
            type,
            count
          }))
        }
      }
    }

    return NextResponse.json(response)

  } catch (error) {
    logger.errorWithStack('Error fetching delivery information:', error as Error)
    return NextResponse.json(
      { error: 'Failed to fetch delivery information' },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/notifications/group-delivery - Process pending jobs or retry failed jobs
 */
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const actionSchema = z.object({
      action: z.enum(['process_pending', 'retry_failed', 'cancel_pending']),
      job_ids: z.array(z.string().uuid()).optional(),
      batch_size: z.number().min(1).max(100).default(50),
      filters: z.object({
        group_id: z.string().uuid().optional(),
        update_id: z.string().uuid().optional(),
        delivery_method: z.enum(['email', 'sms', 'whatsapp', 'push']).optional(),
        older_than_hours: z.number().min(0).max(72).optional()
      }).optional()
    })

    const validatedData = actionSchema.parse(body)
    const notificationService = new GroupNotificationService()

    const results: DeliveryResult[] = []

    switch (validatedData.action) {
      case 'process_pending':
        // Process pending notification jobs
        {
          const processed = await notificationService.processPendingJobs(validatedData.batch_size) as DeliveryResult[]
          results.push(...processed)
        }
        break

      case 'retry_failed':
        // Retry failed jobs (this would need additional implementation)
        const { data: failedJobs, error: failedError } = await supabase
          .from('notification_jobs')
          .select('id')
          .eq('status', 'failed')
          .lt('retry_count', 3)
          .in('group_id', (
            await supabase
              .from('recipient_groups')
              .select('id')
              .eq('parent_id', user.id)
          ).data?.map(g => g.id) || [])
          .limit(validatedData.batch_size)

        if (failedError) {
          throw new Error('Failed to fetch failed jobs')
        }

        // Reset failed jobs to pending for retry
        if (failedJobs && failedJobs.length > 0) {
          const { error: resetError } = await supabase
            .from('notification_jobs')
            .update({
              status: 'pending',
              retry_count: 1,
              scheduled_for: new Date().toISOString()
            })
            .in('id', failedJobs.map(j => j.id))

          if (resetError) {
            throw new Error('Failed to reset failed jobs')
          }

          results.push(...failedJobs.map(job => ({
            update_id: '',
            job_id: job.id,
            status: 'reset_for_retry',
            group_id: '',
            group_name: '',
            recipient_count: 0,
            delivery_method: 'email' as const,
            notification_type: 'immediate' as const,
            created_at: new Date().toISOString(),
            completed_at: null,
            success: true
          })))
        }
        break

      case 'cancel_pending':
        // Cancel pending jobs
        let cancelQuery = supabase
          .from('notification_jobs')
          .update({ status: 'cancelled' })
          .eq('status', 'pending')
          .in('group_id', (
            await supabase
              .from('recipient_groups')
              .select('id')
              .eq('parent_id', user.id)
          ).data?.map(g => g.id) || [])

        if (validatedData.job_ids && validatedData.job_ids.length > 0) {
          cancelQuery = cancelQuery.in('id', validatedData.job_ids)
        }

        if (validatedData.filters?.group_id) {
          cancelQuery = cancelQuery.eq('group_id', validatedData.filters.group_id)
        }

        if (validatedData.filters?.update_id) {
          cancelQuery = cancelQuery.eq('update_id', validatedData.filters.update_id)
        }

        const { data: cancelledJobs, error: cancelError } = await cancelQuery.select('id')

        if (cancelError) {
          throw new Error('Failed to cancel jobs')
        }

        results.push(...(cancelledJobs || []).map(job => ({
          update_id: '',
          group_id: '',
          success: true,
          job_id: job.id,
          status: 'cancelled'
        })))
        break
    }

    return NextResponse.json({
      action: validatedData.action,
      processed_count: results.length,
      results
    })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      )
    }

    logger.errorWithStack('Error processing delivery action:', error as Error)
    return NextResponse.json(
      { error: 'Failed to process delivery action' },
      { status: 500 }
    )
  }
}
