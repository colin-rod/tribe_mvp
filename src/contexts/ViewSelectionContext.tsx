'use client'

import React, { createContext, useContext, useState, ReactNode } from 'react'

interface ViewSelectionContextType {
  selectedId: string | null
  setSelectedId: (id: string | null) => void
  clearSelection: () => void
}

const ViewSelectionContext = createContext<ViewSelectionContextType | undefined>(undefined)

interface ViewSelectionProviderProps {
  children: ReactNode
}

export function ViewSelectionProvider({ children }: ViewSelectionProviderProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const clearSelection = () => setSelectedId(null)

  return (
    <ViewSelectionContext.Provider value={{ selectedId, setSelectedId, clearSelection }}>
      {children}
    </ViewSelectionContext.Provider>
  )
}

export function useViewSelection() {
  const context = useContext(ViewSelectionContext)
  if (context === undefined) {
    throw new Error('useViewSelection must be used within a ViewSelectionProvider')
  }
  return context
}
