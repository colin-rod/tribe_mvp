/**
 * Search Service
 * CRO-127: Suboptimal Full-Text Search Implementation
 *
 * Provides client-side utilities for full-text search with caching and analytics.
 */

import { SearchResult, SearchResponse, SearchResultType } from '@/app/api/search/route';

export interface SearchOptions {
  types?: SearchResultType[];
  limit?: number;
  offset?: number;
  includeHighlights?: boolean;
}

export interface SearchAnalytics {
  query: string;
  resultsCount: number;
  executionTimeMs: number;
  searchTypes: string[];
  clickedResultId?: string;
  clickedResultType?: string;
}

// Simple in-memory cache for search results
const searchCache = new Map<string, {
  response: SearchResponse;
  timestamp: number;
}>();

const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

/**
 * Perform a full-text search
 */
export async function search(
  query: string,
  options: SearchOptions = {}
): Promise<SearchResponse> {
  const cacheKey = generateCacheKey(query, options);

  // Check cache first
  const cached = searchCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.response;
  }

  // Build query parameters
  const params = new URLSearchParams({
    q: query,
  });

  if (options.types && options.types.length > 0) {
    params.set('types', options.types.join(','));
  }

  if (options.limit) {
    params.set('limit', options.limit.toString());
  }

  if (options.offset) {
    params.set('offset', options.offset.toString());
  }

  if (options.includeHighlights !== undefined) {
    params.set('includeHighlights', options.includeHighlights.toString());
  }

  // Perform search
  const response = await fetch(`/api/search?${params.toString()}`);

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(error.error || 'Search failed');
  }

  const data: SearchResponse = await response.json();

  // Cache the response
  searchCache.set(cacheKey, {
    response: data,
    timestamp: Date.now(),
  });

  // Track analytics asynchronously (fire and forget)
  trackSearchAnalytics({
    query,
    resultsCount: data.total,
    executionTimeMs: data.executionTime,
    searchTypes: options.types || [],
  }).catch(error => {
    // eslint-disable-next-line no-console
    console.error('Failed to track search analytics:', error);
  });

  return data;
}

/**
 * Track when a user clicks on a search result
 */
export async function trackSearchResultClick(
  query: string,
  resultId: string,
  resultType: SearchResultType
): Promise<void> {
  try {
    await trackSearchAnalytics({
      query,
      resultsCount: 0, // Not tracked on click
      executionTimeMs: 0, // Not tracked on click
      searchTypes: [resultType],
      clickedResultId: resultId,
      clickedResultType: resultType,
    });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Failed to track search result click:', error);
  }
}

/**
 * Get search statistics for the current user
 */
export async function getSearchStatistics(daysBack = 30): Promise<{
  totalSearches: number;
  uniqueQueries: number;
  avgResultsCount: number;
  avgExecutionTimeMs: number;
  topQueries: string[];
}> {
  const response = await fetch(`/api/search/stats?days=${daysBack}`);

  if (!response.ok) {
    throw new Error('Failed to fetch search statistics');
  }

  return response.json();
}

/**
 * Clear the search cache
 */
export function clearSearchCache(): void {
  searchCache.clear();
}

/**
 * Invalidate cache for a specific query
 */
export function invalidateSearchCache(query?: string, options?: SearchOptions): void {
  if (query) {
    const cacheKey = generateCacheKey(query, options || {});
    searchCache.delete(cacheKey);
  } else {
    searchCache.clear();
  }
}

/**
 * Generate cache key from query and options
 */
function generateCacheKey(query: string, options: SearchOptions): string {
  const parts = [
    query.toLowerCase().trim(),
    options.types?.sort().join(',') || 'all',
    options.limit?.toString() || '50',
    options.offset?.toString() || '0',
    options.includeHighlights?.toString() || 'true',
  ];
  return parts.join('|');
}

/**
 * Track search analytics
 */
async function trackSearchAnalytics(analytics: SearchAnalytics): Promise<void> {
  try {
    const response = await fetch('/api/search/analytics', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(analytics),
    });

    if (!response.ok) {
      throw new Error('Failed to track analytics');
    }
  } catch (error) {
    // Silently fail - analytics shouldn't break search functionality
    // eslint-disable-next-line no-console
    console.warn('Search analytics tracking failed:', error);
  }
}

/**
 * Group search results by type
 */
export function groupResultsByType(
  results: SearchResult[]
): Record<SearchResultType, SearchResult[]> {
  const grouped: Record<string, SearchResult[]> = {};

  for (const result of results) {
    if (!grouped[result.type]) {
      grouped[result.type] = [];
    }
    grouped[result.type].push(result);
  }

  return grouped as Record<SearchResultType, SearchResult[]>;
}

/**
 * Get display label for search result type
 */
export function getTypeLabel(type: SearchResultType): string {
  const labels: Record<SearchResultType, string> = {
    memory: 'Memories',
    comment: 'Comments',
    child: 'Children',
    recipient: 'Recipients',
    group: 'Groups',
  };
  return labels[type] || type;
}

/**
 * Format search rank as percentage
 */
export function formatRank(rank: number): string {
  return `${Math.round(rank * 100)}%`;
}
