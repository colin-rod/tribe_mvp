/**
 * useSearchCacheInvalidation Hook
 * CRO-300: Search Functionality in Top Bar
 *
 * Hook to invalidate search cache when content changes
 */

import { useEffect } from 'react';
import { invalidateSearchCache } from '@/lib/search/fetchSearchableContent';

/**
 * Invalidate search cache on component mount
 * Use this in pages/components that create/update/delete searchable content
 */
export function useSearchCacheInvalidation() {
  useEffect(() => {
    // Invalidate cache when component unmounts (after changes)
    return () => {
      invalidateSearchCache();
    };
  }, []);
}

/**
 * Manually invalidate search cache
 * Call this after creating/updating/deleting content
 */
export function invalidateSearch() {
  invalidateSearchCache();
}
