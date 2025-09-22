import { corsHeaders } from '../_shared/cors.ts'
import { createSupabaseClient } from '../_shared/database.ts'
import {
  InboundEmail,
  EmailProcessingResult,
  MemoryEmailData,
  ResponseEmailData
} from '../_shared/types.ts'
import {
  parseInboundEmail,
  cleanEmailContent,
  extractMessageId,
  processEmailAttachments,
  parseChildFromSubject,
  validateSenderAuthentication
} from '../_shared/email-processing.ts'

// Environment variables
const WEBHOOK_SECRET = Deno.env.get('WEBHOOK_SECRET')
const REPLY_TO_DOMAIN = Deno.env.get('REPLY_TO_DOMAIN') || 'colinrodrigues.com'
const MEMORY_EMAIL = `memory@${REPLY_TO_DOMAIN}`

/**
 * Verifies webhook signature from SendGrid (simplified for Inbound Parse)
 */
async function verifyWebhookSignature(payload: string, signature?: string): Promise<boolean> {
  if (!WEBHOOK_SECRET) {
    console.warn('No webhook secret configured, skipping verification')
    return true // Allow in development mode
  }

  if (!signature) {
    console.warn('No signature provided')
    return false
  }

  try {
    const encoder = new TextEncoder()
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(WEBHOOK_SECRET),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    )

    const expectedSignature = await crypto.subtle.sign(
      'HMAC',
      key,
      encoder.encode(payload)
    )

    const expectedSignatureHex = Array.from(new Uint8Array(expectedSignature))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('')

    return signature === expectedSignatureHex
  } catch (error) {
    console.error('Error verifying webhook signature:', error)
    return false
  }
}

/**
 * Handles email-to-memory functionality
 */
async function handleMemoryEmail(emailData: InboundEmail, supabase: any): Promise<EmailProcessingResult> {
  console.log('Processing memory email from:', emailData.from)

  // Validate sender authentication
  if (!validateSenderAuthentication(emailData)) {
    return { success: false, type: 'memory', error: 'Sender authentication failed' }
  }

  // Find parent by email with detailed logging
  console.log('Searching for profile with email:', emailData.from)

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id, name, email')
    .eq('email', emailData.from)
    .single()

  console.log('Profile query result:', { profile, profileError })
  console.log('Profile data:', profile)
  console.log('Profile error:', profileError)

  if (profileError || !profile) {
    console.log('Unknown sender for memory email:', emailData.from)
    console.log('Profile error details:', profileError)
    return { success: false, type: 'memory', error: 'Unknown sender' }
  }

  // Extract child name from subject if specified
  const { childName, content: subjectContent } = parseChildFromSubject(emailData.subject)
  let childId = null

  if (childName) {
    // Find child by name
    const { data: child } = await supabase
      .from('children')
      .select('id')
      .eq('parent_id', profile.id)
      .ilike('name', childName)
      .single()

    if (child) childId = child.id
  }

  // If no specific child found, use the first child
  if (!childId) {
    const { data: children } = await supabase
      .from('children')
      .select('id')
      .order('birth_date', { ascending: false })
      .eq('parent_id', profile.id)
      .limit(1)

    if (children?.length) childId = children[0].id
  }

  if (!childId) {
    console.log('No child found for memory email')
    return { success: false, type: 'memory', error: 'No child found' }
  }

  // Process attachments
  const mediaUrls = await processEmailAttachments(emailData, profile.id, supabase)

  // Clean and prepare content
  const emailContent = cleanEmailContent(emailData.text || emailData.html)
  const finalContent = subjectContent && emailContent
    ? `${subjectContent}\n\n${emailContent}`
    : subjectContent || emailContent

  if (!finalContent.trim() && mediaUrls.length === 0) {
    return { success: false, type: 'memory', error: 'No content or media found' }
  }

  // Create update from email content
  const { data: update, error: updateError } = await supabase
    .from('updates')
    .insert({
      parent_id: profile.id,
      child_id: childId,
      content: finalContent,
      media_urls: mediaUrls,
      distribution_status: 'draft' // Parent can review and send later
    })
    .select('id')
    .single()

  if (updateError) {
    console.error('Failed to create update from email:', updateError)
    return { success: false, type: 'memory', error: 'Failed to create update', details: updateError.message }
  }

  console.log('Created update from email:', update.id)

  // Optionally send confirmation email to parent
  await sendMemoryConfirmationEmail(emailData.from, update, profile.name, supabase)

  return {
    success: true,
    type: 'memory',
    entity_id: update.id
  }
}

