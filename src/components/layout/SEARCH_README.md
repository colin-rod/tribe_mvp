# Global Search Feature

**Issue**: CRO-300 - Search Functionality in Top Bar
**Status**: ✅ Complete

## Overview

Command palette-style global search with keyboard shortcuts (⌘K / Ctrl+K) that searches across updates, children, recipients, and groups.

## Features

- ✅ Keyboard shortcut activation (⌘K / Ctrl+K)
- ✅ Fuzzy search using Fuse.js
- ✅ Debounced input (200ms)
- ✅ Recent searches with localStorage (max 10)
- ✅ Results grouped by category
- ✅ Search highlighting in results
- ✅ Keyboard navigation (arrows, enter, escape)
- ✅ Accessible Headless UI Combobox
- ✅ "No results" empty state
- ✅ Real-time data from Supabase
- ✅ 5-minute cache with invalidation

## Architecture

### Components

1. **GlobalSearch** (`src/components/layout/GlobalSearch.tsx`)
   - Main search component with modal interface
   - Handles keyboard shortcuts and data fetching
   - Integrates with TopBar

2. **SearchResults** (`src/components/layout/SearchResults.tsx`)
   - Displays grouped search results
   - Shows recent searches when no query
   - Renders "no results" state

3. **SearchResultItem** (`src/components/layout/SearchResultItem.tsx`)
   - Individual result item with icon and highlighting
   - Handles click navigation

### Hooks

1. **useGlobalSearch** (`src/hooks/useGlobalSearch.ts`)
   - Core search logic with Fuse.js
   - Manages search state and recent searches
   - Keyboard shortcut handling

2. **useDebounce** (`src/hooks/useDebounce.ts`)
   - Debounces search input for performance

3. **useSearchCacheInvalidation** (`src/hooks/useSearchCacheInvalidation.ts`)
   - Cache invalidation for content changes

### Utilities

1. **fuseConfig.ts** (`src/lib/search/fuseConfig.ts`)
   - Fuse.js configuration and types
   - Search constants

2. **searchableContent.ts** (`src/lib/search/searchableContent.ts`)
   - Recent searches management (localStorage)
   - Result grouping and highlighting
   - Category labels

3. **fetchSearchableContent.ts** (`src/lib/search/fetchSearchableContent.ts`)
   - Fetches searchable data from Supabase
   - 5-minute cache with invalidation
   - Searches: updates, drafts, children, recipients, groups

## Usage

### Basic Usage

The search is automatically available in the TopBar. Users can:

1. Click the search button
2. Press ⌘K (Mac) or Ctrl+K (Windows/Linux)
3. Type to search
4. Use arrow keys to navigate
5. Press Enter to select
6. Press Escape to close

### Cache Invalidation

When creating/updating/deleting searchable content, invalidate the cache:

```tsx
import { invalidateSearch } from '@/hooks/useSearchCacheInvalidation';

// After creating/updating/deleting content
await createUpdate(...);
invalidateSearch();
```

Or use the hook for automatic invalidation:

```tsx
import { useSearchCacheInvalidation } from '@/hooks/useSearchCacheInvalidation';

function UpdateEditor() {
  useSearchCacheInvalidation(); // Invalidates on unmount
  // ...
}
```

## Data Structure

### SearchableItem

```typescript
interface SearchableItem {
  id: string;
  type: 'update' | 'child' | 'recipient' | 'group' | 'draft';
  title?: string;
  content?: string;
  name?: string;
  email?: string;
  url: string;
  metadata?: Record<string, unknown>;
}
```

### Search Sources

1. **Updates** (status: sent)
   - Searches: subject, content
   - URL: `/dashboard/updates/{id}`

2. **Drafts** (status: draft)
   - Searches: subject, content
   - URL: `/dashboard/drafts/{id}/edit`

3. **Children**
   - Searches: name
   - URL: `/dashboard/children?selected={id}`

4. **Recipients**
   - Searches: name, email
   - URL: `/dashboard/recipients?selected={id}`

5. **Groups**
   - Searches: name
   - URL: `/dashboard/groups?selected={id}`

## Configuration

### Fuse.js Settings

- **Threshold**: 0.3 (lower = more strict)
- **Min match length**: 2 characters
- **Debounce**: 200ms
- **Weights**:
  - Title/Name: 2x
  - Email: 1.5x
  - Content: 1x

### Cache Settings

- **Duration**: 5 minutes
- **Storage**: In-memory (per user)
- **Invalidation**: Manual or on unmount

### Recent Searches

- **Max items**: 10
- **Storage**: localStorage
- **Key**: `tribe_recent_searches`

## Testing

To test the search functionality:

1. Create some test data (updates, children, recipients, groups)
2. Open search with ⌘K or click the search button
3. Type a query and verify fuzzy matching works
4. Check that results are grouped by category
5. Verify keyboard navigation works
6. Test recent searches by closing and reopening

## Future Enhancements

Potential improvements for future iterations:

- [ ] Server-side search with full-text search
- [ ] Search filters (by type, date range)
- [ ] Advanced search operators
- [ ] Search analytics
- [ ] Voice search
- [ ] Mobile-optimized interface
- [ ] Search result previews
- [ ] Keyboard shortcuts customization

## Dependencies

- `fuse.js`: Fuzzy search library
- `@headlessui/react`: Accessible UI components (Combobox, Dialog)
- `lucide-react`: Icons

## Related Files

- [TopBar.tsx](./TopBar.tsx) - Integration point
- [CRO-300 Linear Issue](https://linear.app/tribe/issue/CRO-300)
