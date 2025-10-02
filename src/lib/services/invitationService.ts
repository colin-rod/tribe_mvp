/**
 * Invitation Service
 * CRO-242: Core business logic for single-use and reusable invitations
 */

import { createClient } from '@/lib/supabase/client'
import { createLogger } from '@/lib/logger'
import type {
  Invitation,
  InvitationWithDetails,
  CreateSingleUseInvitationData,
  CreateReusableLinkData,
  InvitationValidationResult,
  RedeemInvitationData,
  InvitationRedemptionResult,
  InvitationStats,
  ReusableLinkStats,
  InvitationFilters
} from '@/lib/types/invitation'

const logger = createLogger('InvitationService')

/**
 * Generate a cryptographically secure random token
 */
function generateSecureToken(): string {
  // Generate 32 random bytes
  const array = new Uint8Array(32)
  crypto.getRandomValues(array)

  // Convert to base64url (URL-safe)
  return Buffer.from(array)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '')
}

/**
 * Create a single-use invitation
 *
 * @param data - Invitation data
 * @returns Promise resolving to created invitation
 */
export async function createSingleUseInvitation(
  data: CreateSingleUseInvitationData
): Promise<Invitation> {
  const supabase = createClient()

  const {
    parentId,
    email,
    phone,
    channel,
    groupId,
    customMessage,
    expiresInDays = 7
  } = data

  // Validate parent exists
  const { data: parentData, error: parentError } = await supabase
    .from('profiles')
    .select('id, name')
    .eq('id', parentId)
    .single()

  if (parentError || !parentData) {
    throw new Error('Parent not found')
  }

  // Generate secure token
  const token = generateSecureToken()

  // Calculate expiration
  const expiresAt = new Date()
  expiresAt.setDate(expiresAt.getDate() + expiresInDays)

  // Create invitation
  const { data: invitation, error } = await supabase
    .from('invitations')
    .insert({
      parent_id: parentId,
      invitation_type: 'single_use',
      token,
      status: 'active',
      channel,
      recipient_email: email || null,
      recipient_phone: phone || null,
      expires_at: expiresAt.toISOString(),
      group_id: groupId || null,
      custom_message: customMessage || null,
      use_count: 0,
      metadata: {}
    })
    .select()
    .single()

  if (error) {
    logger.errorWithStack('Error creating single-use invitation', error as Error)
    throw new Error('Failed to create invitation')
  }

  logger.info('Created single-use invitation', {
    invitationId: invitation.id,
    channel,
    expiresAt: expiresAt.toISOString()
  })

  return invitation as Invitation
}

/**
 * Create a reusable link
 *
 * @param data - Reusable link data
 * @returns Promise resolving to created invitation
 */
export async function createReusableLink(
  data: CreateReusableLinkData
): Promise<Invitation> {
  const supabase = createClient()

  const { parentId, groupId, customMessage, qrCodeSettings } = data

  // Validate parent exists
  const { data: parentData, error: parentError } = await supabase
    .from('profiles')
    .select('id, name')
    .eq('id', parentId)
    .single()

  if (parentError || !parentData) {
    throw new Error('Parent not found')
  }

  // Generate secure token
  const token = generateSecureToken()

  // Create invitation (no expiration, unlimited uses)
  const { data: invitation, error } = await supabase
    .from('invitations')
    .insert({
      parent_id: parentId,
      invitation_type: 'reusable',
      token,
      status: 'active',
      channel: 'link',
      recipient_email: null,
      recipient_phone: null,
      expires_at: null, // No expiration
      group_id: groupId || null,
      custom_message: customMessage || null,
      use_count: 0,
      metadata: {
        qrCodeSettings: qrCodeSettings || {}
      }
    })
    .select()
    .single()

  if (error) {
    logger.errorWithStack('Error creating reusable link', error as Error)
    throw new Error('Failed to create reusable link')
  }

  logger.info('Created reusable link', {
    invitationId: invitation.id,
    groupId: groupId || 'none'
  })

  return invitation as Invitation
}

/**
 * Validate an invitation token
 *
 * @param token - Invitation token
 * @returns Promise resolving to validation result
 */
