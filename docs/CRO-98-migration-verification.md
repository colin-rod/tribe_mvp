# CRO-98: Migration Verification Guide

**Migration**: 20251016000001_fix_n_plus_1_response_stats.sql
**Status**: ✅ EXECUTED
**Date**: 2025-10-16

## Verification Steps

### 1. Verify Functions Were Created

Run in Supabase SQL Editor:

```sql
-- Check all three functions exist
SELECT
  proname AS function_name,
  pg_get_function_arguments(oid) AS arguments,
  pronargs AS num_args
FROM pg_proc
WHERE proname IN (
  'get_update_response_stats',
  'get_user_likes_for_updates',
  'get_recent_updates_with_all_stats'
)
AND pronamespace = 'public'::regnamespace;
```

**Expected Result**: 3 rows (one for each function)

### 2. Verify Indexes Were Created

```sql
-- Check indexes exist
SELECT
  schemaname,
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE indexname IN (
  'idx_responses_update_stats_agg',
  'idx_likes_parent_update_batch'
);
```

**Expected Result**: 2 rows (one for each index)

### 3. Verify Monitoring View

```sql
-- Check monitoring view
SELECT * FROM v_n_plus_1_prevention;
```

**Expected Result**: 3 rows showing function names and benefits

### 4. Test Batch Response Stats Function

```sql
-- Test with empty array (should return no rows)
SELECT * FROM get_update_response_stats(ARRAY[]::UUID[]);

-- Test with actual update IDs (replace with real IDs from your database)
SELECT * FROM get_update_response_stats(ARRAY[
  (SELECT id FROM memories LIMIT 1)
]::UUID[]);
```

**Expected Result**:
- Empty array → 0 rows
- With real IDs → rows with update_id, response_count, last_response_at

### 5. Test Application Code

The TypeScript code in `src/lib/updates.ts` should now automatically use the new batch function. To verify:

1. Start your development server
2. Load the dashboard
3. Check browser console or server logs for:
   - "Getting response counts for updates (batch)"
   - "Batch response stats retrieved"
   - Look for performance metrics in logs

### 6. Performance Verification

Check query performance improvement:

```sql
-- Check function execution stats
SELECT
  funcname,
  calls,
  total_time,
  mean_time,
  max_time
FROM pg_stat_user_functions
WHERE funcname LIKE 'get_update%' OR funcname LIKE 'get_user_likes%';
```

## Troubleshooting

### If Functions Don't Exist

Re-run the migration:
```sql
-- The migration is idempotent (can be run multiple times)
-- Copy and paste the entire migration file again
```

### If TypeScript Errors Occur

The code uses type casting because the function isn't in generated types yet:
```typescript
// This is expected and safe
.rpc('get_update_response_stats' as 'analyze_content_formats', ...)
```

To regenerate types:
```bash
npx supabase gen types typescript --linked > src/lib/types/database.types.ts
```

### If No Performance Improvement

1. Check that dashboard is loading updates
2. Verify logs show "CRO-98 optimized" message
3. Check `queriesEliminated` metric in logs
4. Run EXPLAIN ANALYZE on the function to verify index usage

## Success Criteria

✅ All 3 functions created
✅ All 2 indexes created
✅ Monitoring view accessible
✅ TypeScript code compiles
✅ Dashboard loads without errors
✅ Logs show batch query instead of N individual queries
✅ Performance improvement visible in metrics

---

**Next Steps**: Continue with Phase 3 (React Query implementation)
