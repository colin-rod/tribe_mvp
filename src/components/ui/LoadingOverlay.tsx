'use client'

import { cn } from '@/lib/utils'
import { memo } from 'react'
import { LoadingSpinner } from './LoadingSpinner'
import { createPortal } from 'react-dom'
import { useEffect, useState } from 'react'

export interface LoadingOverlayProps {
  /**
   * Whether the overlay is visible
   */
  visible: boolean

  /**
   * Message to display
   */
  message?: string

  /**
   * Spinner size
   */
  size?: 'sm' | 'md' | 'lg'

  /**
   * Whether to block interactions (default: true)
   */
  blocking?: boolean

  /**
   * Opacity of overlay background (0-100)
   */
  opacity?: number

  /**
   * Additional CSS classes
   */
  className?: string

  /**
   * Use portal to render at document body level
   */
  usePortal?: boolean

  /**
   * Z-index for overlay (default: 9999)
   */
  zIndex?: number
}

/**
 * LoadingOverlay component for blocking UI during async operations
 *
 * Features:
 * - Blocks user interaction during loading
 * - Optional message display
 * - Portal rendering for full-page overlays
 * - Accessible with proper ARIA attributes
 * - Smooth fade in/out transitions
 *
 * @example
 * ```tsx
 * // Simple overlay
 * <LoadingOverlay visible={isLoading} />
 *
 * // With message
 * <LoadingOverlay
 *   visible={isProcessing}
 *   message="Processing your request..."
 * />
 *
 * // Non-blocking overlay
 * <LoadingOverlay
 *   visible={isLoading}
 *   blocking={false}
 *   opacity={50}
 * />
 * ```
 */
export const LoadingOverlay = memo<LoadingOverlayProps>(function LoadingOverlay({
  visible,
  message,
  size = 'lg',
  blocking = true,
  opacity = 80,
  className,
  usePortal = false,
  zIndex = 9999
}) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!visible) return null

  const overlayContent = (
    <div
      className={cn(
        'fixed inset-0 flex items-center justify-center transition-opacity duration-200',
        blocking && 'cursor-wait',
        className
      )}
      style={{
        backgroundColor: `rgba(255, 255, 255, ${opacity / 100})`,
        backdropFilter: 'blur(2px)',
        zIndex
      }}
      role="dialog"
      aria-modal={blocking}
      aria-live="polite"
      aria-busy="true"
      aria-label={message || 'Loading'}
      onClick={(e) => blocking && e.stopPropagation()}
    >
      <div className="flex flex-col items-center space-y-4 p-6 bg-white rounded-lg shadow-xl border border-neutral-200">
        <LoadingSpinner size={size} />
        {message && (
          <p className="text-neutral-700 text-center max-w-xs">
            {message}
          </p>
        )}
        <span className="sr-only">Loading, please wait...</span>
      </div>
    </div>
  )

  // Use portal for full-page overlays
  if (usePortal && mounted && typeof document !== 'undefined') {
    return createPortal(overlayContent, document.body)
  }

  return overlayContent
})

LoadingOverlay.displayName = 'LoadingOverlay'

/**
 * Inline loading overlay for specific containers
 *
 * @example
 * ```tsx
 * <div className="relative">
 *   <YourContent />
 *   <InlineLoadingOverlay visible={isLoading} />
 * </div>
 * ```
 */
export interface InlineLoadingOverlayProps {
  visible: boolean
  message?: string
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export const InlineLoadingOverlay = memo<InlineLoadingOverlayProps>(
  function InlineLoadingOverlay({
    visible,
    message,
    size = 'md',
    className
  }) {
    if (!visible) return null

    return (
      <div
        className={cn(
          'absolute inset-0 flex items-center justify-center bg-white/90 backdrop-blur-sm transition-opacity duration-200 z-10',
          className
        )}
        role="status"
        aria-live="polite"
        aria-busy="true"
        aria-label={message || 'Loading'}
      >
        <div className="flex flex-col items-center space-y-3">
          <LoadingSpinner size={size} />
          {message && (
            <p className="text-sm text-neutral-600 text-center">
              {message}
            </p>
          )}
        </div>
      </div>
    )
  }
)

InlineLoadingOverlay.displayName = 'InlineLoadingOverlay'
