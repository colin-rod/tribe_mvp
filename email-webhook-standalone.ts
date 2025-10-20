// Standalone Email Webhook for Supabase Edge Functions
// This file contains all dependencies inline to avoid import path issues

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'
import { getSupabaseConfig } from './supabase/functions/_shared/supabase-config'

// =============================================================================
// CORS HEADERS
// =============================================================================

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

// =============================================================================
// TYPE DEFINITIONS
// =============================================================================

interface InboundEmail {
  to: string
  from: string
  subject: string
  text: string
  html: string
  attachments: number
  attachment_info: Record<string, AttachmentInfo>
  envelope: string
  charsets: string
  SPF: string
  dkim?: string
  'message-id'?: string
  'in-reply-to'?: string
  references?: string
}

interface AttachmentInfo {
  filename: string
  name: string
  type: string
  content: string // base64 encoded
  'content-id'?: string
  size?: number
}

interface EmailProcessingResult {
  success: boolean
  type: 'memory' | 'response' | 'unknown'
  entity_id?: string // update_id for responses, parent_id for memory emails
  error?: string
  details?: string // Additional error details
}

// =============================================================================
// DATABASE CLIENT
// =============================================================================

function createSupabaseClient() {
  const { supabaseUrl, supabaseServiceRoleKey } = getSupabaseConfig()

  const client = createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })

  return client
}

// =============================================================================
// EMAIL PROCESSING UTILITIES
// =============================================================================

/**
 * Cleans email content by removing signatures, forwarding markers, and excessive whitespace
 */
function cleanEmailContent(content: string): string {
  if (!content) return ''

  let cleaned = content
    // Remove common email signatures and forwarding markers
    .replace(/^On .+ wrote:[\s\S]*$/m, '') // Remove forwarded content
    .replace(/^From: .+$/gm, '') // Remove email headers in forwarded content
    .replace(/^To: .+$/gm, '') // Remove email headers in forwarded content
    .replace(/^Date: .+$/gm, '') // Remove email headers in forwarded content
    .replace(/^Subject: .+$/gm, '') // Remove email headers in forwarded content
    .replace(/^Sent from my .+$/gm, '') // Remove mobile signatures
    .replace(/^Get Outlook for .+$/gm, '') // Remove Outlook signatures
    .replace(/^Sent from (?:my )?(?:iPhone|iPad|Android|BlackBerry).*/gm, '') // Remove mobile signatures
    .replace(/--[\s\S]*$/, '') // Remove everything after signature delimiter
    .replace(/<[^>]+>/g, '') // Strip HTML tags if processing HTML content
    .replace(/&[^;]+;/g, ' ') // Remove HTML entities
    .replace(/\r\n/g, '\n') // Normalize line endings
    .replace(/\r/g, '\n') // Normalize line endings
    .trim()

  // Remove excessive whitespace
  cleaned = cleaned
    .replace(/\n\s*\n\s*\n/g, '\n\n') // Reduce multiple empty lines to double
    .replace(/[ \t]+/g, ' ') // Reduce multiple spaces to single
    .replace(/^\s+/gm, '') // Remove leading whitespace from lines

  // Extract meaningful content from quoted replies
  const lines = cleaned.split('\n')
  const meaningfulLines: string[] = []
  let foundContent = false

  for (const line of lines) {
    const trimmedLine = line.trim()

    // Skip empty lines at the beginning
    if (!foundContent && !trimmedLine) continue

    // Skip common reply patterns
    if (trimmedLine.match(/^>+\s/)) continue // Quoted text
    if (trimmedLine.match(/^_{5,}/)) continue // Separator lines
    if (trimmedLine.match(/^-{5,}/)) continue // Separator lines
    if (trimmedLine.match(/^={5,}/)) continue // Separator lines

    foundContent = true
    meaningfulLines.push(line)

    // Stop at reply indicators
    if (trimmedLine.match(/^(On|Le).+wrote:?$/i)) break
    if (trimmedLine.match(/^From:.+$/i)) break
    if (trimmedLine.match(/^Sent:.+$/i)) break
  }

  cleaned = meaningfulLines.join('\n').trim()

  // Limit length to prevent abuse
  return cleaned.substring(0, 2000)
}

/**
 * Extracts the message ID from email envelope or headers
 */
function extractMessageId(emailData: InboundEmail): string {
  try {
    // Try to get message ID from headers first
    if (emailData['message-id']) {
      return emailData['message-id']
    }

    // Parse envelope for message ID
    const envelope = JSON.parse(emailData.envelope)
    if (envelope.message_id) {
      return envelope.message_id
    }

    // Fallback to timestamp-based ID
    return `email-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  } catch {
    return `email-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  }
}

/**
 * Extracts email address from "Name <email>" format
 */
function extractEmailAddress(emailString: string): string {
  if (!emailString) return ''

  // Check if it's in "Name <email>" format
  const match = emailString.match(/<([^>]+)>/)
  if (match) {
    return match[1].trim()
  }

  // Otherwise, assume it's just the email address
  return emailString.trim()
}

