/**
 * Dashboard Updates Client Library
 * Supabase client functions for dashboard functionality with search, engagement, and analytics
 */

import { createClient } from './client'
import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js'
import type {
  DashboardFilters,
  DashboardStats,
  EngagementUpdatePayload,
  PaginationParams,
  TimelineUpdate,
  UpdateWithChild,
  Database
} from '../types/database'
import { createLogger, type LogContext } from '../logger'

const logger = createLogger('dashboard-client')

type UpdateRow = Database['public']['Tables']['memories']['Row']

type CommentRow = Database['public']['Tables']['comments']['Row']

export class DashboardClient {
  private supabase = createClient()

  /**
   * Get paginated dashboard updates with search and filtering
   */
  async getDashboardUpdates(
    parentId: string,
    filters: DashboardFilters = {},
    pagination: PaginationParams = {}
  ): Promise<{
    data: UpdateWithChild[]
    error: Error | null
    hasMore: boolean
    nextCursor?: { createdAt: string; id: string }
  }> {
    try {
      const {
        search,
        childIds,
        milestoneTypes,
        status,
        dateFrom,
        dateTo
      } = filters

      const {
        limit = 20,
        offset = 0,
        cursorCreatedAt,
        cursorId
      } = pagination

      logger.debug('Fetching dashboard updates', {
        parentId,
        filters,
        pagination
      })

      // @ts-expect-error - Supabase RPC type inference issue
      const { data, error } = await this.supabase.rpc('get_dashboard_updates', {
        p_parent_id: parentId,
        p_search_query: search || null,
        p_child_ids: childIds || null,
        p_milestone_types: milestoneTypes || null,
        p_status_filter: status || null,
        p_date_from: dateFrom || null,
        p_date_to: dateTo || null,
        p_limit: limit + 1, // Fetch one extra to check if there are more
        p_offset: offset,
        p_cursor_created_at: cursorCreatedAt || null,
        p_cursor_id: cursorId || null
      })

      if (error) {
        logger.error('Error fetching dashboard updates', { message: error.message, details: error.details, hint: error.hint } as LogContext)
        return { data: [], error: new Error(error.message), hasMore: false }
      }

      const typedData = (data || []) as UpdateWithChild[]
      const hasMore = typedData.length > limit
      const updates = hasMore ? typedData.slice(0, -1) : typedData
      const lastUpdate = updates[updates.length - 1]
      const nextCursor =
        hasMore && lastUpdate?.created_at
          ? { createdAt: lastUpdate.created_at, id: lastUpdate.id }
          : undefined

      logger.debug('Successfully fetched dashboard updates', {
        count: updates.length,
        hasMore,
        nextCursor
      })

      return {
        data: updates,
        error: null,
        hasMore,
        nextCursor
      }
    } catch (err) {
      logger.errorWithStack('Unexpected error fetching dashboard updates', err as Error)
      return {
        data: [],
        error: err as Error,
        hasMore: false
      }
    }
  }

  /**
   * Get timeline updates grouped by date
   */
  async getTimelineUpdates(
    parentId: string,
    filters: Omit<DashboardFilters, 'status'> = {},
    limit: number = 100
  ): Promise<{
    data: TimelineUpdate[]
    error: Error | null
  }> {
    try {
      logger.debug('Fetching timeline updates', { parentId, filters, limit })

      // @ts-expect-error - Supabase RPC type inference issue
      const { data, error } = await this.supabase.rpc('get_timeline_updates', {
        p_parent_id: parentId,
        p_search_query: filters.search || null,
        p_child_ids: filters.childIds || null,
        p_date_from: filters.dateFrom || null,
        p_date_to: filters.dateTo || null,
        p_limit: limit
      })

      if (error) {
        logger.error('Error fetching timeline updates', { message: error.message, details: error.details, hint: error.hint } as LogContext)
        return { data: [], error: new Error(error.message) }
      }

      const typedData = (data || []) as unknown as TimelineUpdate[]
      logger.debug('Successfully fetched timeline updates', { count: typedData.length })

      return { data: typedData, error: null }
    } catch (err) {
      logger.errorWithStack('Unexpected error fetching timeline updates', err as Error)
      return { data: [], error: err as Error }
    }
  }

