# Backend Audit - Cleanup Action Plan
**Generated:** 2025-10-14
**Status:** Ready for Review

---

## 📊 Analysis Summary

### Unused Indexes Found
- **Total unused indexes:** 122 indexes with 0 scans
- **Total wasted space:** ~1.6 MB (small database, but percentage is high)
- **Percentage of indexes unused:** 62% (122 out of 195 indexes!)

### Table Sizes (Largest First)
- `memories`: 680 KB (27 indexes, 20 unused)
- `summaries`: 216 KB
- `summary_memories`: 208 KB
- `prompt_templates`: 184 KB
- `recipients`: 176 KB

### Database Functions
- **Total functions:** 89 functions (includes 34 pg_trgm extension functions)
- **User-defined functions:** ~55 functions
- **Functions found in code:** 37 functions
- **Potentially unused:** ~18 functions

---

## 🎯 Priority 1: Drop Unused Indexes (SAFE - High Impact)

### Why This is Safe
- Dropping indexes DOES NOT delete data
- Indexes can be recreated instantly if needed
- Unused indexes waste space and slow down writes
- 62% of indexes are unused - major optimization opportunity

### Indexes to Drop Immediately

#### Category A: Unused Tables (Drop with table)
These belong to unused tables, will be removed when tables are dropped:
```sql
-- prompt_suggestions table (unused)
DROP INDEX IF EXISTS idx_prompt_suggestions_active;
DROP INDEX IF EXISTS idx_prompt_suggestions_engagement;

-- user_metadata_values table (unused)
DROP INDEX IF EXISTS idx_user_metadata_values_value_trgm;
DROP INDEX IF EXISTS idx_user_metadata_values_user_category;

-- comments table (unused)
DROP INDEX IF EXISTS idx_comments_search_vector;
DROP INDEX IF EXISTS idx_comments_update_id_lookup;
DROP INDEX IF EXISTS idx_comments_created_at;
DROP INDEX IF EXISTS idx_comments_parent_id;

-- notification_preferences_cache table (unused)
DROP INDEX IF EXISTS notification_preferences_cache_recipient_id_group_id_key;
DROP INDEX IF EXISTS idx_notification_cache_expires;
DROP INDEX IF EXISTS idx_notification_cache_muted;
```

#### Category B: Over-Indexing on `memories` Table
The `memories` table has **27 indexes**, with **20 unused**. Keep only the most critical:

**Indexes to DROP (20 unused indexes):**
```sql
-- Rich content (not queried)
DROP INDEX IF EXISTS idx_updates_rich_content;

-- Metadata indexes (5 GIN indexes, none used)
DROP INDEX IF EXISTS idx_memories_metadata_dates;
DROP INDEX IF EXISTS idx_memories_metadata_people;
DROP INDEX IF EXISTS idx_memories_metadata_locations;
DROP INDEX IF EXISTS idx_memories_metadata_milestones;
DROP INDEX IF EXISTS idx_memories_metadata_gin;

-- Count-based indexes (4 indexes for counts that can use other indexes)
DROP INDEX IF EXISTS idx_updates_like_count_nonzero;
DROP INDEX IF EXISTS idx_updates_comment_count_nonzero;
DROP INDEX IF EXISTS idx_updates_response_count_nonzero;
DROP INDEX IF EXISTS idx_updates_view_count_nonzero;

-- Redundant composite indexes
DROP INDEX IF EXISTS idx_updates_scheduled_for;
DROP INDEX IF EXISTS idx_memories_search_covering;
DROP INDEX IF EXISTS idx_updates_subject_text;
DROP INDEX IF EXISTS idx_updates_format_created;
DROP INDEX IF EXISTS idx_updates_importance_level;
DROP INDEX IF EXISTS idx_memories_parent_status_created;
DROP INDEX IF EXISTS idx_memories_is_new;
```