/**
 * Handles response emails to existing updates
 */
async function handleUpdateResponse(emailData: InboundEmail, supabase: any): Promise<EmailProcessingResult> {
  console.log('=== HANDLING UPDATE RESPONSE ===')
  console.log('Email to address:', emailData.to)

  // Extract update ID from email address (update-{uuid}@domain.com)
  const updateMatch = emailData.to.match(/^update-([a-f0-9-]+)@/)
  console.log('Update ID regex match:', updateMatch)

  if (!updateMatch) {
    console.log('FAILED: Invalid update email format:', emailData.to)
    return { success: false, type: 'response', error: 'Invalid email format' }
  }

  const updateId = updateMatch[1]
  console.log('Extracted update ID:', updateId)

  // Verify update exists
  console.log('Looking up update in database...')
  const { data: update, error: updateError } = await supabase
    .from('updates')
    .select('id, parent_id')
    .eq('id', updateId)
    .single()

  console.log('Update lookup result:', { update, updateError })

  if (updateError || !update) {
    console.log('FAILED: Update not found for response:', updateId, 'Error:', updateError)
    return { success: false, type: 'response', error: 'Update not found' }
  }

  console.log('Found update:', update)

  // Find recipient by email
  console.log('Looking up recipient...')
  console.log('Parent ID:', update.parent_id)
  console.log('From email:', emailData.from)

  const { data: recipient, error: recipientError } = await supabase
    .from('recipients')
    .select('id, name, relationship, email, is_active')
    .eq('parent_id', update.parent_id)
    .eq('email', emailData.from)
    .eq('is_active', true)
    .single()

  console.log('Recipient lookup result:', { recipient, recipientError })

  if (recipientError || !recipient) {
    console.log('FAILED: Unknown recipient for response:', emailData.from)
    console.log('Recipient error details:', recipientError)

    // Let's also check all recipients for this parent to see what's available
    const { data: allRecipients } = await supabase
      .from('recipients')
      .select('id, name, email, is_active')
      .eq('parent_id', update.parent_id)

    console.log('All recipients for parent:', allRecipients)
    return { success: false, type: 'response', error: 'Unknown recipient' }
  }

  console.log('Found recipient:', recipient)

  // Process attachments
  const mediaUrls = await processEmailAttachments(emailData, update.parent_id, supabase)

  // Clean response content
  const rawContent = emailData.text || emailData.html
  const responseContent = cleanEmailContent(rawContent)

  console.log('Raw email content:', rawContent)
  console.log('Cleaned email content:', responseContent)
  console.log('Content length after cleaning:', responseContent.length)

  if (!responseContent.trim() && mediaUrls.length === 0) {
    console.log('No content found after cleaning - rejecting email')
    return { success: false, type: 'response', error: 'No content found' }
  }

  // Check if response already exists (prevent duplicates)
  const messageId = extractMessageId(emailData)
  const { data: existingResponse } = await supabase
    .from('responses')
    .select('id')
    .eq('external_id', messageId)
    .single()

  if (existingResponse) {
    console.log('Response already exists for message:', messageId)
    return { success: true, type: 'response', entity_id: existingResponse.id }
  }

  // Create response record
  console.log('Creating response record...')
  console.log('Response data:', {
    update_id: updateId,
    recipient_id: recipient.id,
    channel: 'email',
    content: responseContent,
    content_length: responseContent.length,
    media_urls: mediaUrls,
    external_id: messageId
  })

  const { data: response, error: responseError } = await supabase
    .from('responses')
    .insert({
      update_id: updateId,
      recipient_id: recipient.id,
      channel: 'email',
      content: responseContent,
      media_urls: mediaUrls,
      external_id: messageId,
      received_at: new Date().toISOString()
    })
    .select('id')
    .single()

  console.log('Response creation result:', { response, responseError })

  if (responseError) {
    console.error('FAILED: Failed to create response:', responseError)
    return { success: false, type: 'response', error: 'Failed to create response' }
  }

  console.log('SUCCESS: Created response from email:', response.id)
  console.log('=== EMAIL WEBHOOK DEBUG END ===')


  // Notify parent of new response (based on their preferences)
  await notifyParentOfResponse(update.parent_id, recipient.name, responseContent, supabase)

  return {
    success: true,
    type: 'response',
    entity_id: response.id
  }
}

