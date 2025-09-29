/**
 * Like system types for update engagement
 */

/**
 * Like record from the database
 */
export interface Like {
  id: string
  update_id: string
  parent_id: string
  created_at: string
}

/**
 * Like with parent information
 */
export interface LikeWithParent extends Like {
  parent_name: string
  like_count: number
}

/**
 * Response from toggle like operation
 */
export interface LikeToggleResponse {
  is_liked: boolean
  like_count: number
}

/**
 * Like state for UI components
 */
export interface LikeState {
  isLiked: boolean
  likeCount: number
  loading: boolean
  error: string | null
}

/**
 * Parameters for like operations
 */
export interface LikeOperationParams {
  updateId: string
  parentId?: string
}

/**
 * Like analytics data
 */
export interface LikeAnalytics {
  totalLikes: number
  likesByUpdate: Record<string, number>
  topLikedUpdates: Array<{
    updateId: string
    likeCount: number
    content: string
  }>
  likeRate: number // likes per update ratio
}

/**
 * Real-time like update event
 */
export interface LikeUpdateEvent {
  update_id: string
  parent_id: string
  is_liked: boolean
  like_count: number
  action: 'like' | 'unlike'
}

/**
 * Hook return type for like management
 */
export interface UseLikesReturn {
  likeState: LikeState
  toggleLike: () => Promise<void>
  refreshLikes: () => Promise<void>
}

/**
 * Props for like button component
 */
export interface LikeButtonProps {
  updateId: string
  initialLiked?: boolean
  initialCount?: number
  size?: 'sm' | 'md' | 'lg'
  showCount?: boolean
  className?: string
  onLikeChange?: (isLiked: boolean, count: number) => void
}

/**
 * Error types for like operations
 */
export const LikeErrorType = {
  NETWORK_ERROR: 'NETWORK_ERROR',
  PERMISSION_DENIED: 'PERMISSION_DENIED',
  UPDATE_NOT_FOUND: 'UPDATE_NOT_FOUND',
  ALREADY_LIKED: 'ALREADY_LIKED',
  UNKNOWN_ERROR: 'UNKNOWN_ERROR'
} as const

export type LikeErrorType = typeof LikeErrorType[keyof typeof LikeErrorType]

/**
 * Like operation error
 */
export interface LikeError extends Error {
  type: LikeErrorType
  updateId: string
  originalError?: Error
}