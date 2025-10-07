import { z } from 'zod'

export const milestoneTypes = [
  'first_smile',
  'rolling',
  'sitting',
  'crawling',
  'first_steps',
  'first_words',
  'first_tooth',
  'walking',
  'potty_training',
  'first_day_school',
  'birthday',
  'other'
] as const

export type MilestoneType = typeof milestoneTypes[number]

// New simplified status system: new → approved → compiled → sent
export const memoryStatuses = [
  'new',       // Newly captured, not yet approved for compilation
  'approved',  // User marked as ready for compilation
  'compiled',  // Included in a summary, awaiting summary approval
  'sent',      // Sent as part of an approved summary
  'failed'     // Send failed (kept for error handling)
] as const

export type MemoryStatus = typeof memoryStatuses[number]

export const captureChannels = [
  'web',
  'email',
  'sms',
  'whatsapp',
  'audio',
  'video'
] as const

export type CaptureChannel = typeof captureChannels[number]

export const contentFormats = [
  'plain',
  'rich',
  'email',
  'sms',
  'whatsapp'
] as const

export type ContentFormat = typeof contentFormats[number]

export const memoryFormSchema = z.object({
  childId: z.string().uuid('Please select a child'),
  content: z.string()
    .min(1, 'Memory content is required')
    .max(2000, 'Memory content must be less than 2000 characters'),
  subject: z.string()
    .max(200, 'Subject must be less than 200 characters')
    .optional(),
  richContent: z.record(z.any()).optional(),
  contentFormat: z.enum(contentFormats).default('plain'),
  milestoneType: z.enum(milestoneTypes).optional(),
  mediaFiles: z.array(z.instanceof(File)).max(10, 'Maximum 10 photos allowed'),
  captureChannel: z.enum(captureChannels).default('web')
})

export type MemoryFormData = z.infer<typeof memoryFormSchema>

export const memoryCreateSchema = z.object({
  child_id: z.string().uuid(),
  content: z.string().min(1).max(2000),
  subject: z.string().max(200).optional(),
  rich_content: z.record(z.any()).optional(),
  content_format: z.enum(contentFormats).default('plain'),
  milestone_type: z.enum(milestoneTypes).optional(),
  media_urls: z.array(z.string().url()).default([]),
  capture_channel: z.enum(captureChannels).default('web'),
  suggested_recipients: z.array(z.string().uuid()).default([]),
  confirmed_recipients: z.array(z.string().uuid()).default([]),
  ai_analysis: z.record(z.any()).default({})
})

export type MemoryCreateData = z.infer<typeof memoryCreateSchema>

export const mediaUploadSchema = z.object({
  files: z.array(z.instanceof(File))
    .min(1, 'At least one file is required')
    .max(10, 'Maximum 10 files allowed')
    .refine(
      (files) => files.every(file =>
        ['image/jpeg', 'image/png', 'image/webp'].includes(file.type)
      ),
      'Only JPEG, PNG, and WebP images are allowed'
    )
    .refine(
      (files) => files.every(file => file.size <= 10 * 1024 * 1024),
      'Each file must be less than 10MB'
    )
})

export type MediaUploadData = z.infer<typeof mediaUploadSchema>

// Helper functions for validation
export function validateMemoryContent(content: string): string | null {
  if (!content.trim()) {
    return 'Memory content is required'
  }
  if (content.length > 2000) {
    return 'Memory content must be less than 2000 characters'
  }
  return null
}

export function validateMediaFiles(files: File[]): string | null {
  if (files.length > 10) {
    return 'Maximum 10 photos allowed'
  }

  for (const file of files) {
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      return 'Only JPEG, PNG, and WebP images are allowed'
    }
    if (file.size > 10 * 1024 * 1024) {
      return 'Each file must be less than 10MB'
    }
  }

  return null
}

export function getMilestoneLabel(milestone: MilestoneType): string {
  const labels: Record<MilestoneType, string> = {
    'first_smile': 'First Smile',
    'rolling': 'Rolling Over',
    'sitting': 'Sitting Up',
    'crawling': 'Crawling',
    'first_steps': 'First Steps',
    'first_words': 'First Words',
    'first_tooth': 'First Tooth',
    'walking': 'Walking',
    'potty_training': 'Potty Training',
    'first_day_school': 'First Day of School',
    'birthday': 'Birthday',
    'other': 'Other'
  }
  return labels[milestone]
}

export function getEmotionalToneLabel(tone: string): string {
  const labels: Record<string, string> = {
    'excited': 'Excited',
    'proud': 'Proud',
    'happy': 'Happy',
    'concerned': 'Concerned',
    'milestone': 'Milestone',
    'routine': 'Routine',
    'funny': 'Funny'
  }
  return labels[tone] || tone
}

export function getImportanceLevelLabel(level: number): string {
  if (level >= 9) return 'Very High'
  if (level >= 7) return 'High'
  if (level >= 5) return 'Medium'
  if (level >= 3) return 'Low'
  return 'Very Low'
}

export function getContentFormatLabel(format: ContentFormat): string {
  const labels: Record<ContentFormat, string> = {
    'plain': 'Plain Text',
    'rich': 'Rich Text',
    'email': 'Email Format',
    'sms': 'SMS Format',
    'whatsapp': 'WhatsApp Format'
  }
  return labels[format]
}

export function getMemoryStatusLabel(status: MemoryStatus): string {
  const labels: Record<MemoryStatus, string> = {
    'new': 'New',
    'approved': 'Ready',
    'compiled': 'In Summary',
    'sent': 'Sent',
    'failed': 'Failed'
  }
  return labels[status]
}

export function getCaptureChannelLabel(channel: CaptureChannel): string {
  const labels: Record<CaptureChannel, string> = {
    'web': 'Web',
    'email': 'Email',
    'sms': 'SMS',
    'whatsapp': 'WhatsApp',
    'audio': 'Audio',
    'video': 'Video'
  }
  return labels[channel]
}

/**
 * Validates subject line requirements for email format memories
 */
export function validateEmailSubject(subject: string | undefined, contentFormat: ContentFormat): string | null {
  if (contentFormat === 'email' && !subject?.trim()) {
    return 'Email subject is required for email format memories'
  }
  if (subject && subject.length > 200) {
    return 'Subject must be less than 200 characters'
  }
  return null
}

/**
 * Validates rich content structure
 */
export function validateRichContent(richContent: Record<string, unknown> | undefined, contentFormat: ContentFormat): string | null {
  if (contentFormat === 'rich' && !richContent) {
    return 'Rich content is required for rich text format memories'
  }
  // Add more specific validation for rich content structure if needed
  return null
}
