'use client'

import React, { useState, useMemo, useRef, useEffect } from 'react'
import { VariableSizeList as List } from 'react-window'
import { cn } from '@/lib/utils'
import { format, isToday, isYesterday, isSameWeek } from 'date-fns'
import MobileMemoryCard from './MobileMemoryCard'
import MemoryCardSkeleton from '@/components/updates/MemoryCardSkeleton'
import EmptyTimelineState, { NoSearchResultsState } from './EmptyTimelineState'

interface Update {
  id: string
  child: {
    id: string
    name: string
    avatar?: string
    age: string
  }
  content: string
  contentPreview: string
  createdAt: Date
  timeAgo: string
  mediaUrls?: string[]
  mediaCount?: number
  responseCount: number
  hasUnreadResponses: boolean
  distributionStatus: 'draft' | 'scheduled' | 'sending' | 'sent' | 'failed'
  isLiked?: boolean
  likeCount?: number
}

interface MobileTimelineContainerProps {
  updates: Update[]
  loading?: boolean
  hasMore?: boolean
  onLoadMore?: () => void
  onUpdateClick: (updateId: string) => void
  onUpdateLike?: (updateId: string) => void
  onUpdateShare?: (updateId: string) => void
  onUpdateResponse?: (updateId: string) => void
  searchQuery?: string
  onClearSearch?: () => void
  hasCompletedOnboarding?: boolean
  userName?: string
  onCreateUpdate?: (type: 'photo' | 'text' | 'video' | 'milestone') => void
  className?: string
}

interface GroupedUpdate {
  type: 'date-header' | 'update'
  id: string
  date?: Date
  dateLabel?: string
  update?: Update
  isSticky?: boolean
}

const ITEM_HEIGHT = 180 // Base height for update cards
const HEADER_HEIGHT = 60 // Height for date headers