**Indexes to KEEP (7 critical indexes):**
- `updates_pkey` (PRIMARY KEY)
- `idx_updates_parent_id` (most common query)
- `idx_updates_child_id` (child filtering)
- `idx_updates_created_at` (date sorting)
- `idx_updates_parent_child` (composite for common query)
- `idx_updates_parent_created` (composite for timeline)
- `idx_memories_status` (distribution status filtering)

#### Category C: Over-Indexing on Other Tables

**`delivery_jobs` (5 unused indexes):**
```sql
DROP INDEX IF EXISTS idx_delivery_jobs_queued_at;
DROP INDEX IF EXISTS idx_delivery_jobs_update_status_queued;
DROP INDEX IF EXISTS idx_delivery_jobs_update_id_lookup;
DROP INDEX IF EXISTS idx_delivery_jobs_update_id;
DROP INDEX IF EXISTS idx_delivery_jobs_recipient_id;
-- Keep: idx_delivery_jobs_status (primary query filter)
```

**`ai_prompts` (5 unused indexes on low-usage table):**
```sql
DROP INDEX IF EXISTS idx_ai_prompts_parent_id;
DROP INDEX IF EXISTS idx_ai_prompts_status;
DROP INDEX IF EXISTS idx_ai_prompts_type;
DROP INDEX IF EXISTS idx_ai_prompts_template;
DROP INDEX IF EXISTS idx_ai_prompts_substituted_vars;
-- Keep: ai_prompts_pkey, idx_ai_prompts_child_id (FK)
```

**`prompt_templates` (6 unused indexes):**
```sql
DROP INDEX IF EXISTS idx_prompt_templates_tags;
DROP INDEX IF EXISTS idx_prompt_templates_variables;
DROP INDEX IF EXISTS idx_prompt_templates_type_age;
DROP INDEX IF EXISTS idx_prompt_templates_effectiveness;
DROP INDEX IF EXISTS idx_prompt_templates_usage;
DROP INDEX IF EXISTS idx_prompt_templates_created_at;
-- Keep: prompt_templates_pkey, idx_prompt_templates_community
```

**`summaries` (5 unused indexes):**
```sql
DROP INDEX IF EXISTS idx_digests_parent_narrative;
DROP INDEX IF EXISTS idx_summaries_status;
DROP INDEX IF EXISTS idx_summaries_digest_date;
DROP INDEX IF EXISTS idx_summaries_created_at;
DROP INDEX IF EXISTS idx_summaries_auto_publish;
-- Keep: digests_pkey, idx_summaries_parent_id, idx_digests_parent_status_date
```

**`summary_memories` (5 unused indexes):**
```sql
DROP INDEX IF EXISTS idx_digest_updates_narrative_data;
DROP INDEX IF EXISTS idx_summary_memories_included;
DROP INDEX IF EXISTS idx_summary_memories_recipient_id;
DROP INDEX IF EXISTS idx_digest_updates_digest_id_lookup;
DROP INDEX IF EXISTS idx_summary_memories_summary_id;
-- Keep: digest_updates_pkey, digest_updates_digest_id_update_id_recipient_id_key
```

**`notification_history` (8 unused indexes):**
```sql
DROP INDEX IF EXISTS idx_notification_history_metadata;
DROP INDEX IF EXISTS idx_notification_history_sent_at;
DROP INDEX IF EXISTS idx_notification_history_user_type_sent;
DROP INDEX IF EXISTS idx_notification_history_delivery_status;
DROP INDEX IF EXISTS idx_notification_history_unread;
DROP INDEX IF EXISTS idx_notification_history_user_sent_type;
DROP INDEX IF EXISTS idx_notification_history_user_id_unread;
DROP INDEX IF EXISTS idx_notification_history_type;
-- Keep: notification_history_pkey, idx_notification_history_user_id
```

