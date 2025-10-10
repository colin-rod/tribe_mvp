import { createClient } from './supabase/client'
import { clientEmailService } from './services/clientEmailService'
import type { RecipientGroup } from './recipient-groups'
// getDefaultGroup is deprecated - using relationship-based defaults instead
import type { Database } from './types/database'
import { createLogger } from '@/lib/logger'
import {
  type ImportanceThreshold,
  type UpdateFrequency,
  type DeliveryChannel,
  type ContentType,
  type RecipientRelationship,
  getRelationshipDefaults as getDefaultPreferences
} from './types/preferences'


const logger = createLogger('Recipients')
/**
 * Interface for recipient with enhanced data
 * Matches database schema with optional group information
 */
export interface Recipient {
  id: string
  parent_id: string
  email?: string | null
  phone?: string | null
  name: string
  relationship: RecipientRelationship
  group_id?: string | null // Deprecated, kept for backward compatibility
  frequency: UpdateFrequency
  preferred_channels: DeliveryChannel[]
  content_types: ContentType[]
  importance_threshold?: ImportanceThreshold // New field - optional until migration is run
  overrides_group_default: boolean // Deprecated, kept for backward compatibility
  preference_token: string
  is_active: boolean
  created_at: string
  group?: RecipientGroup // Deprecated, kept for backward compatibility
}

type RecipientRow = Database['public']['Tables']['recipients']['Row']

/**
 * Interface for creating new recipients
 */
export interface CreateRecipientData {
  name: string
  email?: string
  phone?: string
  relationship: string
  group_id?: string
  frequency?: string
  preferred_channels?: string[]
  content_types?: string[]
}

/**
 * Interface for updating existing recipients
 */
export interface UpdateRecipientData {
  name?: string
  email?: string
  phone?: string
  relationship?: string
  group_id?: string
  frequency?: string
  preferred_channels?: string[]
  content_types?: string[]
  is_active?: boolean
}

/**
 * Interface for recipient search and filtering options
 */
export interface RecipientFilters {
  search?: string
  group_id?: string
  relationship?: string
  is_active?: boolean
}

/**
 * Generates a secure, unique preference token for magic link access
 * Format: uuid-timestamp to ensure uniqueness
 *
 * @returns Unique preference token string
 */
function generatePreferenceToken(): string {
  return crypto.randomUUID() + '-' + Date.now().toString(36)
}

function isRecipientGroupValue(value: unknown): value is RecipientGroup {
  return typeof value === 'object' && value !== null && 'id' in value && 'name' in value
}

function extractGroupFromRelation(relation: unknown): RecipientGroup | undefined {
  if (Array.isArray(relation)) {
    const [first] = relation
    return isRecipientGroupValue(first) ? first : undefined
  }

  return isRecipientGroupValue(relation) ? relation : undefined
}

/**
 * Creates a new recipient with automatic token generation
 * Sends preference link email if email is provided
 *
 * @param recipientData - Data for creating the recipient
 * @returns Promise resolving to created recipient with group information
 */
export async function createRecipient(recipientData: CreateRecipientData): Promise<Recipient> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) throw new Error('Not authenticated')

  // Validate that at least email or phone is provided
  if (!recipientData.email && !recipientData.phone) {
    throw new Error('Either email or phone number is required')
  }

  // Set default preferences based on relationship (no groups)
  const relationshipDefaults = getDefaultPreferences(recipientData.relationship as RecipientRelationship)

  // Auto-detect preferred channels based on provided contact methods
  // This ensures recipients can actually receive notifications via the selected channels
  const autoChannels: ('email' | 'sms' | 'whatsapp')[] = []
  if (recipientData.email) autoChannels.push('email')
  if (recipientData.phone) autoChannels.push('sms')

  // Group assignment is now optional and deprecated
  // We keep group_id for backward compatibility but it's no longer required
  const groupId = recipientData.group_id || null

  // Generate unique preference token
  const preferenceToken = generatePreferenceToken()

  const insertData = {
    parent_id: user.id,
    name: recipientData.name,
    email: recipientData.email || null,
    phone: recipientData.phone || null,
    relationship: recipientData.relationship,
    group_id: groupId, // Optional, kept for backward compatibility
    frequency: recipientData.frequency || relationshipDefaults.frequency,
    preferred_channels: recipientData.preferred_channels || (autoChannels.length > 0 ? autoChannels : relationshipDefaults.channels),
    content_types: recipientData.content_types || ['photos', 'text', 'milestones'],
    importance_threshold: relationshipDefaults.importance_threshold, // New field
    preference_token: preferenceToken
  }

  const { data, error } = await supabase
    .from('recipients')
    .insert(insertData)
    .select(`
      *,
      recipient_groups(*)
    `)
    .single()

  if (error) {
    logger.errorWithStack('Error creating recipient:', error as Error)
    throw new Error('Failed to create recipient')
  }

  // Send preference link email if email is provided
  if (data.email) {
    try {
      await sendPreferenceLink(data.email, data.name, preferenceToken)
    } catch (emailError) {
      logger.warn('Failed to send preference link email:', { data: emailError })
      // Don't throw here as recipient was created successfully
    }
  }

  return {
    ...data,
    group: Array.isArray(data.recipient_groups) ? data.recipient_groups[0] : data.recipient_groups
  }
}

