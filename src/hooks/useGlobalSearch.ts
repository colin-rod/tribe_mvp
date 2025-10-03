/**
 * useGlobalSearch Hook
 * CRO-300: Search Functionality in Top Bar
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import Fuse from 'fuse.js';
import { useDebounce } from '@/hooks/useDebounce';
import {
  SearchableItem,
  fuseOptions,
  SEARCH_DEBOUNCE_MS,
  MAX_RECENT_SEARCHES,
} from '@/lib/search/fuseConfig';
import {
  saveRecentSearch,
  getRecentSearches,
  groupResultsByType,
  type RecentSearch,
} from '@/lib/search/searchableContent';

interface UseGlobalSearchOptions {
  searchableItems: SearchableItem[];
  onSelect?: (item: SearchableItem) => void;
}

export function useGlobalSearch({
  searchableItems,
  onSelect,
}: UseGlobalSearchOptions) {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [recentSearches, setRecentSearches] = useState<RecentSearch[]>([]);

  const debouncedQuery = useDebounce(query, SEARCH_DEBOUNCE_MS);

  // Initialize Fuse instance
  const fuse = useMemo(
    () => new Fuse(searchableItems, fuseOptions),
    [searchableItems]
  );

  // Load recent searches on mount
  useEffect(() => {
    setRecentSearches(getRecentSearches());
  }, []);

  // Perform search
  const searchResults = useMemo(() => {
    if (!debouncedQuery.trim()) {
      return [];
    }

    const results = fuse.search(debouncedQuery);
    return results.map((result) => result.item);
  }, [debouncedQuery, fuse]);

  // Group results by type
  const groupedResults = useMemo(
    () => groupResultsByType(searchResults),
    [searchResults]
  );

  // Handle search submission
  const handleSearch = useCallback(
    (searchQuery: string) => {
      if (searchQuery.trim()) {
        saveRecentSearch(searchQuery, MAX_RECENT_SEARCHES);
        setRecentSearches(getRecentSearches());
      }
    },
    []
  );

  // Handle result selection
  const handleSelectResult = useCallback(
    (item: SearchableItem) => {
      handleSearch(query);
      setQuery('');
      setIsOpen(false);
      onSelect?.(item);
    },
    [query, onSelect, handleSearch]
  );

  // Handle recent search click
  const handleRecentSearchClick = useCallback((searchQuery: string) => {
    setQuery(searchQuery);
  }, []);

  // Keyboard shortcut handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen(true);
      }

      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
        setQuery('');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  // Clear query when closing
  useEffect(() => {
    if (!isOpen) {
      setQuery('');
    }
  }, [isOpen]);

  return {
    query,
    setQuery,
    isOpen,
    setIsOpen,
    searchResults,
    groupedResults,
    recentSearches,
    handleSelectResult,
    handleRecentSearchClick,
    hasResults: searchResults.length > 0,
  };
}
