'use client'

import { createContext, useContext } from 'react'
import type { LayoutContextValue } from '@/types/layout'
import { useLayoutState } from '@/hooks/useLayoutState'

/**
 * Context for managing the 3-pane layout state
 * CRO-293: Core Layout Shell & Top Bar
 */
const LayoutContext = createContext<LayoutContextValue | undefined>(undefined)

export interface LayoutProviderProps {
  children: React.ReactNode
}

/**
 * Provider for the layout context
 */
export function LayoutProvider({ children }: LayoutProviderProps) {
  const layoutState = useLayoutState()

  return (
    <LayoutContext.Provider value={layoutState}>
      {children}
    </LayoutContext.Provider>
  )
}

/**
 * Hook to access the layout context
 * @throws {Error} if used outside of LayoutProvider
 */
export function useLayout(): LayoutContextValue {
  const context = useContext(LayoutContext)
  if (context === undefined) {
    throw new Error('useLayout must be used within a LayoutProvider')
  }
  return context
}