/**
 * Gets all recipients for the authenticated user with group information
 * Supports filtering and searching
 *
 * @param filters - Optional filters to apply
 * @returns Promise resolving to array of recipients with group data
 */
export async function getRecipients(filters: RecipientFilters = {}): Promise<Recipient[]> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) throw new Error('Not authenticated')

  let query = supabase
    .from('recipients')
    .select(`
      *,
      recipient_groups(*)
    `)
    .eq('parent_id', user.id)

  // Apply filters
  if (filters.is_active !== undefined) {
    query = query.eq('is_active', filters.is_active)
  } else {
    // Default to active recipients only
    query = query.eq('is_active', true)
  }

  if (filters.group_id) {
    query = query.eq('group_id', filters.group_id)
  }

  if (filters.relationship) {
    query = query.eq('relationship', filters.relationship)
  }

  if (filters.search) {
    query = query.or(`name.ilike.%${filters.search}%,email.ilike.%${filters.search}%,phone.ilike.%${filters.search}%`)
  }

  query = query.order('name')

  const { data, error } = await query

  if (error) {
    logger.errorWithStack('Error fetching recipients:', error as Error)
    throw new Error('Failed to fetch recipients')
  }

  const recipientsWithGroups = (data ?? []) as Array<RecipientRow & { recipient_groups: unknown }>

  return recipientsWithGroups.map((recipient) => ({
    ...recipient,
    relationship: recipient.relationship as Recipient['relationship'],
    frequency: recipient.frequency as Recipient['frequency'],
    preferred_channels: recipient.preferred_channels as Recipient['preferred_channels'],
    content_types: recipient.content_types as Recipient['content_types'],
    group: extractGroupFromRelation(recipient.recipient_groups)
  }))
}

/**
 * Gets a specific recipient by ID
 *
 * @param recipientId - ID of the recipient to fetch
 * @returns Promise resolving to recipient or null if not found
 */
export async function getRecipientById(recipientId: string): Promise<Recipient | null> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) throw new Error('Not authenticated')

  const { data, error } = await supabase
    .from('recipients')
    .select(`
      *,
      recipient_groups(*)
    `)
    .eq('id', recipientId)
    .eq('parent_id', user.id)
    .single()

  if (error) {
    if (error.code === 'PGRST116') return null
    logger.errorWithStack('Error fetching recipient:', error as Error)
    throw new Error('Failed to fetch recipient')
  }

  return {
    ...data,
    group: extractGroupFromRelation(data.recipient_groups)
  }
}

/**
 * Updates an existing recipient
 *
 * @param recipientId - ID of the recipient to update
 * @param updates - Partial recipient data to update
 * @returns Promise resolving to updated recipient
 */
export async function updateRecipient(recipientId: string, updates: UpdateRecipientData): Promise<Recipient> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) throw new Error('Not authenticated')

  // Validate contact method if being updated
  if ((updates.email !== undefined || updates.phone !== undefined)) {
    const currentRecipient = await getRecipientById(recipientId)
    if (!currentRecipient) {
      throw new Error('Recipient not found')
    }

    const newEmail = updates.email !== undefined ? updates.email : currentRecipient.email
    const newPhone = updates.phone !== undefined ? updates.phone : currentRecipient.phone

    if (!newEmail && !newPhone) {
      throw new Error('Either email or phone number is required')
    }
  }

  const { data, error } = await supabase
    .from('recipients')
    .update(updates)
    .eq('id', recipientId)
    .eq('parent_id', user.id)
    .select(`
      *,
      recipient_groups(*)
    `)
    .single()

  if (error) {
    logger.errorWithStack('Error updating recipient:', error as Error)
    throw new Error('Failed to update recipient')
  }

  return {
    ...data,
    group: Array.isArray(data.recipient_groups) ? data.recipient_groups[0] : data.recipient_groups
  }
}

