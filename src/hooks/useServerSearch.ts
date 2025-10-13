/**
 * useServerSearch Hook
 * CRO-127: Suboptimal Full-Text Search Implementation
 *
 * Hook for server-side full-text search with PostgreSQL FTS.
 * Replaces client-side Fuse.js search with optimized database search.
 */

import { useState, useEffect, useCallback } from 'react';
import { useDebounce } from '@/hooks/useDebounce';
import { SearchResult, SearchResultType } from '@/app/api/search/route';
import {
  search,
  trackSearchResultClick,
  groupResultsByType,
  clearSearchCache,
  SearchOptions,
} from '@/lib/services/searchService';
import {
  saveRecentSearch,
  getRecentSearches,
  type RecentSearch,
} from '@/lib/search/searchableContent';

const SEARCH_DEBOUNCE_MS = 300;
const MAX_RECENT_SEARCHES = 10;

interface UseServerSearchOptions {
  /**
   * Types of content to search. If empty, searches all types.
   */
  types?: SearchResultType[];
  /**
   * Maximum number of results to return
   */
  limit?: number;
  /**
   * Include search term highlights in results
   */
  includeHighlights?: boolean;
  /**
   * Callback when a result is selected
   */
  onSelect?: (result: SearchResult) => void;
  /**
   * Enable automatic search on query change
   */
  autoSearch?: boolean;
}

export function useServerSearch(options: UseServerSearchOptions = {}) {
  const {
    types,
    limit = 50,
    includeHighlights = true,
    onSelect,
    autoSearch = true,
  } = options;

  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [totalResults, setTotalResults] = useState(0);
  const [executionTime, setExecutionTime] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [recentSearches, setRecentSearches] = useState<RecentSearch[]>([]);

  const debouncedQuery = useDebounce(query, SEARCH_DEBOUNCE_MS);

  // Load recent searches on mount
  useEffect(() => {
    setRecentSearches(getRecentSearches());
  }, []);

  // Perform search when debounced query changes
  useEffect(() => {
    if (!autoSearch) return;
    if (!debouncedQuery.trim()) {
      setResults([]);
      setTotalResults(0);
      setError(null);
      return;
    }

    performSearch(debouncedQuery);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedQuery, autoSearch, types, limit, includeHighlights]);

  /**
   * Perform server-side search
   */
  const performSearch = useCallback(
    async (searchQuery: string) => {
      if (!searchQuery.trim()) {
        setResults([]);
        setTotalResults(0);
        return;
      }

      setIsSearching(true);
      setError(null);

      try {
        const searchOptions: SearchOptions = {
          types,
          limit,
          includeHighlights,
        };

        const response = await search(searchQuery, searchOptions);

        setResults(response.results);
        setTotalResults(response.total);
        setExecutionTime(response.executionTime);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Search failed';
        setError(errorMessage);
        setResults([]);
        setTotalResults(0);
        // eslint-disable-next-line no-console
        console.error('Search error:', err);
      } finally {
        setIsSearching(false);
      }
    },
    [types, limit, includeHighlights]
  );

  /**
   * Manually trigger a search (useful when autoSearch is false)
   */
  const triggerSearch = useCallback(() => {
    if (query.trim()) {
      performSearch(query);
    }
  }, [query, performSearch]);

  /**
   * Handle result selection
   */
  const handleSelectResult = useCallback(
    (result: SearchResult) => {
      // Save to recent searches
      if (query.trim()) {
        saveRecentSearch(query, MAX_RECENT_SEARCHES);
        setRecentSearches(getRecentSearches());
      }

      // Track the click
      trackSearchResultClick(query, result.id, result.type).catch(err => {
        // eslint-disable-next-line no-console
        console.error('Failed to track search result click:', err);
      });

      // Clear state
      setQuery('');
      setIsOpen(false);
      setResults([]);

      // Call the callback
      onSelect?.(result);
    },
    [query, onSelect]
  );

  /**
   * Handle recent search click
   */
  const handleRecentSearchClick = useCallback((searchQuery: string) => {
    setQuery(searchQuery);
  }, []);

  /**
   * Clear all results
   */
  const clearResults = useCallback(() => {
    setQuery('');
    setResults([]);
    setTotalResults(0);
    setError(null);
  }, []);

  /**
   * Refresh search cache
   */
  const refreshCache = useCallback(() => {
    clearSearchCache();
    if (query.trim()) {
      performSearch(query);
    }
  }, [query, performSearch]);

  // Keyboard shortcut handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen(true);
      }

      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
        clearResults();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, clearResults]);

  // Clear query when closing
  useEffect(() => {
    if (!isOpen) {
      clearResults();
    }
  }, [isOpen, clearResults]);

  // Group results by type
  const groupedResults = groupResultsByType(results);

  return {
    // State
    query,
    setQuery,
    isOpen,
    setIsOpen,
    isSearching,
    results,
    totalResults,
    executionTime,
    error,
    groupedResults,
    recentSearches,

    // Actions
    triggerSearch,
    handleSelectResult,
    handleRecentSearchClick,
    clearResults,
    refreshCache,

    // Computed
    hasResults: results.length > 0,
    hasError: !!error,
  };
}

/**
 * Hook for search statistics
 */
export function useSearchStatistics(daysBack = 30) {
  const [stats, setStats] = useState<{
    totalSearches: number;
    uniqueQueries: number;
    avgResultsCount: number;
    avgExecutionTimeMs: number;
    topQueries: string[];
  } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/search/stats?days=${daysBack}`);

      if (!response.ok) {
        throw new Error('Failed to fetch search statistics');
      }

      const data = await response.json();
      setStats(data);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch statistics';
      setError(errorMessage);
      // eslint-disable-next-line no-console
      console.error('Statistics error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [daysBack]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  return {
    stats,
    isLoading,
    error,
    refresh: fetchStats,
  };
}
