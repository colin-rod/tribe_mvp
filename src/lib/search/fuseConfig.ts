/**
 * Fuse.js Configuration for Global Search
 * CRO-300: Search Functionality in Top Bar
 */

import { IFuseOptions } from 'fuse.js';

export interface SearchableItem {
  id: string;
  type: 'update' | 'child' | 'recipient' | 'group' | 'draft';
  title?: string;
  content?: string;
  name?: string;
  email?: string;
  url: string;
  metadata?: Record<string, unknown>;
}

export const fuseOptions: IFuseOptions<SearchableItem> = {
  keys: [
    { name: 'title', weight: 2 },
    { name: 'content', weight: 1 },
    { name: 'name', weight: 2 },
    { name: 'email', weight: 1.5 },
  ],
  threshold: 0.3,
  includeScore: true,
  minMatchCharLength: 2,
  ignoreLocation: true,
};

export const SEARCH_DEBOUNCE_MS = 200;
export const MAX_RECENT_SEARCHES = 10;
export const RECENT_SEARCHES_KEY = 'tribe_recent_searches';
