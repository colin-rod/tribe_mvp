/**
 * Connection Resilience Utilities
 *
 * Provides retry logic, circuit breaker, and error handling for database connections.
 * Helps prevent cascading failures and improves application resilience.
 */

import { createLogger } from '@/lib/logger'
import { PostgrestError } from '@supabase/supabase-js'

const logger = createLogger('connection-resilience')

/**
 * Connection error types
 */
export enum ConnectionErrorType {
  TIMEOUT = 'TIMEOUT',
  CONNECTION_REFUSED = 'CONNECTION_REFUSED',
  CONNECTION_POOL_EXHAUSTED = 'CONNECTION_POOL_EXHAUSTED',
  NETWORK_ERROR = 'NETWORK_ERROR',
  AUTH_ERROR = 'AUTH_ERROR',
  RATE_LIMIT = 'RATE_LIMIT',
  UNKNOWN = 'UNKNOWN'
}

/**
 * Retry configuration options
 */
export interface RetryOptions {
  /** Maximum number of retry attempts */
  maxAttempts: number
  /** Initial delay between retries (ms) */
  initialDelayMs: number
  /** Maximum delay between retries (ms) */
  maxDelayMs: number
  /** Multiplier for exponential backoff */
  backoffMultiplier: number
  /** Errors that should trigger a retry */
  retryableErrors: ConnectionErrorType[]
  /** Optional callback before retry */
  onRetry?: (attempt: number, error: Error) => void
}

/**
 * Circuit breaker states
 */
export enum CircuitState {
  CLOSED = 'CLOSED', // Normal operation
  OPEN = 'OPEN', // Failing, rejecting requests
  HALF_OPEN = 'HALF_OPEN' // Testing if service recovered
}

/**
 * Circuit breaker configuration
 */
export interface CircuitBreakerConfig {
  /** Number of failures before opening circuit */
  failureThreshold: number
  /** Time (ms) to wait before attempting to close circuit */
  resetTimeoutMs: number
  /** Number of successful requests needed to close circuit from half-open */
  successThreshold: number
}

/**
 * Default retry configuration
 */
export const DEFAULT_RETRY_OPTIONS: RetryOptions = {
  maxAttempts: 3,
  initialDelayMs: 1000,
  maxDelayMs: 10000,
  backoffMultiplier: 2,
  retryableErrors: [
    ConnectionErrorType.TIMEOUT,
    ConnectionErrorType.CONNECTION_REFUSED,
    ConnectionErrorType.NETWORK_ERROR
  ]
}

/**
 * Classify connection errors
 */
export function classifyConnectionError(error: unknown): ConnectionErrorType {
  if (!error) return ConnectionErrorType.UNKNOWN

  const errorMessage = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase()
  const postgrestError = error as PostgrestError

  // Check PostgrestError codes
  if (postgrestError.code) {
    switch (postgrestError.code) {
      case 'PGRST301':
      case 'PGRST302':
        return ConnectionErrorType.AUTH_ERROR
      case '08000':
      case '08003':
      case '08006':
        return ConnectionErrorType.CONNECTION_REFUSED
      case '57014':
        return ConnectionErrorType.TIMEOUT
      default:
        break
    }
  }

  // Check error message patterns
  if (errorMessage.includes('timeout') || errorMessage.includes('timed out')) {
    return ConnectionErrorType.TIMEOUT
  }

  if (errorMessage.includes('econnrefused') || errorMessage.includes('connection refused')) {
    return ConnectionErrorType.CONNECTION_REFUSED
  }

  if (errorMessage.includes('too many connections') || errorMessage.includes('pool exhausted')) {
    return ConnectionErrorType.CONNECTION_POOL_EXHAUSTED
  }

  if (errorMessage.includes('network') || errorMessage.includes('enotfound') || errorMessage.includes('econnreset')) {
    return ConnectionErrorType.NETWORK_ERROR
  }

  if (errorMessage.includes('unauthorized') || errorMessage.includes('forbidden') || errorMessage.includes('jwt')) {
    return ConnectionErrorType.AUTH_ERROR
  }

  if (errorMessage.includes('rate limit') || errorMessage.includes('too many requests')) {
    return ConnectionErrorType.RATE_LIMIT
  }

  return ConnectionErrorType.UNKNOWN
}

/**
 * Check if an error is retryable
 */
export function isRetryableError(error: unknown, retryableErrors: ConnectionErrorType[]): boolean {
  const errorType = classifyConnectionError(error)
  return retryableErrors.includes(errorType)
}

/**
 * Calculate delay for exponential backoff with jitter
 */
function calculateBackoffDelay(
  attempt: number,
  initialDelayMs: number,
  maxDelayMs: number,
  backoffMultiplier: number
): number {
  const exponentialDelay = initialDelayMs * Math.pow(backoffMultiplier, attempt - 1)
  const cappedDelay = Math.min(exponentialDelay, maxDelayMs)

  // Add jitter (±20%) to prevent thundering herd
  const jitter = cappedDelay * 0.2 * (Math.random() * 2 - 1)

  return Math.max(0, cappedDelay + jitter)
}

