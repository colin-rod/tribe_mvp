/**
 * QuickActionsPanel Component
 * CRO-298: Right Pane - Activity View Context
 *
 * Provides quick action buttons for the activity view:
 * - Create Update button (opens modal)
 * - Compile Digest button
 */

'use client';

import { Plus, Mail } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';

export interface QuickActionsPanelProps {
  /** Callback when Create Update is clicked */
  onCreateUpdate: () => void;
  /** Callback when Compile Digest is clicked */
  onCompileDigest: () => void;
  /** Optional className for custom styling */
  className?: string;
}

export function QuickActionsPanel({
  onCreateUpdate,
  onCompileDigest,
  className,
}: QuickActionsPanelProps) {
  const handleCreateClick = () => {
    console.log('[QuickActionsPanel] Create Update clicked', { onCreateUpdate: typeof onCreateUpdate });
    if (onCreateUpdate) {
      onCreateUpdate();
    } else {
      console.error('[QuickActionsPanel] onCreateUpdate is not defined');
    }
  };

  const handleDigestClick = () => {
    console.log('[QuickActionsPanel] Compile Digest clicked', { onCompileDigest: typeof onCompileDigest });
    if (onCompileDigest) {
      onCompileDigest();
    } else {
      console.error('[QuickActionsPanel] onCompileDigest is not defined');
    }
  };

  return (
    <div className={cn('space-y-3', className)}>
      <Button
        onClick={handleCreateClick}
        className="w-full justify-start gap-2"
        size="default"
      >
        <Plus className="h-4 w-4" />
        Create Update
      </Button>

      <Button
        onClick={handleDigestClick}
        variant="outline"
        className="w-full justify-start gap-2"
        size="default"
      >
        <Mail className="h-4 w-4" />
        Compile Digest
      </Button>
    </div>
  );
}
