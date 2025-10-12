// TODO: Fix database types for notification_jobs table
// This file has type narrowing issues due to Supabase type generation
// The notification_jobs table may need schema updates or type regeneration
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-nocheck

import { Queue, Worker, Job } from 'bullmq'
import Redis from 'ioredis'
import { createClient } from '@supabase/supabase-js'
import { createLogger } from '@/lib/logger'
import { serverEmailService } from '@/lib/services/serverEmailService'
import { getEnv } from '@/lib/env'

const logger = createLogger('NotificationWorker')

export interface NotificationJobData {
  jobId: string
  recipientId: string
  groupId: string
  updateId: string
  notificationType: 'immediate' | 'digest' | 'milestone'
  urgencyLevel: 'normal' | 'urgent' | 'low'
  deliveryMethod: 'email' | 'sms' | 'whatsapp' | 'push'
  content: {
    subject: string
    body: string
    media_urls?: string[]
    milestone_type?: string
    [key: string]: unknown
  }
  scheduledFor: string
  metadata?: Record<string, unknown>
}

export interface NotificationJobResult {
  success: boolean
  messageId?: string
  deliveryMethod: string
  error?: string
  deliveredAt?: string
}

/**
 * Notification Worker
 *
 * Background worker that processes notification_jobs from the database
 * and sends them via appropriate delivery methods (email, SMS, etc.)
 *
 * Features:
 * - Polls notification_jobs table for pending jobs
 * - Respects scheduled_for timing
 * - Sends via email/SMS based on delivery_method
 * - Updates job status (sent, failed, skipped)
 * - Automatic retry with exponential backoff
 * - Logs delivery results to notification_delivery_logs
 */
export class NotificationWorker {
  private static instance: NotificationWorker
  private notificationQueue: Queue | null = null
  private worker: Worker | null = null
  private redisConnection: Redis | null = null
  private supabaseClient: ReturnType<typeof createClient> | null = null
  private isShuttingDown = false
  private isInitialized = false
  private pollingInterval: NodeJS.Timeout | null = null

  private constructor() {
    // Private constructor for singleton
  }

  static getInstance(): NotificationWorker {
    if (!NotificationWorker.instance) {
      NotificationWorker.instance = new NotificationWorker()
    }
    return NotificationWorker.instance
  }

  /**
   * Initialize the notification worker
   */
  async initialize() {
    if (this.isInitialized || this.isShuttingDown) {
      return
    }

    const env = getEnv()

    if (!env.REDIS_URL) {
      throw new Error('Redis URL not configured - cannot start notification worker')
    }

    if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error('Supabase configuration missing - cannot start notification worker')
    }

    try {
      // Initialize Redis connection
      this.redisConnection = new Redis(env.REDIS_URL, {
        maxRetriesPerRequest: null,
        enableReadyCheck: false,
        retryStrategy: (times: number) => {
          const delay = Math.min(times * 50, 2000)
          logger.warn(`Redis connection retry attempt ${times}, waiting ${delay}ms`)
          return delay
        }
      })

      this.redisConnection.on('error', (error: Error) => {
        logger.error('Redis connection error', { error: error.message })
      })

      this.redisConnection.on('connect', () => {
        logger.info('Notification worker Redis connected')
      })

      // Initialize Supabase client with service role key
      this.supabaseClient = createClient(
        env.SUPABASE_URL,
        env.SUPABASE_SERVICE_ROLE_KEY,
        {
          auth: {
            autoRefreshToken: false,
            persistSession: false
          }
        }
      )

      // Initialize notification queue
      this.notificationQueue = new Queue('notification-queue', {
        connection: this.redisConnection,
        defaultJobOptions: {
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 5000 // Start with 5 second delay
          },
          removeOnComplete: {
            age: 24 * 3600, // Keep completed jobs for 24 hours
            count: 1000
          },
          removeOnFail: {
            age: 7 * 24 * 3600 // Keep failed jobs for 7 days
          }
        }
      })

