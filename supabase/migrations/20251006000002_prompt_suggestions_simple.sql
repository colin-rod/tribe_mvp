-- Migration: 20251006000002_prompt_suggestions_simple.sql
-- Description: Simple prompt suggestions system with weighted random selection
-- Issue: Update Suggestions - Database-driven prompts without AI calls
--
-- IMPORTANT: Execute this migration via Supabase SQL Editor
-- Do NOT run via CLI or automated migration tools
--
-- This migration:
-- 1. Creates prompt_suggestions table with basic fields
-- 2. Adds function for weighted random selection
-- 3. Seeds initial prompt suggestions
-- 4. Tracks engagement metrics for future optimization

-- =============================================================================
-- PHASE 1: Create prompt_suggestions table
-- =============================================================================

CREATE TABLE IF NOT EXISTS prompt_suggestions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  prompt_text VARCHAR NOT NULL,
  category VARCHAR NOT NULL,

  -- Engagement tracking and weighting
  display_weight INTEGER DEFAULT 100,
  times_shown INTEGER DEFAULT 0,
  times_clicked INTEGER DEFAULT 0,

  -- Management
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE prompt_suggestions IS 'Database-driven prompt suggestions for creating updates';
COMMENT ON COLUMN prompt_suggestions.prompt_text IS 'The suggestion text shown to users';
COMMENT ON COLUMN prompt_suggestions.category IS 'Category label (e.g., Daily Moments, Milestones)';
COMMENT ON COLUMN prompt_suggestions.display_weight IS 'Weight for random selection - higher = more likely to show';
COMMENT ON COLUMN prompt_suggestions.times_shown IS 'Track how many times prompt was displayed';
COMMENT ON COLUMN prompt_suggestions.times_clicked IS 'Track how many times prompt was clicked';

-- =============================================================================
-- PHASE 2: Create function for weighted random prompt selection
-- =============================================================================

CREATE OR REPLACE FUNCTION get_random_prompt_suggestion()
RETURNS TABLE (
  id UUID,
  prompt_text VARCHAR,
  category VARCHAR
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    ps.id,
    ps.prompt_text,
    ps.category
  FROM prompt_suggestions ps
  WHERE ps.is_active = true
  ORDER BY random() * ps.display_weight DESC
  LIMIT 1;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_random_prompt_suggestion IS 'Returns single weighted-random prompt suggestion';

-- =============================================================================
-- PHASE 3: Create engagement tracking functions
-- =============================================================================

-- Increment times_shown counter
CREATE OR REPLACE FUNCTION track_prompt_shown(prompt_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE prompt_suggestions
  SET
    times_shown = times_shown + 1,
    updated_at = NOW()
  WHERE id = prompt_id;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION track_prompt_shown IS 'Increment display counter when prompt is shown';

-- Increment times_clicked counter
CREATE OR REPLACE FUNCTION track_prompt_clicked(prompt_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE prompt_suggestions
  SET
    times_clicked = times_clicked + 1,
    times_shown = times_shown + 1, -- Also count as shown
    updated_at = NOW()
  WHERE id = prompt_id;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION track_prompt_clicked IS 'Increment click counter when prompt is clicked';

-- =============================================================================
-- PHASE 4: Create view for prompt analytics
-- =============================================================================

CREATE OR REPLACE VIEW prompt_analytics AS
SELECT
  id,
  prompt_text,
  category,
  display_weight,
  times_shown,
  times_clicked,
  CASE
    WHEN times_shown > 0 THEN ROUND((times_clicked::NUMERIC / times_shown::NUMERIC) * 100, 2)
    ELSE 0
  END as click_through_rate,
  is_active,
  created_at,
  updated_at
FROM prompt_suggestions
ORDER BY times_shown DESC;

COMMENT ON VIEW prompt_analytics IS 'Analytics view showing prompt performance metrics';

-- =============================================================================
-- PHASE 5: Seed initial prompt suggestions
-- =============================================================================

INSERT INTO prompt_suggestions (prompt_text, category, display_weight, is_active) VALUES
  -- High-priority general prompts
  ('Share what made you smile today', 'Daily Moments', 120, true),
  ('Capture a funny moment or quote', 'Memories', 100, true),
  ('Document a new skill or milestone', 'Milestones', 110, true),

  -- Daily activity prompts
  ('What new thing did they try today?', 'Daily Moments', 90, true),
  ('Share a special moment from today', 'Daily Moments', 95, true),
  ('What surprised you today?', 'Daily Moments', 85, true),

  -- Milestone prompts
  ('Record a recent achievement', 'Milestones', 100, true),
  ('Celebrate a growth moment', 'Milestones', 95, true),

  -- Memory prompts
  ('Share a heartwarming interaction', 'Memories', 90, true),
  ('Capture a precious expression', 'Memories', 85, true),
  ('What made you laugh together?', 'Memories', 80, true),

  -- Reflection prompts
  ('What are you grateful for today?', 'Reflections', 75, true),
  ('Share a lesson learned together', 'Reflections', 70, true);

-- =============================================================================
-- PHASE 6: Create indexes for performance
-- =============================================================================

-- Index for active prompt filtering
CREATE INDEX IF NOT EXISTS idx_prompt_suggestions_active
ON prompt_suggestions(is_active)
WHERE is_active = true;

-- Index for analytics queries
CREATE INDEX IF NOT EXISTS idx_prompt_suggestions_engagement
ON prompt_suggestions(times_shown, times_clicked)
WHERE is_active = true;

-- =============================================================================
-- PHASE 7: Enable RLS (optional - currently no user-specific data)
-- =============================================================================

-- RLS not strictly needed for read-only public prompts
-- But enable it for future flexibility
ALTER TABLE prompt_suggestions ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to read prompts
CREATE POLICY "Anyone can read active prompts" ON prompt_suggestions
  FOR SELECT
  USING (is_active = true);

-- Only admins can modify (you can adjust this based on your admin logic)
-- For now, disable INSERT/UPDATE/DELETE via RLS, manage via Supabase dashboard
CREATE POLICY "No public modifications" ON prompt_suggestions
  FOR ALL
  USING (false);

-- =============================================================================
-- MIGRATION COMPLETE
-- =============================================================================

DO $$
DECLARE
  prompt_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO prompt_count FROM prompt_suggestions WHERE is_active = true;

  RAISE NOTICE 'Migration 20251006000002_prompt_suggestions_simple completed successfully';
  RAISE NOTICE 'Created prompt_suggestions table';
  RAISE NOTICE 'Seeded % active prompt suggestions', prompt_count;
  RAISE NOTICE 'Created function: get_random_prompt_suggestion()';
  RAISE NOTICE 'Created function: track_prompt_shown()';
  RAISE NOTICE 'Created function: track_prompt_clicked()';
  RAISE NOTICE 'Created view: prompt_analytics';
  RAISE NOTICE '';
  RAISE NOTICE 'USAGE:';
  RAISE NOTICE '  SELECT * FROM get_random_prompt_suggestion();';
  RAISE NOTICE '  SELECT * FROM prompt_analytics;';
  RAISE NOTICE '';
  RAISE NOTICE 'NEXT STEPS:';
  RAISE NOTICE '1. Create API endpoint/function to call get_random_prompt_suggestion()';
  RAISE NOTICE '2. Update frontend to use database prompts instead of hardcoded';
  RAISE NOTICE '3. Implement tracking calls for shown/clicked metrics';
  RAISE NOTICE '4. Monitor prompt_analytics view for engagement patterns';
END $$;
