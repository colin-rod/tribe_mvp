// Enhanced Email Webhook for Supabase Edge Functions
// TypeScript-friendly version with proper Deno types

/// <reference types="@types/deno" />

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'

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
  entity_id?: string
  error?: string
  details?: string
}

// Define Supabase client type
type SupabaseClient = ReturnType<typeof createClient>

// =============================================================================
// DATABASE CLIENT
// =============================================================================

function createSupabaseClient(): SupabaseClient {
  const supabaseUrl = Deno.env.get('SUPABASE_URL') || Deno.env.get('DATABASE_URL') || 'http://kong:8000'
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || Deno.env.get('SERVICE_ROLE_KEY') || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU'

  console.log('Creating Supabase client with URL:', supabaseUrl)
  console.log('Service role key available:', !!supabaseKey)

  const client = createClient(supabaseUrl, supabaseKey, {
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

function cleanEmailContent(content: string): string {
  if (!content) return ''

  let cleaned = content
    .replace(/^On .+ wrote:[\s\S]*$/m, '')
    .replace(/^From: .+$/gm, '')
    .replace(/^To: .+$/gm, '')
    .replace(/^Date: .+$/gm, '')
    .replace(/^Subject: .+$/gm, '')
    .replace(/^Sent from my .+$/gm, '')
    .replace(/^Get Outlook for .+$/gm, '')
    .replace(/^Sent from (?:my )?(?:iPhone|iPad|Android|BlackBerry).*/gm, '')
    .replace(/--[\s\S]*$/, '')
    .replace(/<[^>]+>/g, '')
    .replace(/&[^;]+;/g, ' ')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .trim()

  cleaned = cleaned
    .replace(/\n\s*\n\s*\n/g, '\n\n')
    .replace(/[ \t]+/g, ' ')
    .replace(/^\s+/gm, '')

  const lines = cleaned.split('\n')
  const meaningfulLines: string[] = []
  let foundContent = false

  for (const line of lines) {
    const trimmedLine = line.trim()
    if (!foundContent && !trimmedLine) continue
    if (trimmedLine.match(/^>+\s/)) continue
    if (trimmedLine.match(/^_{5,}/)) continue
    if (trimmedLine.match(/^-{5,}/)) continue
    if (trimmedLine.match(/^={5,}/)) continue

    foundContent = true
    meaningfulLines.push(line)

    if (trimmedLine.match(/^(On|Le).+wrote:?$/i)) break
    if (trimmedLine.match(/^From:.+$/i)) break
    if (trimmedLine.match(/^Sent:.+$/i)) break
  }

  cleaned = meaningfulLines.join('\n').trim()
  return cleaned.substring(0, 2000)
}

function extractMessageId(emailData: InboundEmail): string {
  try {
    if (emailData['message-id']) return emailData['message-id']
    const envelope = JSON.parse(emailData.envelope)
    if (envelope.message_id) return envelope.message_id
    return `email-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`
  } catch {
    return `email-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`
  }
}

function extractEmailAddress(emailString: string): string {
  if (!emailString) return ''
  const match = emailString.match(/<([^>]+)>/)
  if (match) return match[1].trim()
  return emailString.trim()
}

function parseInboundEmail(formData: FormData): InboundEmail {
  let attachmentInfo: Record<string, AttachmentInfo> = {}
  const attachmentInfoStr = formData.get('attachment-info') as string
  if (attachmentInfoStr) {
    try {
      attachmentInfo = JSON.parse(attachmentInfoStr)
    } catch (error) {
      console.warn('Failed to parse attachment info:', error)
    }
  }

  // Extract actual file content from FormData entries
  for (const [key, value] of formData.entries()) {
    if (key.startsWith('attachment') && value instanceof File) {
      // Convert File to base64 content for existing attachment processing
      const filename = value.name
      if (attachmentInfo[key]) {
        // Update existing attachment info with actual file data
        attachmentInfo[key] = {
          ...attachmentInfo[key],
          filename: filename,
          name: filename,
          type: value.type,
          size: value.size,
          content: '' // Will be populated from File below
        }
      } else {
        // Create new attachment info entry
        attachmentInfo[key] = {
          filename: filename,
          name: filename,
          type: value.type,
          size: value.size,
          content: '', // Will be populated from File below
          'content-id': undefined
        }
      }

      // Store the actual File object for later processing
      (attachmentInfo[key] as any)._file = value
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

function isImageFile(filename: string): boolean {
  const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.heic', '.heif', '.bmp', '.tiff', '.svg']
  return imageExtensions.some(ext => filename.toLowerCase().endsWith(ext))
}

function isVideoFile(filename: string): boolean {
  const videoExtensions = ['.mp4', '.mov', '.avi', '.webm', '.mkv', '.flv', '.wmv', '.m4v', '.3gp']
  return videoExtensions.some(ext => filename.toLowerCase().endsWith(ext))
}

function getMimeType(filename: string): string {
  const ext = filename.toLowerCase().split('.').pop()
  const mimeTypes: Record<string, string> = {
    'jpg': 'image/jpeg', 'jpeg': 'image/jpeg', 'png': 'image/png', 'gif': 'image/gif',
    'webp': 'image/webp', 'heic': 'image/heic', 'heif': 'image/heif',
    'bmp': 'image/bmp', 'tiff': 'image/tiff', 'svg': 'image/svg+xml',
    'mp4': 'video/mp4', 'mov': 'video/quicktime', 'avi': 'video/x-msvideo',
    'webm': 'video/webm', 'mkv': 'video/x-matroska'
  }
  return mimeTypes[ext || ''] || 'application/octet-stream'
}

function validateAttachment(filename: string, size?: number): { valid: boolean; reason?: string } {
  if (!isImageFile(filename) && !isVideoFile(filename)) {
    return { valid: false, reason: 'Unsupported file type' }
  }
  const maxSize = 50 * 1024 * 1024
  if (size && size > maxSize) {
    return { valid: false, reason: 'File too large (max 50MB)' }
  }
  if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
    return { valid: false, reason: 'Invalid filename' }
  }
  return { valid: true }
}

async function uploadAttachmentToStorage(
  attachment: AttachmentInfo,
  parentId: string,
  supabase: SupabaseClient
): Promise<string | null> {
  console.log(`=== UPLOAD DEBUG: Starting upload for "${attachment.filename}" ===`)

  try {
    const validation = validateAttachment(attachment.filename, attachment.size)
    if (!validation.valid) {
      console.warn(`Invalid attachment ${attachment.filename}: ${validation.reason}`)
      return null
    }

    let binaryContent: Uint8Array

    // Check if we have a File object (from FormData)
    const fileObject = (attachment as any)._file
    if (fileObject && fileObject instanceof File) {
      console.log(`✓ Using File object for "${attachment.filename}" (${fileObject.size} bytes)`)
      const arrayBuffer = await fileObject.arrayBuffer()
      binaryContent = new Uint8Array(arrayBuffer)
      console.log(`✓ Successfully converted File to ${binaryContent.length} bytes`)
    } else if (attachment.content) {
      // Fallback to base64 content if available
      try {
        binaryContent = Uint8Array.from(atob(attachment.content), c => c.charCodeAt(0))
        console.log(`✓ Successfully decoded base64 ${binaryContent.length} bytes`)
      } catch (decodeError) {
        console.error('Failed to decode base64 content:', decodeError)
        return null
      }
    } else {
      console.error(`No content found for attachment: ${attachment.filename}`)
      return null
    }

    const timestamp = Date.now()
    const extension = attachment.filename.split('.').pop()
    const uniqueFilename = `${timestamp}-${crypto.randomUUID()}.${extension}`
    const filePath = `${parentId}/email-attachments/${uniqueFilename}`
    const mimeType = getMimeType(attachment.filename)

    console.log('Uploading to path:', filePath)

    const { error } = await supabase.storage
      .from('media')
      .upload(filePath, binaryContent, {
        contentType: mimeType,
        upsert: false
      })

    if (error) {
      console.error('Failed to upload attachment to storage:', error)
      return null
    }

    const { data: urlData } = supabase.storage
      .from('media')
      .getPublicUrl(filePath)

    const publicUrl = urlData.publicUrl
    console.log(`✅ Successfully uploaded "${attachment.filename}" to: ${publicUrl}`)

    return publicUrl
  } catch (error) {
    console.error(`❌ Failed to upload attachment "${attachment.filename}":`, error)
    return null
  }
}

// =============================================================================
// ENHANCED MEDIA PROCESSING - HANDLES BOTH INLINE AND REGULAR ATTACHMENTS
// =============================================================================

async function processInlineImages(
  emailData: InboundEmail,
  parentId: string,
  supabase: SupabaseClient
): Promise<{ updatedHtml: string; mediaUrls: string[] }> {
  console.log('=== INLINE IMAGE PROCESSING DEBUG: Starting ===')

  let updatedHtml = emailData.html || ''
  const mediaUrls: string[] = []

  if (!updatedHtml || !updatedHtml.includes('cid:')) {
    console.log('No inline images found in HTML content')
    return { updatedHtml, mediaUrls }
  }

  const cidMatches = updatedHtml.match(/src="cid:([^"]+)"/g)
  if (!cidMatches) {
    console.log('No cid: matches found in regex')
    return { updatedHtml, mediaUrls }
  }

  console.log('Found CID references:', cidMatches)

  for (const cidMatch of cidMatches) {
    const cidValue = cidMatch.match(/cid:([^"]+)/)?.[1]
    if (!cidValue) continue

    console.log(`Processing CID: ${cidValue}`)

    let matchingAttachment: AttachmentInfo | null = null

    for (const [filename, attachment] of Object.entries(emailData.attachment_info || {})) {
      console.log(`Checking attachment "${filename}":`, {
        contentId: attachment['content-id'],
        targetCid: cidValue
      })

      if (attachment['content-id'] === cidValue) {
        matchingAttachment = attachment
        break
      }
    }

    if (!matchingAttachment) {
      console.log(`❌ No attachment found for CID: ${cidValue}`)
      continue
    }

    console.log(`✓ Found matching attachment: ${matchingAttachment.filename}`)

    const publicUrl = await uploadAttachmentToStorage(matchingAttachment, parentId, supabase)

    if (publicUrl) {
      console.log(`✅ Uploaded inline image: ${publicUrl}`)
      updatedHtml = updatedHtml.replace(cidMatch, `src="${publicUrl}"`)
      mediaUrls.push(publicUrl)
    }
  }

  console.log(`=== INLINE IMAGE PROCESSING: Completed with ${mediaUrls.length} images ===`)
  return { updatedHtml, mediaUrls }
}

async function processRegularAttachments(
  emailData: InboundEmail,
  parentId: string,
  supabase: SupabaseClient,
  processedContentIds: Set<string>
): Promise<string[]> {
  console.log('=== REGULAR ATTACHMENT PROCESSING: Starting ===')

  if (emailData.attachments === 0) {
    console.log('No attachments to process (count = 0)')
    return []
  }

  if (!emailData.attachment_info || Object.keys(emailData.attachment_info).length === 0) {
    console.log('No attachment_info data available')
    return []
  }

  const mediaUrls: string[] = []

  try {
    for (const [filename, attachment] of Object.entries(emailData.attachment_info)) {
      if (attachment['content-id'] && processedContentIds.has(attachment['content-id'])) {
        console.log(`Skipping "${filename}" - already processed as inline image`)
        continue
      }

      if (isImageFile(filename) || isVideoFile(filename)) {
        console.log(`✓ Processing regular attachment: "${filename}"`)
        const publicUrl = await uploadAttachmentToStorage(attachment, parentId, supabase)

        if (publicUrl) {
          mediaUrls.push(publicUrl)
        }
      } else {
        console.log(`✗ Skipping non-media attachment: ${filename}`)
      }
    }
  } catch (error) {
    console.error('Failed to process regular attachments:', error)
  }

  console.log(`=== REGULAR ATTACHMENT PROCESSING: Completed with ${mediaUrls.length} attachments ===`)
  return mediaUrls
}

async function processAllEmailMedia(
  emailData: InboundEmail,
  parentId: string,
  supabase: SupabaseClient
): Promise<{ mediaUrls: string[]; updatedHtml: string }> {
  console.log('=== ENHANCED MEDIA PROCESSING: Starting ===')

  const allMediaUrls: string[] = []
  const processedContentIds = new Set<string>()

  // 1. First, process inline images from HTML (cid: references)
  const inlineResult = await processInlineImages(emailData, parentId, supabase)
  allMediaUrls.push(...inlineResult.mediaUrls)

  // Track which content-ids were processed as inline images
  for (const [, attachment] of Object.entries(emailData.attachment_info || {})) {
    if (attachment['content-id'] && inlineResult.updatedHtml.includes(attachment['content-id'])) {
      processedContentIds.add(attachment['content-id'])
    }
  }

  console.log(`Inline images processed: ${inlineResult.mediaUrls.length}`)

  // 2. Then process regular email attachments (non-inline files)
  const regularAttachments = await processRegularAttachments(emailData, parentId, supabase, processedContentIds)
  allMediaUrls.push(...regularAttachments)

  console.log(`Regular attachments processed: ${regularAttachments.length}`)
  console.log(`=== ENHANCED MEDIA PROCESSING: Completed with ${allMediaUrls.length} total media files ===`)

  return {
    mediaUrls: allMediaUrls,
    updatedHtml: inlineResult.updatedHtml
  }
}

// =============================================================================
// EMAIL PARSING AND VALIDATION
// =============================================================================

function parseChildFromSubject(subject: string): { childName?: string; content: string } {
  if (!subject || subject.trim() === '') return { content: '' }

  const trimmedSubject = subject.trim()
  const childMatch = trimmedSubject.match(/^Memory\s+for\s+([^:]+):\s*(.+)$/i)

  if (childMatch) {
    const childName = childMatch[1].trim()
    const content = childMatch[2].trim()

    if (childName.length > 0 && childName.length <= 50 && /[a-zA-Z]/.test(childName)) {
      return { childName, content: content || trimmedSubject }
    }
  }

  return { content: trimmedSubject }
}

function validateEmailSubject(subject: string): { valid: boolean; reason?: string } {
  if (!subject) return { valid: true }
  const trimmed = subject.trim()
  if (trimmed.length > 200) return { valid: false, reason: 'Subject too long (max 200 characters)' }
  if (trimmed.includes('<script') || trimmed.includes('javascript:')) {
    return { valid: false, reason: 'Subject contains potentially dangerous content' }
  }
  return { valid: true }
}

function validateEmailContent(content: string): { valid: boolean; reason?: string } {
  if (!content) return { valid: true }
  const trimmed = content.trim()
  if (trimmed.length > 10000) return { valid: false, reason: 'Content too long (max 10,000 characters)' }
  return { valid: true }
}

function validateSenderAuthentication(emailData: InboundEmail): boolean {
  if (emailData.SPF && emailData.SPF.toLowerCase() === 'fail') {
    console.warn(`SPF check failed for ${emailData.from}`)
    return false
  }
  return true
}

// =============================================================================
// ENVIRONMENT VARIABLES
// =============================================================================

const REPLY_TO_DOMAIN = Deno.env.get('REPLY_TO_DOMAIN') || 'colinrodrigues.com'
const MEMORY_EMAIL = `memory@${REPLY_TO_DOMAIN}`

// =============================================================================
// EMAIL HANDLERS
// =============================================================================

async function handleMemoryEmail(emailData: InboundEmail, supabase: SupabaseClient): Promise<EmailProcessingResult> {
  console.log('Processing memory email from:', emailData.from)

  if (!validateSenderAuthentication(emailData)) {
    return { success: false, type: 'memory', error: 'Sender authentication failed' }
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id, name, email')
    .eq('email', emailData.from)
    .single()

  if (profileError || !profile) {
    console.log('Unknown sender for memory email:', emailData.from)
    return { success: false, type: 'memory', error: 'Unknown sender' }
  }

  const { childName, content: subjectContent } = parseChildFromSubject(emailData.subject)
  let childId = null
  const actualSubject = childName ? subjectContent : emailData.subject

  console.log('Subject parsing debug:', {
    originalSubject: emailData.subject,
    childName,
    subjectContent,
    actualSubject
  })

  const subjectValidation = validateEmailSubject(actualSubject)
  if (!subjectValidation.valid) {
    return { success: false, type: 'memory', error: `Invalid subject: ${subjectValidation.reason}` }
  }

  if (childName) {
    const { data: child } = await supabase
      .from('children')
      .select('id')
      .eq('parent_id', profile.id)
      .ilike('name', childName)
      .single()

    if (child) childId = child.id
  }

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
    return { success: false, type: 'memory', error: 'No child found' }
  }

  // Enhanced media processing - handles both inline images AND regular attachments
  console.log('=== ENHANCED MEDIA DEBUG: About to process all media ===')
  const { mediaUrls, updatedHtml } = await processAllEmailMedia(emailData, profile.id, supabase)
  console.log('=== ENHANCED MEDIA DEBUG: Media processing result ===')
  console.log('Media URLs returned:', mediaUrls)
  console.log('Media URLs count:', mediaUrls.length)

  const emailContent = cleanEmailContent(emailData.text || emailData.html)
  const finalContent = emailContent || ''

  const contentValidation = validateEmailContent(finalContent)
  if (!contentValidation.valid) {
    return { success: false, type: 'memory', error: `Invalid content: ${contentValidation.reason}` }
  }

  // Use updated HTML with real image URLs instead of cid: references
  let richContent = null
  if (updatedHtml && updatedHtml.trim() !== '') {
    try {
      richContent = {
        html: updatedHtml,
        text: emailData.text || '',
        created_at: new Date().toISOString()
      }
    } catch (error) {
      console.warn('Failed to process HTML content:', error)
    }
  }

  const hasSubject = actualSubject && actualSubject.trim() !== ''
  const hasContent = finalContent && finalContent.trim() !== ''
  const hasMedia = mediaUrls.length > 0

  if (!hasSubject && !hasContent && !hasMedia) {
    return { success: false, type: 'memory', error: 'No content or media found' }
  }

  const insertData = {
    parent_id: profile.id,
    child_id: childId,
    subject: hasSubject ? actualSubject.trim() : null,
    content: hasContent ? finalContent.trim() : null,
    rich_content: richContent,
    content_format: 'email' as const,
    media_urls: mediaUrls,
    distribution_status: 'draft'
  }

  console.log('Creating update with enhanced media processing:', {
    ...insertData,
    rich_content: richContent ? '[HTML with real image URLs]' : null,
    media_urls_count: mediaUrls.length
  })

  const { data: update, error: updateError } = await supabase
    .from('updates')
    .insert(insertData)
    .select('id, subject, content, content_format, media_urls')
    .single()

  if (updateError) {
    console.error('Failed to create update from email:', updateError)
    return { success: false, type: 'memory', error: 'Failed to create update', details: updateError.message }
  }

  console.log('✅ Created update with enhanced media processing:', {
    id: update.id,
    subject: update.subject,
    content_format: update.content_format,
    media_urls_count: update.media_urls?.length || 0
  })

  return { success: true, type: 'memory', entity_id: update.id }
}

async function handleUpdateResponse(emailData: InboundEmail, supabase: SupabaseClient): Promise<EmailProcessingResult> {
  const updateMatch = emailData.to.match(/^update-([a-f0-9-]+)@/)
  if (!updateMatch) {
    return { success: false, type: 'response', error: 'Invalid email format' }
  }

  const updateId = updateMatch[1]

  const { data: update, error: updateError } = await supabase
    .from('updates')
    .select('id, parent_id')
    .eq('id', updateId)
    .single()

  if (updateError || !update) {
    return { success: false, type: 'response', error: 'Update not found' }
  }

  const { data: recipient, error: recipientError } = await supabase
    .from('recipients')
    .select('id, name, relationship')
    .eq('parent_id', update.parent_id)
    .eq('email', emailData.from)
    .eq('is_active', true)
    .single()

  if (recipientError || !recipient) {
    return { success: false, type: 'response', error: 'Unknown recipient' }
  }

  // Process attachments for response emails too
  const { mediaUrls } = await processAllEmailMedia(emailData, update.parent_id, supabase)

  const responseContent = cleanEmailContent(emailData.text || emailData.html)
  const contentValidation = validateEmailContent(responseContent)
  if (!contentValidation.valid) {
    return { success: false, type: 'response', error: `Invalid content: ${contentValidation.reason}` }
  }

  if (!responseContent.trim() && mediaUrls.length === 0) {
    return { success: false, type: 'response', error: 'No content found' }
  }

  const messageId = extractMessageId(emailData)
  const { data: existingResponse } = await supabase
    .from('responses')
    .select('id')
    .eq('external_id', messageId)
    .single()

  if (existingResponse) {
    return { success: true, type: 'response', entity_id: existingResponse.id }
  }

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

  return { success: true, type: 'response', entity_id: response.id }
}

// =============================================================================
// MAIN WEBHOOK HANDLER
// =============================================================================

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }),
        { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const formData = await req.formData()

    // Enhanced debugging for attachment processing
    console.log('=== ATTACHMENT DEBUG: Form Data Keys ===')
    const formDataEntries = Array.from(formData.entries())
    for (const [key, value] of formDataEntries) {
      if (key.includes('attachment') || key.includes('content-id')) {
        console.log(`FormData[${key}]:`, typeof value === 'string' ? value.substring(0, 100) + '...' : value)
      } else {
        console.log(`FormData[${key}]:`, typeof value === 'string' ? `"${value}"` : value)
      }
    }

    const emailData = parseInboundEmail(formData)

    console.log('=== ENHANCED EMAIL DEBUG ===')
    console.log('Received email:', {
      to: emailData.to,
      from: emailData.from,
      subject: emailData.subject,
      attachments: emailData.attachments,
      textLength: emailData.text?.length || 0,
      htmlLength: emailData.html?.length || 0,
      attachment_info_keys: Object.keys(emailData.attachment_info || {}),
      has_cid_references: emailData.html ? emailData.html.includes('cid:') : false
    })

    // Basic validation
    if (!emailData.to || !emailData.from) {
      return new Response(
        JSON.stringify({ error: 'Missing required email fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabase = createSupabaseClient()
    let result: EmailProcessingResult

    // Route to appropriate handler
    if (emailData.to.toLowerCase().includes(MEMORY_EMAIL.toLowerCase())) {
      result = await handleMemoryEmail(emailData, supabase)
    } else if (emailData.to.match(/^update-([a-f0-9-]+)@/)) {
      result = await handleUpdateResponse(emailData, supabase)
    } else {
      result = { success: false, type: 'unknown', error: `Unhandled email address: ${emailData.to}` }
    }

    // Return response
    const responseData = result.success
      ? { success: true, type: result.type, entity_id: result.entity_id }
      : { success: false, error: result.error, type: result.type }

    return new Response(
      JSON.stringify(responseData),
      {
        status: result.success ? 200 : 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error: unknown) {
    console.error('Unexpected error in email webhook handler:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return new Response(
      JSON.stringify({ success: false, error: 'Internal server error', details: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})