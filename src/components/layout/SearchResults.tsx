/**
 * SearchResults Component
 * CRO-300: Search Functionality in Top Bar
 */

import { SearchableItem } from '@/lib/search/fuseConfig';
import { getCategoryLabel } from '@/lib/search/searchableContent';
import { SearchResultItem } from './SearchResultItem';
import { Clock, X } from 'lucide-react';

interface SearchResultsProps {
  query: string;
  groupedResults: Record<string, SearchableItem[]>;
  recentSearches: Array<{ query: string; timestamp: number }>;
  hasResults: boolean;
  onSelectResult: (item: SearchableItem) => void;
  onRecentSearchClick: (query: string) => void;
}

export function SearchResults({
  query,
  groupedResults,
  recentSearches,
  hasResults,
  onSelectResult,
  onRecentSearchClick,
}: SearchResultsProps) {
  // Show recent searches when there's no query
  if (!query.trim()) {
    if (recentSearches.length === 0) {
      return (
        <div className="px-4 py-8 text-center text-sm text-gray-500 dark:text-gray-400">
          Start typing to search across updates, children, recipients, and
          groups
        </div>
      );
    }

    return (
      <div className="py-2">
        <div className="px-3 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
          Recent Searches
        </div>
        <div className="space-y-1">
          {recentSearches.map((search, index) => (
            <button
              key={index}
              type="button"
              onClick={() => onRecentSearchClick(search.query)}
              className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-800 focus:bg-gray-100 dark:focus:bg-gray-800 focus:outline-none"
            >
              <Clock className="h-4 w-4 text-gray-400" />
              <span className="flex-1 text-sm text-gray-700 dark:text-gray-300">
                {search.query}
              </span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  // Show no results message
  if (!hasResults) {
    return (
      <div className="px-4 py-8 text-center">
        <X className="h-8 w-8 mx-auto mb-2 text-gray-400" />
        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
          No results found
        </p>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          Try adjusting your search terms
        </p>
      </div>
    );
  }

  // Show grouped search results
  return (
    <div className="py-2 max-h-96 overflow-y-auto">
      {Object.entries(groupedResults).map(([type, items]) => (
        <div key={type} className="mb-4 last:mb-0">
          <div className="px-3 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
            {getCategoryLabel(type)}
          </div>
          <div className="space-y-1">
            {items.map((item) => (
              <SearchResultItem
                key={item.id}
                item={item}
                query={query}
                onClick={() => onSelectResult(item)}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
