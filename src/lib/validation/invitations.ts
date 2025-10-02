/**
 * Validation schemas for invitation system
 * CRO-242: Single-use and reusable invitation links
 */

import { z } from 'zod'

/**
 * Invitation type enum
 */
export const invitationTypeSchema = z.enum(['single_use', 'reusable'])

/**
 * Invitation status enum
 */
export const invitationStatusSchema = z.enum(['active', 'revoked', 'used'])

/**
 * Communication channel enum
 */
export const invitationChannelSchema = z.enum(['email', 'sms', 'whatsapp', 'link'])

/**
 * Relationship types (matches recipients table)
 */
export const relationshipSchema = z.enum([
  'grandparent',
  'parent',
  'sibling',
  'friend',
  'family',
  'colleague',
  'other'
])

/**
 * Frequency options (matches recipients table)
 */
export const frequencySchema = z.enum([
  'every_update',
  'daily_digest',
  'weekly_digest',
  'milestones_only'
])

/**
 * Preferred channels array
 */
export const preferredChannelsSchema = z.array(z.enum(['email', 'sms', 'whatsapp'])).min(1)

/**
 * Content types array
 */
export const contentTypesSchema = z.array(z.enum(['photos', 'text', 'milestones'])).min(1)

/**
 * QR code settings
 */
export const qrCodeSettingsSchema = z.object({
  size: z.number().min(128).max(2048).optional().default(512),
  foregroundColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional().default('#000000'),
  backgroundColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional().default('#FFFFFF'),
  errorCorrectionLevel: z.enum(['L', 'M', 'Q', 'H']).optional().default('M'),
  margin: z.number().min(0).max(10).optional().default(4)
}).optional()

/**
 * Schema for creating a single-use invitation
 */
export const createSingleUseInvitationSchema = z.object({
  email: z.string().email().optional(),
  phone: z.string().regex(/^[\+]?[1-9][\d]{0,15}$/).optional(),
  channel: z.enum(['email', 'sms', 'whatsapp']),
  groupId: z.string().uuid().optional(),
  customMessage: z.string().max(500).optional(),
  expiresInDays: z.number().min(1).max(90).optional().default(7)
}).refine(
  (data) => data.email || data.phone,
  {
    message: 'Either email or phone is required for single-use invitations',
    path: ['email']
  }
).refine(
  (data) => {
    // If channel is email, email must be provided
    if (data.channel === 'email') return !!data.email
    // If channel is sms or whatsapp, phone must be provided
    if (data.channel === 'sms' || data.channel === 'whatsapp') return !!data.phone
    return true
  },
  (data) => ({
    message: `${data.channel === 'email' ? 'Email' : 'Phone'} is required for ${data.channel} channel`,
    path: [data.channel === 'email' ? 'email' : 'phone']
  })
)

export type CreateSingleUseInvitationInput = z.infer<typeof createSingleUseInvitationSchema>

/**
 * Schema for creating a reusable link
 */
export const createReusableLinkSchema = z.object({
  groupId: z.string().uuid().optional(),
  customMessage: z.string().max(500).optional(),
  qrCodeSettings: qrCodeSettingsSchema
})

export type CreateReusableLinkInput = z.infer<typeof createReusableLinkSchema>

/**
 * Schema for redeeming an invitation
 */
export const redeemInvitationSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  email: z.string().email().optional(),
  phone: z.string().regex(/^[\+]?[1-9][\d]{0,15}$/).optional(),
  relationship: relationshipSchema,
  frequency: frequencySchema.optional().default('weekly_digest'),
  preferred_channels: preferredChannelsSchema.optional().default(['email']),
  content_types: contentTypesSchema.optional().default(['photos', 'text']),
  ip_address: z.string().optional(),
  user_agent: z.string().optional()
}).refine(
  (data) => data.email || data.phone,
  {
    message: 'Either email or phone is required',
    path: ['email']
  }
).refine(
  (data) => {
    // If preferred_channels includes email, email must be provided
    if (data.preferred_channels?.includes('email') && !data.email) {
      return false
    }
    // If preferred_channels includes sms/whatsapp, phone must be provided
    if ((data.preferred_channels?.includes('sms') || data.preferred_channels?.includes('whatsapp')) && !data.phone) {
      return false
    }
    return true
  },
  (data) => {
    const hasEmail = data.preferred_channels?.includes('email')
    const hasSMS = data.preferred_channels?.includes('sms') || data.preferred_channels?.includes('whatsapp')

    if (hasEmail && !data.email) {
      return { message: 'Email is required when email is selected as a preferred channel', path: ['email'] }
    }
    if (hasSMS && !data.phone) {
      return { message: 'Phone is required when SMS or WhatsApp is selected as a preferred channel', path: ['phone'] }
    }
    return { message: '', path: [] }
  }
)

