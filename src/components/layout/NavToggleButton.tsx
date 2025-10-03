/**
 * NavToggleButton Component
 * CRO-294: Left Navigation Panel - Structure & Toggle
 *
 * Toggle button for collapsing/expanding the left navigation panel
 */

'use client';

import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
import { cn } from '@/lib/utils';

interface NavToggleButtonProps {
  isCollapsed: boolean;
  onToggle: () => void;
}

export function NavToggleButton({ isCollapsed, onToggle }: NavToggleButtonProps) {
  return (
    <button
      onClick={onToggle}
      className={cn(
        'flex items-center justify-center w-full h-12 border-t border-neutral-200',
        'hover:bg-neutral-100 transition-colors focus:outline-none focus:ring-2',
        'focus:ring-primary-500 focus:ring-inset'
      )}
      aria-label={isCollapsed ? 'Expand navigation' : 'Collapse navigation'}
      aria-expanded={!isCollapsed}
    >
      {isCollapsed ? (
        <ChevronRightIcon className="w-5 h-5 text-neutral-600" aria-hidden="true" />
      ) : (
        <ChevronLeftIcon className="w-5 h-5 text-neutral-600" aria-hidden="true" />
      )}
    </button>
  );
}
