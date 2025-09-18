// Client-side preference management functions that use API routes
import type { Recipient } from './recipients'
import type { RecipientGroup } from './recipient-groups'

/**
 * Interface for recipient preference updates via magic link
 * Matches the updatePreferencesSchema validation
 */
export interface PreferenceUpdate {
  frequency: 'every_update' | 'daily_digest' | 'weekly_digest' | 'milestones_only'
  preferred_channels: ('email' | 'sms' | 'whatsapp')[]
  content_types: ('photos' | 'text' | 'milestones')[]
}

/**
 * Interface for enhanced recipient data with group information
 * Used in the preference management interface
 */
export interface RecipientWithGroup extends Recipient {
  group: RecipientGroup | null
}

/**
 * Gets recipient information by preference token via API call
 * This function works on the client side
 *
 * @param token - The unique preference token from the magic link
 * @returns Promise resolving to recipient with group info or null if token is invalid
 */
export async function getRecipientByToken(token: string): Promise<RecipientWithGroup | null> {
  if (!token || token.trim() === '') {
    return null
  }

  try {
    const response = await fetch(`/api/preferences/${token}`)

    if (!response.ok) {
      return null
    }

    const { recipient } = await response.json()
    return recipient
  } catch (error) {
    console.error('Error fetching recipient by token:', error)
    return null
  }
}

/**
 * Updates recipient preferences via API call
 * Sets overrides_group_default to true when preferences are changed
 *
 * @param token - The preference token from the magic link
 * @param preferences - The new preference values
 * @returns Promise resolving to boolean indicating success
 */
