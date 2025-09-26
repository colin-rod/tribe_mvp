'use client'

import React, { useState, useRef, useEffect } from 'react'
import { cn } from '@/lib/utils'
import {
  MagnifyingGlassIcon,
  XMarkIcon,
  AdjustmentsHorizontalIcon,
  CalendarIcon,
  PhotoIcon,
  ChatBubbleLeftIcon,
  BellIcon,
  SparklesIcon
} from '@heroicons/react/24/outline'

interface QuickFilter {
  id: string
  label: string
  icon: React.ComponentType<{ className?: string }>
  count?: number
  isActive?: boolean
}

interface MobileSearchBarProps {
  searchQuery?: string
  onSearchChange: (query: string) => void
  onFilterChange?: (filterId: string) => void
  activeFilter?: string
  showFilters?: boolean
  placeholder?: string
  className?: string
  quickFilters?: QuickFilter[]
}

const DEFAULT_QUICK_FILTERS: QuickFilter[] = [
  {
    id: 'all',
    label: 'All',
    icon: ChatBubbleLeftIcon,
    count: 42
  },
  {
    id: 'today',
    label: 'Today',
    icon: CalendarIcon,
    count: 3
  },
  {
    id: 'photos',
    label: 'Photos',
    icon: PhotoIcon,
    count: 28
  },
  {
    id: 'milestones',
    label: 'Milestones',
    icon: SparklesIcon,
    count: 8
  },
  {
    id: 'unread',
    label: 'Unread',
    icon: BellIcon,
    count: 5
  }
]

