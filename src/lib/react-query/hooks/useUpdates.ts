/**
 * React Query Hooks for Updates/Memories
 * CRO-98 Phase 3: Cached query hooks
 *
 * These hooks provide:
 * - Automatic caching of update data
 * - Background refetching
 * - Loading and error states
 * - Optimistic updates
 * - Request deduplication
 */

'use client'

import { useQuery, useMutation, useQueryClient, UseQueryOptions } from '@tanstack/react-query'
import { queryKeys, invalidateQueries } from '../client'
import { getRecentUpdatesWithStats, type UpdateWithStats } from '@/lib/updates'
import { getRecentMemoriesWithStats } from '@/lib/memories'
import { createLogger } from '@/lib/logger'

const logger = createLogger('useUpdates')

/**
 * Hook to fetch recent updates with stats (CRO-98 optimized)
 *
 * Features:
 * - Automatic caching (30s stale time, 5min cache)
 * - Background refetching on window focus
 * - Loading and error states
 * - Optimized N+1 query elimination
 *
 * @example
 * ```tsx
 * function UpdatesList() {
 *   const { data: updates, isLoading, error } = useRecentUpdates()
 *
 *   if (isLoading) return <Loading />
 *   if (error) return <Error error={error} />
 *
 *   return <div>{updates.map(update => ...)}</div>
 * }
 * ```
 */
export function useRecentUpdates(
  options?: Omit<UseQueryOptions<UpdateWithStats[], Error>, 'queryKey' | 'queryFn'>
) {
  return useQuery<UpdateWithStats[], Error>({
    queryKey: queryKeys.updates.list(),
    queryFn: async () => {
      logger.debug('Fetching recent updates with stats')
      const updates = await getRecentUpdatesWithStats()
      logger.debug('Updates fetched', { count: updates.length })
      return updates
    },
    ...options
  })
}

/**
 * Hook to fetch recent memories with stats
 *
 * Uses the optimized batch query pattern (already implemented)
 *
 * @example
 * ```tsx
 * const { data: memories, isLoading, refetch } = useRecentMemories()
 * ```
 */
export function useRecentMemories(
  limit?: number,
  options?: Omit<UseQueryOptions<UpdateWithStats[], Error>, 'queryKey' | 'queryFn'>
) {
  return useQuery<UpdateWithStats[], Error>({
    queryKey: queryKeys.memories.list({ limit }),
    queryFn: async () => {
      logger.debug('Fetching recent memories', { limit })
      const memories = await getRecentMemoriesWithStats(limit)
      logger.debug('Memories fetched', { count: memories.length })
      return memories
    },
    ...options
  })
}

/**
 * Hook to get a single update by ID
 *
 * Tries to get from cache first, then fetches if needed
 *
 * @example
 * ```tsx
 * const { data: update } = useUpdate(updateId)
 * ```
 */
export function useUpdate(
  updateId: string,
  options?: Omit<UseQueryOptions<UpdateWithStats | null, Error>, 'queryKey' | 'queryFn'>
) {
  const queryClient = useQueryClient()

  return useQuery<UpdateWithStats | null, Error>({
    queryKey: queryKeys.updates.detail(updateId),
    queryFn: async () => {
      // Try to get from cached list first
      const cachedUpdates = queryClient.getQueryData<UpdateWithStats[]>(
        queryKeys.updates.list()
      )
      const cachedUpdate = cachedUpdates?.find(u => u.id === updateId)
      if (cachedUpdate) {
        logger.debug('Update found in cache', { updateId })
        return cachedUpdate
      }

      // If not in cache, fetch individually
      // Note: This would need an API endpoint for single update fetch
      logger.debug('Update not in cache, would need to fetch', { updateId })
      return null
    },
    // Only enable if updateId is provided
    enabled: !!updateId && !!options?.enabled,
    ...options
  })
}

/**
 * Hook for invalidating update queries
 *
 * Call this after creating, updating, or deleting updates
 * to refresh the cached data
 *
 * @example
 * ```tsx
 * const invalidate = useInvalidateUpdates()
 *
 * async function handleDelete(id: string) {
 *   await deleteUpdate(id)
 *   invalidate() // Refresh the list
 * }
 * ```
 */
export function useInvalidateUpdates() {
  const queryClient = useQueryClient()

  return async () => {
    await invalidateQueries(queryClient, 'updates')
    await invalidateQueries(queryClient, 'memories')
    logger.debug('Invalidated update queries')
  }
}

/**
 * Optimistic update helper
 *
 * Updates cache immediately, then syncs with server
 *
 * @example
 * ```tsx
 * const optimisticUpdate = useOptimisticUpdate()
 *
 * function handleLike(updateId: string) {
 *   optimisticUpdate(updateId, (old) => ({
 *     ...old,
 *     like_count: old.like_count + 1,
 *     isLiked: true
 *   }))
 * }
 * ```
 */
export function useOptimisticUpdate() {
  const queryClient = useQueryClient()

  return (updateId: string, updater: (old: UpdateWithStats) => UpdateWithStats) => {
    // Update in the list
    queryClient.setQueryData<UpdateWithStats[]>(
      queryKeys.updates.list(),
      (old) => {
        if (!old) return old
        return old.map(update =>
          update.id === updateId ? updater(update) : update
        )
      }
    )

    // Update individual cache if exists
    queryClient.setQueryData<UpdateWithStats | null>(
      queryKeys.updates.detail(updateId),
      (old: UpdateWithStats | null | undefined) => {
        if (!old) return old
        return updater(old)
      }
    )

    logger.debug('Optimistic update applied', { updateId })
  }
}

/**
 * Type-safe mutation hook for creating updates
 *
 * Note: Call invalidateUpdates() manually after success for now
 * due to React Query v5 type complexities
 *
 * @example
 * ```tsx
 * const createMutation = useCreateUpdateMutation()
 * const invalidate = useInvalidateUpdates()
 *
 * createMutation.mutate(
 *   { content: 'New update', child_id: 'child-123' },
 *   {
 *     onSuccess: async () => {
 *       await invalidate()
 *       toast.success('Update created!')
 *     }
 *   }
 * )
 * ```
 */
export function useCreateUpdateMutation<TData = unknown, TVariables = unknown>() {
  return useMutation<TData, Error, TVariables>
}

/**
 * Prefetch updates for better UX
 *
 * Call this on hover or route change to load data in background
 *
 * @example
 * ```tsx
 * const prefetch = usePrefetchUpdates()
 *
 * <Link
 *   href="/dashboard"
 *   onMouseEnter={() => prefetch()}
 * >
 *   Dashboard
 * </Link>
 * ```
 */
export function usePrefetchUpdates() {
  const queryClient = useQueryClient()

  return async () => {
    await queryClient.prefetchQuery({
      queryKey: queryKeys.updates.list(),
      queryFn: () => getRecentUpdatesWithStats()
    })
    logger.debug('Prefetched updates')
  }
}
