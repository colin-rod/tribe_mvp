# CRO-123: Cursor Pagination Migration Execution Guide

**Status**: Ready to Execute
**Migration File**: `supabase/migrations/20251015000002_cursor_pagination_implementation.sql`
**Estimated Time**: 5-10 minutes
**Risk Level**: Low (backward compatible, no breaking changes)

---

## Pre-Migration Checklist

Before executing the migration, verify:

- [ ] Database backup is recent (Supabase handles this automatically)
- [ ] You have access to Supabase SQL Editor
- [ ] No active deployments in progress
- [ ] You've reviewed the migration file
- [ ] All code changes from CRO-123 are deployed to staging/production

---

## Migration Execution Steps

### Step 1: Access Supabase SQL Editor

1. Open your Supabase project dashboard
2. Navigate to **SQL Editor** in the left sidebar
3. Click **New Query**

### Step 2: Execute Migration

1. Open the migration file: `supabase/migrations/20251015000002_cursor_pagination_implementation.sql`
2. Copy the **entire contents** of the file
3. Paste into the SQL Editor
4. Review the SQL one more time
5. Click **Run** button (bottom right)

### Step 3: Verify Execution

You should see output similar to:

```
NOTICE:  ==========================================
NOTICE:  Cursor Pagination Implementation Complete
NOTICE:  ==========================================
NOTICE:  Issue: CRO-123
NOTICE:  Created: 2025-10-15 [timestamp]
NOTICE:
NOTICE:  New Indexes Created:
NOTICE:  - idx_memories_parent_created_id_cursor
NOTICE:  - idx_memories_parent_search_cursor
NOTICE:  - idx_comments_update_created_id_cursor
NOTICE:  - idx_notification_jobs_scheduled_id_cursor
NOTICE:  - idx_notification_jobs_created_id_cursor
NOTICE:  - idx_digest_queue_scheduled_id_cursor
...
```

**Expected Result**: `Success. No rows returned`

---

## Post-Migration Verification

### 1. Verify Indexes Created

Run this query in SQL Editor:

```sql
SELECT
  schemaname,
  tablename,
  indexname
FROM pg_indexes
WHERE indexname LIKE '%cursor%'
ORDER BY tablename, indexname;
```

**Expected Output**: 6 indexes listed

### 2. Verify Functions Created

Run this query:

```sql
SELECT
  routine_name,
  routine_type
FROM information_schema.routines
WHERE routine_name LIKE '%cursor%'
  AND routine_schema = 'public'
ORDER BY routine_name;
```

**Expected Output**: 6 functions listed
- `search_memories_cursor`
- `search_comments_cursor`
- `search_memories_with_highlights_cursor`
- `get_update_comments_cursor`
- `get_dashboard_updates_optimized`
- `get_notification_jobs_cursor`

### 3. Check Monitoring View

Run this query:

```sql
SELECT * FROM v_cursor_pagination_indexes;
```

**Expected Output**: View exists and shows index statistics (may show 0 scans initially)

### 4. Test Cursor Function (Optional)

Test with a safe read-only query:

```sql
-- Replace 'YOUR_USER_ID' with an actual user ID from your database
SELECT * FROM search_memories_cursor(
  'test',
  'YOUR_USER_ID'::UUID,
  5,  -- limit
  NULL,  -- cursor_created_at
  NULL   -- cursor_id
);
```

**Expected Output**: Should return up to 5 search results without errors

---

## Testing Cursor Pagination

### 1. Test Search API with Cursor

```bash
# First page (no cursor)
curl -H "Authorization: Bearer YOUR_TOKEN" \
  "https://your-project.supabase.co/rest/v1/rpc/search_memories_cursor" \
  -H "Content-Type: application/json" \
  -d '{
    "search_query": "test",
    "user_id": "YOUR_USER_ID",
    "result_limit": 20
  }'

# Second page (with cursor)
# Use created_at and id from last result of first page
curl -H "Authorization: Bearer YOUR_TOKEN" \
  "https://your-project.supabase.co/rest/v1/rpc/search_memories_cursor" \
  -H "Content-Type: application/json" \
  -d '{
    "search_query": "test",
    "user_id": "YOUR_USER_ID",
    "result_limit": 20,
    "cursor_created_at": "2025-10-15T12:00:00Z",
    "cursor_id": "abc-123-def"
  }'
```

### 2. Test via Application APIs

```bash
# Test Search API
curl "http://localhost:3000/api/search?q=baby&limit=20"
curl "http://localhost:3000/api/search?q=baby&limit=20&cursor=eyJjcmVhdGVkQXQi..."

# Test Jobs API
curl "http://localhost:3000/api/jobs?status=pending&limit=20"
curl "http://localhost:3000/api/jobs?status=pending&limit=20&cursor=eyJjcmVhdGVkQXQi..."
```

---

## Performance Monitoring

### Monitor Index Usage (Run Weekly)

```sql
SELECT * FROM v_cursor_pagination_indexes
ORDER BY total_scans DESC;
```

**What to Look For**:
- `total_scans` should increase as cursor pagination is used
- `usage_category` should move from 'UNUSED' → 'LOW USAGE' → 'MODERATE' → 'HIGH USAGE'
- All 6 new indexes should show usage within a week of deployment

### Performance Benchmarking

Run these queries to compare performance:

```sql
-- Offset pagination (OLD - should be slow for large offsets)
EXPLAIN ANALYZE
SELECT * FROM memories
WHERE parent_id = 'YOUR_USER_ID'::UUID
ORDER BY created_at DESC
LIMIT 20 OFFSET 10000;

-- Cursor pagination (NEW - should be fast regardless of position)
EXPLAIN ANALYZE
SELECT * FROM search_memories_cursor(
  'test',
  'YOUR_USER_ID'::UUID,
  20,
  '2025-01-01T00:00:00Z'::TIMESTAMPTZ,  -- Simulated cursor position
  gen_random_uuid()
);
```

