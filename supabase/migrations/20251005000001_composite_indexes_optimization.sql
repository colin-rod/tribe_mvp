-- Migration: 20251005000001_composite_indexes_optimization.sql
-- Description: Add composite indexes for complex query optimization
-- Issue: CRO-117 - Missing Composite Indexes for Complex Queries
--
-- IMPORTANT: Execute this migration via Supabase SQL Editor
-- Do NOT run via CLI or automated migration tools

-- ============================================================================
-- COMPOSITE INDEX OPTIMIZATION
-- ============================================================================
-- This migration adds composite indexes to optimize common query patterns
-- identified through query analysis and performance profiling.

-- ----------------------------------------------------------------------------
-- 1. Updates Table: Parent ID + Created At
-- ----------------------------------------------------------------------------
-- Optimizes dashboard queries: WHERE parent_id = ? ORDER BY created_at DESC LIMIT ?
-- This replaces the need for separate indexes on parent_id and created_at
CREATE INDEX IF NOT EXISTS idx_updates_parent_created
ON updates(parent_id, created_at DESC);

-- Drop redundant single-column indexes if they exist (optional cleanup)
-- Uncomment these if you want to remove the old single-column indexes:
-- DROP INDEX IF EXISTS idx_updates_parent_id;
-- DROP INDEX IF EXISTS idx_updates_created_at;

-- ----------------------------------------------------------------------------
-- 2. Notification History: User ID + Sent At + Type
-- ----------------------------------------------------------------------------
-- Optimizes notification analytics: WHERE user_id = ? AND sent_at >= ? AND type = ?
-- Covering index for common notification query patterns
CREATE INDEX IF NOT EXISTS idx_notification_history_user_sent_type
ON notification_history(user_id, sent_at DESC, type);

-- ----------------------------------------------------------------------------
-- 3. Delivery Jobs: Update ID + Status + Queued At
-- ----------------------------------------------------------------------------
-- Optimizes delivery status queries: WHERE update_id = ? AND status IN (...)
-- Supports efficient job queue processing and status tracking
CREATE INDEX IF NOT EXISTS idx_delivery_jobs_update_status_queued
ON delivery_jobs(update_id, status, queued_at);

-- ----------------------------------------------------------------------------
-- 4. Recipients: Parent ID + Is Active + Created At
-- ----------------------------------------------------------------------------
-- Optimizes active recipient queries: WHERE parent_id = ? AND is_active = true
-- Supports efficient recipient filtering and ordering
CREATE INDEX IF NOT EXISTS idx_recipients_parent_active_created
ON recipients(parent_id, is_active, created_at);

-- ============================================================================
-- QUERY PLAN ANALYSIS
-- ============================================================================
-- To verify index usage after applying this migration, run these EXPLAIN queries:

-- Test 1: Updates dashboard query
-- EXPLAIN ANALYZE
-- SELECT * FROM updates
-- WHERE parent_id = 'some-uuid'
-- ORDER BY created_at DESC
-- LIMIT 10;
-- Expected: Index Scan using idx_updates_parent_created

-- Test 2: Notification analytics query
-- EXPLAIN ANALYZE
-- SELECT * FROM notification_history
-- WHERE user_id = 'some-uuid'
-- AND sent_at >= NOW() - INTERVAL '30 days'
-- AND type = 'email';
-- Expected: Index Scan using idx_notification_history_user_sent_type

-- Test 3: Delivery job status query
-- EXPLAIN ANALYZE
-- SELECT * FROM delivery_jobs
-- WHERE update_id = 'some-uuid'
-- AND status IN ('pending', 'processing');
-- Expected: Index Scan using idx_delivery_jobs_update_status_queued

-- Test 4: Active recipients query
-- EXPLAIN ANALYZE
-- SELECT * FROM recipients
-- WHERE parent_id = 'some-uuid'
-- AND is_active = true
-- ORDER BY created_at DESC;
-- Expected: Index Scan using idx_recipients_parent_active_created

-- ============================================================================
-- PERFORMANCE MONITORING
-- ============================================================================
-- After migration, monitor these queries for performance improvements:
-- 1. Check pg_stat_user_indexes for index usage statistics
-- 2. Monitor query execution times in pg_stat_statements
-- 3. Verify index hit ratios remain high (>95%)
-- 4. Watch for any regression in write performance (indexes add overhead)

-- Query to check index usage:
-- SELECT schemaname, tablename, indexname, idx_scan, idx_tup_read, idx_tup_fetch
-- FROM pg_stat_user_indexes
-- WHERE indexname LIKE 'idx_%'
-- ORDER BY idx_scan DESC;
