/**
 * Supabase Connection Pool Configuration
 *
 * This module provides connection pooling configuration and monitoring for Supabase.
 * It helps prevent connection exhaustion under load and provides visibility into
 * connection pool health.
 *
 * Connection Pooling Architecture:
 * 1. Supabase uses PgBouncer for connection pooling
 * 2. Two connection modes are available:
 *    - Transaction Mode (port 6543): Recommended for most applications
 *    - Session Mode (port 5432): Required for features like prepared statements
 *
 * @see {@link https://supabase.com/docs/guides/database/connecting-to-postgres#connection-pooler Supabase Connection Pooling}
 */

import { createLogger } from '@/lib/logger'
import { getEnv } from '@/lib/env'

const logger = createLogger('connection-pool')

/**
 * Connection pool configuration settings
 */
export interface PoolConfig {
  /** Maximum number of connections in the pool */
  maxConnections: number
  /** Minimum number of idle connections to maintain */
  minConnections: number
  /** Maximum time (ms) to wait for a connection from the pool */
  connectionTimeoutMs: number
  /** Maximum time (ms) a connection can remain idle before being closed */
  idleTimeoutMs: number
  /** Maximum lifetime (ms) of a connection */
  maxLifetimeMs: number
  /** Enable statement timeout to prevent long-running queries */
  statementTimeoutMs: number
  /** Enable query logging for slow queries */
  logSlowQueries: boolean
  /** Threshold (ms) for logging slow queries */
  slowQueryThresholdMs: number
}

/**
 * Connection pool statistics
 */
export interface PoolStats {
  activeConnections: number
  idleConnections: number
  waitingRequests: number
  totalConnections: number
  maxConnections: number
  utilizationPercent: number
  timestamp: number
}

/**
 * Get recommended connection pool configuration based on environment
 */
export function getPoolConfig(): PoolConfig {
  const env = getEnv()
  const isProduction = process.env.NODE_ENV === 'production'

  // Production configuration - optimized for high load
  if (isProduction) {
    return {
      maxConnections: parseInt(env.DATABASE_POOL_MAX || '20', 10),
      minConnections: parseInt(env.DATABASE_POOL_MIN || '5', 10),
      connectionTimeoutMs: parseInt(env.DATABASE_CONNECTION_TIMEOUT || '10000', 10),
      idleTimeoutMs: parseInt(env.DATABASE_IDLE_TIMEOUT || '30000', 10),
      maxLifetimeMs: parseInt(env.DATABASE_MAX_LIFETIME || '1800000', 10), // 30 minutes
      statementTimeoutMs: parseInt(env.DATABASE_STATEMENT_TIMEOUT || '30000', 10),
      logSlowQueries: true,
      slowQueryThresholdMs: parseInt(env.DATABASE_SLOW_QUERY_THRESHOLD || '1000', 10)
    }
  }

  // Development configuration - lower limits for local development
  return {
    maxConnections: parseInt(env.DATABASE_POOL_MAX || '10', 10),
    minConnections: parseInt(env.DATABASE_POOL_MIN || '2', 10),
    connectionTimeoutMs: parseInt(env.DATABASE_CONNECTION_TIMEOUT || '5000', 10),
    idleTimeoutMs: parseInt(env.DATABASE_IDLE_TIMEOUT || '10000', 10),
    maxLifetimeMs: parseInt(env.DATABASE_MAX_LIFETIME || '600000', 10), // 10 minutes
    statementTimeoutMs: parseInt(env.DATABASE_STATEMENT_TIMEOUT || '60000', 10),
    logSlowQueries: env.DATABASE_LOG_SLOW_QUERIES === 'true',
    slowQueryThresholdMs: parseInt(env.DATABASE_SLOW_QUERY_THRESHOLD || '2000', 10)
  }
}

/**
 * Validate connection pool configuration
 */
