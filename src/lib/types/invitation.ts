/**
 * Invitation System Types
 * CRO-242: Support for single-use and reusable invitation links
 */

/**
 * Invitation types
 */
export type InvitationType = 'single_use' | 'reusable'

/**
 * Invitation status
 */
export type InvitationStatus = 'active' | 'revoked' | 'used'

/**
 * Communication channels for invitations
 */
export type InvitationChannel = 'email' | 'sms' | 'whatsapp' | 'link'

/**
 * Core invitation record from database
 */
export interface Invitation {
  id: string
  parent_id: string
  invitation_type: InvitationType
  token: string
  status: InvitationStatus
  channel: InvitationChannel | null
  recipient_email: string | null
  recipient_phone: string | null
  expires_at: string | null
  group_id: string | null
  custom_message: string | null
  use_count: number
  metadata: Record<string, unknown>
  created_at: string
  updated_at: string
}

/**
 * Invitation with additional computed/joined data
 */
export interface InvitationWithDetails extends Invitation {
  parent_name?: string
  group_name?: string
  redemptions?: InvitationRedemption[]
  is_expired?: boolean
  is_valid?: boolean
}

/**
 * Invitation redemption record
 */
export interface InvitationRedemption {
  id: string
  invitation_id: string
  recipient_id: string
  redeemed_at: string
  ip_address: string | null
  user_agent: string | null
}

/**
 * Redemption with recipient details
 */
export interface InvitationRedemptionWithRecipient extends InvitationRedemption {
  recipient_name?: string
  recipient_email?: string
  recipient_phone?: string
}

/**
 * Data for creating a single-use invitation
 */
export interface CreateSingleUseInvitationData {
  parentId: string
  email?: string
  phone?: string
  channel: 'email' | 'sms' | 'whatsapp'
  groupId?: string
  customMessage?: string
  expiresInDays?: number // Default 7 days
}

/**
 * Data for creating a reusable link
 */
export interface CreateReusableLinkData {
  parentId: string
  groupId?: string
  customMessage?: string
  qrCodeSettings?: QRCodeSettings
}

/**
 * QR code customization settings
 */
export interface QRCodeSettings {
  size?: number // Default 512
  foregroundColor?: string // Default '#000000'
  backgroundColor?: string // Default '#FFFFFF'
  errorCorrectionLevel?: 'L' | 'M' | 'Q' | 'H' // Default 'M'
  margin?: number // Default 4
}

/**
 * Invitation validation result
 */
export interface InvitationValidationResult {
  invitation_id: string | null
  parent_id: string | null
  invitation_type: InvitationType | null
  status: InvitationStatus | null
  channel: InvitationChannel | null
  recipient_email: string | null
  recipient_phone: string | null
  expires_at: string | null
  group_id: string | null
  custom_message: string | null
  use_count: number | null
  is_valid: boolean
  validation_message: string
  parent_name?: string
  baby_name?: string
}

/**
 * Data submitted when redeeming an invitation
 */
export interface RedeemInvitationData {
  name: string
  email?: string
  phone?: string
  relationship: 'grandparent' | 'parent' | 'sibling' | 'friend' | 'family' | 'colleague' | 'other'
  frequency?: 'every_update' | 'daily_digest' | 'weekly_digest' | 'milestones_only'
  preferred_channels?: ('email' | 'sms' | 'whatsapp')[]
  content_types?: ('photos' | 'text' | 'milestones')[]
  ip_address?: string
  user_agent?: string
}

/**
 * Result of invitation redemption
 */
export interface InvitationRedemptionResult {
  success: boolean
  recipient?: {
    id: string
    name: string
    email: string | null
    phone: string | null
    preference_token: string
  }
  redemption?: {
    id: string
    redeemed_at: string
  }
  error?: string
}

/**
 * Invitation statistics
 */
export interface InvitationStats {
  total_invitations: number
  active_single_use: number
  active_reusable: number
  total_redemptions: number
  redemptions_this_week: number
  redemptions_by_channel: {
    email: number
    sms: number
    whatsapp: number
    link: number
  }
}

/**
 * Statistics for a specific reusable link
 */
export interface ReusableLinkStats {
  invitation_id: string
  use_count: number
  created_at: string
  recent_redemptions: InvitationRedemptionWithRecipient[]
  redemptions_by_day: Array<{
    date: string
    count: number
  }>
}

/**
 * Filters for querying invitations
 */
export interface InvitationFilters {
  type?: InvitationType
  status?: InvitationStatus
  channel?: InvitationChannel
  search?: string // Search by email/phone/token
}

/**
 * Options for sending an invitation
 */
export interface SendInvitationOptions {
  invitationId: string
  templateData?: Record<string, unknown>
}

/**
 * Result of sending an invitation
 */
export interface SendInvitationResult {
  success: boolean
  messageId?: string
  error?: string
  channel: InvitationChannel
}

/**
 * QR code generation options
 */
export interface QRCodeGenerationOptions {
  format?: 'png' | 'svg'
  size?: number
  foregroundColor?: string
  backgroundColor?: string
  errorCorrectionLevel?: 'L' | 'M' | 'Q' | 'H'
  margin?: number
}

/**
 * QR code generation result
 */
export interface QRCodeResult {
  success: boolean
  data?: string // Base64 encoded image data or SVG string
  contentType?: string // 'image/png' or 'image/svg+xml'
  error?: string
}