export async function validateInvitationToken(
  token: string
): Promise<InvitationValidationResult | null> {
  const supabase = createClient()

  // Call the database function to validate
  const { data, error } = await supabase.rpc('validate_invitation_token', {
    token_param: token
  })

  if (error) {
    logger.errorWithStack('Error validating invitation token', error as Error)
    return null
  }

  if (!data || data.length === 0) {
    return {
      invitation_id: null,
      parent_id: null,
      invitation_type: null,
      status: null,
      channel: null,
      recipient_email: null,
      recipient_phone: null,
      expires_at: null,
      group_id: null,
      custom_message: null,
      use_count: null,
      is_valid: false,
      validation_message: 'Invalid invitation token'
    }
  }

  const validation = data[0]

  // Fetch parent name for display
  if (validation.parent_id) {
    const { data: parentData } = await supabase
      .from('profiles')
      .select('name')
      .eq('id', validation.parent_id)
      .single()

    if (parentData) {
      validation.parent_name = parentData.name
    }
  }

  return validation as InvitationValidationResult
}

/**
 * Redeem an invitation (join as recipient)
 *
 * @param token - Invitation token
 * @param recipientData - Recipient information
 * @returns Promise resolving to redemption result
 */
export async function redeemInvitation(
  token: string,
  recipientData: RedeemInvitationData
): Promise<InvitationRedemptionResult> {
  const supabase = createClient()

  // Validate invitation first
  const validation = await validateInvitationToken(token)

  if (!validation || !validation.is_valid) {
    return {
      success: false,
      error: validation?.validation_message || 'Invalid invitation'
    }
  }

  const invitationId = validation.invitation_id!
  const parentId = validation.parent_id!
  const groupId = validation.group_id

  // Check for duplicate recipient (same email or phone)
  const { data: existingRecipients } = await supabase
    .from('recipients')
    .select('id, email, phone')
    .eq('parent_id', parentId)
    .or(
      recipientData.email
        ? `email.eq.${recipientData.email}`
        : `phone.eq.${recipientData.phone}`
    )

  if (existingRecipients && existingRecipients.length > 0) {
    return {
      success: false,
      error: 'You are already subscribed to these updates'
    }
  }

  // Generate preference token for the new recipient
  const preferenceToken = crypto.randomUUID() + '-' + Date.now().toString(36)

  // Create recipient
  const { data: recipient, error: recipientError } = await supabase
    .from('recipients')
    .insert({
      parent_id: parentId,
      email: recipientData.email || null,
      phone: recipientData.phone || null,
      name: recipientData.name,
      relationship: recipientData.relationship,
      group_id: groupId,
      frequency: recipientData.frequency || 'weekly_digest',
      preferred_channels: recipientData.preferred_channels || ['email'],
      content_types: recipientData.content_types || ['photos', 'text'],
      overrides_group_default: false, // Use group defaults initially
      preference_token: preferenceToken,
      is_active: true
    })
    .select('id, name, email, phone, preference_token')
    .single()

  if (recipientError) {
    logger.errorWithStack('Error creating recipient from invitation', recipientError as Error)
    return {
      success: false,
      error: 'Failed to create recipient'
    }
  }

  // Record redemption
  const { data: redemption, error: redemptionError } = await supabase
    .from('invitation_redemptions')
    .insert({
      invitation_id: invitationId,
      recipient_id: recipient.id,
      redeemed_at: new Date().toISOString(),
      ip_address: recipientData.ip_address || null,
      user_agent: recipientData.user_agent || null
    })
    .select('id, redeemed_at')
    .single()

  if (redemptionError) {
    logger.warn('Error recording invitation redemption', { error: redemptionError })
    // Don't fail the whole operation if redemption tracking fails
  }

  // Update invitation based on type
  if (validation.invitation_type === 'single_use') {
    // Mark as used
    const { error: updateError } = await supabase.rpc('mark_invitation_used', {
      invitation_id_param: invitationId
    })

    if (updateError) {
      logger.warn('Error marking invitation as used', { error: updateError })
    }
  } else {
    // Increment use count for reusable
    const { error: updateError } = await supabase.rpc('increment_invitation_use_count', {
      invitation_id_param: invitationId
    })

    if (updateError) {
      logger.warn('Error incrementing invitation use count', { error: updateError })
    }
  }

  logger.info('Invitation redeemed successfully', {
    invitationId,
    recipientId: recipient.id,
    invitationType: validation.invitation_type
  })

  return {
    success: true,
    recipient: {
      id: recipient.id,
      name: recipient.name,
      email: recipient.email,
      phone: recipient.phone,
      preference_token: recipient.preference_token
    },
    redemption: redemption ? {
      id: redemption.id,
      redeemed_at: redemption.redeemed_at
    } : undefined
  }
}

