/**
 * Application initialization module
 * Ensures environment validation and setup occurs at startup
 */

import { initializeEnvironment, getEnvironmentStatus } from './env'
import { createLogger } from './logger'

const logger = createLogger('app-init')

/**
 * Initialize the application with comprehensive startup validation
 */
export function initializeApp(): void {
  try {
    logger.info('Initializing Tribe MVP application...')

    // Initialize environment validation
    initializeEnvironment()

    // Get environment status for reporting
    const status = getEnvironmentStatus()

    if (status.valid) {
      logger.info('Application initialized successfully', {
        features: status.features,
        env: {
          nodeEnv: status.env?.NODE_ENV,
          port: status.env?.PORT,
          appUrl: status.env?.NEXT_PUBLIC_APP_URL
        }
      })
    } else {
      logger.warn('Application initialized with configuration issues', {
        health: status.health
      })
    }

  } catch (error) {
    logger.errorWithStack('Application initialization failed', error as Error)

    // In production, exit on critical startup failures (Node.js only)
    if (process.env.NODE_ENV === 'production' && typeof process !== 'undefined' && process.exit) {
      // eslint-disable-next-line no-console
      console.error('\n💥 Critical startup failure - application cannot continue\n')
      // eslint-disable-next-line no-restricted-syntax
      process.exit(1)
    }

    throw error
  }
}

/**
 * Runtime health check for monitoring
 */
export function getAppHealth(): {
  status: 'healthy' | 'degraded' | 'unhealthy'
  timestamp: string
  environment: ReturnType<typeof getEnvironmentStatus>
} {
  const envStatus = getEnvironmentStatus()

  let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy'

  if (!envStatus.valid) {
    if (envStatus.health.missingRequired.length > 0) {
      status = 'unhealthy'
    } else {
      status = 'degraded'
    }
  }

  return {
    status,
    timestamp: new Date().toISOString(),
    environment: envStatus
  }
}

// Note: Auto-initialization removed to avoid Edge Runtime compatibility issues
// Initialization will happen when services are first used