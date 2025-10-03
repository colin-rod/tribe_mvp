/**
 * useKeyboardShortcuts Hook
 * CRO-302: Keyboard Navigation & Accessibility (WCAG 2.1 AA)
 *
 * Global keyboard shortcuts management for the application
 */

import { useEffect, useCallback } from 'react';

export interface KeyboardShortcut {
  key: string;
  ctrlKey?: boolean;
  metaKey?: boolean;
  shiftKey?: boolean;
  altKey?: boolean;
  description: string;
  action: () => void;
  enabled?: boolean;
}

interface UseKeyboardShortcutsOptions {
  shortcuts: KeyboardShortcut[];
  enabled?: boolean;
}

/**
 * Hook to register global keyboard shortcuts
 *
 * @example
 * ```tsx
 * useKeyboardShortcuts({
 *   shortcuts: [
 *     {
 *       key: 'k',
 *       metaKey: true,
 *       description: 'Open search',
 *       action: () => setSearchOpen(true)
 *     }
 *   ]
 * });
 * ```
 */
export function useKeyboardShortcuts({
  shortcuts,
  enabled = true,
}: UseKeyboardShortcutsOptions) {
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (!enabled) return;

      // Don't trigger shortcuts when typing in input fields
      const target = event.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        // Exception: Allow Escape to work in input fields
        if (event.key !== 'Escape') {
          return;
        }
      }

      // Find matching shortcut
      const matchingShortcut = shortcuts.find((shortcut) => {
        if (shortcut.enabled === false) return false;

        const keyMatch = event.key.toLowerCase() === shortcut.key.toLowerCase();
        const ctrlMatch = !!shortcut.ctrlKey === event.ctrlKey;
        const metaMatch = !!shortcut.metaKey === event.metaKey;
        const shiftMatch = !!shortcut.shiftKey === event.shiftKey;
        const altMatch = !!shortcut.altKey === event.altKey;

        return keyMatch && ctrlMatch && metaMatch && shiftMatch && altMatch;
      });

      if (matchingShortcut) {
        event.preventDefault();
        matchingShortcut.action();
      }
    },
    [enabled, shortcuts]
  );

  useEffect(() => {
    if (!enabled) return;

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [enabled, handleKeyDown]);
}

/**
 * Get the display string for a keyboard shortcut
 */
export function getShortcutDisplay(shortcut: KeyboardShortcut): string {
  const parts: string[] = [];

  // Detect macOS
  const isMac =
    typeof window !== 'undefined' &&
    /Mac|iPhone|iPod|iPad/i.test(navigator.platform);

  if (shortcut.ctrlKey) {
    parts.push(isMac ? '⌃' : 'Ctrl');
  }

  if (shortcut.metaKey) {
    parts.push(isMac ? '⌘' : 'Ctrl');
  }

  if (shortcut.shiftKey) {
    parts.push(isMac ? '⇧' : 'Shift');
  }

  if (shortcut.altKey) {
    parts.push(isMac ? '⌥' : 'Alt');
  }

  // Capitalize single letter keys
  const keyDisplay =
    shortcut.key.length === 1 ? shortcut.key.toUpperCase() : shortcut.key;
  parts.push(keyDisplay);

  return parts.join(isMac ? '' : '+');
}
