-- Migration: JSONB Query Pattern Improvements
-- Date: 2025-10-15
-- Description: Additional JSONB indexing and query optimization for performance improvements
-- Issue: CRO-118 - Inefficient JSONB Query Patterns Without Proper Indexing
--
-- IMPORTANT: Execute this migration via Supabase SQL Editor
-- Do NOT run via CLI or automated migration tools
--
-- This migration builds on 20251001000001_optimize_jsonb_indexes.sql
-- and addresses remaining gaps in JSONB query performance

-- =============================================================================
-- PART 1: MEMORIES.AI_ANALYSIS OPTIMIZATION
-- =============================================================================

-- Expression index for sentiment filtering
-- Common query pattern: Find all positive/negative memories
CREATE INDEX IF NOT EXISTS idx_memories_ai_analysis_sentiment
  ON memories ((ai_analysis->>'sentiment'))
  WHERE ai_analysis ? 'sentiment';

COMMENT ON INDEX idx_memories_ai_analysis_sentiment IS
  'Expression index for filtering memories by AI-detected sentiment (positive, negative, neutral)';

-- Expression index for suggested recipients lookup
-- Common query pattern: Find memories with specific recipient suggestions
CREATE INDEX IF NOT EXISTS idx_memories_ai_analysis_suggested_recipients
  ON memories USING GIN ((ai_analysis->'suggested_recipients'))
  WHERE ai_analysis ? 'suggested_recipients';

COMMENT ON INDEX idx_memories_ai_analysis_suggested_recipients IS
  'GIN index for searching memories by AI-suggested recipients';

-- Partial index for high-confidence AI suggestions
-- Helps filter memories where AI is very confident about suggestions
CREATE INDEX IF NOT EXISTS idx_memories_ai_high_confidence
  ON memories (id, created_at)
  INCLUDE (ai_analysis)
  WHERE ai_analysis ? 'suggested_metadata'
    AND (ai_analysis->'suggested_metadata'->'confidence_scores'->>'overall')::numeric > 0.8;

COMMENT ON INDEX idx_memories_ai_high_confidence IS
  'Partial index for memories with high-confidence AI suggestions (>80%)';

-- =============================================================================
-- PART 2: AI_PROMPTS.PROMPT_DATA OPTIMIZATION
-- =============================================================================

-- Expression index for prompt_type filtering
-- Common query pattern: Find prompts of specific type (milestone, activity, fun)
CREATE INDEX IF NOT EXISTS idx_ai_prompts_prompt_type
  ON ai_prompts ((prompt_data->>'prompt_type'))
  WHERE prompt_data ? 'prompt_type';

COMMENT ON INDEX idx_ai_prompts_prompt_type IS
  'Expression index for filtering AI prompts by type';

-- Expression index for context-based queries
-- Common query pattern: Find prompts with specific context keywords
CREATE INDEX IF NOT EXISTS idx_ai_prompts_context
  ON ai_prompts ((prompt_data->>'context'))
  WHERE prompt_data ? 'context' AND prompt_data->>'context' IS NOT NULL;

COMMENT ON INDEX idx_ai_prompts_context IS
  'Expression index for searching prompts by context content';

-- GIN index for prompt metadata searches
CREATE INDEX IF NOT EXISTS idx_ai_prompts_metadata
  ON ai_prompts USING GIN ((prompt_data->'metadata'))
  WHERE prompt_data ? 'metadata';

COMMENT ON INDEX idx_ai_prompts_metadata IS
  'GIN index for containment searches within prompt metadata';

-- Composite index for active prompts by type
CREATE INDEX IF NOT EXISTS idx_ai_prompts_parent_type_status
  ON ai_prompts (parent_id, (prompt_data->>'prompt_type'), status)
  WHERE status IN ('pending', 'sent') AND prompt_data ? 'prompt_type';

COMMENT ON INDEX idx_ai_prompts_parent_type_status IS
  'Composite index for efficient lookup of active prompts by user and type';

-- =============================================================================
-- PART 3: PARTIAL INDEXES FOR COMMON FILTERED QUERIES
-- =============================================================================

-- Partial index for milestone-related memories
CREATE INDEX IF NOT EXISTS idx_memories_milestones
  ON memories (parent_id, created_at)
  INCLUDE (content, milestone_type)
  WHERE milestone_type IS NOT NULL
    OR (metadata ? 'milestones' AND jsonb_array_length(metadata->'milestones') > 0);

