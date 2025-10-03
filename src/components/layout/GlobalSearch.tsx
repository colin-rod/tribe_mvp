/**
 * GlobalSearch Component
 * CRO-300: Search Functionality in Top Bar
 *
 * Command palette-style global search with keyboard shortcuts (⌘K / Ctrl+K)
 */

'use client';

import { Fragment, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Dialog, Transition, Combobox } from '@headlessui/react';
import { Search } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useGlobalSearch } from '@/hooks/useGlobalSearch';
import { SearchResults } from './SearchResults';
import { SearchableItem } from '@/lib/search/fuseConfig';
import { getCachedSearchableContent } from '@/lib/search/fetchSearchableContent';

export function GlobalSearch() {
  const router = useRouter();
  const { user } = useAuth();
  const [searchableItems, setSearchableItems] = useState<SearchableItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const {
    query,
    setQuery,
    isOpen,
    setIsOpen,
    groupedResults,
    recentSearches,
    handleSelectResult,
    handleRecentSearchClick,
    hasResults,
  } = useGlobalSearch({
    searchableItems,
    onSelect: (item) => {
      router.push(item.url);
    },
  });

  // Fetch searchable items when search opens
  useEffect(() => {
    if (isOpen && user?.id && searchableItems.length === 0) {
      setIsLoading(true);
      getCachedSearchableContent(user.id)
        .then((items) => {
          setSearchableItems(items);
        })
        .catch((error) => {
          // eslint-disable-next-line no-console
          console.error('Failed to load searchable content:', error);
        })
        .finally(() => {
          setIsLoading(false);
        });
    }
  }, [isOpen, user?.id, searchableItems.length]);

  return (
    <>
      {/* Search trigger button */}
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
      >
        <Search className="h-4 w-4" />
        <span className="hidden sm:inline">Search</span>
        <kbd className="hidden sm:inline-flex items-center gap-1 px-1.5 py-0.5 text-xs font-semibold text-gray-500 bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded">
          <span className="text-xs">⌘</span>K
        </kbd>
      </button>

      {/* Search modal */}
      <Transition.Root show={isOpen} as={Fragment}>
        <Dialog
          as="div"
          className="relative z-50"
          onClose={() => setIsOpen(false)}
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
            <div className="fixed inset-0 bg-gray-500 bg-opacity-25 transition-opacity" />
          </Transition.Child>

          <div className="fixed inset-0 z-10 overflow-y-auto p-4 sm:p-6 md:p-20">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="mx-auto max-w-2xl transform rounded-xl bg-white dark:bg-gray-900 shadow-2xl ring-1 ring-black ring-opacity-5 transition-all">
                <Combobox onChange={(item: SearchableItem | null) => item && handleSelectResult(item)}>
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-4 top-3.5 h-5 w-5 text-gray-400" />
                    <Combobox.Input
                      className="h-12 w-full border-0 bg-transparent pl-11 pr-4 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 focus:ring-0 sm:text-sm"
                      placeholder="Search updates, children, recipients, and groups..."
                      value={query}
                      onChange={(event) => setQuery(event.target.value)}
                      autoFocus
                    />
                  </div>

                  <div className="border-t border-gray-200 dark:border-gray-700">
                    {isLoading ? (
                      <div className="px-4 py-8 text-center text-sm text-gray-500 dark:text-gray-400">
                        Loading searchable content...
                      </div>
                    ) : (
                      <SearchResults
                        query={query}
                        groupedResults={groupedResults}
                        recentSearches={recentSearches}
                        hasResults={hasResults}
                        onSelectResult={handleSelectResult}
                        onRecentSearchClick={handleRecentSearchClick}
                      />
                    )}
                  </div>

                  <div className="flex items-center justify-between border-t border-gray-200 dark:border-gray-700 px-4 py-2.5 text-xs text-gray-500 dark:text-gray-400">
                    <div className="flex items-center gap-4">
                      <span>
                        <kbd className="px-1.5 py-0.5 font-semibold bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded">
                          ↑↓
                        </kbd>{' '}
                        to navigate
                      </span>
                      <span>
                        <kbd className="px-1.5 py-0.5 font-semibold bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded">
                          ↵
                        </kbd>{' '}
                        to select
                      </span>
                      <span>
                        <kbd className="px-1.5 py-0.5 font-semibold bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded">
                          ESC
                        </kbd>{' '}
                        to close
                      </span>
                    </div>
                  </div>
                </Combobox>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </Dialog>
      </Transition.Root>
    </>
  );
}
