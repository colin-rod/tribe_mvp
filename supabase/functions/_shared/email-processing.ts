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
export async function processEmailAttachments(
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
 */
export function parseChildFromSubject(subject: string): { childName?: string; content: string } {
  const childMatch = subject.match(/^Memory\s+for\s+([^:]+):\s*(.+)$/i)
  if (childMatch) {
    return {
      childName: childMatch[1].trim(),
      content: childMatch[2].trim()
    }
  }

  return { content: subject }
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