/**
 * KeyboardShortcutsHelp Component
 * CRO-302: Keyboard Navigation & Accessibility (WCAG 2.1 AA)
 *
 * Modal dialog that displays all available keyboard shortcuts
 * Triggered by pressing '?' key
 */

'use client';

import { Fragment } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { X, Keyboard } from 'lucide-react';
import { useFocusTrap } from '@/hooks/useFocusTrap';
import { getShortcutDisplay, type KeyboardShortcut } from '@/hooks/useKeyboardShortcuts';

export interface KeyboardShortcutsHelpProps {
  isOpen: boolean;
  onClose: () => void;
  shortcuts: KeyboardShortcut[];
}

interface ShortcutCategory {
  title: string;
  shortcuts: KeyboardShortcut[];
}

export function KeyboardShortcutsHelp({
  isOpen,
  onClose,
  shortcuts,
}: KeyboardShortcutsHelpProps) {
  const trapRef = useFocusTrap<HTMLDivElement>(isOpen);

  // Group shortcuts by category (you can extend this with a category field)
  const categories: ShortcutCategory[] = [
    {
      title: 'General',
      shortcuts: shortcuts.filter((s) => s.description.includes('search') || s.description.includes('help')),
    },
    {
      title: 'Navigation',
      shortcuts: shortcuts.filter((s) =>
        s.description.includes('navigation') ||
        s.description.includes('pane') ||
        s.description.includes('Navigate')
      ),
    },
    {
      title: 'Actions',
      shortcuts: shortcuts.filter((s) =>
        !s.description.includes('search') &&
        !s.description.includes('help') &&
        !s.description.includes('navigation') &&
        !s.description.includes('pane') &&
        !s.description.includes('Navigate') &&
        !s.description.includes('Close')
      ),
    },
  ].filter((category) => category.shortcuts.length > 0);

  return (
    <Transition.Root show={isOpen} as={Fragment}>
      <Dialog
        as="div"
        className="relative z-50"
        onClose={onClose}
      >
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" />
        </Transition.Child>

        <div className="fixed inset-0 z-10 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
              enterTo="opacity-100 translate-y-0 sm:scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 translate-y-0 sm:scale-100"
              leaveTo="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
            >
              <Dialog.Panel
                ref={trapRef}
                className="relative transform overflow-hidden rounded-lg bg-white dark:bg-gray-800 px-4 pb-4 pt-5 text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-2xl sm:p-6"
                role="dialog"
                aria-modal="true"
                aria-labelledby="keyboard-shortcuts-title"
              >
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900">
                      <Keyboard className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                    </div>
                    <Dialog.Title
                      id="keyboard-shortcuts-title"
                      className="text-lg font-semibold text-gray-900 dark:text-gray-100"
                    >
                      Keyboard Shortcuts
                    </Dialog.Title>
                  </div>
                  <button
                    type="button"
                    onClick={onClose}
                    className="rounded-md text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    aria-label="Close keyboard shortcuts help"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                {/* Shortcuts List */}
                <div className="space-y-6">
                  {categories.map((category) => (
                    <div key={category.title}>
                      <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">
                        {category.title}
                      </h3>
                      <div className="space-y-2">
                        {category.shortcuts.map((shortcut, index) => (
                          <div
                            key={`${category.title}-${index}`}
                            className="flex items-center justify-between py-2 px-3 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700"
                          >
                            <span className="text-sm text-gray-700 dark:text-gray-300">
                              {shortcut.description}
                            </span>
                            <kbd className="inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded">
                              {getShortcutDisplay(shortcut)}
                            </kbd>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Footer */}
                <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Press <kbd className="px-1.5 py-0.5 text-xs font-semibold bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded">?</kbd> to open this help dialog anytime
                  </p>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition.Root>
  );
}
