'use client'

import { cn } from '@/lib/utils'
import type { MemoryStatus } from '@/lib/validation/memory'

interface MemoryBadgeProps {
  isNew: boolean
  status: MemoryStatus
  className?: string
  variant?: 'default' | 'compact'
}

/**
 * Memory badge component - shows "New" indicator for unreviewed memories
 */
export function MemoryBadge({ isNew, status, className, variant = 'default' }: MemoryBadgeProps) {
  // Only show badge if memory is new and in 'new' status
  if (!isNew || status !== 'new') {
    return null
  }

  if (variant === 'compact') {
    return (
      <div className={cn('inline-flex items-center', className)}>
        <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
      </div>
    )
  }

  return (
    <span
      className={cn(
        'inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold',
        'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg',
        'animate-pulse',
        className
      )}
    >
      <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
      </svg>
      New
    </span>
  )
}

/**
 * Memory count badge - shows count of new memories
 */
export function MemoryCountBadge({ count, className }: { count: number; className?: string }) {
  if (count === 0) {
    return null
  }

  return (
    <span
      className={cn(
        'inline-flex items-center justify-center',
        'min-w-[20px] h-5 px-1.5 rounded-full',
        'bg-blue-500 text-white text-xs font-semibold',
        'animate-pulse',
        className
      )}
    >
      {count > 99 ? '99+' : count}
    </span>
  )
}
