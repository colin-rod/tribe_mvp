# API Error Handling & Monitoring Guide

This guide covers the standardized error handling, logging, and monitoring system for Tribe MVP APIs.

## Overview

The error handling system provides:

- **Standardized Error Format**: Consistent error responses across all APIs
- **Correlation IDs**: Request tracking across services and logs
- **Automatic Error Handling**: Catches all errors and converts to standard format
- **Request/Response Logging**: Comprehensive logging with performance tracking
- **Type Safety**: Full TypeScript support with Zod validation

## Quick Start

### Basic Usage

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { withApiMiddleware } from '@/lib/middleware/requestLogger'
import { ApiErrors } from '@/lib/middleware/errorHandler'
import { createSuccessResponse } from '@/lib/types/api'

async function handler(request: NextRequest) {
  // Validate input
  const body = await request.json()

  // Throw errors that will be automatically handled
  if (!body.name) {
    throw ApiErrors.badRequest('Name is required')
  }

  // Return success response
  return NextResponse.json(
    createSuccessResponse({ message: 'Success', data: body })
  )
}

// Apply middleware - handles errors and logging automatically
export const POST = withApiMiddleware()(handler)
```

## Error Response Format

All API errors follow this standardized format:

```typescript
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Request validation failed",
    "details": [
      {
        "field": "email",
        "message": "Invalid email format",
        "code": "invalid_string"
      }
    ],
    "requestId": "550e8400-e29b-41d4-a716-446655440000",
    "timestamp": "2025-01-15T10:30:00.000Z",
    "path": "/api/users"
  }
}
```

## Error Codes

Standard error codes with HTTP status mappings:

| Error Code | HTTP Status | Description |
|------------|-------------|-------------|
| `BAD_REQUEST` | 400 | Invalid request format or parameters |
| `UNAUTHORIZED` | 401 | Authentication required |
| `FORBIDDEN` | 403 | Insufficient permissions |
| `NOT_FOUND` | 404 | Resource not found |
| `METHOD_NOT_ALLOWED` | 405 | HTTP method not supported |
| `CONFLICT` | 409 | Resource conflict (duplicate, etc.) |
| `VALIDATION_ERROR` | 422 | Request validation failed |
| `RATE_LIMIT_EXCEEDED` | 429 | Too many requests |
| `INTERNAL_SERVER_ERROR` | 500 | Unexpected server error |
| `DATABASE_ERROR` | 500 | Database operation failed |
| `EXTERNAL_SERVICE_ERROR` | 502 | External service unavailable |
| `SERVICE_UNAVAILABLE` | 503 | Service temporarily unavailable |

## Creating Errors

### Using Helper Methods

```typescript
import { ApiErrors } from '@/lib/middleware/errorHandler'

// Common errors with sensible defaults
throw ApiErrors.badRequest('Invalid input')
throw ApiErrors.unauthorized('Login required')
throw ApiErrors.forbidden('Access denied')
throw ApiErrors.notFound('User not found')
throw ApiErrors.validation('Email is required')
throw ApiErrors.rateLimit('Too many requests')
throw ApiErrors.internal('Something went wrong')

// With additional details
throw ApiErrors.validation('Invalid input', {
  fields: ['email', 'password']
})
```

### Using ApiError Class

```typescript
import { ApiError, ApiErrorCode } from '@/lib/middleware/errorHandler'

throw new ApiError(
  ApiErrorCode.NOT_FOUND,
  'User not found',
  { userId: '123' },  // Optional details
  404                  // Optional custom status code
)
```

### Zod Validation Errors

Zod errors are automatically converted to validation errors:

```typescript
import { z } from 'zod'

const schema = z.object({
  email: z.string().email(),
  age: z.number().min(0).max(150)
})

// This will throw ZodError, which is automatically converted
const data = schema.parse(body)
```

Response:
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Request validation failed",
    "details": [
      {
        "field": "email",
        "message": "Invalid email",
        "code": "invalid_string"
      },
      {
        "field": "age",
        "message": "Number must be less than or equal to 150",
        "code": "too_big"
      }
    ]
  }
}
```

## Correlation IDs

Every request gets a unique correlation ID for tracking:

### Request Header
```
X-Correlation-ID: 550e8400-e29b-41d4-a716-446655440000
```

### Response Headers
```
X-Correlation-ID: 550e8400-e29b-41d4-a716-446655440000
X-Request-ID: 550e8400-e29b-41d4-a716-446655440000
```

