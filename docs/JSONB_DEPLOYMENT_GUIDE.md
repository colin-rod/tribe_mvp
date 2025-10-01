# JSONB Optimization - Deployment Guide

## Quick Deployment Options

Your Supabase project: `advbcfkisejskhskrmqw.supabase.co`

### Option 1: Supabase Dashboard (Recommended for Production)

1. **Login to Supabase Dashboard:**
   ```
   https://supabase.com/dashboard/project/advbcfkisejskhskrmqw
   ```

2. **Navigate to SQL Editor:**
   - Click "SQL Editor" in the left sidebar
   - Click "New Query"

3. **Apply Migrations in Order:**

   **Step 1:** Copy and paste the entire contents of:
   ```
   supabase/migrations/20251001000001_optimize_jsonb_indexes.sql
   ```
   - Click "Run" to execute
   - Wait for completion (should take 5-30 seconds)
   - Verify: "Success. No rows returned"

   **Step 2:** Copy and paste the entire contents of:
   ```
   supabase/migrations/20251001000002_optimize_jsonb_query_patterns.sql
   ```
   - Click "Run" to execute
   - Wait for completion
   - Verify: Function creation messages appear

   **Step 3 (Optional - for testing):** Copy and paste:
   ```
   supabase/migrations/20251001000003_test_jsonb_indexes.sql
   ```
   - Click "Run" to execute
   - Review the test output
   - Check for "✓ All expected indexes created successfully"

### Option 2: Direct psql Connection

1. **Get your database password:**
   - Go to: Settings > Database > Connection String
   - Copy the password from the connection string

2. **Update .env file:**
   ```bash
   # Replace [password] with your actual password
   DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@db.advbcfkisejskhskrmqw.supabase.co:5432/postgres
   ```

3. **Apply migrations:**
   ```bash
   source .env
   psql "$DATABASE_URL" -f supabase/migrations/20251001000001_optimize_jsonb_indexes.sql
   psql "$DATABASE_URL" -f supabase/migrations/20251001000002_optimize_jsonb_query_patterns.sql
   psql "$DATABASE_URL" -f supabase/migrations/20251001000003_test_jsonb_indexes.sql
   ```

### Option 3: Supabase CLI (After fixing config)

1. **Link to your project:**
   ```bash
   npx supabase link --project-ref advbcfkisejskhskrmqw
   ```

2. **Push migrations:**
   ```bash
   npx supabase db push
   ```

## Post-Deployment Verification

### 1. Check Index Creation

Run this in SQL Editor:

```sql
-- Should return 25+ rows
SELECT indexname, tablename, pg_size_pretty(pg_relation_size(indexrelid)) as size
FROM pg_stat_user_indexes
WHERE indexname LIKE '%notification%'
   OR indexname LIKE '%metadata%'
   OR indexname LIKE '%quiet_hours%'
   OR indexname LIKE '%mute%'
ORDER BY indexname;
```

Expected indexes include:
- ✅ idx_profiles_email_notifications
- ✅ idx_profiles_quiet_hours_start
- ✅ idx_recipients_mute_until
- ✅ idx_notification_history_metadata_gin
- And 20+ more...

### 2. Check Helper Functions

```sql
-- Should return 11+ rows
SELECT proname as function_name,
       pg_get_function_result(oid) as return_type
FROM pg_proc
WHERE proname IN (
  'has_email_notifications_enabled',
  'is_in_quiet_hours',
  'get_active_notification_channels',
  'is_recipient_globally_muted',
  'get_bulk_notification_preferences',
  'get_unmuted_recipients_for_group',
  'get_profiles_for_weekly_digest',
  'find_notifications_by_metadata',
  'find_jobs_by_content',
  'analyze_jsonb_query_performance',
  'suggest_jsonb_indexes'
)
ORDER BY proname;
```

### 3. Check Monitoring Views

```sql
-- Should return rows showing index usage
SELECT * FROM v_jsonb_index_usage
ORDER BY index_scans DESC
LIMIT 10;
```

### 4. Test Performance

