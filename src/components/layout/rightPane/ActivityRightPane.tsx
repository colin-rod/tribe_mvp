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
  // Handle Create Update action
  const handleCreateUpdate = useCallback(() => {
    if (onCreateUpdate) {
      onCreateUpdate();
    }
    // Default behavior would be to navigate or open modal
  }, [onCreateUpdate]);

  // Handle Compile Digest action
  const handleCompileDigest = useCallback(() => {
    if (onCompileDigest) {
      onCompileDigest();
    }
    // Default behavior would be to navigate to digest compilation
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
      {/* Quick Actions Panel - Moved to top as a section */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-neutral-900">Quick Actions</h3>
        <QuickActionsPanel
          onCreateUpdate={handleCreateUpdate}
          onCompileDigest={handleCompileDigest}
          className="border-0 p-0"
        />
      </div>

      {/* Digest System Stats */}
      <DigestStats />

      {/* AI Suggestions Panel */}
      <AISuggestionsPanel onSelectPrompt={handleSelectPrompt} />
    </div>
  );
};

// Export memoized component to prevent unnecessary re-renders
export const ActivityRightPane = memo(ActivityRightPaneComponent);