      this.isInitialized = true
      logger.info('Notification worker initialized successfully')
    } catch (error) {
      logger.error('Failed to initialize notification worker', {
        error: error instanceof Error ? error.message : String(error)
      })
      throw error
    }
  }

  /**
   * Start the worker to process notification jobs
   */
  async startWorker() {
    if (this.worker) {
      logger.warn('Worker already started')
      return
    }

    if (!this.isInitialized) {
      await this.initialize()
    }

    // Start BullMQ worker to process queued jobs
    this.worker = new Worker(
      'notification-queue',
      async (job: Job<NotificationJobData>): Promise<NotificationJobResult> => {
        return await this.processNotificationJob(job)
      },
      {
        connection: this.redisConnection!,
        concurrency: 5, // Process up to 5 notifications concurrently
        limiter: {
          max: 50, // Max 50 jobs per duration
          duration: 1000 // 1 second
        }
      }
    )

    this.worker.on('completed', (job) => {
      logger.info('Notification job completed', { jobId: job.id })
    })

    this.worker.on('failed', (job, err) => {
      logger.error('Notification job failed', {
        jobId: job?.id,
        error: err.message
      })
    })

    // Start polling database for new jobs
    await this.startDatabasePolling()

    logger.info('Notification worker started')
  }

  /**
   * Poll the notification_jobs table and queue pending jobs
   */
  private async startDatabasePolling() {
    if (this.pollingInterval) {
      return
    }

    // Poll every 10 seconds
    this.pollingInterval = setInterval(async () => {
      try {
        await this.pollPendingJobs()
      } catch (error) {
        logger.error('Error polling pending jobs', {
          error: error instanceof Error ? error.message : String(error)
        })
      }
    }, 10000)

    // Do initial poll immediately
    await this.pollPendingJobs()

    logger.info('Database polling started (every 10 seconds)')
  }

  /**
   * Query database for pending jobs and add them to queue
   */
  private async pollPendingJobs() {
    if (!this.supabaseClient || !this.notificationQueue) {
      return
    }

    // Find pending jobs that are due (scheduled_for <= now)
    const { data: pendingJobs, error } = await this.supabaseClient
      .from('notification_jobs')
      .select('*')
      .eq('status', 'pending')
      .lte('scheduled_for', new Date().toISOString())
      .order('scheduled_for', { ascending: true })
      .limit(100) // Process up to 100 jobs per poll

    if (error) {
      logger.error('Error querying pending jobs', { error: error.message })
      return
    }

    if (!pendingJobs || pendingJobs.length === 0) {
      return
    }

    logger.info(`Found ${pendingJobs.length} pending notification jobs`)

    // Add jobs to queue
    for (const job of pendingJobs) {
      try {
        const jobData: NotificationJobData = {
          jobId: job.id,
          recipientId: job.recipient_id,
          groupId: job.group_id,
          updateId: job.update_id,
          notificationType: job.notification_type as NotificationJobData['notificationType'],
          urgencyLevel: job.urgency_level as NotificationJobData['urgencyLevel'],
          deliveryMethod: job.delivery_method as NotificationJobData['deliveryMethod'],
          content: job.content as NotificationJobData['content'],
          scheduledFor: job.scheduled_for,
          metadata: job.metadata as Record<string, unknown> | undefined
        }

        // Add to BullMQ queue (will be picked up by worker)
        await this.notificationQueue.add('send-notification', jobData, {
          jobId: job.id, // Use database job ID as BullMQ job ID
          priority: job.urgency_level === 'urgent' ? 1 : 10
        })

        // Update status to 'processing' to avoid double-processing
        await this.supabaseClient
          .from('notification_jobs')
          .update({ status: 'processing' })
          .eq('id', job.id)

        logger.debug('Queued notification job', { jobId: job.id })
      } catch (error) {
        logger.error('Error queuing job', {
          jobId: job.id,
          error: error instanceof Error ? error.message : String(error)
        })
      }
    }
  }

  /**
   * Process a notification job
   */
  private async processNotificationJob(
    job: Job<NotificationJobData>
  ): Promise<NotificationJobResult> {
    const { jobId, deliveryMethod, recipientId, groupId } = job.data

    logger.info('Processing notification job', {
      jobId,
      deliveryMethod,
      recipientId,
      attemptsMade: job.attemptsMade
    })

    try {
      let result: NotificationJobResult

      // Route to appropriate delivery service
      switch (deliveryMethod) {
        case 'email':
          result = await this.sendEmailNotification(job.data)
          break

        case 'sms':
        case 'whatsapp':
          // SMS/WhatsApp implementation would go here
          logger.warn('SMS/WhatsApp delivery not yet implemented', { jobId, deliveryMethod })
          result = {
            success: false,
            deliveryMethod,
            error: 'SMS/WhatsApp delivery not implemented'
          }
          break

        case 'push':
          // Push notification implementation would go here
          logger.warn('Push notification delivery not yet implemented', { jobId })
          result = {
            success: false,
            deliveryMethod,
            error: 'Push notification delivery not implemented'
          }
          break

        default:
          throw new Error(`Unknown delivery method: ${deliveryMethod}`)
      }

      // Update database with result
      await this.updateJobStatus(jobId, result)

      // Log delivery attempt
      await this.logDeliveryAttempt(jobId, recipientId, groupId, result)

      return result
    } catch (error) {
      logger.error('Error processing notification job', {
        jobId,
        error: error instanceof Error ? error.message : String(error)
      })

      const result: NotificationJobResult = {
        success: false,
        deliveryMethod,
        error: error instanceof Error ? error.message : 'Unknown error'
      }

      await this.updateJobStatus(jobId, result)
      await this.logDeliveryAttempt(jobId, recipientId, groupId, result)

      throw error
    }
  }

  /**
   * Send email notification
   */
  private async sendEmailNotification(
    jobData: NotificationJobData
  ): Promise<NotificationJobResult> {
    const { content, recipientId } = jobData

    // Get recipient email from database
    if (!this.supabaseClient) {
      throw new Error('Supabase client not initialized')
    }

    const { data: recipient, error: recipientError } = await this.supabaseClient
      .from('recipients')
      .select('email')
      .eq('id', recipientId)
      .single()

    if (recipientError || !recipient?.email) {
      throw new Error(`Recipient email not found: ${recipientId}`)
    }

    // Send email via email service
    const emailResult = await serverEmailService.sendEmail({
      to: recipient.email,
      subject: content.subject,
      html: content.body,
      text: content.body.replace(/<[^>]*>/g, ''), // Strip HTML for text version
      categories: ['notification', jobData.notificationType],
      customArgs: {
        notificationJobId: jobData.jobId,
        recipientId: jobData.recipientId,
        groupId: jobData.groupId
      }
    })

    if (!emailResult.success) {
      throw new Error(emailResult.error || 'Email delivery failed')
    }

    return {
      success: true,
      messageId: emailResult.messageId,
      deliveryMethod: 'email',
      deliveredAt: new Date().toISOString()
    }
  }

  /**
   * Update job status in database
   */
  private async updateJobStatus(
    jobId: string,
    result: NotificationJobResult
  ) {
    if (!this.supabaseClient) {
      return
    }

    const status = result.success ? 'sent' : 'failed'

    await this.supabaseClient
      .from('notification_jobs')
      .update({
        status,
        processed_at: new Date().toISOString(),
        message_id: result.messageId,
        failure_reason: result.error
      })
      .eq('id', jobId)

    logger.debug('Updated job status', { jobId, status })
  }

  /**
   * Log delivery attempt
   */
  private async logDeliveryAttempt(
    jobId: string,
    recipientId: string,
    groupId: string,
    result: NotificationJobResult
  ) {
    if (!this.supabaseClient) {
      return
    }

    await this.supabaseClient
      .from('notification_delivery_logs')
      .insert({
        job_id: jobId,
        recipient_id: recipientId,
        group_id: groupId,
        delivery_method: result.deliveryMethod,
        status: result.success ? 'delivered' : 'failed',
        provider_message_id: result.messageId,
        error_message: result.error,
        delivery_time: result.deliveredAt
      })

    logger.debug('Logged delivery attempt', { jobId, success: result.success })
  }

  /**
   * Stop the worker and clean up resources
   */
  async close() {
    this.isShuttingDown = true

    logger.info('Shutting down notification worker')

    // Stop database polling
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval)
      this.pollingInterval = null
    }

    // Stop worker
    if (this.worker) {
      await this.worker.close()
    }

    // Close queue
    if (this.notificationQueue) {
      await this.notificationQueue.close()
    }

    // Close Redis connection
    if (this.redisConnection) {
      await this.redisConnection.quit()
    }

    logger.info('Notification worker shut down')
  }

  /**
   * Get worker metrics
   */
  async getMetrics() {
    if (!this.notificationQueue) {
      return null
    }

    const [waiting, active, completed, failed, delayed] = await Promise.all([
      this.notificationQueue.getWaitingCount(),
      this.notificationQueue.getActiveCount(),
      this.notificationQueue.getCompletedCount(),
      this.notificationQueue.getFailedCount(),
      this.notificationQueue.getDelayedCount()
    ])

    return {
      queue: {
        waiting,
        active,
        completed,
        failed,
        delayed
      },
      worker: {
        isRunning: !!this.worker && !this.isShuttingDown,
        pollingInterval: !!this.pollingInterval
      }
    }
  }
}

// Export singleton instance getter
export const getNotificationWorker = () => NotificationWorker.getInstance()