/**
 * Revoke an invitation
 *
 * @param invitationId - Invitation ID
 * @param parentId - Parent ID (for authorization)
 * @returns Promise resolving to result with success status and invitation
 */
export async function revokeInvitation(
  invitationId: string,
  parentId: string
): Promise<{ success: boolean; invitation?: Invitation; error?: string }> {
  const supabase = createClient()

  const { data, error } = await supabase.rpc('revoke_invitation', {
    invitation_id_param: invitationId,
    parent_id_param: parentId
  })

  if (error) {
    logger.errorWithStack('Error revoking invitation', error as Error)
    return {
      success: false,
      error: 'Failed to revoke invitation'
    }
  }

  if (!data) {
    return {
      success: false,
      error: 'Invitation not found or already revoked'
    }
  }

  // Fetch the updated invitation
  const invitation = await getInvitationById(invitationId, parentId)

  logger.info('Invitation revoked', { invitationId })

  return {
    success: true,
    invitation: invitation || undefined
  }
}

/**
 * Get all invitations for a parent
 *
 * @param parentId - Parent ID
 * @param filters - Optional filters
 * @returns Promise resolving to invitations
 */
export async function getUserInvitations(
  parentId: string,
  filters?: InvitationFilters
): Promise<InvitationWithDetails[]> {
  const supabase = createClient()

  let query = supabase
    .from('invitations')
    .select(`
      *,
      recipient_groups(id, name)
    `)
    .eq('parent_id', parentId)
    .order('created_at', { ascending: false })

  // Apply filters
  if (filters?.type) {
    query = query.eq('invitation_type', filters.type)
  }

  if (filters?.status) {
    query = query.eq('status', filters.status)
  }

  if (filters?.channel) {
    query = query.eq('channel', filters.channel)
  }

  if (filters?.search) {
    query = query.or(
      `token.ilike.%${filters.search}%,recipient_email.ilike.%${filters.search}%,recipient_phone.ilike.%${filters.search}%`
    )
  }

  const { data, error } = await query

  if (error) {
    logger.errorWithStack('Error fetching user invitations', error as Error)
    throw new Error('Failed to fetch invitations')
  }

  // Add computed fields
  const invitations: InvitationWithDetails[] = (data || []).map((inv) => ({
    ...inv,
    group_name: inv.recipient_groups?.name,
    is_expired: inv.expires_at ? new Date(inv.expires_at) < new Date() : false,
    is_valid: inv.status === 'active' && (inv.expires_at ? new Date(inv.expires_at) >= new Date() : true)
  })) as unknown as InvitationWithDetails[]

  return invitations
}

/**
 * Get invitation by ID
 *
 * @param invitationId - Invitation ID
 * @param parentId - Parent ID (for authorization)
 * @returns Promise resolving to invitation or null
 */
export async function getInvitationById(
  invitationId: string,
  parentId: string
): Promise<InvitationWithDetails | null> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('invitations')
    .select(`
      *,
      recipient_groups(id, name),
      invitation_redemptions(
        id,
        recipient_id,
        redeemed_at,
        ip_address,
        recipients(id, name, email, phone)
      )
    `)
    .eq('id', invitationId)
    .eq('parent_id', parentId)
    .single()

  if (error || !data) {
    return null
  }

  return {
    ...data,
    group_name: data.recipient_groups?.name,
    is_expired: data.expires_at ? new Date(data.expires_at) < new Date() : false,
    is_valid: data.status === 'active' && (data.expires_at ? new Date(data.expires_at) >= new Date() : true),
    redemptions: data.invitation_redemptions
  } as unknown as InvitationWithDetails
}

