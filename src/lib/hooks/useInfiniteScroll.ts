/**
 * useInfiniteScroll Hook
 * CRO-123: Cursor-based pagination implementation
 *
 * Provides infinite scroll pagination with cursor-based loading
 * Appends new data to existing list for seamless scrolling experience
 */

import { useState, useCallback, useEffect, useRef } from 'react'
import type { PaginationCursor } from '@/lib/types/database'

export interface UseInfiniteScrollOptions<T> {
  /**
   * Function to fetch data for a given cursor
   * Should return data, hasMore flag, and optionally nextCursor
   */
  fetchFn: (cursor?: PaginationCursor) => Promise<{
    data: T[]
    hasMore: boolean
    nextCursor?: PaginationCursor
  }>
  /**
   * Initial data to populate
   * @default []
   */
  initialData?: T[]
  /**
   * Auto-load first page on mount
   * @default true
   */
  autoLoad?: boolean
  /**
   * Callback when load more is triggered
   */
  onLoadMore?: () => void
}

export interface UseInfiniteScrollResult<T> {
  /** All loaded data (accumulates across pages) */
  data: T[]
  /** Loading state */
  isLoading: boolean
  /** Error state */
  error: Error | null
  /** Whether more results can be loaded */
  hasMore: boolean
  /** Load more data (next page) */
  loadMore: () => void
  /** Reset to initial state and reload */
  reset: () => void
  /** Whether initial load is complete */
  isInitialLoad: boolean
}

/**
 * Hook for infinite scroll pagination with cursor-based loading
 *
 * @example
 * ```tsx
 * const { data, isLoading, hasMore, loadMore } = useInfiniteScroll({
 *   fetchFn: async (cursor) => {
 *     const params = cursor ? `?cursor=${encodeCursor(cursor)}` : ''
 *     const response = await fetch(`/api/items${params}`)
 *     return response.json()
 *   }
 * })
 *
 * // In component
 * <InfiniteScrollTrigger
 *   onIntersect={loadMore}
 *   hasMore={hasMore}
 *   isLoading={isLoading}
 * />
 * ```
 */
export function useInfiniteScroll<T>({
  fetchFn,
  initialData = [],
  autoLoad = true,
  onLoadMore
}: UseInfiniteScrollOptions<T>): UseInfiniteScrollResult<T> {
  const [data, setData] = useState<T[]>(initialData)
  const [nextCursor, setNextCursor] = useState<PaginationCursor | undefined>()
  const [hasMore, setHasMore] = useState(true)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const [isInitialLoad, setIsInitialLoad] = useState(true)

  // Prevent duplicate requests
  const loadingRef = useRef(false)

  /**
   * Load more data
   */
  const loadMore = useCallback(async () => {
    if (loadingRef.current || !hasMore) {
      return
    }

    loadingRef.current = true
    setIsLoading(true)
    setError(null)

    // Trigger callback
    onLoadMore?.()

    try {
      const result = await fetchFn(nextCursor)

      setData(prev => [...prev, ...result.data])
      setNextCursor(result.nextCursor)
      setHasMore(result.hasMore)
      setIsInitialLoad(false)
    } catch (err) {
      setError(err as Error)
      setHasMore(false)
    } finally {
      setIsLoading(false)
      loadingRef.current = false
    }
  }, [fetchFn, nextCursor, hasMore, onLoadMore])

  /**
   * Reset to initial state
   */
  const reset = useCallback(() => {
    setData(initialData)
    setNextCursor(undefined)
    setHasMore(true)
    setError(null)
    setIsInitialLoad(true)
    loadingRef.current = false

    // Auto-load first page after reset if autoLoad is true
    if (autoLoad) {
      // Use setTimeout to avoid state update conflicts
      setTimeout(() => {
        loadMore()
      }, 0)
    }
  }, [initialData, autoLoad, loadMore])

  // Auto-load first page on mount
  useEffect(() => {
    if (autoLoad && isInitialLoad) {
      loadMore()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // Only run on mount

  return {
    data,
    isLoading,
    error,
    hasMore,
    loadMore,
    reset,
    isInitialLoad
  }
}

/**
 * Helper hook for intersection observer-based infinite scroll
 *
 * @example
 * ```tsx
 * const { data, hasMore, loadMore } = useInfiniteScroll({ fetchFn })
 * const { ref, inView } = useInfiniteScrollTrigger()
 *
 * useEffect(() => {
 *   if (inView && hasMore) {
 *     loadMore()
 *   }
 * }, [inView, hasMore, loadMore])
 *
 * return (
 *   <div>
 *     {data.map(item => <Item key={item.id} {...item} />)}
 *     <div ref={ref}>Loading...</div>
 *   </div>
 * )
 * ```
 */
export function useInfiniteScrollTrigger(options: IntersectionObserverInit = {}) {
  const [inView, setInView] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const element = ref.current
    if (!element) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        setInView(entry.isIntersecting)
      },
      {
        threshold: 0.1,
        rootMargin: '100px',
        ...options
      }
    )

    observer.observe(element)

    return () => {
      observer.disconnect()
    }
  }, [options])

  return { ref, inView }
}
