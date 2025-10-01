-- Migration: Optimize JSONB Query Patterns with Proper Indexing
-- Date: 2025-10-01
-- Description: Add expression indexes, partial indexes, and optimized GIN indexes for JSONB columns
-- Priority: High | Category: Performance | Effort: Medium

-- =============================================================================
-- PART 1: PROFILES.NOTIFICATION_PREFERENCES OPTIMIZATION
-- =============================================================================

-- Drop existing generic GIN index if it exists
DROP INDEX IF EXISTS idx_profiles_notification_prefs;

-- Add expression indexes for commonly accessed notification preference paths
-- These indexes dramatically improve queries filtering on specific JSONB keys

-- Index for email notifications boolean flag
CREATE INDEX IF NOT EXISTS idx_profiles_email_notifications
  ON profiles (CAST(notification_preferences->>'email_notifications' AS boolean))
  WHERE CAST(notification_preferences->>'email_notifications' AS boolean) = true;

-- Index for browser notifications boolean flag
CREATE INDEX IF NOT EXISTS idx_profiles_browser_notifications
  ON profiles (CAST(notification_preferences->>'browser_notifications' AS boolean))
  WHERE CAST(notification_preferences->>'browser_notifications' AS boolean) = true;

-- Index for delivery notifications boolean flag
CREATE INDEX IF NOT EXISTS idx_profiles_delivery_notifications
  ON profiles (CAST(notification_preferences->>'delivery_notifications' AS boolean))
  WHERE CAST(notification_preferences->>'delivery_notifications' AS boolean) = true;

-- Index for system notifications boolean flag
CREATE INDEX IF NOT EXISTS idx_profiles_system_notifications
  ON profiles (CAST(notification_preferences->>'system_notifications' AS boolean))
  WHERE CAST(notification_preferences->>'system_notifications' AS boolean) = true;

-- Index for weekly digest boolean flag
CREATE INDEX IF NOT EXISTS idx_profiles_weekly_digest
  ON profiles (CAST(notification_preferences->>'weekly_digest' AS boolean))
  WHERE CAST(notification_preferences->>'weekly_digest' AS boolean) = true;

-- Index for quiet hours start time
CREATE INDEX IF NOT EXISTS idx_profiles_quiet_hours_start
  ON profiles ((notification_preferences->'quiet_hours'->>'start'));

-- Index for quiet hours end time
CREATE INDEX IF NOT EXISTS idx_profiles_quiet_hours_end
  ON profiles ((notification_preferences->'quiet_hours'->>'end'));

-- Index for response notifications setting
CREATE INDEX IF NOT EXISTS idx_profiles_response_notifications
  ON profiles ((notification_preferences->>'response_notifications'));

-- Index for prompt frequency
CREATE INDEX IF NOT EXISTS idx_profiles_prompt_frequency
  ON profiles ((notification_preferences->>'prompt_frequency'));

-- Index for weekly digest day
CREATE INDEX IF NOT EXISTS idx_profiles_weekly_digest_day
  ON profiles ((notification_preferences->>'weekly_digest_day'))
  WHERE CAST(notification_preferences->>'weekly_digest' AS boolean) = true;

-- Index for digest email time
CREATE INDEX IF NOT EXISTS idx_profiles_digest_email_time
  ON profiles ((notification_preferences->>'digest_email_time'))
  WHERE CAST(notification_preferences->>'weekly_digest' AS boolean) = true;

-- GIN index for array containment queries (enabled_prompt_types)
-- Using jsonb_path_ops for better performance on containment queries
CREATE INDEX IF NOT EXISTS idx_profiles_notification_prefs_gin
  ON profiles USING GIN (notification_preferences jsonb_path_ops);

-- =============================================================================
-- PART 2: RECIPIENTS TABLE OPTIMIZATION
-- =============================================================================
-- Note: Recipients table uses array columns (preferred_channels, content_types)
-- instead of JSONB notification_preferences in the current schema

-- Index for active recipients
CREATE INDEX IF NOT EXISTS idx_recipients_active
  ON recipients (is_active)
  WHERE is_active = true;