/**
 * Get invitation statistics for a parent
 *
 * @param parentId - Parent ID
 * @returns Promise resolving to invitation stats
 */
export async function getInvitationStats(parentId: string): Promise<InvitationStats> {
  const supabase = createClient()

  const { data: invitations, error: invitationsError } = await supabase
    .from('invitations')
    .select('invitation_type, status, channel, use_count')
    .eq('parent_id', parentId)

  if (invitationsError) {
    logger.errorWithStack('Error fetching invitation stats', invitationsError as Error)
    throw new Error('Failed to fetch invitation statistics')
  }

  const { data: redemptions, error: redemptionsError } = await supabase
    .from('invitation_redemptions')
    .select('redeemed_at, invitations!inner(parent_id)')
    .eq('invitations.parent_id', parentId)

  if (redemptionsError) {
    logger.errorWithStack('Error fetching redemption stats', redemptionsError as Error)
    throw new Error('Failed to fetch redemption statistics')
  }

  // Calculate stats
  const totalInvitations = invitations?.length || 0
  const activeSingleUse =
    invitations?.filter((i) => i.invitation_type === 'single_use' && i.status === 'active')
      .length || 0
  const activeReusable =
    invitations?.filter((i) => i.invitation_type === 'reusable' && i.status === 'active')
      .length || 0

  const totalRedemptions = redemptions?.length || 0

  const oneWeekAgo = new Date()
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7)
  const redemptionsThisWeek =
    redemptions?.filter((r) => new Date(r.redeemed_at) >= oneWeekAgo).length || 0

  // Count redemptions by channel (approximate via invitations)
  const redemptionsByChannel = {
    email: 0,
    sms: 0,
    whatsapp: 0,
    link: 0
  }

  invitations?.forEach((inv) => {
    if (inv.channel && inv.use_count > 0) {
      redemptionsByChannel[inv.channel as keyof typeof redemptionsByChannel] += inv.use_count
    }
  })

  return {
    total_invitations: totalInvitations,
    active_single_use: activeSingleUse,
    active_reusable: activeReusable,
    total_redemptions: totalRedemptions,
    redemptions_this_week: redemptionsThisWeek,
    redemptions_by_channel: redemptionsByChannel
  }
}

/**
 * Get statistics for a specific reusable link
 *
 * @param invitationId - Invitation ID
 * @param parentId - Parent ID (for authorization)
 * @returns Promise resolving to reusable link stats
 */
export async function getReusableLinkStats(
  invitationId: string,
  parentId: string
): Promise<ReusableLinkStats | null> {
  const invitation = await getInvitationById(invitationId, parentId)

  if (!invitation || invitation.invitation_type !== 'reusable') {
    return null
  }

  // Get recent redemptions
  const supabase = createClient()
  const { data: redemptions } = await supabase
    .from('invitation_redemptions')
    .select(`
      id,
      redeemed_at,
      recipient_id,
      recipients(name, email, phone)
    `)
    .eq('invitation_id', invitationId)
    .order('redeemed_at', { ascending: false })
    .limit(10)

  // Group redemptions by day
  const redemptionsByDay: Record<string, number> = {}
  redemptions?.forEach((r) => {
    const date = new Date(r.redeemed_at).toISOString().split('T')[0]
    redemptionsByDay[date] = (redemptionsByDay[date] || 0) + 1
  })

  return {
    invitation_id: invitationId,
    use_count: invitation.use_count,
    created_at: invitation.created_at,
    recent_redemptions: (redemptions || []).map((r) => ({
      id: r.id,
      invitation_id: invitationId,
      recipient_id: r.recipient_id,
      redeemed_at: r.redeemed_at,
      ip_address: null,
      user_agent: null,
      recipient_name: r.recipients?.name,
      recipient_email: r.recipients?.email,
      recipient_phone: r.recipients?.phone
    })),
    redemptions_by_day: Object.entries(redemptionsByDay).map(([date, count]) => ({
      date,
      count
    }))
  }
}

