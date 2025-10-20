# Supabase Backend Audit Report
**Generated:** 2025-10-14
**Project:** Tribe MVP
**Database:** advbcfkisejskhskrmqw.supabase.co

---

## Executive Summary

### Overall Health: 🟢 GOOD
- ✅ **Security**: All 25 tables have RLS enabled
- ⚠️ **Optimization**: 4 unused tables, 195+ indexes (potential over-indexing)
- ⚠️ **Technical Debt**: 1 table with 0 references (`comments`), several low-usage tables
- ✅ **Data Integrity**: 47 foreign key relationships properly configured

---

## 1. Table Usage Analysis

### 🔴 UNUSED TABLES (0 References - Safe to Deprecate)

| Table | Status | Action | Risk |
|-------|--------|--------|------|
| `comments` | ❌ 0 refs | **Remove** | LOW - Has FK constraints from other tables, verify views first |
| `prompt_suggestions` | ❌ 0 refs | **Remove** | LOW - No FK dependencies |
| `notification_preferences_cache` | ❌ 0 refs | **Remove** | LOW - Cache table, verify triggers |
| `user_metadata_values` | ❌ 0 refs | **Remove** | LOW - Check if used by functions |

**Recommendation:** These tables appear unused in application code but may be:
- Used by database functions/triggers
- Used by views
- Planned for future features

**Next Steps:**
1. Check if referenced by RPC functions
2. Check if referenced by database views
3. Review git history for context
4. Consider soft-deprecation first (rename with `deprecated_` prefix)

---

### 🟡 LOW USAGE TABLES (1-2 References - Review Needed)

| Table | Refs | Usage Pattern | Action |
|-------|------|---------------|--------|
| `ai_prompts` | 1 | Single implementation file | ✅ Keep - AI feature |
| `data_deletion_audit` | 1 | Privacy/compliance logging | ✅ Keep - Legal requirement |
| `data_export_jobs` | 1 | GDPR data export | ✅ Keep - Legal requirement |
| `digest_queue` | 1 | Email digest queue | ✅ Keep - Background job |
| `search_analytics` | 1 | Search tracking | ⚠️ Review - May be unused feature |

**Recommendation:** Keep all except possibly `search_analytics`. Verify if search analytics is actively used.

---

### 🟢 ACTIVE TABLES (3+ References)

| Table | Refs | Status |
|-------|------|--------|
| `recipients` | 98 | ✅ Core table |
| `memories` | 75 | ✅ Core table |
| `recipient_groups` | 46 | ✅ Core table |
| `profiles` | 24 | ✅ Core table |
| `summaries` | 19 | ✅ Core table |
| `delivery_jobs` | 16 | ✅ Core table |
| `notification_jobs` | 15 | ✅ Core table |
| `children` | 14 | ✅ Core table |
| `prompt_templates` | 8 | ✅ Active feature |
| `template_analytics` | 8 | ✅ Active feature |
| `responses` | 8 | ✅ Active feature |
| `digest_schedules` | 7 | ✅ Active feature |
| `notification_history` | 5 | ✅ Active feature |
| `invitations` | 5 | ✅ Active feature |
| `invitation_redemptions` | 4 | ✅ Active feature |
| `summary_memories` | 4 | ✅ Active feature |
| `likes` | 4 | ✅ Active feature |
| `notification_delivery_logs` | 3 | ✅ Active feature |

---

## 2. Database Functions (RPC) Analysis

### 🟢 ACTIVE FUNCTIONS (Found in Codebase)

| Function Name | Usage Count | Purpose |
|---------------|-------------|---------|
| `set_config` | 6 | PostgreSQL config management |
| `should_deliver_notification` | 5 | Notification filtering |
| `is_recipient_muted` | 5 | Mute status check |
| `get_effective_notification_settings` | 5 | Notification preferences |
| `bulk_update_group_members` | 4 | Group management |
| `bulk_mute_operation` | 3 | Bulk mute operations |
| `toggle_update_like` | 2 | Like/unlike memories |
| `get_user_metadata_values` | 2 | Metadata retrieval |
| `get_update_likes` | 2 | Like counts |
| `cleanup_expired_mutes` | 2 | Mute cleanup |

**Total Functions Found in Code:** 37 functions actively called

### ⚠️ FUNCTIONS TO AUDIT

Based on migration analysis, you have **112 functions** defined in migrations but only **37** found in application code.

**Recommendation:** Run this query in Supabase to get full function list:
```sql
SELECT
  p.proname as function_name,
  pg_get_function_result(p.oid) as return_type,
  pg_get_functiondef(p.oid) as definition
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
ORDER BY p.proname;
```

Then search for each function in codebase to identify unused functions.

---

## 3. Index Analysis

### 📊 Index Summary

