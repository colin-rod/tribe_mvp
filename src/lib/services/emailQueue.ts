import { Queue, Worker, Job, QueueEvents } from 'bullmq'
import Redis from 'ioredis'
import { createLogger } from '@/lib/logger'
import { EmailOptions, EmailDeliveryResult } from './serverEmailService'
import { getEnv } from '@/lib/env'

const logger = createLogger('EmailQueue')

// Email error categories for proper handling
export enum EmailErrorCategory {
  // Temporary errors - should retry
  RATE_LIMIT = 'rate_limit',
  TIMEOUT = 'timeout',
  SERVICE_UNAVAILABLE = 'service_unavailable',

  // Permanent errors - should not retry
  INVALID_EMAIL = 'invalid_email',
  BLOCKED = 'blocked',
  BOUNCE = 'bounce',
  SPAM = 'spam',

  // Unknown errors
  UNKNOWN = 'unknown'
}

export interface EmailJobData extends EmailOptions {
  jobId?: string
  attemptNumber?: number
}

export interface EmailJobResult extends EmailDeliveryResult {
  errorCategory?: EmailErrorCategory
  retryable?: boolean
}

// Circuit breaker state
class CircuitBreaker {
  private failureCount = 0
  private successCount = 0
  private state: 'closed' | 'open' | 'half-open' = 'closed'
  private lastFailureTime = 0
  private readonly failureThreshold: number
  private readonly successThreshold: number
  private readonly timeout: number

  constructor(
    failureThreshold = 5,
    successThreshold = 2,
    timeout = 60000 // 1 minute
  ) {
    this.failureThreshold = failureThreshold
    this.successThreshold = successThreshold
    this.timeout = timeout
  }

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === 'open') {
      if (Date.now() - this.lastFailureTime > this.timeout) {
        logger.info('Circuit breaker transitioning to half-open')
        this.state = 'half-open'
      } else {
        throw new Error('Circuit breaker is OPEN - SendGrid service unavailable')
      }
    }

    try {
      const result = await fn()
      this.onSuccess()
      return result
    } catch (error) {
      this.onFailure()
      throw error
    }
  }

  private onSuccess() {
    this.failureCount = 0

    if (this.state === 'half-open') {
      this.successCount++
      if (this.successCount >= this.successThreshold) {
        logger.info('Circuit breaker closing - service recovered')
        this.state = 'closed'
        this.successCount = 0
      }
    }
  }

  private onFailure() {
    this.failureCount++
    this.lastFailureTime = Date.now()

    if (this.state === 'half-open') {
      logger.warn('Circuit breaker opening - service still failing')
      this.state = 'open'
      this.successCount = 0
    } else if (this.failureCount >= this.failureThreshold) {
      logger.error('Circuit breaker opening - failure threshold exceeded', {
        failureCount: this.failureCount,
        threshold: this.failureThreshold
      })
      this.state = 'open'
    }
  }

  getState() {
    return this.state
  }

  reset() {
    this.state = 'closed'
    this.failureCount = 0
    this.successCount = 0
  }
}

// Categorize SendGrid errors
export function categorizeEmailError(error: unknown): EmailErrorCategory {
  if (!error) return EmailErrorCategory.UNKNOWN

  const errorMessage = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase()

  // SendGrid-specific error categorization
  const sendgridError = error as {
    response?: {
      status?: number
      body?: {
        errors?: Array<{ message?: string; field?: string; help?: string }>
      }
    }
    code?: string
  }

  const statusCode = sendgridError.response?.status
  const errorBody = sendgridError.response?.body

  // Rate limiting (429)
  if (statusCode === 429 || errorMessage.includes('rate limit')) {
    return EmailErrorCategory.RATE_LIMIT
  }

  // Service unavailable (503, 502, 500)
  if (statusCode && [500, 502, 503, 504].includes(statusCode)) {
    return EmailErrorCategory.SERVICE_UNAVAILABLE
  }

  // Timeout errors
  if (errorMessage.includes('timeout') || errorMessage.includes('etimedout')) {
    return EmailErrorCategory.TIMEOUT
  }

  // Invalid email address (400)
  if (
    statusCode === 400 ||
    errorMessage.includes('invalid email') ||
    errorMessage.includes('does not contain a valid address') ||
    errorBody?.errors?.some(e => e.field === 'to' || e.field === 'from')
  ) {
    return EmailErrorCategory.INVALID_EMAIL
  }

  // Blocked recipients
  if (
    errorMessage.includes('blocked') ||
    errorMessage.includes('suppressed') ||
    errorBody?.errors?.some(e => e.message?.toLowerCase().includes('blocked'))
  ) {
    return EmailErrorCategory.BLOCKED
  }

  // Bounce
  if (
    errorMessage.includes('bounce') ||
    errorMessage.includes('does not exist') ||
    errorBody?.errors?.some(e => e.message?.toLowerCase().includes('bounce'))
  ) {
    return EmailErrorCategory.BOUNCE
  }

  // Spam
  if (
    errorMessage.includes('spam') ||
    errorBody?.errors?.some(e => e.message?.toLowerCase().includes('spam'))
  ) {
    return EmailErrorCategory.SPAM
  }

  return EmailErrorCategory.UNKNOWN
}

