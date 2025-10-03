/**
 * KeyboardShortcutsProvider Component
 * CRO-302: Keyboard Navigation & Accessibility (WCAG 2.1 AA)
 *
 * Global provider for keyboard shortcuts across the application
 */

'use client';

import { useState, useCallback, createContext, useContext } from 'react';
import { useKeyboardShortcuts, type KeyboardShortcut } from '@/hooks/useKeyboardShortcuts';
import { KeyboardShortcutsHelp } from './KeyboardShortcutsHelp';
import { useLayout } from '@/contexts/LayoutContext';

interface KeyboardShortcutsContextValue {
  openShortcutsHelp: () => void;
  openSearch: () => void;
  setSearchOpen: (open: boolean) => void;
}

const KeyboardShortcutsContext = createContext<KeyboardShortcutsContextValue | undefined>(
  undefined
);

export function useGlobalKeyboardShortcuts() {
  const context = useContext(KeyboardShortcutsContext);
  if (!context) {
    throw new Error(
      'useGlobalKeyboardShortcuts must be used within KeyboardShortcutsProvider'
    );
  }
  return context;
}

export interface KeyboardShortcutsProviderProps {
  children: React.ReactNode;
}

export function KeyboardShortcutsProvider({ children }: KeyboardShortcutsProviderProps) {
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const { toggleLeftNav, toggleRightPane } = useLayout();

  const openShortcutsHelp = useCallback(() => {
    setIsHelpOpen(true);
  }, []);

  const openSearch = useCallback(() => {
    setIsSearchOpen(true);
  }, []);

  const setSearchOpen = useCallback((open: boolean) => {
    setIsSearchOpen(open);
  }, []);

  const shortcuts: KeyboardShortcut[] = [
    {
      key: 'k',
      metaKey: true,
      description: 'Open global search',
      action: openSearch,
    },
    {
      key: 'b',
      metaKey: true,
      description: 'Toggle left navigation',
      action: toggleLeftNav,
    },
    {
      key: '.',
      metaKey: true,
      description: 'Toggle right pane',
      action: toggleRightPane,
    },
    {
      key: '?',
      shiftKey: true,
      description: 'Show keyboard shortcuts help',
      action: openShortcutsHelp,
    },
    {
      key: 'Escape',
      description: 'Close modals and dialogs',
      action: () => {
        setIsHelpOpen(false);
        setIsSearchOpen(false);
      },
    },
  ];

  useKeyboardShortcuts({ shortcuts });

  const contextValue: KeyboardShortcutsContextValue = {
    openShortcutsHelp,
    openSearch,
    setSearchOpen,
  };

  return (
    <KeyboardShortcutsContext.Provider value={contextValue}>
      {children}
      <KeyboardShortcutsHelp
        isOpen={isHelpOpen}
        onClose={() => setIsHelpOpen(false)}
        shortcuts={shortcuts}
      />
    </KeyboardShortcutsContext.Provider>
  );
}