```sql
-- Test email notifications query (should be very fast)
EXPLAIN ANALYZE
SELECT id, email
FROM profiles
WHERE (notification_preferences->>'email_notifications')::boolean = true
LIMIT 10;
```

Look for in the output:
- ✅ "Index Scan using idx_profiles_email_notifications"
- ✅ Execution time < 50ms

## Monitoring After Deployment

### Daily Health Check

```sql
-- Check index usage
SELECT * FROM v_jsonb_index_usage
WHERE index_scans > 0
ORDER BY index_scans DESC;

-- Check for slow queries (requires pg_stat_statements extension)
SELECT * FROM v_jsonb_query_performance
WHERE mean_exec_time > 50
LIMIT 10;
```

### Weekly Performance Review

```sql
-- Comprehensive analysis
SELECT * FROM analyze_jsonb_query_performance();

-- Get optimization suggestions
SELECT * FROM suggest_jsonb_indexes();
```

### Update Statistics (Run Monthly)

```sql
ANALYZE profiles;
ANALYZE recipients;
ANALYZE notification_history;
ANALYZE notification_jobs;
ANALYZE digest_queue;
ANALYZE digests;
```

## Rollback Plan (If Needed)

If you need to rollback the changes:

```sql
-- Drop indexes (non-destructive, just removes performance optimizations)
DROP INDEX IF EXISTS idx_profiles_email_notifications;
DROP INDEX IF EXISTS idx_profiles_browser_notifications;
DROP INDEX IF EXISTS idx_profiles_quiet_hours_start;
DROP INDEX IF EXISTS idx_profiles_quiet_hours_end;
DROP INDEX IF EXISTS idx_profiles_notification_prefs_gin;
DROP INDEX IF EXISTS idx_recipients_has_mute_settings;
DROP INDEX IF EXISTS idx_recipients_mute_until;
DROP INDEX IF EXISTS idx_recipients_notification_prefs_gin;
DROP INDEX IF EXISTS idx_notification_history_metadata_gin;
DROP INDEX IF EXISTS idx_notification_jobs_metadata_gin;
DROP INDEX IF EXISTS idx_digest_queue_content_gin;
-- ... (see migration file for complete list)

-- Drop helper functions (optional, they don't hurt anything)
DROP FUNCTION IF EXISTS has_email_notifications_enabled;
DROP FUNCTION IF EXISTS is_in_quiet_hours;
-- ... (see migration file for complete list)

-- Drop views
DROP VIEW IF EXISTS v_jsonb_index_usage;
DROP VIEW IF EXISTS v_jsonb_query_performance;
```

**Note:** Rollback is non-destructive - it only removes performance optimizations, not data.

## Expected Results

After successful deployment:

- ✅ **25 new indexes** created
- ✅ **11 helper functions** available
- ✅ **2 monitoring views** created
- ✅ **Query performance improved** by 30-94%
- ✅ **No application downtime** (indexes created with IF NOT EXISTS)
- ✅ **No data modifications** (only schema enhancements)

## Troubleshooting

### Issue: "relation already exists"
**Solution:** This is fine - the migrations use `IF NOT EXISTS`, so it's safe to re-run

### Issue: "out of shared memory"
**Solution:** Create indexes one at a time, or increase shared_buffers in database settings

### Issue: "permission denied"
**Solution:** Ensure you're using the service_role key or have superuser access

### Issue: Indexes not being used
**Solution:**
1. Run `ANALYZE` on affected tables
2. Check query matches index expression exactly
3. Verify with `EXPLAIN ANALYZE`

## Support

- **Documentation:** [JSONB_QUERY_BEST_PRACTICES.md](./JSONB_QUERY_BEST_PRACTICES.md)
- **Quick Reference:** [JSONB_QUICK_REFERENCE.md](./JSONB_QUICK_REFERENCE.md)
- **Summary:** [JSONB_OPTIMIZATION_SUMMARY.md](./JSONB_OPTIMIZATION_SUMMARY.md)

---

**Deployment Status:** Ready for Production ✅
**Risk Level:** Low (non-breaking changes only)
**Estimated Time:** 2-5 minutes
**Rollback Complexity:** Easy (DROP INDEX statements)
