/**
 * useLiveRegion Hook
 * CRO-154: Accessibility - Keyboard Navigation & Focus Management
 *
 * Manages ARIA live regions for dynamic content announcements
 * Ensures screen readers are notified of important changes
 *
 * WCAG 2.1 Level A: 4.1.3 Status Messages (AA)
 */

'use client'

import { useCallback, useEffect, useRef } from 'react'

export type LiveRegionPoliteness = 'polite' | 'assertive' | 'off'

export interface LiveRegionOptions {
  /** Politeness level for announcements */
  politeness?: LiveRegionPoliteness
  /** Whether to clear previous messages before announcing */
  clearOnAnnounce?: boolean
  /** Delay before announcing (helps screen readers pick up the message) */
  delay?: number
}

export function useLiveRegion(options: LiveRegionOptions = {}) {
  const {
    politeness = 'polite',
    clearOnAnnounce = true,
    delay = 100
  } = options

  const liveRegionRef = useRef<HTMLDivElement | null>(null)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Create live region on mount
  useEffect(() => {
    const id = 'live-region-' + Math.random().toString(36).substr(2, 9)
    let region = document.getElementById(id) as HTMLDivElement

    if (!region) {
      region = document.createElement('div')
      region.id = id
      region.setAttribute('role', 'status')
      region.setAttribute('aria-live', politeness)
      region.setAttribute('aria-atomic', 'true')
      region.className = 'sr-only'
      document.body.appendChild(region)
    }

    liveRegionRef.current = region

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
        timeoutRef.current = null
      }
      if (region && region.parentNode) {
        region.parentNode.removeChild(region)
      }
    }
  }, [politeness])

  const announce = useCallback((message: string, options?: { politeness?: LiveRegionPoliteness }) => {
    if (!liveRegionRef.current) return

    const region = liveRegionRef.current

    // Update politeness if specified
    if (options?.politeness) {
      region.setAttribute('aria-live', options.politeness)
    }

    // Clear previous message if needed
    if (clearOnAnnounce) {
      region.textContent = ''
    }

    // Clear any pending announcements
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }

    // Announce after delay
    timeoutRef.current = setTimeout(() => {
      if (region) {
        region.textContent = message
      }
    }, delay)
  }, [clearOnAnnounce, delay])

  const clear = useCallback(() => {
    if (liveRegionRef.current) {
      liveRegionRef.current.textContent = ''
    }
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }
  }, [])

  return {
    announce,
    clear
  }
}

/**
 * Hook for announcing form validation errors
 */
export function useFormErrorAnnouncer() {
  const { announce } = useLiveRegion({ politeness: 'assertive' })

  const announceError = useCallback((fieldName: string, errorMessage: string) => {
    announce(`${fieldName}: ${errorMessage}`)
  }, [announce])

  const announceErrors = useCallback((errors: Record<string, string>) => {
    const errorMessages = Object.entries(errors)
      .map(([field, message]) => `${field}: ${message}`)
      .join('. ')

    if (errorMessages) {
      announce(`Form has errors. ${errorMessages}`)
    }
  }, [announce])

  return {
    announceError,
    announceErrors
  }
}

/**
 * Hook for announcing loading states
 */
export function useLoadingAnnouncer() {
  const { announce, clear } = useLiveRegion({ politeness: 'polite' })

  const announceLoading = useCallback((message: string = 'Loading') => {
    announce(message)
  }, [announce])

  const announceLoaded = useCallback((message: string = 'Content loaded') => {
    announce(message)
  }, [announce])

  return {
    announceLoading,
    announceLoaded,
    clear
  }
}

/**
 * Hook for announcing success/error notifications
 */
export function useNotificationAnnouncer() {
  const { announce } = useLiveRegion()

  const announceSuccess = useCallback((message: string) => {
    announce(message, { politeness: 'polite' })
  }, [announce])

  const announceError = useCallback((message: string) => {
    announce(message, { politeness: 'assertive' })
  }, [announce])

  const announceInfo = useCallback((message: string) => {
    announce(message, { politeness: 'polite' })
  }, [announce])

  return {
    announceSuccess,
    announceError,
    announceInfo
  }
}
