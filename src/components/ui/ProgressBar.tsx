'use client'

import { cn } from '@/lib/utils'
import { memo } from 'react'

export interface ProgressBarProps {
  /**
   * Progress value between 0 and 100
   */
  value?: number

  /**
   * Indeterminate loading state (no specific progress)
   */
  indeterminate?: boolean

  /**
   * Size variant
   */
  size?: 'sm' | 'md' | 'lg'

  /**
   * Color variant
   */
  variant?: 'primary' | 'success' | 'warning' | 'error'

  /**
   * Show percentage label
   */
  showLabel?: boolean

  /**
   * Custom label to display instead of percentage
   */
  label?: string

  /**
   * Additional CSS classes
   */
  className?: string

  /**
   * Accessible label for screen readers
   */
  ariaLabel?: string
}

/**
 * ProgressBar component for showing loading progress
 *
 * Features:
 * - Determinate and indeterminate modes
 * - Multiple size and color variants
 * - Optional percentage label
 * - Fully accessible with ARIA attributes
 * - Smooth animations
 *
 * @example
 * ```tsx
 * // Determinate progress
 * <ProgressBar value={75} showLabel />
 *
 * // Indeterminate loading
 * <ProgressBar indeterminate />
 *
 * // Upload progress
 * <ProgressBar
 *   value={uploadProgress}
 *   variant="success"
 *   size="lg"
 *   label={`Uploading ${fileName}...`}
 * />
 * ```
 */
export const ProgressBar = memo<ProgressBarProps>(function ProgressBar({
  value = 0,
  indeterminate = false,
  size = 'md',
  variant = 'primary',
  showLabel = false,
  label,
  className,
  ariaLabel
}) {
  // Clamp value between 0 and 100
  const clampedValue = Math.min(Math.max(value, 0), 100)

  const sizeClasses = {
    sm: 'h-1',
    md: 'h-2',
    lg: 'h-3'
  }

  const variantClasses = {
    primary: 'bg-primary-500',
    success: 'bg-success-500',
    warning: 'bg-warning-500',
    error: 'bg-error-500'
  }

  const backgroundClasses = {
    primary: 'bg-primary-100',
    success: 'bg-success-100',
    warning: 'bg-warning-100',
    error: 'bg-error-100'
  }

  return (
    <div className={cn('w-full', className)}>
      {/* Label */}
      {(showLabel || label) && (
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-neutral-700">
            {label || 'Loading...'}
          </span>
          {showLabel && !label && (
            <span className="text-sm font-medium text-neutral-900">
              {clampedValue}%
            </span>
          )}
        </div>
      )}

      {/* Progress bar */}
      <div
        className={cn(
          'relative w-full rounded-full overflow-hidden',
          sizeClasses[size],
          backgroundClasses[variant]
        )}
        role="progressbar"
        aria-valuenow={indeterminate ? undefined : clampedValue}
        aria-valuemin={indeterminate ? undefined : 0}
        aria-valuemax={indeterminate ? undefined : 100}
        aria-label={ariaLabel || label || 'Loading progress'}
        aria-busy={indeterminate || clampedValue < 100}
      >
        <div
          className={cn(
            'h-full transition-all duration-300 ease-out rounded-full',
            variantClasses[variant],
            indeterminate && 'animate-progress-indeterminate'
          )}
          style={{
            width: indeterminate ? '30%' : `${clampedValue}%`
          }}
        />
      </div>
    </div>
  )
})

ProgressBar.displayName = 'ProgressBar'

/**
 * Circular progress indicator
 *
 * @example
 * ```tsx
 * <CircularProgress value={75} size={64} />
 * <CircularProgress indeterminate size={48} />
 * ```
 */
export interface CircularProgressProps {
  value?: number
  indeterminate?: boolean
  size?: number
  strokeWidth?: number
  variant?: 'primary' | 'success' | 'warning' | 'error'
  showLabel?: boolean
  className?: string
}

export const CircularProgress = memo<CircularProgressProps>(function CircularProgress({
  value = 0,
  indeterminate = false,
  size = 40,
  strokeWidth = 4,
  variant = 'primary',
  showLabel = false,
  className
}) {
  const clampedValue = Math.min(Math.max(value, 0), 100)
  const radius = (size - strokeWidth) / 2
  const circumference = radius * 2 * Math.PI
  const offset = circumference - (clampedValue / 100) * circumference

  const colorClasses = {
    primary: 'text-primary-500',
    success: 'text-success-500',
    warning: 'text-warning-500',
    error: 'text-error-500'
  }

  return (
    <div className={cn('inline-flex items-center justify-center', className)}>
      <div className="relative" style={{ width: size, height: size }}>
        <svg
          className={cn(
            'transform -rotate-90',
            indeterminate && 'animate-spin'
          )}
          width={size}
          height={size}
          role="progressbar"
          aria-valuenow={indeterminate ? undefined : clampedValue}
          aria-valuemin={indeterminate ? undefined : 0}
          aria-valuemax={indeterminate ? undefined : 100}
        >
          {/* Background circle */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="currentColor"
            strokeWidth={strokeWidth}
            fill="none"
            className="text-neutral-200"
          />
          {/* Progress circle */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="currentColor"
            strokeWidth={strokeWidth}
            fill="none"
            strokeDasharray={circumference}
            strokeDashoffset={indeterminate ? circumference * 0.75 : offset}
            strokeLinecap="round"
            className={cn(
              'transition-all duration-300 ease-out',
              colorClasses[variant]
            )}
          />
        </svg>

        {/* Label */}
        {showLabel && !indeterminate && (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-xs font-medium text-neutral-900">
              {clampedValue}%
            </span>
          </div>
        )}
      </div>
    </div>
  )
})

CircularProgress.displayName = 'CircularProgress'
