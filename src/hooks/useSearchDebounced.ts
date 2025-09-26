'use client'

import { useState, useMemo, useCallback, useEffect } from 'react'
import { useDebouncedCallback } from 'use-debounce'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'

export interface SearchFilters {
  contentType?: 'all' | 'photo' | 'text' | 'video' | 'milestone'
  dateRange?: {
    start?: Date
    end?: Date
  }
  childId?: string
  tags?: string[]
}

export interface UseSearchDebouncedOptions {
  delay?: number
  minLength?: number
  onSearch?: (query: string, filters: SearchFilters) => void
  initialQuery?: string
  initialFilters?: SearchFilters
  enableUrlPersistence?: boolean
  urlParamPrefix?: string
}

export interface UseSearchDebouncedReturn {
  query: string
  debouncedQuery: string
  filters: SearchFilters
  isSearching: boolean
  setQuery: (query: string) => void
  setFilters: (filters: SearchFilters | ((prev: SearchFilters) => SearchFilters)) => void
  clearSearch: () => void
  hasActiveFilters: boolean
  searchStats: {
    totalQueries: number
    lastSearchTime?: Date
  }
}

/**
 * Hook for debounced search with filters and URL persistence
 * Optimizes search performance by debouncing queries and managing filter state
 * Supports URL persistence to maintain search state across page refreshes
 */
