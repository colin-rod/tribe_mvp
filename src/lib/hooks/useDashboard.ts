/**
 * React hooks for dashboard functionality
 * Provides easy-to-use hooks for dashboard updates, search, and engagement
 */

'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { dashboardClient, DASHBOARD_CONSTANTS } from '../supabase/dashboard'
import type {
  UpdateWithChild,
  DashboardStats,
  TimelineUpdate,
  DashboardFilters,
  PaginationParams,
  EngagementUpdatePayload
} from '../types/database'
import { createLogger } from '../logger'

const logger = createLogger('dashboard-hooks')

// Hook for dashboard updates with pagination and filtering
export function useDashboardUpdates(
  parentId: string | null,
  filters: DashboardFilters = {},
  options: {
    enabled?: boolean
    refetchOnMount?: boolean
    refetchInterval?: number
  } = {}
) {
  const [data, setData] = useState<UpdateWithChild[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const [hasMore, setHasMore] = useState(false)
  const [nextCursor, setNextCursor] = useState<{ createdAt: string; id: string } | undefined>()

  const { enabled = true, refetchOnMount = true, refetchInterval } = options

  const fetchUpdates = useCallback(async (
    pagination: PaginationParams = {},
    append = false
  ) => {
    if (!parentId || !enabled) return

    setLoading(true)
    setError(null)

    try {
      const result = await dashboardClient.getDashboardUpdates(
        parentId,
        filters,
        pagination
      )

      if (result.error) {
        setError(result.error)
      } else {
        setData(prevData => append ? [...prevData, ...result.data] : result.data)
        setHasMore(result.hasMore)
        setNextCursor(result.nextCursor)
      }
    } catch (err) {
      setError(err as Error)
    } finally {
      setLoading(false)
    }
  }, [parentId, filters, enabled])

  const loadMore = useCallback(() => {
    if (nextCursor && hasMore && !loading) {
      fetchUpdates({
        cursorCreatedAt: nextCursor.createdAt,
        cursorId: nextCursor.id,
        limit: DASHBOARD_CONSTANTS.DEFAULT_PAGE_SIZE
      }, true)
    }
  }, [nextCursor, hasMore, loading, fetchUpdates])

  const refetch = useCallback(() => {
    fetchUpdates()
  }, [fetchUpdates])

  const shouldFetchOnEffect = refetchOnMount || data.length === 0

  // Initial fetch
  useEffect(() => {
    if (enabled && shouldFetchOnEffect) {
      fetchUpdates()
    }
  }, [enabled, fetchUpdates, shouldFetchOnEffect])

  // Refetch interval
  useEffect(() => {
    if (refetchInterval && enabled && parentId) {
      const interval = setInterval(fetchUpdates, refetchInterval)
      return () => clearInterval(interval)
    }
  }, [refetchInterval, enabled, parentId, fetchUpdates])

  return {
    data,
    loading,
    error,
    hasMore,
    loadMore,
    refetch,
    isEmpty: data.length === 0 && !loading
  }
}

// Hook for dashboard statistics
export function useDashboardStats(
  parentId: string | null,
  dateRange?: { from: string; to: string },
  options: {
    enabled?: boolean
    refetchInterval?: number
  } = {}
) {
  const [data, setData] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const { enabled = true, refetchInterval = DASHBOARD_CONSTANTS.STATS_REFRESH_INTERVAL } = options

  const fetchStats = useCallback(async () => {
    if (!parentId || !enabled) return

    setLoading(true)
    setError(null)

    try {
      const result = await dashboardClient.getDashboardStats(
        parentId,
        dateRange?.from,
        dateRange?.to
      )

      if (result.error) {
        setError(result.error)
      } else {
        setData(result.data)
      }
    } catch (err) {
      setError(err as Error)
    } finally {
      setLoading(false)
    }
  }, [parentId, dateRange, enabled])

  // Initial fetch and refetch on dependencies change
  useEffect(() => {
    fetchStats()
  }, [fetchStats])

  // Refetch interval
  useEffect(() => {
    if (refetchInterval && enabled && parentId) {
      const interval = setInterval(fetchStats, refetchInterval)
      return () => clearInterval(interval)
    }
  }, [refetchInterval, enabled, parentId, fetchStats])

  return {
    data,
    loading,
    error,
    refetch: fetchStats
  }
}

// Hook for timeline updates
export function useTimelineUpdates(
  parentId: string | null,
  filters: Omit<DashboardFilters, 'status'> = {},
  options: {
    enabled?: boolean
    limit?: number
  } = {}
) {
  const [data, setData] = useState<TimelineUpdate[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const { enabled = true, limit = 100 } = options

  const fetchTimeline = useCallback(async () => {
    if (!parentId || !enabled) return

    setLoading(true)
    setError(null)

    try {
      const result = await dashboardClient.getTimelineUpdates(parentId, filters, limit)

      if (result.error) {
        setError(result.error)
      } else {
        setData(result.data)
      }
    } catch (err) {
      setError(err as Error)
    } finally {
      setLoading(false)
    }
  }, [parentId, filters, enabled, limit])

  useEffect(() => {
    fetchTimeline()
  }, [fetchTimeline])

  return {
    data,
    loading,
    error,
    refetch: fetchTimeline
  }
}

// Hook for search with debouncing
export function useUpdateSearch(
  parentId: string | null,
  options: {
    debounceMs?: number
    enabled?: boolean
  } = {}
) {
  const [searchQuery, setSearchQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const [results, setResults] = useState<UpdateWithChild[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const {
    debounceMs = DASHBOARD_CONSTANTS.SEARCH_DEBOUNCE_MS,
    enabled = true
  } = options

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery)
    }, debounceMs)

    return () => clearTimeout(timer)
  }, [searchQuery, debounceMs])

  // Perform search when debounced query changes
  useEffect(() => {
    const performSearch = async () => {
      if (!parentId || !enabled || !debouncedQuery.trim()) {
        setResults([])
        return
      }

      setLoading(true)
      setError(null)

      try {
        const result = await dashboardClient.searchUpdates(parentId, debouncedQuery)

        if (result.error) {
          setError(result.error)
        } else {
          setResults(result.data)
        }
      } catch (err) {
        setError(err as Error)
      } finally {
        setLoading(false)
      }
    }

    performSearch()
  }, [parentId, debouncedQuery, enabled])

  const clearSearch = useCallback(() => {
    setSearchQuery('')
    setDebouncedQuery('')
    setResults([])
    setError(null)
  }, [])

  return {
    searchQuery,
    setSearchQuery,
    results,
    loading,
    error,
    clearSearch,
    hasResults: results.length > 0,
    isSearching: searchQuery.trim() !== ''
  }
}

