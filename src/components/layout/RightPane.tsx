/**
 * RightPane Component
 * CRO-297: Right Pane - Base Structure & Collapse
 *
 * Collapsible right sidebar panel with:
 * - Fixed width (320px) when expanded
 * - Collapsed width (0px) hidden state
 * - Smooth transitions
 * - localStorage persistence
 * - Keyboard shortcut (⌘. / Ctrl+.)
 * - Context-aware content display
 */

'use client';

import { useEffect, useRef, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { useLayout } from '@/contexts/LayoutContext';
import { LAYOUT_DIMENSIONS } from '@/types/layout';
import { RightPaneCollapsed } from './rightPane/RightPaneCollapsed';
import { ChevronLeftIcon, ChevronRightIcon } from 'lucide-react';
import { useNavigation } from '@/contexts/NavigationContext';

export interface RightPaneProps {
  /** Content to display in the right pane */
  children?: React.ReactNode;
  /** Optional className for custom styling */
  className?: string;
}

export function RightPane({ children, className }: RightPaneProps) {
  const { rightPaneCollapsed, toggleRightPane } = useLayout();
  const paneRef = useRef<HTMLElement>(null);
  const { activeItemId } = useNavigation?.() || { activeItemId: undefined } as { activeItemId: string | undefined };

  const titleMap: Record<string, string> = {
    activity: 'Tools & Insights',
    digests: 'Summary Tools',
    children: 'Child Tools',
    recipients: 'Recipient Tools',
    groups: 'Group Tools',
    drafts: 'Draft Tools',
    settings: 'Settings'
  };
  const paneTitle = activeItemId ? (titleMap[activeItemId] || 'Tools') : 'Tools';

  // Keyboard shortcut: ⌘. / Ctrl+.
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Check for ⌘. on Mac or Ctrl+. on Windows/Linux
      if ((event.metaKey || event.ctrlKey) && event.key === '.') {
        event.preventDefault();
        toggleRightPane();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [toggleRightPane]);

  // Focus management for accessibility
  const handleToggle = useCallback(() => {
    toggleRightPane();

    // After expanding, focus the first interactive element
    if (rightPaneCollapsed && paneRef.current) {
      setTimeout(() => {
        const firstFocusable = paneRef.current?.querySelector<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        firstFocusable?.focus();
      }, 250); // Wait for animation to complete
    }
  }, [toggleRightPane, rightPaneCollapsed]);

  return (
    <aside
      ref={paneRef}
      className={cn(
        'relative bg-white flex flex-col border-l border-neutral-200',
        'transition-all duration-200 ease-out',
        className
      )}
      style={{
        width: rightPaneCollapsed
          ? LAYOUT_DIMENSIONS.RIGHT_PANE_COLLAPSED_WIDTH
          : LAYOUT_DIMENSIONS.RIGHT_PANE_WIDTH,
      }}
      aria-label="Right sidebar"
    >
      {rightPaneCollapsed ? (
        <>
          {/* Collapsed (icon-only) view */}
          <div className="flex-1 overflow-y-auto">
            <RightPaneCollapsed
              onIconClick={(_section) => {
                // When an icon is clicked in collapsed mode, expand the pane
                toggleRightPane();
              }}
            />
          </div>

          {/* Toggle Button - Fixed at bottom */}
          <div className="border-t border-neutral-200">
            <button
              onClick={handleToggle}
              className={cn(
                'flex items-center justify-center w-full h-12',
                'hover:bg-neutral-100 transition-colors focus:outline-none focus:ring-2',
                'focus:ring-primary-500 focus:ring-inset'
              )}
              aria-label="Expand right pane"
            >
              <ChevronLeftIcon className="w-5 h-5 text-neutral-600" aria-hidden="true" />
            </button>
          </div>
        </>
      ) : (
        <>
          {/* Expanded (full content) view */}
          <div className="flex-1 overflow-y-auto">
            {/* Sticky header inside pane */}
            <div className="sticky top-0 z-20 border-b border-neutral-200 bg-white/95 backdrop-blur transition-shadow supports-[backdrop-filter]:bg-white/80 shadow-[0_1px_0_rgba(15,23,42,0.08)]">
              <div className="px-6 py-3">
                <h2 className="text-sm font-semibold tracking-tight text-neutral-900">{paneTitle}</h2>
              </div>
            </div>
            {children || (
              <div className="flex items-center justify-center h-full p-8 text-center text-neutral-500">
                <p className="text-sm">
                  Context-aware tools and filters will appear here
                </p>
              </div>
            )}
          </div>

          {/* Toggle Button - Fixed at bottom */}
          <div className="border-t border-neutral-200">
            <button
              onClick={handleToggle}
              className={cn(
                'flex items-center justify-center w-full h-12',
                'hover:bg-neutral-100 transition-colors focus:outline-none focus:ring-2',
                'focus:ring-primary-500 focus:ring-inset'
              )}
              aria-label="Collapse right pane"
              aria-expanded={!rightPaneCollapsed}
            >
              <ChevronRightIcon className="w-5 h-5 text-neutral-600" aria-hidden="true" />
            </button>
          </div>
        </>
      )}
    </aside>
  );
}