**What to Look For**:
- Offset query execution time increases with larger offsets
- Cursor query execution time stays constant (~5-10ms)
- Cursor query should use the new composite indexes

---

## Rollback Procedure (If Needed)

If issues arise, you can roll back by:

### 1. Remove Indexes

```sql
DROP INDEX IF EXISTS idx_memories_parent_created_id_cursor;
DROP INDEX IF EXISTS idx_memories_parent_search_cursor;
DROP INDEX IF EXISTS idx_comments_update_created_id_cursor;
DROP INDEX IF EXISTS idx_notification_jobs_scheduled_id_cursor;
DROP INDEX IF EXISTS idx_notification_jobs_created_id_cursor;
DROP INDEX IF EXISTS idx_digest_queue_scheduled_id_cursor;
```

### 2. Remove Functions

```sql
DROP FUNCTION IF EXISTS search_memories_cursor(TEXT, UUID, INTEGER, TIMESTAMPTZ, UUID);
DROP FUNCTION IF EXISTS search_comments_cursor(TEXT, UUID, INTEGER, TIMESTAMPTZ, UUID);
DROP FUNCTION IF EXISTS search_memories_with_highlights_cursor(TEXT, UUID, INTEGER, TIMESTAMPTZ, UUID);
DROP FUNCTION IF EXISTS get_update_comments_cursor(UUID, UUID, INTEGER, TIMESTAMPTZ, UUID);
DROP FUNCTION IF EXISTS get_dashboard_updates_optimized(UUID, TEXT, UUID[], TEXT[], TEXT, TIMESTAMPTZ, TIMESTAMPTZ, INTEGER, TIMESTAMPTZ, UUID);
DROP FUNCTION IF EXISTS get_notification_jobs_cursor(UUID, TEXT, TEXT, TEXT, UUID, UUID, INTEGER, TEXT, TIMESTAMPTZ, UUID);
```

### 3. Remove View

```sql
DROP VIEW IF EXISTS v_cursor_pagination_indexes;
```

### 4. Remove Type

```sql
DROP TYPE IF EXISTS pagination_cursor;
```

**Note**: The old offset-based functions remain unchanged, so the application will continue to work even after rollback.

---

## Troubleshooting

### Issue: Function already exists

**Solution**: This is expected if you've run the migration before. The migration uses `CREATE OR REPLACE FUNCTION` so it will update existing functions.

### Issue: Index already exists

**Solution**: This is expected. The migration uses `CREATE INDEX IF NOT EXISTS` so it will skip existing indexes.

### Issue: Application gets "function not found" error

**Possible Causes**:
1. Migration not executed yet
2. Application pointing to wrong database
3. Function name typo in application code

**Solution**:
- Verify migration executed successfully
- Check Supabase connection string
- Review function calls in API code

### Issue: Performance is still slow

**Possible Causes**:
1. Application still using offset pagination
2. Indexes not being used by query planner
3. Need to run ANALYZE

**Solution**:
```sql
-- Run ANALYZE to update statistics
ANALYZE memories;
ANALYZE comments;
ANALYZE notification_jobs;

-- Check if indexes are being used
EXPLAIN ANALYZE
SELECT * FROM search_memories_cursor('test', 'USER_ID'::UUID, 20, NULL, NULL);
```

Look for index names in the query plan output.

---

## Success Criteria

✅ **Migration Executed Successfully**:
- All indexes created
- All functions created
- No errors in SQL Editor

✅ **Verification Passed**:
- Indexes visible in `pg_indexes`
- Functions visible in `information_schema.routines`
- Monitoring view works

✅ **Application Works**:
- Search API responds correctly
- Jobs API responds correctly
- Backward compatibility maintained (offset still works)

✅ **Performance Improved**:
- Index usage shows in monitoring view
- Query execution times improved
- No degradation in application performance

---

## Next Actions After Migration

1. **Monitor Performance** (Week 1)
   - Check `v_cursor_pagination_indexes` daily
   - Verify index usage is increasing
   - Monitor application logs for errors

2. **Gradual Adoption** (Week 2-4)
   - Frontend components start using cursor pagination
   - Update infinite scroll components
   - Test with real users

3. **Deprecation Path** (Month 2-3)
   - Add warnings to offset-based API calls
   - Update documentation to recommend cursor
   - Plan removal of offset support (optional)

4. **Documentation Updates**
   - Update API documentation with cursor examples
   - Add cursor pagination to developer guide
   - Document best practices for pagination

---

## Support & Questions

- **Documentation**: `docs/CRO-123-Cursor-Pagination-Implementation.md`
- **Migration File**: `supabase/migrations/20251015000002_cursor_pagination_implementation.sql`
- **Linear Issue**: [CRO-123](https://linear.app/tribe-mvp/issue/CRO-123)
- **Code Changes**: Backend APIs + Frontend hooks all deployed

---

## Checklist Summary

**Pre-Migration**:
- [ ] Reviewed migration file
- [ ] Database backup verified
- [ ] Code deployed

**Migration**:
- [ ] Executed migration in SQL Editor
- [ ] Verified success message
- [ ] No errors reported

**Post-Migration**:
- [ ] Indexes created (6 indexes)
- [ ] Functions created (6 functions)
- [ ] Monitoring view works
- [ ] Test query successful

**Validation**:
- [ ] Application APIs work
- [ ] Backward compatibility verified
- [ ] Performance monitoring setup
- [ ] Documentation updated

---

**Migration Ready**: ✅
**Estimated Downtime**: None (backward compatible)
**Risk Level**: Low
**Rollback Available**: Yes
