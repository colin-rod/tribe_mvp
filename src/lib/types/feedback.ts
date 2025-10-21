import { z } from 'zod'

/**
 * Feedback types for categorization
 */
export const FeedbackType = {
  BUG: 'Bug',
  FEATURE_REQUEST: 'Feature Request',
  UX_ISSUE: 'UX Issue',
  OTHER: 'Other',
} as const

export type FeedbackTypeValue = (typeof FeedbackType)[keyof typeof FeedbackType]

/**
 * Form data submitted by user
 */
export interface FeedbackFormData {
  type: FeedbackTypeValue
  description: string
  screenshots?: File[]
}

/**
 * Form validation schema (client-side)
 */
export const feedbackFormSchema = z.object({
  type: z.enum([
    FeedbackType.BUG,
    FeedbackType.FEATURE_REQUEST,
    FeedbackType.UX_ISSUE,
    FeedbackType.OTHER,
  ]),
  description: z
    .string()
    .min(10, 'Please provide at least 10 characters')
    .max(5000, 'Description is too long (max 5000 characters)'),
})

/**
 * API response types
 */
export interface FeedbackSuccessResponse {
  success: true
  message: string
}

export interface FeedbackErrorResponse {
  success: false
  error: string
  details?: unknown
}

export type FeedbackResponse = FeedbackSuccessResponse | FeedbackErrorResponse