| Table | Index Count | Status |
|-------|-------------|--------|
| `memories` | 27 | ⚠️ **OVER-INDEXED** |
| `notification_history` | 10 | ⚠️ Possibly over-indexed |
| `summary_memories` | 9 | ⚠️ Possibly over-indexed |
| `prompt_templates` | 9 | ⚠️ Possibly over-indexed |
| `notification_jobs` | 6 | ✅ Reasonable |

**Total Indexes:** 195+

### 🔍 Indexes to Review

#### `memories` table (27 indexes)
**Potential redundant indexes:**
- `idx_updates_parent_created` vs `idx_memories_parent_status_created`
- `idx_updates_parent_id` vs `idx_updates_parent_created`
- Multiple metadata GIN indexes may be redundant

**Recommendation:** Run unused index query:
```sql
SELECT
  tablename,
  indexname,
  idx_scan as times_used,
  pg_size_pretty(pg_relation_size(indexrelid)) as index_size
FROM pg_stat_user_indexes
WHERE idx_scan = 0
  AND schemaname = 'public'
  AND indexrelname NOT LIKE '%_pkey'
ORDER BY pg_relation_size(indexrelid) DESC;
```

### 🔴 Legacy Index Names Found

These indexes reference old table names and should be reviewed:
- `updates_pkey` → Should be `memories_pkey`
- `idx_updates_*` → Should be `idx_memories_*`
- `digests_pkey` → Should be `summaries_pkey`
- `idx_digests_*` → Should be `idx_summaries_*`
- `digest_updates_*` → Should be `summary_memories_*`

**Action:** These work fine but indicate incomplete migration. Consider renaming for clarity.

---

## 4. Foreign Key Analysis

### ✅ Data Integrity: EXCELLENT

**Total Foreign Keys:** 47 relationships
**Tables with Most Dependencies:**
- `profiles` (referenced by 12 tables)
- `recipients` (referenced by 11 tables)
- `recipient_groups` (referenced by 9 tables)
- `memories` (referenced by 8 tables)

### 🔒 Deletion Impact Analysis

**High-Risk Tables** (deleting data will cascade to many tables):

1. **`profiles`** → Affects:
   - children, comments, ai_prompts, invitations, likes, memories
   - notification_history, prompt_templates, recipient_groups, recipients
   - search_analytics, summaries, template_analytics, user_metadata_values

2. **`recipients`** → Affects:
   - delivery_jobs, invitation_redemptions, notification_delivery_logs
   - notification_jobs, notification_preferences_cache, responses, summary_memories

3. **`memories`** → Affects:
   - comments, delivery_jobs, likes, notification_jobs, responses, summary_memories

**Recommendation:** Ensure proper `ON DELETE CASCADE` or `ON DELETE RESTRICT` policies are in place.

---

## 5. Views Analysis

### 📋 Active Views

1. **`prompt_analytics`** - Usage: Unknown (need to check)
2. **`recipient_preferences`** - Usage: Unknown (need to check)

**Action Required:** Search codebase for view usage:
```bash
grep -r "from('prompt_analytics')" src/
grep -r "from('recipient_preferences')" src/
```

---

## 6. Storage Buckets

### 🪣 Bucket Configuration

| Bucket | Access | Status |
|--------|--------|--------|
| `feedback-screenshots` | 🌐 PUBLIC | ✅ Correct |
| `media` | 🌐 PUBLIC | ✅ Correct |

**Note:** Public access is appropriate for these use cases. Ensure RLS policies are in place for upload/delete operations.

---

## 7. Security Analysis

### ✅ EXCELLENT: Row Level Security

**All 25 tables have RLS enabled!** This is a best-practice security configuration.

### 🔍 RLS Policy Audit Required

**Next Step:** Need to review RLS policies for each table. Run:
```sql
SELECT
  tablename,
  policyname,
  cmd as command,
  roles,
  qual as using_expression,
  with_check
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
```

**Review for:**
- Missing policies (table has RLS but no policies = inaccessible)
- Overly permissive policies
- Policies using `SECURITY DEFINER` functions (security risk)

---

## 8. Triggers Analysis

### 🔧 Active Triggers (Partial List)

| Table | Trigger | Event | Purpose |
|-------|---------|-------|---------|
| `children` | `update_children_updated_at` | UPDATE | Timestamp management |
| `comments` | `comments_search_vector_update` | INSERT, UPDATE | Full-text search |

**Status:** Trigger list was truncated. Need full list from:
```sql
SELECT
  event_object_table as table_name,
  trigger_name,
  string_agg(event_manipulation, ', ') as events,
  action_timing as timing,
  action_statement as function
FROM information_schema.triggers
WHERE trigger_schema = 'public'
GROUP BY event_object_table, trigger_name, action_timing, action_statement
ORDER BY event_object_table, trigger_name;
```

---

## 9. Cleanup Recommendations

### Priority 1: Quick Wins (Low Risk)

1. **Drop unused tables** (after final verification):
   ```sql
   -- Verify no FK dependencies first!
   DROP TABLE IF EXISTS prompt_suggestions;
   DROP TABLE IF EXISTS notification_preferences_cache;
   DROP TABLE IF EXISTS user_metadata_values;
   ```

