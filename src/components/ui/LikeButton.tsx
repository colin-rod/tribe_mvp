'use client'

import { memo, useCallback } from 'react'
import { cn } from '@/lib/utils'
import { useLikes } from '@/hooks/useLikes'
import type { LikeButtonProps } from '@/lib/types/likes'

/**
 * Like button component with optimistic updates and real-time sync
 */
const LikeButton = memo<LikeButtonProps>(function LikeButton({
  updateId,
  initialLiked = false,
  initialCount = 0,
  size = 'md',
  showCount = true,
  className,
  onLikeChange
}) {
  const { likeState, toggleLike } = useLikes(updateId, initialLiked, initialCount)

  const handleClick = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation() // Prevent event bubbling to parent elements
    await toggleLike()

    if (onLikeChange) {
      onLikeChange(!likeState.isLiked, likeState.likeCount)
    }
  }, [toggleLike, likeState.isLiked, likeState.likeCount, onLikeChange])

  const sizeClasses = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base'
  }

  const iconSizeClasses = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-5 h-5'
  }

  return (
    <button
      onClick={handleClick}
      disabled={likeState.loading}
      className={cn(
        'flex items-center space-x-1 transition-all duration-200',
        'hover:scale-105 active:scale-95',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        likeState.isLiked
          ? 'text-red-500 hover:text-red-600'
          : 'text-neutral-500 hover:text-red-500',
        sizeClasses[size],
        className
      )}
      aria-label={likeState.isLiked ? 'Unlike this update' : 'Like this update'}
    >
      {/* Heart icon */}
      <svg
        className={cn(
          'transition-all duration-200',
          iconSizeClasses[size],
          likeState.isLiked && 'scale-110',
          likeState.loading && 'animate-pulse'
        )}
        fill={likeState.isLiked ? 'currentColor' : 'none'}
        stroke="currentColor"
        strokeWidth={likeState.isLiked ? 0 : 2}
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
        />
      </svg>

      {/* Like count */}
      {showCount && (
        <span className={cn(
          'font-medium transition-all duration-200',
          likeState.loading && 'opacity-50'
        )}>
          {likeState.likeCount}
        </span>
      )}

      {/* Loading indicator overlay */}
      {likeState.loading && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className={cn(
            'animate-spin rounded-full border-2 border-current border-t-transparent',
            iconSizeClasses[size]
          )} />
        </div>
      )}
    </button>
  )
})

LikeButton.displayName = 'LikeButton'

export default LikeButton

/**
 * Compact like button for use in lists or small spaces
 */
export const CompactLikeButton = memo<Omit<LikeButtonProps, 'size' | 'showCount'>>(
  function CompactLikeButton(props) {
    return <LikeButton {...props} size="sm" showCount={false} />
  }
)

CompactLikeButton.displayName = 'CompactLikeButton'

/**
 * Like counter display without button functionality
 */
export const LikeCounter = memo<{
  count: number
  size?: 'sm' | 'md' | 'lg'
  className?: string
}>(function LikeCounter({ count, size = 'md', className }) {
  const sizeClasses = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base'
  }

  const iconSizeClasses = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-5 h-5'
  }

  if (count === 0) return null

  return (
    <div className={cn(
      'flex items-center space-x-1 text-neutral-500',
      sizeClasses[size],
      className
    )}>
      <svg
        className={iconSizeClasses[size]}
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
        />
      </svg>
      <span className="font-medium">{count}</span>
    </div>
  )
})

LikeCounter.displayName = 'LikeCounter'