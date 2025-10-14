# Supabase Backend Audit - Quick Start Guide

## 📋 What You Have

I've created comprehensive tools to audit your Supabase backend and identify objects that can be deprecated:

### Generated Files

1. **[supabase-audit-queries.md](./supabase-audit-queries.md)** - Ready-to-run SQL queries with instructions
2. **[supabase-audit-queries.sql](./supabase-audit-queries.sql)** - All queries in one SQL file
3. **[migration-analysis.md](./migration-analysis.md)** - Analysis of all your migration files
4. **[docs/supabase-audit-guide.md](./docs/supabase-audit-guide.md)** - Comprehensive audit guide

### Scripts

1. **[scripts/audit-supabase-simple.js](./scripts/audit-supabase-simple.js)** - Generates audit queries
2. **[scripts/audit-supabase-sql.sql](./scripts/audit-supabase-sql.sql)** - 20+ comprehensive SQL queries
3. **[scripts/analyze-migrations.js](./scripts/analyze-migrations.js)** - Analyzes migration files
4. **[scripts/audit-supabase-backend.ts](./scripts/audit-supabase-backend.ts)** - Advanced TypeScript audit tool (requires setup)

## 🚀 Quick Start (5 Minutes)

### Step 1: Run Migration Analysis (Already Done!)

The migration analysis has already been generated and shows:
- **30 Tables** created across 38 migrations
- **112 Functions** (many might be unused)
- **35 Triggers**
- **11 Policies** (likely more exist, detection was partial)
- **28 Indexes**
- **8 Views**
- **47 Objects** dropped in migrations

### Step 2: Run SQL Queries in Supabase