COMMENT ON INDEX idx_memories_milestones IS
  'Partial index for memories tagged as milestones (via milestone_type or metadata)';

-- Partial index for memories with media attachments
CREATE INDEX IF NOT EXISTS idx_memories_with_media
  ON memories (parent_id, created_at)
  INCLUDE (content, media_urls)
  WHERE media_urls IS NOT NULL AND array_length(media_urls, 1) > 0;

COMMENT ON INDEX idx_memories_with_media IS
  'Partial index for memories that have media attachments';

-- Partial index for urgent notification jobs
CREATE INDEX IF NOT EXISTS idx_notification_jobs_urgent
  ON notification_jobs (scheduled_for, recipient_id)
  INCLUDE (content, delivery_method)
  WHERE status = 'pending'
    AND (content->>'urgency_level' = 'urgent' OR content->>'urgency_level' = 'high');

COMMENT ON INDEX idx_notification_jobs_urgent IS
  'Partial index for high-priority pending notification jobs requiring immediate delivery';

-- Partial index for digest queue ready for processing
-- Note: Cannot use NOW() in partial index (not immutable), so we index all pending/processing items
CREATE INDEX IF NOT EXISTS idx_digest_queue_ready
  ON digest_queue (delivery_status, scheduled_for, user_id)
  INCLUDE (content, digest_type)
  WHERE delivery_status IN ('pending', 'processing');

COMMENT ON INDEX idx_digest_queue_ready IS
  'Partial index for pending/processing digest queue items, sorted by scheduled_for for efficient processing';

-- =============================================================================
-- PART 4: OPTIMIZED HELPER FUNCTIONS
-- =============================================================================

-- Function: Find memories by AI-detected sentiment
CREATE OR REPLACE FUNCTION find_memories_by_sentiment(
  p_sentiment TEXT,
  p_limit INTEGER DEFAULT 50,
  p_offset INTEGER DEFAULT 0
)
RETURNS TABLE(
  memory_id UUID,
  content TEXT,
  sentiment TEXT,
  confidence NUMERIC,
  created_at TIMESTAMP WITH TIME ZONE
) AS $$
DECLARE
  v_user_id UUID := auth.uid();
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'find_memories_by_sentiment requires an authenticated user';
  END IF;

  RETURN QUERY
  SELECT
    m.id,
    m.content,
    (m.ai_analysis->>'sentiment')::TEXT as sentiment,
    COALESCE((m.ai_analysis->'confidence'->>'sentiment')::NUMERIC, 0) as confidence,
    m.created_at
  FROM memories m
  WHERE m.parent_id = v_user_id
    AND m.ai_analysis ? 'sentiment'
    AND m.ai_analysis->>'sentiment' = p_sentiment
  ORDER BY m.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

COMMENT ON FUNCTION find_memories_by_sentiment IS
  'Find memories filtered by AI-detected sentiment (uses idx_memories_ai_analysis_sentiment)';

GRANT EXECUTE ON FUNCTION find_memories_by_sentiment TO authenticated;

-- Function: Get AI prompts by type for user
CREATE OR REPLACE FUNCTION get_ai_prompts_by_type(
  p_prompt_type TEXT,
  p_status TEXT DEFAULT 'pending',
  p_limit INTEGER DEFAULT 20
)
RETURNS TABLE(
  prompt_id UUID,
  prompt_type TEXT,
  context TEXT,
  prompt_data JSONB,
  status TEXT,
  created_at TIMESTAMP WITH TIME ZONE
) AS $$
DECLARE
  v_user_id UUID := auth.uid();
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'get_ai_prompts_by_type requires an authenticated user';
  END IF;

  RETURN QUERY
  SELECT
    ap.id,
    (ap.prompt_data->>'prompt_type')::TEXT as prompt_type,
    (ap.prompt_data->>'context')::TEXT as context,
    ap.prompt_data,
    ap.status::TEXT,
    ap.created_at
  FROM ai_prompts ap
  WHERE ap.parent_id = v_user_id
    AND ap.prompt_data ? 'prompt_type'
    AND ap.prompt_data->>'prompt_type' = p_prompt_type
    AND ap.status::TEXT = p_status
  ORDER BY ap.created_at DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

COMMENT ON FUNCTION get_ai_prompts_by_type IS
  'Get AI prompts filtered by type and status (uses idx_ai_prompts_parent_type_status)';

GRANT EXECUTE ON FUNCTION get_ai_prompts_by_type TO authenticated;