  /**
   * Get dashboard statistics
   */
  async getDashboardStats(
    parentId: string,
    dateFrom?: string,
    dateTo?: string
  ): Promise<{
    data: DashboardStats | null
    error: Error | null
  }> {
    try {
      logger.debug('Fetching dashboard stats', { parentId, dateFrom, dateTo })

      // @ts-expect-error - Supabase RPC type inference issue
      const { data, error } = await this.supabase.rpc('get_dashboard_stats', {
        p_parent_id: parentId,
        p_date_from: dateFrom || null,
        p_date_to: dateTo || null
      })

      if (error) {
        logger.error('Error fetching dashboard stats', { message: error.message, details: error.details, hint: error.hint } as LogContext)
        return { data: null, error: new Error(error.message) }
      }

      const stats = (data as DashboardStats[] | null)?.[0] || null

      logger.debug('Successfully fetched dashboard stats', stats ? { stats } : undefined)

      return { data: stats, error: null }
    } catch (err) {
      logger.errorWithStack('Unexpected error fetching dashboard stats', err as Error)
      return { data: null, error: err as Error }
    }
  }

  /**
   * Toggle like on an update
   */
  async toggleUpdateLike(
    updateId: string,
    parentId: string
  ): Promise<{
    data: { isLiked: boolean; likeCount: number } | null
    error: Error | null
  }> {
    try {
      logger.debug('Toggling update like', { updateId, parentId })

      // @ts-expect-error - Supabase RPC type inference issue
      const { data, error } = await this.supabase.rpc('toggle_update_like', {
        p_update_id: updateId,
        p_parent_id: parentId
      })

      if (error) {
        logger.error('Error toggling update like', { message: error.message, details: error.details, hint: error.hint } as LogContext)
        return { data: null, error: new Error(error.message) }
      }

      if (!data) {
        return { data: null, error: new Error('No result returned from toggle like') }
      }

      type LikeResult = {
        is_liked: boolean
        like_count: number
      }

      const typedData = data as unknown as LikeResult
      logger.debug('Successfully toggled update like', typedData)

      return {
        data: {
          isLiked: typedData.is_liked,
          likeCount: typedData.like_count
        },
        error: null
      }
    } catch (err) {
      logger.errorWithStack('Unexpected error toggling update like', err as Error)
      return { data: null, error: err as Error }
    }
  }

  /**
   * Add comment to an update
   */
  async addUpdateComment(
    updateId: string,
    parentId: string,
    content: string
  ): Promise<{
    data: { id: string; content: string; createdAt: string; commentCount: number } | null
    error: Error | null
  }> {
    try {
      logger.debug('Adding update comment', { updateId, parentId, contentLength: content.length })

      // @ts-expect-error - Supabase RPC type inference issue
      const { data, error } = await this.supabase.rpc('add_update_comment', {
        p_update_id: updateId,
        p_parent_id: parentId,
        p_content: content
      })

      if (error) {
        logger.error('Error adding update comment', { message: error.message, details: error.details, hint: error.hint } as LogContext)
        return { data: null, error: new Error(error.message) }
      }

      if (!data) {
        return { data: null, error: new Error('No result returned from add comment') }
      }

      type CommentResult = {
        id: string
        content: string
        created_at: string
        comment_count: number
      }

      const typedData = data as unknown as CommentResult
      logger.debug('Successfully added update comment', typedData)

      return {
        data: {
          id: typedData.id,
          content: typedData.content,
          createdAt: typedData.created_at,
          commentCount: typedData.comment_count
        },
        error: null
      }
    } catch (err) {
      logger.errorWithStack('Unexpected error adding update comment', err as Error)
      return { data: null, error: err as Error }
    }
  }

  /**
   * Get likes for an update
   */
  async getUpdateLikes(
    updateId: string,
    parentId: string
  ): Promise<{
    data: Array<{
      id: string
      parentId: string
      parentName: string
      createdAt: string
    }>
    error: Error | null
  }> {
    try {
      logger.debug('Fetching update likes', { updateId, parentId })

      // @ts-expect-error - Supabase RPC type inference issue
      const { data, error } = await this.supabase.rpc('get_update_likes', {
        p_update_id: updateId,
        p_parent_id: parentId
      })

      if (error) {
        logger.error('Error fetching update likes', { message: error.message, details: error.details, hint: error.hint } as LogContext)
        return { data: [], error: new Error(error.message) }
      }

      type LikeType = {
        id: string
        parent_id: string
        parent_name: string
        created_at: string
      }

      const typedData = (data || []) as unknown as LikeType[]
      const likes = typedData.map((like) => ({
        id: like.id,
        parentId: like.parent_id,
        parentName: like.parent_name,
        createdAt: like.created_at
      }))

      logger.debug('Successfully fetched update likes', { count: likes.length })

      return { data: likes, error: null }
    } catch (err) {
      logger.errorWithStack('Unexpected error fetching update likes', err as Error)
      return { data: [], error: err as Error }
    }
  }

