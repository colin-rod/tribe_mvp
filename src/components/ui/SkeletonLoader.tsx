'use client'

import { memo } from 'react'
import { cn } from '@/lib/utils'

interface SkeletonProps {
  className?: string
  animate?: boolean
}

/**
 * Base skeleton component for loading states
 */
export const Skeleton = memo<SkeletonProps>(function Skeleton({
  className,
  animate = true
}) {
  return (
    <div
      className={cn(
        'bg-neutral-200 rounded',
        animate && 'animate-pulse',
        className
      )}
      aria-hidden="true"
    />
  )
})

/**
 * Timeline card skeleton for loading states
 */
export const TimelineCardSkeleton = memo<{ compact?: boolean }>(function TimelineCardSkeleton({
  compact = false
}) {
  return (
    <div className={cn(
      'bg-white rounded-lg border border-neutral-200',
      compact ? 'p-3' : 'p-4'
    )}>
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center space-x-2 flex-1">
          <Skeleton className={cn(
            'rounded-full',
            compact ? 'w-8 h-8' : 'w-10 h-10'
          )} />
          <div className="flex-1 space-y-2">
            <Skeleton className={cn(
              'h-4',
              compact ? 'w-32' : 'w-40'
            )} />
            <Skeleton className="h-3 w-24" />
          </div>
        </div>
        <Skeleton className="h-6 w-16 rounded-full" />
      </div>

      {/* Media placeholder */}
      <Skeleton className={cn(
        'w-full rounded-lg mb-3',
        compact ? 'h-32' : 'h-48'
      )} />

      {/* Content */}
      <div className="space-y-2 mb-3">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
      </div>

      {/* Tags */}
      <div className="flex gap-2 mb-3">
        <Skeleton className="h-6 w-16 rounded-full" />
        <Skeleton className="h-6 w-20 rounded-full" />
        <Skeleton className="h-6 w-12 rounded-full" />
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between pt-3 border-t border-neutral-100">
        <div className="flex items-center space-x-4">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-20" />
        </div>
        <Skeleton className="h-4 w-24" />
      </div>
    </div>
  )
})

/**
 * Timeline skeleton with multiple cards and staggered animation
 */
export const TimelineSkeleton = memo<{
  count?: number
  compact?: boolean
}>(function TimelineSkeleton({
  count = 5,
  compact = false
}) {
  return (
    <div className="space-y-4">
      {/* Search skeleton */}
      <div className="space-y-4">
        <div className="relative">
          <Skeleton className="h-12 w-full rounded-lg" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-8 w-20 rounded-full" />
          <Skeleton className="h-8 w-24 rounded-full" />
          <Skeleton className="h-8 w-16 rounded-full" />
        </div>
      </div>

      {/* Stats skeleton */}
      <div className="flex items-center justify-between px-4">
        <div className="flex items-center space-x-4">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-16" />
        </div>
        <div className="flex items-center space-x-4">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-20" />
        </div>
      </div>

      {/* Timeline cards */}
      <div className="bg-white rounded-lg border border-neutral-200 overflow-hidden">
        <div className="p-4 space-y-4">
          {Array.from({ length: count }, (_, i) => (
            <div key={i} style={{ animationDelay: `${i * 100}ms` }}>
              {/* Date header for first item and every 3rd item */}
              {(i === 0 || i % 3 === 0) && (
                <div className="py-6">
                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-neutral-200" />
                    </div>
                    <div className="relative flex justify-center">
                      <Skeleton className="h-16 w-32 rounded-full" />
                    </div>
                  </div>
                </div>
              )}

              <TimelineCardSkeleton compact={compact} />
            </div>
          ))}
        </div>
      </div>

      {/* Load more skeleton */}
      <div className="text-center">
        <Skeleton className="h-12 w-40 rounded-lg mx-auto" />
      </div>
    </div>
  )
})

/**
 * Search results skeleton
 */