-- Function: Find high-confidence AI suggestions
CREATE OR REPLACE FUNCTION find_high_confidence_suggestions(
  p_min_confidence NUMERIC DEFAULT 0.8,
  p_limit INTEGER DEFAULT 50
)
RETURNS TABLE(
  memory_id UUID,
  content TEXT,
  suggested_metadata JSONB,
  confidence_scores JSONB,
  created_at TIMESTAMP WITH TIME ZONE
) AS $$
DECLARE
  v_user_id UUID := auth.uid();
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'find_high_confidence_suggestions requires an authenticated user';
  END IF;

  RETURN QUERY
  SELECT
    m.id,
    m.content,
    m.ai_analysis->'suggested_metadata' as suggested_metadata,
    m.ai_analysis->'suggested_metadata'->'confidence_scores' as confidence_scores,
    m.created_at
  FROM memories m
  WHERE m.parent_id = v_user_id
    AND m.ai_analysis ? 'suggested_metadata'
    AND (m.ai_analysis->'suggested_metadata'->'confidence_scores'->>'overall')::NUMERIC >= p_min_confidence
  ORDER BY
    (m.ai_analysis->'suggested_metadata'->'confidence_scores'->>'overall')::NUMERIC DESC,
    m.created_at DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

COMMENT ON FUNCTION find_high_confidence_suggestions IS
  'Find memories with high-confidence AI metadata suggestions (uses idx_memories_ai_high_confidence)';

GRANT EXECUTE ON FUNCTION find_high_confidence_suggestions TO authenticated;

