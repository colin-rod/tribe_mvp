/**
 * useCursorPagination Hook
 * CRO-123: Cursor-based pagination implementation
 *
 * Provides cursor-based pagination with back/forward navigation
 * Maintains cursor history for efficient page navigation
 */

import { useState, useCallback, useEffect } from 'react'
import type { PaginationCursor } from '@/lib/types/database'

export interface UseCursorPaginationOptions<T> {
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
   * Page size (number of items per page)
   * @default 20
   */
  limit?: number
  /**
   * Auto-load first page on mount
   * @default true
   */
  autoLoad?: boolean
}

export interface UseCursorPaginationResult<T> {
  /** Current page data */
  data: T[]
  /** Loading state */
  isLoading: boolean
  /** Error state */
  error: Error | null
  /** Whether more results exist after current page */
  hasMore: boolean
  /** Whether previous page exists */
  hasPrev: boolean
  /** Current page index (0-based) */
  currentPage: number
  /** Load next page */
  nextPage: () => void
  /** Load previous page */
  prevPage: () => void
  /** Reset to first page */
  reset: () => void
  /** Manually refresh current page */
  refresh: () => void
}

/**
 * Hook for cursor-based pagination with page history
 *
 * @example
 * ```tsx
 * const { data, isLoading, hasMore, nextPage, prevPage } = useCursorPagination({
 *   fetchFn: async (cursor) => {
 *     const response = await fetch(`/api/items?cursor=${cursor ? encodeCursor(cursor) : ''}`)
 *     return response.json()
 *   },
 *   limit: 20
 * })
 * ```
 */
export function useCursorPagination<T>({
  fetchFn,
  limit: _limit = 20, // Prefix with _ to indicate intentionally unused
  autoLoad = true
}: UseCursorPaginationOptions<T>): UseCursorPaginationResult<T> {
  const [data, setData] = useState<T[]>([])
  const [cursors, setCursors] = useState<(PaginationCursor | undefined)[]>([undefined])
  const [currentPage, setCurrentPage] = useState(0)
  const [hasMore, setHasMore] = useState(true)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const loadPage = useCallback(async (pageIndex: number) => {
    if (pageIndex < 0 || pageIndex >= cursors.length) {
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const cursor = cursors[pageIndex]
      const result = await fetchFn(cursor)

      setData(result.data)
      setHasMore(result.hasMore)
      setCurrentPage(pageIndex)

      // Store next cursor if available and not already stored
      if (result.nextCursor && !cursors[pageIndex + 1]) {
        setCursors(prev => [...prev, result.nextCursor])
      }
    } catch (err) {
      setError(err as Error)
      setData([])
      setHasMore(false)
    } finally {
      setIsLoading(false)
    }
  }, [cursors, fetchFn])

  /**
   * Navigate to next page
   */
  const nextPage = useCallback(() => {
    if (hasMore && !isLoading) {
      loadPage(currentPage + 1)
    }
  }, [hasMore, isLoading, currentPage, loadPage])

  /**
   * Navigate to previous page
   */
  const prevPage = useCallback(() => {
    if (currentPage > 0 && !isLoading) {
      loadPage(currentPage - 1)
    }
  }, [currentPage, isLoading, loadPage])

  /**
   * Reset to first page and clear cursor history
   */
  const reset = useCallback(() => {
    setData([])
    setCursors([undefined])
    setCurrentPage(0)
    setHasMore(true)
    setError(null)
    loadPage(0)
  }, [loadPage])

  /**
   * Refresh current page
   */
  const refresh = useCallback(() => {
    loadPage(currentPage)
  }, [currentPage, loadPage])

  // Auto-load first page on mount
  useEffect(() => {
    if (autoLoad) {
      loadPage(0)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // Only run on mount

  return {
    data,
    isLoading,
    error,
    hasMore,
    hasPrev: currentPage > 0,
    currentPage,
    nextPage,
    prevPage,
    reset,
    refresh
  }
}
