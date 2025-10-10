import { NextResponse } from 'next/server'
import { getEmailQueue } from '@/lib/services/emailQueue'
import { createLogger } from '@/lib/logger'
import { getEnv } from '@/lib/env'

const logger = createLogger('RedisHealthCheck')

/**
 * GET /api/health/redis - Check Redis connection and queue health
 *
 * Returns:
 * - 200: Redis is healthy and queue is operational
 * - 503: Redis is unavailable or queue has issues
 */
export async function GET() {
  try {
    const env = getEnv()

    // Check if Redis URL is configured
    if (!env.REDIS_URL) {
      return NextResponse.json(
        {
          status: 'unavailable',
          redis_configured: false,
          message: 'Redis URL not configured',
          timestamp: new Date().toISOString()
        },
        { status: 503 }
      )
    }

    // Check queue health
    try {
      const emailQueue = getEmailQueue()
      const metrics = await emailQueue.getQueueMetrics()
      const circuitBreakerState = emailQueue.getCircuitBreakerState()

      // Determine health status
      const isHealthy = circuitBreakerState === 'closed'
      const hasHighFailureRate = metrics.emailQueue.failed > 100
      const hasLargeBacklog = metrics.emailQueue.waiting > 1000

      let status = 'healthy'
      const warnings = []

      if (!isHealthy) {
        status = 'degraded'
        warnings.push(`Circuit breaker is ${circuitBreakerState}`)
      }

      if (hasHighFailureRate) {
        status = 'degraded'
        warnings.push(`High failure rate: ${metrics.emailQueue.failed} failed jobs`)
      }

      if (hasLargeBacklog) {
        warnings.push(`Large backlog: ${metrics.emailQueue.waiting} waiting jobs`)
      }

      return NextResponse.json(
        {
          status,
          redis_configured: true,
          redis_connected: true,
          circuit_breaker: circuitBreakerState,
          queue_metrics: metrics,
          warnings: warnings.length > 0 ? warnings : undefined,
          timestamp: new Date().toISOString()
        },
        { status: status === 'healthy' ? 200 : 503 }
      )
    } catch (queueError) {
      logger.error('Queue health check failed', {
        error: queueError instanceof Error ? queueError.message : String(queueError)
      })

      return NextResponse.json(
        {
          status: 'unavailable',
          redis_configured: true,
          redis_connected: false,
          error: queueError instanceof Error ? queueError.message : 'Unknown error',
          timestamp: new Date().toISOString()
        },
        { status: 503 }
      )
    }
  } catch (error) {
    logger.error('Health check error', {
      error: error instanceof Error ? error.message : String(error)
    })

    return NextResponse.json(
      {
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
}
