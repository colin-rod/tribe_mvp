/**
 * RightPaneCollapsed Component
 *
 * Icon-only view for the right pane when collapsed.
 * Similar to the left navigation's collapsed state.
 */

'use client';

import { Plus, Sparkles, BarChart3 } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface RightPaneCollapsedProps {
  /** Current active section */
  activeSection?: 'actions' | 'stats' | 'suggestions';
  /** Callback when an icon is clicked */
  onIconClick?: (section: string) => void;
  /** Optional className for custom styling */
  className?: string;
}

export function RightPaneCollapsed({
  activeSection,
  onIconClick,
  className,
}: RightPaneCollapsedProps) {
  const sections = [
    {
      id: 'actions',
      label: 'Quick Actions',
      icon: Plus,
    },
    {
      id: 'stats',
      label: 'Digest Stats',
      icon: BarChart3,
    },
    {
      id: 'suggestions',
      label: 'AI Suggestions',
      icon: Sparkles,
    },
  ];

  return (
    <div className={cn('flex flex-col items-center py-4 space-y-2', className)}>
      {sections.map((section) => {
        const Icon = section.icon;
        const isActive = activeSection === section.id;

        return (
          <button
            key={section.id}
            onClick={() => onIconClick?.(section.id)}
            className={cn(
              'flex items-center justify-center w-12 h-12 rounded-lg',
              'transition-colors duration-200',
              'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2',
              isActive
                ? 'bg-primary-50 text-primary-600'
                : 'text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900'
            )}
            aria-label={section.label}
            title={section.label}
          >
            <Icon className="w-5 h-5" aria-hidden="true" />
          </button>
        );
      })}
    </div>
  );
}
