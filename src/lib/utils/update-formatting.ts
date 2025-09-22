import type { DashboardUpdate, UpdateCardData, UpdateChildInfo } from '@/lib/types/dashboard'
import { calculateAge, formatAgeShort } from '@/lib/age-utils'
import { getTimeAgo } from './time'

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
export function transformToCardData(update: DashboardUpdate): UpdateCardData {
  const createdAt = new Date(update.created_at)
  const lastResponseAt = update.last_response_at ? new Date(update.last_response_at) : undefined

  return {
    id: update.id,
    content: update.content,
    contentPreview: truncateContent(update.content),
    child: formatChildInfo(update.children),
    createdAt,
    timeAgo: getTimeAgo(createdAt),
    responseCount: update.response_count || 0,
    hasUnreadResponses: update.has_unread_responses || false,
    lastResponseAt,
    distributionStatus: update.distribution_status
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