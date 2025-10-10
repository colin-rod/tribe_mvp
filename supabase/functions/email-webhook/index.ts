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
  processAllEmailMedia,
  parseChildFromSubject,
  validateSenderAuthentication,
  validateEmailSubject,
  validateEmailContent
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

  // Determine the actual subject line vs extracted content
  // For "Memory for Emma: Playing in garden" -> use "Playing in garden" as subject
  // For "tesssst" -> use "tesssst" as subject
  const actualSubject = childName ? subjectContent : emailData.subject

  console.log('Subject parsing debug:', {
    originalSubject: emailData.subject,
    childName,
    subjectContent,
    actualSubject
  })

  // Validate email subject and content
  const subjectValidation = validateEmailSubject(actualSubject)
  if (!subjectValidation.valid) {
    console.log('Invalid email subject:', subjectValidation.reason)
    return { success: false, type: 'memory', error: `Invalid subject: ${subjectValidation.reason}` }
  }

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

  // Process all media (inline images + regular attachments)
  console.log('=== ENHANCED MEDIA DEBUG: About to process all media ===')
  console.log('Email data for media processing:', {
    attachments_count: emailData.attachments,
    attachment_info_keys: Object.keys(emailData.attachment_info || {}),
    has_html: !!emailData.html,
    html_has_cid: emailData.html ? emailData.html.includes('cid:') : false,
    parent_id: profile.id
  })

  const { mediaUrls, updatedHtml } = await processAllEmailMedia(emailData, profile.id, supabase)

  console.log('=== ENHANCED MEDIA DEBUG: Media processing result ===')
  console.log('Media URLs returned:', mediaUrls)
  console.log('Media URLs count:', mediaUrls.length)
  console.log('HTML updated:', updatedHtml !== emailData.html)

  // Clean and prepare content (no longer concatenate subject with body)
  const emailContent = cleanEmailContent(emailData.text || emailData.html)
  const finalContent = emailContent || ''

  // Validate email content
  const contentValidation = validateEmailContent(finalContent)
  if (!contentValidation.valid) {
    console.log('Invalid email content:', contentValidation.reason)
    return { success: false, type: 'memory', error: `Invalid content: ${contentValidation.reason}` }
  }

  // Prepare rich content if HTML is available (use updated HTML with real image URLs)
  let richContent = null
  if (updatedHtml && updatedHtml.trim() !== '') {
    try {
      richContent = {
        html: updatedHtml, // Use the updated HTML with real image URLs
        text: emailData.text || '',
        created_at: new Date().toISOString()
      }
    } catch (error) {
      console.warn('Failed to process HTML content, falling back to text only:', error)
    }
  }

  // Validate that we have some content (subject, body, or media)
  const hasSubject = actualSubject && actualSubject.trim() !== ''
  const hasContent = finalContent && finalContent.trim() !== ''
  const hasMedia = mediaUrls.length > 0

  if (!hasSubject && !hasContent && !hasMedia) {
    return { success: false, type: 'memory', error: 'No content or media found' }
  }

  // Prepare final subject and content values with explicit null handling
  const finalSubject = hasSubject ? actualSubject.trim() : null
  const finalContentValue = hasContent ? finalContent.trim() : null

  // Create update from email content with new schema fields
  const insertData = {
    parent_id: profile.id,
    child_id: childId,
    subject: finalSubject,
    content: finalContentValue,
    rich_content: richContent,
    content_format: 'email' as const, // Explicit type assertion to ensure correct value
    media_urls: mediaUrls,
    distribution_status: 'draft' // Parent can review and send later
  }

  console.log('Creating update with data:', {
    ...insertData,
    rich_content: richContent ? '[HTML content present]' : null,
    debug_values: {
      hasSubject,
      hasContent,
      hasMedia,
      finalSubject,
      finalContentValue
    }
  })

  const { data: update, error: updateError } = await supabase
    .from('memories')
    .insert(insertData)
    .select('id, subject, content, content_format') // Select back the fields to verify
    .single()

  if (updateError) {
    console.error('Failed to create update from email:', updateError)
    console.error('Insert data that failed:', insertData)
    return { success: false, type: 'memory', error: 'Failed to create update', details: updateError.message }
  }

  console.log('Created update from email:', {
    id: update.id,
    subject: update.subject,
    content: update.content,
    content_format: update.content_format,
    expected_subject: finalSubject,
    expected_content_format: 'email'
  })

  // Verify the insert was successful with correct values
  if (update.content_format !== 'email') {
    console.warn('WARNING: content_format was not set to email as expected:', {
      actual: update.content_format,
      expected: 'email',
      update_id: update.id
    })
  }

  if (finalSubject && update.subject !== finalSubject) {
    console.warn('WARNING: subject was not saved as expected:', {
      actual: update.subject,
      expected: finalSubject,
      update_id: update.id
    })
  }

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
  // Extract update ID from email address (update-{uuid}@domain.com)
  const updateMatch = emailData.to.match(/^update-([a-f0-9-]+)@/)
  if (!updateMatch) {
    console.log('Invalid update email format:', emailData.to)
    return { success: false, type: 'response', error: 'Invalid email format' }
  }

  const updateId = updateMatch[1]

  // Verify update exists
  const { data: update, error: updateError } = await supabase
    .from('memories')
    .select('id, parent_id')
    .eq('id', updateId)
    .single()

  if (updateError || !update) {
    console.log('Update not found for response:', updateId)
    return { success: false, type: 'response', error: 'Update not found' }
  }

  // Find recipient by email
  const { data: recipient, error: recipientError } = await supabase
    .from('recipients')
    .select('id, name, relationship')
    .eq('parent_id', update.parent_id)
    .eq('email', emailData.from)
    .eq('is_active', true)
    .single()

  if (recipientError || !recipient) {
    console.log('Unknown recipient for response:', emailData.from)
    return { success: false, type: 'response', error: 'Unknown recipient' }
  }

  // Process attachments
  const mediaUrls = await processEmailAttachments(emailData, update.parent_id, supabase)

  // Clean response content
  const responseContent = cleanEmailContent(emailData.text || emailData.html)

  // Validate response content
  const contentValidation = validateEmailContent(responseContent)
  if (!contentValidation.valid) {
    console.log('Invalid response content:', contentValidation.reason)
    return { success: false, type: 'response', error: `Invalid content: ${contentValidation.reason}` }
  }

  if (!responseContent.trim() && mediaUrls.length === 0) {
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

  if (responseError) {
    console.error('Failed to create response:', responseError)
    return { success: false, type: 'response', error: 'Failed to create response' }
  }

  console.log('Created response from email:', response.id)


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

    // DEBUG: Log all form data keys to see what SendGrid actually sends
    console.log('=== ATTACHMENT DEBUG: Form Data Keys ===')
    const formDataEntries = Array.from(formData.entries())
    formDataEntries.forEach(([key, value]) => {
      if (key.includes('attachment') || key.includes('content-id')) {
        console.log(`FormData[${key}]:`, typeof value === 'string' ? value.substring(0, 100) + '...' : value)
      } else {
        console.log(`FormData[${key}]:`, typeof value === 'string' ? `"${value}"` : value)
      }
    })

    const emailData = parseInboundEmail(formData)

    // DEBUG: Enhanced logging for attachment debugging
    console.log('=== ATTACHMENT DEBUG: Parsed Email Data ===')
    console.log('Received email:', {
      to: emailData.to,
      from: emailData.from,
      subject: emailData.subject,
      attachments: emailData.attachments,
      textLength: emailData.text?.length || 0,
      htmlLength: emailData.html?.length || 0,
      attachment_info_keys: Object.keys(emailData.attachment_info || {}),
      attachment_info_structure: emailData.attachment_info
    })

    // DEBUG: Log specific attachment details
    if (emailData.attachments > 0) {
      console.log('=== ATTACHMENT DEBUG: Individual Attachments ===')
      Object.entries(emailData.attachment_info || {}).forEach(([filename, attachment]) => {
        console.log(`Attachment "${filename}":`, {
          filename: attachment.filename,
          name: attachment.name,
          type: attachment.type,
          contentId: attachment['content-id'],
          size: attachment.size,
          contentLength: attachment.content?.length || 0,
          contentPreview: attachment.content?.substring(0, 50) + '...'
        })
      })
    }

    // DEBUG: Check HTML for inline images
    if (emailData.html && emailData.html.includes('cid:')) {
      console.log('=== ATTACHMENT DEBUG: Inline Images Found ===')
      const cidMatches = emailData.html.match(/src="cid:([^"]+)"/g)
      console.log('CID references in HTML:', cidMatches)
    }

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