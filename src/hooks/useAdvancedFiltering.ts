'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { createLogger } from '@/lib/logger'
import type { FilterPreset } from '@/components/dashboard/AdvancedFilters'
import type { SearchFilters } from './useSearchDebounced'

const logger = createLogger('useAdvancedFiltering')

interface FilterHistoryItem {
  id: string
  filters: SearchFilters
  timestamp: Date
  description?: string
  usageCount: number
}

interface UseAdvancedFilteringReturn {
  filterPresets: FilterPreset[]
  recentFilters: FilterHistoryItem[]
  suggestedFilters: FilterPreset[]
  popularTags: string[]
  isLoading: boolean
  error: string | null
  saveFilterPreset: (preset: Omit<FilterPreset, 'id'>) => void
  deleteFilterPreset: (presetId: string) => void
  updatePresetUsage: (presetId: string) => void
  getFilterHistory: () => FilterHistoryItem[]
  clearFilterHistory: () => void
  addToFilterHistory: (filters: SearchFilters, description?: string) => void
  getSuggestedFilters: () => FilterPreset[]
  getPopularTags: () => string[]
}

const STORAGE_KEYS = {
  PRESETS: 'advanced_filter_presets',
  HISTORY: 'filter_history',
  POPULAR_TAGS: 'popular_tags'
} as const

const MAX_HISTORY_ITEMS = 50
const MAX_RECENT_DISPLAY = 10

/**
 * Advanced filtering hook with presets, history, and analytics
 */
