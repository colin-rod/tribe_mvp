/**
 * useActivityFilters Hook
 * CRO-298: Right Pane - Activity View Context
 *
 * Manages filter state for the Activity feed with URL sync and debounced search.
 */

'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';

export type UpdateType = 'photo' | 'video' | 'text' | 'milestone';

export interface DateRange {
  start: Date;
  end: Date;
}

export interface ActivityFilters {
  dateRange: DateRange | null;
  childIds: string[];
  updateTypes: UpdateType[];
  searchQuery: string;
}

export interface UseActivityFiltersReturn {
  filters: ActivityFilters;
  setDateRange: (range: DateRange | null) => void;
  setChildIds: (ids: string[]) => void;
  setUpdateTypes: (types: UpdateType[]) => void;
  setSearchQuery: (query: string) => void;
  clearFilters: () => void;
  hasActiveFilters: boolean;
  activeFilterCount: number;
}

const DEBOUNCE_DELAY = 300;

const defaultFilters: ActivityFilters = {
  dateRange: null,
  childIds: [],
  updateTypes: [],
  searchQuery: '',
};

/**
 * Simple debounce implementation
 */
function debounce<T extends (...args: Parameters<T>) => void>(
  func: T,
  delay: number
): T & { cancel: () => void } {
  let timeoutId: NodeJS.Timeout | null = null;

  const debounced = function (this: ThisParameterType<T>, ...args: Parameters<T>) {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    timeoutId = setTimeout(() => {
      func.apply(this, args);
    }, delay);
  } as T & { cancel: () => void };

  debounced.cancel = () => {
    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }
  };

  return debounced;
}

/**
 * Hook to manage activity feed filters with URL sync
 */
export function useActivityFilters(): UseActivityFiltersReturn {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Initialize filters from URL params
  const [filters, setFilters] = useState<ActivityFilters>(() => {
    if (!searchParams) {
      return defaultFilters;
    }

    const query = searchParams.get('q') || '';
    const children = searchParams.get('children')?.split(',').filter(Boolean) || [];
    const types = (searchParams.get('types')?.split(',').filter(Boolean) || []) as UpdateType[];
    const startDate = searchParams.get('start');
    const endDate = searchParams.get('end');

    return {
      searchQuery: query,
      childIds: children,
      updateTypes: types,
      dateRange:
        startDate && endDate
          ? { start: new Date(startDate), end: new Date(endDate) }
          : null,
    };
  });

  // Debounced URL sync function
  const syncUrlParams = useMemo(
    () =>
      debounce((newFilters: ActivityFilters) => {
        const params = new URLSearchParams();

        if (newFilters.searchQuery) {
          params.set('q', newFilters.searchQuery);
        }

        if (newFilters.childIds.length > 0) {
          params.set('children', newFilters.childIds.join(','));
        }

        if (newFilters.updateTypes.length > 0) {
          params.set('types', newFilters.updateTypes.join(','));
        }

        if (newFilters.dateRange) {
          params.set('start', newFilters.dateRange.start.toISOString());
          params.set('end', newFilters.dateRange.end.toISOString());
        }

        const queryString = params.toString();
        const newUrl = queryString ? `${pathname}?${queryString}` : pathname || '/';

        router.replace(newUrl, { scroll: false });
      }, DEBOUNCE_DELAY),
    [pathname, router]
  );

  // Sync filters to URL when they change
  useEffect(() => {
    syncUrlParams(filters);

    // Cleanup debounce on unmount
    return () => {
      syncUrlParams.cancel();
    };
  }, [filters, syncUrlParams]);

  // Filter setters
  const setDateRange = useCallback((range: DateRange | null) => {
    setFilters((prev) => ({ ...prev, dateRange: range }));
  }, []);

  const setChildIds = useCallback((ids: string[]) => {
    setFilters((prev) => ({ ...prev, childIds: ids }));
  }, []);

  const setUpdateTypes = useCallback((types: UpdateType[]) => {
    setFilters((prev) => ({ ...prev, updateTypes: types }));
  }, []);

  const setSearchQuery = useCallback((query: string) => {
    setFilters((prev) => ({ ...prev, searchQuery: query }));
  }, []);

  const clearFilters = useCallback(() => {
    setFilters(defaultFilters);
  }, []);

  // Compute if any filters are active
  const hasActiveFilters = useMemo(
    () =>
      filters.searchQuery !== '' ||
      filters.childIds.length > 0 ||
      filters.updateTypes.length > 0 ||
      filters.dateRange !== null,
    [filters]
  );

  // Count active filters
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.searchQuery) count++;
    if (filters.childIds.length > 0) count++;
    if (filters.updateTypes.length > 0) count++;
    if (filters.dateRange) count++;
    return count;
  }, [filters]);

  return {
    filters,
    setDateRange,
    setChildIds,
    setUpdateTypes,
    setSearchQuery,
    clearFilters,
    hasActiveFilters,
    activeFilterCount,
  };
}