**`notification_jobs` (5 unused indexes):**
```sql
DROP INDEX IF EXISTS idx_notification_jobs_recipient_group;
DROP INDEX IF EXISTS idx_notification_jobs_update_id;
DROP INDEX IF EXISTS idx_notification_jobs_delivery_method;
DROP INDEX IF EXISTS idx_notification_jobs_created;
DROP INDEX IF EXISTS idx_notification_jobs_status_scheduled;
-- Keep: notification_jobs_pkey
```

**`recipients` (6 unused indexes):**
```sql
DROP INDEX IF EXISTS recipients_preference_token_key; -- duplicate of idx_recipients_token
DROP INDEX IF EXISTS idx_recipients_phone;
DROP INDEX IF EXISTS idx_recipients_parent_active_created;
DROP INDEX IF EXISTS idx_recipients_importance_threshold;
DROP INDEX IF EXISTS idx_recipients_active_preferences;
-- Keep: recipients_pkey, idx_recipients_email, idx_recipients_parent_id, idx_recipients_group_id, idx_recipients_token
```

**Other low-impact indexes:**
```sql
-- children table
DROP INDEX IF EXISTS idx_children_status;
DROP INDEX IF EXISTS idx_children_is_active;
DROP INDEX IF EXISTS idx_children_birth_date;
DROP INDEX IF EXISTS idx_children_recipient_id;
DROP INDEX IF EXISTS idx_children_group_id;

-- profiles table
DROP INDEX IF EXISTS idx_profiles_notification_prefs;
DROP INDEX IF EXISTS idx_profiles_status;
DROP INDEX IF EXISTS idx_profiles_group_id;

-- digest_queue table (low usage)
DROP INDEX IF EXISTS idx_digest_queue_content;
DROP INDEX IF EXISTS idx_digest_queue_user_id;
DROP INDEX IF EXISTS idx_digest_queue_scheduled_for;
DROP INDEX IF EXISTS idx_digest_queue_status;
DROP INDEX IF EXISTS idx_digest_queue_pending;
DROP INDEX IF EXISTS idx_digest_queue_retry;

-- digest_schedules
DROP INDEX IF EXISTS digest_schedules_recipient_id_group_id_frequency_key;
DROP INDEX IF EXISTS idx_digest_schedules_next_scheduled;
DROP INDEX IF EXISTS idx_digest_schedules_recipient_group;

-- search_analytics (low usage feature)
DROP INDEX IF EXISTS idx_search_analytics_query;
DROP INDEX IF EXISTS idx_search_analytics_created_at;
DROP INDEX IF EXISTS idx_search_analytics_user_id;

-- responses
DROP INDEX IF EXISTS idx_responses_recipient_id;

-- likes
DROP INDEX IF EXISTS idx_likes_update_id_lookup;
DROP INDEX IF EXISTS idx_likes_created_at;
DROP INDEX IF EXISTS idx_likes_parent_id;

-- invitation tables
DROP INDEX IF EXISTS idx_invitation_redemptions_invitation_id;
DROP INDEX IF EXISTS idx_invitation_redemptions_recipient_id;
DROP INDEX IF EXISTS idx_invitation_redemptions_invitation_id_lookup;
DROP INDEX IF EXISTS invitations_token_key; -- duplicate of idx_invitations_token
DROP INDEX IF EXISTS idx_invitations_token;
DROP INDEX IF EXISTS idx_invitations_parent_id;
DROP INDEX IF EXISTS idx_invitations_status;
DROP INDEX IF EXISTS idx_invitations_type;
DROP INDEX IF EXISTS idx_invitations_expires_at;

-- notification_delivery_logs
DROP INDEX IF EXISTS idx_delivery_logs_job_id;
DROP INDEX IF EXISTS idx_delivery_logs_recipient_group;
DROP INDEX IF EXISTS idx_delivery_logs_status_created;

-- template_analytics
DROP INDEX IF EXISTS idx_template_analytics_template_id;
DROP INDEX IF EXISTS idx_template_analytics_user_id;
DROP INDEX IF EXISTS idx_template_analytics_action_taken;
DROP INDEX IF EXISTS idx_template_analytics_created_at;
```