/**
 * Sends confirmation email to parent about memory email processing
 */
async function sendMemoryConfirmationEmail(
  parentEmail: string,
  update: any,
  parentName: string,
  supabase: any
): Promise<void> {
  // This would integrate with the existing email distribution system
  // For now, just log the action
  console.log(`Would send memory confirmation to ${parentEmail} for update ${update.id}`)

  // TODO: Implement confirmation email using existing SendGrid integration
  // This could call the distribute-email function or use SendGrid API directly
}

/**
 * Notifies parent of new response based on their preferences
 */
async function notifyParentOfResponse(
  parentId: string,
  recipientName: string,
  content: string,
  supabase: any
): Promise<void> {
  // Get parent's notification preferences
  const { data: profile } = await supabase
    .from('profiles')
    .select('notification_preferences, email, name')
    .eq('id', parentId)
    .single()

  if (!profile) return

  const prefs = profile.notification_preferences || {}

  if (prefs.response_notifications === 'immediate') {
    // Send immediate notification
    console.log(`Would send immediate response notification to ${profile.email}`)
    // TODO: Implement immediate notification email
  } else if (prefs.response_notifications === 'daily_digest') {
    // Add to daily digest queue
    console.log(`Would add to daily digest for ${profile.email}`)
    // TODO: Implement daily digest queuing
  }

  // For now, just log what would happen
  console.log(`Response notification: ${recipientName} replied to update for ${profile.name}`)
}

/**
 * Main webhook handler
 */
Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Validate request method
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }),
        {
          status: 405,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Parse form data from SendGrid Inbound Parse
    const formData = await req.formData()
    const emailData = parseInboundEmail(formData)

    console.log('=== EMAIL WEBHOOK DEBUG START ===')
    console.log('Received email:', {
      to: emailData.to,
      from: emailData.from,
      subject: emailData.subject,
      attachments: emailData.attachments,
      textLength: emailData.text?.length || 0,
      htmlLength: emailData.html?.length || 0,
      rawText: emailData.text,
      rawHtml: emailData.html,
      spf: emailData.SPF,
      envelope: emailData.envelope
    })

    // Test database connection first
    if (emailData.to === 'test@example.com') {
      try {
        const supabase = createSupabaseClient()
        const { data: testProfile, error: testError } = await supabase
          .from('profiles')
          .select('id, email, name')
          .eq('email', 'parent@example.com')
          .single()

        return new Response(
          JSON.stringify({
            test: 'database connection',
            profile: testProfile,
            error: testError,
            success: !!testProfile
          }),
          {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        )
      } catch (err) {
        return new Response(
          JSON.stringify({ test: 'database connection', error: err.message }),
          {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        )
      }
    }

    // Basic validation
    if (!emailData.to || !emailData.from) {
      return new Response(
        JSON.stringify({ error: 'Missing required email fields' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    const supabase = createSupabaseClient()
    let result: EmailProcessingResult

    // Determine email type and route accordingly
    if (emailData.to.toLowerCase().includes(MEMORY_EMAIL.toLowerCase())) {
      // Email-to-Memory system
      result = await handleMemoryEmail(emailData, supabase)
    } else if (emailData.to.match(/^update-([a-f0-9-]+)@/)) {
      // Response to existing update
      result = await handleUpdateResponse(emailData, supabase)
    } else {
      console.log('Unhandled email type:', emailData.to)
      result = {
        success: false,
        type: 'unknown',
        error: `Unhandled email address: ${emailData.to}`
      }
    }

    // Return appropriate response
    if (result.success) {
      return new Response(
        JSON.stringify({
          success: true,
          type: result.type,
          entity_id: result.entity_id
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    } else {
      return new Response(
        JSON.stringify({
          success: false,
          error: result.error,
          type: result.type
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

  } catch (error) {
    console.error('Unexpected error in email webhook handler:', error)
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Internal server error',
        details: error.message
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})