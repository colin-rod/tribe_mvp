/**
 * DashboardActionsContext
 *
 * Provides shared actions across dashboard components, particularly for
 * coordinating between views and the right pane.
 */

'use client';

import { createContext, useContext, ReactNode } from 'react';
import type { UpdateType } from '@/hooks/useActivityFilters';

export interface DashboardActionsContextType {
  /** Open the create memory modal with optional type and initial content */
  onCreateUpdate?: (type?: UpdateType, initialContent?: string) => void;
  /** Navigate to summary compilation */
  onCompileDigest?: () => void;
  /** Optional activity filters for right pane */
  activityFilters?: {
    filters: {
      searchQuery: string
      dateRange: { start: Date; end: Date } | null
      childIds: string[]
      updateTypes: ('photo' | 'video' | 'text' | 'milestone')[]
    }
    setDateRange: (range: { start: Date; end: Date } | null) => void
    setChildIds: (ids: string[]) => void
    setUpdateTypes: (types: ('photo' | 'video' | 'text' | 'milestone')[]) => void
    setSearchQuery: (query: string) => void
    clearFilters: () => void
    activeFilterCount: number
  }
}

const DashboardActionsContext = createContext<DashboardActionsContextType | undefined>(undefined);

export interface DashboardActionsProviderProps {
  children: ReactNode;
  value: DashboardActionsContextType;
}

export function DashboardActionsProvider({ children, value }: DashboardActionsProviderProps) {
  return (
    <DashboardActionsContext.Provider value={value}>
      {children}
    </DashboardActionsContext.Provider>
  );
}

export function useDashboardActions() {
  const context = useContext(DashboardActionsContext);
  if (context === undefined) {
    // Return empty object if not in a DashboardActionsProvider
    // This allows components to work without the provider
    return {};
  }
  return context;
}