-- Function: Get urgent notification jobs for processing
CREATE OR REPLACE FUNCTION get_urgent_notification_jobs(
  p_limit INTEGER DEFAULT 100
)
RETURNS TABLE(
  job_id UUID,
  recipient_id UUID,
  urgency_level TEXT,
  scheduled_for TIMESTAMP WITH TIME ZONE,
  content JSONB,
  delivery_method TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    nj.id,
    nj.recipient_id,
    (nj.content->>'urgency_level')::TEXT,
    nj.scheduled_for,
    nj.content,
    nj.delivery_method::TEXT
  FROM notification_jobs nj
  WHERE nj.status = 'pending'
    AND (nj.content->>'urgency_level' IN ('urgent', 'high'))
    AND nj.scheduled_for <= NOW()
  ORDER BY
    CASE nj.content->>'urgency_level'
      WHEN 'urgent' THEN 1
      WHEN 'high' THEN 2
      ELSE 3
    END,
    nj.scheduled_for ASC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

COMMENT ON FUNCTION get_urgent_notification_jobs IS
  'Get pending urgent notification jobs ready for immediate processing (uses idx_notification_jobs_urgent)';

GRANT EXECUTE ON FUNCTION get_urgent_notification_jobs TO service_role;

-- Function: Get digest queue items ready for processing
CREATE OR REPLACE FUNCTION get_ready_digest_queue(
  p_digest_type TEXT DEFAULT NULL,
  p_limit INTEGER DEFAULT 50
)
RETURNS TABLE(
  queue_id UUID,
  user_id UUID,
  digest_type TEXT,
  update_count INTEGER,
  scheduled_for TIMESTAMP WITH TIME ZONE,
  content JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    dq.id,
    dq.user_id,
    dq.digest_type::TEXT,
    COALESCE((dq.content->>'update_count')::INTEGER, 0) as update_count,
    dq.scheduled_for,
    dq.content
  FROM digest_queue dq
  WHERE dq.delivery_status IN ('pending', 'processing')
    AND dq.scheduled_for <= NOW() + INTERVAL '5 minutes'
    AND (p_digest_type IS NULL OR dq.digest_type::TEXT = p_digest_type)
  ORDER BY
    dq.scheduled_for ASC,
    dq.created_at ASC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

COMMENT ON FUNCTION get_ready_digest_queue IS
  'Get digest queue items ready for processing (uses idx_digest_queue_ready)';

GRANT EXECUTE ON FUNCTION get_ready_digest_queue TO service_role;

-- Function: Batch get notification preferences (optimized for bulk operations)
CREATE OR REPLACE FUNCTION batch_get_notification_preferences(
  p_user_ids UUID[]
)
RETURNS TABLE(
  user_id UUID,
  email_enabled BOOLEAN,
  browser_enabled BOOLEAN,
  quiet_hours_start TEXT,
  quiet_hours_end TEXT,
  weekly_digest BOOLEAN,
  full_preferences JSONB
) AS $$
DECLARE
  v_requesting_user UUID := auth.uid();
  v_requested_ids UUID[];
BEGIN
  IF v_requesting_user IS NULL THEN
    RAISE EXCEPTION 'batch_get_notification_preferences requires an authenticated user';
  END IF;

  v_requested_ids := COALESCE(p_user_ids, ARRAY[v_requesting_user]::uuid[]);

  IF array_length(v_requested_ids, 1) IS NULL THEN
    v_requested_ids := ARRAY[v_requesting_user]::uuid[];
  END IF;

  IF NOT v_requesting_user = ANY(v_requested_ids) THEN
    RAISE EXCEPTION 'batch_get_notification_preferences may only be called for the authenticated user';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM unnest(v_requested_ids) AS requested_id
    WHERE requested_id <> v_requesting_user
  ) THEN
    RAISE EXCEPTION 'batch_get_notification_preferences may not request other users';
  END IF;

  RETURN QUERY
  SELECT
    p.id,
    COALESCE((p.notification_preferences->>'email_notifications')::BOOLEAN, true) as email_enabled,
    COALESCE((p.notification_preferences->>'browser_notifications')::BOOLEAN, false) as browser_enabled,
    (p.notification_preferences->'quiet_hours'->>'start')::TEXT,
    (p.notification_preferences->'quiet_hours'->>'end')::TEXT,
    COALESCE((p.notification_preferences->>'weekly_digest')::BOOLEAN, false) as weekly_digest,
    p.notification_preferences
  FROM profiles p
  WHERE p.id = v_requesting_user;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

COMMENT ON FUNCTION batch_get_notification_preferences IS
  'Efficiently retrieve notification preferences for multiple users (batched query optimization)';

GRANT EXECUTE ON FUNCTION batch_get_notification_preferences TO authenticated;

-- Function: Search memories with multiple metadata filters
CREATE OR REPLACE FUNCTION search_memories_advanced(
  p_sentiment TEXT DEFAULT NULL,
  p_has_milestones BOOLEAN DEFAULT NULL,
  p_has_media BOOLEAN DEFAULT NULL,
  p_min_confidence NUMERIC DEFAULT NULL,
  p_date_from TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  p_date_to TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  p_limit INTEGER DEFAULT 50,
  p_offset INTEGER DEFAULT 0
)
RETURNS TABLE(
  memory_id UUID,
  content TEXT,
  sentiment TEXT,
  milestone_type TEXT,
  has_media BOOLEAN,
  metadata JSONB,
  ai_analysis JSONB,
  created_at TIMESTAMP WITH TIME ZONE
) AS $$
DECLARE
  v_user_id UUID := auth.uid();
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'search_memories_advanced requires an authenticated user';
  END IF;

  RETURN QUERY
  SELECT
    m.id,
    m.content,
    (m.ai_analysis->>'sentiment')::TEXT as sentiment,
    m.milestone_type,
    (m.media_urls IS NOT NULL AND array_length(m.media_urls, 1) > 0) as has_media,
    m.metadata,
    m.ai_analysis,
    m.created_at
  FROM memories m
  WHERE m.parent_id = v_user_id
    -- Sentiment filter
    AND (p_sentiment IS NULL OR m.ai_analysis->>'sentiment' = p_sentiment)
    -- Milestone filter
    AND (p_has_milestones IS NULL OR
         (p_has_milestones = true AND (m.milestone_type IS NOT NULL OR (m.metadata ? 'milestones' AND jsonb_array_length(m.metadata->'milestones') > 0))) OR
         (p_has_milestones = false AND m.milestone_type IS NULL AND (NOT m.metadata ? 'milestones' OR jsonb_array_length(m.metadata->'milestones') = 0)))
    -- Media filter
    AND (p_has_media IS NULL OR
         (p_has_media = true AND m.media_urls IS NOT NULL AND array_length(m.media_urls, 1) > 0) OR
         (p_has_media = false AND (m.media_urls IS NULL OR array_length(m.media_urls, 1) = 0)))
    -- Confidence filter
    AND (p_min_confidence IS NULL OR
         (m.ai_analysis ? 'suggested_metadata' AND (m.ai_analysis->'suggested_metadata'->'confidence_scores'->>'overall')::NUMERIC >= p_min_confidence))
    -- Date range filter
    AND (p_date_from IS NULL OR m.created_at >= p_date_from)
    AND (p_date_to IS NULL OR m.created_at <= p_date_to)
  ORDER BY m.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

COMMENT ON FUNCTION search_memories_advanced IS
  'Advanced memory search with multiple filters (sentiment, milestones, media, confidence, date range)';

GRANT EXECUTE ON FUNCTION search_memories_advanced TO authenticated;

-- =============================================================================
-- PART 5: PERFORMANCE MONITORING ENHANCEMENTS
-- =============================================================================

-- Enhanced view for JSONB index usage with additional metrics
CREATE OR REPLACE VIEW v_jsonb_index_usage_enhanced AS
SELECT
  schemaname,
  relname as tablename,
  indexrelname as indexname,
  idx_scan as index_scans,
  idx_tup_read as tuples_read,
  idx_tup_fetch as tuples_fetched,
  pg_size_pretty(pg_relation_size(indexrelid)) as index_size,
  pg_relation_size(indexrelid) as index_size_bytes,
  CASE
    WHEN idx_scan = 0 THEN 'UNUSED'
    WHEN idx_scan < 100 THEN 'LOW USAGE'
    WHEN idx_scan < 1000 THEN 'MODERATE USAGE'
    ELSE 'HIGH USAGE'
  END as usage_category,
  ROUND(
    CASE
      WHEN idx_scan > 0 THEN idx_tup_fetch::NUMERIC / idx_scan
      ELSE 0
    END,
    2
  ) as avg_tuples_per_scan
FROM pg_stat_user_indexes
WHERE indexrelname LIKE '%notification%'
   OR indexrelname LIKE '%metadata%'
   OR indexrelname LIKE '%digest%'
   OR indexrelname LIKE '%ai_%'
   OR indexrelname LIKE '%memories%'
   OR indexrelname LIKE '%prompts%'
ORDER BY idx_scan DESC, pg_relation_size(indexrelid) DESC;

COMMENT ON VIEW v_jsonb_index_usage_enhanced IS
  'Enhanced monitoring view for JSONB index usage with categorization and efficiency metrics';

-- Function to analyze JSONB query patterns and suggest optimizations
CREATE OR REPLACE FUNCTION analyze_jsonb_performance()
RETURNS TABLE(
  table_name TEXT,
  column_name TEXT,
  query_pattern TEXT,
  index_recommendation TEXT,
  estimated_benefit TEXT
) AS $$
BEGIN
  RETURN QUERY
  -- Check for commonly accessed JSONB paths without specific indexes
  SELECT
    'memories'::TEXT as table_name,
    'ai_analysis'::TEXT as column_name,
    'Sentiment filtering'::TEXT as query_pattern,
    'CREATE INDEX idx_memories_ai_analysis_sentiment ON memories ((ai_analysis->>' || quote_literal('sentiment') || '))'::TEXT as index_recommendation,
    'HIGH - Frequently accessed path'::TEXT as estimated_benefit
  WHERE NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE indexname = 'idx_memories_ai_analysis_sentiment'
  )

  UNION ALL

  SELECT
    'ai_prompts'::TEXT,
    'prompt_data'::TEXT,
    'Prompt type filtering'::TEXT,
    'CREATE INDEX idx_ai_prompts_prompt_type ON ai_prompts ((prompt_data->>' || quote_literal('prompt_type') || '))'::TEXT,
    'HIGH - Common query pattern'::TEXT
  WHERE NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE indexname = 'idx_ai_prompts_prompt_type'
  )

  UNION ALL

  -- Generic recommendations
  SELECT
    'all_tables'::TEXT,
    'jsonb_columns'::TEXT,
    'Regular maintenance'::TEXT,
    'Run ANALYZE after bulk updates to JSONB columns'::TEXT,
    'MEDIUM - Ensures query planner has fresh statistics'::TEXT;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION analyze_jsonb_performance IS
  'Analyzes current schema and suggests JSONB index optimizations';

