'use client'

import { useState, useEffect, useCallback } from 'react'
import { LAYOUT_STORAGE_KEY, LAYOUT_BREAKPOINTS } from '@/types/layout'
import type { LayoutState } from '@/types/layout'

/**
 * Hook for managing layout state with localStorage persistence
 * CRO-293: Core Layout Shell & Top Bar
 */
export function useLayoutState() {
  const [state, setState] = useState<LayoutState>({
    leftNavCollapsed: false,
    rightPaneCollapsed: false,
    isMobile: false,
  })

  // Load state from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(LAYOUT_STORAGE_KEY)
      if (stored) {
        const parsed = JSON.parse(stored) as Partial<LayoutState>
        setState(prev => ({
          ...prev,
          leftNavCollapsed: parsed.leftNavCollapsed ?? false,
          rightPaneCollapsed: parsed.rightPaneCollapsed ?? false,
        }))
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
      }
      localStorage.setItem(LAYOUT_STORAGE_KEY, JSON.stringify(toStore))
    } catch {
      // Ignore localStorage errors
    }
  }, [state.leftNavCollapsed, state.rightPaneCollapsed])

  // Handle window resize to detect mobile/desktop
  useEffect(() => {
    const updateIsMobile = () => {
      setState(prev => ({
        ...prev,
        isMobile: window.innerWidth < LAYOUT_BREAKPOINTS.DESKTOP,
      }))
    }

    // Set initial value
    updateIsMobile()

    // Listen for resize events
    window.addEventListener('resize', updateIsMobile)
    return () => window.removeEventListener('resize', updateIsMobile)
  }, [])

  const toggleLeftNav = useCallback(() => {
    setState(prev => ({
      ...prev,
      leftNavCollapsed: !prev.leftNavCollapsed,
    }))
  }, [])

  const toggleRightPane = useCallback(() => {
    setState(prev => ({
      ...prev,
      rightPaneCollapsed: !prev.rightPaneCollapsed,
    }))
  }, [])

  const setIsMobile = useCallback((isMobile: boolean) => {
    setState(prev => ({
      ...prev,
      isMobile,
    }))
  }, [])

  return {
    ...state,
    toggleLeftNav,
    toggleRightPane,
    setIsMobile,
  }
}
