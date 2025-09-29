import { useState, useEffect, useCallback, useRef } from 'react'
import { likesService, isLikeError, getLikeErrorMessage } from '@/lib/supabase/likes'
import { createLogger } from '@/lib/logger'
import type { LikeState, UseLikesReturn } from '@/lib/types/likes'

const logger = createLogger('useLikes')

/**
 * Custom hook for managing like state with optimistic updates
 */
export function useLikes(
  updateId: string,
  initialLiked = false,
  initialCount = 0
): UseLikesReturn {
  const [likeState, setLikeState] = useState<LikeState>({
    isLiked: initialLiked,
    likeCount: initialCount,
    loading: false,
    error: null
  })

  const mountedRef = useRef(true)
  const optimisticTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Cleanup on unmount
  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
      if (optimisticTimeoutRef.current) {
        clearTimeout(optimisticTimeoutRef.current)
        optimisticTimeoutRef.current = null
      }
    }
  }, [])

  // Refresh likes from server
  const refreshLikes = useCallback(async () => {
    if (!mountedRef.current) return

    try {
      setLikeState(prev => ({ ...prev, loading: true, error: null }))

      const status = await likesService.getLikeStatus(updateId)

      if (mountedRef.current) {
        setLikeState({
          isLiked: status.isLiked,
          likeCount: status.likeCount,
          loading: false,
          error: null
        })
      }
    } catch (error) {
      if (mountedRef.current) {
        logger.errorWithStack('Error refreshing likes:', error as Error)
        const errorMessage = isLikeError(error)
          ? getLikeErrorMessage(error)
          : 'Failed to refresh likes'

        setLikeState(prev => ({
          ...prev,
          loading: false,
          error: errorMessage
        }))
      }
    }
  }, [updateId])

  // Toggle like with optimistic updates
  const toggleLike = useCallback(async () => {
    if (!mountedRef.current) return

    // Clear any existing optimistic timeout
    if (optimisticTimeoutRef.current) {
      clearTimeout(optimisticTimeoutRef.current)
      optimisticTimeoutRef.current = null
    }

    const previousState = likeState

    try {
      // Optimistic update
      setLikeState(prev => ({
        ...prev,
        isLiked: !prev.isLiked,
        likeCount: prev.isLiked ? prev.likeCount - 1 : prev.likeCount + 1,
        loading: true,
        error: null
      }))

      // Perform the actual toggle
      const result = await likesService.toggleLike(updateId)

      if (mountedRef.current) {
        setLikeState({
          isLiked: result.is_liked,
          likeCount: result.like_count,
          loading: false,
          error: null
        })
      }
    } catch (error) {
      if (mountedRef.current) {
        logger.errorWithStack('Error toggling like:', error as Error)

        // Revert optimistic update after a short delay
        optimisticTimeoutRef.current = setTimeout(() => {
          if (mountedRef.current) {
            setLikeState({
              ...previousState,
              loading: false,
              error: isLikeError(error)
                ? getLikeErrorMessage(error)
                : 'Failed to update like'
            })
          }
        }, 500)
      }
    }
  }, [updateId, likeState])

  // Subscribe to real-time updates
  useEffect(() => {
    const unsubscribe = likesService.subscribeToLikeUpdates(
      updateId,
      (payload) => {
        if (mountedRef.current) {
          setLikeState(prev => ({
            ...prev,
            isLiked: payload.isLiked,
            likeCount: payload.likeCount,
            loading: false,
            error: null
          }))
        }
      }
    )

    return unsubscribe
  }, [updateId])

  return {
    likeState,
    toggleLike,
    refreshLikes
  }
}

/**
 * Hook for batch like operations (useful for lists)
 */
export function useBatchLikes(updateIds: string[]) {
  const [likesData, setLikesData] = useState<Record<string, { isLiked: boolean; likeCount: number }>>({})
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const mountedRef = useRef(true)

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
    }
  }, [])

  const refreshBatchLikes = useCallback(async () => {
    if (!mountedRef.current || updateIds.length === 0) return

    try {
      setLoading(true)
      setError(null)

      const batchData = await likesService.getBatchLikeStatus(updateIds)

      if (mountedRef.current) {
        setLikesData(batchData)
        setLoading(false)
      }
    } catch (error) {
      if (mountedRef.current) {
        logger.errorWithStack('Error refreshing batch likes:', error as Error)
        setError('Failed to load likes data')
        setLoading(false)
      }
    }
  }, [updateIds])

  // Refresh when updateIds change
  useEffect(() => {
    refreshBatchLikes()
  }, [refreshBatchLikes])

  const updateSingleLike = useCallback((updateId: string, isLiked: boolean, likeCount: number) => {
    setLikesData(prev => ({
      ...prev,
      [updateId]: { isLiked, likeCount }
    }))
  }, [])

  return {
    likesData,
    loading,
    error,
    refreshBatchLikes,
    updateSingleLike
  }
}

/**
 * Hook for real-time engagement updates across all user's updates
 */
export function useEngagementUpdates(parentId?: string) {
  const [engagementUpdates, setEngagementUpdates] = useState<Record<string, number>>({})
  const mountedRef = useRef(true)

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
    }
  }, [])

  useEffect(() => {
    if (!parentId) return

    const unsubscribe = likesService.subscribeToEngagementUpdates(
      parentId,
      (payload) => {
        if (mountedRef.current) {
          setEngagementUpdates(prev => ({
            ...prev,
            [payload.update_id]: payload.like_count
          }))
        }
      }
    )

    return unsubscribe
  }, [parentId])

  return {
    engagementUpdates,
    clearEngagementUpdate: useCallback((updateId: string) => {
      setEngagementUpdates(prev => {
        const next = { ...prev }
        delete next[updateId]
        return next
      })
    }, [])
  }
}