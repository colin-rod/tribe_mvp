import { z } from 'zod'
import {
  emailSchema,
  sanitizePlainText,
  sanitizeText,
  urlSchema,
} from '@/lib/validation/security'
import { FeedbackType } from './feedback'

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

export type FeedbackData = z.infer<typeof feedbackRequestSchema>

export { FeedbackType }
