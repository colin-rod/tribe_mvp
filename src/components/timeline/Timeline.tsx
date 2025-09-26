'use client'

import { memo, useCallback, useMemo, useState, useEffect } from 'react'
import { cn } from '@/lib/utils'
import { useSearchDebounced } from '@/hooks/useSearchDebounced'
import type { SearchFilters } from '@/hooks/useSearchDebounced'
import { useTimelineData } from '@/hooks/useTimelineData'
import VirtualScrollContainer from '@/components/ui/VirtualScrollContainer'
import TimelineSearch from './TimelineSearch'
import ActivityCard from './ActivityCard'
import { trackDashboardInteraction } from '@/lib/analytics/dashboard-analytics'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { Button } from '@/components/ui/Button'
import MobileTimelineContainer from '@/components/dashboard/MobileTimelineContainer'
import MobileSearchBar from '@/components/dashboard/MobileSearchBar'
import type { UpdateCardData } from '@/lib/types/dashboard'

interface TimelineProps {
  className?: string
  onUpdateClick?: (updateId: string) => void
  showSearch?: boolean
  showStats?: boolean
  pageSize?: number
  height?: number
  compact?: boolean
  filters?: SearchFilters
  onSelectionChange?: (selectedIds: string[]) => void
  enableProgressiveImages?: boolean
  enableSmartCaching?: boolean
}

type TimelineVirtualItem =
  | {
      id: string
      itemType: 'date-header'
      displayDate: string
      count: number
    }
  | (UpdateCardData & { itemType: 'update' })

interface TimelineItemProps {
  index: number
  style: React.CSSProperties
  items: TimelineVirtualItem[]
  onUpdateClick?: (updateId: string) => void
  compact: boolean
  enableProgressiveImages: boolean
  selectedUpdates: string[]
  onUpdateSelection?: (updateId: string, selected: boolean) => void
}

