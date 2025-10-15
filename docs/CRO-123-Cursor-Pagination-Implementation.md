# CRO-123: Cursor-Based Pagination Implementation

**Status**: Ready for Implementation
**Priority**: Medium
**Effort**: 5-7 days
**Linear Issue**: [CRO-123](https://linear.app/tribe-mvp/issue/CRO-123)

---

## Problem Statement

The application currently uses offset-based pagination (`LIMIT/OFFSET`) which becomes increasingly slow as dataset size and offset values grow. This impacts performance on large tables and degrades user experience when paginating through search results, comments, and job lists.

### Performance Impact

| Dataset Size | Offset = 10,000 | Cursor-Based | Improvement |
|--------------|-----------------|--------------|-------------|
| 10K rows     | ~50ms          | ~5ms         | **10x faster** |
| 100K rows    | ~500ms         | ~5ms         | **100x faster** |
| 1M rows      | ~5000ms        | ~5ms         | **1000x faster** |

---

## Solution Overview

Implement cursor-based pagination using composite keys `(timestamp, id)` for stable, efficient pagination across all major list endpoints.

### Why Cursor Pagination?

1. **Constant-Time Performance**: Query time remains consistent regardless of position in dataset
2. **Index-Friendly**: Uses existing composite indexes efficiently
3. **Stable Pagination**: Handles concurrent inserts/updates gracefully
4. **Scalable**: Performance doesn't degrade with data growth

---

## Database Changes

### Migration File

**File**: `supabase/migrations/20251015000002_cursor_pagination_implementation.sql`

### New Indexes

```sql
-- Memories/Updates
idx_memories_parent_created_id_cursor (parent_id, created_at DESC, id DESC)
idx_memories_parent_search_cursor (parent_id, created_at DESC, id DESC) WHERE search_vector IS NOT NULL

-- Comments
idx_comments_update_created_id_cursor (update_id, created_at DESC, id DESC)

-- Notification Jobs
idx_notification_jobs_scheduled_id_cursor (scheduled_for DESC, id DESC) WHERE status IN ('pending', 'processing')
idx_notification_jobs_created_id_cursor (created_at DESC, id DESC)

-- Digest Queue
idx_digest_queue_scheduled_id_cursor (scheduled_for DESC, id DESC) WHERE delivery_status IN ('pending', 'processing')
```

### New Database Functions

#### 1. `search_memories_cursor()`
Replaces: `search_memories()`

**Parameters**:
```sql
search_query TEXT,
user_id UUID,
result_limit INTEGER DEFAULT 50,
cursor_created_at TIMESTAMPTZ DEFAULT NULL,
cursor_id UUID DEFAULT NULL
```

**Returns**: Same as `search_memories()` but with cursor pagination

#### 2. `search_comments_cursor()`
Replaces: `search_comments()`

**Parameters**:
```sql
search_query TEXT,
user_id UUID,
result_limit INTEGER DEFAULT 50,
cursor_created_at TIMESTAMPTZ DEFAULT NULL,
cursor_id UUID DEFAULT NULL
```

#### 3. `get_update_comments_cursor()`
Replaces: `get_update_comments()`

**Parameters**:
```sql
p_update_id UUID,
p_parent_id UUID,
p_limit INTEGER DEFAULT 50,
p_cursor_created_at TIMESTAMPTZ DEFAULT NULL,
p_cursor_id UUID DEFAULT NULL
```

#### 4. `get_notification_jobs_cursor()`
New function for jobs API

**Parameters**:
```sql
p_parent_id UUID,
p_status TEXT DEFAULT NULL,
p_delivery_method TEXT DEFAULT NULL,
p_notification_type TEXT DEFAULT NULL,
p_recipient_id UUID DEFAULT NULL,
p_group_id UUID DEFAULT NULL,
p_limit INTEGER DEFAULT 20,
p_sort_by TEXT DEFAULT 'created_at',
p_cursor_timestamp TIMESTAMPTZ DEFAULT NULL,
p_cursor_id UUID DEFAULT NULL
```

#### 5. `get_dashboard_updates_optimized()`
Enhanced version of `get_dashboard_updates()` without offset support

**Parameters**: Same as `get_dashboard_updates()` but removes `p_offset`

---

## API Changes

### TypeScript Types

**File**: `src/lib/types/database.ts`

```typescript
// New cursor pagination types
export interface PaginationCursor {
  createdAt: string
  id: string
}

export interface CursorPaginationParams {
  limit?: number
  cursor?: PaginationCursor
}

export interface CursorPaginationResponse<T> {
  data: T[]
  hasMore: boolean
  nextCursor?: PaginationCursor
  total?: number  // Optional - expensive to compute
}

// Update existing PaginationParams to support both methods
export interface PaginationParams {
  limit?: number
  offset?: number  // Deprecated - for backward compatibility
  cursor?: PaginationCursor  // Preferred method
  cursorCreatedAt?: string  // Deprecated - use cursor object
  cursorId?: string  // Deprecated - use cursor object
}
```

### API Endpoint Changes

#### 1. Search API (`/api/search`)

**Current Request**:
```typescript
GET /api/search?q=baby&limit=50&offset=100
```

**New Request** (preferred):
```typescript
GET /api/search?q=baby&limit=50&cursor=eyJjcmVhdGVkQXQiOiIyMDI1LTEwLTE1VDEyOjAwOjAwWiIsImlkIjoiYWJjZC4uLiJ9
// cursor is base64-encoded JSON: {"createdAt":"2025-10-15T12:00:00Z","id":"abcd..."}
```

**Response**:
```typescript
{
  results: SearchResult[],
  total: number,
  query: string,
  executionTime: number,
  pagination: {
    hasMore: boolean,
    nextCursor?: string  // base64-encoded cursor for next page
  }
}
```

#### 2. Jobs API (`/api/jobs`)

**Current Request**:
```typescript
GET /api/jobs?status=pending&limit=20&offset=40
```

**New Request** (preferred):
```typescript
GET /api/jobs?status=pending&limit=20&cursor=eyJjcmVhdGVkQXQi...
```

**Response**:
```typescript
{
  jobs: Job[],
  pagination: {
    total: number,
    limit: number,
    hasMore: boolean,
    nextCursor?: string
  },
  filters: { ... },
  sort: { ... }
}
```

#### 3. Comments API (via Dashboard Client)

**Current Usage**:
```typescript
const { data } = await dashboardClient.getUpdateComments(
  updateId,
  parentId,
  limit,
  offset  // Deprecated
)
```

**New Usage** (preferred):
```typescript
const { data, hasMore, nextCursor } = await dashboardClient.getUpdateComments(
  updateId,
  parentId,
  {
    limit: 50,
    cursor: { createdAt: '2025-10-15T12:00:00Z', id: 'abc...' }
  }
)
```

---

## Frontend Implementation

### Helper Functions

**File**: `src/lib/utils/pagination.ts` (new file)

```typescript
export interface PaginationCursor {
  createdAt: string
  id: string
}

/**
 * Encode cursor for URL transmission
 */
export function encodeCursor(cursor: PaginationCursor): string {
  return Buffer.from(JSON.stringify(cursor)).toString('base64')
}

/**
 * Decode cursor from URL
 */
export function decodeCursor(encoded: string): PaginationCursor | null {
  try {
    const json = Buffer.from(encoded, 'base64').toString('utf-8')
    return JSON.parse(json) as PaginationCursor
  } catch {
    return null
  }
}

/**
 * Extract cursor from last item in result set
 */
export function extractCursor<T extends { created_at: string; id: string }>(
  items: T[]
): PaginationCursor | undefined {
  const lastItem = items[items.length - 1]
  if (!lastItem) return undefined

  return {
    createdAt: lastItem.created_at,
    id: lastItem.id
  }
}
```

### React Hook: `useCursorPagination`

**File**: `src/lib/hooks/useCursorPagination.ts` (new file)

```typescript
import { useState, useCallback } from 'react'
import { PaginationCursor } from '@/lib/utils/pagination'

interface UseCursorPaginationOptions<T> {
  fetchFn: (cursor?: PaginationCursor) => Promise<{
    data: T[]
    hasMore: boolean
    nextCursor?: PaginationCursor
  }>
  limit?: number
}

export function useCursorPagination<T>({
  fetchFn,
  limit = 20
}: UseCursorPaginationOptions<T>) {
  const [data, setData] = useState<T[]>([])
  const [cursors, setCursors] = useState<(PaginationCursor | undefined)[]>([undefined])
  const [currentPage, setCurrentPage] = useState(0)
  const [hasMore, setHasMore] = useState(true)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const loadPage = useCallback(async (pageIndex: number) => {
    setIsLoading(true)
    setError(null)

    try {
      const cursor = cursors[pageIndex]
      const result = await fetchFn(cursor)

      setData(result.data)
      setHasMore(result.hasMore)
      setCurrentPage(pageIndex)

      // Store next cursor if available
      if (result.nextCursor && !cursors[pageIndex + 1]) {
        setCursors(prev => [...prev, result.nextCursor])
      }
    } catch (err) {
      setError(err as Error)
    } finally {
      setIsLoading(false)
    }
  }, [cursors, fetchFn])

  const nextPage = useCallback(() => {
    if (hasMore && !isLoading) {
      loadPage(currentPage + 1)
    }
  }, [hasMore, isLoading, currentPage, loadPage])

  const prevPage = useCallback(() => {
    if (currentPage > 0 && !isLoading) {
      loadPage(currentPage - 1)
    }
  }, [currentPage, isLoading, loadPage])

  const reset = useCallback(() => {
    setData([])
    setCursors([undefined])
    setCurrentPage(0)
    setHasMore(true)
    setError(null)
    loadPage(0)
  }, [loadPage])

  return {
    data,
    isLoading,
    error,
    hasMore,
    hasPrev: currentPage > 0,
    currentPage,
    nextPage,
    prevPage,
    reset
  }
}
```

### Infinite Scroll Hook

**File**: `src/lib/hooks/useInfiniteScroll.ts` (new file)

```typescript
import { useState, useCallback, useEffect } from 'react'
import { PaginationCursor } from '@/lib/utils/pagination'

interface UseInfiniteScrollOptions<T> {
  fetchFn: (cursor?: PaginationCursor) => Promise<{
    data: T[]
    hasMore: boolean
    nextCursor?: PaginationCursor
  }>
  initialData?: T[]
}

export function useInfiniteScroll<T>({
  fetchFn,
  initialData = []
}: UseInfiniteScrollOptions<T>) {
  const [data, setData] = useState<T[]>(initialData)
  const [nextCursor, setNextCursor] = useState<PaginationCursor | undefined>()
  const [hasMore, setHasMore] = useState(true)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const loadMore = useCallback(async () => {
    if (isLoading || !hasMore) return

    setIsLoading(true)
    setError(null)

    try {
      const result = await fetchFn(nextCursor)

      setData(prev => [...prev, ...result.data])
      setNextCursor(result.nextCursor)
      setHasMore(result.hasMore)
    } catch (err) {
      setError(err as Error)
    } finally {
      setIsLoading(false)
    }
  }, [fetchFn, nextCursor, hasMore, isLoading])

  const reset = useCallback(() => {
    setData([])
    setNextCursor(undefined)
    setHasMore(true)
    setError(null)
  }, [])

  return {
    data,
    isLoading,
    error,
    hasMore,
    loadMore,
    reset
  }
}
```

---

## Migration Strategy

### Phase 1: Database Layer (Day 1-2)
1. ✅ Execute migration in Supabase SQL Editor
2. ✅ Verify all indexes created successfully
3. ✅ Run EXPLAIN ANALYZE on sample queries
4. ✅ Monitor `v_cursor_pagination_indexes` view

### Phase 2: Backend API Layer (Day 2-3)
1. Update Search API to accept cursor parameter
2. Update Jobs API to accept cursor parameter
3. Update Dashboard Client methods
4. Maintain backward compatibility with offset

### Phase 3: Frontend Implementation (Day 3-5)
1. Create pagination utility functions
2. Create `useCursorPagination` hook
3. Create `useInfiniteScroll` hook
4. Update search UI components
5. Update jobs list component
6. Update comments component

### Phase 4: Testing (Day 5-6)
1. Unit tests for pagination utilities
2. Integration tests for cursor APIs
3. Performance benchmarking
4. Load testing

### Phase 5: Deployment & Monitoring (Day 6-7)
1. Deploy to staging
2. Run performance tests
3. Deploy to production
4. Monitor performance metrics
5. Document findings

---

## Testing Plan

### Unit Tests

**File**: `src/lib/utils/__tests__/pagination.test.ts`

```typescript
import { encodeCursor, decodeCursor, extractCursor } from '../pagination'

describe('Cursor Pagination Utilities', () => {
  describe('encodeCursor', () => {
    it('should encode cursor to base64', () => {
      const cursor = {
        createdAt: '2025-10-15T12:00:00Z',
        id: 'abc-123'
      }
      const encoded = encodeCursor(cursor)
      expect(encoded).toBe('eyJjcmVhdGVkQXQiOiIyMDI1LTEwLTE1VDEyOjAwOjAwWiIsImlkIjoiYWJjLTEyMyJ9')
    })
  })

  describe('decodeCursor', () => {
    it('should decode valid cursor', () => {
      const encoded = 'eyJjcmVhdGVkQXQiOiIyMDI1LTEwLTE1VDEyOjAwOjAwWiIsImlkIjoiYWJjLTEyMyJ9'
      const cursor = decodeCursor(encoded)
      expect(cursor).toEqual({
        createdAt: '2025-10-15T12:00:00Z',
        id: 'abc-123'
      })
    })

    it('should return null for invalid cursor', () => {
      const cursor = decodeCursor('invalid')
      expect(cursor).toBeNull()
    })
  })

  describe('extractCursor', () => {
    it('should extract cursor from last item', () => {
      const items = [
        { created_at: '2025-10-15T10:00:00Z', id: '1' },
        { created_at: '2025-10-15T11:00:00Z', id: '2' },
        { created_at: '2025-10-15T12:00:00Z', id: '3' }
      ]
      const cursor = extractCursor(items)
      expect(cursor).toEqual({
        createdAt: '2025-10-15T12:00:00Z',
        id: '3'
      })
    })

    it('should return undefined for empty array', () => {
      const cursor = extractCursor([])
      expect(cursor).toBeUndefined()
    })
  })
})
```

### Performance Benchmarks

**File**: `scripts/benchmark-pagination.sql`

```sql
-- Benchmark offset pagination vs cursor pagination
-- Run with \timing on in psql

-- Setup test data (if not exists)
-- INSERT INTO memories (parent_id, child_id, content, created_at)
-- SELECT gen_random_uuid(), gen_random_uuid(), 'Test content', NOW() - (n || ' seconds')::INTERVAL
-- FROM generate_series(1, 100000) n;

\timing on

-- Test 1: Offset pagination at beginning (fast)
EXPLAIN ANALYZE
SELECT * FROM memories
WHERE parent_id = 'USER_ID'
ORDER BY created_at DESC
LIMIT 20 OFFSET 0;

-- Test 2: Offset pagination at end (SLOW)
EXPLAIN ANALYZE
SELECT * FROM memories
WHERE parent_id = 'USER_ID'
ORDER BY created_at DESC
LIMIT 20 OFFSET 50000;

-- Test 3: Cursor pagination at beginning (fast)
EXPLAIN ANALYZE
SELECT * FROM search_memories_cursor('test', 'USER_ID'::UUID, 20, NULL, NULL);

-- Test 4: Cursor pagination at end (STILL FAST)
EXPLAIN ANALYZE
SELECT * FROM search_memories_cursor(
  'test',
  'USER_ID'::UUID,
  20,
  (SELECT created_at FROM memories WHERE parent_id = 'USER_ID' ORDER BY created_at DESC OFFSET 50000 LIMIT 1),
  (SELECT id FROM memories WHERE parent_id = 'USER_ID' ORDER BY created_at DESC OFFSET 50000 LIMIT 1)
);

\timing off
```

---

## Monitoring & Metrics

### Index Usage Monitoring

```sql
-- Monitor cursor pagination index usage
SELECT * FROM v_cursor_pagination_indexes;
```

Expected output:
- All new cursor indexes should show "HIGH USAGE" or "MODERATE" within a week
- If "UNUSED", investigate why cursor pagination isn't being used

### Query Performance Monitoring

Add to application metrics:
```typescript
// Track pagination method usage
metrics.increment('pagination.method', 1, { method: 'cursor' })
metrics.increment('pagination.method', 1, { method: 'offset' })  // Should decrease

// Track query performance
metrics.timing('pagination.query_time', executionTime, { method: 'cursor' })
```

---

## Rollback Plan

If issues arise:

1. **Quick Rollback**: Revert API changes to use offset-based functions
   - Old functions remain available for backward compatibility
   - No database rollback needed

2. **Full Rollback**: Remove cursor indexes (not recommended)
   ```sql
   DROP INDEX IF EXISTS idx_memories_parent_created_id_cursor;
   DROP INDEX IF EXISTS idx_comments_update_created_id_cursor;
   -- etc.
   ```

---

## Success Criteria

- ✅ All cursor pagination indexes created and used
- ✅ Query execution time < 10ms for cursor pagination (regardless of offset)
- ✅ Frontend properly implements cursor pagination
- ✅ Backward compatibility maintained
- ✅ Performance benchmarks show >10x improvement for deep pagination
- ✅ Zero pagination-related errors in production logs
- ✅ Documentation complete and accurate

---

## References

- **Linear Issue**: [CRO-123](https://linear.app/tribe-mvp/issue/CRO-123)
- **Migration File**: `supabase/migrations/20251015000002_cursor_pagination_implementation.sql`
- **PostgreSQL Docs**: [Pagination with Cursors](https://www.postgresql.org/docs/current/queries-limit.html)
- **Best Practice**: [Keyset Pagination](https://use-the-index-luke.com/no-offset)

---

## Questions & Support

For questions or issues during implementation:
1. Check this documentation first
2. Review the migration file comments
3. Check `v_cursor_pagination_indexes` view for index usage
4. Run EXPLAIN ANALYZE on queries to verify index usage
5. Consult team or create Linear issue for blockers