export function validatePoolConfig(config: PoolConfig): { valid: boolean; errors: string[] } {
  const errors: string[] = []

  if (config.maxConnections < 1) {
    errors.push('maxConnections must be at least 1')
  }

  if (config.minConnections < 0) {
    errors.push('minConnections must be non-negative')
  }

  if (config.minConnections > config.maxConnections) {
    errors.push('minConnections cannot exceed maxConnections')
  }

  if (config.connectionTimeoutMs < 1000) {
    errors.push('connectionTimeoutMs should be at least 1000ms (1 second)')
  }

  if (config.idleTimeoutMs < 5000) {
    errors.push('idleTimeoutMs should be at least 5000ms (5 seconds)')
  }

  if (config.maxLifetimeMs < config.idleTimeoutMs) {
    errors.push('maxLifetimeMs should be greater than idleTimeoutMs')
  }

  if (config.statementTimeoutMs < 1000) {
    errors.push('statementTimeoutMs should be at least 1000ms (1 second)')
  }

  if (config.slowQueryThresholdMs < 100) {
    errors.push('slowQueryThresholdMs should be at least 100ms')
  }

  // Production-specific validations
  if (process.env.NODE_ENV === 'production') {
    if (config.maxConnections < 10) {
      errors.push('Production maxConnections should be at least 10')
    }

    if (config.maxConnections > 100) {
      errors.push('Production maxConnections should not exceed 100 (Supabase limits apply)')
    }
  }

  return {
    valid: errors.length === 0,
    errors
  }
}

/**
 * Get Supabase connection string with pooling configuration
 *
 * @param mode - Connection mode: 'transaction' (pooled) or 'session' (direct)
 * @returns Connection string with appropriate port and parameters
 */
export function getPooledConnectionString(mode: 'transaction' | 'session' = 'transaction'): string {
  const env = getEnv()
  const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL

  if (!supabaseUrl) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL is required for database connection')
  }

  // Extract project reference from Supabase URL
  // Format: https://[PROJECT_REF].supabase.co
  const url = new URL(supabaseUrl)
  const projectRef = url.hostname.split('.')[0]

  // Connection pooler uses different ports:
  // - 6543: Transaction mode (PgBouncer pooling)
  // - 5432: Session mode (direct connection)
  const port = mode === 'transaction' ? 6543 : 5432
  const poolMode = mode === 'transaction' ? 'transaction' : 'session'

  // Use DATABASE_URL if provided, otherwise construct from Supabase URL
  const databaseUrl = env.DATABASE_URL

  if (databaseUrl) {
    // If custom DATABASE_URL is provided, ensure it uses the correct port
    const dbUrl = new URL(databaseUrl)
    dbUrl.port = port.toString()
    dbUrl.searchParams.set('pgbouncer', 'true')
    dbUrl.searchParams.set('pool_mode', poolMode)
    return dbUrl.toString()
  }

  // Construct connection string from Supabase project
  // Format: postgresql://postgres:[PASSWORD]@db.[PROJECT_REF].supabase.co:6543/postgres
  const password = env.SUPABASE_DB_PASSWORD || ''

  if (!password) {
    logger.warn('SUPABASE_DB_PASSWORD not set - connection pooling may not work correctly', {
      hasUrl: !!supabaseUrl,
      hasPassword: false,
      mode
    })
  }

  return `postgresql://postgres:${password}@db.${projectRef}.supabase.co:${port}/postgres?pgbouncer=true&pool_mode=${poolMode}`
}

/**
 * Connection Pool Monitor
 *
 * Tracks connection pool statistics and logs warnings when utilization is high
 */
export class ConnectionPoolMonitor {
  private stats: PoolStats[] = []
  private readonly maxStatsHistory = 100
  private checkInterval: NodeJS.Timeout | null = null
  private config: PoolConfig

  constructor(config?: PoolConfig) {
    this.config = config || getPoolConfig()
  }

  /**
   * Start monitoring connection pool
   */
  startMonitoring(intervalMs: number = 30000): void {
    if (this.checkInterval) {
      logger.warn('Connection pool monitoring already started')
      return
    }

    logger.info('Starting connection pool monitoring', {
      intervalMs,
      maxConnections: this.config.maxConnections
    })

    this.checkInterval = setInterval(() => {
      this.checkPoolHealth()
    }, intervalMs)
  }

