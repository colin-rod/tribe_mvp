import { NextRequest, NextResponse } from 'next/server'
import { feedbackRequestSchema } from '@/lib/types/feedback'
import { submitFeedbackToLinear } from '@/lib/linear/client'
import { createLogger } from '@/lib/logger'
import { z } from 'zod'

const logger = createLogger('FeedbackAPI')

/**
 * POST /api/feedback - Submit beta feedback
 *
 * Creates a Linear issue under CRO-354 with "beta feedback" label
 * Allows anonymous submissions with no rate limiting
 */
export async function POST(request: NextRequest) {
  try {
    logger.info('Received feedback submission')

    // Parse and validate request body
    const body = await request.json()

    let validatedData
    try {
      validatedData = feedbackRequestSchema.parse(body)
    } catch (error) {
      if (error instanceof z.ZodError) {
        logger.warn('Invalid feedback submission', {
          errors: error.errors,
        })
        return NextResponse.json(
          {
            success: false,
            error: 'Invalid input data',
            details: error.errors,
          },
          { status: 400 }
        )
      }
      throw error
    }

    // Submit to Linear
    const result = await submitFeedbackToLinear(validatedData)

    if (!result.success) {
      logger.error('Failed to submit feedback to Linear', {
        error: result.error,
      })
      return NextResponse.json(
        {
          success: false,
          error: result.error || 'Failed to submit feedback',
        },
        { status: 500 }
      )
    }

    logger.info('Feedback successfully submitted to Linear', {
      issueId: result.issueId,
      type: validatedData.type,
    })

    return NextResponse.json(
      {
        success: true,
        message: 'Thank you for your feedback! We appreciate you helping us improve.',
      },
      { status: 201 }
    )
  } catch (error) {
    logger.errorWithStack('Error processing feedback submission', error as Error)

    return NextResponse.json(
      {
        success: false,
        error: 'An unexpected error occurred while submitting your feedback',
      },
      { status: 500 }
    )
  }
}

/**
 * GET /api/feedback - Health check
 */
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    message: 'Beta Feedback API is operational',
  })
}
