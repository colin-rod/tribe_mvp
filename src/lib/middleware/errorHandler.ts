/**
 * Global error handling middleware for API routes
 * Provides consistent error responses, correlation IDs, and logging
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createLogger } from '@/lib/logger'
import {
  ApiErrorCode,
  ErrorCodeToStatus,
  createErrorResponse,
  zodErrorToValidationErrors,
  type ApiErrorResponse
} from '@/lib/types/api'
import { randomUUID } from 'crypto'

const logger = createLogger('ErrorHandler')

/**
 * Known error types that can be automatically mapped
 */
export class ApiError extends Error {
  constructor(
    public code: ApiErrorCode,
    message: string,
    public details?: unknown,
    public statusCode?: number
  ) {
    super(message)
    this.name = 'ApiError'
    this.statusCode = statusCode || ErrorCodeToStatus[code]
  }
}

/**
 * Generate correlation ID for request tracking
 */
export function generateCorrelationId(): string {
  return randomUUID()
}

/**
 * Extract correlation ID from request or generate new one
 */
export function getCorrelationId(request: NextRequest): string {
  return request.headers.get('x-correlation-id') ||
         request.headers.get('x-request-id') ||
         generateCorrelationId()
}

/**
 * Global error handler wrapper for API routes
 * Catches all errors and returns standardized error responses
 */
export function withErrorHandler(
  handler: (request: NextRequest, context?: { params?: Record<string, string> }) => Promise<NextResponse>
) {
  return async (
    request: NextRequest,
    context?: { params?: Record<string, string> }
  ): Promise<NextResponse> => {
    const correlationId = getCorrelationId(request)
    const startTime = Date.now()

    try {
      // Execute the handler
      const response = await handler(request, context)

      // Add correlation ID to successful responses
      response.headers.set('X-Correlation-ID', correlationId)
      response.headers.set('X-Request-ID', correlationId)

      // Log successful request
      const duration = Date.now() - startTime
      logger.debug('Request completed successfully', {
        requestId: correlationId,
        method: request.method,
        path: request.nextUrl.pathname,
        status: response.status,
        duration,
        userAgent: request.headers.get('user-agent')
      })

      return response
    } catch (error) {
      const duration = Date.now() - startTime

      // Handle different error types
      const errorResponse = handleError(error, {
        requestId: correlationId,
        path: request.nextUrl.pathname,
        method: request.method,
        duration
      })

      // Add correlation ID to error response
      errorResponse.headers.set('X-Correlation-ID', correlationId)
      errorResponse.headers.set('X-Request-ID', correlationId)

      return errorResponse
    }
  }
}

/**
 * Handle different error types and convert to standardized response
 */