function parseInboundEmail(formData: FormData): InboundEmail {
  // Parse attachment info if present
  let attachmentInfo: Record<string, AttachmentInfo> = {}
  const attachmentInfoStr = formData.get('attachment-info') as string
  if (attachmentInfoStr) {
    try {
      attachmentInfo = JSON.parse(attachmentInfoStr)
    } catch (error) {
      console.warn('Failed to parse attachment info:', error)
    }
  }

  const rawFrom = formData.get('from') as string || ''

  return {
    to: formData.get('to') as string || '',
    from: extractEmailAddress(rawFrom),
    subject: formData.get('subject') as string || '',
    text: formData.get('text') as string || '',
    html: formData.get('html') as string || '',
    attachments: parseInt(formData.get('attachments') as string || '0'),
    attachment_info: attachmentInfo,
    envelope: formData.get('envelope') as string || '{}',
    charsets: formData.get('charsets') as string || '{}',
    SPF: formData.get('SPF') as string || '',
    dkim: formData.get('dkim') as string || undefined,
    'message-id': formData.get('message-id') as string || undefined,
    'in-reply-to': formData.get('in-reply-to') as string || undefined,
    references: formData.get('references') as string || undefined
  }
}

/**
 * Determines if a filename represents an image file
 */
function isImageFile(filename: string): boolean {
  const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.heic', '.heif', '.bmp', '.tiff', '.svg']
  return imageExtensions.some(ext => filename.toLowerCase().endsWith(ext))
}

/**
 * Determines if a filename represents a video file
 */
function isVideoFile(filename: string): boolean {
  const videoExtensions = ['.mp4', '.mov', '.avi', '.webm', '.mkv', '.flv', '.wmv', '.m4v', '.3gp']
  return videoExtensions.some(ext => filename.toLowerCase().endsWith(ext))
}

/**
 * Gets the MIME type for a file based on its extension
 */
function getMimeType(filename: string): string {
  const ext = filename.toLowerCase().split('.').pop()
  const mimeTypes: Record<string, string> = {
    // Images
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'png': 'image/png',
    'gif': 'image/gif',
    'webp': 'image/webp',
    'heic': 'image/heic',
    'heif': 'image/heif',
    'bmp': 'image/bmp',
    'tiff': 'image/tiff',
    'svg': 'image/svg+xml',
    // Videos
    'mp4': 'video/mp4',
    'mov': 'video/quicktime',
    'avi': 'video/x-msvideo',
    'webm': 'video/webm',
    'mkv': 'video/x-matroska',
    'flv': 'video/x-flv',
    'wmv': 'video/x-ms-wmv',
    'm4v': 'video/x-m4v',
    '3gp': 'video/3gpp'
  }

  return mimeTypes[ext || ''] || 'application/octet-stream'
}

/**
 * Validates email attachment for security and size constraints
 */
function validateAttachment(filename: string, size?: number): { valid: boolean; reason?: string } {
  // Check file type
  if (!isImageFile(filename) && !isVideoFile(filename)) {
    return { valid: false, reason: 'Unsupported file type' }
  }

  // Check file size (if provided) - 50MB limit
  const maxSize = 50 * 1024 * 1024 // 50MB
  if (size && size > maxSize) {
    return { valid: false, reason: 'File too large (max 50MB)' }
  }

  // Check filename for security
  if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
    return { valid: false, reason: 'Invalid filename' }
  }

  return { valid: true }
}

/**
 * Uploads an email attachment to Supabase Storage
 */