/**
 * Sleep for specified milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * Execute function with retry logic
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: Partial<RetryOptions> = {}
): Promise<T> {
  const opts: RetryOptions = { ...DEFAULT_RETRY_OPTIONS, ...options }
  let lastError: Error | unknown

  for (let attempt = 1; attempt <= opts.maxAttempts; attempt++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error

      const errorType = classifyConnectionError(error)
      const isRetryable = isRetryableError(error, opts.retryableErrors)

      logger.warn('Database operation failed', {
        attempt,
        maxAttempts: opts.maxAttempts,
        errorType,
        isRetryable,
        error: error instanceof Error ? error.message : String(error)
      })

      // Don't retry if error is not retryable or max attempts reached
      if (!isRetryable || attempt >= opts.maxAttempts) {
        logger.error('Database operation failed after retries', {
          attempts: attempt,
          errorType,
          error: error instanceof Error ? error.message : String(error)
        })
        throw error
      }

      // Call onRetry callback if provided
      if (opts.onRetry && error instanceof Error) {
        opts.onRetry(attempt, error)
      }

      // Calculate and apply backoff delay
      const delayMs = calculateBackoffDelay(
        attempt,
        opts.initialDelayMs,
        opts.maxDelayMs,
        opts.backoffMultiplier
      )

      logger.debug('Retrying database operation', {
        attempt,
        nextAttempt: attempt + 1,
        delayMs: Math.round(delayMs)
      })

      await sleep(delayMs)
    }
  }

  throw lastError
}

/**
 * Circuit Breaker Implementation
 *
 * Prevents cascading failures by failing fast when error rate is high
 */
export class CircuitBreaker {
  private state: CircuitState = CircuitState.CLOSED
  private failureCount = 0
  private successCount = 0
  private lastFailureTime: number | null = null
  private readonly config: CircuitBreakerConfig

  constructor(config: Partial<CircuitBreakerConfig> = {}) {
    this.config = {
      failureThreshold: config.failureThreshold || 5,
      resetTimeoutMs: config.resetTimeoutMs || 60000,
      successThreshold: config.successThreshold || 2
    }

    logger.info('Circuit breaker initialized', {
      failureThreshold: this.config.failureThreshold,
      resetTimeoutMs: this.config.resetTimeoutMs,
      successThreshold: this.config.successThreshold
    })
  }

  /**
   * Execute function with circuit breaker protection
   */
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    // Check if circuit should transition from OPEN to HALF_OPEN
    if (this.state === CircuitState.OPEN) {
      const timeSinceLastFailure = Date.now() - (this.lastFailureTime || 0)

      if (timeSinceLastFailure >= this.config.resetTimeoutMs) {
        logger.info('Circuit breaker transitioning to HALF_OPEN', {
          timeSinceLastFailure,
          resetTimeout: this.config.resetTimeoutMs
        })
        this.state = CircuitState.HALF_OPEN
        this.successCount = 0
      } else {
        const error = new Error('Circuit breaker is OPEN')
        logger.warn('Circuit breaker rejecting request', {
          state: this.state,
          failureCount: this.failureCount,
          timeSinceLastFailure
        })
        throw error
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

  /**
   * Handle successful execution
   */
  private onSuccess(): void {
    if (this.state === CircuitState.HALF_OPEN) {
      this.successCount++

      logger.debug('Circuit breaker success in HALF_OPEN', {
        successCount: this.successCount,
        successThreshold: this.config.successThreshold
      })

      if (this.successCount >= this.config.successThreshold) {
        logger.info('Circuit breaker closing - service recovered', {
          successCount: this.successCount
        })
        this.state = CircuitState.CLOSED
        this.failureCount = 0
        this.successCount = 0
        this.lastFailureTime = null
      }
    } else if (this.state === CircuitState.CLOSED) {
      // Reset failure count on success
      this.failureCount = 0
    }
  }

  /**
   * Handle failed execution
   */
  private onFailure(): void {
    this.failureCount++
    this.lastFailureTime = Date.now()

    if (this.state === CircuitState.HALF_OPEN) {
      logger.warn('Circuit breaker reopening - service still failing', {
        failureCount: this.failureCount
      })
      this.state = CircuitState.OPEN
      this.successCount = 0
    } else if (this.state === CircuitState.CLOSED) {
      if (this.failureCount >= this.config.failureThreshold) {
        logger.error('Circuit breaker opening - failure threshold reached', {
          failureCount: this.failureCount,
          threshold: this.config.failureThreshold
        })
        this.state = CircuitState.OPEN
      }
    }
  }

  /**
   * Get current circuit breaker state
   */
  getState(): CircuitState {
    return this.state
  }

  /**
   * Get circuit breaker metrics
   */
  getMetrics(): {
    state: CircuitState
    failureCount: number
    successCount: number
    lastFailureTime: number | null
  } {
    return {
      state: this.state,
      failureCount: this.failureCount,
      successCount: this.successCount,
      lastFailureTime: this.lastFailureTime
    }
  }

  /**
   * Reset circuit breaker to initial state
   */
  reset(): void {
    logger.info('Circuit breaker manually reset')
    this.state = CircuitState.CLOSED
    this.failureCount = 0
    this.successCount = 0
    this.lastFailureTime = null
  }
}

/**
 * Global circuit breaker instance for database operations
 */
export const databaseCircuitBreaker = new CircuitBreaker({
  failureThreshold: 5,
  resetTimeoutMs: 60000,
  successThreshold: 2
})

/**
 * Wrapper that combines retry logic with circuit breaker
 */
export async function executeWithResilience<T>(
  fn: () => Promise<T>,
  options: Partial<RetryOptions> = {}
): Promise<T> {
  return databaseCircuitBreaker.execute(() => withRetry(fn, options))
}