-- Index for recipient group lookups
CREATE INDEX IF NOT EXISTS idx_recipients_group_id
  ON recipients (group_id)
  WHERE group_id IS NOT NULL;

-- Index for email recipients
CREATE INDEX IF NOT EXISTS idx_recipients_email
  ON recipients (email)
  WHERE email IS NOT NULL AND is_active = true;

-- Index for phone recipients
CREATE INDEX IF NOT EXISTS idx_recipients_phone
  ON recipients (phone)
  WHERE phone IS NOT NULL AND is_active = true;

-- Index for frequency (for digest processing)
CREATE INDEX IF NOT EXISTS idx_recipients_frequency
  ON recipients (frequency)
  WHERE is_active = true;

-- Composite index for parent's active recipients
CREATE INDEX IF NOT EXISTS idx_recipients_parent_active
  ON recipients (parent_id, is_active)
  WHERE is_active = true;

-- =============================================================================
-- PART 3: NOTIFICATION_HISTORY.METADATA OPTIMIZATION
-- =============================================================================

-- Drop existing generic GIN index
DROP INDEX IF EXISTS idx_notification_history_metadata;

-- GIN index with jsonb_path_ops for better containment query performance
CREATE INDEX IF NOT EXISTS idx_notification_history_metadata_gin
  ON notification_history USING GIN (metadata jsonb_path_ops);

-- Expression index for update_id in metadata (common lookup pattern)
CREATE INDEX IF NOT EXISTS idx_notification_history_metadata_update_id
  ON notification_history ((metadata->>'update_id'))
  WHERE metadata ? 'update_id';

-- Expression index for response_id in metadata
CREATE INDEX IF NOT EXISTS idx_notification_history_metadata_response_id
  ON notification_history ((metadata->>'response_id'))
  WHERE metadata ? 'response_id';

-- Composite index for user queries with metadata filtering
CREATE INDEX IF NOT EXISTS idx_notification_history_user_metadata_type
  ON notification_history (user_id, type)
  INCLUDE (metadata)
  WHERE metadata IS NOT NULL AND metadata != '{}'::jsonb;

-- =============================================================================
-- PART 4: AI_PROMPTS.PROMPT_DATA OPTIMIZATION
-- =============================================================================

-- GIN index for AI prompts data with path ops
CREATE INDEX IF NOT EXISTS idx_ai_prompts_prompt_data_gin
  ON ai_prompts USING GIN (prompt_data jsonb_path_ops);

-- Index for prompt status (for filtering pending/sent prompts)
CREATE INDEX IF NOT EXISTS idx_ai_prompts_status
  ON ai_prompts (status)
  WHERE status IN ('pending', 'sent');

-- Composite index for parent's prompts by type and status
CREATE INDEX IF NOT EXISTS idx_ai_prompts_parent_type_status
  ON ai_prompts (parent_id, prompt_type, status);

-- =============================================================================
-- PART 5: UPDATES.AI_ANALYSIS OPTIMIZATION
-- =============================================================================

-- GIN index for updates AI analysis with path ops
CREATE INDEX IF NOT EXISTS idx_updates_ai_analysis_gin
  ON updates USING GIN (ai_analysis jsonb_path_ops);

-- Index for updates with rich content
CREATE INDEX IF NOT EXISTS idx_updates_rich_content_gin
  ON updates USING GIN (rich_content jsonb_path_ops)
  WHERE rich_content IS NOT NULL;

-- =============================================================================
-- PART 6: DIGEST_QUEUE.CONTENT OPTIMIZATION
-- =============================================================================

-- GIN index for digest queue content with path ops
CREATE INDEX IF NOT EXISTS idx_digest_queue_content_gin
  ON digest_queue USING GIN (content jsonb_path_ops);

-- Expression index for update count in digest content
CREATE INDEX IF NOT EXISTS idx_digest_queue_content_update_count
  ON digest_queue (CAST(content->>'update_count' AS integer))
  WHERE content ? 'update_count';

