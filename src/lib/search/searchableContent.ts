/**
 * Searchable Content Utilities
 * CRO-300: Search Functionality in Top Bar
 */

import { SearchableItem } from './fuseConfig';

export interface RecentSearch {
  query: string;
  timestamp: number;
}

/**
 * Save a search query to recent searches in localStorage
 */
export function saveRecentSearch(query: string, maxRecent: number = 10): void {
  if (!query.trim()) return;

  try {
    const stored = localStorage.getItem('tribe_recent_searches');
    const recent: RecentSearch[] = stored ? JSON.parse(stored) : [];

    // Remove duplicate if exists
    const filtered = recent.filter((item) => item.query !== query);

    // Add new search at the beginning
    filtered.unshift({ query, timestamp: Date.now() });

    // Keep only max number of recent searches
    const trimmed = filtered.slice(0, maxRecent);

    localStorage.setItem('tribe_recent_searches', JSON.stringify(trimmed));
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Error saving recent search:', error);
  }
}

/**
 * Get recent searches from localStorage
 */
export function getRecentSearches(): RecentSearch[] {
  try {
    const stored = localStorage.getItem('tribe_recent_searches');
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Error loading recent searches:', error);
    return [];
  }
}

/**
 * Clear all recent searches
 */
export function clearRecentSearches(): void {
  try {
    localStorage.removeItem('tribe_recent_searches');
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Error clearing recent searches:', error);
  }
}

/**
 * Group search results by type
 */
export function groupResultsByType(
  results: SearchableItem[]
): Record<string, SearchableItem[]> {
  return results.reduce(
    (groups, item) => {
      const type = item.type;
      if (!groups[type]) {
        groups[type] = [];
      }
      groups[type].push(item);
      return groups;
    },
    {} as Record<string, SearchableItem[]>
  );
}

/**
 * Get category label for display
 */
export function getCategoryLabel(type: string): string {
  const labels: Record<string, string> = {
    update: 'Updates',
    child: 'Children',
    recipient: 'Recipients',
    group: 'Groups',
    draft: 'Drafts',
  };
  return labels[type] || type;
}

/**
 * Highlight matching text in search results
 */
export function highlightMatch(text: string, query: string): string {
  if (!query.trim()) return text;

  const regex = new RegExp(`(${query})`, 'gi');
  return text.replace(regex, '<mark>$1</mark>');
}
