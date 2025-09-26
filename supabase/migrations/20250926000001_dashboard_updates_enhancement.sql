-- Dashboard Updates Enhancement Migration
-- Migration: 20250926000001_dashboard_updates_enhancement.sql
-- Description: Add engagement tracking, search, and dashboard optimization features

-- =============================================================================
-- 1. ADD ENGAGEMENT TRACKING FIELDS TO UPDATES TABLE
-- =============================================================================

-- Add engagement tracking columns to updates table
ALTER TABLE updates
ADD COLUMN IF NOT EXISTS like_count INTEGER DEFAULT 0 CHECK (like_count >= 0),
ADD COLUMN IF NOT EXISTS comment_count INTEGER DEFAULT 0 CHECK (comment_count >= 0),
ADD COLUMN IF NOT EXISTS response_count INTEGER DEFAULT 0 CHECK (response_count >= 0),
ADD COLUMN IF NOT EXISTS view_count INTEGER DEFAULT 0 CHECK (view_count >= 0),
ADD COLUMN IF NOT EXISTS search_vector tsvector;

-- Add index on search vector for full-text search
CREATE INDEX IF NOT EXISTS idx_updates_search_vector ON updates USING gin(search_vector);

-- =============================================================================
-- 2. FULL-TEXT SEARCH SUPPORT
-- =============================================================================

-- Enable required extensions for full-text search
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "unaccent";