/**
 * Get the invitation URL for a token
 *
 * @param token - Invitation token
 * @returns Full invitation URL
 */
export function getInvitationURL(token: string): string {
  const baseURL = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
  return `${baseURL}/invite/${token}`
}

/**
 * Get redemptions for an invitation
 *
 * @param invitationId - Invitation ID
 * @returns Promise resolving to array of redemptions
 */
export async function getInvitationRedemptions(
  invitationId: string
): Promise<Array<{
  id: string
  invitation_id: string
  recipient_id: string
  redeemed_at: string
  ip_address: string | null
  user_agent: string | null
}>> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('invitation_redemptions')
    .select('*')
    .eq('invitation_id', invitationId)
    .order('redeemed_at', { ascending: false })

  if (error) {
    logger.errorWithStack('Error fetching invitation redemptions', error as Error)
    throw new Error('Failed to fetch invitation redemptions')
  }

  return data || []
}

/**
 * Send an invitation via email, SMS, or WhatsApp
 *
 * @param invitation - Invitation object
 * @param channel - Delivery channel
 * @param customMessage - Optional custom message override
 * @returns Promise resolving to delivery result
 */
export async function sendInvitation(
  invitation: Invitation,
  channel: 'email' | 'sms' | 'whatsapp',
  customMessage?: string
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const invitationUrl = getInvitationURL(invitation.token)
  const message = customMessage || invitation.custom_message || undefined

  try {
    if (channel === 'email') {
      if (!invitation.recipient_email) {
        throw new Error('Email address required for email delivery')
      }

      const { clientEmailService } = await import('./clientEmailService')
      const result = await clientEmailService.sendInvitationEmail(
        invitation.recipient_email,
        {
          recipientName: undefined,
          inviterName: 'A parent', // TODO: Get actual parent name
          customMessage: message,
          invitationUrl,
          expiresAt: invitation.expires_at || undefined
        }
      )

      return {
        success: result.success,
        messageId: result.messageId,
        error: result.error
      }
    } else {
      if (!invitation.recipient_phone) {
        throw new Error('Phone number required for SMS/WhatsApp delivery')
      }

      const { smsService } = await import('./smsService')

      if (channel === 'sms') {
        const result = await smsService.sendInvitationSMS(
          invitation.recipient_phone,
          'A parent', // TODO: Get actual parent name
          invitationUrl,
          message,
          invitation.expires_at || undefined
        )

        return {
          success: result.success,
          messageId: result.messageId,
          error: result.error
        }
      } else {
        const result = await smsService.sendInvitationWhatsApp(
          invitation.recipient_phone,
          'A parent', // TODO: Get actual parent name
          invitationUrl,
          message,
          invitation.expires_at || undefined
        )

        return {
          success: result.success,
          messageId: result.messageId,
          error: result.error
        }
      }
    }
  } catch (err) {
    logger.errorWithStack('Error sending invitation', err as Error)
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to send invitation'
    }
  }
}

/**
 * Generate QR code for an invitation
 *
 * @param token - Invitation token
 * @param format - QR code format (png or svg)
 * @param options - QR code generation options
 * @returns Promise resolving to QR code result
 */
export async function generateInvitationQRCode(
  token: string,
  format: 'png' | 'svg',
  options?: { size?: number }
): Promise<{
  success: boolean
  data?: string
  contentType?: string
  error?: string
  url?: string
}> {
  try {
    const qrCodeService = (await import('./qrCodeService')).QRCodeService
    const service = new qrCodeService()
    const invitationUrl = getInvitationURL(token)

    const result = format === 'png'
      ? await service.generatePNG(invitationUrl, options)
      : await service.generateSVG(invitationUrl, options)

    return {
      ...result,
      url: invitationUrl
    }
  } catch (err) {
    logger.errorWithStack('Error generating QR code', err as Error)
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to generate QR code'
    }
  }
}
