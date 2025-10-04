/**
 * RightPaneToggle Component
 * CRO-297: Right Pane - Base Structure & Collapse
 *
 * Toggle button for the right pane with:
 * - Positioned on left edge of right pane
 * - Accessible design with proper ARIA labels
 * - Hover and focus states
 * - Visual feedback for collapsed/expanded state
 */

'use client';

import { ChevronLeftIcon, ChevronRightIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface RightPaneToggleProps {
  /** Whether the right pane is collapsed */
  isCollapsed: boolean;
  /** Handler for toggle action */
  onToggle: () => void;
  /** Optional className for custom styling */
  className?: string;
}

export function RightPaneToggle({
  isCollapsed,
  onToggle,
  className,
}: RightPaneToggleProps) {
  return (
    <button
      onClick={onToggle}
      className={cn(
        // Size and shape
        'w-6 h-12 rounded-full',
        // Colors and borders
        'bg-white border border-neutral-200 shadow-sm',
        // Interactive states
        'hover:bg-neutral-50 hover:border-neutral-300 hover:shadow',
        'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2',
        'active:bg-neutral-100',
        // Transitions
        'transition-all duration-200',
        // Custom styles
        className
      )}
      aria-label={isCollapsed ? 'Expand right pane' : 'Collapse right pane'}
      aria-expanded={!isCollapsed}
      type="button"
    >
      <span className="flex items-center justify-center w-full h-full">
        {isCollapsed ? (
          <ChevronLeftIcon className="w-3 h-3 text-neutral-600" aria-hidden="true" />
        ) : (
          <ChevronRightIcon className="w-3 h-3 text-neutral-600" aria-hidden="true" />
        )}
      </span>
    </button>
  );
}