const TimelineItem = memo<TimelineItemProps>(function TimelineItem({
  index,
  style,
  items,
  onUpdateClick,
  compact,
  enableProgressiveImages,
  selectedUpdates,
  onUpdateSelection
}) {
  const item = items[index]

  if (!item) {
    return <div style={style} />
  }

  // Date header
  if (item.itemType === 'date-header') {
    return (
      <div style={style} className="px-4 py-6">
        <div className="relative">
          <div className="absolute inset-0 flex items-center" aria-hidden="true">
            <div className="w-full border-t border-neutral-200" />
          </div>
          <div className="relative flex justify-center">
            <div className="bg-neutral-50 px-4 py-2 rounded-full">
              <h2 className="text-sm font-semibold text-neutral-900">
                {item.displayDate}
              </h2>
              <p className="text-xs text-neutral-500 text-center">
                {item.count} {item.count === 1 ? 'update' : 'updates'}
              </p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Update card
  const isSelected = selectedUpdates?.includes(item.id) || false

  return (
    <div style={style} className="px-4 py-2">
      <div className={cn(
        'relative',
        isSelected && 'ring-2 ring-primary-500 rounded-lg'
      )}>
        {/* Selection checkbox */}
        {onUpdateSelection && (
          <div className="absolute top-2 right-2 z-10">
            <input
              type="checkbox"
              checked={isSelected}
              onChange={(e) => onUpdateSelection(item.id, e.target.checked)}
              className="w-4 h-4 text-primary-600 bg-white border-gray-300 rounded focus:ring-primary-500"
            />
          </div>
        )}

        <ActivityCard
          update={item}
          onClick={onUpdateClick}
          compact={compact}
          showActions={true}
          showMetadata={true}
          enableProgressiveImages={enableProgressiveImages}
        />
      </div>
    </div>
  )
})

TimelineItem.displayName = 'TimelineItem'

/**
 * Main timeline component with virtual scrolling, search, and grouping
 * Handles large datasets efficiently and provides smooth scrolling experience
 */
const Timeline = memo<TimelineProps>(function Timeline({
  className,
  onUpdateClick,
  showSearch = true,
  showStats = true,
  pageSize = 20,
  height = 600,
  compact = false,
  filters: externalFilters,
  onSelectionChange,
  enableProgressiveImages = false,
  enableSmartCaching: _enableSmartCaching = false
}) {
  const [selectedUpdates, setSelectedUpdates] = useState<string[]>([])
  const [isMobile, setIsMobile] = useState(false)

  // Detect mobile screen size
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }

    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  // Search functionality with URL persistence
  const {
    query,
    filters,
    isSearching,
    hasActiveFilters,
    setQuery,
    setFilters,
    clearSearch
  } = useSearchDebounced({
    delay: 300,
    minLength: 2,
    enableUrlPersistence: true,
    urlParamPrefix: 'timeline'
  })

  // Timeline data management
  const {
    filteredGroups,
    loading,
    error,
    hasMore,
    totalCount,
    loadMore,
    refresh,
    applyFilters,
    isFiltered,
    retryCount,
    maxRetries,
    canRetry,
    stats
  } = useTimelineData({
    pageSize,
    initialLoad: true,
    enableCaching: true
  })

  // Apply external or search filters when they change
  useEffect(() => {
    const activeFilters = externalFilters || { ...filters }
    applyFilters(query, activeFilters)
  }, [query, filters, externalFilters, applyFilters])

  // Handle selection changes
  useEffect(() => {
    if (onSelectionChange) {
      onSelectionChange(selectedUpdates)
    }
  }, [selectedUpdates, onSelectionChange])

  // Handle update selection
  const handleUpdateSelection = useCallback((updateId: string, selected: boolean) => {
    setSelectedUpdates(prev => {
      if (selected) {
        return [...prev, updateId]
      } else {
        return prev.filter(id => id !== updateId)
      }
    })

    trackDashboardInteraction({
      type: 'view_update',
      element: 'timeline-update-selected',
      elementId: updateId,
      metadata: { selected }
    })
  }, [])

  // Transform timeline data for mobile component
  const mobileUpdates = useMemo(() => {
    if (!isMobile) return []

    return filteredGroups.flatMap(group =>
      group.updates.map(update => ({
        id: update.id,
        child: {
          id: update.childId || 'default',
          name: update.childName || 'Little one',
          avatar: update.childAvatar,
          age: update.childAge || '0 months'
        },
        content: update.title,
        contentPreview: update.excerpt || update.title,
        createdAt: new Date(update.createdAt),
        timeAgo: formatTimeAgo(new Date(update.createdAt)),
        mediaUrls: update.media?.map(m => m.url) || [],
        mediaCount: update.media?.length || 0,
        responseCount: update.stats?.responses || 0,
        hasUnreadResponses: false, // TODO: implement unread responses
        distributionStatus: update.deliveryStatus === 'sent' ? 'sent' as const :
                          update.deliveryStatus === 'pending' ? 'sending' as const :
                          update.deliveryStatus === 'failed' ? 'failed' as const : 'draft' as const,
        isLiked: false, // TODO: implement likes
        likeCount: 0 // TODO: implement like count
      }))
    )
  }, [filteredGroups, isMobile])

  // Format time ago helper
  const formatTimeAgo = (date: Date): string => {
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))

    if (diffHours < 1) {
      const diffMins = Math.floor(diffMs / (1000 * 60))
      return `${diffMins}m ago`
    } else if (diffHours < 24) {
      return `${diffHours}h ago`
    } else {
      const diffDays = Math.floor(diffHours / 24)
      return `${diffDays}d ago`
    }
  }

  // Handle update click
  const handleUpdateClick = useCallback((updateId: string) => {
    if (onUpdateClick) {
      onUpdateClick(updateId)
    }
  }, [onUpdateClick])

  // Handle retry
  const handleRetry = useCallback(() => {
    refresh()
  }, [refresh])

  // Flatten timeline groups for virtual scrolling
  const flattenedItems = useMemo<TimelineVirtualItem[]>(() => {
    const items: TimelineVirtualItem[] = []

    filteredGroups.forEach((group) => {
      // Add date header
      items.push({
        id: `header-${group.date}`,
        itemType: 'date-header',
        displayDate: group.displayDate,
        count: group.count
      })

      // Add updates
      group.updates.forEach(update => {
        items.push({
          ...update,
          itemType: 'update'
        })
      })
    })

    return items
  }, [filteredGroups])

  // Calculate item heights (date headers are taller)
  const getItemHeight = useCallback((index: number) => {
    const item = flattenedItems[index]
    if (!item) return compact ? 120 : 160

    if (item.itemType === 'date-header') {
      return 80
    }

    // Estimate height based on content
    const baseHeight = compact ? 120 : 160
    const hasMedia = item.media?.length > 0
    const hasLongText = item.excerpt?.length > 100
    const hasTags = item.tags?.length > 0

    let height = baseHeight
    if (hasMedia) height += compact ? 128 : 192
    if (hasLongText) height += 40
    if (hasTags) height += 30

    return Math.min(height, 400) // Cap maximum height
  }, [flattenedItems, compact])

  // Virtual scroll data

  // Loading state
  if (loading && filteredGroups.length === 0) {
    return (
      <div className={cn('space-y-6', className)}>
        {showSearch && (
          <TimelineSearch
            query={query}
            filters={filters}
            onQueryChange={setQuery}
            onFiltersChange={setFilters}
            onClear={clearSearch}
            isSearching={isSearching}
            hasActiveFilters={hasActiveFilters}
          />
        )}

        <div className="flex items-center justify-center py-12">
          <LoadingSpinner size="lg" />
          <span className="ml-3 text-neutral-600">Loading timeline...</span>
        </div>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className={cn('space-y-6', className)}>
        {showSearch && (
          <TimelineSearch
            query={query}
            filters={filters}
            onQueryChange={setQuery}
            onFiltersChange={setFilters}
            onClear={clearSearch}
            isSearching={isSearching}
            hasActiveFilters={hasActiveFilters}
          />
        )}

        <div className="text-center py-12">
          <div className="text-red-400 mb-4">
            <svg className="mx-auto h-12 w-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 15.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-neutral-900 mb-2">
            Timeline Unavailable
          </h3>
          <p className="text-sm text-neutral-600 mb-4 max-w-sm mx-auto">
            {error}
          </p>
          {retryCount > 0 && (
            <p className="text-xs text-neutral-500 mb-4">
              Retry attempt {retryCount} of {maxRetries}
            </p>
          )}
          <div className="flex flex-col sm:flex-row gap-2 justify-center">
            <Button
              onClick={handleRetry}
              variant="outline"
              disabled={!canRetry && retryCount > 0}
            >
              {canRetry ? 'Try Again' : 'Max Retries Reached'}
            </Button>
            {!canRetry && (
              <Button
                onClick={() => window.location.reload()}
                variant="primary"
              >
                Reload Page
              </Button>
            )}
          </div>
        </div>
      </div>
    )
  }

  // Empty state
  if (flattenedItems.length === 0) {
    return (
      <div className={cn('space-y-6', className)}>
        {showSearch && (
          <TimelineSearch
            query={query}
            filters={filters}
            onQueryChange={setQuery}
            onFiltersChange={setFilters}
            onClear={clearSearch}
            isSearching={isSearching}
            hasActiveFilters={hasActiveFilters}
          />
        )}

        <div className="text-center py-12">
          <div className="text-neutral-400 mb-4">
            <svg className="mx-auto h-12 w-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1}
                d={isFiltered ?
                  "M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" :
                  "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                } />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-neutral-900 mb-2">
            {isFiltered ? 'No matching updates' : 'No timeline data'}
          </h3>
          <p className="text-sm text-neutral-600 mb-6 max-w-sm mx-auto">
            {isFiltered
              ? 'Try adjusting your search criteria or clear the current filters.'
              : 'Start sharing updates to build your family timeline.'
            }
          </p>
          {isFiltered ? (
            <Button onClick={clearSearch} variant="outline">
              Clear Filters
            </Button>
          ) : (
            <Button onClick={() => onUpdateClick?.('new')} variant="primary">
              Create Your First Update
            </Button>
          )}
        </div>
      </div>
    )
  }

  // Render mobile view
  if (isMobile) {
    return (
      <div className={cn('h-full', className)}>
        {/* Mobile Search Bar */}
        {showSearch && (
          <MobileSearchBar
            searchQuery={query}
            onSearchChange={setQuery}
            onFilterChange={(filterId) => {
              // Convert filter ID to SearchFilters format
              const newFilters = { ...filters }
              if (filterId === 'all') {
                newFilters.contentType = 'all'
              } else if (filterId === 'photos') {
                newFilters.contentType = 'photo'
              } else if (filterId === 'milestones') {
                newFilters.contentType = 'milestone'
              } else if (filterId === 'today') {
                const today = new Date()
                today.setHours(0, 0, 0, 0)
                newFilters.dateRange = { start: today }
              }
              setFilters(newFilters)
            }}
            quickFilters={[
              { id: 'all', label: 'All', icon: () => null, count: totalCount },
              { id: 'today', label: 'Today', icon: () => null },
              { id: 'photos', label: 'Photos', icon: () => null },
              { id: 'milestones', label: 'Milestones', icon: () => null }
            ]}
            placeholder="Search updates, milestones..."
          />
        )}

        {/* Mobile Timeline Container */}
        <MobileTimelineContainer
          updates={mobileUpdates}
          loading={loading}
          hasMore={hasMore}
          onLoadMore={loadMore}
          onUpdateClick={handleUpdateClick}
          searchQuery={query}
          onClearSearch={clearSearch}
          className="flex-1"
        />
      </div>
    )
  }

  // Render desktop view
  return (
    <div className={cn('space-y-6', className)}>
      {/* Search and filters */}
      {showSearch && (
        <TimelineSearch
          query={query}
          filters={filters}
          onQueryChange={setQuery}
          onFiltersChange={setFilters}
          onClear={clearSearch}
          isSearching={isSearching}
          hasActiveFilters={hasActiveFilters}
        />
      )}

      {/* Stats */}
      {showStats && (
        <div className="flex items-center justify-between text-sm text-neutral-600 px-4">
          <div className="flex items-center space-x-4">
            <span>
              {totalCount} {totalCount === 1 ? 'update' : 'updates'}
            </span>
            {isFiltered && (
              <span className="text-primary-600">
                {filteredGroups.reduce((acc, group) => acc + group.count, 0)} shown
              </span>
            )}
          </div>
          <div className="flex items-center space-x-4">
            <span>{stats.totalDays} days</span>
            <span>{stats.averagePerDay} avg/day</span>
          </div>
        </div>
      )}

      {/* Virtual scrolled timeline */}
      <div className="bg-white rounded-lg border border-neutral-200 overflow-hidden">
        <VirtualScrollContainer
          items={flattenedItems}
          itemHeight={getItemHeight}
          height={height}
          width="100%"
          onLoadMore={hasMore ? loadMore : undefined}
          hasNextPage={hasMore}
          isLoading={loading}
          overscan={5}
          threshold={10}
          enablePerformanceTracking={process.env.NODE_ENV === 'development'}
          memoryOptimization={true}
          loadingComponent={() => (
            <div className="flex items-center justify-center p-4">
              <LoadingSpinner size="sm" />
              <span className="ml-2 text-sm text-neutral-600">Loading more...</span>
            </div>
          )}
        >
          {({ index, style }) => (
            <TimelineItem
              index={index}
              style={style}
              items={flattenedItems}
              onUpdateClick={handleUpdateClick}
              compact={compact}
              enableProgressiveImages={enableProgressiveImages}
              selectedUpdates={selectedUpdates}
              onUpdateSelection={onSelectionChange ? handleUpdateSelection : undefined}
            />
          )}
        </VirtualScrollContainer>
      </div>

      {/* Load more button for tablet/desktop */}
      {hasMore && (
        <div className="text-center">
          <Button
            onClick={loadMore}
            variant="outline"
            disabled={loading}
            className="w-full sm:w-auto"
          >
            {loading ? (
              <>
                <LoadingSpinner size="sm" className="mr-2" />
                Loading...
              </>
            ) : (
              'Load More Updates'
            )}
          </Button>
        </div>
      )}
    </div>
  )
})

Timeline.displayName = 'Timeline'

export default Timeline
