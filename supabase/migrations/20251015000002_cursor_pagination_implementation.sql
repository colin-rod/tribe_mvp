-- Migration: 20251015000002_cursor_pagination_implementation.sql
-- Date: 2025-10-15
-- Description: Implement cursor-based pagination to replace inefficient OFFSET pagination
-- Issue: CRO-123 - Inefficient Pagination Implementation Patterns
--
-- IMPORTANT: Execute this migration via Supabase SQL Editor
-- Do NOT run via CLI or automated migration tools
--
-- This migration adds cursor-based pagination support to all major list queries
-- to improve performance with large datasets. Offset-based pagination becomes
-- increasingly slow as the offset grows, while cursor-based pagination maintains
-- constant-time performance regardless of position in the dataset.

-- =============================================================================
-- PART 1: CREATE COMPOSITE INDEXES FOR CURSOR PAGINATION
-- =============================================================================

-- Memories/Updates table - cursor pagination support
-- Index for (parent_id, created_at DESC, id DESC) - most common pattern
CREATE INDEX IF NOT EXISTS idx_memories_parent_created_id_cursor
  ON public.memories(parent_id, created_at DESC, id DESC);

COMMENT ON INDEX idx_memories_parent_created_id_cursor IS
  'Composite index for efficient cursor-based pagination of memories by creation date';

-- Index for search results with ranking
CREATE INDEX IF NOT EXISTS idx_memories_parent_search_cursor
  ON public.memories(parent_id, created_at DESC, id DESC)
  WHERE search_vector IS NOT NULL;

COMMENT ON INDEX idx_memories_parent_search_cursor IS
  'Composite index for cursor pagination of searchable memories';

-- Comments table - cursor pagination support
CREATE INDEX IF NOT EXISTS idx_comments_update_created_id_cursor
  ON public.comments(update_id, created_at DESC, id DESC);

COMMENT ON INDEX idx_comments_update_created_id_cursor IS
  'Composite index for efficient cursor-based pagination of comments';

-- Notification jobs table - cursor pagination support by scheduled_for
CREATE INDEX IF NOT EXISTS idx_notification_jobs_scheduled_id_cursor
  ON public.notification_jobs(scheduled_for DESC, id DESC)
  WHERE status IN ('pending', 'processing');

COMMENT ON INDEX idx_notification_jobs_scheduled_id_cursor IS
  'Partial composite index for cursor pagination of pending/processing notification jobs';

-- Notification jobs table - cursor pagination by created_at
CREATE INDEX IF NOT EXISTS idx_notification_jobs_created_id_cursor
  ON public.notification_jobs(created_at DESC, id DESC);

COMMENT ON INDEX idx_notification_jobs_created_id_cursor IS
  'Composite index for cursor pagination of all notification jobs';

-- Digest queue - cursor pagination support
CREATE INDEX IF NOT EXISTS idx_digest_queue_scheduled_id_cursor
  ON public.digest_queue(scheduled_for DESC, id DESC)
  WHERE delivery_status IN ('pending', 'processing');

COMMENT ON INDEX idx_digest_queue_scheduled_id_cursor IS
  'Partial composite index for cursor pagination of pending digest queue items';

-- =============================================================================
-- PART 2: HELPER TYPE FOR CURSOR PAGINATION
-- =============================================================================

