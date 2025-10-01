/**
 * Example API route demonstrating the new error handling and logging middleware
 * This shows how to use withApiMiddleware for consistent error handling
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { withApiMiddleware } from '@/lib/middleware/requestLogger'
import { ApiErrors, handleAsync } from '@/lib/middleware/errorHandler'
import { createSuccessResponse } from '@/lib/types/api'
import { createLogger } from '@/lib/logger'

const logger = createLogger('ExampleAPI')

// Request validation schema
const exampleRequestSchema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email(),
  age: z.number().int().min(0).max(150).optional()
})

/**
 * Example GET endpoint
 * Shows basic success response with correlation ID
 */
async function handleGet(request: NextRequest) {
  logger.info('Example GET request received')

  // Simulate some processing
  const data = {
    message: 'Hello from example API',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV
  }

  return NextResponse.json(
    createSuccessResponse(data)
  )
}

/**
 * Example POST endpoint
 * Shows validation, error handling, and async operations
 */
async function handlePost(request: NextRequest) {
  // Parse and validate request body
  const body = await request.json()
  const validatedData = exampleRequestSchema.parse(body) // Throws ZodError if invalid

  logger.info('Example POST request validated', {
    name: validatedData.name,
    hasEmail: !!validatedData.email
  })

  // Simulate async operation with error handling
  const result = await handleAsync(
    async () => {
      // Simulate database operation
      await new Promise(resolve => setTimeout(resolve, 100))

      // Simulate potential errors (uncomment to test)
      // throw new Error('Database connection failed')
      // throw ApiErrors.notFound('User not found')
      // throw ApiErrors.forbidden('Insufficient permissions')

      return {
        id: Math.random().toString(36).substring(7),
        ...validatedData,
        createdAt: new Date().toISOString()
      }
    },
    // Error code and message if operation fails
    // ApiErrorCode.DATABASE_ERROR,
    // 'Failed to create user'
  )

  return NextResponse.json(
    createSuccessResponse(result, {
      meta: { created: true }
    }),
    { status: 201 }
  )
}

/**
 * Example of manual error throwing
 */
async function handleDelete(request: NextRequest) {
  const id = request.nextUrl.searchParams.get('id')

  if (!id) {
    throw ApiErrors.badRequest('Missing required parameter: id')
  }

  // Simulate checking if resource exists
  const exists = Math.random() > 0.5

  if (!exists) {
    throw ApiErrors.notFound(`Resource with id ${id} not found`)
  }

  // Simulate permission check
  const hasPermission = Math.random() > 0.3

  if (!hasPermission) {
    throw ApiErrors.forbidden('You do not have permission to delete this resource')
  }

  logger.info('Resource deleted', { id })

  return NextResponse.json(
    createSuccessResponse({ deleted: true, id })
  )
}

/**
 * Main handler with routing
 */
async function handler(request: NextRequest) {
  switch (request.method) {
    case 'GET':
      return handleGet(request)
    case 'POST':
      return handlePost(request)
    case 'DELETE':
      return handleDelete(request)
    default:
      throw ApiErrors.badRequest(`Method ${request.method} not allowed`)
  }
}

// Export with middleware applied
// This automatically adds:
// - Error handling (all errors converted to standard format)
// - Request logging (with correlation IDs)
// - Response logging (with duration tracking)
export const GET = withApiMiddleware()(handler)
export const POST = withApiMiddleware()(handler)
export const DELETE = withApiMiddleware()(handler)
