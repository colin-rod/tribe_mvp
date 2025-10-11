-- Migration: Memory Metadata System
-- Date: 2025-10-11
-- Description: Add structured metadata to memories (milestones, locations, dates, people)
--              with AI-assisted suggestions and user vocabulary learning
-- Issue: CRO-XXX - Memory Metadata Feature
--
-- IMPORTANT: Execute this migration via Supabase SQL Editor
-- Do NOT run via CLI or automated migration tools

-- =============================================================================
-- 0. ENABLE REQUIRED EXTENSIONS
-- =============================================================================

-- Enable pg_trgm extension for fuzzy text search (trigram matching)
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Verify uuid-ossp extension is enabled (usually enabled by default in Supabase)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================================================
-- 1. ADD METADATA COLUMN TO MEMORIES TABLE
-- =============================================================================

-- Add metadata JSONB column with default empty structure
ALTER TABLE memories
  ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{
    "milestones": [],
    "locations": [],
    "dates": [],
    "people": [],
    "custom": {}
  }'::jsonb;

-- Add validation constraint to ensure metadata structure
ALTER TABLE memories
  ADD CONSTRAINT memories_metadata_structure_check
  CHECK (
    jsonb_typeof(metadata) = 'object' AND
    jsonb_typeof(metadata->'milestones') = 'array' AND
    jsonb_typeof(metadata->'locations') = 'array' AND
    jsonb_typeof(metadata->'dates') = 'array' AND
    jsonb_typeof(metadata->'people') = 'array' AND
    jsonb_typeof(metadata->'custom') = 'object'
  );

-- Add constraint for reasonable metadata size (10KB limit)
ALTER TABLE memories
  ADD CONSTRAINT memories_metadata_size_check
  CHECK (pg_column_size(metadata) < 10240);

-- Create GIN index for efficient JSONB queries
CREATE INDEX IF NOT EXISTS idx_memories_metadata_gin ON memories USING GIN (metadata);

-- Create specialized indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_memories_metadata_milestones
  ON memories USING GIN ((metadata->'milestones'));

CREATE INDEX IF NOT EXISTS idx_memories_metadata_locations
  ON memories USING GIN ((metadata->'locations'));

CREATE INDEX IF NOT EXISTS idx_memories_metadata_people
  ON memories USING GIN ((metadata->'people'));

CREATE INDEX IF NOT EXISTS idx_memories_metadata_dates
  ON memories USING GIN ((metadata->'dates'));

-- =============================================================================
-- 2. CREATE USER_METADATA_VALUES TABLE (Autocomplete & Learning)
-- =============================================================================

CREATE TABLE IF NOT EXISTS user_metadata_values (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  category VARCHAR(50) NOT NULL CHECK (category IN ('milestones', 'locations', 'dates', 'people', 'custom')),
  value TEXT NOT NULL,
  usage_count INTEGER DEFAULT 1,
  last_used_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Ensure unique values per user per category
  CONSTRAINT user_metadata_values_unique UNIQUE (user_id, category, value)
);

-- Enable RLS for user_metadata_values
ALTER TABLE user_metadata_values ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only access their own metadata values
CREATE POLICY "Users can manage their own metadata values" ON user_metadata_values
  FOR ALL USING (auth.uid() = user_id);

-- Indexes for efficient autocomplete queries
CREATE INDEX idx_user_metadata_values_user_category
  ON user_metadata_values(user_id, category);

CREATE INDEX idx_user_metadata_values_value_trgm
  ON user_metadata_values USING gin (value gin_trgm_ops);

CREATE INDEX idx_user_metadata_values_usage
  ON user_metadata_values(user_id, category, usage_count DESC, last_used_at DESC);

-- =============================================================================
-- 3. ENHANCE AI_ANALYSIS COLUMN STRUCTURE
-- =============================================================================

-- Add comment to document the extended ai_analysis structure
COMMENT ON COLUMN memories.ai_analysis IS
  'AI analysis results including suggested metadata. Structure:
  {
    "sentiment": "positive",
    "suggested_recipients": [...],
    "suggested_metadata": {
      "milestones": ["first_steps"],
      "locations": ["park"],
      "people": ["grandma"],
      "dates": [],
      "confidence_scores": {
        "milestones": 0.95,
        "locations": 0.80,
        "people": 0.75
      }
    },
    ...
  }';

-- =============================================================================
-- 4. CREATE HELPER FUNCTIONS
-- =============================================================================