  /**
   * Stop monitoring connection pool
   */
  stopMonitoring(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval)
      this.checkInterval = null
      logger.info('Stopped connection pool monitoring')
    }
  }

  /**
   * Record connection pool statistics
   */
  recordStats(stats: Partial<PoolStats>): void {
    const fullStats: PoolStats = {
      activeConnections: stats.activeConnections || 0,
      idleConnections: stats.idleConnections || 0,
      waitingRequests: stats.waitingRequests || 0,
      totalConnections: (stats.activeConnections || 0) + (stats.idleConnections || 0),
      maxConnections: this.config.maxConnections,
      utilizationPercent: 0,
      timestamp: Date.now()
    }

    fullStats.utilizationPercent = (fullStats.totalConnections / fullStats.maxConnections) * 100

    this.stats.push(fullStats)

    // Keep only recent stats
    if (this.stats.length > this.maxStatsHistory) {
      this.stats.shift()
    }

    // Log warnings for high utilization
    if (fullStats.utilizationPercent > 80) {
      logger.warn('High connection pool utilization', {
        utilization: fullStats.utilizationPercent.toFixed(1) + '%',
        active: fullStats.activeConnections,
        idle: fullStats.idleConnections,
        total: fullStats.totalConnections,
        max: fullStats.maxConnections,
        waiting: fullStats.waitingRequests
      })
    }

    // Log errors for connection exhaustion
    if (fullStats.waitingRequests > 0) {
      logger.error('Connection pool exhausted - requests waiting for connections', {
        waiting: fullStats.waitingRequests,
        active: fullStats.activeConnections,
        idle: fullStats.idleConnections,
        max: fullStats.maxConnections
      })
    }
  }

  /**
   * Get current connection pool statistics
   */
  getCurrentStats(): PoolStats | null {
    return this.stats.length > 0 ? this.stats[this.stats.length - 1] : null
  }

  /**
   * Get average utilization over time
   */
  getAverageUtilization(): number {
    if (this.stats.length === 0) return 0

    const sum = this.stats.reduce((acc, stat) => acc + stat.utilizationPercent, 0)
    return sum / this.stats.length
  }

  /**
   * Check pool health and log warnings
   */
  private checkPoolHealth(): void {
    const currentStats = this.getCurrentStats()

    if (!currentStats) {
      return
    }

    const avgUtilization = this.getAverageUtilization()

    logger.debug('Connection pool health check', {
      current: {
        active: currentStats.activeConnections,
        idle: currentStats.idleConnections,
        utilization: currentStats.utilizationPercent.toFixed(1) + '%'
      },
      average: {
        utilization: avgUtilization.toFixed(1) + '%'
      },
      config: {
        max: this.config.maxConnections,
        min: this.config.minConnections
      }
    })

    // Recommend scaling if average utilization is consistently high
    if (avgUtilization > 70) {
      logger.warn('Consider increasing connection pool size', {
        averageUtilization: avgUtilization.toFixed(1) + '%',
        currentMax: this.config.maxConnections,
        recommendedMin: Math.ceil(this.config.maxConnections * 1.5)
      })
    }
  }

  /**
   * Get connection pool statistics for monitoring dashboards
   */
  getMetrics(): {
    current: PoolStats | null
    averageUtilization: number
    maxUtilization: number
    minUtilization: number
    statsCount: number
  } {
    const current = this.getCurrentStats()
    const utilizationValues = this.stats.map(s => s.utilizationPercent)

    return {
      current,
      averageUtilization: this.getAverageUtilization(),
      maxUtilization: utilizationValues.length > 0 ? Math.max(...utilizationValues) : 0,
      minUtilization: utilizationValues.length > 0 ? Math.min(...utilizationValues) : 0,
      statsCount: this.stats.length
    }
  }
}

// Export singleton monitor instance
export const poolMonitor = new ConnectionPoolMonitor()

/**
 * Initialize connection pool monitoring
 */
export function initializePoolMonitoring(): void {
  const config = getPoolConfig()
  const validation = validatePoolConfig(config)

  if (!validation.valid) {
    logger.error('Invalid connection pool configuration', {
      errors: validation.errors
    })
    throw new Error(`Invalid connection pool configuration: ${validation.errors.join(', ')}`)
  }

  logger.info('Connection pool configuration validated', {
    maxConnections: config.maxConnections,
    minConnections: config.minConnections,
    environment: process.env.NODE_ENV
  })

  // Start monitoring in production
  if (process.env.NODE_ENV === 'production') {
    poolMonitor.startMonitoring(30000) // Check every 30 seconds
  }
}
