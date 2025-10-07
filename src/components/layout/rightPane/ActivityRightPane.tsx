/**
 * ActivityRightPane Component
 * CRO-298: Right Pane - Activity View Context
 * CRO-303: Performance Optimization & Code Splitting
 *
 * Main right pane content for the Activity view, integrating:
 * - Digest System stats
 * - AI suggestions panel
 * - Quick actions (Create Update, Compile Digest)
 *
 * Performance optimizations:
 * - React.memo to prevent unnecessary re-renders
 * - useCallback for event handlers
 */

'use client';

import { useCallback, memo } from 'react';
import dynamic from 'next/dynamic';
import { AISuggestionsPanel, AIPromptSuggestion } from './AISuggestionsPanel';
import { QuickActionsPanel } from './QuickActionsPanel';
import { cn } from '@/lib/utils';
import { FiltersPanel } from './FiltersPanel';
import { useDashboardActions } from '@/contexts/DashboardActionsContext';

// Lazy load DigestStats component
const DigestStats = dynamic(() => import('@/components/digests/DigestStats'), {
  loading: () => <div className="h-40 bg-neutral-100 animate-pulse rounded-lg" />,
});

export interface ActivityRightPaneProps {
  /** Callback when Create Update is clicked */
  onCreateUpdate?: () => void;
  /** Callback when Compile Digest is clicked */
  onCompileDigest?: () => void;
  /** Callback when an AI prompt is selected */
  onSelectAIPrompt?: (prompt: AIPromptSuggestion) => void;
  /** Optional className for custom styling */
  className?: string;
}

/**
 * Right pane content for Activity feed view
 * Provides contextual AI suggestions and quick actions
 */
const ActivityRightPaneComponent = ({
  onCreateUpdate,
  onCompileDigest,
  onSelectAIPrompt,
  className,
}: ActivityRightPaneProps) => {
  const { activityFilters } = useDashboardActions();

  // Handle Create Update action
  const handleCreateUpdate = useCallback(() => {
    if (onCreateUpdate) {
      onCreateUpdate();
    }
  }, [onCreateUpdate]);

  // Handle Compile Digest action
  const handleCompileDigest = useCallback(() => {
    if (onCompileDigest) {
      onCompileDigest();
    }
  }, [onCompileDigest]);

  // Handle AI prompt selection
  const handleSelectPrompt = useCallback(
    (prompt: AIPromptSuggestion) => {
      if (onSelectAIPrompt) {
        onSelectAIPrompt(prompt);
      } else {
        // Default behavior: Open create update modal with prompt
        handleCreateUpdate();
      }
    },
    [onSelectAIPrompt, handleCreateUpdate]
  );

  return (
    <div className={cn('p-4 space-y-4', className)}>
      {/* Filters (moved from main pane) */}
      {activityFilters && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-neutral-900">Filters</h3>
          <FiltersPanel
            searchQuery={activityFilters.filters.searchQuery}
            dateRange={activityFilters.filters.dateRange}
            childIds={activityFilters.filters.childIds}
            updateTypes={activityFilters.filters.updateTypes as ('text' | 'photo' | 'milestone' | 'video')[]}
            onSearchChange={activityFilters.setSearchQuery}
            onDateRangeChange={activityFilters.setDateRange}
            onChildIdsChange={activityFilters.setChildIds}
            onUpdateTypesChange={activityFilters.setUpdateTypes as (types: ('text' | 'photo' | 'milestone' | 'video')[]) => void}
            onClearFilters={activityFilters.clearFilters}
            activeFilterCount={activityFilters.activeFilterCount}
          />
        </div>
      )}

      {/* Quick Actions - sticky within pane (below pane header) */}
      <div className="sticky top-[36px] z-10 bg-white/95 backdrop-blur pb-2">
        <h3 className="text-sm font-semibold text-neutral-900 mb-2">Quick Actions</h3>
        <QuickActionsPanel
          onCreateUpdate={handleCreateUpdate}
          onCompileDigest={handleCompileDigest}
          className="border border-neutral-200 rounded-md p-3"
        />
      </div>

      {/* Digest System Stats */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-neutral-900">Digest Overview</h3>
        <div className="border border-neutral-200 rounded-md p-3">
          <DigestStats />
        </div>
      </div>

      {/* AI Suggestions Panel */}
      <div className="space-y-3">
        <AISuggestionsPanel onSelectPrompt={handleSelectPrompt} className="border border-neutral-200" />
      </div>
    </div>
  );
};

// Export memoized component to prevent unnecessary re-renders
export const ActivityRightPane = memo(ActivityRightPaneComponent);