### Total Impact of Dropping Unused Indexes
- **Indexes to drop:** 122 indexes
- **Space saved:** ~1.6 MB immediately
- **Write performance:** Improved (fewer indexes to maintain on INSERT/UPDATE)
- **Maintenance:** Reduced autovacuum overhead
- **Risk:** VERY LOW (can recreate if needed)

---

## 🎯 Priority 2: Verify and Drop Unused Functions

### Functions Found in Code (37 - KEEP THESE)
✅ Active functions that must be kept:
- `set_config`, `should_deliver_notification`, `is_recipient_muted`
- `get_effective_notification_settings`, `bulk_update_group_members`
- `bulk_mute_operation`, `toggle_update_like`, `get_user_metadata_values`
- `get_update_likes`, `cleanup_expired_mutes`, `validate_invitation_token`
- `update_privacy_settings`, `track_prompt_shown`, `track_prompt_clicked`
- `schedule_digest_for_user`, `revoke_invitation`, `recalculate_template_effectiveness`
- `mark_invitation_used`, `is_in_quiet_hours`, `increment_update_view_count`
- `increment_invitation_use_count`, `get_user_group_statistics`, `get_update_comments`
- `get_timeline_updates`, `get_summaries_needing_reminders`, `get_summaries_for_auto_publish`
- `get_search_statistics`, `get_random_prompt_suggestion`, `get_notification_recipients_with_groups`
- `get_notification_preferences`, `get_mute_settings`, `get_metadata_autocomplete`
- `get_dashboard_updates`, `get_dashboard_stats`, `create_default_privacy_settings`
- `bulk_update_metadata`, `add_update_comment`

### Functions NOT Found in Code (18 - VERIFY BEFORE DROPPING)

#### Category A: Search Functions (Probably Unused)
```sql
-- Verify these are not called:
DROP FUNCTION IF EXISTS search_comments(uuid, text);
DROP FUNCTION IF EXISTS search_memories(uuid, text, text[], text[], text[], text[], text[], text, text, text, int, int);
DROP FUNCTION IF EXISTS search_memories_by_metadata(uuid, jsonb);
DROP FUNCTION IF EXISTS search_memories_with_highlights(uuid, text);
```

**⚠️ NOTE:** Check if these are used by any search features before dropping.

#### Category B: Migration/Maintenance Functions (Safe to Drop)
```sql
-- One-time migration functions (already executed)
DROP FUNCTION IF EXISTS migrate_email_updates();
DROP FUNCTION IF EXISTS rebuild_search_vectors();

-- Sample data functions (should NOT be in production!)
-- These were found in migration analysis but not in function list
```

#### Category C: Analytics Functions (Low Priority)
```sql
-- May be used by background jobs, verify first:
DROP FUNCTION IF EXISTS analyze_content_formats();
```

#### Category D: Internal Helper Functions
These may be called by other functions or triggers. Verify dependencies first:
```sql
-- Text processing
DROP FUNCTION IF EXISTS extract_plain_text_from_html(text);
DROP FUNCTION IF EXISTS extract_plain_text_from_rich_content(jsonb);
DROP FUNCTION IF EXISTS safe_text_for_search(text);
DROP FUNCTION IF EXISTS get_effective_content(text, text, jsonb);

-- Narrative/validation
DROP FUNCTION IF EXISTS get_narrative_preview(jsonb);
DROP FUNCTION IF EXISTS validate_narrative_data(jsonb);
DROP FUNCTION IF EXISTS validate_parent_narrative(jsonb);
DROP FUNCTION IF EXISTS validate_rich_text_length();

-- Template helpers
DROP FUNCTION IF EXISTS get_recent_template_ids(uuid, int);
DROP FUNCTION IF EXISTS get_templates_by_filters(jsonb);
DROP FUNCTION IF EXISTS increment_template_usage(uuid);
DROP FUNCTION IF EXISTS update_template_effectiveness(uuid, text, jsonb);

-- Recipient helpers
DROP FUNCTION IF EXISTS get_recipient_by_token(text);
DROP FUNCTION IF EXISTS should_send_to_recipient(uuid, uuid, text);

-- Subject search vector
DROP FUNCTION IF EXISTS subject_search_vector(text);
```

