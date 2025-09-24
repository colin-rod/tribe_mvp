import { NextRequest, NextResponse } from 'next/server'
import { getAppHealth } from '@/lib/init'
import { createLogger } from '@/lib/logger'

const logger = createLogger('health-api')

export async function GET(request: NextRequest) {
  try {
    const health = getAppHealth()

    // Log health check (useful for monitoring)
    logger.debug('Health check requested', {
      status: health.status,
      userAgent: request.headers.get('user-agent'),
      ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip')
    })

    // Return appropriate HTTP status based on health
    const httpStatus = health.status === 'healthy' ? 200 :
                      health.status === 'degraded' ? 200 : 503

    return NextResponse.json({
      status: health.status,
      timestamp: health.timestamp,
      version: process.env.npm_package_version || 'unknown',
      features: health.environment.features,
      environment: {
        nodeEnv: process.env.NODE_ENV,
        hasSupabaseConfig: health.environment.features.supabaseEnabled,
        hasEmailConfig: health.environment.features.emailEnabled,
        hasLinearConfig: health.environment.features.linearEnabled
      },
      // Only include detailed errors in development
      ...(process.env.NODE_ENV === 'development' && {
        details: {
          configurationIssues: health.environment.health.errors,
          missingRequired: health.environment.health.missingRequired,
          missingOptional: health.environment.health.missingOptional
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