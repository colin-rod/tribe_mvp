/**
 * DashboardActionsContext
 *
 * Provides shared actions across dashboard components, particularly for
 * coordinating between views and the right pane.
 */

'use client';

import { createContext, useContext, ReactNode } from 'react';
import type { UpdateType } from '@/components/updates/CreateUpdateModal';

export interface DashboardActionsContextType {
  /** Open the create update modal with optional type */
  onCreateUpdate?: (type?: UpdateType) => void;
  /** Navigate to digest compilation */
  onCompileDigest?: () => void;
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
