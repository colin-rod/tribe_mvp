'use client'

import { memo } from 'react'
import { cn } from '@/lib/utils'
import { LoadingSpinner } from './LoadingSpinner'
import {
  Skeleton,
  TimelineSkeleton,
  TimelineCardSkeleton,
  SearchResultsSkeleton,
  DashboardHeroSkeleton,
  StaggeredListSkeleton,
  GridSkeleton
} from './SkeletonLoader'

export interface LoadingStateProps {
  /**
   * Type of loading display
   * - 'spinner': Shows centered loading spinner with optional message
   * - 'skeleton': Shows appropriate skeleton loader based on variant
   */
  type?: 'spinner' | 'skeleton'

  /**
   * Skeleton variant to display when type='skeleton'
   */
  variant?: 'timeline' | 'timeline-card' | 'search' | 'hero' | 'list' | 'grid' | 'custom'

  /**
   * Optional message to display with spinner
   */
  message?: string

  /**
   * Size of the spinner
   */
  size?: 'sm' | 'md' | 'lg'

  /**
   * Additional CSS classes
   */
  className?: string

  /**
   * Minimum height to prevent layout shift
   */
  minHeight?: string | number

  /**
   * Options for skeleton loaders
   */
  skeletonOptions?: {
    count?: number
    compact?: boolean
    itemHeight?: number
    showHeader?: boolean
    spacing?: 'sm' | 'md' | 'lg'
    columns?: 1 | 2 | 3 | 4
    aspectRatio?: 'square' | 'video' | 'portrait'
  }

  /**
   * Custom skeleton component to render
   */
  customSkeleton?: React.ReactNode

  /**
   * Whether to center the content vertically
   */
  centerVertically?: boolean
}

/**
 * Standardized loading state component that prevents layout shifts
 *
 * Features:
 * - Prevents layout shifts with min-height
 * - Supports both spinner and skeleton loading patterns
 * - Multiple skeleton variants for different contexts
 * - Accessible with proper ARIA labels
 * - Consistent loading UX across the app
 *
 * @example
 * ```tsx
 * // Spinner loading
 * <LoadingState
 *   type="spinner"
 *   message="Loading your updates..."
 *   size="lg"
 * />
 *
 * // Skeleton loading for timeline
 * <LoadingState
 *   type="skeleton"
 *   variant="timeline"
 *   skeletonOptions={{ count: 5, compact: true }}
 * />
 *
 * // List skeleton
 * <LoadingState
 *   type="skeleton"
 *   variant="list"
 *   skeletonOptions={{ count: 6, itemHeight: 80 }}
 * />
 * ```
 */
export const LoadingState = memo<LoadingStateProps>(function LoadingState({
  type = 'spinner',
  variant = 'timeline',
  message,
  size = 'md',
  className,
  minHeight,
  skeletonOptions = {},
  customSkeleton,
  centerVertically = true
}) {
  // Render skeleton loading
  if (type === 'skeleton') {
    if (customSkeleton) {
      return <div className={className}>{customSkeleton}</div>
    }

    const {
      count = 5,
      compact = false,
      itemHeight = 80,
      showHeader = false,
      spacing = 'md',
      columns = 3,
      aspectRatio = 'square'
    } = skeletonOptions

    switch (variant) {
      case 'timeline':
        return (
          <div className={className}>
            <TimelineSkeleton count={count} compact={compact} />
          </div>
        )

      case 'timeline-card':
        return (
          <div className={cn('space-y-4', className)}>
            {Array.from({ length: count }, (_, i) => (
              <TimelineCardSkeleton key={i} compact={compact} />
            ))}
          </div>
        )

      case 'search':
        return (
          <div className={className}>
            <SearchResultsSkeleton />
          </div>
        )

      case 'hero':
        return (
          <div className={className}>
            <DashboardHeroSkeleton />
          </div>
        )

      case 'list':
        return (
          <div className={className}>
            <StaggeredListSkeleton
              count={count}
              itemHeight={itemHeight}
              showHeader={showHeader}
              spacing={spacing}
            />
          </div>
        )

      case 'grid':
        return (
          <div className={className}>
            <GridSkeleton
              columns={columns}
              count={count}
              aspectRatio={aspectRatio}
            />
          </div>
        )

      case 'custom':
        return (
          <div className={cn('space-y-4', className)}>
            {Array.from({ length: count }, (_, i) => (
              <Skeleton key={i} className="h-20 w-full" />
            ))}
          </div>
        )

      default:
        return (
          <div className={className}>
            <TimelineSkeleton count={count} compact={compact} />
          </div>
        )
    }
  }

  // Render spinner loading
  const minHeightStyle = minHeight
    ? typeof minHeight === 'number'
      ? { minHeight: `${minHeight}px` }
      : { minHeight }
    : undefined

  return (
    <div
      className={cn(
        'flex items-center justify-center',
        centerVertically && 'py-12',
        className
      )}
      style={minHeightStyle}
      role="status"
      aria-live="polite"
      aria-label={message || 'Loading'}
    >
      <div className="flex items-center">
        <LoadingSpinner size={size} />
        {message && (
          <span className="ml-3 text-neutral-600">
            {message}
          </span>
        )}
      </div>
      <span className="sr-only">Loading...</span>
    </div>
  )
})

LoadingState.displayName = 'LoadingState'

/**
 * Higher-order component that wraps content with loading and error states
 *
 * @example
 * ```tsx
 * <LoadingWrapper
 *   loading={isLoading}
 *   error={error}
 *   onRetry={handleRetry}
 *   loadingType="skeleton"
 *   loadingVariant="timeline"
 * >
 *   <YourContent />
 * </LoadingWrapper>
 * ```
 */
export interface LoadingWrapperProps extends LoadingStateProps {
  loading: boolean
  error?: string | null
  onRetry?: () => void
  errorTitle?: string
  children: React.ReactNode
  emptyState?: React.ReactNode
  isEmpty?: boolean
}

export const LoadingWrapper = memo<LoadingWrapperProps>(function LoadingWrapper({
  loading,
  error,
  onRetry,
  errorTitle,
  children,
  emptyState,
  isEmpty = false,
  ...loadingProps
}) {
  // Show loading state
  if (loading) {
    return <LoadingState {...loadingProps} />
  }

  // Show error state
  if (error) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports -- Dynamic import to avoid circular dependency
    const ErrorStateComponent = require('./ErrorState').ErrorState
    return (
      <ErrorStateComponent
        title={errorTitle}
        message={error}
        onRetry={onRetry}
        className={loadingProps.className}
      />
    )
  }

  // Show empty state
  if (isEmpty && emptyState) {
    return <>{emptyState}</>
  }

  // Show content
  return <>{children}</>
})

LoadingWrapper.displayName = 'LoadingWrapper'
