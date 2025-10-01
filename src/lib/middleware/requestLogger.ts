/**
 * Request/Response logging middleware with correlation IDs
 * Provides comprehensive request logging for monitoring and debugging
 */

import { NextRequest, NextResponse } from 'next/server'
import { createLogger } from '@/lib/logger'
import { getCorrelationId } from './errorHandler'

const logger = createLogger('RequestLogger')

/**
 * Configuration for request logging
 */
export interface RequestLogConfig {
  logBody?: boolean
  logHeaders?: boolean
  logResponse?: boolean
  slowRequestThreshold?: number // ms
  excludePaths?: string[]
  sensitiveHeaders?: string[]
}

const defaultConfig: RequestLogConfig = {
  logBody: process.env.NODE_ENV === 'development',
  logHeaders: false,
  logResponse: false,
  slowRequestThreshold: 1000, // 1 second
  excludePaths: ['/api/health', '/_next', '/favicon.ico'],
  sensitiveHeaders: [
    'authorization',
    'cookie',
    'x-api-key',
    'x-auth-token'
  ]
}

/**
 * Get client IP from request
 */
function getClientIP(request: NextRequest): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
    request.headers.get('x-real-ip') ||
    request.ip ||
    'unknown'
  )
}

/**
 * Sanitize headers by redacting sensitive ones
 */
function sanitizeHeaders(
  headers: Headers,
  sensitiveHeaders: string[]
): Record<string, string> {
  const sanitized: Record<string, string> = {}

  headers.forEach((value, key) => {
    if (sensitiveHeaders.some(h => key.toLowerCase().includes(h))) {
      sanitized[key] = '[REDACTED]'
    } else {
      sanitized[key] = value
    }
  })

  return sanitized
}

/**
 * Check if path should be logged
 */
function shouldLog(pathname: string, excludePaths: string[]): boolean {
  return !excludePaths.some(path => pathname.startsWith(path))
}

/**
 * Request logging middleware
 * Logs all incoming requests with correlation IDs
 */
export function withRequestLogger(config: RequestLogConfig = {}) {
  const finalConfig = { ...defaultConfig, ...config }

  return function requestLoggerMiddleware(
    handler: (request: NextRequest, context?: { params?: Record<string, string> }) => Promise<NextResponse>
  ) {
    return async (
      request: NextRequest,
      context?: { params?: Record<string, string> }
    ): Promise<NextResponse> => {
      const startTime = Date.now()
      const correlationId = getCorrelationId(request)
      const pathname = request.nextUrl.pathname

      // Skip logging for excluded paths
      if (!shouldLog(pathname, finalConfig.excludePaths || [])) {
        return handler(request, context)
      }

      // Log incoming request
      const requestLog: Record<string, unknown> = {
        requestId: correlationId,
        method: request.method,
        path: pathname,
        query: Object.fromEntries(request.nextUrl.searchParams),
        ip: getClientIP(request),
        userAgent: request.headers.get('user-agent'),
        referer: request.headers.get('referer')
      }

      // Add headers if configured
      if (finalConfig.logHeaders) {
        requestLog.headers = sanitizeHeaders(
          request.headers,
          finalConfig.sensitiveHeaders || []
        )
      }

      // Add body if configured (be careful with large payloads)
      if (finalConfig.logBody && request.method !== 'GET') {
        try {
          const clonedRequest = request.clone()
          const body = await clonedRequest.text()

          // Only log if body is not too large (< 10KB)
          if (body.length < 10000) {
            try {
              requestLog.body = JSON.parse(body)
            } catch {
              requestLog.body = body.substring(0, 500) // Truncate large non-JSON bodies
            }
          } else {
            requestLog.bodySize = body.length
          }
        } catch (error) {
          logger.debug('Could not parse request body', { requestId: correlationId })
        }
      }

      logger.info('Incoming request', requestLog)

      try {
        // Execute handler
        const response = await handler(request, context)
        const duration = Date.now() - startTime

        // Log response
        const responseLog: Record<string, unknown> = {
          requestId: correlationId,
          method: request.method,
          path: pathname,
          status: response.status,
          duration,
          slow: duration > (finalConfig.slowRequestThreshold || 1000)
        }

        // Log response body if configured (only for errors or in development)
        if (
          finalConfig.logResponse &&
          (response.status >= 400 || process.env.NODE_ENV === 'development')
        ) {
          try {
            const clonedResponse = response.clone()
            const responseBody = await clonedResponse.text()

            if (responseBody.length < 10000) {
              try {
                responseLog.responseBody = JSON.parse(responseBody)
              } catch {
                responseLog.responseBody = responseBody.substring(0, 500)
              }
            }
          } catch {
            // Ignore response parsing errors
          }
        }

        // Determine log level based on status and duration
        if (response.status >= 500) {
          logger.error('Request failed with server error', responseLog)
        } else if (response.status >= 400) {
          logger.warn('Request failed with client error', responseLog)
        } else if (duration > (finalConfig.slowRequestThreshold || 1000)) {
          logger.warn('Slow request detected', responseLog)
        } else {
          logger.info('Request completed', responseLog)
        }

        return response
      } catch (error) {
        const duration = Date.now() - startTime

        logger.error('Request processing error', {
          requestId: correlationId,
          method: request.method,
          path: pathname,
          duration,
          error: error instanceof Error ? error.message : String(error)
        })

        throw error
      }
    }
  }
}

/**
 * Simple request logger for basic logging without configuration
 */
export function logRequest(request: NextRequest, correlationId?: string): void {
  const id = correlationId || getCorrelationId(request)

  logger.info('API request', {
    requestId: id,
    method: request.method,
    path: request.nextUrl.pathname,
    ip: getClientIP(request),
    userAgent: request.headers.get('user-agent')
  })
}

/**
 * Log response with correlation ID
 */
export function logResponse(
  request: NextRequest,
  response: NextResponse,
  duration: number,
  correlationId?: string
): void {
  const id = correlationId || getCorrelationId(request)

  const logData = {
    requestId: id,
    method: request.method,
    path: request.nextUrl.pathname,
    status: response.status,
    duration,
    slow: duration > 1000
  }

  if (response.status >= 500) {
    logger.error('API response (error)', logData)
  } else if (response.status >= 400) {
    logger.warn('API response (client error)', logData)
  } else if (duration > 1000) {
    logger.warn('API response (slow)', logData)
  } else {
    logger.info('API response', logData)
  }
}

/**
 * Combined middleware: error handling + request logging
 * This is the recommended middleware to use for all API routes
 */
export function withApiMiddleware(config?: RequestLogConfig) {
  return function apiMiddleware(
    handler: (request: NextRequest, context?: { params?: Record<string, string> }) => Promise<NextResponse>
  ) {
    // Apply request logger first, then error handler
    const loggerMiddleware = withRequestLogger(config)
    const { withErrorHandler } = require('./errorHandler')

    return withErrorHandler(loggerMiddleware(handler))
  }
}
