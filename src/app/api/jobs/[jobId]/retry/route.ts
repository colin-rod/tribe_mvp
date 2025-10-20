/**
 * POST /api/jobs/[jobId]/retry
 * Retry a failed job
 *
 * Authorization: Admin only (tribe-mvp.com email)
 */

import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { createLogger } from '@/lib/logger'

const logger = createLogger('RetryJobAPI')

interface RouteParams {
  params: Promise<{
    jobId: string
  }>
}

export async function POST(
  _request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse> {
  try {
    const { jobId } = await params
    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)

    // Check authentication
    const {
      data: { user },
      error: authError
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is admin (tribe-mvp.com email)
    if (!user.email?.endsWith('@tribe-mvp.com')) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    // Get the failed job
    const { data: job, error: jobError } = await supabase
      .from('notification_jobs')
      .select('*')
      .eq('id', jobId)
      .single()

    if (jobError || !job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 })
    }

    // Can only retry failed jobs
    if (job.status !== 'failed') {
      return NextResponse.json(
        { error: `Cannot retry job with status: ${job.status}` },
        { status: 400 }
      )
    }

    // Reset job status to pending and reset retry count
    const { error: updateError } = await supabase
      .from('notification_jobs')
      .update({
        status: 'pending',
        retry_count: 0,
        failure_reason: null,
        processed_at: null,
        scheduled_for: new Date().toISOString() // Schedule immediately
      })
      .eq('id', jobId)

    if (updateError) {
      logger.error('Failed to retry job', { error: updateError, jobId })
      return NextResponse.json(
        { error: 'Failed to retry job' },
        { status: 500 }
      )
    }

    logger.info('Job retry scheduled', { jobId, userId: user.id })

    return NextResponse.json({
      success: true,
      message: 'Job scheduled for retry'
    })
  } catch (error) {
    logger.error('Error retrying job', {
      error: error instanceof Error ? error.message : String(error)
    })
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
