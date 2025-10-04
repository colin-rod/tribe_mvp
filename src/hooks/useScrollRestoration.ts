/**
 * useScrollRestoration Hook
 * CRO-296: Middle Pane - Content Router
 *
 * Manages scroll position caching and restoration across view changes
 */

import { useEffect, useRef } from 'react';

interface ScrollPosition {
  x: number;
  y: number;
}

interface UseScrollRestorationOptions {
  /** Unique key for the current view (e.g., 'activity', 'digests') */
  viewKey: string;
  /** Whether to enable scroll restoration (default: true) */
  enabled?: boolean;
  /** Scroll container element (default: window) */
  scrollContainer?: HTMLElement | null;
}

/**
 * Hook to manage scroll position restoration across view changes
 *
 * @example
 * ```tsx
 * function ActivityFeedView() {
 *   const scrollContainerRef = useRef<HTMLDivElement>(null);
 *
 *   useScrollRestoration({
 *     viewKey: 'activity',
 *     scrollContainer: scrollContainerRef.current
 *   });
 *
 *   return <div ref={scrollContainerRef}>...</div>;
 * }
 * ```
 */
export function useScrollRestoration({
  viewKey,
  enabled = true,
  scrollContainer,
}: UseScrollRestorationOptions) {
  const scrollPositions = useRef<Map<string, ScrollPosition>>(new Map());
  const isRestoringRef = useRef(false);

  useEffect(() => {
    if (!enabled) return;

    const container = scrollContainer || window;
    const isWindow = container === window;

    // Get current scroll position
    const getCurrentScrollPosition = (): ScrollPosition => {
      if (isWindow) {
        return {
          x: window.scrollX || window.pageXOffset,
          y: window.scrollY || window.pageYOffset,
        };
      } else {
        const element = container as HTMLElement;
        return {
          x: element.scrollLeft,
          y: element.scrollTop,
        };
      }
    };

    // Set scroll position
    const setScrollPosition = (position: ScrollPosition) => {
      isRestoringRef.current = true;

      if (isWindow) {
        window.scrollTo(position.x, position.y);
      } else {
        const element = container as HTMLElement;
        element.scrollLeft = position.x;
        element.scrollTop = position.y;
      }

      // Reset flag after scroll completes
      requestAnimationFrame(() => {
        isRestoringRef.current = false;
      });
    };

    // Restore scroll position for this view
    const savedPosition = scrollPositions.current.get(viewKey);
    if (savedPosition) {
      // Use setTimeout to ensure DOM is ready
      setTimeout(() => {
        setScrollPosition(savedPosition);
      }, 0);
    }

    // Save scroll position on scroll events
    const handleScroll = () => {
      // Don't save position while we're restoring
      if (isRestoringRef.current) return;

      const position = getCurrentScrollPosition();
      scrollPositions.current.set(viewKey, position);
    };

    // Attach scroll listener
    container.addEventListener('scroll', handleScroll, { passive: true });

    // Cleanup: save final position and remove listener
    const scrollPositionsRef = scrollPositions.current;
    return () => {
      container.removeEventListener('scroll', handleScroll);
      const position = getCurrentScrollPosition();
      scrollPositionsRef.set(viewKey, position);
    };
  }, [viewKey, enabled, scrollContainer]);

  // Return method to manually clear scroll positions
  const clearScrollPosition = (key?: string) => {
    if (key) {
      scrollPositions.current.delete(key);
    } else {
      scrollPositions.current.clear();
    }
  };

  return { clearScrollPosition };
}
