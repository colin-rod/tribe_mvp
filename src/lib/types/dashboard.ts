import type { Update as BaseUpdate } from '@/lib/updates'
import type { Child } from '@/lib/children'

/**
 * Enhanced Update interface for dashboard display with additional computed fields
 */
export interface DashboardUpdate extends BaseUpdate {
  children: {
    id: string
    name: string
    birth_date: string
    profile_photo_url: string | null
  }
  response_count?: number
  last_response_at?: string
  has_unread_responses?: boolean
}

/**
 * Child information for update display
 */
export interface UpdateChildInfo {
  id: string
  name: string
  age: string
  avatar?: string
}

/**
 * Formatted update data optimized for card display
 */
export interface UpdateCardData {
  id: string
  content: string
  contentPreview: string
  child: UpdateChildInfo
  createdAt: Date
  timeAgo: string
  responseCount: number
  hasUnreadResponses: boolean
  lastResponseAt?: Date
  distributionStatus: 'draft' | 'scheduled' | 'sending' | 'sent' | 'failed'
}

/**
 * Props for UpdateCard component
 */
export interface UpdateCardProps {
  update: UpdateCardData
  onClick: (updateId: string) => void
  className?: string
}

/**
 * Props for UpdatesList component
 */
export interface UpdatesListProps {
  limit?: number
  showViewAllLink?: boolean
  className?: string
  onCreateUpdate?: (type?: 'photo' | 'text' | 'video' | 'milestone') => void
}

/**
 * State for updates list loading and error handling
 */
export interface UpdatesListState {
  updates: UpdateCardData[]
  loading: boolean
  error: string | null
  hasMore: boolean
}

/**
 * Response data structure from database
 */
export interface UpdateResponse {
  id: string
  update_id: string
  recipient_id: string
  channel: string
  content: string | null
  media_urls: string[]
  received_at: string
  recipients: {
    id: string
    name: string
    relationship: string
    email: string | null
  }
}

/**
 * Statistics for update engagement
 */
export interface UpdateStats {
  totalResponses: number
  unreadResponses: number
  lastResponseAt?: Date
  responseRate: number
}

/**
 * Time formatting options
 */
export interface TimeFormatOptions {
  relative: boolean
  includeTime: boolean
  format: 'short' | 'medium' | 'long'
}
