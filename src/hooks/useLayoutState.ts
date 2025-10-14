'use client'

import { useState, useEffect, useCallback } from 'react'
import { LAYOUT_STORAGE_KEY, LAYOUT_BREAKPOINTS } from '@/types/layout'
import type { LayoutState } from '@/types/layout'

/**
 * Hook for managing layout state with localStorage persistence
 * CRO-293: Core Layout Shell & Top Bar
 * CRO-301: Responsive Breakpoint Handling
 */
export function useLayoutState() {
  const [state, setState] = useState<LayoutState>({
    leftNavCollapsed: false,
    rightPaneCollapsed: false,
    isMobile: false,
    focusMode: true,
  })

  // Track user's manual preference for right pane (to restore when screen is large enough)
  const [userRightPanePreference, setUserRightPanePreference] = useState(false)

  // Load state from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(LAYOUT_STORAGE_KEY)
      if (stored) {
        const parsed = JSON.parse(stored) as Partial<LayoutState> & { userRightPanePreference?: boolean }
        const hasFocusPreference = Object.prototype.hasOwnProperty.call(parsed, 'focusMode')

        setState(prev => ({
          ...prev,
          leftNavCollapsed: parsed.leftNavCollapsed ?? false,
          rightPaneCollapsed: parsed.rightPaneCollapsed ?? false,
          focusMode: hasFocusPreference ? Boolean(parsed.focusMode) : false,
        }))
        setUserRightPanePreference(parsed.userRightPanePreference ?? false)
      }
    } catch {
      // Ignore localStorage errors (e.g., in incognito mode)
    }
  }, [])

  // Persist state to localStorage whenever it changes
  useEffect(() => {
    try {
      const toStore = {
        leftNavCollapsed: state.leftNavCollapsed,
        rightPaneCollapsed: state.rightPaneCollapsed,
        focusMode: state.focusMode,
        userRightPanePreference,
      }
      localStorage.setItem(LAYOUT_STORAGE_KEY, JSON.stringify(toStore))
    } catch {
      // Ignore localStorage errors
    }
  }, [state.leftNavCollapsed, state.rightPaneCollapsed, state.focusMode, userRightPanePreference])

  // Handle window resize to detect mobile/desktop and auto-collapse right pane
  // CRO-301: Auto-collapse right pane below 1280px
  useEffect(() => {
    const updateLayout = () => {
      const width = window.innerWidth
      const isMobile = width < LAYOUT_BREAKPOINTS.LG
      const isXL = width >= LAYOUT_BREAKPOINTS.XL

      setState(prev => {
        // Focus mode always enforces a single column layout
        if (prev.focusMode) {
          return {
            ...prev,
            isMobile,
            rightPaneCollapsed: true,
          }
        }

        // If mobile (< 1024px), show mobile fallback
        if (isMobile) {
          return {
            ...prev,
            isMobile: true,
          }
        }

        // If XL and above (>= 1280px), restore user preference
        if (isXL) {
          return {
            ...prev,
            isMobile: false,
            rightPaneCollapsed: userRightPanePreference,
          }
        }

        // If LG (1024px - 1279px), auto-collapse right pane
        return {
          ...prev,
          isMobile: false,
          rightPaneCollapsed: true,
        }
      })
    }

    // Set initial value
    updateLayout()

    // Listen for resize events
    window.addEventListener('resize', updateLayout)
    return () => window.removeEventListener('resize', updateLayout)
  }, [userRightPanePreference])

  const toggleLeftNav = useCallback(() => {
    setState(prev => ({
      ...prev,
      leftNavCollapsed: !prev.leftNavCollapsed,
    }))
  }, [])

  const toggleRightPane = useCallback(() => {
    setState(prev => {
      const newCollapsed = !prev.rightPaneCollapsed
      // Save user preference when manually toggling (only if screen is XL+)
      if (window.innerWidth >= LAYOUT_BREAKPOINTS.XL) {
        setUserRightPanePreference(newCollapsed)
      }
      return {
        ...prev,
        rightPaneCollapsed: newCollapsed,
      }
    })
  }, [])

  const setIsMobile = useCallback((isMobile: boolean) => {
    setState(prev => ({
      ...prev,
      isMobile,
    }))
  }, [])

  const setFocusMode = useCallback(
    (focusMode: boolean) => {
      setState(prev => {
        const isXLViewport = typeof window !== 'undefined' && window.innerWidth >= LAYOUT_BREAKPOINTS.XL

        return {
          ...prev,
          focusMode,
          rightPaneCollapsed: focusMode
            ? true
            : isXLViewport
              ? userRightPanePreference
              : prev.rightPaneCollapsed,
        }
      })
    },
    [userRightPanePreference]
  )

  return {
    ...state,
    toggleLeftNav,
    toggleRightPane,
    setIsMobile,
    setFocusMode,
  }
}