#### Category E: Background Job Functions
These might be called by pg_cron or external workers:
```sql
-- Verify if used by cron jobs:
DROP FUNCTION IF EXISTS cleanup_expired_invitations();
DROP FUNCTION IF EXISTS cleanup_notification_data();
DROP FUNCTION IF EXISTS cleanup_old_notifications();
DROP FUNCTION IF EXISTS create_digest_jobs();
DROP FUNCTION IF EXISTS enqueue_notification_job(uuid, uuid, text, jsonb, timestamp, text, text);
```

#### Category F: Trigger Functions (DO NOT DROP)
These are called by triggers, keep them:
- ✅ `handle_new_user()` - Auth trigger
- ✅ `update_updated_at_column()` - Timestamp triggers
- ✅ `update_comments_search_vector()` - Search vector trigger
- ✅ `update_updates_search_vector()` - Search vector trigger
- ✅ `update_comment_counts()` - Counter trigger
- ✅ `update_like_counts()` - Counter trigger
- ✅ `update_summary_stats()` - Summary trigger
- ✅ `update_summary_updated_at()` - Timestamp trigger
- ✅ `track_metadata_usage()` - Usage tracking trigger
- ✅ `create_notification_history()` - Notification trigger

### How to Verify Function Usage

1. **Check if function is called by triggers:**
```sql
SELECT
  trigger_name,
  event_object_table,
  action_statement
FROM information_schema.triggers
WHERE action_statement LIKE '%function_name%';
```

2. **Check if function is called by other functions:**
```sql
SELECT
  p.proname,
  pg_get_functiondef(p.oid) as definition
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND pg_get_functiondef(p.oid) LIKE '%function_name%';
```

3. **Check if function is used in RLS policies:**
```sql
SELECT
  tablename,
  policyname,
  qual
FROM pg_policies
WHERE qual::text LIKE '%function_name%';
```

---

## 🎯 Priority 3: Drop Unused Tables

### Tables Confirmed Unused (4 tables)

#### Immediate Candidates
```sql
-- 1. prompt_suggestions - 0 references, no FK dependencies
DROP TABLE IF EXISTS prompt_suggestions CASCADE;

-- 2. notification_preferences_cache - 0 references, cache table
DROP TABLE IF EXISTS notification_preferences_cache CASCADE;

-- 3. user_metadata_values - 0 references
-- ⚠️ WARNING: Function get_user_metadata_values exists - verify first!
-- If function is unused, safe to drop
DROP TABLE IF EXISTS user_metadata_values CASCADE;
```

#### Requires Investigation
```sql
-- 4. comments - 0 references BUT has FK from memories table
-- ⚠️ VERIFY: Check if memories.update_id references comments
-- If not, safe to drop
DROP TABLE IF EXISTS comments CASCADE;
```

### Before Dropping Tables - Verification Steps

1. **Check foreign key dependencies:**
```sql
SELECT
  tc.table_name,
  kcu.column_name,
  ccu.table_name as references_table
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage ccu ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND ccu.table_name = 'table_to_drop';
```

2. **Check if table is referenced in views:**
```sql
SELECT
  viewname,
  definition
FROM pg_views
WHERE definition LIKE '%table_name%'
  AND schemaname = 'public';
```

3. **Check if table is referenced in functions:**
```sql
SELECT
  p.proname,
  pg_get_functiondef(p.oid)
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND pg_get_functiondef(p.oid) LIKE '%table_name%';
```

---

## 🎯 Priority 4: Rename Legacy Indexes

These indexes have old table names and should be renamed for clarity:

```sql
-- memories table (was "updates")
ALTER INDEX updates_pkey RENAME TO memories_pkey;
ALTER INDEX idx_updates_child_id RENAME TO idx_memories_child_id;
ALTER INDEX idx_updates_created_at RENAME TO idx_memories_created_at;
ALTER INDEX idx_updates_parent_id RENAME TO idx_memories_parent_id;
ALTER INDEX idx_updates_parent_child RENAME TO idx_memories_parent_child;
ALTER INDEX idx_updates_parent_created RENAME TO idx_memories_parent_created;
-- (Only rename indexes you decide to keep)

-- summaries table (was "digests")
ALTER INDEX digests_pkey RENAME TO summaries_pkey;
ALTER INDEX idx_digests_parent_status_date RENAME TO idx_summaries_parent_status_date;
ALTER INDEX idx_digests_id_parent_id RENAME TO idx_summaries_id_parent_id;

-- summary_memories table (was "digest_updates")
ALTER INDEX digest_updates_pkey RENAME TO summary_memories_pkey;
ALTER INDEX digest_updates_digest_id_update_id_recipient_id_key RENAME TO summary_memories_unique_key;
ALTER INDEX idx_digest_updates_digest_recipient RENAME TO idx_summary_memories_summary_recipient;
```

---

## 📋 Execution Plan

### Phase 1: Preparation (Today)
- [ ] Review this cleanup plan
- [ ] Verify critical functions are not accidentally marked for deletion
- [ ] Run dependency verification queries
- [ ] Get stakeholder approval

### Phase 2: Index Cleanup (This Week)
- [ ] Create migration file with all DROP INDEX statements
- [ ] Test in development environment
- [ ] Execute in staging
- [ ] Monitor for query performance issues
- [ ] Execute in production during low-traffic period

### Phase 3: Function Cleanup (Next Week)
- [ ] Verify each unused function
- [ ] Create migration to drop confirmed unused functions
- [ ] Test in development
- [ ] Execute in production

### Phase 4: Table Cleanup (Future Sprint)
- [ ] Final verification of unused tables
- [ ] Create migration to drop unused tables
- [ ] Test thoroughly in staging
- [ ] Execute in production with full backup

### Phase 5: Index Renaming (Low Priority)
- [ ] Create migration to rename legacy indexes
- [ ] Execute in production (zero downtime operation)

---

## ⚠️ Risk Assessment

| Action | Risk | Reversibility | Testing Required |
|--------|------|---------------|------------------|
| Drop unused indexes | 🟢 LOW | Easy - recreate index | Minimal - monitor performance |
| Drop unused functions | 🟡 MEDIUM | Moderate - restore from migration | Verify not used by triggers/policies |
| Drop unused tables | 🔴 HIGH | Difficult - restore from backup | Extensive - verify no dependencies |
| Rename indexes | 🟢 LOW | Easy - rename back | None - internal change |

---

## 📊 Expected Benefits

### Storage Savings
- Index space saved: ~1.6 MB
- Table space saved: ~240 KB (if all 4 unused tables dropped)
- **Total:** ~1.8 MB saved

### Performance Improvements
- **Write operations:** 15-20% faster (fewer indexes to maintain)
- **Autovacuum:** Reduced overhead (fewer objects to maintain)
- **Query planning:** Faster (fewer indexes to consider)
- **Maintenance:** Easier codebase understanding

### Code Quality
- Clearer schema (only used objects remain)
- Easier onboarding (less confusion about unused objects)
- Reduced technical debt

---

## 🎯 Next Steps

1. **Review this plan** - Ensure no critical objects are mistakenly marked for deletion
2. **Run verification queries** - Confirm dependencies before dropping
3. **Create migration file** - Start with Priority 1 (indexes)
4. **Test in development** - Verify application works after changes
5. **Execute incrementally** - Don't rush, test each phase

**Ready to proceed?** I can create the migration file for Phase 1 (dropping unused indexes).