-- Function to update search vector
CREATE OR REPLACE FUNCTION update_updates_search_vector()
RETURNS TRIGGER AS $$
BEGIN
  NEW.search_vector := to_tsvector('english',
    COALESCE(NEW.content, '') || ' ' ||
    COALESCE(NEW.milestone_type, '') || ' ' ||
    COALESCE((SELECT name FROM children WHERE id = NEW.child_id), '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update search vector
DROP TRIGGER IF EXISTS update_updates_search_vector_trigger ON updates;
CREATE TRIGGER update_updates_search_vector_trigger
  BEFORE INSERT OR UPDATE OF content, milestone_type, child_id
  ON updates
  FOR EACH ROW
  EXECUTE FUNCTION update_updates_search_vector();

-- Update existing records with search vectors
UPDATE updates SET search_vector = to_tsvector('english',
  COALESCE(content, '') || ' ' ||
  COALESCE(milestone_type, '') || ' ' ||
  COALESCE((SELECT name FROM children WHERE id = updates.child_id), '')
);

-- =============================================================================
-- 3. PERFORMANCE INDEXES FOR DASHBOARD QUERIES
-- =============================================================================

-- Composite indexes for efficient filtering and sorting
CREATE INDEX IF NOT EXISTS idx_updates_parent_created_desc ON updates(parent_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_updates_parent_child_created ON updates(parent_id, child_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_updates_parent_milestone_created ON updates(parent_id, milestone_type, created_at DESC) WHERE milestone_type IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_updates_parent_status_created ON updates(parent_id, distribution_status, created_at DESC);

-- Engagement tracking indexes
CREATE INDEX IF NOT EXISTS idx_updates_like_count ON updates(like_count DESC) WHERE like_count > 0;
CREATE INDEX IF NOT EXISTS idx_updates_response_count ON updates(response_count DESC) WHERE response_count > 0;

-- Date-based indexes for timeline grouping
CREATE INDEX IF NOT EXISTS idx_updates_created_date ON updates(parent_id, DATE(created_at), created_at DESC);

-- =============================================================================
-- 4. ENGAGEMENT TRACKING FUNCTIONS
-- =============================================================================

-- Function to update engagement counts efficiently
CREATE OR REPLACE FUNCTION update_engagement_counts()
RETURNS TRIGGER AS $$
BEGIN
  -- Update response count when responses are added/removed
  IF TG_TABLE_NAME = 'responses' THEN
    IF TG_OP = 'INSERT' THEN
      UPDATE updates
      SET response_count = response_count + 1
      WHERE id = NEW.update_id;
    ELSIF TG_OP = 'DELETE' THEN
      UPDATE updates
      SET response_count = response_count - 1
      WHERE id = OLD.update_id AND response_count > 0;
    END IF;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update engagement counts
DROP TRIGGER IF EXISTS update_response_engagement_trigger ON responses;
CREATE TRIGGER update_response_engagement_trigger
  AFTER INSERT OR DELETE ON responses
  FOR EACH ROW
  EXECUTE FUNCTION update_engagement_counts();

-- Initialize response counts for existing data
UPDATE updates
SET response_count = (
  SELECT COUNT(*)
  FROM responses
  WHERE responses.update_id = updates.id
);

-- =============================================================================
-- 5. ENHANCED UPDATES QUERY FUNCTION
-- =============================================================================

-- Function for enhanced dashboard updates query with search, filtering, and pagination
CREATE OR REPLACE FUNCTION get_dashboard_updates(
  p_parent_id UUID,
  p_search_query TEXT DEFAULT NULL,
  p_child_ids UUID[] DEFAULT NULL,
  p_milestone_types TEXT[] DEFAULT NULL,
  p_status_filter TEXT DEFAULT NULL,
  p_date_from TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  p_date_to TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  p_limit INTEGER DEFAULT 20,
  p_offset INTEGER DEFAULT 0,
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
  FROM updates u
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
    -- Cursor-based pagination
    AND (
      p_cursor_created_at IS NULL OR
      u.created_at < p_cursor_created_at OR
      (u.created_at = p_cursor_created_at AND u.id < p_cursor_id)
    )
  ORDER BY u.created_at DESC, u.id DESC
  LIMIT p_limit;
END;
$$;

-- =============================================================================
-- 6. DASHBOARD STATISTICS FUNCTION
-- =============================================================================

-- Function to get dashboard statistics efficiently
CREATE OR REPLACE FUNCTION get_dashboard_stats(
  p_parent_id UUID,
  p_date_from TIMESTAMP WITH TIME ZONE DEFAULT NOW() - INTERVAL '30 days',
  p_date_to TIMESTAMP WITH TIME ZONE DEFAULT NOW()
)
RETURNS TABLE(
  total_updates INTEGER,
  total_responses INTEGER,
  total_views INTEGER,
  milestones_count INTEGER,
  updates_by_child JSONB,
  updates_by_date JSONB,
  engagement_stats JSONB,
  recent_activity JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  WITH stats AS (
    SELECT
      COUNT(*)::INTEGER as total_updates,
      SUM(u.response_count)::INTEGER as total_responses,
      SUM(u.view_count)::INTEGER as total_views,
      COUNT(*) FILTER (WHERE u.milestone_type IS NOT NULL)::INTEGER as milestones_count
    FROM updates u
    WHERE u.parent_id = p_parent_id
      AND u.created_at >= p_date_from
      AND u.created_at <= p_date_to
  ),
  updates_by_child AS (
    SELECT jsonb_object_agg(
      c.name,
      jsonb_build_object(
        'count', COUNT(u.id),
        'child_id', c.id,
        'avatar_url', c.profile_photo_url
      )
    ) as data
    FROM children c
    LEFT JOIN updates u ON c.id = u.child_id
      AND u.parent_id = p_parent_id
      AND u.created_at >= p_date_from
      AND u.created_at <= p_date_to
    WHERE c.parent_id = p_parent_id
    GROUP BY c.parent_id
  ),
  updates_by_date AS (
    SELECT jsonb_object_agg(
      date_trunc('day', u.created_at)::date,
      COUNT(u.id)
    ) as data
    FROM updates u
    WHERE u.parent_id = p_parent_id
      AND u.created_at >= p_date_from
      AND u.created_at <= p_date_to
    GROUP BY date_trunc('day', u.created_at)
  ),
  engagement_stats AS (
    SELECT jsonb_build_object(
      'avg_responses_per_update', COALESCE(AVG(u.response_count), 0),
      'most_popular_milestone', mode() WITHIN GROUP (ORDER BY u.milestone_type) FILTER (WHERE u.milestone_type IS NOT NULL),
      'total_likes', SUM(u.like_count),
      'total_comments', SUM(u.comment_count)
    ) as data
    FROM updates u
    WHERE u.parent_id = p_parent_id
      AND u.created_at >= p_date_from
      AND u.created_at <= p_date_to
  ),
  recent_activity AS (
    SELECT jsonb_agg(
      jsonb_build_object(
        'update_id', u.id,
        'child_name', c.name,
        'content_preview', LEFT(u.content, 100),
        'response_count', u.response_count,
        'created_at', u.created_at
      ) ORDER BY u.created_at DESC
    ) as data
    FROM updates u
    JOIN children c ON u.child_id = c.id
    WHERE u.parent_id = p_parent_id
      AND u.created_at >= NOW() - INTERVAL '7 days'
    LIMIT 5
  )
  SELECT
    s.total_updates,
    s.total_responses,
    s.total_views,
    s.milestones_count,
    COALESCE(uc.data, '{}'::jsonb),
    COALESCE(ud.data, '{}'::jsonb),
    COALESCE(es.data, '{}'::jsonb),
    COALESCE(ra.data, '[]'::jsonb)
  FROM stats s
  CROSS JOIN updates_by_child uc
  CROSS JOIN updates_by_date ud
  CROSS JOIN engagement_stats es
  CROSS JOIN recent_activity ra;
END;
$$;

-- =============================================================================
-- 7. TIMELINE GROUPING FUNCTION
-- =============================================================================

-- Function to get updates grouped by date for timeline view
CREATE OR REPLACE FUNCTION get_timeline_updates(
  p_parent_id UUID,
  p_search_query TEXT DEFAULT NULL,
  p_child_ids UUID[] DEFAULT NULL,
  p_date_from TIMESTAMP WITH TIME ZONE DEFAULT NOW() - INTERVAL '30 days',
  p_date_to TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  p_limit INTEGER DEFAULT 100
)
RETURNS TABLE(
  date_group DATE,
  updates_count INTEGER,
  updates JSONB
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
    DATE(u.created_at) as date_group,
    COUNT(*)::INTEGER as updates_count,
    jsonb_agg(
      jsonb_build_object(
        'id', u.id,
        'child_id', u.child_id,
        'child_name', c.name,
        'child_avatar_url', c.profile_photo_url,
        'content', u.content,
        'media_urls', u.media_urls,
        'milestone_type', u.milestone_type,
        'like_count', u.like_count,
        'response_count', u.response_count,
        'distribution_status', u.distribution_status,
        'created_at', u.created_at
      ) ORDER BY u.created_at DESC
    ) as updates
  FROM updates u
  JOIN children c ON u.child_id = c.id
  WHERE
    u.parent_id = p_parent_id
    AND u.created_at >= p_date_from
    AND u.created_at <= p_date_to
    AND (search_query_ts IS NULL OR u.search_vector @@ search_query_ts)
    AND (p_child_ids IS NULL OR u.child_id = ANY(p_child_ids))
  GROUP BY DATE(u.created_at)
  ORDER BY DATE(u.created_at) DESC
  LIMIT p_limit;
END;
$$;

-- =============================================================================
-- 8. PERFORMANCE OPTIMIZATION FUNCTION
-- =============================================================================

-- Function to increment view count efficiently (for tracking engagement)
CREATE OR REPLACE FUNCTION increment_update_view_count(
  p_update_id UUID,
  p_parent_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE updates
  SET view_count = view_count + 1
  WHERE id = p_update_id
    AND parent_id = p_parent_id;
END;
$$;

-- =============================================================================
-- 9. UPDATE RLS POLICIES FOR NEW FIELDS
-- =============================================================================

-- The existing RLS policies will automatically apply to new columns
-- But we need to ensure search respects privacy

-- Update the main updates policy to handle search properly
DROP POLICY IF EXISTS "Parents can manage their own updates" ON updates;
CREATE POLICY "Parents can manage their own updates" ON updates
  FOR ALL USING (auth.uid() = parent_id);

-- Add policy for the new RPC functions
DROP POLICY IF EXISTS "Parents can access dashboard functions" ON updates;
CREATE POLICY "Parents can access dashboard functions" ON updates
  FOR SELECT USING (auth.uid() = parent_id);

-- =============================================================================
-- 10. REAL-TIME SUBSCRIPTIONS FOR ENGAGEMENT
-- =============================================================================

-- Ensure updates table is in real-time publication (already done in initial schema)
-- Add function to handle real-time engagement updates

CREATE OR REPLACE FUNCTION notify_engagement_update()
RETURNS TRIGGER AS $$
BEGIN
  -- Notify about engagement changes for real-time updates
  PERFORM pg_notify(
    'engagement_update',
    json_build_object(
      'update_id', COALESCE(NEW.id, OLD.id),
      'parent_id', COALESCE(NEW.parent_id, OLD.parent_id),
      'like_count', COALESCE(NEW.like_count, OLD.like_count),
      'response_count', COALESCE(NEW.response_count, OLD.response_count),
      'view_count', COALESCE(NEW.view_count, OLD.view_count)
    )::text
  );

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Trigger for real-time engagement notifications
DROP TRIGGER IF EXISTS notify_engagement_update_trigger ON updates;
CREATE TRIGGER notify_engagement_update_trigger
  AFTER UPDATE OF like_count, response_count, view_count ON updates
  FOR EACH ROW
  EXECUTE FUNCTION notify_engagement_update();

-- =============================================================================
-- 11. CLEANUP AND MAINTENANCE FUNCTIONS
-- =============================================================================

-- Function to clean up old analytics data (optional, for performance)
CREATE OR REPLACE FUNCTION cleanup_old_analytics()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  cleaned_count INTEGER;
BEGIN
  -- This could be used to archive old data if needed
  -- For now, just return 0 as we're keeping all data
  RETURN 0;
END;
$$;

-- =============================================================================
-- COMMENTS AND DOCUMENTATION
-- =============================================================================

-- Add comments to new columns for better documentation
COMMENT ON COLUMN updates.like_count IS 'Number of likes/reactions on this update';
COMMENT ON COLUMN updates.comment_count IS 'Number of comments on this update';
COMMENT ON COLUMN updates.response_count IS 'Number of responses received from recipients';
COMMENT ON COLUMN updates.view_count IS 'Number of times this update has been viewed';
COMMENT ON COLUMN updates.search_vector IS 'Full-text search vector for content and metadata';

-- Add function comments
COMMENT ON FUNCTION get_dashboard_updates IS 'Enhanced query function for dashboard with search, filtering, and pagination';
COMMENT ON FUNCTION get_dashboard_stats IS 'Calculate comprehensive dashboard statistics';
COMMENT ON FUNCTION get_timeline_updates IS 'Get updates grouped by date for timeline view';
COMMENT ON FUNCTION increment_update_view_count IS 'Efficiently increment view count for engagement tracking';