function handleError(
  error: unknown,
  context: {
    requestId: string
    path: string
    method: string
    duration: number
  }
): NextResponse<ApiErrorResponse> {
  const { requestId, path, method, duration } = context

  // ApiError - our custom error type
  if (error instanceof ApiError) {
    logger.warn('API error occurred', {
      requestId,
      method,
      path,
      duration,
      code: error.code,
      message: error.message,
      details: error.details
    })

    return NextResponse.json(
      createErrorResponse(error.code, error.message, {
        details: error.details as Record<string, unknown> | undefined,
        requestId,
        path
      }),
      { status: error.statusCode || ErrorCodeToStatus[error.code] }
    )
  }

  // Zod validation errors
  if (error instanceof z.ZodError) {
    const validationErrors = zodErrorToValidationErrors(error)

    logger.warn('Validation error occurred', {
      requestId,
      method,
      path,
      duration,
      errors: validationErrors
    })

    return NextResponse.json(
      createErrorResponse(
        ApiErrorCode.VALIDATION_ERROR,
        'Request validation failed',
        {
          details: validationErrors,
          requestId,
          path
        }
      ),
      { status: 422 }
    )
  }

  // Standard Error objects
  if (error instanceof Error) {
    // Check for common error patterns
    const message = error.message.toLowerCase()

    // Database errors
    if (message.includes('database') || message.includes('postgres') || message.includes('supabase')) {
      logger.error('Database error occurred', {
        requestId,
        method,
        path,
        duration,
        error: error.message,
        stack: error.stack
      })

      return NextResponse.json(
        createErrorResponse(
          ApiErrorCode.DATABASE_ERROR,
          'A database error occurred. Please try again later.',
          { requestId, path }
        ),
        { status: 500 }
      )
    }

    // Network/external service errors
    if (message.includes('fetch') || message.includes('network') || message.includes('econnrefused')) {
      logger.error('External service error occurred', {
        requestId,
        method,
        path,
        duration,
        error: error.message
      })

      return NextResponse.json(
        createErrorResponse(
          ApiErrorCode.EXTERNAL_SERVICE_ERROR,
          'An external service is unavailable. Please try again later.',
          { requestId, path }
        ),
        { status: 502 }
      )
    }

    // Authentication errors
    if (message.includes('unauthorized') || message.includes('unauthenticated')) {
      logger.warn('Unauthorized access attempt', {
        requestId,
        method,
        path,
        duration
      })

      return NextResponse.json(
        createErrorResponse(
          ApiErrorCode.UNAUTHORIZED,
          'Authentication required',
          { requestId, path }
        ),
        { status: 401 }
      )
    }

    // Permission errors
    if (message.includes('forbidden') || message.includes('permission')) {
      logger.warn('Forbidden access attempt', {
        requestId,
        method,
        path,
        duration
      })

      return NextResponse.json(
        createErrorResponse(
          ApiErrorCode.FORBIDDEN,
          'You do not have permission to access this resource',
          { requestId, path }
        ),
        { status: 403 }
      )
    }

    // Not found errors
    if (message.includes('not found')) {
      logger.warn('Resource not found', {
        requestId,
        method,
        path,
        duration
      })

      return NextResponse.json(
        createErrorResponse(
          ApiErrorCode.NOT_FOUND,
          'Resource not found',
          { requestId, path }
        ),
        { status: 404 }
      )
    }

    // Generic error
    logger.error('Unhandled error occurred', {
      requestId,
      method,
      path,
      duration,
      error: error.message,
      stack: error.stack,
      name: error.name
    })

    // Don't expose internal error details in production
    const errorMessage = process.env.NODE_ENV === 'production'
      ? 'An unexpected error occurred. Please try again later.'
      : error.message

    return NextResponse.json(
      createErrorResponse(
        ApiErrorCode.INTERNAL_SERVER_ERROR,
        errorMessage,
        {
          requestId,
          path,
          ...(process.env.NODE_ENV === 'development' && {
            details: {
              name: error.name,
              message: error.message,
              stack: error.stack
            }
          })
        }
      ),
      { status: 500 }
    )
  }

  // Unknown error type
  logger.error('Unknown error type occurred', {
    requestId,
    method,
    path,
    duration,
    error: String(error)
  })

  return NextResponse.json(
    createErrorResponse(
      ApiErrorCode.INTERNAL_SERVER_ERROR,
      'An unexpected error occurred',
      { requestId, path }
    ),
    { status: 500 }
  )
}

/**
 * Error handler for async operations
 * Wraps async functions and converts errors to ApiErrors
 */
export async function handleAsync<T>(
  operation: () => Promise<T>,
  errorCode: ApiErrorCode = ApiErrorCode.INTERNAL_SERVER_ERROR,
  errorMessage: string = 'Operation failed'
): Promise<T> {
  try {
    return await operation()
  } catch (error) {
    if (error instanceof ApiError) {
      throw error
    }

    if (error instanceof z.ZodError) {
      throw new ApiError(
        ApiErrorCode.VALIDATION_ERROR,
        'Validation failed',
        zodErrorToValidationErrors(error)
      )
    }

    if (error instanceof Error) {
      throw new ApiError(errorCode, errorMessage, { originalError: error.message })
    }

    throw new ApiError(errorCode, errorMessage, { originalError: String(error) })
  }
}

/**
 * Create common API errors
 */
export const ApiErrors = {
  badRequest: (message = 'Bad request', details?: unknown) =>
    new ApiError(ApiErrorCode.BAD_REQUEST, message, details),

  unauthorized: (message = 'Authentication required', details?: unknown) =>
    new ApiError(ApiErrorCode.UNAUTHORIZED, message, details),

  forbidden: (message = 'Access forbidden', details?: unknown) =>
    new ApiError(ApiErrorCode.FORBIDDEN, message, details),

  notFound: (message = 'Resource not found', details?: unknown) =>
    new ApiError(ApiErrorCode.NOT_FOUND, message, details),

  conflict: (message = 'Resource conflict', details?: unknown) =>
    new ApiError(ApiErrorCode.CONFLICT, message, details),

  validation: (message = 'Validation failed', details?: unknown) =>
    new ApiError(ApiErrorCode.VALIDATION_ERROR, message, details),

  rateLimit: (message = 'Rate limit exceeded', details?: unknown) =>
    new ApiError(ApiErrorCode.RATE_LIMIT_EXCEEDED, message, details),

  internal: (message = 'Internal server error', details?: unknown) =>
    new ApiError(ApiErrorCode.INTERNAL_SERVER_ERROR, message, details),

  database: (message = 'Database error', details?: unknown) =>
    new ApiError(ApiErrorCode.DATABASE_ERROR, message, details),

  service: (message = 'External service unavailable', details?: unknown) =>
    new ApiError(ApiErrorCode.EXTERNAL_SERVICE_ERROR, message, details),
}
