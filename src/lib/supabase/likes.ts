import { createClient } from './client'
import { createLogger } from '@/lib/logger'
import type {
  LikeWithParent,
  LikeToggleResponse,
  LikeError
} from '@/lib/types/likes'
import { LikeErrorType } from '@/lib/types/likes'

const logger = createLogger('LikesService')

/**
 * Likes operations using Supabase client
 */
export class LikesService {
  private supabase

  constructor() {
    this.supabase = createClient()
  }

  /**
   * Toggle like on an update with optimistic updates
   */
  async toggleLike(updateId: string): Promise<LikeToggleResponse> {
    try {
      const { data: { user } } = await this.supabase.auth.getUser()
      if (!user) {
        throw this.createError(LikeErrorType.PERMISSION_DENIED, updateId, 'User not authenticated')
      }

      // Call the database function that handles the toggle logic
      const { data, error } = await this.supabase
        .rpc('toggle_update_like', {
          p_update_id: updateId,
          p_parent_id: user.id
        })

      if (error) {
        logger.errorWithStack('Error toggling like:', error as Error)
        throw this.createError(LikeErrorType.UNKNOWN_ERROR, updateId, error.message)
      }

      if (!data || data.length === 0) {
        throw this.createError(LikeErrorType.UPDATE_NOT_FOUND, updateId, 'No data returned from toggle operation')
      }

      const result = data[0]
      return {
        is_liked: result.is_liked,
        like_count: result.like_count
      }
    } catch (error) {
      if (error instanceof Error && 'type' in error) {
        throw error // Re-throw LikeError instances
      }
      throw this.createError(LikeErrorType.NETWORK_ERROR, updateId, error instanceof Error ? error.message : 'Unknown error')
    }
  }

  /**
   * Get like status for an update
   */
  async getLikeStatus(updateId: string): Promise<{ isLiked: boolean; likeCount: number }> {
    try {
      const { data: { user } } = await this.supabase.auth.getUser()
      if (!user) {
        throw this.createError(LikeErrorType.PERMISSION_DENIED, updateId, 'User not authenticated')
      }

      // Get the update with like count
      const { data: updateData, error: updateError } = await this.supabase
        .from('updates')
        .select('like_count')
        .eq('id', updateId)
        .eq('parent_id', user.id)
        .single()

      if (updateError) {
        throw this.createError(LikeErrorType.UPDATE_NOT_FOUND, updateId, updateError.message)
      }

      // Check if user has liked this update
      const { data: likeData, error: likeError } = await this.supabase
        .from('likes')
        .select('id')
        .eq('update_id', updateId)
        .eq('parent_id', user.id)
        .maybeSingle()

      if (likeError) {
        throw this.createError(LikeErrorType.UNKNOWN_ERROR, updateId, likeError.message)
      }

      return {
        isLiked: !!likeData,
        likeCount: updateData.like_count || 0
      }
    } catch (error) {
      if (error instanceof Error && 'type' in error) {
        throw error
      }
      throw this.createError(LikeErrorType.NETWORK_ERROR, updateId, error instanceof Error ? error.message : 'Unknown error')
    }
  }

  /**
   * Get all likes for an update
   */
  async getUpdateLikes(updateId: string): Promise<LikeWithParent[]> {
    try {
      const { data: { user } } = await this.supabase.auth.getUser()
      if (!user) {
        throw this.createError(LikeErrorType.PERMISSION_DENIED, updateId, 'User not authenticated')
      }

      // Use the database function to get likes with parent info
      const { data, error } = await this.supabase
        .rpc('get_update_likes', {
          p_update_id: updateId,
          p_parent_id: user.id
        })

      if (error) {
        throw this.createError(LikeErrorType.UNKNOWN_ERROR, updateId, error.message)
      }

      return data || []
    } catch (error) {
      if (error instanceof Error && 'type' in error) {
        throw error
      }
      throw this.createError(LikeErrorType.NETWORK_ERROR, updateId, error instanceof Error ? error.message : 'Unknown error')
    }
  }

