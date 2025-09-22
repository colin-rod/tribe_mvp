'use client'

import { cn } from '@/lib/utils'

interface UpdateCardSkeletonProps {
  className?: string
}

/**
 * Loading skeleton for UpdateCard component
 */
export default function UpdateCardSkeleton({ className }: UpdateCardSkeletonProps) {
  return (
    <div
      className={cn(
        'bg-white rounded-lg shadow-sm border border-gray-200 p-4',
        'animate-pulse',
        className
      )}
    >
      {/* Header with child info and timestamp */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center space-x-3 min-w-0 flex-1">
          {/* Child avatar skeleton */}
          <div className="flex-shrink-0">
            <div className="w-10 h-10 rounded-full bg-gray-200" />
          </div>

          {/* Child name and age skeleton */}
          <div className="min-w-0 flex-1">
            <div className="h-4 bg-gray-200 rounded w-20 mb-1" />
            <div className="h-3 bg-gray-200 rounded w-16" />
          </div>
        </div>

        {/* Timestamp skeleton */}
        <div className="flex-shrink-0 text-right">
          <div className="h-3 bg-gray-200 rounded w-16 mb-1" />
          <div className="h-5 bg-gray-200 rounded w-12" />
        </div>
      </div>

      {/* Content preview skeleton */}
      <div className="mb-3 space-y-2">
        <div className="h-4 bg-gray-200 rounded w-full" />
        <div className="h-4 bg-gray-200 rounded w-3/4" />
        <div className="h-4 bg-gray-200 rounded w-1/2" />
      </div>

      {/* Footer skeleton */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          {/* Response count skeleton */}
          <div className="flex items-center space-x-1">
            <div className="w-4 h-4 bg-gray-200 rounded" />
            <div className="h-3 bg-gray-200 rounded w-20" />
          </div>
        </div>

        {/* Arrow skeleton */}
        <div className="w-4 h-4 bg-gray-200 rounded" />
      </div>
    </div>
  )
}