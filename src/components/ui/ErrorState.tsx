'use client'

import { memo } from 'react'
import { cn } from '@/lib/utils'
import { Button } from './Button'

export interface ErrorStateProps {
  title?: string
  message: string
  onRetry?: () => void
  retryText?: string
  showRetry?: boolean
  icon?: 'error' | 'warning' | 'info'
  className?: string
  actions?: React.ReactNode
  retryCount?: number
  maxRetries?: number
  canRetry?: boolean
}

/**
 * Standardized error state component with retry functionality
 *
 * Features:
 * - Consistent error messaging across the app
 * - Optional retry functionality with count tracking
 * - Customizable icons and actions
 * - Prevents layout shifts with fixed sizing
 * - Accessible with proper ARIA labels
 *
 * @example
 * ```tsx
 * <ErrorState
 *   title="Failed to load updates"
 *   message="Unable to connect to the server. Please check your connection."
 *   onRetry={handleRetry}
 *   retryCount={1}
 *   maxRetries={3}
 * />
 * ```
 */
export const ErrorState = memo<ErrorStateProps>(function ErrorState({
  title = 'Something went wrong',
  message,
  onRetry,
  retryText = 'Try Again',
  showRetry = true,
  icon = 'error',
  className,
  actions,
  retryCount = 0,
  maxRetries = 3,
  canRetry = true
}) {
  const iconColors = {
    error: 'text-red-400',
    warning: 'text-yellow-400',
    info: 'text-blue-400'
  }

  const borderColors = {
    error: 'border-red-200',
    warning: 'border-yellow-200',
    info: 'border-blue-200'
  }

  const bgColors = {
    error: 'bg-red-50',
    warning: 'bg-yellow-50',
    info: 'bg-blue-50'
  }

  const textColors = {
    error: 'text-red-900',
    warning: 'text-yellow-900',
    info: 'text-blue-900'
  }

  const messageColors = {
    error: 'text-red-700',
    warning: 'text-yellow-700',
    info: 'text-blue-700'
  }

  const buttonColors = {
    error: 'border-red-300 text-red-700 hover:bg-red-50',
    warning: 'border-yellow-300 text-yellow-700 hover:bg-yellow-50',
    info: 'border-blue-300 text-blue-700 hover:bg-blue-50'
  }

  const IconSvg = () => {
    if (icon === 'warning') {
      return (
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1}
          d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-.834-1.96-.834-2.732 0L3.082 16c-.77 1.333.192 3 1.732 3z"
        />
      )
    }
    if (icon === 'info') {
      return (
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1}
          d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      )
    }
    // Default error icon
    return (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1}
        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 15.5c-.77.833.192 2.5 1.732 2.5z"
      />
    )
  }

  const isRetryDisabled = !canRetry || (retryCount >= maxRetries && maxRetries > 0)

  return (
    <div
      className={cn(
        'rounded-lg border p-6 text-center',
        bgColors[icon],
        borderColors[icon],
        className
      )}
      role="alert"
      aria-live="polite"
    >
      {/* Icon */}
      <div className={cn('mb-4', iconColors[icon])}>
        <svg
          className="mx-auto h-12 w-12"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <IconSvg />
        </svg>
      </div>

      {/* Title */}
      <h3 className={cn('text-lg font-medium mb-2', textColors[icon])}>
        {title}
      </h3>

      {/* Message */}
      <p className={cn('text-sm mb-4', messageColors[icon])}>
        {message}
      </p>

      {/* Retry count indicator */}
      {retryCount > 0 && maxRetries > 0 && (
        <p className="text-xs text-neutral-500 mb-4">
          Retry attempt {retryCount} of {maxRetries}
        </p>
      )}

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-2 justify-center">
        {/* Retry button */}
        {showRetry && onRetry && (
          <Button
            variant="outline"
            onClick={onRetry}
            disabled={isRetryDisabled}
            className={cn(buttonColors[icon])}
            aria-label={isRetryDisabled ? 'Maximum retries reached' : retryText}
          >
            {isRetryDisabled && maxRetries > 0 ? 'Max Retries Reached' : retryText}
          </Button>
        )}

        {/* Custom actions */}
        {actions}

        {/* Reload page button when retries exhausted */}
        {isRetryDisabled && maxRetries > 0 && (
          <Button
            onClick={() => window.location.reload()}
            variant="primary"
            aria-label="Reload page"
          >
            Reload Page
          </Button>
        )}
      </div>
    </div>
  )
})

ErrorState.displayName = 'ErrorState'