// Determine if error is retryable
export function isRetryableError(category: EmailErrorCategory): boolean {
  const retryableCategories = [
    EmailErrorCategory.RATE_LIMIT,
    EmailErrorCategory.TIMEOUT,
    EmailErrorCategory.SERVICE_UNAVAILABLE,
    EmailErrorCategory.UNKNOWN
  ]

  return retryableCategories.includes(category)
}

// Calculate exponential backoff delay
export function calculateBackoffDelay(attemptNumber: number): number {
  // Base delay: 1 second
  const baseDelay = 1000
  // Max delay: 5 minutes
  const maxDelay = 300000

  // Exponential backoff with jitter: delay = min(baseDelay * 2^attempt + random(0-1000), maxDelay)
  const exponentialDelay = baseDelay * Math.pow(2, attemptNumber)
  const jitter = Math.random() * 1000

  return Math.min(exponentialDelay + jitter, maxDelay)
}

export class EmailQueueService {
  private static instance: EmailQueueService
  private emailQueue: Queue | null = null
  private deadLetterQueue: Queue | null = null
  private worker: Worker | null = null
  private queueEvents: QueueEvents | null = null
  private circuitBreaker: CircuitBreaker
  private redisConnection: Redis | null = null
  private isShuttingDown = false
  private isInitialized = false

  private constructor() {
    // Circuit breaker for SendGrid failures - can be initialized without Redis
    this.circuitBreaker = new CircuitBreaker(
      5,    // Open after 5 failures
      2,    // Close after 2 successes in half-open state
      60000 // Reset after 1 minute
    )
  }

  static getInstance(): EmailQueueService {
    if (!EmailQueueService.instance) {
      EmailQueueService.instance = new EmailQueueService()
    }
    return EmailQueueService.instance
  }

  // Lazy initialization - only connect when actually needed
  private async initialize() {
    // Skip initialization during build time
    if (typeof window === 'undefined' && process.env.NODE_ENV !== 'production') {
      // We're in a server context during build, skip Redis connection
      const isBuildTime = process.env.NEXT_PHASE === 'phase-production-build'
      if (isBuildTime) {
        logger.warn('Skipping Redis connection during build phase')
        return
      }
    }

    if (this.isInitialized || this.isShuttingDown) {
      return
    }

    const env = getEnv()

    // Check if Redis URL is configured
    if (!env.REDIS_URL) {
      logger.warn('Redis URL not configured, email queue will not be available')
      return
    }

    try {
      // Create Redis connection with proper error handling
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
        logger.info('Redis connected successfully')
      })