GRANT EXECUTE ON FUNCTION analyze_jsonb_performance TO service_role;

-- =============================================================================
-- PART 6: QUERY OPTIMIZATION STATISTICS
-- =============================================================================

-- Create a view to track JSONB query performance improvements
CREATE OR REPLACE VIEW v_jsonb_query_stats AS
SELECT
  schemaname || '.' || relname as full_table_name,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||relname)) as table_size,
  n_live_tup as row_count,
  n_tup_ins as inserts,
  n_tup_upd as updates,
  n_tup_del as deletes,
  n_tup_hot_upd as hot_updates,
  last_vacuum,
  last_autovacuum,
  last_analyze,
  last_autoanalyze
FROM pg_stat_user_tables
WHERE relname IN ('memories', 'profiles', 'ai_prompts', 'notification_jobs',
                    'notification_history', 'digest_queue', 'digests')
ORDER BY pg_total_relation_size(schemaname||'.'||relname) DESC;

COMMENT ON VIEW v_jsonb_query_stats IS
  'Statistics for tables with JSONB columns to monitor maintenance needs';

-- =============================================================================
-- PART 7: UPDATE TABLE STATISTICS
-- =============================================================================

-- Analyze tables to update query planner statistics
ANALYZE memories;
ANALYZE ai_prompts;
ANALYZE notification_jobs;
ANALYZE digest_queue;
ANALYZE profiles;

