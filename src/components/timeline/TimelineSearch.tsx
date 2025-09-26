'use client'

import { memo, useState, useCallback } from 'react'
import { cn } from '@/lib/utils'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import type { SearchFilters } from '@/hooks/useSearchDebounced'

interface TimelineSearchProps {
  query: string
  filters: SearchFilters
  onQueryChange: (query: string) => void
  onFiltersChange: (filters: SearchFilters) => void
  onClear: () => void
  isSearching?: boolean
  hasActiveFilters?: boolean
  className?: string
  children?: React.ReactNode[]
}

interface FilterChipProps {
  label: string
  onRemove: () => void
  variant?: 'default' | 'primary'
}

const FilterChip = memo<FilterChipProps>(function FilterChip({ label, onRemove, variant = 'default' }) {
  return (
    <Badge
      variant={variant === 'primary' ? 'primary' : 'secondary'}
      className="flex items-center space-x-1 px-2 py-1"
    >
      <span className="text-xs">{label}</span>
      <button
        onClick={onRemove}
        className="ml-1 hover:bg-black/10 rounded-full p-0.5 transition-colors"
        aria-label={`Remove ${label} filter`}
      >
        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </Badge>
  )
})

/**
 * Advanced search component with filter chips and content type filtering
 * Features debounced input, URL persistence, and mobile-optimized design
 */
