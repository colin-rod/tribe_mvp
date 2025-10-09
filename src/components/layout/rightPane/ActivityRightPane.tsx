/**
 * ActivityRightPane Component
 * CRO-298: Right Pane - Activity View Context
 * CRO-303: Performance Optimization & Code Splitting
 *
 * Main right pane content for the Activity view, integrating:
 * - Summary System stats
 * - AI suggestions panel
 * - Quick actions (Create Memory, Compile Summary)
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

// Lazy load SummaryStats component
const SummaryStats = dynamic(() => import('@/components/summaries/SummaryStats'), {
  loading: () => <div className="h-40 bg-neutral-100 animate-pulse rounded-lg" />,
});

export interface ActivityRightPaneProps {
  /** Callback when Create Memory is clicked */
  onCreateMemory?: () => void;
  /** Callback when Compile Summary is clicked */
  onCompileSummary?: () => void;
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
  onCreateMemory,
  onCompileSummary,
  onSelectAIPrompt,
  className,
}: ActivityRightPaneProps) => {
  const { activityFilters } = useDashboardActions();

  // Handle Create Memory action
  const handleCreateMemory = useCallback(() => {
    if (onCreateMemory) {
      onCreateMemory();
    }
  }, [onCreateMemory]);

  // Handle Compile Summary action
  const handleCompileSummary = useCallback(() => {
    if (onCompileSummary) {
      onCompileSummary();
    }
  }, [onCompileSummary]);

  // Handle AI prompt selection
  const handleSelectPrompt = useCallback(
    (prompt: AIPromptSuggestion) => {
      if (onSelectAIPrompt) {
        onSelectAIPrompt(prompt);
      } else {
        // Default behavior: Open create memory modal with prompt
        handleCreateMemory();
      }
    },
    [onSelectAIPrompt, handleCreateMemory]
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
            memoryTypes={activityFilters.filters.updateTypes as ('text' | 'photo' | 'milestone' | 'video')[]}
            onSearchChange={activityFilters.setSearchQuery}
            onDateRangeChange={activityFilters.setDateRange}
            onChildIdsChange={activityFilters.setChildIds}
            onMemoryTypesChange={activityFilters.setUpdateTypes as (types: ('text' | 'photo' | 'milestone' | 'video')[]) => void}
            onClearFilters={activityFilters.clearFilters}
            activeFilterCount={activityFilters.activeFilterCount}
          />
        </div>
      )}

      {/* Quick Actions - sticky within pane (below pane header) */}
      <div className="sticky top-[36px] z-10 bg-white/95 backdrop-blur pb-2">
        <h3 className="text-sm font-semibold text-neutral-900 mb-2">Quick Actions</h3>
        <QuickActionsPanel
          onCreateMemory={handleCreateMemory}
          onCompileSummary={handleCompileSummary}
          className="border border-neutral-200 rounded-md p-3"
        />
      </div>

      {/* Summary System Stats */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-neutral-900">Summary Overview</h3>
        <div className="border border-neutral-200 rounded-md p-3">
          <SummaryStats />
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