export const SearchResultsSkeleton = memo(function SearchResultsSkeleton() {
  return (
    <div className="space-y-4">
      {/* Results header */}
      <div className="flex items-center justify-between">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-5 w-20" />
      </div>

      {/* Result items */}
      {Array.from({ length: 4 }, (_, i) => (
        <div
          key={i}
          className="bg-white rounded-lg border border-neutral-200 p-4"
          style={{ animationDelay: `${i * 50}ms` }}
        >
          <div className="flex items-start space-x-3">
            <Skeleton className="w-12 h-12 rounded-lg flex-shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="flex items-center justify-between">
                <Skeleton className="h-5 w-48" />
                <Skeleton className="h-4 w-16" />
              </div>
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
              <div className="flex gap-2 mt-3">
                <Skeleton className="h-6 w-16 rounded-full" />
                <Skeleton className="h-6 w-12 rounded-full" />
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
})

/**
 * Dashboard hero skeleton
 */
export const DashboardHeroSkeleton = memo(function DashboardHeroSkeleton() {
  return (
    <div className="bg-gradient-to-br from-neutral-100 to-neutral-200 px-4 py-6">
      <div className="space-y-6">
        {/* Welcome section */}
        <div>
          <Skeleton className="h-8 w-64 mb-2" />
          <Skeleton className="h-4 w-80" />
        </div>

        {/* Smart reminder skeleton */}
        <div className="bg-white/80 rounded-xl p-4">
          <div className="flex items-start space-x-3">
            <Skeleton className="w-8 h-8 rounded-full flex-shrink-0" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-5 w-48" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-8 w-32 mt-3 rounded-lg" />
            </div>
          </div>
        </div>

        {/* Create update button */}
        <div className="flex rounded-xl overflow-hidden">
          <Skeleton className="flex-1 h-14 rounded-l-xl" />
          <Skeleton className="w-14 h-14 rounded-r-xl" />
        </div>

        {/* Quick actions */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-32" />
          </div>
          <Skeleton className="h-4 w-28" />
        </div>
      </div>
    </div>
  )
})

/**
 * Staggered list skeleton with customizable items
 */
export const StaggeredListSkeleton = memo<{
  count?: number
  itemHeight?: number
  showHeader?: boolean
  spacing?: 'sm' | 'md' | 'lg'
}>(function StaggeredListSkeleton({
  count = 6,
  itemHeight = 80,
  showHeader = false,
  spacing = 'md'
}) {
  const spacingClasses = {
    sm: 'space-y-2',
    md: 'space-y-4',
    lg: 'space-y-6'
  }

  return (
    <div className={spacingClasses[spacing]}>
      {showHeader && (
        <div className="flex items-center justify-between">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-5 w-20" />
        </div>
      )}

      {Array.from({ length: count }, (_, i) => (
        <div
          key={i}
          className="animate-pulse"
          style={{ animationDelay: `${i * 75}ms` }}
        >
          <div style={{ height: itemHeight }}>
            <Skeleton className="w-full h-full rounded-lg" />
          </div>
        </div>
      ))}
    </div>
  )
})

/**
 * Grid skeleton for card layouts
 */
export const GridSkeleton = memo<{
  columns?: 1 | 2 | 3 | 4
  count?: number
  aspectRatio?: 'square' | 'video' | 'portrait'
}>(function GridSkeleton({
  columns = 3,
  count = 9,
  aspectRatio = 'square'
}) {
  const gridClasses = {
    1: 'grid-cols-1',
    2: 'grid-cols-2',
    3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4'
  }

  const aspectClasses = {
    square: 'aspect-square',
    video: 'aspect-video',
    portrait: 'aspect-[3/4]'
  }

  return (
    <div className={cn('grid gap-4', gridClasses[columns])}>
      {Array.from({ length: count }, (_, i) => (
        <div
          key={i}
          className="animate-pulse"
          style={{ animationDelay: `${i * 50}ms` }}
        >
          <Skeleton className={cn('w-full rounded-lg', aspectClasses[aspectRatio])} />
        </div>
      ))}
    </div>
  )
})

Skeleton.displayName = 'Skeleton'
TimelineCardSkeleton.displayName = 'TimelineCardSkeleton'
TimelineSkeleton.displayName = 'TimelineSkeleton'
SearchResultsSkeleton.displayName = 'SearchResultsSkeleton'
DashboardHeroSkeleton.displayName = 'DashboardHeroSkeleton'
StaggeredListSkeleton.displayName = 'StaggeredListSkeleton'
GridSkeleton.displayName = 'GridSkeleton'