  /**
   * Subscribe to real-time like updates for an update
   */
  subscribeToLikeUpdates(
    updateId: string,
    callback: (payload: { isLiked: boolean; likeCount: number }) => void
  ) {
    const channel = this.supabase
      .channel(`likes:${updateId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'likes',
          filter: `update_id=eq.${updateId}`
        },
        async (_payload: any) => {
          // When likes change, fetch the current status
          try {
            const status = await this.getLikeStatus(updateId)
            callback(status)
          } catch (error) {
            logger.errorWithStack('Error fetching like status in real-time:', error as Error)
          }
        }
      )
      .subscribe()

    return () => {
      this.supabase.removeChannel(channel)
    }
  }

  /**
   * Subscribe to engagement updates from the database trigger
   */
  subscribeToEngagementUpdates(
    parentId: string,
    callback: (payload: { update_id: string; like_count: number }) => void
  ) {
    const channel = this.supabase
      .channel('engagement_updates')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'updates',
          filter: `parent_id=eq.${parentId}`
        },
        (payload: any) => {
          if (payload.new && payload.old) {
            const newData = payload.new as { id: string; like_count: number }
            const oldData = payload.old as { id: string; like_count: number }

            // Only notify if like_count changed
            if (newData.like_count !== oldData.like_count) {
              callback({
                update_id: newData.id,
                like_count: newData.like_count
              })
            }
          }
        }
      )
      .subscribe()

    return () => {
      this.supabase.removeChannel(channel)
    }
  }

  /**
   * Batch get like status for multiple updates
   */
  async getBatchLikeStatus(updateIds: string[]): Promise<Record<string, { isLiked: boolean; likeCount: number }>> {
    try {
      const { data: { user } } = await this.supabase.auth.getUser()
      if (!user) {
        throw new Error('User not authenticated')
      }

      if (updateIds.length === 0) {
        return {}
      }

      // Get like counts for all updates
      const { data: updatesData, error: updatesError } = await this.supabase
        .from('updates')
        .select('id, like_count')
        .in('id', updateIds)
        .eq('parent_id', user.id)

      if (updatesError) {
        throw updatesError
      }

      // Get user's likes for these updates
      const { data: likesData, error: likesError } = await this.supabase
        .from('likes')
        .select('update_id')
        .in('update_id', updateIds)
        .eq('parent_id', user.id)

      if (likesError) {
        throw likesError
      }

      // Build the result object
      const result: Record<string, { isLiked: boolean; likeCount: number }> = {}
      const likedUpdates = new Set(likesData?.map((like: { update_id: string }) => like.update_id) || [])

      updatesData?.forEach((update: { id: string; like_count: number }) => {
        result[update.id] = {
          isLiked: likedUpdates.has(update.id),
          likeCount: update.like_count || 0
        }
      })

      return result
    } catch (error) {
      logger.errorWithStack('Error getting batch like status:', error as Error)
      return {}
    }
  }

  /**
   * Create a structured error
   */
  private createError(type: LikeErrorType, updateId: string, message: string, originalError?: Error): LikeError {
    const error = new Error(message) as LikeError
    error.type = type
    error.updateId = updateId
    error.originalError = originalError
    return error
  }
}

// Export singleton instance
export const likesService = new LikesService()

// Export utility functions
export const isLikeError = (error: unknown): error is LikeError => {
  return !!(error && typeof error === 'object' && 'type' in error && 'updateId' in error)
}

export const getLikeErrorMessage = (error: LikeError): string => {
  switch (error.type) {
    case LikeErrorType.NETWORK_ERROR:
      return 'Network error. Please check your connection and try again.'
    case LikeErrorType.PERMISSION_DENIED:
      return 'You do not have permission to like this update.'
    case LikeErrorType.UPDATE_NOT_FOUND:
      return 'This update could not be found.'
    case LikeErrorType.ALREADY_LIKED:
      return 'You have already liked this update.'
    default:
      return 'An unexpected error occurred. Please try again.'
  }
}