-- Email and Rich Text Enhancement Migration (FIXED VERSION)
-- Migration: 20250929000002_email_rich_text_enhancement_fixed.sql
-- Description: Add support for separating email subjects from content and enable rich text storage
-- Fixes IMMUTABLE function errors in index creation

-- =============================================================================
-- 1. ADD NEW COLUMNS TO UPDATES TABLE
-- =============================================================================

-- Add new columns for enhanced email and rich text support
ALTER TABLE updates
ADD COLUMN IF NOT EXISTS subject TEXT,
ADD COLUMN IF NOT EXISTS rich_content JSONB,
ADD COLUMN IF NOT EXISTS content_format VARCHAR DEFAULT 'plain'
  CHECK (content_format IN ('plain', 'rich', 'email', 'sms', 'whatsapp'));

-- =============================================================================
-- 2. CREATE IMMUTABLE HELPER FUNCTIONS
-- =============================================================================

-- Create an IMMUTABLE function for safe COALESCE operations in indexes
CREATE OR REPLACE FUNCTION safe_text_for_search(input_text TEXT)
RETURNS TEXT
LANGUAGE SQL
IMMUTABLE
STRICT
AS $$
  SELECT CASE WHEN input_text IS NULL THEN '' ELSE input_text END;
$$;

-- Create an IMMUTABLE function for subject search vector
CREATE OR REPLACE FUNCTION subject_search_vector(subject_text TEXT)
RETURNS tsvector
LANGUAGE SQL
IMMUTABLE
AS $$
  SELECT to_tsvector('english', safe_text_for_search(subject_text));
$$;

-- =============================================================================
-- 3. ADD INDEXES WITHOUT IMMUTABLE ERRORS
-- =============================================================================

-- Index for content format filtering
CREATE INDEX IF NOT EXISTS idx_updates_content_format ON updates(content_format);

-- Index for subject text search (using our IMMUTABLE function)
CREATE INDEX IF NOT EXISTS idx_updates_subject_search ON updates USING gin(subject_search_vector(subject));

-- Index for rich content JSONB queries
CREATE INDEX IF NOT EXISTS idx_updates_rich_content ON updates USING gin(rich_content);

-- Composite index for format and creation date (for filtering)
CREATE INDEX IF NOT EXISTS idx_updates_format_created ON updates(parent_id, content_format, created_at DESC);

-- Additional performance indexes for dashboard queries
CREATE INDEX IF NOT EXISTS idx_updates_subject_text ON updates(subject) WHERE subject IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_updates_parent_format_date ON updates(parent_id, content_format, DATE(created_at));

-- Engagement tracking indexes for new columns (if not exist)
CREATE INDEX IF NOT EXISTS idx_updates_like_count_nonzero ON updates(like_count DESC) WHERE like_count > 0;
CREATE INDEX IF NOT EXISTS idx_updates_comment_count_nonzero ON updates(comment_count DESC) WHERE comment_count > 0;
CREATE INDEX IF NOT EXISTS idx_updates_response_count_nonzero ON updates(response_count DESC) WHERE response_count > 0;
CREATE INDEX IF NOT EXISTS idx_updates_view_count_nonzero ON updates(view_count DESC) WHERE view_count > 0;

-- =============================================================================
-- 4. UPDATE SEARCH VECTOR TO INCLUDE SUBJECT
-- =============================================================================

