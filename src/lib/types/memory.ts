import type { Json } from './database.types'
import type { MemoryStatus, CaptureChannel, ContentFormat } from '../validation/memory'

/**
 * Metadata category types
 */
export type MetadataCategory = 'milestones' | 'locations' | 'dates' | 'people' | 'custom'

/**
 * Structured metadata for memories
 * Supports milestones, locations, dates, people, and custom fields
 */
export interface MemoryMetadata {
  /** Milestone tags (e.g., 'first_steps', 'first_words', 'birthday') */
  milestones: string[]
  /** Location tags (e.g., 'home', 'park', 'grandmas house') */
  locations: string[]
  /** Significant dates mentioned in the memory (ISO date strings) */
  dates: string[]
  /** People mentioned or present (e.g., 'Grandma', 'Uncle John') */
  people: string[]
  /** Custom metadata fields for future extensibility */
  custom: Record<string, unknown>
}

/**
 * AI-suggested metadata with confidence scores
 */
export interface SuggestedMetadata {
  /** Suggested milestone tags */
  milestones: string[]
  /** Suggested location tags */
  locations: string[]
  /** Suggested people tags */
  people: string[]
  /** Suggested date tags */
  dates: string[]
  /** Confidence scores per category (0-1) */
  confidence_scores: {
    milestones?: number
    locations?: number
    people?: number
    dates?: number
  }
}

/**
 * Extended AI analysis structure including metadata suggestions
 */
export interface AIAnalysis {
  sentiment?: string
  suggested_recipients?: string[]
  /** AI-suggested metadata for user confirmation */
  suggested_metadata?: SuggestedMetadata
  [key: string]: unknown
}

/**
 * User's metadata vocabulary entry for autocomplete
 */
export interface UserMetadataValue {
  id: string
  user_id: string
  category: MetadataCategory
  value: string
  usage_count: number
  last_used_at: string
  created_at: string
}

/**
 * Autocomplete suggestion from user's vocabulary
 */
export interface MetadataAutocompleteSuggestion {
  value: string
  usage_count: number
  last_used_at: string
}

/**
 * Filter values for metadata filtering UI
 */
export interface MetadataFilterValues {
  milestones: Array<{ value: string; count: number }>
  locations: Array<{ value: string; count: number }>
  people: Array<{ value: string; count: number }>
  dates: Array<{ value: string; count: number }>
}

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
  /** Structured metadata (milestones, locations, dates, people) */
  metadata?: MemoryMetadata | null
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
  /** Structured metadata for the memory */
  metadata?: MemoryMetadata | null
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

export type RecentMemoriesWithStatsResult = MemoryWithStats[]

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
  /** Structured metadata (milestones, locations, dates, people) */
  metadata?: MemoryMetadata | null
  /** Original creation timestamp for grouping */
  createdAt?: string | null
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
  /** Metadata filters */
  metadata?: {
    milestones?: string[]
    locations?: string[]
    people?: string[]
    dates?: string[]
    match_type?: 'AND' | 'OR'  // How to combine multiple filters
  }
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

/**
 * Request to update memory metadata
 */
export interface UpdateMetadataRequest {
  memory_id: string
  metadata: MemoryMetadata
}

/**
 * Request to update specific metadata category
 */
export interface UpdateMetadataCategoryRequest {
  memory_id: string
  category: MetadataCategory
  values: string[]
}

/**
 * Request to bulk update metadata across multiple memories
 */
export interface BulkUpdateMetadataRequest {
  memory_ids: string[]
  category: MetadataCategory
  values: string[]
  operation: 'add' | 'remove' | 'replace'
}

/**
 * Request to get autocomplete suggestions
 */
export interface MetadataAutocompleteRequest {
  category: MetadataCategory
  query?: string
  limit?: number
}

/**
 * Request to confirm AI-suggested metadata
 */
export interface ConfirmMetadataRequest {
  memory_id: string
  /** Accepted metadata from AI suggestions */
  accepted_metadata: Partial<MemoryMetadata>
  /** Rejected suggestions (for learning) */
  rejected_metadata?: Partial<MemoryMetadata>
}

/**
 * Response from metadata autocomplete API
 */
export interface MetadataAutocompleteResponse {
  suggestions: MetadataAutocompleteSuggestion[]
}

/**
 * Response from bulk metadata update
 */
export interface BulkUpdateMetadataResponse {
  affected_count: number
  updated_memory_ids: string[]
}