/**
 * Soft deletes a recipient (sets is_active to false)
 *
 * @param recipientId - ID of the recipient to delete
 * @returns Promise resolving to boolean success
 */
export async function deleteRecipient(recipientId: string): Promise<boolean> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) throw new Error('Not authenticated')

  const { error } = await supabase
    .from('recipients')
    .update({ is_active: false })
    .eq('id', recipientId)
    .eq('parent_id', user.id)

  if (error) {
    logger.errorWithStack('Error deleting recipient:', error as Error)
    throw new Error('Failed to delete recipient')
  }

  return true
}

/**
 * Permanently deletes a recipient (hard delete)
 * Use with caution - this cannot be undone
 *
 * @param recipientId - ID of the recipient to permanently delete
 * @returns Promise resolving to boolean success
 */
export async function permanentlyDeleteRecipient(recipientId: string): Promise<boolean> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) throw new Error('Not authenticated')

  const { error } = await supabase
    .from('recipients')
    .delete()
    .eq('id', recipientId)
    .eq('parent_id', user.id)

  if (error) {
    logger.errorWithStack('Error permanently deleting recipient:', error as Error)
    throw new Error('Failed to permanently delete recipient')
  }

  return true
}

/**
 * Reactivates a soft-deleted recipient
 *
 * @param recipientId - ID of the recipient to reactivate
 * @returns Promise resolving to reactivated recipient
 */
export async function reactivateRecipient(recipientId: string): Promise<Recipient> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) throw new Error('Not authenticated')

  const { data, error } = await supabase
    .from('recipients')
    .update({ is_active: true })
    .eq('id', recipientId)
    .eq('parent_id', user.id)
    .select(`
      *,
      recipient_groups(*)
    `)
    .single()

  if (error) {
    logger.errorWithStack('Error reactivating recipient:', error as Error)
    throw new Error('Failed to reactivate recipient')
  }

  return {
    ...data,
    group: Array.isArray(data.recipient_groups) ? data.recipient_groups[0] : data.recipient_groups
  }
}

/**
 * Gets recipients grouped by their assigned groups
 *
 * @returns Promise resolving to recipients organized by group
 */
export async function getRecipientsByGroup(): Promise<Record<string, Recipient[]>> {
  const recipients = await getRecipients()
  const grouped: Record<string, Recipient[]> = {}

  recipients.forEach(recipient => {
    const groupName = recipient.group?.name || 'Unassigned'
    if (!grouped[groupName]) {
      grouped[groupName] = []
    }
    grouped[groupName].push(recipient)
  })

  return grouped
}

/**
 * Bulk updates multiple recipients
 *
 * @param recipientIds - Array of recipient IDs to update
 * @param updates - Partial recipient data to apply to all recipients
 * @returns Promise resolving to array of updated recipients
 */
export async function bulkUpdateRecipients(
  recipientIds: string[],
  updates: Omit<UpdateRecipientData, 'email' | 'phone' | 'name'>
): Promise<Recipient[]> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) throw new Error('Not authenticated')

  if (recipientIds.length === 0) {
    throw new Error('No recipients specified for bulk update')
  }

  const { data, error } = await supabase
    .from('recipients')
    .update(updates)
    .in('id', recipientIds)
    .eq('parent_id', user.id)
    .select(`
      *,
      recipient_groups(*)
    `)

  if (error) {
    logger.errorWithStack('Error bulk updating recipients:', error as Error)
    throw new Error('Failed to bulk update recipients')
  }

  const recipientsWithGroups = (data ?? []) as Array<RecipientRow & { recipient_groups: unknown }>

  return recipientsWithGroups.map((recipient) => ({
    ...recipient,
    relationship: recipient.relationship as Recipient['relationship'],
    frequency: recipient.frequency as Recipient['frequency'],
    preferred_channels: recipient.preferred_channels as Recipient['preferred_channels'],
    content_types: recipient.content_types as Recipient['content_types'],
    group: extractGroupFromRelation(recipient.recipient_groups)
  }))
}

/**
 * Gets recipient statistics for dashboard display
 *
 * @returns Promise resolving to recipient statistics
 */