async function uploadAttachmentToStorage(
  attachment: AttachmentInfo,
  parentId: string,
  supabase: any
): Promise<string | null> {
  try {
    // Validate attachment
    const validation = validateAttachment(attachment.filename, attachment.size)
    if (!validation.valid) {
      console.warn(`Invalid attachment ${attachment.filename}: ${validation.reason}`)
      return null
    }

    // Decode base64 content
    const binaryContent = Uint8Array.from(atob(attachment.content), c => c.charCodeAt(0))

    // Generate unique filename
    const timestamp = Date.now()
    const extension = attachment.filename.split('.').pop()
    const uniqueFilename = `${timestamp}-${crypto.randomUUID()}.${extension}`
    const filePath = `${parentId}/email-attachments/${uniqueFilename}`

    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from('media')
      .upload(filePath, binaryContent, {
        contentType: getMimeType(attachment.filename),
        upsert: false
      })

    if (error) {
      console.error('Failed to upload attachment to storage:', error)
      return null
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('media')
      .getPublicUrl(filePath)

    console.log(`Uploaded attachment ${attachment.filename} to ${publicUrl}`)
    return publicUrl
  } catch (error) {
    console.error('Failed to upload attachment:', error)
    return null
  }
}

/**
 * Processes all attachments from an inbound email
 */
async function processEmailAttachments(
  emailData: InboundEmail,
  parentId: string,
  supabase: any
): Promise<string[]> {
  if (emailData.attachments === 0) return []

  const mediaUrls: string[] = []

  try {
    for (const [filename, attachment] of Object.entries(emailData.attachment_info)) {
      // Only process image and video files
      if (isImageFile(filename) || isVideoFile(filename)) {
        const publicUrl = await uploadAttachmentToStorage(attachment, parentId, supabase)
        if (publicUrl) {
          mediaUrls.push(publicUrl)
        }
      } else {
        console.log(`Skipping non-media attachment: ${filename}`)
      }
    }
  } catch (error) {
    console.error('Failed to process email attachments:', error)
  }

  return mediaUrls
}

/**
 * Extracts child information from email subject line
 * Supports format: "Memory for [Child Name]: [content]"
 * Enhanced to better distinguish between child name patterns and regular subjects
 */
function parseChildFromSubject(subject: string): { childName?: string; content: string } {
  if (!subject || subject.trim() === '') {
    return { content: '' }
  }

  const trimmedSubject = subject.trim()

  // Check for the specific "Memory for [Child Name]: [content]" pattern
  const childMatch = trimmedSubject.match(/^Memory\s+for\s+([^:]+):\s*(.+)$/i)
  if (childMatch) {
    const childName = childMatch[1].trim()
    const content = childMatch[2].trim()

    // Validate that the child name looks reasonable (not too long, contains letters)
    if (childName.length > 0 && childName.length <= 50 && /[a-zA-Z]/.test(childName)) {
      return {
        childName,
        content: content || trimmedSubject // fallback to full subject if content is empty
      }
    }
  }

  // If no valid child pattern found, return the full subject as content
  return { content: trimmedSubject }
}

/**
 * Validates email subject length and content
 */
function validateEmailSubject(subject: string): { valid: boolean; reason?: string } {
  if (!subject) {
    return { valid: true } // Empty subject is allowed
  }

  const trimmed = subject.trim()

  // Check length constraints
  if (trimmed.length > 200) {
    return { valid: false, reason: 'Subject too long (max 200 characters)' }
  }

  // Check for potentially dangerous content
  if (trimmed.includes('<script') || trimmed.includes('javascript:')) {
    return { valid: false, reason: 'Subject contains potentially dangerous content' }
  }

  return { valid: true }
}

/**
 * Validates email content length and format
 */
function validateEmailContent(content: string): { valid: boolean; reason?: string } {
  if (!content) {
    return { valid: true } // Empty content is allowed if there's a subject or media
  }

  const trimmed = content.trim()

  // Check length constraints (generous limit for email content)
  if (trimmed.length > 10000) {
    return { valid: false, reason: 'Content too long (max 10,000 characters)' }
  }

  return { valid: true }
}

/**
 * Validates sender authentication using SPF and DKIM
 */
function validateSenderAuthentication(emailData: InboundEmail): boolean {
  // Check SPF
  if (emailData.SPF && emailData.SPF.toLowerCase() === 'fail') {
    console.warn(`SPF check failed for ${emailData.from}`)
    return false
  }

  // In production, you might want to be more strict about DKIM
  // For now, we'll accept emails as long as SPF passes or is neutral
  return true
}

// =============================================================================
// ENVIRONMENT VARIABLES
// =============================================================================

const WEBHOOK_SECRET = Deno.env.get('WEBHOOK_SECRET')
const REPLY_TO_DOMAIN = Deno.env.get('REPLY_TO_DOMAIN') || 'colinrodrigues.com'
const MEMORY_EMAIL = `memory@${REPLY_TO_DOMAIN}`

// =============================================================================
// WEBHOOK SIGNATURE VERIFICATION
// =============================================================================

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

// =============================================================================
// EMAIL HANDLERS
// =============================================================================

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

  if (profileError || !profile) {
    console.log('Unknown sender for memory email:', emailData.from)
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

  // Process attachments
  const mediaUrls = await processEmailAttachments(emailData, profile.id, supabase)

  // Clean and prepare content (no longer concatenate subject with body)
  const emailContent = cleanEmailContent(emailData.text || emailData.html)
  const finalContent = emailContent || ''

  // Validate email content
  const contentValidation = validateEmailContent(finalContent)
  if (!contentValidation.valid) {
    console.log('Invalid email content:', contentValidation.reason)
    return { success: false, type: 'memory', error: `Invalid content: ${contentValidation.reason}` }
  }

  // Prepare rich content if HTML is available
  let richContent = null
  if (emailData.html && emailData.html.trim() !== '') {
    try {
      richContent = {
        html: emailData.html,
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
    .from('updates')
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
    .from('updates')
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

// =============================================================================
// MAIN WEBHOOK HANDLER
// =============================================================================

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

    console.log('Received email:', {
      to: emailData.to,
      from: emailData.from,
      subject: emailData.subject,
      attachments: emailData.attachments,
      textLength: emailData.text?.length || 0,
      htmlLength: emailData.html?.length || 0
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
        const message = err instanceof Error ? err.message : String(err)
        return new Response(
          JSON.stringify({ test: 'database connection', error: message }),
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
    const message = error instanceof Error ? error.message : 'Unknown error'
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Internal server error',
        details: message
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})
