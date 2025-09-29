import type { Update as BaseUpdate } from '@/lib/updates'

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
  // Engagement fields
  like_count?: number
  comment_count?: number
  isLiked?: boolean // Computed based on current user
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
  parent_id: string
  child_id: string
  content: string
  contentPreview: string
  child: UpdateChildInfo
  createdAt: Date
  timeAgo: string
  responseCount: number
  hasUnreadResponses: boolean
  lastResponseAt?: Date
  distributionStatus: 'draft' | 'scheduled' | 'sending' | 'sent' | 'failed'
  media_urls: string[]
  milestone_type?: string
  ai_analysis: Record<string, unknown>
  suggested_recipients: string[]
  confirmed_recipients: string[]
  scheduled_for?: string
  sent_at?: string
  // Likes and engagement
  like_count: number
  comment_count: number
  isLiked?: boolean // Computed based on current user
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
  searchQuery?: string
  searchFilters?: Record<string, any>
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
