'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { createLogger } from '@/lib/logger'
import { getRecentUpdatesWithStats } from '@/lib/updates'
import { transformToCardData } from '@/lib/utils/update-formatting'
import type { DashboardUpdate, UpdateCardData } from '@/lib/types/dashboard'
import type { SearchFilters } from './useSearchDebounced'

const logger = createLogger('useTimelineData')

export interface TimelineGroup {
  date: string
  displayDate: string
  updates: UpdateCardData[]
  count: number
}

export interface UseTimelineDataOptions {
  pageSize?: number
  initialLoad?: boolean
  enableCaching?: boolean
  cacheTimeout?: number
}

export interface UseTimelineDataReturn {
  timelineGroups: TimelineGroup[]
  filteredGroups: TimelineGroup[]
  loading: boolean
  error: string | null
  hasMore: boolean
  totalCount: number
  loadMore: () => Promise<void>
  refresh: () => Promise<void>
  applyFilters: (query: string, filters: SearchFilters) => void
  clearFilters: () => void
  isFiltered: boolean
  retryCount: number
  maxRetries: number
  canRetry: boolean
  stats: {
    totalUpdates: number
    totalDays: number
    averagePerDay: number
  }
}

interface CachedData {
  data: UpdateCardData[]
  timestamp: number
}

const CACHE_KEY = 'timeline_data'
const DEFAULT_CACHE_TIMEOUT = 5 * 60 * 1000 // 5 minutes

/**
 * Hook for managing timeline data with virtual scrolling, filtering, and caching
 * Groups updates by date and provides efficient data management for large datasets
 */
