/**
 * useFocusTrap Hook
 * CRO-302: Keyboard Navigation & Accessibility (WCAG 2.1 AA)
 *
 * Traps focus within a container element (for modals, dialogs, etc.)
 * Ensures users can't tab outside of the focused element
 */

import { useEffect, useRef, useCallback } from 'react';

const FOCUSABLE_ELEMENTS = [
  'a[href]',
  'button:not([disabled])',
  'textarea:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

export function useFocusTrap<T extends HTMLElement = HTMLDivElement>(
  isActive = true
) {
  const containerRef = useRef<T>(null);

  const getFocusableElements = useCallback((): HTMLElement[] => {
    if (!containerRef.current) return [];

    const elements = containerRef.current.querySelectorAll<HTMLElement>(
      FOCUSABLE_ELEMENTS
    );

    return Array.from(elements).filter((el) => {
      // Filter out elements that are not visible or are disabled
      return (
        el.offsetParent !== null &&
        !el.hasAttribute('disabled') &&
        !el.getAttribute('aria-hidden')
      );
    });
  }, []);

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (!isActive || event.key !== 'Tab') return;

      const focusableElements = getFocusableElements();
      if (focusableElements.length === 0) return;

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];

      // Shift + Tab (moving backwards)
      if (event.shiftKey) {
        if (document.activeElement === firstElement) {
          event.preventDefault();
          lastElement.focus();
        }
      } else {
        // Tab (moving forward)
        if (document.activeElement === lastElement) {
          event.preventDefault();
          firstElement.focus();
        }
      }
    },
    [isActive, getFocusableElements]
  );

  useEffect(() => {
    if (!isActive) return;

    const container = containerRef.current;
    if (!container) return;

    // Store the previously focused element to restore later
    const previouslyFocusedElement = document.activeElement as HTMLElement;

    // Focus the first focusable element in the container
    const focusableElements = getFocusableElements();
    if (focusableElements.length > 0) {
      focusableElements[0].focus();
    }

    // Add event listener for Tab key
    document.addEventListener('keydown', handleKeyDown);

    // Cleanup: restore focus to previously focused element
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      if (previouslyFocusedElement && previouslyFocusedElement.focus) {
        previouslyFocusedElement.focus();
      }
    };
  }, [isActive, handleKeyDown, getFocusableElements]);

  return containerRef;
}