-- Composite index for pending digests with content filtering
CREATE INDEX IF NOT EXISTS idx_digest_queue_pending_content
  ON digest_queue (delivery_status, scheduled_for)
  INCLUDE (content)
  WHERE delivery_status IN ('pending', 'processing');

-- =============================================================================
-- PART 7: DIGESTS TABLE OPTIMIZATION
-- =============================================================================

-- GIN index for AI compilation data with path ops
CREATE INDEX IF NOT EXISTS idx_digests_ai_compilation_data_gin
  ON digests USING GIN (ai_compilation_data jsonb_path_ops);

-- GIN index for recipient breakdown with path ops
CREATE INDEX IF NOT EXISTS idx_digests_recipient_breakdown_gin
  ON digests USING GIN (recipient_breakdown jsonb_path_ops);

-- Expression index for compilation status in AI data
CREATE INDEX IF NOT EXISTS idx_digests_ai_compilation_status
  ON digests ((ai_compilation_data->>'status'))
  WHERE ai_compilation_data ? 'status';

-- =============================================================================
-- PART 8: DIGEST_UPDATES.AI_RATIONALE OPTIMIZATION
-- =============================================================================

-- GIN index for AI rationale with path ops
CREATE INDEX IF NOT EXISTS idx_digest_updates_ai_rationale_gin
  ON digest_updates USING GIN (ai_rationale jsonb_path_ops);

-- =============================================================================
-- PERFORMANCE ANALYSIS HELPER VIEWS
-- =============================================================================

-- View to monitor JSONB index usage
CREATE OR REPLACE VIEW v_jsonb_index_usage AS
SELECT
  schemaname,
  tablename,
  indexname,
  idx_scan as index_scans,
  idx_tup_read as tuples_read,
  idx_tup_fetch as tuples_fetched,
  pg_size_pretty(pg_relation_size(indexrelid)) as index_size
FROM pg_stat_user_indexes
WHERE indexname LIKE '%notification%' OR indexname LIKE '%metadata%' OR indexname LIKE '%digest%'
ORDER BY idx_scan DESC;

-- View to identify slow JSONB queries
CREATE OR REPLACE VIEW v_jsonb_query_performance AS
SELECT
  query,
  calls,
  total_exec_time,
  mean_exec_time,
  min_exec_time,
  max_exec_time
FROM pg_stat_statements
WHERE query LIKE '%notification_preferences%'
   OR query LIKE '%metadata%'
   OR query LIKE '%->>%'
   OR query LIKE '%->%'
ORDER BY mean_exec_time DESC
LIMIT 50;

-- =============================================================================
-- COMMENTS AND DOCUMENTATION
-- =============================================================================

COMMENT ON INDEX idx_profiles_email_notifications IS 'Optimized partial index for profiles with email notifications enabled';
COMMENT ON INDEX idx_profiles_quiet_hours_start IS 'Expression index for quiet hours start time lookups';
COMMENT ON INDEX idx_recipients_mute_until IS 'Partial index for active muted recipients with future mute_until timestamps';
COMMENT ON INDEX idx_notification_history_metadata_gin IS 'GIN index with jsonb_path_ops for efficient metadata containment queries';
COMMENT ON INDEX idx_notification_jobs_metadata_gin IS 'GIN index with jsonb_path_ops for notification job metadata queries';
COMMENT ON INDEX idx_digest_queue_content_gin IS 'GIN index with jsonb_path_ops for digest queue content searches';
COMMENT ON INDEX idx_digests_ai_compilation_data_gin IS 'GIN index for AI compilation data searches';

COMMENT ON VIEW v_jsonb_index_usage IS 'Monitoring view for JSONB index usage statistics';
COMMENT ON VIEW v_jsonb_query_performance IS 'Monitoring view for JSONB query performance from pg_stat_statements';

-- =============================================================================
-- ANALYZE TABLES TO UPDATE STATISTICS
-- =============================================================================

-- Update table statistics for better query planning
ANALYZE profiles;
ANALYZE recipients;
ANALYZE notification_history;
ANALYZE notification_jobs;
ANALYZE digest_queue;
ANALYZE digests;
ANALYZE digest_updates;