const TimelineSearch = memo<TimelineSearchProps>(function TimelineSearch({
  query,
  filters,
  onQueryChange,
  onFiltersChange,
  onClear,
  isSearching = false,
  hasActiveFilters = false,
  className,
  children
}) {
  const [showFilters, setShowFilters] = useState(false)

  const handleContentTypeChange = useCallback((type: SearchFilters['contentType']) => {
    onFiltersChange({
      ...filters,
      contentType: type
    })
  }, [filters, onFiltersChange])

  const handleDateRangeChange = useCallback((range: SearchFilters['dateRange']) => {
    onFiltersChange({
      ...filters,
      dateRange: range
    })
  }, [filters, onFiltersChange])

  const handleChildChange = useCallback((childId: string) => {
    onFiltersChange({
      ...filters,
      childId: childId || undefined
    })
  }, [filters, onFiltersChange])

  const removeFilter = useCallback((filterKey: keyof SearchFilters) => {
    const newFilters = { ...filters }
    delete newFilters[filterKey]
    onFiltersChange(newFilters)
  }, [filters, onFiltersChange])

  const toggleFilters = useCallback(() => {
    setShowFilters(prev => !prev)
  }, [])

  // Generate filter chips
  const filterChips = []

  if (filters.contentType && filters.contentType !== 'all') {
    filterChips.push({
      key: 'contentType',
      label: `Type: ${filters.contentType}`,
      onRemove: () => removeFilter('contentType')
    })
  }

  if (filters.dateRange?.start || filters.dateRange?.end) {
    const start = filters.dateRange.start?.toLocaleDateString()
    const end = filters.dateRange.end?.toLocaleDateString()
    const label = start && end ? `${start} - ${end}` :
                  start ? `Since ${start}` :
                  end ? `Until ${end}` : 'Date range'

    filterChips.push({
      key: 'dateRange',
      label: `Date: ${label}`,
      onRemove: () => removeFilter('dateRange')
    })
  }

  if (filters.childId) {
    filterChips.push({
      key: 'childId',
      label: 'Child filter active',
      onRemove: () => removeFilter('childId')
    })
  }

  if (filters.tags?.length) {
    filterChips.push({
      key: 'tags',
      label: `Tags: ${filters.tags.join(', ')}`,
      onRemove: () => removeFilter('tags')
    })
  }

  return (
    <div className={cn('space-y-4', className)}>
      {/* Main search bar */}
      <div className="relative">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <svg
              className={cn(
                'h-5 w-5 transition-colors',
                isSearching ? 'text-primary-500 animate-pulse' : 'text-neutral-400'
              )}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </div>

          <Input
            type="text"
            placeholder="Search updates, milestones, and memories..."
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            className="pl-10 pr-12"
            aria-label="Search timeline"
          />

          {(query || hasActiveFilters) && (
            <button
              onClick={onClear}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-neutral-400 hover:text-neutral-600"
              aria-label="Clear search"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        {/* Filter toggle button */}
        <div className="absolute right-12 inset-y-0 flex items-center">
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleFilters}
            className={cn(
              'px-2 py-1',
              hasActiveFilters && 'text-primary-600 bg-primary-50'
            )}
            aria-label="Toggle filters"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.207A1 1 0 013 6.5V4z" />
            </svg>
            {hasActiveFilters && (
              <span className="ml-1 w-2 h-2 bg-primary-600 rounded-full" />
            )}
          </Button>
        </div>
      </div>

      {/* Active filter chips */}
      {filterChips.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {filterChips.map(chip => (
            <FilterChip
              key={chip.key}
              label={chip.label}
              onRemove={chip.onRemove}
            />
          ))}
        </div>
      )}

      {/* Filter panel */}
      {showFilters && (
        <div className="bg-white border border-neutral-200 rounded-lg p-4 space-y-4">
          {/* Content type filter */}
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-2">
              Content Type
            </label>
            <div className="flex flex-wrap gap-2">
              {[
                { value: 'all', label: 'All' },
                { value: 'photo', label: 'Photos' },
                { value: 'video', label: 'Videos' },
                { value: 'text', label: 'Text' },
                { value: 'milestone', label: 'Milestones' }
              ].map(({ value, label }) => (
                <Button
                  key={value}
                  variant={filters.contentType === value ? 'primary' : 'outline'}
                  size="sm"
                  onClick={() => handleContentTypeChange(value as SearchFilters['contentType'])}
                >
                  {label}
                </Button>
              ))}
            </div>
          </div>

          {/* Date range filter */}
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-2">
              Date Range
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-neutral-500 mb-1">From</label>
                <Input
                  type="date"
                  value={filters.dateRange?.start?.toISOString().split('T')[0] || ''}
                  onChange={(e) => {
                    const date = e.target.value ? new Date(e.target.value) : undefined
                    handleDateRangeChange({
                      ...filters.dateRange,
                      start: date
                    })
                  }}
                  className="text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-neutral-500 mb-1">To</label>
                <Input
                  type="date"
                  value={filters.dateRange?.end?.toISOString().split('T')[0] || ''}
                  onChange={(e) => {
                    const date = e.target.value ? new Date(e.target.value) : undefined
                    handleDateRangeChange({
                      ...filters.dateRange,
                      end: date
                    })
                  }}
                  className="text-sm"
                />
              </div>
            </div>
          </div>

          {/* Additional filter options can be added here */}
          {children && (
            <div className="pt-2 border-t border-neutral-100">
              {children}
            </div>
          )}
        </div>
      )}

      {/* Search suggestions/quick filters */}
      {!query && !hasActiveFilters && (
        <div className="flex flex-wrap gap-2 text-sm">
          <span className="text-neutral-500">Quick filters:</span>
          {[
            { label: 'This week', action: () => {
              const start = new Date()
              start.setDate(start.getDate() - 7)
              handleDateRangeChange({ start })
            }},
            { label: 'Photos only', action: () => handleContentTypeChange('photo') },
            { label: 'Milestones', action: () => handleContentTypeChange('milestone') }
          ].map(({ label, action }) => (
            <Button
              key={label}
              variant="ghost"
              size="sm"
              onClick={action}
              className="text-xs px-2 py-1 h-auto text-neutral-600 hover:text-primary-600"
            >
              {label}
            </Button>
          ))}
        </div>
      )}
    </div>
  )
})

TimelineSearch.displayName = 'TimelineSearch'

export default TimelineSearch