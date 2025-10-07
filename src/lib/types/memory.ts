import type { Json } from './database.types'
import type { MemoryStatus, CaptureChannel, ContentFormat } from '../validation/memory'

/**
 * Core memory entity (formerly update)
 */
export interface Memory {
  id: string
  parent_id: string
  child_id: string
  content: string | null
  /** Optional subject line for email-formatted memories */
  subject?: string | null
  /** Rich content stored as JSONB for advanced formatting (Quill Delta, HTML, etc.) */
  rich_content?: Json | null
  /** Format type indicating how the content should be rendered and distributed */
  content_format?: ContentFormat | null
  media_urls: string[] | null
  milestone_type?: string | null
  ai_analysis: Json
  suggested_recipients: string[] | null
  confirmed_recipients: string[] | null
  distribution_status: MemoryStatus
  /** New badge indicator - true until user marks memory as approved */
  is_new: boolean
  /** Source of memory capture: web, email, sms, whatsapp, audio, video */
  capture_channel: CaptureChannel
  /** Timestamp when user marked memory as approved/ready */
  marked_ready_at?: string | null
  created_at: string | null
  summary_id?: string | null
  sent_at?: string | null
  comment_count?: number | null
  like_count?: number | null
  view_count?: number | null
}

/**
 * Request to create a new memory
 */
export interface CreateMemoryRequest {
  child_id: string
  content?: string | null
  /** Optional subject line for email-formatted memories */
  subject?: string | null
  /** Rich content stored as JSONB for advanced formatting */
  rich_content?: Record<string, unknown> | null
  /** Format type indicating how the content should be rendered */
  content_format?: ContentFormat | null
  milestone_type?: string | null
  media_urls?: string[]
  capture_channel?: CaptureChannel
  confirmed_recipients?: string[]
  ai_analysis?: Record<string, unknown>
  suggested_recipients?: string[]
}

/**
 * Memory with engagement statistics and child relation
 */
export type MemoryWithStats = Memory & {
  response_count: number
  last_response_at: string | null
  has_unread_responses: boolean
  // Engagement fields
  like_count: number
  comment_count: number
  isLiked: boolean
  // Child relation for display
  children?: {
    id: string
    name: string
    birth_date: string
    profile_photo_url?: string | null
  }
  photo_count?: number  // Number of photos in this memory
}

/**
 * Memory display data for UI components
 */
export interface MemoryCardData {
  id: string
  child: {
    id: string
    name: string
    age: string
    avatar?: string
  }
  content: string
  subject?: string | null
  rich_content?: Record<string, unknown> | null
  content_format?: ContentFormat | null
  contentPreview: string
  media_urls: string[] | null
  distributionStatus: MemoryStatus
  isNew: boolean  // New badge indicator
  captureChannel: CaptureChannel
  timeAgo: string
  responseCount: number
  hasUnreadResponses: boolean
  likeCount: number
  commentCount: number
  isLiked: boolean
}

/**
 * Props for MemoryCard component
 */
export interface MemoryCardProps {
  memory: MemoryCardData
  onClick: (id: string) => void
  className?: string
}

/**
 * Filter options for memory list
 */
export interface MemoryFilters {
  status?: MemoryStatus | 'all'
  child_id?: string
  is_new?: boolean
  capture_channel?: CaptureChannel
  date_range?: {
    start: string
    end: string
  }
  has_media?: boolean
  has_milestone?: boolean
}

/**
 * Memory list state management
 */
export interface MemoryListState {
  memories: MemoryCardData[]
  loading: boolean
  error: string | null
  hasMore: boolean
  filters: MemoryFilters
}

/**
 * Response to a memory (comment from recipient)
 */
export interface MemoryResponse {
  id: string
  memory_id: string
  recipient_id: string
  content: string
  received_at: string
  read: boolean
}

/**
 * Request to mark memory as approved (ready for compilation)
 */
export interface ApproveMemoryRequest {
  memory_id: string
}

/**
 * Request to mark multiple memories as approved
 */
export interface BulkApproveMemoriesRequest {
  memory_ids: string[]
}

/**
 * Memory activity/feed item
 */
export interface MemoryFeedItem {
  memory: Memory
  child_name: string
  child_avatar?: string
  is_new: boolean
  capture_channel: CaptureChannel
  engagement: {
    likes: number
    comments: number
    views: number
  }
}

/**
 * New memories notification data
 */
export interface NewMemoriesNotification {
  count: number
  latest_memory_id: string
  oldest_memory_timestamp: string
}