-- =============================================================================
-- PART 8: VALIDATION AND TESTING
-- =============================================================================

-- Test query 1: Sentiment filtering should use new index
-- EXPLAIN (ANALYZE, BUFFERS)
-- SELECT id, content FROM memories
-- WHERE parent_id = 'USER_ID' AND ai_analysis->>'sentiment' = 'positive'
-- LIMIT 10;

-- Test query 2: Prompt type filtering should use new index
-- EXPLAIN (ANALYZE, BUFFERS)
-- SELECT id FROM ai_prompts
-- WHERE parent_id = 'USER_ID' AND prompt_data->>'prompt_type' = 'milestone'
-- LIMIT 10;

-- Test query 3: Urgent jobs should use partial index
-- EXPLAIN (ANALYZE, BUFFERS)
-- SELECT * FROM notification_jobs
-- WHERE status = 'pending' AND content->>'urgency_level' = 'urgent'
-- LIMIT 10;

-- =============================================================================
-- MIGRATION COMPLETION LOG
-- =============================================================================

DO $$
BEGIN
  RAISE NOTICE '==========================================';
  RAISE NOTICE 'JSONB Query Pattern Improvements Migration Complete';
  RAISE NOTICE '==========================================';
  RAISE NOTICE 'Issue: CRO-118';
  RAISE NOTICE 'Created: %', NOW();
  RAISE NOTICE '';
  RAISE NOTICE 'Indexes Created:';
  RAISE NOTICE '- idx_memories_ai_analysis_sentiment';
  RAISE NOTICE '- idx_memories_ai_analysis_suggested_recipients';
  RAISE NOTICE '- idx_memories_ai_high_confidence';
  RAISE NOTICE '- idx_ai_prompts_prompt_type';
  RAISE NOTICE '- idx_ai_prompts_context';
  RAISE NOTICE '- idx_ai_prompts_metadata';
  RAISE NOTICE '- idx_ai_prompts_parent_type_status';
  RAISE NOTICE '- idx_memories_milestones';
  RAISE NOTICE '- idx_memories_with_media';
  RAISE NOTICE '- idx_notification_jobs_urgent';
  RAISE NOTICE '- idx_digest_queue_ready';
  RAISE NOTICE '';
  RAISE NOTICE 'Helper Functions Created:';
  RAISE NOTICE '- find_memories_by_sentiment()';
  RAISE NOTICE '- get_ai_prompts_by_type()';
  RAISE NOTICE '- find_high_confidence_suggestions()';
  RAISE NOTICE '- get_urgent_notification_jobs()';
  RAISE NOTICE '- get_ready_digest_queue()';
  RAISE NOTICE '- batch_get_notification_preferences()';
  RAISE NOTICE '- search_memories_advanced()';
  RAISE NOTICE '';
  RAISE NOTICE 'Monitoring Views Created:';
  RAISE NOTICE '- v_jsonb_index_usage_enhanced';
  RAISE NOTICE '- v_jsonb_query_stats';
  RAISE NOTICE '';
  RAISE NOTICE 'Next Steps:';
  RAISE NOTICE '1. Monitor index usage: SELECT * FROM v_jsonb_index_usage_enhanced;';
  RAISE NOTICE '2. Check performance: SELECT * FROM analyze_jsonb_performance();';
  RAISE NOTICE '3. Review table stats: SELECT * FROM v_jsonb_query_stats;';
  RAISE NOTICE '4. Update application code to use new helper functions';
  RAISE NOTICE '==========================================';
END $$;