-- Update the search vector function to include subject field
CREATE OR REPLACE FUNCTION update_updates_search_vector()
RETURNS TRIGGER AS $$
BEGIN
  NEW.search_vector := to_tsvector('english',
    COALESCE(NEW.content, '') || ' ' ||
    COALESCE(NEW.subject, '') || ' ' ||
    COALESCE(NEW.milestone_type, '') || ' ' ||
    COALESCE((SELECT name FROM children WHERE id = NEW.child_id), '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Update the trigger to include subject field
DROP TRIGGER IF EXISTS update_updates_search_vector_trigger ON updates;
CREATE TRIGGER update_updates_search_vector_trigger
  BEFORE INSERT OR UPDATE OF content, subject, milestone_type, child_id
  ON updates
  FOR EACH ROW
  EXECUTE FUNCTION update_updates_search_vector();

-- =============================================================================
-- 5. UPDATE EXISTING SEARCH VECTORS
-- =============================================================================

-- Update existing records to include subject in search vectors
-- (For existing records, subject will be null, so this just ensures consistency)
UPDATE updates SET search_vector = to_tsvector('english',
  COALESCE(content, '') || ' ' ||
  COALESCE(subject, '') || ' ' ||
  COALESCE(milestone_type, '') || ' ' ||
  COALESCE((SELECT name FROM children WHERE id = updates.child_id), '')
);

-- =============================================================================
-- 6. CONTENT EXTRACTION FUNCTIONS
-- =============================================================================

-- Function to extract plain text from rich content
CREATE OR REPLACE FUNCTION extract_plain_text_from_rich_content(rich_content_data JSONB)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  extracted_text TEXT := '';
  ops JSONB;
  op JSONB;
BEGIN
  -- Handle null or empty input
  IF rich_content_data IS NULL THEN
    RETURN '';
  END IF;

  -- Handle Quill Delta format
  IF rich_content_data ? 'ops' THEN
    ops := rich_content_data->'ops';
    IF jsonb_typeof(ops) = 'array' THEN
      FOR op IN SELECT * FROM jsonb_array_elements(ops)
      LOOP
        IF op ? 'insert' AND jsonb_typeof(op->'insert') = 'string' THEN
          extracted_text := extracted_text || (op->>'insert');
        END IF;
      END LOOP;
    END IF;
    RETURN extracted_text;
  END IF;

  -- Handle HTML content
  IF rich_content_data ? 'html' THEN
    -- Basic HTML tag removal (simple regex-based approach)
    extracted_text := regexp_replace(rich_content_data->>'html', '<[^>]*>', '', 'g');
    extracted_text := regexp_replace(extracted_text, '&[^;]+;', ' ', 'g');
    RETURN trim(extracted_text);
  END IF;

  -- Handle plain text content
  IF rich_content_data ? 'text' THEN
    RETURN rich_content_data->>'text';
  END IF;

  -- Fallback: convert entire JSON to text and clean it
  extracted_text := rich_content_data::text;
  extracted_text := regexp_replace(extracted_text, '[{}"\[\]]', '', 'g');
  extracted_text := regexp_replace(extracted_text, '[,:]', ' ', 'g');

  RETURN trim(extracted_text);
END;
$$;

-- Function to get effective content (with fallback logic)
CREATE OR REPLACE FUNCTION get_effective_content(
  content_text TEXT,
  rich_content_data JSONB,
  subject_text TEXT,
  format_type VARCHAR
)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  result_content TEXT;
BEGIN
  -- Start with rich content if available
  IF rich_content_data IS NOT NULL THEN
    result_content := extract_plain_text_from_rich_content(rich_content_data);
    IF result_content IS NOT NULL AND trim(result_content) != '' THEN
      -- Add subject if it exists and format is email
      IF subject_text IS NOT NULL AND format_type = 'email' THEN
        RETURN subject_text || E'\n\n' || result_content;
      END IF;
      RETURN result_content;
    END IF;
  END IF;

  -- Fallback to regular content
  IF content_text IS NOT NULL AND trim(content_text) != '' THEN
    RETURN content_text;
  END IF;

  -- Last resort: just the subject
  RETURN COALESCE(subject_text, '');
END;
$$;

-- =============================================================================
-- 7. SEARCH AND FILTER HELPER FUNCTIONS
-- =============================================================================

-- Function to search updates with enhanced content matching
CREATE OR REPLACE FUNCTION search_updates_with_content(
  p_parent_id UUID,
  p_search_query TEXT,
  p_limit INTEGER DEFAULT 20,
  p_offset INTEGER DEFAULT 0
)
RETURNS TABLE(
  id UUID,
  content TEXT,
  subject TEXT,
  rich_content JSONB,
  content_format TEXT,
  milestone_type TEXT,
  created_at TIMESTAMP WITH TIME ZONE,
  search_rank REAL
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  search_query_ts tsquery;
BEGIN
  -- Prepare search query
  IF p_search_query IS NOT NULL AND p_search_query != '' THEN
    search_query_ts := plainto_tsquery('english', p_search_query);
  ELSE
    RAISE EXCEPTION 'Search query cannot be empty';
  END IF;

  RETURN QUERY
  SELECT
    u.id,
    u.content,
    u.subject,
    u.rich_content,
    u.content_format,
    u.milestone_type,
    u.created_at,
    ts_rank(u.search_vector, search_query_ts) as search_rank
  FROM updates u
  WHERE
    u.parent_id = p_parent_id
    AND u.search_vector @@ search_query_ts
  ORDER BY search_rank DESC, u.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;

-- =============================================================================
-- 8. UPDATE DASHBOARD FUNCTIONS TO HANDLE NEW FIELDS
-- =============================================================================

-- Update the dashboard updates function to include new fields
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
  subject TEXT,
  rich_content JSONB,
  content_format TEXT,
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
    u.subject,
    u.rich_content,
    u.content_format,
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
    -- Search filter (now includes subject)
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

-- Update timeline function to include new fields
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
        'subject', u.subject,
        'rich_content', u.rich_content,
        'content_format', u.content_format,
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
-- 9. MIGRATION HELPERS FOR EXISTING DATA
-- =============================================================================

-- Function to migrate existing email-based updates (can be run manually)
CREATE OR REPLACE FUNCTION migrate_email_updates()
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
  update_record RECORD;
  subject_part TEXT;
  content_part TEXT;
  subject_end INTEGER;
  migrated_count INTEGER := 0;
BEGIN
  -- Find updates that look like they came from emails (contain double newlines)
  FOR update_record IN
    SELECT id, content
    FROM updates
    WHERE content LIKE '%' || E'\n\n' || '%'
      AND subject IS NULL
      AND content_format = 'plain'
  LOOP
    -- Try to split content on first double newline
    subject_end := position(E'\n\n' in update_record.content);

    IF subject_end > 0 AND subject_end < 200 THEN
      subject_part := trim(substring(update_record.content from 1 for subject_end - 1));
      content_part := trim(substring(update_record.content from subject_end + 2));

      -- Only migrate if the first part looks like a subject (reasonable length)
      IF length(subject_part) > 0 AND length(subject_part) <= 200 AND length(content_part) > 0 THEN
        UPDATE updates
        SET
          subject = subject_part,
          content = content_part,
          content_format = 'email'
        WHERE id = update_record.id;

        migrated_count := migrated_count + 1;
      END IF;
    END IF;
  END LOOP;

  RETURN migrated_count;
END;
$$;

-- Function to analyze content formats in existing data
CREATE OR REPLACE FUNCTION analyze_content_formats()
RETURNS TABLE(
  content_format TEXT,
  count BIGINT,
  avg_content_length NUMERIC,
  has_subject_count BIGINT,
  has_rich_content_count BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    COALESCE(u.content_format, 'unknown') as content_format,
    COUNT(*) as count,
    AVG(LENGTH(u.content)) as avg_content_length,
    COUNT(*) FILTER (WHERE u.subject IS NOT NULL) as has_subject_count,
    COUNT(*) FILTER (WHERE u.rich_content IS NOT NULL) as has_rich_content_count
  FROM updates u
  GROUP BY u.content_format
  ORDER BY count DESC;
END;
$$;

-- =============================================================================
-- 10. PERFORMANCE OPTIMIZATION FUNCTIONS
-- =============================================================================

-- Function to rebuild search vectors for all updates (maintenance)
CREATE OR REPLACE FUNCTION rebuild_all_search_vectors()
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
  processed_count INTEGER := 0;
BEGIN
  UPDATE updates
  SET search_vector = to_tsvector('english',
    COALESCE(content, '') || ' ' ||
    COALESCE(subject, '') || ' ' ||
    COALESCE(milestone_type, '') || ' ' ||
    COALESCE((SELECT name FROM children WHERE id = updates.child_id), '')
  );

  GET DIAGNOSTICS processed_count = ROW_COUNT;
  RETURN processed_count;
END;
$$;

-- Function to get updates by content format
CREATE OR REPLACE FUNCTION get_updates_by_format(
  p_parent_id UUID,
  p_format TEXT,
  p_limit INTEGER DEFAULT 20
)
RETURNS TABLE(
  id UUID,
  content TEXT,
  subject TEXT,
  content_format TEXT,
  created_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    u.id,
    u.content,
    u.subject,
    u.content_format,
    u.created_at
  FROM updates u
  WHERE
    u.parent_id = p_parent_id
    AND u.content_format = p_format
  ORDER BY u.created_at DESC
  LIMIT p_limit;
END;
$$;

-- =============================================================================
-- 11. COMMENTS AND DOCUMENTATION
-- =============================================================================

-- Add comments to new columns
COMMENT ON COLUMN updates.subject IS 'Email subject line or message title (max 200 chars for optimal indexing)';
COMMENT ON COLUMN updates.rich_content IS 'JSONB content for rich text formatting (Quill Delta, HTML, etc.)';
COMMENT ON COLUMN updates.content_format IS 'Type of content format: plain, rich, email, sms, whatsapp';

-- Add function comments
COMMENT ON FUNCTION extract_plain_text_from_rich_content IS 'Extract plain text from various rich content formats (IMMUTABLE)';
COMMENT ON FUNCTION get_effective_content IS 'Get the best available content with subject fallback for emails (IMMUTABLE)';
COMMENT ON FUNCTION migrate_email_updates IS 'Helper function to migrate existing email-style updates (manual use)';
COMMENT ON FUNCTION safe_text_for_search IS 'IMMUTABLE helper for null-safe text processing in indexes';
COMMENT ON FUNCTION subject_search_vector IS 'IMMUTABLE function to create search vector from subject';
COMMENT ON FUNCTION search_updates_with_content IS 'Enhanced search function with ranking and content matching';
COMMENT ON FUNCTION analyze_content_formats IS 'Analyze distribution of content formats in existing data';
COMMENT ON FUNCTION rebuild_all_search_vectors IS 'Maintenance function to rebuild all search vectors';

-- Add index comments
COMMENT ON INDEX idx_updates_subject_search IS 'GIN index for full-text search on subjects';
COMMENT ON INDEX idx_updates_content_format IS 'B-tree index for filtering by content format';
COMMENT ON INDEX idx_updates_rich_content IS 'GIN index for JSONB queries on rich content';
COMMENT ON INDEX idx_updates_format_created IS 'Composite index for format and date filtering';

-- =============================================================================
-- MIGRATION COMPLETE
-- =============================================================================

-- Log migration completion
DO $$
BEGIN
  RAISE NOTICE 'Email and Rich Text Enhancement Migration completed successfully (FIXED VERSION)';
  RAISE NOTICE 'New columns added: subject, rich_content, content_format';
  RAISE NOTICE 'All indexes created without IMMUTABLE function errors';
  RAISE NOTICE 'Search functionality updated to include subjects';
  RAISE NOTICE 'Dashboard functions updated for new fields';
  RAISE NOTICE 'Helper functions added: migrate_email_updates(), analyze_content_formats()';
  RAISE NOTICE 'Performance functions added: rebuild_all_search_vectors()';
  RAISE NOTICE 'Run migrate_email_updates() manually to migrate existing email-style content';
  RAISE NOTICE 'Run analyze_content_formats() to analyze existing data distribution';
END $$;