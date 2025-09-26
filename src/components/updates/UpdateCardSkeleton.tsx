'use client'

import { cn } from '@/lib/utils'

interface UpdateCardSkeletonProps {
  className?: string
}

/**
 * Enhanced loading skeleton for UpdateCard component with shimmer effect
 */
export default function UpdateCardSkeleton({ className }: UpdateCardSkeletonProps) {
  return (
    <div
      className={cn(
        'bg-white rounded-xl shadow-sm border border-neutral-200 p-4 sm:p-5',
        'animate-pulse relative overflow-hidden',
        className
      )}
    >
      {/* Shimmer effect */}
      <div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-white/60 to-transparent" />

      {/* Header with child info and timestamp */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center space-x-3 min-w-0 flex-1">
          {/* Enhanced child avatar skeleton */}
          <div className="flex-shrink-0">
            <div className="w-12 h-12 rounded-full bg-neutral-200" />
          </div>

          {/* Child name and age skeleton */}
          <div className="min-w-0 flex-1">
            <div className="h-5 bg-neutral-200 rounded-lg w-24 mb-2" />
            <div className="h-4 bg-neutral-200 rounded-lg w-20" />
          </div>
        </div>

        {/* Timestamp and status skeleton */}
        <div className="flex-shrink-0 text-right space-y-1">
          <div className="h-4 bg-neutral-200 rounded-lg w-16" />
          <div className="h-6 bg-neutral-200 rounded-full w-20" />
        </div>
      </div>

      {/* Content preview skeleton with varied heights */}
      <div className="mb-4 space-y-2">
        <div className="h-4 bg-neutral-200 rounded-lg w-full" />
        <div className="h-4 bg-neutral-200 rounded-lg w-5/6" />
        <div className="h-4 bg-neutral-200 rounded-lg w-3/4" />
      </div>

      {/* Footer skeleton with border */}
      <div className="pt-3 border-t border-neutral-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            {/* Response count with icon skeleton */}
            <div className="flex items-center space-x-2">
              <div className="w-7 h-7 bg-neutral-200 rounded-full" />
              <div className="h-4 bg-neutral-200 rounded-lg w-24" />
            </div>
          </div>

          {/* View arrow skeleton */}
          <div className="flex items-center space-x-1">
            <div className="h-4 bg-neutral-200 rounded w-8 opacity-0" />
            <div className="w-4 h-4 bg-neutral-200 rounded" />
          </div>
        </div>
      </div>
    </div>
  )
}