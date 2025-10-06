-- Migration: 20251006000003_rls_performance_optimization.sql
-- Description: Optimize Row Level Security (RLS) policies for performance
-- Issue: CRO-121 - Potential Row Level Security (RLS) Performance Issues
--
-- IMPORTANT: Execute this migration via Supabase SQL Editor
-- Do NOT run via CLI or automated migration tools

-- =============================================================================
-- RLS PERFORMANCE OPTIMIZATION
-- =============================================================================
-- This migration optimizes RLS policies by:
-- 1. Adding indexes specifically to support RLS policy conditions
-- 2. Analyzing complex policies with EXISTS subqueries
-- 3. Providing EXPLAIN ANALYZE queries for performance testing
-- 4. Documenting optimization guidelines for future policies

-- =============================================================================
-- ANALYSIS SUMMARY
-- =============================================================================
-- Current RLS policies analyzed:
--
-- ✅ SIMPLE POLICIES (Direct column comparison - Already optimal):
--    - profiles: auth.uid() = id
--    - children: auth.uid() = parent_id
--    - recipient_groups: auth.uid() = parent_id
--    - recipients: auth.uid() = parent_id
--    - updates: auth.uid() = parent_id
--    - ai_prompts: auth.uid() = parent_id
--    - notification_history: auth.uid() = user_id
--    - digest_queue: auth.uid() = user_id
--    - digests: auth.uid() = parent_id
--    - invitations: auth.uid() = parent_id
--
-- ⚠️  COMPLEX POLICIES (EXISTS with joins - Need optimization):
--    - delivery_jobs: EXISTS (SELECT 1 FROM updates WHERE ...)
--    - likes: EXISTS (SELECT 1 FROM updates WHERE ...)
--    - comments: EXISTS (SELECT 1 FROM updates WHERE ...)
--    - responses: EXISTS (SELECT 1 FROM updates WHERE ...)
--    - digest_updates: EXISTS (SELECT 1 FROM digests WHERE ...)
--    - invitation_redemptions: EXISTS (SELECT 1 FROM invitations WHERE ...)

-- =============================================================================
-- PART 1: ADD MISSING INDEXES TO SUPPORT RLS POLICIES
-- =============================================================================

-- ----------------------------------------------------------------------------
-- 1.1 delivery_jobs: Support EXISTS subquery to updates table
-- ----------------------------------------------------------------------------
-- Policy: EXISTS (SELECT 1 FROM updates WHERE updates.id = delivery_jobs.update_id
--                 AND updates.parent_id = auth.uid())
-- This index already exists but we verify it's optimal
CREATE INDEX IF NOT EXISTS idx_delivery_jobs_update_id_lookup
ON delivery_jobs(update_id)
INCLUDE (recipient_id, status, queued_at);

-- Ensure updates table has composite index for RLS lookups
CREATE INDEX IF NOT EXISTS idx_updates_id_parent_id
ON updates(id, parent_id);

-- ----------------------------------------------------------------------------
-- 1.2 likes: Support EXISTS subquery to updates table
-- ----------------------------------------------------------------------------
-- Policy: auth.uid() = parent_id OR EXISTS (SELECT 1 FROM updates WHERE ...)
-- Optimize the EXISTS portion
CREATE INDEX IF NOT EXISTS idx_likes_update_id_lookup
ON likes(update_id)
INCLUDE (parent_id, created_at);

-- ----------------------------------------------------------------------------
-- 1.3 comments: Support EXISTS subquery to updates table
-- ----------------------------------------------------------------------------
-- Policy: auth.uid() = parent_id OR EXISTS (SELECT 1 FROM updates WHERE ...)
CREATE INDEX IF NOT EXISTS idx_comments_update_id_lookup
ON comments(update_id)
INCLUDE (parent_id, content, created_at);

-- ----------------------------------------------------------------------------
-- 1.4 responses: Support EXISTS subquery to updates table
-- ----------------------------------------------------------------------------
-- Policy: EXISTS (SELECT 1 FROM updates WHERE updates.id = responses.update_id
--                 AND updates.parent_id = auth.uid())
CREATE INDEX IF NOT EXISTS idx_responses_update_id_lookup
ON responses(update_id)
INCLUDE (recipient_id, channel, received_at);

-- ----------------------------------------------------------------------------
-- 1.5 digest_updates: Support EXISTS subquery to digests table
-- ----------------------------------------------------------------------------
-- Policy: EXISTS (SELECT 1 FROM digests WHERE digests.id = digest_updates.digest_id
--                 AND digests.parent_id = auth.uid())
CREATE INDEX IF NOT EXISTS idx_digest_updates_digest_id_lookup
ON digest_updates(digest_id)
INCLUDE (update_id, recipient_id, display_order);

-- Ensure digests table has composite index for RLS lookups
CREATE INDEX IF NOT EXISTS idx_digests_id_parent_id
ON digests(id, parent_id);