  /**
   * Get comments for an update
   * CRO-123: Now supports cursor-based pagination for efficient deep pagination
   */
  async getUpdateComments(
    updateId: string,
    parentId: string,
    pagination: PaginationParams = {}
  ): Promise<{
    data: Array<{
      id: string
      parentId: string
      parentName: string
      content: string
      createdAt: string
      updatedAt: string
    }>
    hasMore: boolean
    nextCursor?: { createdAt: string; id: string }
    error: Error | null
  }> {
    try {
      const {
        limit = 50,
        offset = 0,
        cursor,
        cursorCreatedAt,
        cursorId
      } = pagination

      logger.debug('Fetching update comments', { updateId, parentId, pagination })

      // Use cursor-based function if cursor provided
      const usesCursor = cursor || (cursorCreatedAt && cursorId)
      const functionName = usesCursor ? 'get_update_comments_cursor' : 'get_update_comments'

      const params = usesCursor
        ? {
            p_update_id: updateId,
            p_parent_id: parentId,
            p_limit: limit + 1, // Fetch one extra to check hasMore
            p_cursor_created_at: cursor?.createdAt || cursorCreatedAt || null,
            p_cursor_id: cursor?.id || cursorId || null
          }
        : {
            p_update_id: updateId,
            p_parent_id: parentId,
            p_limit: limit,
            p_offset: offset
          }

      // @ts-expect-error - Supabase RPC type inference issue
      const { data, error } = await this.supabase.rpc(functionName, params)

      if (error) {
        logger.error('Error fetching update comments', { message: error.message, details: error.details, hint: error.hint } as LogContext)
        return { data: [], hasMore: false, error: new Error(error.message) }
      }

      type CommentType = {
        id: string
        parent_id: string
        parent_name: string
        content: string
        created_at: string
        updated_at: string
      }

      const typedData = (data || []) as unknown as CommentType[]

      // Check if there are more results
      const hasMore = usesCursor ? typedData.length > limit : false
      const visibleComments = hasMore ? typedData.slice(0, limit) : typedData

      const comments = visibleComments.map((comment) => ({
        id: comment.id,
        parentId: comment.parent_id,
        parentName: comment.parent_name,
        content: comment.content,
        createdAt: comment.created_at,
        updatedAt: comment.updated_at
      }))

      // Generate next cursor if more results exist
      const nextCursor = hasMore && comments.length > 0
        ? { createdAt: comments[comments.length - 1].createdAt, id: comments[comments.length - 1].id }
        : undefined

      logger.debug('Successfully fetched update comments', { count: comments.length, hasMore, nextCursor })

      return { data: comments, hasMore, nextCursor, error: null }
    } catch (err) {
      logger.errorWithStack('Unexpected error fetching update comments', err as Error)
      return { data: [], hasMore: false, error: err as Error }
    }
  }

  /**
   * Increment view count for an update (for engagement tracking)
   */
  async incrementViewCount(
    updateId: string,
    parentId: string
  ): Promise<{ error: Error | null }> {
    try {
      logger.debug('Incrementing view count', { updateId, parentId })

      // @ts-expect-error - Supabase RPC type inference issue
      const { error } = await this.supabase.rpc('increment_update_view_count', {
        p_update_id: updateId,
        p_parent_id: parentId
      })

      if (error) {
        logger.error('Error incrementing view count', { message: error.message, details: error.details, hint: error.hint } as LogContext)
        return { error: new Error(error.message) }
      }

      logger.debug('Successfully incremented view count')
      return { error: null }
    } catch (err) {
      logger.errorWithStack('Unexpected error incrementing view count', err as Error)
      return { error: err as Error }
    }
  }