export async function updateRecipientPreferences(
  token: string,
  preferences: PreferenceUpdate
): Promise<boolean> {
  if (!token || token.trim() === '') {
    throw new Error('Invalid preference token')
  }

  try {
    const response = await fetch(`/api/preferences/${token}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(preferences)
    })

    if (!response.ok) {
      const { error } = await response.json()
      throw new Error(error || 'Failed to update preferences')
    }

    return true
  } catch (error) {
    console.error('Error updating recipient preferences:', error)
    throw error
  }
}

/**
 * Resets recipient preferences to match their group defaults via API call
 *
 * @param token - The preference token from the magic link
 * @returns Promise resolving to boolean indicating success
 */
export async function resetToGroupDefaults(token: string): Promise<boolean> {
  if (!token || token.trim() === '') {
    throw new Error('Invalid preference token')
  }

  try {
    const response = await fetch(`/api/preferences/${token}/reset`, {
      method: 'POST',
    })

    if (!response.ok) {
      const { error } = await response.json()
      throw new Error(error || 'Failed to reset preferences')
    }

    return true
  } catch (error) {
    console.error('Error resetting to group defaults:', error)
    throw error
  }
}

/**
 * Validates that a preference token is valid and active
 *
 * @param token - The preference token to validate
 * @returns Promise resolving to boolean indicating if token is valid
 */
export async function validatePreferenceToken(token: string): Promise<boolean> {
  if (!token || token.trim() === '') {
    return false
  }

  const recipient = await getRecipientByToken(token)
  return recipient !== null
}

/**
 * Gets the preference link URL for a given token
 *
 * @param token - The preference token
 * @returns Complete preference link URL
 */
export function getPreferenceLinkUrl(token: string): string {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
  return `${baseUrl}/preferences/${token}`
}

/**
 * Sends a preference link email to a recipient
 * This is a placeholder implementation - actual email sending will be implemented in CRO-24
 *
 * @param email - Recipient's email address
 * @param name - Recipient's name
 * @param token - Preference token for the magic link
 * @param senderName - Name of the parent sending the link (optional)
 * @returns Promise resolving when email is sent
 */
export async function sendPreferenceLink(
  email: string,
  name: string,
  token: string,
  senderName?: string
): Promise<void> {
  const preferenceUrl = getPreferenceLinkUrl(token)

  // In a real implementation, this would integrate with an email service like SendGrid
  const emailContent = generatePreferenceLinkEmail(name, preferenceUrl, senderName)

  console.log(`Sending preference link email to ${email}:`)
  console.log(`Subject: ${emailContent.subject}`)
  console.log(`Body: ${emailContent.body}`)
  console.log(`Link: ${preferenceUrl}`)

  // TODO: Integrate with actual email service in CRO-24
  // Example implementation:
  // await emailService.send({
  //   to: email,
  //   subject: emailContent.subject,
  //   html: emailContent.html,
  //   text: emailContent.text
  // })
}

/**
 * Generates email content for preference link emails
 *
 * @param recipientName - Name of the recipient
 * @param preferenceUrl - Complete preference link URL
 * @param senderName - Name of the parent (optional)
 * @returns Email content object with subject and body
 */
function generatePreferenceLinkEmail(
  recipientName: string,
  preferenceUrl: string,
  senderName?: string
): {
  subject: string
  body: string
  html: string
  text: string
} {
  const fromText = senderName ? `from ${senderName}` : ''

  const subject = `Set your preferences for baby updates ${fromText}`

  const text = `
Hi ${recipientName},

You've been added to receive baby updates ${fromText}!

Click the link below to set your preferences for how often you'd like to receive updates and what type of content you'd like to see:

${preferenceUrl}

This link is secure and personal to you - no account or password needed.

If you have any questions, please reply to this email.

Best regards,
The Tribe Team
  `.trim()

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Set Your Baby Update Preferences</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .button { display: inline-block; padding: 12px 24px; background: #4F46E5; color: white; text-decoration: none; border-radius: 6px; margin: 20px 0; }
    .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee; font-size: 14px; color: #666; }
  </style>
</head>
<body>
  <div class="container">
    <h1>Hi ${recipientName},</h1>

    <p>You've been added to receive baby updates ${fromText}!</p>

    <p>Click the button below to set your preferences for how often you'd like to receive updates and what type of content you'd like to see:</p>

    <a href="${preferenceUrl}" class="button">Set My Preferences</a>

    <p>This link is secure and personal to you - no account or password needed.</p>

    <p>If you have any questions, please reply to this email.</p>

    <div class="footer">
      <p>Best regards,<br>The Tribe Team</p>
      <p><small>This email was sent because you were added as a recipient for baby updates. If you believe this was sent in error, please contact the sender.</small></p>
    </div>
  </div>
</body>
</html>
  `.trim()

  return {
    subject,
    body: text,
    html,
    text
  }
}

/**
 * Gets recipient preference summary for display
 * Shows current preferences and indicates if they override group defaults
 *
 * @param token - The preference token
 * @returns Promise resolving to preference summary
 */
export async function getPreferenceSummary(token: string): Promise<{
  recipient: RecipientWithGroup
  preferences: {
    frequency: string
    channels: string[]
    contentTypes: string[]
  }
  groupDefaults?: {
    frequency: string
    channels: string[]
  }
  isOverriding: boolean
} | null> {
  const recipient = await getRecipientByToken(token)

  if (!recipient) {
    return null
  }

  return {
    recipient,
    preferences: {
      frequency: recipient.frequency,
      channels: recipient.preferred_channels,
      contentTypes: recipient.content_types
    },
    groupDefaults: recipient.group ? {
      frequency: recipient.group.default_frequency,
      channels: recipient.group.default_channels
    } : undefined,
    isOverriding: recipient.overrides_group_default
  }
}

/**
 * Gets available preference options for display in forms
 */
export function getPreferenceOptions() {
  return {
    frequencies: [
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
    ],
    channels: [
      {
        value: 'email',
        label: 'Email',
        description: 'Receive updates via email'
      },
      {
        value: 'sms',
        label: 'SMS',
        description: 'Receive updates via text message'
      },
      {
        value: 'whatsapp',
        label: 'WhatsApp',
        description: 'Receive updates via WhatsApp'
      }
    ],
    contentTypes: [
      {
        value: 'photos',
        label: 'Photos',
        description: 'Include photos in updates'
      },
      {
        value: 'text',
        label: 'Stories & Updates',
        description: 'Include written stories and descriptions'
      },
      {
        value: 'milestones',
        label: 'Milestones',
        description: 'Include milestone achievements and growth tracking'
      }
    ]
  }
}


/**
 * Logs preference access for analytics (placeholder)
 * In production, this could track usage patterns
 *
 * @param token - The preference token accessed
 * @param action - The action performed ('view', 'update', 'reset')
 */
export async function logPreferenceAccess(
  token: string,
  action: 'view' | 'update' | 'reset'
): Promise<void> {
  // In production, this could log to analytics service
  console.log(`Preference access logged: ${action} for token ${token.slice(0, 8)}...`)

  // TODO: Implement actual analytics logging if needed
  // This could track:
  // - How often recipients update their preferences
  // - Which preferences are most commonly changed
  // - Usage patterns for optimization
}