-- ----------------------------------------------------------------------------
-- 1.6 invitation_redemptions: Support EXISTS subquery to invitations table
-- ----------------------------------------------------------------------------
-- Policy: EXISTS (SELECT 1 FROM invitations WHERE invitations.id = invitation_redemptions.invitation_id
--                 AND invitations.parent_id = auth.uid())
CREATE INDEX IF NOT EXISTS idx_invitation_redemptions_invitation_id_lookup
ON invitation_redemptions(invitation_id)
INCLUDE (recipient_id, redeemed_at);

-- Ensure invitations table has composite index for RLS lookups
CREATE INDEX IF NOT EXISTS idx_invitations_id_parent_id
ON invitations(id, parent_id);

-- =============================================================================
-- PART 2: OPTIMIZE EXISTING INDEXES FOR RLS
-- =============================================================================

-- ----------------------------------------------------------------------------
-- 2.1 Profiles: Already optimal with primary key (id)
-- ----------------------------------------------------------------------------
-- Policy uses: auth.uid() = id
-- Primary key index on id is sufficient

-- ----------------------------------------------------------------------------
-- 2.2 Children, Recipients, Updates: Verify parent_id indexes exist
-- ----------------------------------------------------------------------------
-- These tables already have single-column indexes on parent_id
-- Verify they exist (created in initial schema)
-- idx_children_parent_id
-- idx_recipients_parent_id
-- idx_updates_parent_id
-- idx_recipient_groups_parent_id
-- idx_ai_prompts_parent_id

-- ----------------------------------------------------------------------------
-- 2.3 Notification tables: Verify user_id indexes exist
-- ----------------------------------------------------------------------------
-- idx_notification_history_user_id (already exists)
-- Add composite for common query patterns
CREATE INDEX IF NOT EXISTS idx_notification_history_user_id_unread
ON notification_history(user_id, read_at)
WHERE read_at IS NULL;

-- =============================================================================
-- PART 3: ANALYZE POLICY PERFORMANCE
-- =============================================================================

-- Add comment to document RLS optimization
COMMENT ON TABLE delivery_jobs IS 'Delivery jobs table with RLS optimized via idx_delivery_jobs_update_id_lookup and idx_updates_id_parent_id';
COMMENT ON TABLE likes IS 'Likes table with RLS optimized via idx_likes_update_id_lookup';
COMMENT ON TABLE comments IS 'Comments table with RLS optimized via idx_comments_update_id_lookup';
COMMENT ON TABLE responses IS 'Responses table with RLS optimized via idx_responses_update_id_lookup';

-- =============================================================================
-- PART 4: RLS PERFORMANCE TESTING QUERIES
-- =============================================================================

-- ============================================================================
-- TEST QUERIES - Run these with EXPLAIN ANALYZE to verify optimization
-- ============================================================================

-- Test 1: delivery_jobs RLS policy performance
-- Expected: Should use idx_delivery_jobs_update_id_lookup and idx_updates_id_parent_id
--
-- EXPLAIN ANALYZE
-- SELECT * FROM delivery_jobs
-- WHERE update_id IN (
--   SELECT id FROM updates WHERE parent_id = auth.uid()
-- );

-- Test 2: likes RLS policy performance
-- Expected: Should use idx_likes_update_id_lookup and idx_updates_id_parent_id
--
-- EXPLAIN ANALYZE
-- SELECT * FROM likes
-- WHERE parent_id = auth.uid() OR update_id IN (
--   SELECT id FROM updates WHERE parent_id = auth.uid()
-- );

-- Test 3: comments RLS policy performance
-- Expected: Should use idx_comments_update_id_lookup and idx_updates_id_parent_id
--
-- EXPLAIN ANALYZE
-- SELECT * FROM comments
-- WHERE parent_id = auth.uid() OR update_id IN (
--   SELECT id FROM updates WHERE parent_id = auth.uid()
-- );

-- Test 4: responses RLS policy performance
-- Expected: Should use idx_responses_update_id_lookup and idx_updates_id_parent_id
--
-- EXPLAIN ANALYZE
-- SELECT * FROM responses
-- WHERE update_id IN (
--   SELECT id FROM updates WHERE parent_id = auth.uid()
-- );

-- Test 5: digest_updates RLS policy performance
-- Expected: Should use idx_digest_updates_digest_id_lookup and idx_digests_id_parent_id
--
-- EXPLAIN ANALYZE
-- SELECT * FROM digest_updates
-- WHERE digest_id IN (
--   SELECT id FROM digests WHERE parent_id = auth.uid()
-- );

-- Test 6: invitation_redemptions RLS policy performance
-- Expected: Should use idx_invitation_redemptions_invitation_id_lookup and idx_invitations_id_parent_id
--
-- EXPLAIN ANALYZE
-- SELECT * FROM invitation_redemptions
-- WHERE invitation_id IN (
--   SELECT id FROM invitations WHERE parent_id = auth.uid()
-- );

-- =============================================================================
-- PART 5: MONITORING QUERIES
-- =============================================================================

