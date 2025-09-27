/**
 * Secure logging service for Tribe MVP
 * Replaces console.log statements with proper logging that sanitizes sensitive data
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error'

export interface LogContext {
  userId?: string
  requestId?: string
  component?: string
  action?: string
  [key: string]: unknown
}

interface LogEntry {
  level: LogLevel
  message: string
  context?: LogContext
  timestamp: string
  environment: string
}

class SecureLogger {
  private isDevelopment = process.env.NODE_ENV === 'development'
  private logLevel: LogLevel = (process.env.LOG_LEVEL as LogLevel) || (this.isDevelopment ? 'debug' : 'warn')

  // Sensitive field patterns to sanitize
  private sensitiveFields = [
    'password', 'token', 'secret', 'key', 'auth', 'authorization',
    'cookie', 'session', 'api_key', 'apikey', 'access_token',
    'refresh_token', 'jwt', 'bearer', 'credentials', 'email',
    'phone', 'ssn', 'credit_card', 'card_number'
  ]

  private shouldLog(level: LogLevel): boolean {
    const levels = ['debug', 'info', 'warn', 'error']
    return levels.indexOf(level) >= levels.indexOf(this.logLevel)
  }

  /**
   * Sanitize sensitive data from log entries
   */
  private sanitizeData(data: unknown): unknown {
    if (typeof data === 'string') {
      // Check if string contains sensitive patterns
      for (const field of this.sensitiveFields) {
        if (data.toLowerCase().includes(field)) {
          return '[REDACTED]'
        }
      }
      return data
    }

    if (typeof data !== 'object' || data === null) {
      return data
    }

    if (Array.isArray(data)) {
      return data.map(item => this.sanitizeData(item))
    }

    const sanitized: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(data)) {
      const keyLower = key.toLowerCase()

      // Check if field name is sensitive
      if (this.sensitiveFields.some(field => keyLower.includes(field))) {
        sanitized[key] = '[REDACTED]'
      } else if (typeof value === 'object') {
        sanitized[key] = this.sanitizeData(value)
      } else {
        sanitized[key] = value
      }
    }

    return sanitized
  }

  /**
   * Format log entry for output
   */
  private formatLogEntry(level: LogLevel, message: string, context?: LogContext): LogEntry {
    return {
      level,
      message,
      context: context ? this.sanitizeData(context) as LogContext : undefined,
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'unknown'
    }
  }

  /**
   * Output log entry (console in development, structured in production)
   */
  private output(logEntry: LogEntry): void {
    if (this.isDevelopment) {
      // Development: human-readable console output
      const timestamp = new Date(logEntry.timestamp).toLocaleTimeString()
      const contextStr = logEntry.context ? ` ${JSON.stringify(logEntry.context)}` : ''

      switch (logEntry.level) {
        case 'debug':
          console.debug(`🐛 [${timestamp}] ${logEntry.message}${contextStr}`)
          break
        case 'info':
          console.info(`ℹ️ [${timestamp}] ${logEntry.message}${contextStr}`)
          break
        case 'warn':
          console.warn(`⚠️ [${timestamp}] ${logEntry.message}${contextStr}`)
          break
        case 'error':
          console.error(`❌ [${timestamp}] ${logEntry.message}${contextStr}`)
          break
      }
    } else {
      // Production: structured JSON logging
      console.log(JSON.stringify(logEntry))
    }
  }

  /**
   * Log debug message
   */
  debug(message: string, context?: LogContext): void {
    if (!this.shouldLog('debug')) return
    this.output(this.formatLogEntry('debug', message, context))
  }

  /**
   * Log info message
   */
  info(message: string, context?: LogContext): void {
    if (!this.shouldLog('info')) return
    this.output(this.formatLogEntry('info', message, context))
  }

  /**
   * Log warning message
   */
  warn(message: string, context?: LogContext): void {
    if (!this.shouldLog('warn')) return
    this.output(this.formatLogEntry('warn', message, context))
  }

  /**
   * Log error message
   */
  error(message: string, context?: LogContext): void {
    if (!this.shouldLog('error')) return
    this.output(this.formatLogEntry('error', message, context))
  }

  /**
   * Log error with stack trace
   */
  errorWithStack(message: string, error: Error, context?: LogContext): void {
    this.error(message, {
      ...context,
      error: {
        name: error.name,
        message: error.message,
        stack: this.isDevelopment ? error.stack : undefined
      }
    })
  }

  /**
   * Create scoped logger for specific component
   */
  scope(component: string): ScopedLogger {
    return new ScopedLogger(this, component)
  }
}

/**
 * Scoped logger for components
 */
class ScopedLogger {
  constructor(
    private logger: SecureLogger,
    private component: string
  ) {}

  debug(message: string, context?: LogContext): void {
    this.logger.debug(message, { ...context, component: this.component })
  }

  info(message: string, context?: LogContext): void {
    this.logger.info(message, { ...context, component: this.component })
  }

  warn(message: string, context?: LogContext): void {
    this.logger.warn(message, { ...context, component: this.component })
  }

  error(message: string, context?: LogContext): void {
    this.logger.error(message, { ...context, component: this.component })
  }

  errorWithStack(message: string, error: Error, context?: LogContext): void {
    this.logger.errorWithStack(message, error, { ...context, component: this.component })
  }
}

// Export singleton logger instance
export const logger = new SecureLogger()

// Export convenience functions
export const createLogger = (component: string) => logger.scope(component)

// Export for compatibility (will be removed after migration)
export const devLog = (message: string, data?: LogContext) => {
  if (process.env.NODE_ENV === 'development') {
    logger.debug(message, data)
  }
}

// Migration helper - marks areas that need console removal
export const MIGRATE_CONSOLE = (oldConsoleCall: string) => {
  logger.warn('Console statement needs migration', { oldCall: oldConsoleCall })
}