### In Logs
All logs include the correlation ID:
```json
{
  "level": "info",
  "message": "Request completed",
  "context": {
    "requestId": "550e8400-e29b-41d4-a716-446655440000",
    "method": "POST",
    "path": "/api/users",
    "status": 200,
    "duration": 145
  }
}
```

### Using in Code
```typescript
import { getCorrelationId } from '@/lib/middleware/errorHandler'

const correlationId = getCorrelationId(request)
logger.info('Processing request', { requestId: correlationId })
```

## Request Logging

### Automatic Logging

The middleware automatically logs:
- Incoming requests (method, path, IP, user agent)
- Outgoing responses (status, duration)
- Errors (with stack traces)
- Slow requests (> 1 second)

### Configuration

```typescript
import { withApiMiddleware } from '@/lib/middleware/requestLogger'

export const POST = withApiMiddleware({
  logBody: true,              // Log request body (dev only by default)
  logHeaders: false,          // Log headers (sensitive data redacted)
  logResponse: false,         // Log response body
  slowRequestThreshold: 1000, // Log warning if request takes > 1000ms
  excludePaths: ['/api/health'], // Don't log these paths
  sensitiveHeaders: ['authorization', 'cookie'] // Headers to redact
})(handler)
```

### Log Levels

Logs are automatically leveled based on:

- **Debug**: Detailed request/response info (dev only)
- **Info**: Successful requests
- **Warn**: Client errors (4xx), slow requests
- **Error**: Server errors (5xx)

### Example Logs

**Incoming Request**
```json
{
  "level": "info",
  "message": "Incoming request",
  "context": {
    "requestId": "550e8400-e29b-41d4-a716-446655440000",
    "method": "POST",
    "path": "/api/users",
    "query": {},
    "ip": "192.168.1.1",
    "userAgent": "Mozilla/5.0..."
  },
  "timestamp": "2025-01-15T10:30:00.000Z"
}
```

**Successful Response**
```json
{
  "level": "info",
  "message": "Request completed",
  "context": {
    "requestId": "550e8400-e29b-41d4-a716-446655440000",
    "method": "POST",
    "path": "/api/users",
    "status": 201,
    "duration": 145,
    "slow": false
  }
}
```

**Error Response**
```json
{
  "level": "error",
  "message": "Request failed with server error",
  "context": {
    "requestId": "550e8400-e29b-41d4-a716-446655440000",
    "method": "POST",
    "path": "/api/users",
    "status": 500,
    "duration": 2341,
    "slow": true
  }
}
```

## Success Responses

### Basic Success Response

```typescript
import { createSuccessResponse } from '@/lib/types/api'

return NextResponse.json(
  createSuccessResponse({
    id: '123',
    name: 'John Doe'
  })
)
```

Response:
```json
{
  "success": true,
  "data": {
    "id": "123",
    "name": "John Doe"
  },
  "requestId": "550e8400-e29b-41d4-a716-446655440000",
  "timestamp": "2025-01-15T10:30:00.000Z"
}
```

### With Pagination Metadata

```typescript
return NextResponse.json(
  createSuccessResponse(
    users,
    {
      meta: {
        page: 1,
        limit: 10,
        total: 100
      }
    }
  )
)
```

Response:
```json
{
  "success": true,
  "data": [...],
  "meta": {
    "page": 1,
    "limit": 10,
    "total": 100
  }
}
```

## Async Error Handling

Wrap async operations for automatic error conversion:

```typescript
import { handleAsync } from '@/lib/middleware/errorHandler'
import { ApiErrorCode } from '@/lib/types/api'

const result = await handleAsync(
  async () => {
    // This can throw any error
    return await database.query('SELECT * FROM users')
  },
  ApiErrorCode.DATABASE_ERROR,
  'Failed to fetch users'
)
```

Any error thrown inside `handleAsync` will be converted to an `ApiError` with the specified code and message.

## Health Check Endpoint

Built-in health check at `/api/health`:

**Request**
```bash
GET /api/health
```

**Response (Healthy)**
```json
{
  "status": "healthy",
  "timestamp": "2025-01-15T10:30:00.000Z",
  "version": "1.0.0",
  "features": {
    "supabaseEnabled": true,
    "emailEnabled": true,
    "linearEnabled": false
  },
  "environment": {
    "nodeEnv": "production",
    "hasSupabaseConfig": true,
    "hasEmailConfig": true,
    "hasLinearConfig": false
  }
}
```