export function useAdvancedFiltering(): UseAdvancedFilteringReturn {
  const [filterPresets, setFilterPresets] = useState<FilterPreset[]>([])
  const [recentFilters, setRecentFilters] = useState<FilterHistoryItem[]>([])
  const [popularTags, setPopularTags] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Load data from localStorage
  const loadStoredData = useCallback(() => {
    try {
      setIsLoading(true)

      // Load presets
      const storedPresets = localStorage.getItem(STORAGE_KEYS.PRESETS)
      if (storedPresets) {
        const parsedPresets: FilterPreset[] = JSON.parse(storedPresets)
        setFilterPresets(parsedPresets.map(preset => ({
          ...preset,
          lastUsed: preset.lastUsed ? new Date(preset.lastUsed) : undefined
        })))
      }

      // Load history
      const storedHistory = localStorage.getItem(STORAGE_KEYS.HISTORY)
      if (storedHistory) {
        const parsedHistory: FilterHistoryItem[] = JSON.parse(storedHistory)
        setRecentFilters(parsedHistory.map(item => ({
          ...item,
          timestamp: new Date(item.timestamp)
        })).slice(0, MAX_RECENT_DISPLAY))
      }

      // Load popular tags
      const storedTags = localStorage.getItem(STORAGE_KEYS.POPULAR_TAGS)
      if (storedTags) {
        setPopularTags(JSON.parse(storedTags))
      }

      setError(null)
    } catch (err) {
      logger.error('Error loading stored filter data:', err)
      setError('Failed to load filter preferences')
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Save data to localStorage
  const saveToStorage = useCallback((key: string, data: any) => {
    try {
      localStorage.setItem(key, JSON.stringify(data))
    } catch (err) {
      logger.error(`Error saving ${key} to storage:`, err)
    }
  }, [])

  // Save filter preset
  const saveFilterPreset = useCallback((preset: Omit<FilterPreset, 'id'>) => {
    const newPreset: FilterPreset = {
      ...preset,
      id: `preset_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      usageCount: preset.usageCount || 0,
      lastUsed: new Date()
    }

    const updatedPresets = [...filterPresets, newPreset]
    setFilterPresets(updatedPresets)
    saveToStorage(STORAGE_KEYS.PRESETS, updatedPresets)

    logger.info('Filter preset saved:', { presetId: newPreset.id, name: newPreset.name })
  }, [filterPresets, saveToStorage])

  // Delete filter preset
  const deleteFilterPreset = useCallback((presetId: string) => {
    const updatedPresets = filterPresets.filter(p => p.id !== presetId)
    setFilterPresets(updatedPresets)
    saveToStorage(STORAGE_KEYS.PRESETS, updatedPresets)

    logger.info('Filter preset deleted:', { presetId })
  }, [filterPresets, saveToStorage])

  // Update preset usage statistics
  const updatePresetUsage = useCallback((presetId: string) => {
    const updatedPresets = filterPresets.map(preset =>
      preset.id === presetId
        ? {
            ...preset,
            usageCount: (preset.usageCount || 0) + 1,
            lastUsed: new Date()
          }
        : preset
    )

    setFilterPresets(updatedPresets)
    saveToStorage(STORAGE_KEYS.PRESETS, updatedPresets)

    logger.info('Preset usage updated:', { presetId })
  }, [filterPresets, saveToStorage])

  // Add filters to history
  const addToFilterHistory = useCallback((filters: SearchFilters, description?: string) => {
    // Don't add empty filters to history
    if (!filters || Object.keys(filters).length === 0) return

    const filtersKey = JSON.stringify(filters)

    // Check if this filter combination already exists
    const existingIndex = recentFilters.findIndex(item =>
      JSON.stringify(item.filters) === filtersKey
    )

    let updatedHistory: FilterHistoryItem[]

    if (existingIndex >= 0) {
      // Update existing entry
      const existingItem = recentFilters[existingIndex]
      updatedHistory = [
        {
          ...existingItem,
          timestamp: new Date(),
          usageCount: existingItem.usageCount + 1,
          description: description || existingItem.description
        },
        ...recentFilters.slice(0, existingIndex),
        ...recentFilters.slice(existingIndex + 1)
      ]
    } else {
      // Add new entry
      const newItem: FilterHistoryItem = {
        id: `history_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        filters,
        timestamp: new Date(),
        description: description || generateFilterDescription(filters),
        usageCount: 1
      }

      updatedHistory = [newItem, ...recentFilters]
    }

    // Limit history size
    updatedHistory = updatedHistory.slice(0, MAX_HISTORY_ITEMS)

    setRecentFilters(updatedHistory.slice(0, MAX_RECENT_DISPLAY))
    saveToStorage(STORAGE_KEYS.HISTORY, updatedHistory)

    logger.info('Filter added to history:', { filtersKey, description })
  }, [recentFilters, saveToStorage])

  // Get filter history
  const getFilterHistory = useCallback((): FilterHistoryItem[] => {
    return recentFilters
  }, [recentFilters])

  // Clear filter history
  const clearFilterHistory = useCallback(() => {
    setRecentFilters([])
    localStorage.removeItem(STORAGE_KEYS.HISTORY)
    logger.info('Filter history cleared')
  }, [])

  // Generate suggested filters based on usage patterns
  const getSuggestedFilters = useCallback((): FilterPreset[] => {
    const suggestions: FilterPreset[] = []

    // Suggest frequently used date ranges
    const weeklyFilter: FilterPreset = {
      id: 'suggested_weekly',
      name: 'Past Week',
      description: 'Updates from the last 7 days',
      filters: {
        dateRange: {
          start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
          end: new Date()
        }
      },
      isSystem: true
    }

    const monthlyFilter: FilterPreset = {
      id: 'suggested_monthly',
      name: 'Past Month',
      description: 'Updates from the last 30 days',
      filters: {
        dateRange: {
          start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
          end: new Date()
        }
      },
      isSystem: true
    }

    suggestions.push(weeklyFilter, monthlyFilter)

    // Suggest popular tag combinations
    if (popularTags.length > 0) {
      popularTags.slice(0, 3).forEach((tag, index) => {
        suggestions.push({
          id: `suggested_tag_${index}`,
          name: `#${tag}`,
          description: `Updates tagged with ${tag}`,
          filters: {
            tags: [tag]
          },
          isSystem: true
        })
      })
    }

    return suggestions
  }, [popularTags])

  // Get popular tags from history and usage
  const getPopularTags = useCallback((): string[] => {
    const tagCounts: { [tag: string]: number } = {}

    // Count tags from filter history
    recentFilters.forEach(item => {
      if (item.filters.tags?.length) {
        item.filters.tags.forEach(tag => {
          tagCounts[tag] = (tagCounts[tag] || 0) + item.usageCount
        })
      }
    })

    // Sort by usage count and return top tags
    return Object.entries(tagCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([tag]) => tag)
  }, [recentFilters])

  // Update popular tags periodically
  useEffect(() => {
    const updatePopularTags = () => {
      const tags = getPopularTags()
      setPopularTags(tags)
      saveToStorage(STORAGE_KEYS.POPULAR_TAGS, tags)
    }

    updatePopularTags()
  }, [getPopularTags, saveToStorage])

  // Load initial data
  useEffect(() => {
    loadStoredData()
  }, [loadStoredData])

  // Sort presets by usage and recency
  const sortedPresets = useMemo(() => {
    return [...filterPresets].sort((a, b) => {
      // System presets first
      if (a.isSystem && !b.isSystem) return -1
      if (!a.isSystem && b.isSystem) return 1

      // Then by usage count
      const aUsage = a.usageCount || 0
      const bUsage = b.usageCount || 0
      if (aUsage !== bUsage) return bUsage - aUsage

      // Then by last used date
      const aLastUsed = a.lastUsed ? a.lastUsed.getTime() : 0
      const bLastUsed = b.lastUsed ? b.lastUsed.getTime() : 0
      return bLastUsed - aLastUsed
    })
  }, [filterPresets])

  // Sort recent filters by timestamp
  const sortedRecentFilters = useMemo(() => {
    return [...recentFilters].sort((a, b) =>
      b.timestamp.getTime() - a.timestamp.getTime()
    )
  }, [recentFilters])

  const suggestedFilters = useMemo(() => getSuggestedFilters(), [getSuggestedFilters])

  return {
    filterPresets: sortedPresets,
    recentFilters: sortedRecentFilters,
    suggestedFilters,
    popularTags,
    isLoading,
    error,
    saveFilterPreset,
    deleteFilterPreset,
    updatePresetUsage,
    getFilterHistory,
    clearFilterHistory,
    addToFilterHistory,
    getSuggestedFilters,
    getPopularTags
  }
}

/**
 * Generate a human-readable description for filter combination
 */
function generateFilterDescription(filters: SearchFilters): string {
  const parts: string[] = []

  if (filters.contentType && filters.contentType !== 'all') {
    parts.push(`${filters.contentType} updates`)
  }

  if (filters.dateRange) {
    if (filters.dateRange.start && filters.dateRange.end) {
      const start = new Date(filters.dateRange.start)
      const end = new Date(filters.dateRange.end)
      parts.push(`from ${start.toLocaleDateString()} to ${end.toLocaleDateString()}`)
    } else if (filters.dateRange.start) {
      parts.push(`since ${new Date(filters.dateRange.start).toLocaleDateString()}`)
    } else if (filters.dateRange.end) {
      parts.push(`until ${new Date(filters.dateRange.end).toLocaleDateString()}`)
    }
  }

  if (filters.childId) {
    parts.push(`for specific child`)
  }

  if (filters.tags?.length) {
    if (filters.tags.length === 1) {
      parts.push(`tagged #${filters.tags[0]}`)
    } else {
      parts.push(`tagged with ${filters.tags.length} tags`)
    }
  }

  if (parts.length === 0) {
    return 'Custom filter'
  }

  return parts.join(', ').replace(/^./, str => str.toUpperCase())
}