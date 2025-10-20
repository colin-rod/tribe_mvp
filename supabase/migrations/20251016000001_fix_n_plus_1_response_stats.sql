-- Migration: 20251016000001_fix_n_plus_1_response_stats.sql
-- Date: 2025-10-16
-- Description: Fix N+1 query pattern in getRecentUpdatesWithStats by creating batch aggregation function
-- Issue: CRO-98 - Database Query Performance Issues (N+1 Queries)
--
-- IMPORTANT: Execute this migration via Supabase SQL Editor
-- Do NOT run via CLI or automated migration tools
--
-- This migration eliminates a critical N+1 query pattern that causes 2N additional queries
-- for every dashboard load. With 20 updates, this reduces 42 queries to just 3 queries.

-- =============================================================================
-- PART 1: CREATE BATCH RESPONSE STATS FUNCTION
-- =============================================================================

-- Function to get response statistics for multiple updates in a single query
-- This replaces N individual queries with 1 batch query
CREATE OR REPLACE FUNCTION public.get_update_response_stats(
  update_ids UUID[]
)
RETURNS TABLE (
  update_id UUID,
  response_count INTEGER,
  last_response_at TIMESTAMPTZ
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
BEGIN
  -- Return aggregated response stats for all requested updates
  -- Uses GROUP BY to compute stats in database instead of N queries in application
  RETURN QUERY
  SELECT
    r.update_id,
    COUNT(*)::INTEGER AS response_count,
    MAX(r.received_at) AS last_response_at
  FROM public.responses r
  WHERE r.update_id = ANY(update_ids)
  GROUP BY r.update_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_update_response_stats(UUID[]) TO authenticated;

COMMENT ON FUNCTION public.get_update_response_stats IS
  'Batch aggregation function for response statistics. Returns response count and last response time for multiple updates in a single query. Eliminates N+1 query pattern in dashboard loading.';

-- =============================================================================
-- PART 2: CREATE OPTIMIZED INDEX FOR RESPONSE STATS AGGREGATION
-- =============================================================================

-- Composite index to speed up response stats aggregation
-- Supports efficient GROUP BY and MAX operations
CREATE INDEX IF NOT EXISTS idx_responses_update_stats_agg
  ON public.responses(update_id, received_at DESC);

COMMENT ON INDEX idx_responses_update_stats_agg IS
  'Composite index for efficient response stats aggregation. Supports batch querying of response counts and last response timestamps.';

-- =============================================================================
-- PART 3: CREATE BATCH LIKES CHECK FUNCTION (OPTIMIZATION)
-- =============================================================================

-- Function to check which updates a user has liked in batch
-- Further optimizes dashboard loading by eliminating additional N queries
CREATE OR REPLACE FUNCTION public.get_user_likes_for_updates(
  user_id UUID,
  update_ids UUID[]
)
RETURNS TABLE (
  update_id UUID
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT l.update_id
  FROM public.likes l
  WHERE
    l.parent_id = user_id
    AND l.update_id = ANY(update_ids);
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_user_likes_for_updates(UUID, UUID[]) TO authenticated;

COMMENT ON FUNCTION public.get_user_likes_for_updates IS
  'Batch function to check which updates a user has liked. Returns update IDs that have been liked by the user.';

-- =============================================================================
-- PART 4: CREATE COMPOSITE INDEX FOR LIKES BATCH QUERIES
-- =============================================================================

-- Composite index for efficient likes lookup
CREATE INDEX IF NOT EXISTS idx_likes_parent_update_batch
  ON public.likes(parent_id, update_id);

COMMENT ON INDEX idx_likes_parent_update_batch IS
  'Composite index for batch likes queries. Supports efficient lookup of liked updates for a user.';

-- =============================================================================
-- PART 5: CREATE COMPREHENSIVE DASHBOARD STATS FUNCTION
-- =============================================================================

-- All-in-one function to get updates with all stats in a single database call
-- This is the ultimate optimization - everything in one query
CREATE OR REPLACE FUNCTION public.get_recent_updates_with_all_stats(
  p_parent_id UUID,
  p_limit INTEGER DEFAULT 20,
  p_days_back INTEGER DEFAULT 30
)
RETURNS TABLE (
  -- Update fields
  id UUID,
  parent_id UUID,
  child_id UUID,
  content TEXT,
  subject TEXT,
  rich_content JSONB,
  content_format TEXT,
  media_urls TEXT[],
  milestone_type TEXT,
  ai_analysis JSONB,
  suggested_recipients TEXT[],
  confirmed_recipients TEXT[],
  distribution_status TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  scheduled_for TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  -- Child fields
  child_name TEXT,
  child_birth_date DATE,
  child_profile_photo_url TEXT,
  -- Engagement stats
  like_count INTEGER,
  comment_count INTEGER,
  view_count INTEGER,
  -- Response stats
  response_count INTEGER,
  last_response_at TIMESTAMPTZ,
  -- User interaction
  is_liked BOOLEAN
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    -- Update fields
    m.id,
    m.parent_id,
    m.child_id,
    m.content,
    m.subject,
    m.rich_content,
    m.content_format,
    m.media_urls,
    m.milestone_type,
    m.ai_analysis,
    m.suggested_recipients,
    m.confirmed_recipients,
    m.distribution_status,
    m.created_at,
    m.updated_at,
    m.scheduled_for,
    m.sent_at,
    -- Child fields (JOIN)
    c.name AS child_name,
    c.birth_date AS child_birth_date,
    c.profile_photo_url AS child_profile_photo_url,
    -- Engagement stats (from update table)
    COALESCE(m.like_count, 0)::INTEGER,
    COALESCE(m.comment_count, 0)::INTEGER,
    COALESCE(m.view_count, 0)::INTEGER,
    -- Response stats (LEFT JOIN aggregation)
    COALESCE(response_stats.response_count, 0)::INTEGER AS response_count,
    response_stats.last_response_at,
    -- User like status (LEFT JOIN check)
    CASE WHEN user_likes.update_id IS NOT NULL THEN true ELSE false END AS is_liked
  FROM public.memories m
  -- JOIN child data
  INNER JOIN public.children c ON m.child_id = c.id
  -- LEFT JOIN response stats (aggregated subquery)
  LEFT JOIN LATERAL (
    SELECT
      COUNT(*)::INTEGER AS response_count,
      MAX(r.received_at) AS last_response_at
    FROM public.responses r
    WHERE r.update_id = m.id
  ) response_stats ON true
  -- LEFT JOIN user likes
  LEFT JOIN public.likes user_likes
    ON user_likes.update_id = m.id
    AND user_likes.parent_id = p_parent_id
  WHERE
    m.parent_id = p_parent_id
    AND m.created_at >= NOW() - (p_days_back || ' days')::INTERVAL
  ORDER BY m.created_at DESC, m.id DESC
  LIMIT p_limit;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_recent_updates_with_all_stats(UUID, INTEGER, INTEGER) TO authenticated;

COMMENT ON FUNCTION public.get_recent_updates_with_all_stats IS
  'Comprehensive function to fetch recent updates with all related data and statistics in a SINGLE query. Replaces the N+1 pattern in getRecentUpdatesWithStats(). Performance: 1 query vs 1+2N queries.';

-- =============================================================================
-- PART 6: ANALYZE TABLES FOR QUERY PLANNER OPTIMIZATION
-- =============================================================================

-- Update statistics for query planner
ANALYZE public.memories;
ANALYZE public.responses;
ANALYZE public.likes;
ANALYZE public.children;

-- =============================================================================
-- PART 7: CREATE PERFORMANCE MONITORING VIEW
-- =============================================================================

-- View to monitor N+1 query elimination effectiveness
CREATE OR REPLACE VIEW v_n_plus_1_prevention AS
SELECT
  'Batch Response Stats' AS optimization,
  'get_update_response_stats' AS function_name,
  (
    SELECT COUNT(*)::BIGINT
    FROM pg_stat_user_functions
    WHERE funcname = 'get_update_response_stats'
  ) AS times_called,
  'Eliminates 2N queries for response stats' AS benefit
UNION ALL
SELECT
  'Comprehensive Dashboard Load' AS optimization,
  'get_recent_updates_with_all_stats' AS function_name,
  (
    SELECT COUNT(*)::BIGINT
    FROM pg_stat_user_functions
    WHERE funcname = 'get_recent_updates_with_all_stats'
  ) AS times_called,
  'Reduces 1+2N queries to 1 query' AS benefit
UNION ALL
SELECT
  'Batch Likes Check' AS optimization,
  'get_user_likes_for_updates' AS function_name,
  (
    SELECT COUNT(*)::BIGINT
    FROM pg_stat_user_functions
    WHERE funcname = 'get_user_likes_for_updates'
  ) AS times_called,
  'Eliminates N queries for like checks' AS benefit;

COMMENT ON VIEW v_n_plus_1_prevention IS
  'Monitoring view for N+1 query prevention effectiveness. Shows usage statistics for batch optimization functions.';

-- =============================================================================
-- PART 8: VALIDATION QUERIES (FOR TESTING)
-- =============================================================================

-- Test queries to validate the optimization works correctly

-- Test 1: Batch response stats (should be FAST - single aggregation query)
-- EXPLAIN (ANALYZE, BUFFERS)
-- SELECT * FROM get_update_response_stats(ARRAY[
--   '00000000-0000-0000-0000-000000000001'::UUID,
--   '00000000-0000-0000-0000-000000000002'::UUID
-- ]);

-- Test 2: Comprehensive stats (should be FAST - single query with JOINs)
-- EXPLAIN (ANALYZE, BUFFERS)
-- SELECT * FROM get_recent_updates_with_all_stats(
--   'USER_ID'::UUID,
--   20,  -- limit
--   30   -- days back
-- );

-- Test 3: Batch likes check
-- EXPLAIN (ANALYZE, BUFFERS)
-- SELECT * FROM get_user_likes_for_updates(
--   'USER_ID'::UUID,
--   ARRAY[
--     '00000000-0000-0000-0000-000000000001'::UUID,
--     '00000000-0000-0000-0000-000000000002'::UUID
--   ]
-- );

-- =============================================================================
-- PART 9: MIGRATION SUMMARY AND USAGE EXAMPLES
-- =============================================================================

DO $$
BEGIN
  RAISE NOTICE '============================================================';
  RAISE NOTICE 'CRO-98: N+1 Query Elimination Migration Complete';
  RAISE NOTICE '============================================================';
  RAISE NOTICE 'Performance: 42 queries -> 3 queries (90 percent reduction)';
  RAISE NOTICE ' ';
  RAISE NOTICE 'Functions Created:';
  RAISE NOTICE '  - get_update_response_stats(update_ids[])';
  RAISE NOTICE '  - get_user_likes_for_updates(user_id, update_ids[])';
  RAISE NOTICE '  - get_recent_updates_with_all_stats(parent_id, limit, days)';
  RAISE NOTICE ' ';
  RAISE NOTICE 'Indexes Created:';
  RAISE NOTICE '  - idx_responses_update_stats_agg';
  RAISE NOTICE '  - idx_likes_parent_update_batch';
  RAISE NOTICE ' ';
  RAISE NOTICE 'Monitoring:';
  RAISE NOTICE '  SELECT * FROM v_n_plus_1_prevention;';
  RAISE NOTICE ' ';
  RAISE NOTICE 'TypeScript code in src/lib/updates.ts is ready to use these!';
  RAISE NOTICE '============================================================';
END $$;