export function useTimelineData({
  pageSize = 20,
  initialLoad = true,
  enableCaching = true,
  cacheTimeout = DEFAULT_CACHE_TIMEOUT
}: UseTimelineDataOptions = {}): UseTimelineDataReturn {
  const [allUpdates, setAllUpdates] = useState<UpdateCardData[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(true)
  const [currentPage, setCurrentPage] = useState(0)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchFilters, setSearchFilters] = useState<SearchFilters>({})
  const [retryCount, setRetryCount] = useState(0)

  const maxRetries = 3
  const canRetry = retryCount < maxRetries

  // Group updates by date
  const timelineGroups = useMemo(() => {
    const groups: { [key: string]: TimelineGroup } = {}

    allUpdates.forEach(update => {
      const date = new Date(update.createdAt).toDateString()
      const displayDate = formatDisplayDate(new Date(update.createdAt))

      if (!groups[date]) {
        groups[date] = {
          date,
          displayDate,
          updates: [],
          count: 0
        }
      }

      groups[date].updates.push(update)
      groups[date].count++
    })

    // Sort groups by date (most recent first)
    return Object.values(groups).sort((a, b) =>
      new Date(b.date).getTime() - new Date(a.date).getTime()
    )
  }, [allUpdates])

  // Apply search and filters
  const filteredGroups = useMemo(() => {
    if (!searchQuery && !Object.keys(searchFilters).length) {
      return timelineGroups
    }

    const filtered = timelineGroups.map(group => {
      const filteredUpdates = group.updates.filter(update => {
        // Text search
        if (searchQuery) {
          const searchLower = searchQuery.toLowerCase()
          const matchesText =
            update.content.toLowerCase().includes(searchLower) ||
            (update.contentPreview && update.contentPreview.toLowerCase().includes(searchLower)) ||
            (update.milestone_type && update.milestone_type.toLowerCase().includes(searchLower))

          if (!matchesText) return false
        }

        // Content type filter
        if (searchFilters.contentType && searchFilters.contentType !== 'all') {
          if (update.milestone_type !== searchFilters.contentType) return false
        }

        // Date range filter
        if (searchFilters.dateRange) {
          const updateDate = new Date(update.createdAt)
          if (searchFilters.dateRange.start && updateDate < searchFilters.dateRange.start) {
            return false
          }
          if (searchFilters.dateRange.end && updateDate > searchFilters.dateRange.end) {
            return false
          }
        }

        // Child filter
        if (searchFilters.childId && update.child_id !== searchFilters.childId) {
          return false
        }

        // Milestone filter (replacing tags)
        if (searchFilters.tags?.length) {
          const hasMatchingMilestone = searchFilters.tags.some(tag =>
            update.milestone_type === tag
          )
          if (!hasMatchingMilestone) return false
        }

        return true
      })

      return {
        ...group,
        updates: filteredUpdates,
        count: filteredUpdates.length
      }
    }).filter(group => group.updates.length > 0)

    return filtered
  }, [timelineGroups, searchQuery, searchFilters])

  // Load data from cache
  const loadFromCache = useCallback((): UpdateCardData[] | null => {
    if (!enableCaching) return null

    try {
      const cached = localStorage.getItem(CACHE_KEY)
      if (!cached) return null

      const parsedCache: CachedData = JSON.parse(cached)
      const isExpired = Date.now() - parsedCache.timestamp > cacheTimeout

      if (isExpired) {
        localStorage.removeItem(CACHE_KEY)
        return null
      }

      return parsedCache.data
    } catch (error) {
      logger.error('Error loading from cache:', { error })
      return null
    }
  }, [enableCaching, cacheTimeout])

  // Save data to cache
  const saveToCache = useCallback((data: UpdateCardData[]) => {
    if (!enableCaching) return

    try {
      const cacheData: CachedData = {
        data,
        timestamp: Date.now()
      }
      localStorage.setItem(CACHE_KEY, JSON.stringify(cacheData))
    } catch (error) {
      logger.error('Error saving to cache:', { error })
    }
  }, [enableCaching])

  // Load updates from API with retry logic
  const loadUpdates = useCallback(async (page: number, append = false) => {
    try {
      setLoading(true)
      setError(null)

      const rawUpdates = await getRecentUpdatesWithStats(pageSize, page * pageSize)
      const transformedUpdates = rawUpdates.map((update) =>
        transformToCardData(update as DashboardUpdate)
      )

      if (append) {
        setAllUpdates(prev => [...prev, ...transformedUpdates])
      } else {
        setAllUpdates(transformedUpdates)
        saveToCache(transformedUpdates)
      }

      setHasMore(transformedUpdates.length === pageSize)
      setCurrentPage(page)
      setRetryCount(0) // Reset retry count on success
    } catch (err) {
      logger.error('Error loading timeline data:', { error: err, page, retryCount })

      setRetryCount(prev => prev + 1)

      // Provide user-friendly error messages based on error type
      let errorMessage = 'Failed to load timeline data'
      if (err instanceof Error) {
        if (err.message.includes('network') || err.message.includes('fetch')) {
          errorMessage = 'Network error. Please check your connection and try again.'
        } else if (err.message.includes('timeout')) {
          errorMessage = 'Request timed out. Please try again.'
        } else if (err.message.includes('unauthorized') || err.message.includes('403')) {
          errorMessage = 'You are not authorized to view this data.'
        } else if (err.message.includes('not found') || err.message.includes('404')) {
          errorMessage = 'Timeline data not found.'
        }
      }

      setError(errorMessage)

      // Auto-retry for certain errors if under retry limit
      if (canRetry && (
        err instanceof Error && (
          err.message.includes('network') ||
          err.message.includes('timeout') ||
          err.message.includes('500')
        )
      )) {
        setTimeout(() => {
          logger.info('Auto-retrying timeline data load:', { retryCount: retryCount + 1 })
          loadUpdates(page, append)
        }, Math.min(1000 * Math.pow(2, retryCount), 10000)) // Exponential backoff, max 10s
      }
    } finally {
      setLoading(false)
    }
  }, [pageSize, saveToCache, canRetry, retryCount])

  // Load more data for infinite scroll
  const loadMore = useCallback(async () => {
    if (loading || !hasMore) return
    await loadUpdates(currentPage + 1, true)
  }, [loading, hasMore, currentPage, loadUpdates])

  // Refresh all data
  const refresh = useCallback(async () => {
    setCurrentPage(0)
    await loadUpdates(0, false)
  }, [loadUpdates])

  // Apply search filters
  const applyFilters = useCallback((query: string, filters: SearchFilters) => {
    setSearchQuery(query)
    setSearchFilters(filters)
  }, [])

  // Clear search filters
  const clearFilters = useCallback(() => {
    setSearchQuery('')
    setSearchFilters({})
  }, [])

  // Calculate stats
  const stats = useMemo(() => {
    const totalUpdates = allUpdates.length
    const totalDays = timelineGroups.length
    const averagePerDay = totalDays > 0 ? totalUpdates / totalDays : 0

    return {
      totalUpdates,
      totalDays,
      averagePerDay: Math.round(averagePerDay * 10) / 10
    }
  }, [allUpdates.length, timelineGroups.length])

  // Initial load
  useEffect(() => {
    if (!initialLoad) return

    // Try to load from cache first
    const cachedData = loadFromCache()
    if (cachedData?.length) {
      setAllUpdates(cachedData)
      setHasMore(cachedData.length === pageSize)
    } else {
      loadUpdates(0, false)
    }
  }, [initialLoad, loadFromCache, loadUpdates, pageSize])

  const isFiltered = !!(searchQuery || Object.keys(searchFilters).length)

  return {
    timelineGroups,
    filteredGroups,
    loading,
    error,
    hasMore,
    totalCount: allUpdates.length,
    loadMore,
    refresh,
    applyFilters,
    clearFilters,
    isFiltered,
    retryCount,
    maxRetries,
    canRetry,
    stats
  }
}

/**
 * Format date for display in timeline groups
 */
function formatDisplayDate(date: Date): string {
  const now = new Date()
  const diffTime = now.getTime() - date.getTime()
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))

  if (diffDays === 0) return 'Today'
  if (diffDays === 1) return 'Yesterday'
  if (diffDays < 7) return `${diffDays} days ago`

  // For older dates, show full date
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
}