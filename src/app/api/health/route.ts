import { NextRequest, NextResponse } from 'next/server'
import { getAppHealth } from '@/lib/init'
import { createLogger } from '@/lib/logger'
import { getEmailQueue } from '@/lib/services/emailQueue'
import { getEnv } from '@/lib/env'

const logger = createLogger('health-api')

export async function GET(request: NextRequest) {
  try {
    const health = getAppHealth()
    const env = getEnv()

    // Check Redis/Queue health
    let redisHealth: {
      configured: boolean
      connected?: boolean
      circuitBreaker?: string
      queueMetrics?: unknown
    } = {
      configured: !!env.REDIS_URL
    }

    if (env.REDIS_URL) {
      try {
        const emailQueue = getEmailQueue()
        const metrics = await emailQueue.getQueueMetrics()
        const circuitBreakerState = emailQueue.getCircuitBreakerState()

        redisHealth = {
          configured: true,
          connected: true,
          circuitBreaker: circuitBreakerState,
          queueMetrics: metrics
        }
      } catch (error) {
        redisHealth = {
          configured: true,
          connected: false
        }
        logger.warn('Redis health check failed', {
          error: error instanceof Error ? error.message : String(error)
        })
      }
    }

    // Determine overall health status
    let overallStatus = health.status
    if (!redisHealth.connected && process.env.NEXT_PUBLIC_APP_ENV === 'production') {
      overallStatus = 'degraded'
    }

    // Log health check (useful for monitoring)
    logger.debug('Health check requested', {
      status: overallStatus,
      redisConfigured: redisHealth.configured,
      redisConnected: redisHealth.connected,
      userAgent: request.headers.get('user-agent'),
      ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip')
    })

    // Return appropriate HTTP status based on health
    const httpStatus = overallStatus === 'healthy' ? 200 :
                      overallStatus === 'degraded' ? 200 : 503

    return NextResponse.json({
      status: overallStatus,
      timestamp: health.timestamp,
      version: process.env.npm_package_version || 'unknown',
      features: health.environment.features,
      environment: {
        nodeEnv: process.env.NODE_ENV,
        hasSupabaseConfig: health.environment.features.supabaseEnabled,
        hasEmailConfig: health.environment.features.emailEnabled,
        hasLinearConfig: health.environment.features.linearEnabled,
        hasRedisConfig: redisHealth.configured
      },
      redis: {
        configured: redisHealth.configured,
        connected: redisHealth.connected,
        circuitBreaker: redisHealth.circuitBreaker
      },
      // Only include detailed errors in development
      ...(process.env.NODE_ENV === 'development' && {
        details: {
          configurationIssues: health.environment.health.errors,
          missingRequired: health.environment.health.missingRequired,
          missingOptional: health.environment.health.missingOptional,
          queueMetrics: redisHealth.queueMetrics
        }
      })
    }, { status: httpStatus })

  } catch (error) {
    logger.errorWithStack('Health check failed', error as Error)

    return NextResponse.json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: 'Health check system failure'
    }, { status: 503 })
  }
}