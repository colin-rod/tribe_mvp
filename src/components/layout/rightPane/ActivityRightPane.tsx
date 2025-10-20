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
import Link from 'next/link';
import { CalendarDays, BellRing, ArrowRight } from 'lucide-react';
import { AISuggestionsPanel, AIPromptSuggestion } from './AISuggestionsPanel';
import { cn } from '@/lib/utils';
import { FiltersPanel } from './FiltersPanel';
import { useDashboardActions } from '@/contexts/DashboardActionsContext';
import { ReflectionPromptsPanel } from './ReflectionPromptsPanel';
import { SummaryNarrative } from './SummaryNarrative';


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
    <div className={cn('right-pane-section', className)}>
      {/* Filters (moved from main pane) */}
      {activityFilters && (
        <section className="space-y-3">
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
        </section>
      )}

      {/* Reflection inspiration */}
      <section className="sticky top-[64px] z-10 -mx-6 px-6 pb-4 pt-3 backdrop-blur bg-white/95 supports-[backdrop-filter]:bg-white/80 border-b border-neutral-200 shadow-[0_1px_0_rgba(15,23,42,0.08)] space-y-3">
        <h3 className="text-sm font-semibold text-neutral-900">This week&apos;s inspiration</h3>
        <ReflectionPromptsPanel onSelectPrompt={handleSelectPrompt} onCreateMemory={handleCreateMemory} className="shadow-none" />
      </section>

      {/* Narrative summary recap */}
      <section className="space-y-3">
        <SummaryNarrative />
      </section>

      {/* Reflection schedule */}
      <section className="space-y-3">
        <h3 className="text-sm font-semibold text-neutral-900">Reflection schedule</h3>
        <div className="right-pane-card right-pane-card--bordered space-y-4">
          <p className="text-sm text-neutral-600">
            Build a rhythm for capturing stories so you can batch and share them with ease.
          </p>
          <div className="space-y-2">
            <Link
              href="/dashboard/settings?tab=notifications"
              className="flex items-center justify-between rounded-lg border border-neutral-200 px-3 py-2 text-sm text-neutral-700 transition hover:border-purple-300 hover:bg-purple-50/60"
            >
              <span className="flex items-center gap-2">
                <BellRing className="h-4 w-4 text-purple-500" />
                Adjust reminder nudges
              </span>
              <ArrowRight className="h-4 w-4 text-neutral-300" />
            </Link>
            <Link
              href="/dashboard/digests"
              className="flex items-center justify-between rounded-lg border border-neutral-200 px-3 py-2 text-sm text-neutral-700 transition hover:border-purple-300 hover:bg-purple-50/60"
            >
              <span className="flex items-center gap-2">
                <CalendarDays className="h-4 w-4 text-purple-500" />
                Set digest cadence
              </span>
              <ArrowRight className="h-4 w-4 text-neutral-300" />
            </Link>
          </div>
        </div>
      </section>

      {/* AI Suggestions Panel */}
      <section className="space-y-3">
        <AISuggestionsPanel onSelectPrompt={handleSelectPrompt} />
      </section>
    </div>
  );
};

// Export memoized component to prevent unnecessary re-renders
export const ActivityRightPane = memo(ActivityRightPaneComponent);