export type RedeemInvitationInput = z.infer<typeof redeemInvitationSchema>

/**
 * Schema for invitation filters
 */
export const invitationFiltersSchema = z.object({
  type: invitationTypeSchema.optional(),
  status: invitationStatusSchema.optional(),
  channel: invitationChannelSchema.optional(),
  search: z.string().optional()
})

export type InvitationFiltersInput = z.infer<typeof invitationFiltersSchema>

/**
 * Schema for sending an invitation
 */
export const sendInvitationSchema = z.object({
  invitationId: z.string().uuid(),
  templateData: z.record(z.unknown()).optional()
})

export type SendInvitationInput = z.infer<typeof sendInvitationSchema>

/**
 * Schema for QR code generation options
 */
export const qrCodeGenerationOptionsSchema = z.object({
  format: z.enum(['png', 'svg']).optional().default('png'),
  size: z.number().min(128).max(2048).optional().default(512),
  foregroundColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  backgroundColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  errorCorrectionLevel: z.enum(['L', 'M', 'Q', 'H']).optional(),
  margin: z.number().min(0).max(10).optional()
})

export type QRCodeGenerationOptionsInput = z.infer<typeof qrCodeGenerationOptionsSchema>

/**
 * Schema for updating invitation metadata
 */
export const updateInvitationMetadataSchema = z.object({
  customMessage: z.string().max(500).optional(),
  qrCodeSettings: qrCodeSettingsSchema
})

export type UpdateInvitationMetadataInput = z.infer<typeof updateInvitationMetadataSchema>

/**
 * Helper function to validate email format
 */
export function isValidEmail(email: string): boolean {
  return z.string().email().safeParse(email).success
}

/**
 * Helper function to validate phone format
 */
export function isValidPhone(phone: string): boolean {
  return z.string().regex(/^[\+]?[1-9][\d]{0,15}$/).safeParse(phone).success
}

/**
 * Helper function to validate UUID format
 */
export function isValidUUID(id: string): boolean {
  return z.string().uuid().safeParse(id).success
}

/**
 * Validation error formatter
 */
export function formatValidationErrors(errors: z.ZodError): Record<string, string> {
  const formatted: Record<string, string> = {}

  errors.issues.forEach((issue) => {
    const path = issue.path.join('.')
    formatted[path] = issue.message
  })

  return formatted
}

/**
 * Options for validation display
 */
export const RELATIONSHIP_OPTIONS = [
  { value: 'grandparent', label: 'Grandparent' },
  { value: 'parent', label: 'Parent' },
  { value: 'sibling', label: 'Sibling' },
  { value: 'friend', label: 'Friend' },
  { value: 'family', label: 'Family' },
  { value: 'colleague', label: 'Colleague' },
  { value: 'other', label: 'Other' }
] as const

export const FREQUENCY_OPTIONS = [
  {
    value: 'every_update',
    label: 'Every Update',
    description: 'Get notified immediately for each new update'
  },
  {
    value: 'daily_digest',
    label: 'Daily Digest',
    description: 'Receive a summary once per day'
  },
  {
    value: 'weekly_digest',
    label: 'Weekly Digest',
    description: 'Receive a summary once per week'
  },
  {
    value: 'milestones_only',
    label: 'Milestones Only',
    description: 'Only receive major milestone updates'
  }
] as const

export const CHANNEL_OPTIONS = [
  {
    value: 'email',
    label: 'Email',
    description: 'Receive updates via email',
    icon: '📧'
  },
  {
    value: 'sms',
    label: 'SMS',
    description: 'Receive updates via text message',
    icon: '💬'
  },
  {
    value: 'whatsapp',
    label: 'WhatsApp',
    description: 'Receive updates via WhatsApp',
    icon: '📱'
  }
] as const

export const CONTENT_TYPE_OPTIONS = [
  {
    value: 'photos',
    label: 'Photos',
    description: 'Include photos in updates',
    icon: '📷'
  },
  {
    value: 'text',
    label: 'Stories & Updates',
    description: 'Include written stories and descriptions',
    icon: '📝'
  },
  {
    value: 'milestones',
    label: 'Milestones',
    description: 'Include milestone achievements and growth tracking',
    icon: '🎉'
  }
] as const
