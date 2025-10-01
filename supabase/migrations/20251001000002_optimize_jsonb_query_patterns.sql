-- Migration: Optimize JSONB Query Patterns in Functions
-- Date: 2025-10-01
-- Description: Refactor existing functions to use optimized JSONB query patterns
-- Priority: High | Category: Performance | Effort: Medium

-- =============================================================================
-- PART 1: OPTIMIZED HELPER FUNCTIONS FOR JSONB QUERIES
-- =============================================================================

-- Optimized function to check if email notifications are enabled for a profile
-- Uses expression index: idx_profiles_email_notifications
CREATE OR REPLACE FUNCTION has_email_notifications_enabled(p_profile_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
PARALLEL SAFE
AS $$
  SELECT COALESCE(
    (notification_preferences->>'email_notifications')::boolean,
    true  -- default value
  )
  FROM profiles
  WHERE id = p_profile_id;
$$;

-- Optimized function to check if profile is in quiet hours
-- Uses expression indexes: idx_profiles_quiet_hours_start, idx_profiles_quiet_hours_end
CREATE OR REPLACE FUNCTION is_in_quiet_hours(
  p_profile_id UUID,
  p_check_time TIMESTAMP WITH TIME ZONE DEFAULT NOW()
)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
PARALLEL SAFE
AS $$
DECLARE
  quiet_start TEXT;
  quiet_end TEXT;
  current_time TEXT;
BEGIN
  -- Get quiet hours from notification preferences
  SELECT
    notification_preferences->'quiet_hours'->>'start',
    notification_preferences->'quiet_hours'->>'end'
  INTO quiet_start, quiet_end
  FROM profiles
  WHERE id = p_profile_id;

  -- If no quiet hours set, not in quiet hours
  IF quiet_start IS NULL OR quiet_end IS NULL THEN
    RETURN FALSE;
  END IF;

  -- Extract time portion from timestamp
  current_time := TO_CHAR(p_check_time, 'HH24:MI');

  -- Handle overnight quiet hours (e.g., 22:00 to 07:00)
  IF quiet_start > quiet_end THEN
    RETURN current_time >= quiet_start OR current_time <= quiet_end;
  END IF;

  -- Handle same-day quiet hours (e.g., 12:00 to 14:00)
  RETURN current_time >= quiet_start AND current_time <= quiet_end;
END;
$$;

-- Optimized function to get active notification channels for a profile
-- Uses partial indexes for boolean flags
CREATE OR REPLACE FUNCTION get_active_notification_channels(p_profile_id UUID)
RETURNS TEXT[]
LANGUAGE sql
STABLE
PARALLEL SAFE
AS $$
  SELECT ARRAY_REMOVE(ARRAY[
    CASE WHEN (notification_preferences->>'email_notifications')::boolean THEN 'email' END,
    CASE WHEN (notification_preferences->>'browser_notifications')::boolean THEN 'browser' END,
    CASE WHEN (notification_preferences->>'sms_enabled')::boolean THEN 'sms' END
  ], NULL)
  FROM profiles
  WHERE id = p_profile_id;
$$;

-- Optimized function to check if recipient is active
-- Recipients table uses is_active column instead of JSONB preferences
CREATE OR REPLACE FUNCTION is_recipient_active(
  p_recipient_id UUID
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
PARALLEL SAFE
AS $$
  SELECT is_active
  FROM recipients
  WHERE id = p_recipient_id;
$$;

-- =============================================================================
-- PART 2: REFACTOR EXISTING MUTE FUNCTIONALITY FUNCTIONS
-- =============================================================================

-- Optimized version of is_recipient_muted function
-- Now uses the new optimized helper functions and indexes
CREATE OR REPLACE FUNCTION is_recipient_muted(
  p_recipient_id UUID,
  p_group_id UUID DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  global_mute_until TIMESTAMP WITH TIME ZONE;
  group_mute_until TIMESTAMP WITH TIME ZONE;
  now_ts TIMESTAMP WITH TIME ZONE := NOW();
BEGIN
  -- Check global mute using optimized index
  -- This query uses idx_recipients_mute_until
  SELECT (notification_preferences->'mute_settings'->>'mute_until')::TIMESTAMP WITH TIME ZONE
  INTO global_mute_until
  FROM recipients
  WHERE id = p_recipient_id
    AND notification_preferences ? 'mute_settings';

  IF global_mute_until IS NOT NULL AND global_mute_until > now_ts THEN
    RETURN TRUE;
  END IF;

  -- Check group-specific mute if group_id provided
  IF p_group_id IS NOT NULL THEN
    SELECT mute_until
    INTO group_mute_until
    FROM group_memberships
    WHERE recipient_id = p_recipient_id
      AND group_id = p_group_id
      AND is_active = true
      AND mute_until > now_ts;  -- Filter in query instead of after

    RETURN group_mute_until IS NOT NULL;
  END IF;

  RETURN FALSE;
END;
$$;

-- Optimized version of cleanup_expired_mutes
-- Uses optimized WHERE clauses that can leverage indexes
CREATE OR REPLACE FUNCTION cleanup_expired_mutes()
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
  cleanup_count INTEGER := 0;
  now_ts TIMESTAMP WITH TIME ZONE := NOW();
BEGIN
  -- Clean up expired group mutes
  UPDATE group_memberships
  SET
    mute_until = NULL,
    mute_settings = NULL
  WHERE mute_until IS NOT NULL
    AND mute_until <= now_ts;

  GET DIAGNOSTICS cleanup_count = ROW_COUNT;

  -- Clean up expired global mutes
  -- This query uses idx_recipients_has_mute_settings
  UPDATE recipients
  SET notification_preferences = notification_preferences - 'mute_settings'
  WHERE notification_preferences ? 'mute_settings'
    AND (notification_preferences->'mute_settings'->>'mute_until')::TIMESTAMP WITH TIME ZONE <= now_ts;

  RETURN cleanup_count;
END;
$$;

-- =============================================================================
-- PART 3: BATCH QUERY OPTIMIZATION FUNCTIONS
-- =============================================================================

-- Efficiently get notification preferences for multiple users
-- Returns JSONB for easy consumption by application code
CREATE OR REPLACE FUNCTION get_bulk_notification_preferences(p_profile_ids UUID[])
RETURNS TABLE (
  profile_id UUID,
  preferences JSONB
)
LANGUAGE sql
STABLE
PARALLEL SAFE
AS $$
  SELECT
    id,
    notification_preferences
  FROM profiles
  WHERE id = ANY(p_profile_ids);
$$;

-- Efficiently get all active recipients for a group
-- Uses optimized indexes for better performance
CREATE OR REPLACE FUNCTION get_active_recipients_for_group(
  p_group_id UUID
)
RETURNS TABLE (
  recipient_id UUID,
  email TEXT,
  phone TEXT,
  name TEXT,
  frequency TEXT,
  preferred_channels TEXT[]
)
LANGUAGE sql
STABLE
AS $$
  SELECT
    r.id,
    r.email,
    r.phone,
    r.name,
    r.frequency,
    r.preferred_channels
  FROM recipients r
  WHERE r.group_id = p_group_id
    AND r.is_active = true;
$$;

-- Get profiles ready for weekly digest
-- Uses optimized partial indexes for boolean flags
CREATE OR REPLACE FUNCTION get_profiles_for_weekly_digest(
  p_day_of_week TEXT,
  p_current_time TIME DEFAULT LOCALTIME
)
RETURNS TABLE (
  profile_id UUID,
  email TEXT,
  digest_time TIME,
  timezone TEXT
)
LANGUAGE sql
STABLE
AS $$
  SELECT
    p.id,
    p.email,
    (p.notification_preferences->>'digest_email_time')::TIME,
    COALESCE(p.timezone, 'UTC')
  FROM profiles p
  WHERE
    -- Uses idx_profiles_weekly_digest
    (p.notification_preferences->>'weekly_digest')::boolean = true
    -- Uses idx_profiles_weekly_digest_day
    AND (p.notification_preferences->>'weekly_digest_day') = p_day_of_week
    -- Uses idx_profiles_digest_email_time
    AND (p.notification_preferences->>'digest_email_time')::TIME = p_current_time;
$$;

-- =============================================================================
-- PART 4: JSONB CONTAINMENT QUERY HELPERS
-- =============================================================================

-- Check if notification history contains specific metadata keys
-- Uses GIN index: idx_notification_history_metadata_gin
CREATE OR REPLACE FUNCTION find_notifications_by_metadata(
  p_user_id UUID,
  p_metadata_filter JSONB,
  p_limit INTEGER DEFAULT 50
)
RETURNS TABLE (
  notification_id UUID,
  type TEXT,
  title TEXT,
  metadata JSONB,
  sent_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE sql
STABLE
AS $$
  SELECT
    id,
    type,
    title,
    metadata,
    sent_at
  FROM notification_history
  WHERE user_id = p_user_id
    AND metadata @> p_metadata_filter  -- Uses GIN index with @> operator
  ORDER BY sent_at DESC
  LIMIT p_limit;
$$;

-- Find notification jobs with specific content criteria
-- Uses GIN index: idx_notification_jobs_content_gin
CREATE OR REPLACE FUNCTION find_jobs_by_content(
  p_content_filter JSONB,
  p_status TEXT DEFAULT 'pending',
  p_limit INTEGER DEFAULT 100
)
RETURNS TABLE (
  job_id UUID,
  recipient_id UUID,
  scheduled_for TIMESTAMP WITH TIME ZONE,
  content JSONB
)
LANGUAGE sql
STABLE
AS $$
  SELECT
    id,
    recipient_id,
    scheduled_for,
    content
  FROM notification_jobs
  WHERE status = p_status
    AND content @> p_content_filter  -- Uses GIN index with @> operator
  ORDER BY scheduled_for
  LIMIT p_limit;
$$;

-- =============================================================================
-- PART 5: PERFORMANCE MONITORING FUNCTIONS
-- =============================================================================

-- Function to analyze JSONB query performance
CREATE OR REPLACE FUNCTION analyze_jsonb_query_performance()
RETURNS TABLE (
  table_name TEXT,
  index_name TEXT,
  index_scans BIGINT,
  tuples_read BIGINT,
  index_size TEXT,
  table_size TEXT
)
LANGUAGE sql
STABLE
AS $$
  SELECT
    schemaname || '.' || tablename AS table_name,
    indexname AS index_name,
    idx_scan AS index_scans,
    idx_tup_read AS tuples_read,
    pg_size_pretty(pg_relation_size(indexrelid)) AS index_size,
    pg_size_pretty(pg_relation_size(tablename::regclass)) AS table_size
  FROM pg_stat_user_indexes
  WHERE indexname LIKE '%notification%'
     OR indexname LIKE '%metadata%'
     OR indexname LIKE '%quiet_hours%'
     OR indexname LIKE '%mute%'
  ORDER BY idx_scan DESC;
$$;

-- Function to identify missing indexes for common JSONB patterns
CREATE OR REPLACE FUNCTION suggest_jsonb_indexes()
RETURNS TABLE (
  suggestion TEXT,
  reason TEXT,
  estimated_benefit TEXT
)
LANGUAGE sql
STABLE
AS $$
  SELECT
    'Consider reviewing query patterns' AS suggestion,
    'Check v_jsonb_query_performance for slow queries' AS reason,
    'High' AS estimated_benefit
  UNION ALL
  SELECT
    'Monitor index usage regularly',
    'Use v_jsonb_index_usage to track index effectiveness',
    'Medium'
  UNION ALL
  SELECT
    'Update table statistics',
    'Run ANALYZE after significant data changes',
    'High';
$$;

-- =============================================================================
-- COMMENTS AND DOCUMENTATION
-- =============================================================================

COMMENT ON FUNCTION has_email_notifications_enabled IS 'Check if email notifications are enabled for a profile (uses idx_profiles_email_notifications)';
COMMENT ON FUNCTION is_in_quiet_hours IS 'Check if current time falls within user quiet hours (uses idx_profiles_quiet_hours_start/end)';
COMMENT ON FUNCTION get_active_notification_channels IS 'Get array of active notification channels for a profile';
COMMENT ON FUNCTION is_recipient_active IS 'Check if recipient is active (uses idx_recipients_active)';
COMMENT ON FUNCTION get_bulk_notification_preferences IS 'Efficiently retrieve notification preferences for multiple users';
COMMENT ON FUNCTION get_active_recipients_for_group IS 'Get all active recipients for a group with optimized index usage';
COMMENT ON FUNCTION get_profiles_for_weekly_digest IS 'Get profiles ready for weekly digest at specific time (uses partial indexes)';
COMMENT ON FUNCTION find_notifications_by_metadata IS 'Find notifications by metadata using GIN index containment queries';
COMMENT ON FUNCTION find_jobs_by_content IS 'Find notification jobs by content using GIN index containment queries';
COMMENT ON FUNCTION analyze_jsonb_query_performance IS 'Analyze JSONB query and index performance';
COMMENT ON FUNCTION suggest_jsonb_indexes IS 'Get suggestions for JSONB index optimization';

-- =============================================================================
-- GRANT PERMISSIONS
-- =============================================================================

GRANT EXECUTE ON FUNCTION has_email_notifications_enabled TO authenticated;
GRANT EXECUTE ON FUNCTION is_in_quiet_hours TO authenticated;
GRANT EXECUTE ON FUNCTION get_active_notification_channels TO authenticated;
GRANT EXECUTE ON FUNCTION is_recipient_active TO authenticated;
GRANT EXECUTE ON FUNCTION get_bulk_notification_preferences TO authenticated;
GRANT EXECUTE ON FUNCTION get_active_recipients_for_group TO authenticated;
GRANT EXECUTE ON FUNCTION get_profiles_for_weekly_digest TO service_role;
GRANT EXECUTE ON FUNCTION find_notifications_by_metadata TO authenticated;
GRANT EXECUTE ON FUNCTION find_jobs_by_content TO service_role;
GRANT EXECUTE ON FUNCTION analyze_jsonb_query_performance TO service_role;
GRANT EXECUTE ON FUNCTION suggest_jsonb_indexes TO service_role;