2. **Check `comments` table**:
   - Has 0 code references but has FK from `memories` table
   - May be used by database functions or planned feature
   - **Action:** Verify with team before dropping

### Priority 2: Index Optimization

1. **Identify unused indexes:**
   ```sql
   -- Run query above to find idx_scan = 0
   ```

2. **Drop unused indexes** (safe operation, can be recreated):
   ```sql
   -- Example (after verification):
   -- DROP INDEX idx_unused_index;
   ```

3. **Review `memories` table indexes** (27 is excessive)

### Priority 3: Function Cleanup

1. **Get full function list and check usage:**
   - Export all 112 functions
   - Search codebase for each function
   - Identify unused functions
   - Drop unused functions

2. **Review test/sample data functions:**
   - `create_sample_email_data`
   - `cleanup_sample_email_data`
   - These should NOT be in production!

### Priority 4: Rename Legacy Objects

1. **Rename indexes with old table names:**
   ```sql
   ALTER INDEX updates_pkey RENAME TO memories_pkey;
   ALTER INDEX digests_pkey RENAME TO summaries_pkey;
   -- Continue for all idx_updates_* and idx_digests_*
   ```

---

## 10. Performance Recommendations

### 🚀 Optimization Opportunities

1. **Table Size Analysis Needed**
   ```sql
   SELECT
     tablename,
     pg_size_pretty(pg_total_relation_size('public.'||tablename)) as total_size,
     pg_size_pretty(pg_relation_size('public.'||tablename)) as table_size,
     pg_size_pretty(pg_total_relation_size('public.'||tablename) - pg_relation_size('public.'||tablename)) as index_size
   FROM pg_tables
   WHERE schemaname = 'public'
   ORDER BY pg_total_relation_size('public.'||tablename) DESC;
   ```

2. **Slow Query Analysis**
   - Review `pg_stat_statements` for slow queries
   - Check if indexes are being used (high seq_scan count)

3. **Vacuuming and Maintenance**
   - Check last vacuum times
   - Ensure autovacuum is properly configured

---

## 11. Next Steps

### Immediate Actions

- [ ] Run unused index query in Supabase
- [ ] Get full RLS policy list
- [ ] Get complete trigger list
- [ ] Export all 112 functions and verify usage
- [ ] Check view usage in codebase
- [ ] Run table size analysis

### Short Term (This Week)

- [ ] Create list of confirmed unused functions
- [ ] Verify unused tables with team
- [ ] Document which objects are safe to remove
- [ ] Create test migration for cleanup

### Long Term (Next Sprint)

- [ ] Drop unused indexes
- [ ] Drop unused functions
- [ ] Drop unused tables (after verification)
- [ ] Rename legacy index names
- [ ] Optimize over-indexed tables

---

## 12. Risk Assessment

| Action | Risk Level | Impact | Reversibility |
|--------|-----------|--------|---------------|
| Drop unused indexes | 🟢 LOW | Performance may degrade if index was actually used | Easy - Recreate index |
| Drop unused functions | 🟡 MEDIUM | May break RLS policies or triggers | Moderate - Restore from migration |
| Drop unused tables | 🔴 HIGH | Data loss, may break FK constraints | Difficult - Restore from backup |
| Rename indexes | 🟢 LOW | None (internal change) | Easy - Rename back |

---

## Appendix A: SQL Queries for Further Analysis

### Get All Functions with Definitions
```sql
SELECT
  p.proname as function_name,
  pg_get_functiondef(p.oid) as definition
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
ORDER BY p.proname;
```

### Get Unused Indexes
```sql
SELECT
  schemaname,
  tablename,
  indexname,
  idx_scan as times_used,
  pg_size_pretty(pg_relation_size(indexrelid)) as index_size
FROM pg_stat_user_indexes
WHERE idx_scan < 10
  AND schemaname = 'public'
  AND indexrelname NOT LIKE '%_pkey'
ORDER BY pg_relation_size(indexrelid) DESC;
```

### Get Table Sizes with Index Overhead
```sql
SELECT
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as total_size,
  pg_size_pretty(pg_relation_size(schemaname||'.'||tablename)) as table_size,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename) - pg_relation_size(schemaname||'.'||tablename)) as index_size,
  round(100.0 * (pg_total_relation_size(schemaname||'.'||tablename) - pg_relation_size(schemaname||'.'||tablename)) / NULLIF(pg_total_relation_size(schemaname||'.'||tablename), 0), 2) as index_percentage
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

### Get All RLS Policies
```sql
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
```

### Check for Functions Used in Policies
```sql
SELECT DISTINCT
  tablename,
  policyname,
  regexp_matches(qual::text, '([a-z_]+)\(', 'g') as functions_in_qual
FROM pg_policies
WHERE schemaname = 'public'
  AND qual IS NOT NULL;
```

---

**End of Report**