export function useSearchDebounced({
  delay = 300,
  minLength = 2,
  onSearch,
  initialQuery = '',
  initialFilters = {},
  enableUrlPersistence = false,
  urlParamPrefix = 'search'
}: UseSearchDebouncedOptions = {}): UseSearchDebouncedReturn {
  const router = useRouter()
  const searchParams = useSearchParams()
  const pathname = usePathname()

  // Initialize state from URL params if persistence is enabled
  const initializeFromUrl = useCallback(() => {
    if (!enableUrlPersistence) {
      return { query: initialQuery, filters: initialFilters }
    }

    const urlQuery = searchParams.get(`${urlParamPrefix}_q`) || initialQuery
    const urlFilters = { ...initialFilters }

    // Parse content type from URL
    const contentType = searchParams.get(`${urlParamPrefix}_type`)
    if (contentType && ['all', 'photo', 'text', 'video', 'milestone'].includes(contentType)) {
      urlFilters.contentType = contentType as SearchFilters['contentType']
    }

    // Parse date range from URL
    const startDate = searchParams.get(`${urlParamPrefix}_start`)
    const endDate = searchParams.get(`${urlParamPrefix}_end`)
    if (startDate || endDate) {
      urlFilters.dateRange = {
        start: startDate ? new Date(startDate) : undefined,
        end: endDate ? new Date(endDate) : undefined
      }
    }

    // Parse child ID from URL
    const childId = searchParams.get(`${urlParamPrefix}_child`)
    if (childId) {
      urlFilters.childId = childId
    }

    // Parse tags from URL
    const tagsParam = searchParams.get(`${urlParamPrefix}_tags`)
    if (tagsParam) {
      urlFilters.tags = tagsParam.split(',').filter(Boolean)
    }

    return { query: urlQuery, filters: urlFilters }
  }, [searchParams, enableUrlPersistence, urlParamPrefix, initialQuery, initialFilters])

  const { query: urlQuery, filters: urlFilters } = initializeFromUrl()
  const [query, setQuery] = useState(urlQuery)
  const [debouncedQuery, setDebouncedQuery] = useState(urlQuery)
  const [filters, setFilters] = useState<SearchFilters>(urlFilters)
  const [isSearching, setIsSearching] = useState(false)
  const [searchStats, setSearchStats] = useState({
    totalQueries: 0,
    lastSearchTime: undefined as Date | undefined
  })

  // Update URL with search parameters
  const updateUrl = useCallback((searchQuery: string, searchFilters: SearchFilters) => {
    if (!enableUrlPersistence) return

    const params = new URLSearchParams(searchParams.toString())

    // Update query parameter
    if (searchQuery) {
      params.set(`${urlParamPrefix}_q`, searchQuery)
    } else {
      params.delete(`${urlParamPrefix}_q`)
    }

    // Update content type parameter
    if (searchFilters.contentType && searchFilters.contentType !== 'all') {
      params.set(`${urlParamPrefix}_type`, searchFilters.contentType)
    } else {
      params.delete(`${urlParamPrefix}_type`)
    }

    // Update date range parameters
    if (searchFilters.dateRange?.start) {
      params.set(`${urlParamPrefix}_start`, searchFilters.dateRange.start.toISOString().split('T')[0])
    } else {
      params.delete(`${urlParamPrefix}_start`)
    }

    if (searchFilters.dateRange?.end) {
      params.set(`${urlParamPrefix}_end`, searchFilters.dateRange.end.toISOString().split('T')[0])
    } else {
      params.delete(`${urlParamPrefix}_end`)
    }

    // Update child parameter
    if (searchFilters.childId) {
      params.set(`${urlParamPrefix}_child`, searchFilters.childId)
    } else {
      params.delete(`${urlParamPrefix}_child`)
    }

    // Update tags parameter
    if (searchFilters.tags?.length) {
      params.set(`${urlParamPrefix}_tags`, searchFilters.tags.join(','))
    } else {
      params.delete(`${urlParamPrefix}_tags`)
    }

    // Update URL without triggering navigation
    const newUrl = `${pathname}${params.toString() ? `?${params.toString()}` : ''}`
    router.replace(newUrl, { scroll: false })
  }, [enableUrlPersistence, searchParams, urlParamPrefix, pathname, router])

  // Debounced search function
  const debouncedSearch = useDebouncedCallback(
    useCallback((searchQuery: string, searchFilters: SearchFilters) => {
      setDebouncedQuery(searchQuery)
      setIsSearching(false)

      // Update URL with current search state
      updateUrl(searchQuery, searchFilters)

      // Update search stats
      setSearchStats(prev => ({
        totalQueries: prev.totalQueries + 1,
        lastSearchTime: new Date()
      }))

      // Call external search handler
      if (onSearch) {
        onSearch(searchQuery, searchFilters)
      }
    }, [onSearch, updateUrl]),
    delay
  )

  // Update query and trigger search
  const handleSetQuery = useCallback((newQuery: string) => {
    setQuery(newQuery)

    if (newQuery.length >= minLength || newQuery.length === 0) {
      setIsSearching(newQuery.length > 0)
      debouncedSearch(newQuery, filters)
    }
  }, [minLength, filters, debouncedSearch])

  // Update filters and trigger search
  const handleSetFilters = useCallback((
    newFilters: SearchFilters | ((prev: SearchFilters) => SearchFilters)
  ) => {
    const updatedFilters = typeof newFilters === 'function' ? newFilters(filters) : newFilters
    setFilters(updatedFilters)

    // Re-trigger search with new filters if we have a query
    if (query.length >= minLength || query.length === 0) {
      setIsSearching(query.length > 0)
      debouncedSearch(query, updatedFilters)
    }
  }, [filters, query, minLength, debouncedSearch])

  // Clear search and filters
  const clearSearch = useCallback(() => {
    setQuery('')
    setDebouncedQuery('')
    setFilters({})
    setIsSearching(false)

    // Clear URL parameters if persistence is enabled
    if (enableUrlPersistence) {
      const params = new URLSearchParams(searchParams.toString())

      // Remove search-related parameters
      params.delete(`${urlParamPrefix}_q`)
      params.delete(`${urlParamPrefix}_type`)
      params.delete(`${urlParamPrefix}_start`)
      params.delete(`${urlParamPrefix}_end`)
      params.delete(`${urlParamPrefix}_child`)
      params.delete(`${urlParamPrefix}_tags`)

      // Update URL
      const newUrl = `${pathname}${params.toString() ? `?${params.toString()}` : ''}`
      router.replace(newUrl, { scroll: false })
    }

    if (onSearch) {
      onSearch('', {})
    }
  }, [onSearch, enableUrlPersistence, searchParams, urlParamPrefix, pathname, router])

  // Initialize state from URL on mount
  useEffect(() => {
    if (enableUrlPersistence) {
      const { query: initialUrlQuery, filters: initialUrlFilters } = initializeFromUrl()

      if (initialUrlQuery !== query) {
        setQuery(initialUrlQuery)
        setDebouncedQuery(initialUrlQuery)
      }

      if (JSON.stringify(initialUrlFilters) !== JSON.stringify(filters)) {
        setFilters(initialUrlFilters)
      }

      // Trigger initial search if there are URL parameters
      if (initialUrlQuery || Object.keys(initialUrlFilters).length > 0) {
        if (onSearch) {
          onSearch(initialUrlQuery, initialUrlFilters)
        }
      }
    }
  }, []) // Only run on mount

  // Check if any filters are active
  const hasActiveFilters = useMemo(() => {
    return !!(
      filters.contentType && filters.contentType !== 'all' ||
      filters.dateRange?.start ||
      filters.dateRange?.end ||
      filters.childId ||
      filters.tags?.length
    )
  }, [filters])

  return {
    query,
    debouncedQuery,
    filters,
    isSearching,
    setQuery: handleSetQuery,
    setFilters: handleSetFilters,
    clearSearch,
    hasActiveFilters,
    searchStats
  }
}