**Response (Unhealthy)**
```json
{
  "status": "unhealthy",
  "timestamp": "2025-01-15T10:30:00.000Z",
  "error": "Health check system failure"
}
```

HTTP Status: `503 Service Unavailable`

## Migration Guide

### Migrating Existing APIs

**Before:**
```typescript
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    if (!body.email) {
      return NextResponse.json(
        { error: 'Email required' },
        { status: 400 }
      )
    }

    const result = await createUser(body)
    return NextResponse.json({ success: true, data: result })
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json(
      { error: 'Internal error' },
      { status: 500 }
    )
  }
}
```

**After:**
```typescript
import { withApiMiddleware } from '@/lib/middleware/requestLogger'
import { ApiErrors } from '@/lib/middleware/errorHandler'
import { createSuccessResponse } from '@/lib/types/api'

async function handler(request: NextRequest) {
  const body = await request.json()

  if (!body.email) {
    throw ApiErrors.badRequest('Email required')
  }

  const result = await createUser(body)
  return NextResponse.json(createSuccessResponse(result))
}

export const POST = withApiMiddleware()(handler)
```

### Benefits

- ✅ No manual try/catch needed
- ✅ Automatic error formatting
- ✅ Correlation IDs in all logs
- ✅ Request/response logging
- ✅ Performance tracking
- ✅ Consistent error format

## Best Practices

### 1. Use Specific Error Codes

```typescript
// ❌ Generic
throw new Error('Something went wrong')

// ✅ Specific
throw ApiErrors.notFound('User not found')
throw ApiErrors.forbidden('Insufficient permissions')
```

### 2. Provide Context in Error Details

```typescript
throw ApiErrors.validation('Invalid input', {
  fields: ['email', 'password'],
  attemptedEmail: email
})
```

### 3. Use Zod for Validation

```typescript
// Automatic validation error formatting
const schema = z.object({
  email: z.string().email(),
  age: z.number().min(0)
})

const data = schema.parse(body) // Throws formatted error
```

### 4. Log Important Events

```typescript
import { createLogger } from '@/lib/logger'

const logger = createLogger('UserAPI')

logger.info('User created', { userId: user.id })
logger.warn('Failed login attempt', { email })
logger.error('Database connection failed', { error })
```

### 5. Use Correlation IDs

```typescript
const correlationId = getCorrelationId(request)

// Pass to external services for distributed tracing
await externalService.call({
  correlationId,
  data: payload
})
```

## Monitoring

### Key Metrics

Monitor these in your logging/APM tool:

- **Error Rate**: Percentage of 5xx responses
- **Response Time**: Average and p95/p99 durations
- **Slow Requests**: Requests > 1 second
- **Error Distribution**: Count by error code
- **Correlation ID**: Track requests across services

### Log Queries

**Find all errors for a user:**
```
requestId:"550e8400-e29b-41d4-a716-446655440000"
```

**Find slow requests:**
```
slow:true AND duration:>1000
```

**Find validation errors:**
```
error.code:"VALIDATION_ERROR"
```

**Find all errors from an IP:**
```
ip:"192.168.1.1" AND level:"error"
```

## Troubleshooting

### Correlation ID Not Appearing

Ensure middleware is applied:
```typescript
export const POST = withApiMiddleware()(handler)
```

### Logs Not Showing

Check `LOG_LEVEL` environment variable:
```bash
LOG_LEVEL=debug npm run dev
```

### Error Not Formatted Correctly

Make sure you're throwing `ApiError` or using helper methods:
```typescript
throw ApiErrors.badRequest('Message')
```

Not:
```typescript
throw new Error('Message') // Will work but less specific
```

## Related Files

- [/src/lib/types/api.ts](../../src/lib/types/api.ts) - Type definitions
- [/src/lib/middleware/errorHandler.ts](../../src/lib/middleware/errorHandler.ts) - Error handling
- [/src/lib/middleware/requestLogger.ts](../../src/lib/middleware/requestLogger.ts) - Request logging
- [/src/app/api/example/route.ts](../../src/app/api/example/route.ts) - Example implementation
- [/src/app/api/health/route.ts](../../src/app/api/health/route.ts) - Health check

## Examples

See [/src/app/api/example/route.ts](../../src/app/api/example/route.ts) for a complete working example demonstrating:
- Request validation with Zod
- Error throwing and handling
- Success responses
- Correlation IDs
- Async error handling
