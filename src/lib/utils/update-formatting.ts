import type { DashboardUpdate, UpdateCardData, UpdateChildInfo } from '@/lib/types/dashboard'
import { calculateAge, formatAgeShort } from '@/lib/age-utils'
import { getTimeAgo } from './time'
import type { ContentFormat } from '@/lib/validation/update'

/**
 * Truncate content for preview display
 */
export function truncateContent(content: string, maxLength: number = 150): string {
  if (content.length <= maxLength) {
    return content
  }

  // Find the last complete word before the limit
  const truncated = content.substring(0, maxLength)
  const lastSpaceIndex = truncated.lastIndexOf(' ')

  if (lastSpaceIndex > 0) {
    return truncated.substring(0, lastSpaceIndex) + '...'
  }

  return truncated + '...'
}

/**
 * Format child information for display
 */
export function formatChildInfo(child: DashboardUpdate['children']): UpdateChildInfo {
  const age = calculateAge(child.birth_date)
  const ageString = formatAgeShort(age)

  return {
    id: child.id,
    name: child.name,
    age: ageString,
    avatar: child.profile_photo_url || undefined
  }
}

/**
 * Transform database update to display-ready card data
 */
export function transformToCardData(update: DashboardUpdate, _currentUserId?: string): UpdateCardData {
  const createdAt = new Date(update.created_at)
  const lastResponseAt = update.last_response_at ? new Date(update.last_response_at) : undefined

  return {
    id: update.id,
    parent_id: update.parent_id,
    child_id: update.child_id,
    content: update.content,
    subject: update.subject,
    rich_content: update.rich_content,
    content_format: update.content_format,
    contentPreview: generateContentPreview(
      update.content,
      update.rich_content,
      update.content_format
    ),
    child: formatChildInfo(update.children),
    createdAt,
    timeAgo: getTimeAgo(createdAt),
    responseCount: update.response_count || 0,
    hasUnreadResponses: update.has_unread_responses || false,
    lastResponseAt,
    distributionStatus: update.distribution_status,
    media_urls: update.media_urls,
    milestone_type: update.milestone_type,
    ai_analysis: update.ai_analysis,
    suggested_recipients: update.suggested_recipients,
    confirmed_recipients: update.confirmed_recipients,
    scheduled_for: update.scheduled_for,
    sent_at: update.sent_at,
    // Engagement fields
    like_count: update.like_count || 0,
    comment_count: update.comment_count || 0,
    isLiked: update.isLiked || false
  }
}

/**
 * Sort updates by creation date (newest first)
 */
export function sortUpdatesByDate(updates: DashboardUpdate[]): DashboardUpdate[] {
  return [...updates].sort((a, b) => {
    const dateA = new Date(a.created_at)
    const dateB = new Date(b.created_at)
    return dateB.getTime() - dateA.getTime()
  })
}

/**
 * Filter updates by status
 */
export function filterUpdatesByStatus(
  updates: DashboardUpdate[],
  statuses: string[]
): DashboardUpdate[] {
  return updates.filter(update => statuses.includes(update.distribution_status))
}

/**
 * Get status display text
 */
export function getStatusDisplayText(status: string): string {
  switch (status) {
    case 'draft':
      return 'Draft'
    case 'scheduled':
      return 'Scheduled'
    case 'sending':
      return 'Sending'
    case 'sent':
      return 'Sent'
    case 'failed':
      return 'Failed'
    default:
      return 'Unknown'
  }
}

/**
 * Get status color class for Tailwind
 */
export function getStatusColorClass(status: string): string {
  switch (status) {
    case 'draft':
      return 'bg-gray-100 text-gray-800'
    case 'scheduled':
      return 'bg-blue-100 text-blue-800'
    case 'sending':
      return 'bg-yellow-100 text-yellow-800'
    case 'sent':
      return 'bg-green-100 text-green-800'
    case 'failed':
      return 'bg-red-100 text-red-800'
    default:
      return 'bg-gray-100 text-gray-800'
  }
}

/**
 * Extract plain text content from rich content based on format
 */
export function extractPlainText(
  content: string,
  richContent?: Record<string, unknown> | null,
  contentFormat: ContentFormat = 'plain'
): string {
  // Ensure content is never null/undefined
  const safeContent = content || ''

  // For email format, use subject + content if available
  if (contentFormat === 'email' && richContent?.subject && typeof richContent.subject === 'string') {
    return `${richContent.subject}: ${safeContent}`
  }

  // For rich text format, try to extract plain text from rich content
  if (contentFormat === 'rich' && richContent) {
    // Handle Quill Delta format
    if (richContent.ops && Array.isArray(richContent.ops)) {
      const extracted = (richContent.ops as Array<{ insert?: string }>)
        .map(op => op.insert || '')
        .join('')
        .replace(/\n/g, ' ')
        .trim()
      return extracted || safeContent
    }

    // Handle HTML content
    if (typeof richContent.html === 'string') {
      const extracted = richContent.html.replace(/<[^>]*>/g, '').trim()
      return extracted || safeContent
    }

    // Handle plain text in rich content
    if (typeof richContent.text === 'string') {
      const extracted = richContent.text.trim()
      return extracted || safeContent
    }
  }

  // Default to the original content field
  return safeContent
}

/**
 * Generate content preview with proper handling of different formats
 */
export function generateContentPreview(
  content: string,
  richContent?: Record<string, unknown> | null,
  contentFormat: ContentFormat = 'plain',
  maxLength: number = 150
): string {
  const plainText = extractPlainText(content || '', richContent, contentFormat)
  return truncateContent(plainText, maxLength)
}

/**
 * Get content format display label
 */
export function getContentFormatDisplayLabel(format: ContentFormat): string {
  switch (format) {
    case 'plain':
      return 'Plain Text'
    case 'rich':
      return 'Rich Text'
    case 'email':
      return 'Email'
    case 'sms':
      return 'SMS'
    case 'whatsapp':
      return 'WhatsApp'
    default:
      return 'Unknown'
  }
}

/**
 * Get content format color class for display
 */
export function getContentFormatColorClass(format: ContentFormat): string {
  switch (format) {
    case 'plain':
      return 'bg-gray-100 text-gray-700'
    case 'rich':
      return 'bg-purple-100 text-purple-700'
    case 'email':
      return 'bg-blue-100 text-blue-700'
    case 'sms':
      return 'bg-green-100 text-green-700'
    case 'whatsapp':
      return 'bg-green-100 text-green-700'
    default:
      return 'bg-gray-100 text-gray-700'
  }
}