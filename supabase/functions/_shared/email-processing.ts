import { InboundEmail, AttachmentInfo } from './types.ts'

/**
 * Cleans email content by removing signatures, forwarding markers, and excessive whitespace
 */
export function cleanEmailContent(content: string): string {
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
export function extractMessageId(emailData: InboundEmail): string {
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
 * Parses SendGrid inbound email form data
 */
/**
 * Extracts email address from "Name <email>" format
 */
export function extractEmailAddress(emailString: string): string {
  if (!emailString) return ''

  // Check if it's in "Name <email>" format
  const match = emailString.match(/<([^>]+)>/)
  if (match) {
    return match[1].trim()
  }

  // Otherwise, assume it's just the email address
  return emailString.trim()
}

export function parseInboundEmail(formData: FormData): InboundEmail {
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
export function isImageFile(filename: string): boolean {
  const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.heic', '.heif', '.bmp', '.tiff', '.svg']
  return imageExtensions.some(ext => filename.toLowerCase().endsWith(ext))
}

/**
 * Determines if a filename represents a video file
 */
export function isVideoFile(filename: string): boolean {
  const videoExtensions = ['.mp4', '.mov', '.avi', '.webm', '.mkv', '.flv', '.wmv', '.m4v', '.3gp']
  return videoExtensions.some(ext => filename.toLowerCase().endsWith(ext))
}

/**
 * Gets the MIME type for a file based on its extension
 */
export function getMimeType(filename: string): string {
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
export function validateAttachment(filename: string, size?: number): { valid: boolean; reason?: string } {
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
export async function uploadAttachmentToStorage(
  attachment: AttachmentInfo,
  parentId: string,
  supabase: any
): Promise<string | null> {
  console.log(`=== UPLOAD DEBUG: Starting upload for "${attachment.filename}" ===`)
  console.log('Attachment details:', {
    filename: attachment.filename,
    name: attachment.name,
    type: attachment.type,
    size: attachment.size,
    contentId: attachment['content-id'],
    hasContent: !!attachment.content,
    contentLength: attachment.content?.length
  })

  try {
    // Validate attachment
    console.log('Step 1: Validating attachment...')
    const validation = validateAttachment(attachment.filename, attachment.size)
    console.log('Validation result:', validation)

    if (!validation.valid) {
      console.warn(`Invalid attachment ${attachment.filename}: ${validation.reason}`)
      return null
    }

    // Check if content exists
    if (!attachment.content) {
      console.error(`No content found for attachment: ${attachment.filename}`)
      return null
    }

    // Decode base64 content
    console.log('Step 2: Decoding base64 content...')
    let binaryContent: Uint8Array
    try {
      binaryContent = Uint8Array.from(atob(attachment.content), c => c.charCodeAt(0))
      console.log(`✓ Successfully decoded ${binaryContent.length} bytes`)
    } catch (decodeError) {
      console.error('Failed to decode base64 content:', decodeError)
      return null
    }

    // Generate unique filename
    console.log('Step 3: Generating file path...')
    const timestamp = Date.now()
    const extension = attachment.filename.split('.').pop()
    const uniqueFilename = `${timestamp}-${crypto.randomUUID()}.${extension}`
    const filePath = `${parentId}/email-attachments/${uniqueFilename}`
    const mimeType = getMimeType(attachment.filename)

    console.log('File upload details:', {
      originalFilename: attachment.filename,
      uniqueFilename,
      filePath,
      mimeType,
      parentId
    })

    // Upload to Supabase Storage
    console.log('Step 4: Uploading to Supabase Storage...')
    const { data, error } = await supabase.storage
      .from('media')
      .upload(filePath, binaryContent, {
        contentType: mimeType,
        upsert: false
      })

    console.log('Upload response:', { data, error })

    if (error) {
      console.error('Failed to upload attachment to storage:', error)
      console.error('Upload error details:', {
        message: error.message,
        statusCode: error.statusCode,
        error: error.error
      })
      return null
    }

    // Get public URL
    console.log('Step 5: Getting public URL...')
    const { data: urlData } = supabase.storage
      .from('media')
      .getPublicUrl(filePath)

    const publicUrl = urlData.publicUrl
    console.log(`✅ Successfully uploaded "${attachment.filename}" to: ${publicUrl}`)

    return publicUrl
  } catch (error) {
    console.error(`❌ Failed to upload attachment "${attachment.filename}":`, error)
    console.error('Error stack:', error.stack)
    return null
  }
}

/**
 * Processes all attachments from an inbound email
 */
export async function processEmailAttachments(
  emailData: InboundEmail,
  parentId: string,
  supabase: any
): Promise<string[]> {
  console.log('=== ATTACHMENT PROCESSING DEBUG: Starting ===')
  console.log('Attachment count:', emailData.attachments)
  console.log('Attachment info keys:', Object.keys(emailData.attachment_info || {}))
  console.log('Parent ID:', parentId)

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
    console.log('=== ATTACHMENT PROCESSING DEBUG: Processing each attachment ===')
    for (const [filename, attachment] of Object.entries(emailData.attachment_info)) {
      console.log(`Processing attachment: "${filename}"`, {
        type: attachment.type,
        size: attachment.size,
        hasContent: !!attachment.content,
        contentLength: attachment.content?.length,
        contentId: attachment['content-id']
      })

      // Only process image and video files
      if (isImageFile(filename) || isVideoFile(filename)) {
        console.log(`✓ "${filename}" is a media file, attempting upload...`)
        const publicUrl = await uploadAttachmentToStorage(attachment, parentId, supabase)
        console.log(`Upload result for "${filename}":`, publicUrl ? `SUCCESS: ${publicUrl}` : 'FAILED')

        if (publicUrl) {
          mediaUrls.push(publicUrl)
        }
      } else {
        console.log(`✗ Skipping non-media attachment: ${filename} (type: ${attachment.type})`)
      }
    }
  } catch (error) {
    console.error('Failed to process email attachments:', error)
    console.error('Error stack:', error.stack)
  }

  console.log('=== ATTACHMENT PROCESSING DEBUG: Completed ===')
  console.log('Final media URLs:', mediaUrls)
  console.log('Total URLs generated:', mediaUrls.length)

  return mediaUrls
}

/**
 * Extracts child information from email subject line
 * Supports format: "Memory for [Child Name]: [content]"
 * Enhanced to better distinguish between child name patterns and regular subjects
 */
export function parseChildFromSubject(subject: string): { childName?: string; content: string } {
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
export function validateEmailSubject(subject: string): { valid: boolean; reason?: string } {
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
export function validateEmailContent(content: string): { valid: boolean; reason?: string } {
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
export function validateSenderAuthentication(emailData: InboundEmail): boolean {
  // Check SPF
  if (emailData.SPF && emailData.SPF.toLowerCase() === 'fail') {
    console.warn(`SPF check failed for ${emailData.from}`)
    return false
  }

  // In production, you might want to be more strict about DKIM
  // For now, we'll accept emails as long as SPF passes or is neutral
  return true
}

/**
 * Processes inline images from email HTML content
 * Extracts cid: references, uploads images to storage, and updates HTML with public URLs
 */
export async function processInlineImages(
  emailData: InboundEmail,
  parentId: string,
  supabase: any
): Promise<{ updatedHtml: string; mediaUrls: string[] }> {
  console.log('=== INLINE IMAGE PROCESSING DEBUG: Starting ===')

  let updatedHtml = emailData.html || ''
  const mediaUrls: string[] = []

  if (!updatedHtml || !updatedHtml.includes('cid:')) {
    console.log('No inline images found in HTML content')
    return { updatedHtml, mediaUrls }
  }

  console.log('HTML contains cid: references, processing...')

  // Find all cid: references in the HTML
  const cidMatches = updatedHtml.match(/src="cid:([^"]+)"/g)
  if (!cidMatches) {
    console.log('No cid: matches found in regex')
    return { updatedHtml, mediaUrls }
  }

  console.log('Found CID references:', cidMatches)

  // Process each cid: reference
  for (const cidMatch of cidMatches) {
    const cidValue = cidMatch.match(/cid:([^"]+)/)?.[1]
    if (!cidValue) continue

    console.log(`Processing CID: ${cidValue}`)

    // Find the corresponding attachment by content-id
    let matchingAttachment: AttachmentInfo | null = null
    let attachmentFilename = ''

    for (const [filename, attachment] of Object.entries(emailData.attachment_info || {})) {
      console.log(`Checking attachment "${filename}":`, {
        contentId: attachment['content-id'],
        targetCid: cidValue
      })

      if (attachment['content-id'] === cidValue) {
        matchingAttachment = attachment
        attachmentFilename = filename
        break
      }
    }

    if (!matchingAttachment) {
      console.log(`❌ No attachment found for CID: ${cidValue}`)
      continue
    }

    console.log(`✓ Found matching attachment: ${attachmentFilename}`)

    // Upload the inline image
    const publicUrl = await uploadAttachmentToStorage(matchingAttachment, parentId, supabase)

    if (publicUrl) {
      console.log(`✅ Uploaded inline image: ${publicUrl}`)

      // Replace the cid: reference with the public URL
      updatedHtml = updatedHtml.replace(cidMatch, `src="${publicUrl}"`)
      mediaUrls.push(publicUrl)

      console.log(`Updated HTML: replaced ${cidMatch} with src="${publicUrl}"`)
    } else {
      console.log(`❌ Failed to upload inline image for CID: ${cidValue}`)
    }
  }

  console.log('=== INLINE IMAGE PROCESSING DEBUG: Completed ===')
  console.log(`Processed ${mediaUrls.length} inline images`)
  console.log('Final media URLs:', mediaUrls)

  return { updatedHtml, mediaUrls }
}

/**
 * Enhanced attachment processor that handles both regular attachments and inline images
 */
export async function processAllEmailMedia(
  emailData: InboundEmail,
  parentId: string,
  supabase: any
): Promise<{ mediaUrls: string[]; updatedHtml: string }> {
  console.log('=== ENHANCED MEDIA PROCESSING: Starting ===')

  const allMediaUrls: string[] = []
  let updatedHtml = emailData.html || ''

  // 1. First, process inline images from HTML (cid: references)
  const inlineResult = await processInlineImages(emailData, parentId, supabase)
  allMediaUrls.push(...inlineResult.mediaUrls)
  updatedHtml = inlineResult.updatedHtml

  console.log(`Inline images processed: ${inlineResult.mediaUrls.length}`)

  // 2. Then process regular email attachments (non-inline files)
  const regularAttachments = await processRegularAttachments(emailData, parentId, supabase, inlineResult.mediaUrls)
  allMediaUrls.push(...regularAttachments)

  console.log(`Regular attachments processed: ${regularAttachments.length}`)

  console.log('=== ENHANCED MEDIA PROCESSING: Completed ===')
  console.log(`Total media URLs: ${allMediaUrls.length}`)

  return {
    mediaUrls: allMediaUrls,
    updatedHtml: updatedHtml
  }
}

/**
 * Processes regular email attachments (excludes ones already processed as inline images)
 */
async function processRegularAttachments(
  emailData: InboundEmail,
  parentId: string,
  supabase: any,
  alreadyProcessedUrls: string[]
): Promise<string[]> {
  console.log('=== REGULAR ATTACHMENT PROCESSING DEBUG: Starting ===')
  console.log('Attachment count:', emailData.attachments)
  console.log('Already processed inline images:', alreadyProcessedUrls.length)

  if (emailData.attachments === 0) {
    console.log('No attachments to process (count = 0)')
    return []
  }

  if (!emailData.attachment_info || Object.keys(emailData.attachment_info).length === 0) {
    console.log('No attachment_info data available')
    return []
  }

  const mediaUrls: string[] = []
  const processedContentIds = new Set<string>()

  // Track which content-ids were already processed as inline images
  // This prevents double-processing the same image
  for (const [filename, attachment] of Object.entries(emailData.attachment_info)) {
    if (attachment['content-id']) {
      // Check if this attachment was already processed as an inline image
      const wasProcessedInline = alreadyProcessedUrls.some(url => url.includes(filename.split('.')[0]))
      if (wasProcessedInline) {
        processedContentIds.add(attachment['content-id'])
        console.log(`Skipping "${filename}" - already processed as inline image`)
      }
    }
  }

  try {
    console.log('=== REGULAR ATTACHMENT PROCESSING: Processing remaining attachments ===')
    for (const [filename, attachment] of Object.entries(emailData.attachment_info)) {
      // Skip if this was already processed as an inline image
      if (attachment['content-id'] && processedContentIds.has(attachment['content-id'])) {
        continue
      }

      console.log(`Processing regular attachment: "${filename}"`, {
        type: attachment.type,
        size: attachment.size,
        hasContent: !!attachment.content,
        contentLength: attachment.content?.length,
        contentId: attachment['content-id']
      })

      // Only process image and video files
      if (isImageFile(filename) || isVideoFile(filename)) {
        console.log(`✓ "${filename}" is a media file, attempting upload...`)
        const publicUrl = await uploadAttachmentToStorage(attachment, parentId, supabase)
        console.log(`Upload result for "${filename}":`, publicUrl ? `SUCCESS: ${publicUrl}` : 'FAILED')

        if (publicUrl) {
          mediaUrls.push(publicUrl)
        }
      } else {
        console.log(`✗ Skipping non-media attachment: ${filename} (type: ${attachment.type})`)
      }
    }
  } catch (error) {
    console.error('Failed to process regular attachments:', error)
    console.error('Error stack:', error.stack)
  }

  console.log('=== REGULAR ATTACHMENT PROCESSING: Completed ===')
  console.log('Regular attachment URLs:', mediaUrls)

  return mediaUrls
}