      // Initialize main email queue
      this.emailQueue = new Queue('email-queue', {
        connection: this.redisConnection,
        defaultJobOptions: {
          attempts: 5, // Maximum 5 retry attempts
          backoff: {
            type: 'custom'
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

      // Initialize dead letter queue for permanently failed emails
      this.deadLetterQueue = new Queue('email-dead-letter-queue', {
        connection: this.redisConnection,
        defaultJobOptions: {
          removeOnComplete: false, // Never remove from DLQ
          removeOnFail: false
        }
      })

      // Queue events for monitoring
      this.queueEvents = new QueueEvents('email-queue', {
        connection: this.redisConnection
      })

      this.setupEventListeners()
      this.isInitialized = true

      logger.info('Email queue service initialized successfully')
    } catch (error) {
      logger.error('Failed to initialize email queue service', {
        error: error instanceof Error ? error.message : String(error)
      })
      // Don't throw - allow app to continue without queue functionality
    }
  }

  private async ensureInitialized() {
    if (!this.isInitialized) {
      await this.initialize()
    }
    if (!this.emailQueue || !this.deadLetterQueue || !this.queueEvents) {
      throw new Error('Email queue service not available')
    }
  }

  private setupEventListeners() {
    if (!this.queueEvents) return

    this.queueEvents.on('completed', ({ jobId, returnvalue }: { jobId: string; returnvalue: unknown }) => {
      logger.info('Email sent successfully', { jobId, result: returnvalue })
    })

    this.queueEvents.on('failed', ({ jobId, failedReason }: { jobId: string; failedReason: string }) => {
      logger.error('Email job failed', { jobId, reason: failedReason })
    })
  }

  async addEmail(emailData: EmailJobData, options?: { priority?: number; delay?: number }): Promise<Job> {
    if (this.isShuttingDown) {
      throw new Error('Email queue is shutting down')
    }

    await this.ensureInitialized()

    const job = await this.emailQueue!.add(
      'send-email',
      emailData,
      {
        priority: options?.priority || 0,
        delay: options?.delay || 0,
        jobId: emailData.jobId
      }
    )

    logger.info('Email added to queue', {
      jobId: job.id,
      to: emailData.to,
      subject: emailData.subject
    })

    return job
  }

  async addBulkEmails(emails: EmailJobData[]): Promise<Job[]> {
    if (this.isShuttingDown) {
      throw new Error('Email queue is shutting down')
    }

    await this.ensureInitialized()

    const jobs = await this.emailQueue!.addBulk(
      emails.map((email) => ({
        name: 'send-email',
        data: email,
        opts: {
          jobId: email.jobId
        }
      }))
    )

    logger.info('Bulk emails added to queue', { count: jobs.length })

    return jobs
  }

  async startWorker(emailSender: (options: EmailOptions) => Promise<EmailDeliveryResult>) {
    if (this.worker) {
      logger.warn('Worker already started')
      return
    }

    await this.ensureInitialized()

    this.worker = new Worker(
      'email-queue',
      async (job: Job<EmailJobData>): Promise<EmailJobResult> => {
        logger.info('Processing email job', {
          jobId: job.id,
          attemptsMade: job.attemptsMade,
          to: job.data.to
        })

        try {
          // Use circuit breaker to protect against SendGrid failures
          const result = await this.circuitBreaker.execute(async () => {
            return await emailSender(job.data)
          })

          if (!result.success) {
            const errorCategory = categorizeEmailError(result.error)
            const retryable = isRetryableError(errorCategory)

            logger.error('Email delivery failed', {
              jobId: job.id,
              error: result.error,
              errorCategory,
              retryable
            })

            // Move non-retryable errors to dead letter queue
            if (!retryable) {
              await this.moveToDeadLetterQueue(job, errorCategory, result.error)
              throw new Error(`Non-retryable error: ${errorCategory} - ${result.error}`)
            }

            // For retryable errors, calculate backoff and throw to trigger retry
            const backoffDelay = calculateBackoffDelay(job.attemptsMade)

            // Update job data with attempt number for next retry
            await job.updateData({
              ...job.data,
              attemptNumber: job.attemptsMade + 1
            })

            throw new Error(`${errorCategory}: ${result.error} (retry in ${backoffDelay}ms)`)
          }

          return {
            ...result,
            errorCategory: undefined,
            retryable: undefined
          }
        } catch (error) {
          const errorCategory = categorizeEmailError(error)
          const retryable = isRetryableError(errorCategory)

          logger.error('Email job error', {
            jobId: job.id,
            error: error instanceof Error ? error.message : String(error),
            errorCategory,
            retryable,
            attemptsMade: job.attemptsMade
          })

          // Move to DLQ if max attempts reached or non-retryable
          if (job.attemptsMade >= (job.opts.attempts || 5) - 1 || !retryable) {
            await this.moveToDeadLetterQueue(
              job,
              errorCategory,
              error instanceof Error ? error.message : String(error)
            )
          }

          throw error
        }
      },
      {
        connection: this.redisConnection!,
        concurrency: 10, // Process up to 10 emails concurrently
        limiter: {
          max: 100, // Max 100 jobs per duration
          duration: 1000 // 1 second
        },
        settings: {
          backoffStrategy: (attemptsMade: number) => {
            return calculateBackoffDelay(attemptsMade)
          }
        }
      }
    )

    this.worker.on('completed', (job) => {
      logger.info('Worker completed job', { jobId: job.id })
    })

    this.worker.on('failed', (job, err) => {
      logger.error('Worker failed job', {
        jobId: job?.id,
        error: err.message
      })
    })

    logger.info('Email queue worker started')
  }

  private async moveToDeadLetterQueue(
    job: Job<EmailJobData>,
    errorCategory: EmailErrorCategory,
    errorMessage?: string
  ) {
    if (!this.deadLetterQueue) {
      logger.error('Dead letter queue not available')
      return
    }

    await this.deadLetterQueue.add(
      'dead-letter-email',
      {
        ...job.data,
        originalJobId: job.id,
        errorCategory,
        errorMessage,
        attemptsMade: job.attemptsMade,
        failedAt: new Date().toISOString()
      },
      {
        jobId: `dlq-${job.id}`
      }
    )

    logger.error('Email moved to dead letter queue', {
      jobId: job.id,
      errorCategory,
      errorMessage
    })
  }

  async getQueueMetrics() {
    await this.ensureInitialized()

    const [waiting, active, completed, failed, delayed] = await Promise.all([
      this.emailQueue!.getWaitingCount(),
      this.emailQueue!.getActiveCount(),
      this.emailQueue!.getCompletedCount(),
      this.emailQueue!.getFailedCount(),
      this.emailQueue!.getDelayedCount()
    ])

    const dlqCount = await this.deadLetterQueue!.count()

    return {
      emailQueue: {
        waiting,
        active,
        completed,
        failed,
        delayed
      },
      deadLetterQueue: {
        count: dlqCount
      },
      circuitBreaker: {
        state: this.circuitBreaker.getState()
      }
    }
  }

  async retryDeadLetterJob(jobId: string): Promise<Job | null> {
    await this.ensureInitialized()

    const dlqJob = await this.deadLetterQueue!.getJob(`dlq-${jobId}`)

    if (!dlqJob) {
      logger.warn('Dead letter job not found', { jobId })
      return null
    }

    // Remove from DLQ and re-add to main queue
    const { originalJobId, errorCategory, errorMessage, attemptsMade, failedAt, ...emailData } = dlqJob.data as EmailJobData & {
      originalJobId?: string
      errorCategory?: EmailErrorCategory
      errorMessage?: string
      attemptsMade?: number
      failedAt?: string
    }

    // Log the retry information
    logger.info('Retrying dead letter job', {
      originalJobId,
      errorCategory,
      errorMessage,
      attemptsMade,
      failedAt
    })

    const newJob = await this.addEmail(emailData)
    await dlqJob.remove()

    logger.info('Retrying dead letter job', {
      originalJobId,
      newJobId: newJob.id
    })

    return newJob
  }

  async close() {
    this.isShuttingDown = true

    logger.info('Closing email queue service')

    if (this.worker) {
      await this.worker.close()
    }

    if (this.queueEvents) {
      await this.queueEvents.close()
    }

    if (this.emailQueue) {
      await this.emailQueue.close()
    }

    if (this.deadLetterQueue) {
      await this.deadLetterQueue.close()
    }

    if (this.redisConnection) {
      await this.redisConnection.quit()
    }

    logger.info('Email queue service closed')
  }

  // Get circuit breaker state for monitoring
  getCircuitBreakerState() {
    return this.circuitBreaker.getState()
  }

  // Reset circuit breaker manually if needed
  resetCircuitBreaker() {
    this.circuitBreaker.reset()
    logger.info('Circuit breaker manually reset')
  }
}

// Export singleton instance getter
export const getEmailQueue = () => EmailQueueService.getInstance()
