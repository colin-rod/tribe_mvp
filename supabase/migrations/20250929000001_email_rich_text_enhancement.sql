-- Email and Rich Text Enhancement Migration
-- Migration: 20250929000001_email_rich_text_enhancement.sql
-- Description: Add support for separating email subjects from content and enable rich text storage

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
-- 2. ADD INDEXES FOR NEW COLUMNS
-- =============================================================================

-- Index for content format filtering
CREATE INDEX IF NOT EXISTS idx_updates_content_format ON updates(content_format);

-- Index for subject text search (for email subjects)
CREATE INDEX IF NOT EXISTS idx_updates_subject ON updates USING gin(to_tsvector('english', COALESCE(subject, '')));

-- Index for rich content JSONB queries
CREATE INDEX IF NOT EXISTS idx_updates_rich_content ON updates USING gin(rich_content);

-- Composite index for format and creation date (for filtering)
CREATE INDEX IF NOT EXISTS idx_updates_format_created ON updates(parent_id, content_format, created_at DESC);

-- =============================================================================
-- 3. UPDATE SEARCH VECTOR TO INCLUDE SUBJECT
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
-- 4. UPDATE EXISTING SEARCH VECTORS
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
-- 5. CONTENT EXTRACTION FUNCTIONS
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
-- 6. UPDATE DASHBOARD FUNCTIONS TO HANDLE NEW FIELDS
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
-- 7. MIGRATION HELPERS FOR EXISTING DATA
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

-- =============================================================================
-- 8. COMMENTS AND DOCUMENTATION
-- =============================================================================

-- Add comments to new columns
COMMENT ON COLUMN updates.subject IS 'Email subject line or message title (max 200 chars)';
COMMENT ON COLUMN updates.rich_content IS 'JSONB content for rich text formatting (Quill Delta, HTML, etc.)';
COMMENT ON COLUMN updates.content_format IS 'Type of content format: plain, rich, email, sms, whatsapp';

-- Add function comments
COMMENT ON FUNCTION extract_plain_text_from_rich_content IS 'Extract plain text from various rich content formats';
COMMENT ON FUNCTION get_effective_content IS 'Get the best available content with subject fallback for emails';
COMMENT ON FUNCTION migrate_email_updates IS 'Helper function to migrate existing email-style updates (manual use)';

-- =============================================================================
-- MIGRATION COMPLETE
-- =============================================================================

-- Log migration completion
DO $$
BEGIN
  RAISE NOTICE 'Email and Rich Text Enhancement Migration completed successfully';
  RAISE NOTICE 'New columns added: subject, rich_content, content_format';
  RAISE NOTICE 'Search functionality updated to include subjects';
  RAISE NOTICE 'Dashboard functions updated for new fields';
  RAISE NOTICE 'Run migrate_email_updates() manually to migrate existing email-style content';
END $$;