-- Create composite type for pagination cursor
-- This standardizes the cursor format across all functions
DO $$ BEGIN
  CREATE TYPE pagination_cursor AS (
    created_at TIMESTAMPTZ,
    id UUID
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

COMMENT ON TYPE pagination_cursor IS
  'Standard cursor type for pagination - contains timestamp and ID for stable ordering';

-- =============================================================================
-- PART 3: CURSOR-BASED SEARCH FUNCTIONS
-- =============================================================================

-- Function to search memories with cursor pagination
CREATE OR REPLACE FUNCTION public.search_memories_cursor(
  search_query TEXT,
  user_id UUID,
  result_limit INTEGER DEFAULT 50,
  cursor_created_at TIMESTAMPTZ DEFAULT NULL,
  cursor_id UUID DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  subject TEXT,
  content TEXT,
  child_id UUID,
  distribution_status TEXT,
  created_at TIMESTAMPTZ,
  search_rank REAL
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
DECLARE
  query_ts tsquery;
BEGIN
  -- Convert search query to tsquery
  query_ts := to_tsquery('english', search_query);

  -- Search memories with cursor-based pagination
  RETURN QUERY
  SELECT
    m.id,
    m.subject,
    m.content,
    m.child_id,
    m.distribution_status,
    m.created_at,
    ts_rank_cd(m.search_vector, query_ts, 32) AS search_rank
  FROM public.memories m
  WHERE
    m.parent_id = search_memories_cursor.user_id
    AND m.search_vector @@ query_ts
    -- Cursor-based pagination: only fetch rows after the cursor
    AND (
      cursor_created_at IS NULL OR
      (m.created_at, m.id) < (cursor_created_at, cursor_id)
    )
  ORDER BY
    search_rank DESC,
    m.created_at DESC,
    m.id DESC
  LIMIT result_limit;
END;
$$;

GRANT EXECUTE ON FUNCTION public.search_memories_cursor(TEXT, UUID, INTEGER, TIMESTAMPTZ, UUID) TO authenticated;

COMMENT ON FUNCTION public.search_memories_cursor IS
  'Full-text search for memories with cursor-based pagination. Replaces offset pagination for better performance with large datasets.';

-- Function to search comments with cursor pagination
CREATE OR REPLACE FUNCTION public.search_comments_cursor(
  search_query TEXT,
  user_id UUID,
  result_limit INTEGER DEFAULT 50,
  cursor_created_at TIMESTAMPTZ DEFAULT NULL,
  cursor_id UUID DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  content TEXT,
  update_id UUID,
  update_subject TEXT,
  created_at TIMESTAMPTZ,
  search_rank REAL
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
DECLARE
  query_ts tsquery;
BEGIN
  -- Convert search query to tsquery
  query_ts := to_tsquery('english', search_query);

  -- Search comments with cursor-based pagination
  RETURN QUERY
  SELECT
    c.id,
    c.content,
    c.update_id,
    m.subject AS update_subject,
    c.created_at,
    ts_rank(c.search_vector, query_ts) AS search_rank
  FROM public.comments c
  INNER JOIN public.memories m ON c.update_id = m.id
  WHERE
    c.parent_id = search_comments_cursor.user_id
    AND c.search_vector @@ query_ts
    -- Cursor-based pagination
    AND (
      cursor_created_at IS NULL OR
      (c.created_at, c.id) < (cursor_created_at, cursor_id)
    )
  ORDER BY
    search_rank DESC,
    c.created_at DESC,
    c.id DESC
  LIMIT result_limit;
END;
$$;

GRANT EXECUTE ON FUNCTION public.search_comments_cursor(TEXT, UUID, INTEGER, TIMESTAMPTZ, UUID) TO authenticated;

COMMENT ON FUNCTION public.search_comments_cursor IS
  'Full-text search for comments with cursor-based pagination for efficient deep pagination.';

-- Function to search memories with highlights and cursor pagination
CREATE OR REPLACE FUNCTION public.search_memories_with_highlights_cursor(
  search_query TEXT,
  user_id UUID,
  result_limit INTEGER DEFAULT 50,
  cursor_created_at TIMESTAMPTZ DEFAULT NULL,
  cursor_id UUID DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  subject TEXT,
  content TEXT,
  subject_highlight TEXT,
  content_highlight TEXT,
  child_id UUID,
  distribution_status TEXT,
  created_at TIMESTAMPTZ,
  search_rank REAL
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
DECLARE
  query_ts tsquery;
BEGIN
  -- Convert search query to tsquery
  query_ts := to_tsquery('english', search_query);

  -- Search memories with highlighted snippets and cursor pagination
  RETURN QUERY
  SELECT
    m.id,
    m.subject,
    m.content,
    -- Generate highlighted headline for subject
    ts_headline('english', COALESCE(m.subject, ''), query_ts,
      'StartSel=<mark>, StopSel=</mark>, MaxWords=20, MinWords=10'
    ) AS subject_highlight,
    -- Generate highlighted headline for content
    ts_headline('english', COALESCE(m.content, ''), query_ts,
      'StartSel=<mark>, StopSel=</mark>, MaxWords=50, MinWords=20, MaxFragments=3'
    ) AS content_highlight,
    m.child_id,
    m.distribution_status,
    m.created_at,
    ts_rank_cd(m.search_vector, query_ts, 32) AS search_rank
  FROM public.memories m
  WHERE
    m.parent_id = search_memories_with_highlights_cursor.user_id
    AND m.search_vector @@ query_ts
    -- Cursor-based pagination
    AND (
      cursor_created_at IS NULL OR
      (m.created_at, m.id) < (cursor_created_at, cursor_id)
    )
  ORDER BY
    search_rank DESC,
    m.created_at DESC,
    m.id DESC
  LIMIT result_limit;
END;
$$;

GRANT EXECUTE ON FUNCTION public.search_memories_with_highlights_cursor(TEXT, UUID, INTEGER, TIMESTAMPTZ, UUID) TO authenticated;

COMMENT ON FUNCTION public.search_memories_with_highlights_cursor IS
  'Full-text search with highlights and cursor pagination for efficient deep pagination with snippet generation.';

-- =============================================================================
-- PART 4: CURSOR-BASED COMMENTS FUNCTION
-- =============================================================================

-- Update get_update_comments to support cursor pagination
CREATE OR REPLACE FUNCTION public.get_update_comments_cursor(
  p_update_id UUID,
  p_parent_id UUID,
  p_limit INTEGER DEFAULT 50,
  p_cursor_created_at TIMESTAMPTZ DEFAULT NULL,
  p_cursor_id UUID DEFAULT NULL
)
RETURNS TABLE(
  id UUID,
  parent_id UUID,
  parent_name TEXT,
  content TEXT,
  created_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Verify the requesting user can access this update
  IF NOT EXISTS (
    SELECT 1 FROM memories
    WHERE id = p_update_id AND parent_id = p_parent_id
  ) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  RETURN QUERY
  SELECT
    c.id,
    c.parent_id,
    p.name as parent_name,
    c.content,
    c.created_at,
    c.updated_at
  FROM comments c
  JOIN profiles p ON c.parent_id = p.id
  WHERE
    c.update_id = p_update_id
    -- Cursor-based pagination
    AND (
      p_cursor_created_at IS NULL OR
      (c.created_at, c.id) < (p_cursor_created_at, p_cursor_id)
    )
  ORDER BY c.created_at DESC, c.id DESC
  LIMIT p_limit;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_update_comments_cursor(UUID, UUID, INTEGER, TIMESTAMPTZ, UUID) TO authenticated;

COMMENT ON FUNCTION public.get_update_comments_cursor IS
  'Retrieve comments for an update with cursor-based pagination for efficient loading of large comment threads.';

-- =============================================================================
-- PART 5: ENHANCED DASHBOARD FUNCTION (PREFER CURSOR OVER OFFSET)
-- =============================================================================

-- Update get_dashboard_updates to prefer cursor-based pagination
-- This function already has cursor support, but we'll optimize it to discourage offset usage
CREATE OR REPLACE FUNCTION public.get_dashboard_updates_optimized(
  p_parent_id UUID,
  p_search_query TEXT DEFAULT NULL,
  p_child_ids UUID[] DEFAULT NULL,
  p_milestone_types TEXT[] DEFAULT NULL,
  p_status_filter TEXT DEFAULT NULL,
  p_date_from TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  p_date_to TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  p_limit INTEGER DEFAULT 20,
  p_cursor_created_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  p_cursor_id UUID DEFAULT NULL
)
RETURNS TABLE(
  id UUID,
  parent_id UUID,
  child_id UUID,
  child_name TEXT,
  child_avatar_url TEXT,
  content TEXT,
  media_urls TEXT[],
  milestone_type TEXT,
  like_count INTEGER,
  comment_count INTEGER,
  response_count INTEGER,
  view_count INTEGER,
  distribution_status TEXT,
  created_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE,
  scheduled_for TIMESTAMP WITH TIME ZONE,
  sent_at TIMESTAMP WITH TIME ZONE,
  ai_analysis JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  search_query_ts tsquery;
BEGIN
  -- Prepare search query if provided
  IF p_search_query IS NOT NULL AND p_search_query != '' THEN
    search_query_ts := plainto_tsquery('english', p_search_query);
  END IF;

  RETURN QUERY
  SELECT
    u.id,
    u.parent_id,
    u.child_id,
    c.name as child_name,
    c.profile_photo_url as child_avatar_url,
    u.content,
    u.media_urls,
    u.milestone_type,
    u.like_count,
    u.comment_count,
    u.response_count,
    u.view_count,
    u.distribution_status,
    u.created_at,
    u.updated_at,
    u.scheduled_for,
    u.sent_at,
    u.ai_analysis
  FROM memories u
  JOIN children c ON u.child_id = c.id
  WHERE
    u.parent_id = p_parent_id
    -- Search filter
    AND (search_query_ts IS NULL OR u.search_vector @@ search_query_ts)
    -- Child filter
    AND (p_child_ids IS NULL OR u.child_id = ANY(p_child_ids))
    -- Milestone filter
    AND (p_milestone_types IS NULL OR u.milestone_type = ANY(p_milestone_types))
    -- Status filter
    AND (p_status_filter IS NULL OR u.distribution_status = p_status_filter)
    -- Date range filter
    AND (p_date_from IS NULL OR u.created_at >= p_date_from)
    AND (p_date_to IS NULL OR u.created_at <= p_date_to)
    -- Cursor-based pagination (no offset support)
    AND (
      p_cursor_created_at IS NULL OR
      (u.created_at, u.id) < (p_cursor_created_at, p_cursor_id)
    )
  ORDER BY u.created_at DESC, u.id DESC
  LIMIT p_limit;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_dashboard_updates_optimized TO authenticated;

COMMENT ON FUNCTION public.get_dashboard_updates_optimized IS
  'Optimized dashboard updates query using only cursor-based pagination (no offset). Use this function for new code.';

-- =============================================================================
-- PART 6: NOTIFICATION JOBS CURSOR PAGINATION
-- =============================================================================

-- Function to get notification jobs with cursor pagination
CREATE OR REPLACE FUNCTION public.get_notification_jobs_cursor(
  p_parent_id UUID,
  p_status TEXT DEFAULT NULL,
  p_delivery_method TEXT DEFAULT NULL,
  p_notification_type TEXT DEFAULT NULL,
  p_recipient_id UUID DEFAULT NULL,
  p_group_id UUID DEFAULT NULL,
  p_limit INTEGER DEFAULT 20,
  p_sort_by TEXT DEFAULT 'created_at', -- 'created_at' or 'scheduled_for'
  p_cursor_timestamp TIMESTAMPTZ DEFAULT NULL,
  p_cursor_id UUID DEFAULT NULL
)
RETURNS TABLE(
  id UUID,
  status TEXT,
  notification_type TEXT,
  urgency_level TEXT,
  delivery_method TEXT,
  scheduled_for TIMESTAMPTZ,
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ,
  retry_count INTEGER,
  max_retries INTEGER,
  message_id TEXT,
  failure_reason TEXT,
  recipient_id UUID,
  recipient_name TEXT,
  group_id UUID,
  group_name TEXT,
  content JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Validate sort_by parameter
  IF p_sort_by NOT IN ('created_at', 'scheduled_for') THEN
    RAISE EXCEPTION 'Invalid sort_by parameter. Must be created_at or scheduled_for.';
  END IF;

  RETURN QUERY
  SELECT
    nj.id,
    nj.status::TEXT,
    nj.notification_type::TEXT,
    nj.urgency_level::TEXT,
    nj.delivery_method::TEXT,
    nj.scheduled_for,
    nj.processed_at,
    nj.created_at,
    nj.retry_count,
    nj.max_retries,
    nj.message_id,
    nj.failure_reason,
    nj.recipient_id,
    r.name AS recipient_name,
    nj.group_id,
    rg.name AS group_name,
    nj.content
  FROM notification_jobs nj
  INNER JOIN recipients r ON nj.recipient_id = r.id
  LEFT JOIN recipient_groups rg ON nj.group_id = rg.id
  WHERE
    r.parent_id = p_parent_id
    AND (p_status IS NULL OR nj.status::TEXT = p_status)
    AND (p_delivery_method IS NULL OR nj.delivery_method::TEXT = p_delivery_method)
    AND (p_notification_type IS NULL OR nj.notification_type::TEXT = p_notification_type)
    AND (p_recipient_id IS NULL OR nj.recipient_id = p_recipient_id)
    AND (p_group_id IS NULL OR nj.group_id = p_group_id)
    -- Cursor pagination based on sort field
    AND (
      p_cursor_timestamp IS NULL OR
      (
        CASE
          WHEN p_sort_by = 'created_at' THEN (nj.created_at, nj.id) < (p_cursor_timestamp, p_cursor_id)
          WHEN p_sort_by = 'scheduled_for' THEN (nj.scheduled_for, nj.id) < (p_cursor_timestamp, p_cursor_id)
        END
      )
    )
  ORDER BY
    CASE WHEN p_sort_by = 'created_at' THEN nj.created_at END DESC,
    CASE WHEN p_sort_by = 'scheduled_for' THEN nj.scheduled_for END DESC,
    nj.id DESC
  LIMIT p_limit;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_notification_jobs_cursor TO authenticated;

COMMENT ON FUNCTION public.get_notification_jobs_cursor IS
  'Retrieve notification jobs with cursor-based pagination for efficient loading of large job queues.';

-- =============================================================================
-- PART 7: PERFORMANCE MONITORING VIEW
-- =============================================================================

-- Create view to track pagination performance
CREATE OR REPLACE VIEW v_cursor_pagination_indexes AS
SELECT
  schemaname,
  relname as tablename,
  indexrelname as indexname,
  idx_scan as total_scans,
  idx_tup_read as tuples_read,
  idx_tup_fetch as tuples_fetched,
  pg_size_pretty(pg_relation_size(indexrelid)) as index_size,
  CASE
    WHEN idx_scan = 0 THEN 'UNUSED'
    WHEN idx_scan < 100 THEN 'LOW USAGE'
    WHEN idx_scan < 1000 THEN 'MODERATE'
    ELSE 'HIGH USAGE'
  END as usage_category
FROM pg_stat_user_indexes
WHERE indexrelname LIKE '%cursor%'
   OR indexrelname IN (
     'idx_memories_parent_created_id_cursor',
     'idx_comments_update_created_id_cursor',
     'idx_notification_jobs_created_id_cursor',
     'idx_notification_jobs_scheduled_id_cursor',
     'idx_digest_queue_scheduled_id_cursor'
   )
ORDER BY idx_scan DESC;

COMMENT ON VIEW v_cursor_pagination_indexes IS
  'Monitoring view for cursor pagination index usage and performance';

-- =============================================================================
-- PART 8: DEPRECATION WARNINGS FOR OFFSET FUNCTIONS
-- =============================================================================

-- Add deprecation notice to old offset-based functions
-- Keep them for backward compatibility but warn about performance
-- Only add comments if the functions exist (conditional execution)

DO $$
BEGIN
  -- search_memories
  IF EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public'
    AND p.proname = 'search_memories'
    AND pg_get_function_identity_arguments(p.oid) = 'search_query text, user_id uuid, result_limit integer, result_offset integer'
  ) THEN
    COMMENT ON FUNCTION public.search_memories(TEXT, UUID, INTEGER, INTEGER) IS
      'DEPRECATED: Use search_memories_cursor() instead. Offset-based pagination has poor performance with large datasets.';
  END IF;

  -- search_comments
  IF EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public'
    AND p.proname = 'search_comments'
    AND pg_get_function_identity_arguments(p.oid) = 'search_query text, user_id uuid, result_limit integer, result_offset integer'
  ) THEN
    COMMENT ON FUNCTION public.search_comments(TEXT, UUID, INTEGER, INTEGER) IS
      'DEPRECATED: Use search_comments_cursor() instead. Offset-based pagination has poor performance with large datasets.';
  END IF;

  -- search_memories_with_highlights
  IF EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public'
    AND p.proname = 'search_memories_with_highlights'
    AND pg_get_function_identity_arguments(p.oid) = 'search_query text, user_id uuid, result_limit integer, result_offset integer'
  ) THEN
    COMMENT ON FUNCTION public.search_memories_with_highlights(TEXT, UUID, INTEGER, INTEGER) IS
      'DEPRECATED: Use search_memories_with_highlights_cursor() instead. Offset-based pagination has poor performance with large datasets.';
  END IF;

  -- get_update_comments
  IF EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public'
    AND p.proname = 'get_update_comments'
    AND pg_get_function_identity_arguments(p.oid) = 'p_update_id uuid, p_parent_id uuid, p_limit integer, p_offset integer'
  ) THEN
    COMMENT ON FUNCTION public.get_update_comments(UUID, UUID, INTEGER, INTEGER) IS
      'DEPRECATED: Use get_update_comments_cursor() instead. Offset-based pagination has poor performance with large comment threads.';
  END IF;
END $$;

-- =============================================================================
-- PART 9: ANALYZE TABLES FOR QUERY PLANNER
-- =============================================================================

-- Update statistics for query planner optimization
ANALYZE memories;
ANALYZE comments;
ANALYZE notification_jobs;
ANALYZE digest_queue;
ANALYZE recipients;
ANALYZE recipient_groups;

-- =============================================================================
-- PART 10: VALIDATION QUERIES (FOR TESTING)
-- =============================================================================

-- The following queries can be used to validate cursor pagination performance
-- Run these via EXPLAIN ANALYZE to verify index usage

-- Test 1: Memory cursor pagination should use idx_memories_parent_created_id_cursor
-- EXPLAIN (ANALYZE, BUFFERS)
-- SELECT * FROM search_memories_cursor('test', 'USER_ID'::UUID, 20, NOW(), gen_random_uuid());

-- Test 2: Comments cursor pagination should use idx_comments_update_created_id_cursor
-- EXPLAIN (ANALYZE, BUFFERS)
-- SELECT * FROM get_update_comments_cursor('UPDATE_ID'::UUID, 'USER_ID'::UUID, 20, NOW(), gen_random_uuid());

-- Test 3: Jobs cursor pagination should use idx_notification_jobs_created_id_cursor
-- EXPLAIN (ANALYZE, BUFFERS)
-- SELECT * FROM get_notification_jobs_cursor('USER_ID'::UUID, NULL, NULL, NULL, NULL, NULL, 20, 'created_at', NOW(), gen_random_uuid());

-- =============================================================================
-- MIGRATION COMPLETION LOG
-- =============================================================================

DO $$
BEGIN
  RAISE NOTICE '==========================================';
  RAISE NOTICE 'Cursor Pagination Implementation Complete';
  RAISE NOTICE '==========================================';
  RAISE NOTICE 'Issue: CRO-123';
  RAISE NOTICE 'Created: %', NOW();
  RAISE NOTICE '';
  RAISE NOTICE 'New Indexes Created:';
  RAISE NOTICE '- idx_memories_parent_created_id_cursor';
  RAISE NOTICE '- idx_memories_parent_search_cursor';
  RAISE NOTICE '- idx_comments_update_created_id_cursor';
  RAISE NOTICE '- idx_notification_jobs_scheduled_id_cursor';
  RAISE NOTICE '- idx_notification_jobs_created_id_cursor';
  RAISE NOTICE '- idx_digest_queue_scheduled_id_cursor';
  RAISE NOTICE '';
  RAISE NOTICE 'New Cursor-Based Functions:';
  RAISE NOTICE '- search_memories_cursor()';
  RAISE NOTICE '- search_comments_cursor()';
  RAISE NOTICE '- search_memories_with_highlights_cursor()';
  RAISE NOTICE '- get_update_comments_cursor()';
  RAISE NOTICE '- get_dashboard_updates_optimized()';
  RAISE NOTICE '- get_notification_jobs_cursor()';
  RAISE NOTICE '';
  RAISE NOTICE 'Deprecated Functions (keep for compatibility):';
  RAISE NOTICE '- search_memories() - use search_memories_cursor()';
  RAISE NOTICE '- search_comments() - use search_comments_cursor()';
  RAISE NOTICE '- search_memories_with_highlights() - use search_memories_with_highlights_cursor()';
  RAISE NOTICE '- get_update_comments() - use get_update_comments_cursor()';
  RAISE NOTICE '';
  RAISE NOTICE 'Monitoring:';
  RAISE NOTICE '- View created: v_cursor_pagination_indexes';
  RAISE NOTICE '- Run: SELECT * FROM v_cursor_pagination_indexes;';
  RAISE NOTICE '';
  RAISE NOTICE 'Performance Benefits:';
  RAISE NOTICE '- Constant-time pagination regardless of offset';
  RAISE NOTICE '- Index-friendly queries (uses composite indexes)';
  RAISE NOTICE '- Stable pagination with concurrent inserts';
  RAISE NOTICE '- Expected 10-1000x improvement for deep pagination';
  RAISE NOTICE '';
  RAISE NOTICE 'Next Steps:';
  RAISE NOTICE '1. Update application code to use new cursor functions';
  RAISE NOTICE '2. Monitor index usage: SELECT * FROM v_cursor_pagination_indexes;';
  RAISE NOTICE '3. Run EXPLAIN ANALYZE on cursor queries to verify performance';
  RAISE NOTICE '4. Gradually phase out offset-based pagination';
  RAISE NOTICE '==========================================';
END $$;
