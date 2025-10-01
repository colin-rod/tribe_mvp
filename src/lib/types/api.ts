/**
 * Standardized API response types for consistent error handling
 * and response formats across all endpoints
 */

import { z } from 'zod'

/**
 * Standard error codes for API responses
 */
export enum ApiErrorCode {
  // Client errors (4xx)
  BAD_REQUEST = 'BAD_REQUEST',
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  NOT_FOUND = 'NOT_FOUND',
  METHOD_NOT_ALLOWED = 'METHOD_NOT_ALLOWED',
  CONFLICT = 'CONFLICT',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',

  // Server errors (5xx)
  INTERNAL_SERVER_ERROR = 'INTERNAL_SERVER_ERROR',
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',
  DATABASE_ERROR = 'DATABASE_ERROR',
  EXTERNAL_SERVICE_ERROR = 'EXTERNAL_SERVICE_ERROR',
}

/**
 * Map error codes to HTTP status codes
 */
export const ErrorCodeToStatus: Record<ApiErrorCode, number> = {
  [ApiErrorCode.BAD_REQUEST]: 400,
  [ApiErrorCode.UNAUTHORIZED]: 401,
  [ApiErrorCode.FORBIDDEN]: 403,
  [ApiErrorCode.NOT_FOUND]: 404,
  [ApiErrorCode.METHOD_NOT_ALLOWED]: 405,
  [ApiErrorCode.CONFLICT]: 409,
  [ApiErrorCode.VALIDATION_ERROR]: 422,
  [ApiErrorCode.RATE_LIMIT_EXCEEDED]: 429,
  [ApiErrorCode.INTERNAL_SERVER_ERROR]: 500,
  [ApiErrorCode.SERVICE_UNAVAILABLE]: 503,
  [ApiErrorCode.DATABASE_ERROR]: 500,
  [ApiErrorCode.EXTERNAL_SERVICE_ERROR]: 502,
}

/**
 * Validation error detail
 */
export interface ValidationError {
  field: string
  message: string
  code?: string
}

/**
 * Standard error response format
 */
export interface ApiErrorResponse {
  success: false
  error: {
    code: ApiErrorCode
    message: string
    details?: ValidationError[] | Record<string, unknown>
    requestId?: string
    timestamp?: string
    path?: string
  }
}

/**
 * Standard success response format
 */
export interface ApiSuccessResponse<T = unknown> {
  success: true
  data: T
  requestId?: string
  timestamp?: string
  meta?: {
    page?: number
    limit?: number
    total?: number
    [key: string]: unknown
  }
}

/**
 * Generic API response type
 */
export type ApiResponse<T = unknown> = ApiSuccessResponse<T> | ApiErrorResponse

/**
 * Rate limit information
 */
export interface RateLimitInfo {
  limit: number
  remaining: number
  reset: number
  retryAfter?: number
}

/**
 * Health check response
 */
export interface HealthCheckResponse {
  status: 'healthy' | 'degraded' | 'unhealthy'
  timestamp: string
  version?: string
  uptime?: number
  services?: {
    [key: string]: {
      status: 'up' | 'down' | 'degraded'
      latency?: number
      message?: string
    }
  }
}

/**
 * Zod schemas for validation
 */
export const apiErrorResponseSchema = z.object({
  success: z.literal(false),
  error: z.object({
    code: z.nativeEnum(ApiErrorCode),
    message: z.string(),
    details: z.union([
      z.array(z.object({
        field: z.string(),
        message: z.string(),
        code: z.string().optional()
      })),
      z.record(z.unknown())
    ]).optional(),
    requestId: z.string().optional(),
    timestamp: z.string().optional(),
    path: z.string().optional()
  })
})

export const apiSuccessResponseSchema = z.object({
  success: z.literal(true),
  data: z.unknown(),
  requestId: z.string().optional(),
  timestamp: z.string().optional(),
  meta: z.record(z.unknown()).optional()
})

/**
 * Helper to create standardized error response
 */
export function createErrorResponse(
  code: ApiErrorCode,
  message: string,
  options?: {
    details?: ValidationError[] | Record<string, unknown>
    requestId?: string
    path?: string
  }
): ApiErrorResponse {
  return {
    success: false,
    error: {
      code,
      message,
      details: options?.details,
      requestId: options?.requestId,
      timestamp: new Date().toISOString(),
      path: options?.path
    }
  }
}

/**
 * Helper to create standardized success response
 */
export function createSuccessResponse<T>(
  data: T,
  options?: {
    requestId?: string
    meta?: Record<string, unknown>
  }
): ApiSuccessResponse<T> {
  return {
    success: true,
    data,
    requestId: options?.requestId,
    timestamp: new Date().toISOString(),
    meta: options?.meta
  }
}

/**
 * Convert Zod error to validation errors
 */
export function zodErrorToValidationErrors(error: z.ZodError): ValidationError[] {
  return error.errors.map(err => ({
    field: err.path.join('.'),
    message: err.message,
    code: err.code
  }))
}