// Hook for engagement actions (likes, comments)
export function useUpdateEngagement(updateId: string | null, parentId: string | null) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const toggleLike = useCallback(async () => {
    if (!updateId || !parentId) return null

    setLoading(true)
    setError(null)

    try {
      const result = await dashboardClient.toggleUpdateLike(updateId, parentId)

      if (result.error) {
        setError(result.error)
        return null
      }

      return result.data
    } catch (err) {
      setError(err as Error)
      return null
    } finally {
      setLoading(false)
    }
  }, [updateId, parentId])

  const addComment = useCallback(async (content: string) => {
    if (!updateId || !parentId || !content.trim()) return null

    setLoading(true)
    setError(null)

    try {
      const result = await dashboardClient.addUpdateComment(updateId, parentId, content.trim())

      if (result.error) {
        setError(result.error)
        return null
      }

      return result.data
    } catch (err) {
      setError(err as Error)
      return null
    } finally {
      setLoading(false)
    }
  }, [updateId, parentId])

  const incrementViewCount = useCallback(async () => {
    if (!updateId || !parentId) return

    // Fire and forget - don't set loading state for view counts
    try {
      await dashboardClient.incrementViewCount(updateId, parentId)
    } catch (err) {
      // Silently fail view count increments to avoid user-facing errors
      logger.warn('Failed to increment view count', { error: String(err) })
    }
  }, [updateId, parentId])

  return {
    toggleLike,
    addComment,
    incrementViewCount,
    loading,
    error
  }
}

// Hook for real-time engagement updates
export function useEngagementUpdates(
  parentId: string | null,
  options: {
    enabled?: boolean
  } = {}
) {
  const [engagementUpdates, setEngagementUpdates] = useState<Map<string, EngagementUpdatePayload>>(new Map())

  const { enabled = true } = options

  useEffect(() => {
    if (!parentId || !enabled) return

    logger.debug('Setting up engagement updates subscription')

    const unsubscribe = dashboardClient.subscribeToEngagementUpdates(
      parentId,
      (payload) => {
        setEngagementUpdates(prev => {
          const newMap = new Map(prev)
          newMap.set(payload.update_id, payload)
          return newMap
        })
      }
    )

    return unsubscribe
  }, [parentId, enabled])

  const getEngagementForUpdate = useCallback((updateId: string) => {
    return engagementUpdates.get(updateId)
  }, [engagementUpdates])

  return {
    getEngagementForUpdate,
    hasUpdates: engagementUpdates.size > 0
  }
}

// Hook for managing dashboard filters
export function useDashboardFilters(initialFilters: DashboardFilters = {}) {
  const [filters, setFilters] = useState<DashboardFilters>(initialFilters)

  const updateFilter = useCallback((key: keyof DashboardFilters, value: unknown) => {
    setFilters(prev => ({ ...prev, [key]: value }))
  }, [])

  const clearFilter = useCallback((key: keyof DashboardFilters) => {
    setFilters(prev => {
      const newFilters = { ...prev }
      delete newFilters[key]
      return newFilters
    })
  }, [])

  const clearAllFilters = useCallback(() => {
    setFilters({})
  }, [])

  const hasActiveFilters = useMemo(() => {
    return Object.keys(filters).some(key => {
      const value = filters[key as keyof DashboardFilters]
      return value !== undefined && value !== null &&
             (Array.isArray(value) ? value.length > 0 : value !== '')
    })
  }, [filters])

  return {
    filters,
    updateFilter,
    clearFilter,
    clearAllFilters,
    hasActiveFilters,
    setFilters
  }
}

// Hook for infinite scroll
export function useInfiniteScroll(
  hasMore: boolean,
  loadMore: () => void,
  options: {
    threshold?: number
    enabled?: boolean
  } = {}
) {
  const { threshold = 100, enabled = true } = options

  useEffect(() => {
    if (!enabled) return

    const handleScroll = () => {
      if (
        hasMore &&
        window.innerHeight + document.documentElement.scrollTop >=
        document.documentElement.offsetHeight - threshold
      ) {
        loadMore()
      }
    }

    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [hasMore, loadMore, threshold, enabled])
}