-- Function: Get autocomplete suggestions for metadata values
-- Returns user's previously used values matching the search query
CREATE OR REPLACE FUNCTION get_metadata_autocomplete(
  p_user_id UUID,
  p_category VARCHAR(50),
  p_query TEXT DEFAULT '',
  p_limit INTEGER DEFAULT 10
)
RETURNS TABLE(
  value TEXT,
  usage_count INTEGER,
  last_used_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    umv.value,
    umv.usage_count,
    umv.last_used_at
  FROM user_metadata_values umv
  WHERE umv.user_id = p_user_id
    AND umv.category = p_category
    AND (p_query = '' OR umv.value ILIKE '%' || p_query || '%')
  ORDER BY
    umv.usage_count DESC,
    umv.last_used_at DESC,
    umv.value ASC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Get all unique metadata values for a user (for filters)
CREATE OR REPLACE FUNCTION get_user_metadata_values(
  p_user_id UUID,
  p_category VARCHAR(50)
)
RETURNS TABLE(
  value TEXT,
  memory_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    umv.value,
    umv.usage_count::BIGINT as memory_count
  FROM user_metadata_values umv
  WHERE umv.user_id = p_user_id
    AND umv.category = p_category
  ORDER BY umv.usage_count DESC, umv.value ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Update user metadata values tracking
-- Called when metadata is added to a memory
CREATE OR REPLACE FUNCTION track_metadata_usage()
RETURNS TRIGGER AS $$
DECLARE
  metadata_category TEXT;
  metadata_value TEXT;
BEGIN
  -- Track milestones
  IF NEW.metadata ? 'milestones' THEN
    FOR metadata_value IN SELECT jsonb_array_elements_text(NEW.metadata->'milestones')
    LOOP
      INSERT INTO user_metadata_values (user_id, category, value, usage_count, last_used_at)
      VALUES (NEW.parent_id, 'milestones', metadata_value, 1, NOW())
      ON CONFLICT (user_id, category, value)
      DO UPDATE SET
        usage_count = user_metadata_values.usage_count + 1,
        last_used_at = NOW();
    END LOOP;
  END IF;

  -- Track locations
  IF NEW.metadata ? 'locations' THEN
    FOR metadata_value IN SELECT jsonb_array_elements_text(NEW.metadata->'locations')
    LOOP
      INSERT INTO user_metadata_values (user_id, category, value, usage_count, last_used_at)
      VALUES (NEW.parent_id, 'locations', metadata_value, 1, NOW())
      ON CONFLICT (user_id, category, value)
      DO UPDATE SET
        usage_count = user_metadata_values.usage_count + 1,
        last_used_at = NOW();
    END LOOP;
  END IF;

  -- Track people
  IF NEW.metadata ? 'people' THEN
    FOR metadata_value IN SELECT jsonb_array_elements_text(NEW.metadata->'people')
    LOOP
      INSERT INTO user_metadata_values (user_id, category, value, usage_count, last_used_at)
      VALUES (NEW.parent_id, 'people', metadata_value, 1, NOW())
      ON CONFLICT (user_id, category, value)
      DO UPDATE SET
        usage_count = user_metadata_values.usage_count + 1,
        last_used_at = NOW();
    END LOOP;
  END IF;

  -- Track dates
  IF NEW.metadata ? 'dates' THEN
    FOR metadata_value IN SELECT jsonb_array_elements_text(NEW.metadata->'dates')
    LOOP
      INSERT INTO user_metadata_values (user_id, category, value, usage_count, last_used_at)
      VALUES (NEW.parent_id, 'dates', metadata_value, 1, NOW())
      ON CONFLICT (user_id, category, value)
      DO UPDATE SET
        usage_count = user_metadata_values.usage_count + 1,
        last_used_at = NOW();
    END LOOP;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to track metadata usage
CREATE TRIGGER trigger_track_metadata_usage
  AFTER INSERT OR UPDATE OF metadata ON memories
  FOR EACH ROW
  WHEN (NEW.metadata IS NOT NULL AND NEW.metadata != '{}'::jsonb)
  EXECUTE FUNCTION track_metadata_usage();

-- Function: Search memories by metadata
-- Supports filtering by multiple metadata categories
CREATE OR REPLACE FUNCTION search_memories_by_metadata(
  p_user_id UUID,
  p_milestones TEXT[] DEFAULT NULL,
  p_locations TEXT[] DEFAULT NULL,
  p_people TEXT[] DEFAULT NULL,
  p_dates TEXT[] DEFAULT NULL,
  p_match_type VARCHAR(3) DEFAULT 'AND' -- 'AND' or 'OR'
)
RETURNS TABLE(
  memory_id UUID,
  content TEXT,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  IF p_match_type = 'AND' THEN
    -- All conditions must match (AND logic)
    RETURN QUERY
    SELECT m.id, m.content, m.metadata, m.created_at
    FROM memories m
    WHERE m.parent_id = p_user_id
      AND (p_milestones IS NULL OR m.metadata->'milestones' ?| p_milestones)
      AND (p_locations IS NULL OR m.metadata->'locations' ?| p_locations)
      AND (p_people IS NULL OR m.metadata->'people' ?| p_people)
      AND (p_dates IS NULL OR m.metadata->'dates' ?| p_dates)
    ORDER BY m.created_at DESC;
  ELSE
    -- Any condition can match (OR logic)
    RETURN QUERY
    SELECT m.id, m.content, m.metadata, m.created_at
    FROM memories m
    WHERE m.parent_id = p_user_id
      AND (
        (p_milestones IS NOT NULL AND m.metadata->'milestones' ?| p_milestones) OR
        (p_locations IS NOT NULL AND m.metadata->'locations' ?| p_locations) OR
        (p_people IS NOT NULL AND m.metadata->'people' ?| p_people) OR
        (p_dates IS NOT NULL AND m.metadata->'dates' ?| p_dates)
      )
    ORDER BY m.created_at DESC;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Bulk update metadata for multiple memories
CREATE OR REPLACE FUNCTION bulk_update_metadata(
  p_user_id UUID,
  p_memory_ids UUID[],
  p_category VARCHAR(50),
  p_values TEXT[],
  p_operation VARCHAR(10) DEFAULT 'add' -- 'add', 'remove', 'replace'
)
RETURNS INTEGER AS $$
DECLARE
  affected_count INTEGER := 0;
  memory_id UUID;
  current_values JSONB;
  new_values JSONB;
BEGIN
  -- Validate category
  IF p_category NOT IN ('milestones', 'locations', 'dates', 'people') THEN
    RAISE EXCEPTION 'Invalid category: %', p_category;
  END IF;

  -- Loop through each memory
  FOREACH memory_id IN ARRAY p_memory_ids
  LOOP
    -- Verify ownership
    IF NOT EXISTS (SELECT 1 FROM memories WHERE id = memory_id AND parent_id = p_user_id) THEN
      CONTINUE;
    END IF;

    -- Get current values
    SELECT metadata->p_category INTO current_values FROM memories WHERE id = memory_id;

    -- Perform operation
    CASE p_operation
      WHEN 'add' THEN
        -- Add new values (avoid duplicates)
        new_values := (
          SELECT jsonb_agg(DISTINCT value)
          FROM (
            SELECT jsonb_array_elements_text(current_values) as value
            UNION
            SELECT unnest(p_values) as value
          ) combined
        );
      WHEN 'remove' THEN
        -- Remove specified values
        new_values := (
          SELECT COALESCE(jsonb_agg(value), '[]'::jsonb)
          FROM (
            SELECT jsonb_array_elements_text(current_values) as value
            WHERE jsonb_array_elements_text(current_values) != ALL(p_values)
          ) filtered
        );
      WHEN 'replace' THEN
        -- Replace entirely with new values
        new_values := to_jsonb(p_values);
      ELSE
        RAISE EXCEPTION 'Invalid operation: %', p_operation;
    END CASE;

    -- Update the memory
    UPDATE memories
    SET metadata = jsonb_set(metadata, ARRAY[p_category], new_values)
    WHERE id = memory_id;

    affected_count := affected_count + 1;
  END LOOP;

  RETURN affected_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- 5. MIGRATE EXISTING DATA
-- =============================================================================

-- Migrate existing milestone_type values to metadata.milestones
UPDATE memories
SET metadata = jsonb_set(
  metadata,
  '{milestones}',
  CASE
    WHEN milestone_type IS NOT NULL
    THEN to_jsonb(ARRAY[milestone_type]::text[])
    ELSE '[]'::jsonb
  END
)
WHERE milestone_type IS NOT NULL;

-- Extract and migrate metadata from existing ai_analysis if it exists
-- This handles cases where AI has already analyzed content
UPDATE memories
SET metadata = jsonb_set(
  jsonb_set(
    jsonb_set(
      metadata,
      '{locations}',
      COALESCE(ai_analysis->'suggested_metadata'->'locations', '[]'::jsonb)
    ),
    '{people}',
    COALESCE(ai_analysis->'suggested_metadata'->'people', '[]'::jsonb)
  ),
  '{dates}',
  COALESCE(ai_analysis->'suggested_metadata'->'dates', '[]'::jsonb)
)
WHERE ai_analysis ? 'suggested_metadata'
  AND ai_analysis->'suggested_metadata' IS NOT NULL;

-- =============================================================================
-- 6. ADD COMMENTS FOR DOCUMENTATION
-- =============================================================================

COMMENT ON COLUMN memories.metadata IS
  'Structured metadata for memories. Format:
  {
    "milestones": ["first_steps", "walking"],
    "locations": ["Central Park", "grandmas house"],
    "dates": ["2024-10-11"],
    "people": ["Grandma", "Uncle John"],
    "custom": {}
  }
  Max 10 tags per category, 50 chars per tag, 10KB total size.';

COMMENT ON TABLE user_metadata_values IS
  'Tracks user vocabulary for metadata autocomplete.
  Learns from user input to provide smart suggestions.
  Usage count and last_used_at enable frequency-based ordering.';

COMMENT ON FUNCTION get_metadata_autocomplete IS
  'Returns autocomplete suggestions for metadata input.
  Fuzzy searches user previous values, ordered by usage frequency.';

COMMENT ON FUNCTION search_memories_by_metadata IS
  'Search memories by metadata with AND/OR logic support.
  Enables powerful filtering in Memory Book UI.';

COMMENT ON FUNCTION bulk_update_metadata IS
  'Bulk update metadata across multiple memories.
  Supports add/remove/replace operations for power users.';

-- =============================================================================
-- 7. VERIFICATION QUERIES (Commented out - uncomment to test)
-- =============================================================================

-- Verify metadata column was added
-- SELECT column_name, data_type, column_default
-- FROM information_schema.columns
-- WHERE table_name = 'memories' AND column_name = 'metadata';

-- Verify user_metadata_values table was created
-- SELECT table_name FROM information_schema.tables
-- WHERE table_schema = 'public' AND table_name = 'user_metadata_values';

-- Verify indexes were created
-- SELECT indexname, indexdef
-- FROM pg_indexes
-- WHERE tablename = 'memories' AND indexname LIKE '%metadata%';

-- Test autocomplete function (replace user_id)
-- SELECT * FROM get_metadata_autocomplete('YOUR_USER_ID'::uuid, 'locations', 'park', 10);

-- Test search function (replace user_id)
-- SELECT * FROM search_memories_by_metadata('YOUR_USER_ID'::uuid, NULL, ARRAY['park'], NULL, NULL, 'AND');

-- Verify migration of milestone_type
-- SELECT id, milestone_type, metadata->'milestones' as migrated_milestones
-- FROM memories
-- WHERE milestone_type IS NOT NULL
-- LIMIT 10;

-- Check metadata size distribution
-- SELECT
--   pg_column_size(metadata) as size_bytes,
--   COUNT(*) as memory_count
-- FROM memories
-- GROUP BY pg_column_size(metadata)
-- ORDER BY size_bytes DESC;

-- =============================================================================
-- ROLLBACK INSTRUCTIONS (if needed)
-- =============================================================================

-- To rollback this migration, execute the following:
-- DROP TRIGGER IF EXISTS trigger_track_metadata_usage ON memories;
-- DROP FUNCTION IF EXISTS track_metadata_usage();
-- DROP FUNCTION IF EXISTS bulk_update_metadata(UUID, UUID[], VARCHAR, TEXT[], VARCHAR);
-- DROP FUNCTION IF EXISTS search_memories_by_metadata(UUID, TEXT[], TEXT[], TEXT[], TEXT[], VARCHAR);
-- DROP FUNCTION IF EXISTS get_user_metadata_values(UUID, VARCHAR);
-- DROP FUNCTION IF EXISTS get_metadata_autocomplete(UUID, VARCHAR, TEXT, INTEGER);
-- DROP TABLE IF EXISTS user_metadata_values;
-- DROP INDEX IF EXISTS idx_memories_metadata_dates;
-- DROP INDEX IF EXISTS idx_memories_metadata_people;
-- DROP INDEX IF EXISTS idx_memories_metadata_locations;
-- DROP INDEX IF EXISTS idx_memories_metadata_milestones;
-- DROP INDEX IF EXISTS idx_memories_metadata_gin;
-- ALTER TABLE memories DROP CONSTRAINT IF EXISTS memories_metadata_size_check;
-- ALTER TABLE memories DROP CONSTRAINT IF EXISTS memories_metadata_structure_check;
-- ALTER TABLE memories DROP COLUMN IF EXISTS metadata;