export const MobileTimelineContainer: React.FC<MobileTimelineContainerProps> = ({
  updates,
  loading = false,
  hasMore = false,
  onLoadMore,
  onUpdateClick,
  onUpdateLike,
  onUpdateShare,
  onUpdateResponse,
  searchQuery,
  onClearSearch,
  hasCompletedOnboarding = false,
  userName,
  onCreateUpdate,
  className
}) => {
  const [containerHeight, setContainerHeight] = useState(600)
  const listRef = useRef<List>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const observerRef = useRef<HTMLDivElement>(null)

  // Calculate container height based on viewport
  useEffect(() => {
    const updateHeight = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect()
        const availableHeight = window.innerHeight - rect.top - 20 // 20px bottom margin
        setContainerHeight(Math.max(400, availableHeight))
      }
    }

    updateHeight()
    window.addEventListener('resize', updateHeight)
    return () => window.removeEventListener('resize', updateHeight)
  }, [])

  // Intersection Observer for infinite scroll
  useEffect(() => {
    if (!onLoadMore || !hasMore || loading) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          onLoadMore()
        }
      },
      {
        threshold: 0.1,
        rootMargin: '100px'
      }
    )

    if (observerRef.current) {
      observer.observe(observerRef.current)
    }

    return () => observer.disconnect()
  }, [onLoadMore, hasMore, loading])

  // Format date labels
  const formatDateLabel = (date: Date): string => {
    if (isToday(date)) return 'Today'
    if (isYesterday(date)) return 'Yesterday'
    if (isSameWeek(date, new Date())) return format(date, 'EEEE') // Monday, Tuesday, etc.
    return format(date, 'MMMM d, yyyy')
  }

  // Group updates by date
  const groupedItems = useMemo((): GroupedUpdate[] => {
    if (updates.length === 0) return []

    // Group updates by date
    const groups = updates.reduce((acc, update) => {
      const dateKey = format(update.createdAt, 'yyyy-MM-dd')
      if (!acc[dateKey]) {
        acc[dateKey] = {
          date: update.createdAt,
          updates: []
        }
      }
      acc[dateKey].updates.push(update)
      return acc
    }, {} as Record<string, { date: Date; updates: Update[] }>)

    // Convert to flat array with headers
    const items: GroupedUpdate[] = []

    Object.entries(groups)
      .sort(([a], [b]) => b.localeCompare(a)) // Sort by date descending
      .forEach(([dateKey, group]) => {
        // Add date header
        items.push({
          type: 'date-header',
          id: `header-${dateKey}`,
          date: group.date,
          dateLabel: formatDateLabel(group.date),
          isSticky: true
        })

        // Add updates for this date
        group.updates.forEach(update => {
          items.push({
            type: 'update',
            id: update.id,
            update
          })
        })
      })

    return items
  }, [updates])

  // Calculate item height for virtual scrolling
  const getItemHeight = (index: number): number => {
    const item = groupedItems[index]
    if (item?.type === 'date-header') return HEADER_HEIGHT
    return ITEM_HEIGHT
  }

  // Render individual items
  const renderItem = ({ index, style }: { index: number; style: React.CSSProperties }) => {
    const item = groupedItems[index]

    if (item.type === 'date-header') {
      return (
        <div style={style}>
          <div className={cn(
            'sticky top-0 z-10 bg-white/95 backdrop-blur-sm',
            'px-4 py-4 border-b border-neutral-100'
          )}>
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-neutral-900">
                {item.dateLabel}
              </h2>
              <span className="text-xs text-neutral-500">
                {item.date && format(item.date, 'MMM d')}
              </span>
            </div>
          </div>
        </div>
      )
    }

    if (item.update) {
      return (
        <div style={style}>
          <MobileMemoryCard
            update={item.update}
            onClick={onUpdateClick}
            onLike={onUpdateLike}
            onShare={onUpdateShare}
            onResponse={onUpdateResponse}
            className="mb-0"
          />
        </div>
      )
    }

    return null
  }

  // Handle empty states
  if (!loading && updates.length === 0) {
    if (searchQuery) {
      return (
        <NoSearchResultsState
          searchQuery={searchQuery}
          onClearSearch={onClearSearch || (() => {})}
          className={className}
        />
      )
    }

    return (
      <EmptyTimelineState
        hasCompletedOnboarding={hasCompletedOnboarding}
        userName={userName}
        onCreateUpdate={onCreateUpdate}
        className={className}
      />
    )
  }

  return (
    <div
      ref={containerRef}
      className={cn('flex flex-col h-full bg-neutral-50', className)}
    >
      {/* Loading skeletons */}
      {loading && updates.length === 0 && (
        <div className="space-y-4 p-4">
          {[...Array(5)].map((_, i) => (
            <MemoryCardSkeleton key={i} />
          ))}
        </div>
      )}

      {/* Virtual scrolling list */}
      {updates.length > 0 && (
        <div className="flex-1">
          <List
            ref={listRef}
            height={containerHeight}
            width="100%"
            itemCount={groupedItems.length}
            itemSize={getItemHeight}
            estimatedItemSize={200}
            overscanCount={5}
            className="scrollbar-thin scrollbar-thumb-neutral-300 scrollbar-track-neutral-100"
          >
            {renderItem}
          </List>

          {/* Load more trigger */}
          <div
            ref={observerRef}
            className="h-20 flex items-center justify-center"
          >
            {loading && hasMore && (
              <div className="flex items-center space-x-2 text-neutral-500">
                <div className="w-4 h-4 border-2 border-neutral-300 border-t-primary-500 rounded-full animate-spin" />
                <span className="text-sm">Loading more memories...</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Infinite scroll loading indicator */}
      {loading && updates.length > 0 && (
        <div className="p-4 bg-white border-t border-neutral-200">
          <MemoryCardSkeleton />
        </div>
      )}
    </div>
  )
}

export default MobileTimelineContainer
