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
    console.log('[ActivityRightPane] handleCreateUpdate called', { onCreateUpdate: typeof onCreateUpdate });
    if (onCreateUpdate) {
      onCreateUpdate();
    } else {
      console.warn('[ActivityRightPane] onCreateUpdate prop not provided');
    }
    // Default behavior would be to navigate or open modal
  }, [onCreateUpdate]);

  // Handle Compile Digest action
  const handleCompileDigest = useCallback(() => {
    console.log('[ActivityRightPane] handleCompileDigest called', { onCompileDigest: typeof onCompileDigest });
    if (onCompileDigest) {
      onCompileDigest();
    } else {
      console.warn('[ActivityRightPane] onCompileDigest prop not provided');
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
      {/* Quick Actions - sticky within pane */}
      <div className="sticky top-0 z-10 bg-white/95 backdrop-blur pb-2">
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