1. Open your [Supabase Dashboard](https://app.supabase.com)
2. Go to your project: **advbcfkisejskhskrmqw**
3. Click **SQL Editor** in the left sidebar
4. Open the file: `supabase-audit-queries.sql`
5. Copy and run each query section
6. Export results to CSV or copy to a spreadsheet

### Step 3: Key Queries to Run First

Start with these essential queries from `scripts/audit-supabase-sql.sql`:

#### 1. Summary Query (Run This First!)
```sql
-- Get counts of all object types
SELECT
  'Tables' as object_type,
  count(*)::text as count
FROM pg_tables
WHERE schemaname = 'public'
UNION ALL
SELECT 'RLS Policies', count(*)::text FROM pg_policies WHERE schemaname = 'public'
UNION ALL
SELECT 'Functions', count(*)::text FROM pg_proc p JOIN pg_namespace n ON p.pronamespace = n.oid WHERE n.nspname = 'public' AND p.prokind = 'f';
```

#### 2. Security Issues
```sql
-- Tables WITHOUT RLS (Security Risk!)
SELECT
  tablename as table_name,
  '⚠️ RLS not enabled!' as warning
FROM pg_tables
WHERE rowsecurity = false
  AND schemaname = 'public'
ORDER BY tablename;

-- Tables WITH RLS but NO policies (Unusable!)
SELECT
  t.tablename as table_name,
  '⚠️ RLS enabled but no policies!' as warning
FROM pg_tables t
WHERE t.rowsecurity = true
  AND t.schemaname = 'public'
  AND NOT EXISTS (
    SELECT 1 FROM pg_policies p
    WHERE p.schemaname = t.schemaname AND p.tablename = t.tablename
  );
```

#### 3. Performance Issues
```sql
-- Unused Indexes (Can Be Dropped)
SELECT
  tablename as table_name,
  indexname as index_name,
  idx_scan as times_used,
  pg_size_pretty(pg_relation_size(indexrelid)) as index_size
FROM pg_stat_user_indexes
WHERE idx_scan = 0
  AND schemaname = 'public'
  AND indexrelname NOT LIKE '%_pkey'
ORDER BY pg_relation_size(indexrelid) DESC;

-- Table Sizes
SELECT
  tablename as table_name,
  pg_size_pretty(pg_total_relation_size('public.'||tablename)) as total_size,
  pg_size_pretty(pg_relation_size('public.'||tablename)) as table_size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size('public.'||tablename) DESC;
```

#### 4. All Database Objects
```sql
-- All Tables
SELECT tablename, CASE WHEN rowsecurity THEN '✅' ELSE '❌' END as rls
FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename;

-- All Functions
SELECT p.proname as function_name, pg_get_function_result(p.oid) as return_type
FROM pg_proc p JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public' ORDER BY p.proname;

-- All Policies
SELECT tablename, policyname, cmd as command
FROM pg_policies WHERE schemaname = 'public'
ORDER BY tablename, policyname;
```

## 📊 What The Migration Analysis Shows

From `migration-analysis.md`:

### Tables (30 Total)
- `ai_prompts`, `children`, `comments`, `data_deletion_audit`, `data_export_jobs`
- `delivery_jobs`, `digest_queue`, `digest_schedules`, `digest_updates`, `digests`
- `group_memberships`, `invitation_redemptions`, `invitations`, `likes`
- `notification_delivery_logs`, `notification_history`, `notification_jobs`
- `notification_preferences_cache`, `privacy_settings`, `profiles`
- `prompt_suggestions`, `prompt_templates`, `recipient_groups`, `recipients`
- `responses`, `search_analytics`, `template_analytics`, `updates`
- `user_metadata_values`

### Functions (112 Total!)
Key functions to review:
- Cleanup functions: `cleanup_*` (7 functions)
- Notification functions: `get_notification_*`, `enqueue_*` (10+ functions)
- Dashboard functions: `get_dashboard_*` (3 functions)
- Template functions: `get_templates_*`, `create_template_*` (4 functions)
- Export/Privacy: `get_user_export_data`, `delete_user_data` (3 functions)

### Potential Cleanup Candidates

Based on migration analysis, review these for potential deprecation:

1. **Test/Sample Data Functions** (likely safe to remove in production):
   - `create_sample_email_data`
   - `cleanup_sample_email_data`

2. **Old/Replaced Functions** (check if still used):
   - Functions that were likely replaced in later migrations
   - Check migration history for DROP FUNCTION statements

3. **Unused Indexes** (run query to find):
   - 28 indexes created, some might be unused
   - Dropped 47 objects in migrations (already cleaned up!)

## 🎯 Recommended Action Plan

### Phase 1: Discovery (Today)
1. ✅ Review migration analysis (already generated)
2. Run summary queries in Supabase SQL Editor
3. Export all query results to spreadsheet
4. Create initial inventory of all objects

### Phase 2: Analysis (This Week)
1. Search your codebase for references to each table/function
2. Mark objects as "Used", "Unused", or "Unknown"
3. For "Unknown", investigate git history and PRs
4. Identify low-risk candidates (unused indexes, test functions)

### Phase 3: Testing (Next Week)
1. Create test migration to drop low-risk items
2. Test in staging/development environment
3. Monitor for errors
4. Verify all features still work

### Phase 4: Cleanup (Future)
1. Create production migration for approved deletions
2. Execute during low-traffic period
3. Monitor for issues
4. Keep backups of dropped objects

## 🔍 How to Check if Objects Are Used

### Search Codebase for References

```bash
# Search for table references
grep -r "from('table_name')" src/
grep -r "table_name" src/

# Search for function calls
grep -r "rpc('function_name')" src/
grep -r "function_name" src/

# Search for policy names (in migrations)
grep -r "policy_name" supabase/migrations/
```

### Check Dependencies

1. **Functions**: Look for calls in:
   - RLS policies (`qual` and `with_check` expressions)
   - Triggers (`action_statement`)
   - Other functions (function body)
   - Application code (API calls)

2. **Tables**: Check for:
   - Foreign key references
   - Application queries
   - Migration references

3. **Policies**: Check if:
   - Table has RLS enabled
   - Policy is actually enforced
   - Application relies on it

## 📝 Example: Finding Unused Functions

```sql
-- Get all functions and their definitions
SELECT
  p.proname as function_name,
  pg_get_functiondef(p.oid) as definition
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
ORDER BY p.proname;
```

Then for each function:
1. Search codebase: `grep -r "rpc('function_name')" src/`
2. Check if used in policies: `grep "function_name" scripts/audit-supabase-sql.sql`
3. Check if used in triggers: Look at trigger definitions
4. If not found anywhere → Candidate for deprecation!

## ⚠️ Important Warnings

### DO NOT Remove Without Testing
- Tables with foreign keys
- Functions used in RLS policies or triggers
- Primary key or foreign key constraints
- Recently added objects (might not be used yet)

### Always Backup First
```sql
-- Create backup table before dropping
CREATE TABLE backup_table_name AS SELECT * FROM table_name;

-- Create backup of function
-- Copy the CREATE FUNCTION statement before dropping
```

### Test Thoroughly
- Run all automated tests
- Test all user flows manually
- Check error logs
- Monitor production for 24-48 hours after changes

## 📞 Need Help?

1. **Review the guides:**
   - [docs/supabase-audit-guide.md](./docs/supabase-audit-guide.md) - Comprehensive guide
   - [migration-analysis.md](./migration-analysis.md) - Your current database objects

2. **Run the queries:**
   - [supabase-audit-queries.sql](./supabase-audit-queries.sql) - Quick queries
   - [scripts/audit-supabase-sql.sql](./scripts/audit-supabase-sql.sql) - Detailed queries

3. **Check documentation:**
   - [Supabase RLS Docs](https://supabase.com/docs/guides/auth/row-level-security)
   - [PostgreSQL System Catalogs](https://www.postgresql.org/docs/current/catalogs.html)

## 🎉 Summary

You now have:
- ✅ Complete list of all database objects from migrations
- ✅ SQL queries to extract actual database state
- ✅ Comprehensive audit guide
- ✅ Analysis tools for finding unused objects
- ✅ Step-by-step cleanup process

**Next Step:** Open Supabase Dashboard and run the SQL queries to see your actual database state!
