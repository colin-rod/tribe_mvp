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
import { RightPaneToggle } from './RightPaneToggle';

export interface RightPaneProps {
  /** Content to display in the right pane */
  children?: React.ReactNode;
  /** Optional className for custom styling */
  className?: string;
}

export function RightPane({ children, className }: RightPaneProps) {
  const { rightPaneCollapsed, toggleRightPane } = useLayout();
  const paneRef = useRef<HTMLElement>(null);

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
        'relative bg-white',
        'transition-all duration-200 ease-out',
        !rightPaneCollapsed && 'border-l border-neutral-200 overflow-hidden',
        className
      )}
      style={{
        width: rightPaneCollapsed ? 0 : LAYOUT_DIMENSIONS.RIGHT_PANE_WIDTH,
      }}
      aria-label="Right sidebar"
      aria-hidden={rightPaneCollapsed}
    >
      {/* Toggle Button - always visible, positioned on left edge when expanded or floating when collapsed */}
      <div
        className={cn(
          'absolute top-1/2 -translate-y-1/2 z-10',
          rightPaneCollapsed ? '-left-6' : '-left-3'
        )}
      >
        <RightPaneToggle
          isCollapsed={rightPaneCollapsed}
          onToggle={handleToggle}
        />
      </div>

      {/* Content - only render when expanded to improve performance */}
      {!rightPaneCollapsed && (
        <div className="h-full overflow-y-auto">
          {children || (
            <div className="flex items-center justify-center h-full p-8 text-center text-neutral-500">
              <p className="text-sm">
                Context-aware tools and filters will appear here
              </p>
            </div>
          )}
        </div>
      )}
    </aside>
  );
}
