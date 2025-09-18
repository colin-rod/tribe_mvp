import { z } from 'zod'

/**
 * Base schema without refinements for partial updates
 */
const baseRecipientSchema = z.object({
  name: z.string()
    .min(1, 'Name is required')
    .max(100, 'Name must be less than 100 characters')
    .trim(),

  email: z.string()
    .email('Invalid email address')
    .optional()
    .or(z.literal('')),

  phone: z.string()
    .regex(/^[\+]?[1-9][\d]{0,15}$/, 'Invalid phone number')
    .optional()
    .or(z.literal('')),

  relationship: z.enum([
    'grandparent',
    'parent',
    'sibling',
    'friend',
    'family',
    'colleague',
    'other'
  ], {
    errorMap: () => ({ message: 'Please select a valid relationship type' })
  }),

  group_id: z.string().uuid('Invalid group ID').optional(),

  frequency: z.enum([
    'every_update',
    'daily_digest',
    'weekly_digest',
    'milestones_only'
  ]).default('weekly_digest'),

  preferred_channels: z.array(z.enum(['email', 'sms', 'whatsapp']))
    .min(1, 'At least one communication channel is required')
    .default(['email']),

  content_types: z.array(z.enum(['photos', 'text', 'milestones']))
    .min(1, 'At least one content type is required')
    .default(['photos', 'text'])
})

/**
 * Validation schema for adding a new recipient
 * Ensures either email or phone is provided, with proper validation for both
 */
export const addRecipientSchema = baseRecipientSchema.refine((data) => {
  // Ensure at least email or phone is provided
  return (data.email && data.email.trim() !== '') || (data.phone && data.phone.trim() !== '')
}, {
  message: 'Either email or phone number is required',
  path: ['email'] // Show error on email field
}).refine((data) => {
  // If SMS is selected as channel, phone must be provided
  if (data.preferred_channels.includes('sms') || data.preferred_channels.includes('whatsapp')) {
    return data.phone && data.phone.trim() !== ''
  }
  return true
}, {
  message: 'Phone number is required for SMS or WhatsApp notifications',
  path: ['phone']
}).refine((data) => {
  // If email is selected as channel, email must be provided
  if (data.preferred_channels.includes('email')) {
    return data.email && data.email.trim() !== ''
  }
  return true
}, {
  message: 'Email address is required for email notifications',
  path: ['email']
})

/**
 * Validation schema for updating recipient preferences via magic link
 * Used when recipients update their own preferences without authentication
 */
export const updatePreferencesSchema = z.object({
  frequency: z.enum([
    'every_update',
    'daily_digest',
    'weekly_digest',
    'milestones_only'
  ], {
    errorMap: () => ({ message: 'Please select a valid frequency option' })
  }),

  preferred_channels: z.array(z.enum(['email', 'sms', 'whatsapp']))
    .min(1, 'At least one communication channel must be selected'),

  content_types: z.array(z.enum(['photos', 'text', 'milestones']))
    .min(1, 'At least one content type must be selected')
})

/**
 * Validation schema for creating or updating recipient groups
 */
export const recipientGroupSchema = z.object({
  name: z.string()
    .min(1, 'Group name is required')
    .max(50, 'Group name must be less than 50 characters')
    .trim(),

  default_frequency: z.enum([
    'every_update',
    'daily_digest',
    'weekly_digest',
    'milestones_only'
  ]).default('weekly_digest'),

  default_channels: z.array(z.enum(['email', 'sms', 'whatsapp']))
    .min(1, 'At least one default channel is required')
    .default(['email'])
})

/**
 * Validation schema for updating existing recipients
 * Similar to add schema but with optional fields for partial updates
 */
export const updateRecipientSchema = baseRecipientSchema.partial().refine((data) => {
  // If any data is provided, ensure email or phone constraint is still met
  if (data.email !== undefined || data.phone !== undefined) {
    const email = data.email || ''
    const phone = data.phone || ''
    return (email && email.trim() !== '') || (phone && phone.trim() !== '')
  }
  return true
}, {
  message: 'Either email or phone number must be provided',
  path: ['email']
})

// Type exports for use in components
export type AddRecipientFormData = z.infer<typeof addRecipientSchema>
export type UpdatePreferencesFormData = z.infer<typeof updatePreferencesSchema>
export type RecipientGroupFormData = z.infer<typeof recipientGroupSchema>
export type UpdateRecipientFormData = z.infer<typeof updateRecipientSchema>

// Helper constants for form options
export const RELATIONSHIP_OPTIONS = [
  { value: 'grandparent', label: 'Grandparent' },
  { value: 'parent', label: 'Parent' },
  { value: 'sibling', label: 'Sibling' },
  { value: 'friend', label: 'Friend' },
  { value: 'family', label: 'Family Member' },
  { value: 'colleague', label: 'Colleague' },
  { value: 'other', label: 'Other' }
] as const

export const FREQUENCY_OPTIONS = [
  { value: 'every_update', label: 'Every Update', description: 'Get notified immediately for each new update' },
  { value: 'daily_digest', label: 'Daily Digest', description: 'Receive a summary once per day' },
  { value: 'weekly_digest', label: 'Weekly Digest', description: 'Receive a summary once per week' },
  { value: 'milestones_only', label: 'Milestones Only', description: 'Only receive major milestone updates' }
] as const

export const CHANNEL_OPTIONS = [
  { value: 'email', label: 'Email', description: 'Receive updates via email' },
  { value: 'sms', label: 'SMS', description: 'Receive updates via text message' },
  { value: 'whatsapp', label: 'WhatsApp', description: 'Receive updates via WhatsApp' }
] as const

export const CONTENT_TYPE_OPTIONS = [
  { value: 'photos', label: 'Photos', description: 'Include photos in updates' },
  { value: 'text', label: 'Text Updates', description: 'Include text descriptions and stories' },
  { value: 'milestones', label: 'Milestones', description: 'Include milestone achievements and growth tracking' }
] as const

/**
 * Validates an email address format
 */
export function validateEmail(email: string): string | null {
  if (!email || email.trim() === '') return null

  const emailSchema = z.string().email()
  const result = emailSchema.safeParse(email)

  return result.success ? null : 'Invalid email address'
}

/**
 * Validates a phone number format
 */
export function validatePhone(phone: string): string | null {
  if (!phone || phone.trim() === '') return null

  const phoneSchema = z.string().regex(/^[\+]?[1-9][\d]{0,15}$/)
  const result = phoneSchema.safeParse(phone)

  return result.success ? null : 'Invalid phone number format'
}

/**
 * Validates that at least one contact method (email or phone) is provided
 */
export function validateContactMethod(email?: string, phone?: string): string | null {
  const hasEmail = email && email.trim() !== ''
  const hasPhone = phone && phone.trim() !== ''

  if (!hasEmail && !hasPhone) {
    return 'Either email or phone number is required'
  }

  return null
}