/**
 * QuickActionsPanel Component
 * CRO-298: Right Pane - Activity View Context
 * Updated for Memory Book Experience
 *
 * Provides quick action buttons for the activity view:
 * - Create Memory button (opens modal)
 * - Compile Summary button
 */

'use client';

import { Plus, Mail } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';

export interface QuickActionsPanelProps {
  /** Callback when Create Memory is clicked */
  onCreateUpdate: () => void;  // Keep prop name for backward compatibility
  /** Callback when Compile Summary is clicked */
  onCompileDigest: () => void;  // Keep prop name for backward compatibility
  /** Optional className for custom styling */
  className?: string;
}

export function QuickActionsPanel({
  onCreateUpdate,
  onCompileDigest,
  className,
}: QuickActionsPanelProps) {
  return (
    <div className={cn('space-y-3', className)}>
      <Button
        onClick={onCreateUpdate}
        className="w-full justify-start gap-2"
        size="default"
      >
        <Plus className="h-4 w-4" />
        Create Memory
      </Button>

      <Button
        onClick={onCompileDigest}
        variant="outline"
        className="w-full justify-start gap-2"
        size="default"
      >
        <Mail className="h-4 w-4" />
        Compile Summary
      </Button>
    </div>
  );
}
