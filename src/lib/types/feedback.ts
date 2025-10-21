import { z } from 'zod'
import {
  emailSchema,
  sanitizePlainText,
  sanitizeText,
  urlSchema,
} from '@/lib/validation/security'

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
 * API request body validation schema
 */
const sanitizedDescriptionSchema = z
  .string()
  .max(5000, 'Description is too long (max 5000 characters)')
  .transform((value) => {
    const sanitized = sanitizePlainText(value)
    return sanitized.length > 5000 ? sanitized.slice(0, 5000) : sanitized
  })
  .refine((value) => value.length >= 10, {
    message: 'Please provide at least 10 characters',
  })

const sanitizedUrlSchema = z
  .string()
  .trim()
  .pipe(urlSchema)
  .transform((value) => sanitizeText(value))

const sanitizedEmailSchema = z
  .string()
  .trim()
  .pipe(emailSchema)
  .transform((value) => sanitizeText(value))

const sanitizedTimestampSchema = z
  .string()
  .trim()
  .datetime()
  .transform((value) => sanitizeText(value))

const sanitizedScreenshotUrlSchema = z
  .string()
  .trim()
  .pipe(urlSchema)
  .transform((value) => sanitizeText(value))

export const feedbackRequestSchema = z.object({
  type: z.enum([
    FeedbackType.BUG,
    FeedbackType.FEATURE_REQUEST,
    FeedbackType.UX_ISSUE,
    FeedbackType.OTHER,
  ]),
  description: sanitizedDescriptionSchema,
  pageUrl: sanitizedUrlSchema,
  userEmail: sanitizedEmailSchema.optional(),
  timestamp: sanitizedTimestampSchema,
  screenshotUrls: z.array(sanitizedScreenshotUrlSchema).optional(),
})

/**
 * Complete feedback data with auto-captured metadata
 */
export type FeedbackData = z.infer<typeof feedbackRequestSchema>

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
