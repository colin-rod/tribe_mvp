/**
 * ActivityRightPane Component
 * CRO-298: Right Pane - Activity View Context
 * CRO-303: Performance Optimization & Code Splitting
 *
 * Main right pane content for the Activity view, integrating:
 * - AI suggestions panel
 * - Quick actions (Create Update, Compile Digest)
 *
 * Performance optimizations:
 * - React.memo to prevent unnecessary re-renders
 * - useCallback for event handlers
 */

'use client';

import { useCallback, memo } from 'react';
import { AISuggestionsPanel, AIPromptSuggestion } from './AISuggestionsPanel';
import { QuickActionsPanel } from './QuickActionsPanel';
import { cn } from '@/lib/utils';

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
    <div
      className={cn('h-full flex flex-col bg-white overflow-y-auto', className)}
    >
      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* AI Suggestions Panel */}
        <AISuggestionsPanel onSelectPrompt={handleSelectPrompt} />
      </div>

      {/* Quick Actions Panel - Fixed at bottom */}
      <QuickActionsPanel
        onCreateUpdate={handleCreateUpdate}
        onCompileDigest={handleCompileDigest}
      />
    </div>
  );
};

// Export memoized component to prevent unnecessary re-renders
export const ActivityRightPane = memo(ActivityRightPaneComponent);