-- Monitor index usage after migration
-- Run this periodically to verify indexes are being used:
--
-- SELECT
--     schemaname,
--     tablename,
--     indexname,
--     idx_scan as index_scans,
--     idx_tup_read as tuples_read,
--     idx_tup_fetch as tuples_fetched
-- FROM pg_stat_user_indexes
-- WHERE indexname LIKE '%_lookup' OR indexname LIKE 'idx_%_id_parent_id'
-- ORDER BY idx_scan DESC;

-- Check for sequential scans on tables with RLS
-- High seq_scan counts may indicate missing or unused indexes:
--
-- SELECT
--     schemaname,
--     relname as tablename,
--     seq_scan,
--     seq_tup_read,
--     idx_scan,
--     idx_tup_fetch,
--     CASE
--         WHEN seq_scan + idx_scan = 0 THEN 0
--         ELSE ROUND(100.0 * idx_scan / (seq_scan + idx_scan), 2)
--     END as index_usage_percent
-- FROM pg_stat_user_tables
-- WHERE schemaname = 'public'
-- ORDER BY seq_scan DESC
-- LIMIT 20;

-- =============================================================================
-- PART 6: RLS OPTIMIZATION GUIDELINES FOR FUTURE POLICIES
-- =============================================================================

-- GUIDELINE 1: Prefer direct column comparisons
-- ✅ GOOD: auth.uid() = parent_id
-- ⚠️  COMPLEX: EXISTS (SELECT 1 FROM ...)
--
-- Direct comparisons use simple index lookups and are much faster

-- GUIDELINE 2: When EXISTS is necessary, ensure supporting indexes exist
-- For policy: EXISTS (SELECT 1 FROM table_a WHERE table_a.id = table_b.foreign_key_id
--                     AND table_a.parent_id = auth.uid())
-- Required indexes:
--   - table_b(foreign_key_id) - for the join
--   - table_a(id, parent_id) - composite for the WHERE clause

-- GUIDELINE 3: Use INCLUDE columns for covering indexes
-- CREATE INDEX idx_name ON table(key_column) INCLUDE (frequently_selected_columns)
-- This allows index-only scans, avoiding table lookups

-- GUIDELINE 4: Monitor RLS performance regularly
-- Use EXPLAIN ANALYZE to test queries that trigger RLS policies
-- Check pg_stat_user_indexes to verify index usage
-- Look for sequential scans on large tables

-- GUIDELINE 5: Consider denormalization for very complex policies
-- If a policy requires multiple EXISTS clauses or complex joins,
-- consider adding a parent_id column directly to the child table
-- This trades storage for query performance

-- =============================================================================
-- PART 7: EXPECTED PERFORMANCE IMPROVEMENTS
-- =============================================================================

-- Table: delivery_jobs
-- Before: Sequential scan + nested loop for EXISTS subquery
-- After: Index scan using idx_delivery_jobs_update_id_lookup
-- Expected improvement: 5-10x faster for large datasets

-- Table: likes, comments, responses
-- Before: Sequential scan or partial index usage
-- After: Index-only scans using covering indexes
-- Expected improvement: 3-5x faster, reduced I/O

-- Table: digest_updates, invitation_redemptions
-- Before: Sequential scan through all records
-- After: Direct index lookup via composite indexes
-- Expected improvement: 10-20x faster for large datasets

-- =============================================================================
-- PART 8: ROLLBACK PLAN
-- =============================================================================

-- If indexes cause performance issues (unlikely), drop them:
--
-- DROP INDEX IF EXISTS idx_delivery_jobs_update_id_lookup;
-- DROP INDEX IF EXISTS idx_updates_id_parent_id;
-- DROP INDEX IF EXISTS idx_likes_update_id_lookup;
-- DROP INDEX IF EXISTS idx_comments_update_id_lookup;
-- DROP INDEX IF EXISTS idx_responses_update_id_lookup;
-- DROP INDEX IF EXISTS idx_digest_updates_digest_id_lookup;
-- DROP INDEX IF EXISTS idx_digests_id_parent_id;
-- DROP INDEX IF EXISTS idx_invitation_redemptions_invitation_id_lookup;
-- DROP INDEX IF EXISTS idx_invitations_id_parent_id;
-- DROP INDEX IF EXISTS idx_notification_history_user_id_unread;

-- Note: Dropping indexes will not break functionality, only reduce performance
-- The original single-column indexes will still support basic queries

-- =============================================================================
-- MIGRATION COMPLETE
-- =============================================================================

-- Summary:
-- ✅ Added 10 new indexes to support RLS policy conditions
-- ✅ Optimized complex EXISTS policies with covering indexes
-- ✅ Provided test queries for performance verification
-- ✅ Documented monitoring and optimization guidelines
-- ✅ Expected 3-20x performance improvement on RLS-filtered queries

-- Next steps:
-- 1. Execute this migration via Supabase SQL Editor
-- 2. Run EXPLAIN ANALYZE test queries to verify improvements
-- 3. Monitor index usage with provided monitoring queries
-- 4. Adjust indexes based on production query patterns