  /**
   * Subscribe to real-time engagement updates
   */
  subscribeToEngagementUpdates(
    parentId: string,
    callback: (payload: EngagementUpdatePayload) => void
  ): () => void {
    logger.debug('Setting up engagement updates subscription', { parentId })

    const channel = this.supabase.channel('engagement_updates')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'updates',
          filter: `parent_id=eq.${parentId}`
        },
        (payload: RealtimePostgresChangesPayload<UpdateRow>) => {
          logger.debug('Received engagement update', payload)

          const update = payload.new as Partial<UpdateRow> | null
          if (update && typeof update.id === 'string') {
            const typedUpdate = update as UpdateRow
            callback({
              updateId: typedUpdate.id,
              parentId: typedUpdate.parent_id,
              childId: typedUpdate.child_id,
              likeCount: typedUpdate.like_count,
              commentCount: typedUpdate.comment_count,
              responseCount: typedUpdate.response_count,
              viewCount: typedUpdate.view_count,
              distributionStatus: typedUpdate.distribution_status,
              updatedAt: typedUpdate.updated_at,
              action: 'engagement_update',
              raw: typedUpdate
            })
          }
        }
      )
      .subscribe()

    // Return unsubscribe function
    return () => {
      logger.debug('Unsubscribing from engagement updates')
      this.supabase.removeChannel(channel)
    }
  }

  /**
   * Subscribe to new comments on updates
   */
  subscribeToUpdateComments(
    parentId: string,
    callback: (payload: { updateId: string; comment: CommentRow }) => void
  ): () => void {
    logger.debug('Setting up comments subscription', { parentId })

    const channel = this.supabase.channel('update_comments')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'comments'
        },
        async (payload: RealtimePostgresChangesPayload<CommentRow>) => {
          logger.debug('Received new comment', payload)

          const comment = payload.new
          if (comment) {
            // Verify this comment belongs to an update owned by the parent
            const commentData = comment as Record<string, unknown>
            const { data: update } = await this.supabase
              .from('memories')
              .select('parent_id')
              .eq('id', String(commentData.update_id || ''))
              .single<{ parent_id: string }>()

            if (update?.parent_id === parentId) {
              callback({
                updateId: String((comment as Record<string, unknown>).update_id || ''),
                comment: comment as CommentRow
              })
            }
          }
        }
      )
      .subscribe()

    // Return unsubscribe function
    return () => {
      logger.debug('Unsubscribing from comments updates')
      this.supabase.removeChannel(channel)
    }
  }

  /**
   * Search updates with full-text search
   */
  async searchUpdates(
    parentId: string,
    searchQuery: string,
    options: {
      childIds?: string[]
      limit?: number
      offset?: number
    } = {}
  ): Promise<{
    data: UpdateWithChild[]
    error: Error | null
  }> {
    if (!searchQuery.trim()) {
      return { data: [], error: null }
    }

    return this.getDashboardUpdates(
      parentId,
      {
        search: searchQuery.trim(),
        childIds: options.childIds
      },
      {
        limit: options.limit || 20,
        offset: options.offset || 0
      }
    ).then(result => ({
      data: result.data,
      error: result.error
    }))
  }
}

// Export singleton instance
export const dashboardClient = new DashboardClient()

// Export helper functions for common operations
export const dashboardQueries = {
  async getRecentUpdates(parentId: string, limit: number = 10) {
    return dashboardClient.getDashboardUpdates(parentId, {}, { limit })
  },

  async getMilestoneUpdates(parentId: string, milestoneTypes?: string[]) {
    return dashboardClient.getDashboardUpdates(parentId, { milestoneTypes })
  },

  async getChildUpdates(parentId: string, childIds: string[]) {
    return dashboardClient.getDashboardUpdates(parentId, { childIds })
  },

  async getUpdatesInDateRange(parentId: string, dateFrom: string, dateTo: string) {
    return dashboardClient.getDashboardUpdates(parentId, { dateFrom, dateTo })
  },

  async searchUpdatesDebounced(
    parentId: string,
    searchQuery: string,
    debounceMs: number = 300
  ): Promise<{ data: UpdateWithChild[]; error: Error | null }> {
    // Simple debounce implementation
    return new Promise<{ data: UpdateWithChild[]; error: Error | null }>((resolve) => {
      setTimeout(async () => {
        const result = await dashboardClient.searchUpdates(parentId, searchQuery)
        resolve(result)
      }, debounceMs)
    })
  }
}

// Export constants for dashboard functionality
export const DASHBOARD_CONSTANTS = {
  DEFAULT_PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100,
  SEARCH_DEBOUNCE_MS: 300,
  STATS_REFRESH_INTERVAL: 30000, // 30 seconds
  REAL_TIME_RECONNECT_ATTEMPTS: 5
} as const