export const MobileSearchBar: React.FC<MobileSearchBarProps> = ({
  searchQuery = '',
  onSearchChange,
  onFilterChange,
  activeFilter = 'all',
  showFilters = true,
  placeholder = 'Search updates...',
  className,
  quickFilters = DEFAULT_QUICK_FILTERS
}) => {
  const [isSearchFocused, setIsSearchFocused] = useState(false)
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const filtersRef = useRef<HTMLDivElement>(null)

  // Handle search input changes
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onSearchChange(e.target.value)
  }

  // Clear search
  const handleClearSearch = () => {
    onSearchChange('')
    inputRef.current?.focus()
  }

  // Handle filter selection
  const handleFilterSelect = (filterId: string) => {
    onFilterChange?.(filterId)
  }

  // Handle advanced filters toggle
  const handleAdvancedFiltersToggle = () => {
    setShowAdvancedFilters(!showAdvancedFilters)
  }

  // Close advanced filters when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (filtersRef.current && !filtersRef.current.contains(event.target as Node)) {
        setShowAdvancedFilters(false)
      }
    }

    if (showAdvancedFilters) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showAdvancedFilters])

  return (
    <div className={cn(
      'bg-white border-b border-neutral-200 sticky top-0 z-20',
      className
    )}>
      {/* Search Input Container */}
      <div className="px-4 py-3">
        <div className={cn(
          'relative flex items-center transition-all duration-200',
          isSearchFocused ? 'ring-2 ring-primary-500 ring-offset-0' : '',
          'bg-neutral-100 rounded-xl overflow-hidden'
        )}>
          {/* Search Icon */}
          <div className="absolute left-3 flex items-center pointer-events-none">
            <MagnifyingGlassIcon className={cn(
              'w-4 h-4 transition-colors duration-200',
              isSearchFocused ? 'text-primary-500' : 'text-neutral-500'
            )} />
          </div>

          {/* Search Input */}
          <input
            ref={inputRef}
            type="text"
            value={searchQuery}
            onChange={handleSearchChange}
            onFocus={() => setIsSearchFocused(true)}
            onBlur={() => setIsSearchFocused(false)}
            placeholder={placeholder}
            className={cn(
              'w-full h-12 pl-10 pr-12 bg-transparent',
              'text-base text-neutral-900 placeholder-neutral-500',
              'border-0 outline-none',
              'focus:placeholder-neutral-400'
            )}
            // Prevent zoom on iOS
            style={{ fontSize: '16px' }}
          />

          {/* Clear Button */}
          {searchQuery && (
            <button
              onClick={handleClearSearch}
              className={cn(
                'absolute right-3 w-6 h-6 flex items-center justify-center',
                'text-neutral-400 hover:text-neutral-600',
                'transition-colors duration-200'
              )}
              aria-label="Clear search"
            >
              <XMarkIcon className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Quick Filters */}
      {showFilters && (
        <div className="px-2 pb-3 overflow-hidden">
          <div className="flex items-center space-x-2 overflow-x-auto scrollbar-none pb-2">
            {/* Filter chips */}
            {quickFilters.map((filter, index) => {
              const Icon = filter.icon
              const isActive = activeFilter === filter.id

              return (
                <button
                  key={filter.id}
                  onClick={() => handleFilterSelect(filter.id)}
                  className={cn(
                    'flex-shrink-0 flex items-center space-x-2 px-3 py-2 rounded-full',
                    'text-sm font-medium transition-all duration-200',
                    'border border-transparent',
                    isActive
                      ? 'bg-primary-100 text-primary-700 border-primary-200'
                      : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
                  )}
                  aria-pressed={isActive}
                  style={{
                    animationDelay: `${index * 50}ms`,
                  }}
                >
                  <Icon className={cn(
                    'w-4 h-4',
                    isActive ? 'text-primary-600' : 'text-neutral-500'
                  )} />
                  <span>{filter.label}</span>
                  {filter.count !== undefined && (
                    <span className={cn(
                      'px-1.5 py-0.5 rounded-full text-xs font-semibold',
                      isActive
                        ? 'bg-primary-200 text-primary-800'
                        : 'bg-neutral-200 text-neutral-600'
                    )}>
                      {filter.count}
                    </span>
                  )}
                </button>
              )
            })}

            {/* Advanced Filters Button */}
            <div ref={filtersRef} className="relative flex-shrink-0">
              <button
                onClick={handleAdvancedFiltersToggle}
                className={cn(
                  'flex items-center space-x-2 px-3 py-2 rounded-full',
                  'text-sm font-medium transition-all duration-200',
                  'border border-neutral-200',
                  showAdvancedFilters
                    ? 'bg-neutral-800 text-white'
                    : 'bg-white text-neutral-700 hover:bg-neutral-50'
                )}
                aria-expanded={showAdvancedFilters}
              >
                <AdjustmentsHorizontalIcon className="w-4 h-4" />
                <span>Filters</span>
              </button>

              {/* Advanced Filters Dropdown */}
              {showAdvancedFilters && (
                <div className={cn(
                  'absolute top-full right-0 mt-2 w-64 bg-white',
                  'border border-neutral-200 rounded-xl shadow-lg',
                  'py-2 animate-slide-up'
                )}>
                  {/* Date Range Filter */}
                  <div className="px-4 py-3 border-b border-neutral-100">
                    <h4 className="text-sm font-semibold text-neutral-900 mb-3">
                      Date Range
                    </h4>
                    <div className="space-y-2">
                      {[
                        { id: 'today', label: 'Today' },
                        { id: 'week', label: 'This Week' },
                        { id: 'month', label: 'This Month' },
                        { id: 'custom', label: 'Custom Range' }
                      ].map(option => (
                        <label
                          key={option.id}
                          className="flex items-center space-x-3 cursor-pointer"
                        >
                          <input
                            type="radio"
                            name="dateRange"
                            value={option.id}
                            className="w-4 h-4 text-primary-600 border-neutral-300 focus:ring-primary-500"
                          />
                          <span className="text-sm text-neutral-700">
                            {option.label}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Content Type Filter */}
                  <div className="px-4 py-3 border-b border-neutral-100">
                    <h4 className="text-sm font-semibold text-neutral-900 mb-3">
                      Content Type
                    </h4>
                    <div className="space-y-2">
                      {[
                        { id: 'photos', label: 'Photos' },
                        { id: 'videos', label: 'Videos' },
                        { id: 'text', label: 'Text Only' },
                        { id: 'milestones', label: 'Milestones' }
                      ].map(option => (
                        <label
                          key={option.id}
                          className="flex items-center space-x-3 cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            value={option.id}
                            className="w-4 h-4 text-primary-600 border-neutral-300 rounded focus:ring-primary-500"
                          />
                          <span className="text-sm text-neutral-700">
                            {option.label}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="px-4 py-3 flex space-x-3">
                    <button className="flex-1 px-3 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 transition-colors">
                      Apply
                    </button>
                    <button
                      onClick={() => setShowAdvancedFilters(false)}
                      className="flex-1 px-3 py-2 bg-neutral-100 text-neutral-700 rounded-lg text-sm font-medium hover:bg-neutral-200 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Search Results Summary */}
      {searchQuery && (
        <div className="px-4 py-2 bg-neutral-50 border-t border-neutral-100">
          <p className="text-xs text-neutral-600">
            Searching for <span className="font-medium">&quot;{searchQuery}&quot;</span>
          </p>
        </div>
      )}
    </div>
  )
}

export default MobileSearchBar