export async function getRecipientStats(): Promise<{
  totalRecipients: number
  activeRecipients: number
  inactiveRecipients: number
  byRelationship: Record<string, number>
  byGroup: Record<string, number>
}> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) throw new Error('Not authenticated')

  const { data, error } = await supabase
    .from('recipients')
    .select(`
      id,
      relationship,
      is_active,
      recipient_groups(name)
    `)
    .eq('parent_id', user.id)

  if (error) {
    logger.errorWithStack('Error fetching recipient stats:', error as Error)
    throw new Error('Failed to fetch recipient statistics')
  }

  const recipients = (data ?? []) as Array<Pick<RecipientRow, 'is_active' | 'relationship'> & { recipient_groups: unknown }>
  const byRelationship: Record<string, number> = {}
  const byGroup: Record<string, number> = {}

  let activeCount = 0
  let inactiveCount = 0

  recipients.forEach((recipient) => {
    // Count by active status
    if (recipient.is_active) {
      activeCount++
    } else {
      inactiveCount++
    }

    // Count by relationship (only active)
    if (recipient.is_active) {
      const relationshipKey = recipient.relationship || 'unknown'
      byRelationship[relationshipKey] = (byRelationship[relationshipKey] || 0) + 1
    }

    // Count by group (only active)
    if (recipient.is_active) {
      const groupName = extractGroupFromRelation(recipient.recipient_groups)?.name || 'Unassigned'
      byGroup[groupName] = (byGroup[groupName] || 0) + 1
    }
  })

  return {
    totalRecipients: recipients.length,
    activeRecipients: activeCount,
    inactiveRecipients: inactiveCount,
    byRelationship,
    byGroup
  }
}

/**
 * Resends a preference link to a recipient
 *
 * @param recipientId - ID of the recipient
 * @returns Promise resolving to boolean success
 */
export async function resendPreferenceLink(recipientId: string): Promise<boolean> {
  const recipient = await getRecipientById(recipientId)

  if (!recipient) {
    throw new Error('Recipient not found')
  }

  if (!recipient.email) {
    throw new Error('Cannot send preference link: recipient has no email address')
  }

  if (!recipient.is_active) {
    throw new Error('Cannot send preference link to inactive recipient')
  }

  try {
    await sendPreferenceLink(recipient.email, recipient.name, recipient.preference_token)
    return true
  } catch (error) {
    logger.errorWithStack('Error sending preference link:', error as Error)
    throw new Error('Failed to send preference link')
  }
}

/**
 * Generates a new preference token for a recipient
 * Useful if the current token is compromised
 *
 * @param recipientId - ID of the recipient
 * @returns Promise resolving to new preference token
 */
export async function regeneratePreferenceToken(recipientId: string): Promise<string> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) throw new Error('Not authenticated')

  const newToken = generatePreferenceToken()

  const { data, error } = await supabase
    .from('recipients')
    .update({ preference_token: newToken })
    .eq('id', recipientId)
    .eq('parent_id', user.id)
    .select('preference_token')
    .single()

  if (error) {
    logger.errorWithStack('Error regenerating preference token:', error as Error)
    throw new Error('Failed to regenerate preference token')
  }

  return data.preference_token
}

/**
 * Sends a preference setup link to the recipient's email address
 *
 * Uses SendGrid to send a properly formatted invitation email
 * with the preference setup link
 *
 * @param email - Recipient email address
 * @param name - Recipient name
 * @param token - Preference token for magic link
 */
async function sendPreferenceLink(email: string, name: string, token: string): Promise<void> {
  const preferenceUrl = `${process.env.NEXT_PUBLIC_SITE_URL}/preferences/${token}`

  try {
    // Get the parent's information for the email
    const supabase = createClient()
    const { data: tokenData } = await supabase
      .from('preference_tokens')
      .select(`
        parent_id,
        profiles!inner(name)
      `)
      .eq('token', token)
      .single()

    const senderName = (tokenData?.profiles as unknown as { name: string } | undefined)?.name || 'Someone'

    // Send the preference invitation email
    const result = await clientEmailService.sendTemplatedEmail(
      email,
      'preference',
      {
        recipientName: name,
        senderName,
        preferenceUrl,
        babyName: '' // Could be enhanced to include baby name if available
      },
      {
        categories: ['tribe-preference-invitation'],
        customArgs: {
          token,
          recipientEmail: email,
          recipientName: name,
          invitationType: 'preference-setup'
        }
      }
    )

    if (!result.success) {
      throw new Error(result.error || 'Failed to send preference invitation email')
    }

    logger.info('Preference invitation sent to ${email} (${name}): ${preferenceUrl}')
    logger.info('SendGrid Message ID: ${result.messageId}')

  } catch (error) {
    logger.errorWithStack('Failed to send preference link to ${email}:', error as Error)

    // Log the URL for manual sharing as fallback
    logger.info('Manual preference link for ${name} (${email}): ${preferenceUrl}')

    // Re-throw error so calling code can handle it
    throw error
  }
}
