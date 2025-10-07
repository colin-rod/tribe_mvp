-- Migration: Memory Book Experience Transformation
-- Date: 2025-10-07
-- Description: Complete schema transformation from Updates/Digests to Memories/Summaries/Memory Book
-- Issue: Memory Book PRD Implementation
--
-- IMPORTANT: Execute this migration via Supabase SQL Editor
-- Do NOT run via CLI or automated migration tools

-- =============================================================================
-- 1. RENAME CORE TABLES
-- =============================================================================

-- Rename updates table to memories
ALTER TABLE IF EXISTS updates RENAME TO memories;

-- Rename digests table to summaries
ALTER TABLE IF EXISTS digests RENAME TO summaries;

-- Rename digest_updates junction table to summary_memories
ALTER TABLE IF EXISTS digest_updates RENAME TO summary_memories;

-- =============================================================================
-- 2. UPDATE FOREIGN KEY COLUMN NAMES
-- =============================================================================

-- Rename digest_id to summary_id in memories table
ALTER TABLE memories RENAME COLUMN digest_id TO summary_id;

-- Rename digest_id to summary_id in summary_memories junction table
ALTER TABLE summary_memories RENAME COLUMN digest_id TO summary_id;

-- Rename update_id to memory_id in summary_memories junction table
ALTER TABLE summary_memories RENAME COLUMN update_id TO memory_id;

-- =============================================================================
-- 3. MIGRATE EXISTING DATA FIRST (before adding new constraints)
-- =============================================================================

-- Drop old distribution_status constraint
ALTER TABLE memories DROP CONSTRAINT IF EXISTS updates_distribution_status_check;

-- Migrate existing statuses to new system BEFORE adding constraint
UPDATE memories
SET distribution_status = 'new'
WHERE distribution_status = 'draft';

UPDATE memories
SET distribution_status = 'approved'
WHERE distribution_status = 'ready';

UPDATE memories
SET distribution_status = 'sent'
WHERE distribution_status IN ('sent', 'sent_in_digest', 'in_digest', 'scheduled');

-- Ensure any other statuses default to 'new' for safety
UPDATE memories
SET distribution_status = 'new'
WHERE distribution_status NOT IN ('new', 'approved', 'sent', 'failed');

-- =============================================================================
-- 4. SIMPLIFY STATUS SYSTEM (after data migration)
-- =============================================================================

-- Add new simplified status system: new → approved → compiled → sent
ALTER TABLE memories
  ADD CONSTRAINT memories_status_check
  CHECK (distribution_status IN (
    'new',       -- Newly captured memory, not yet approved for compilation
    'approved',  -- User marked as ready for compilation
    'compiled',  -- Included in a summary, awaiting summary approval
    'sent',      -- Sent as part of an approved summary
    'failed'     -- Send failed (kept for error handling)
  ));

-- Update summary status constraint
ALTER TABLE summaries DROP CONSTRAINT IF EXISTS digests_status_check;

ALTER TABLE summaries
  ADD CONSTRAINT summaries_status_check
  CHECK (status IN (
    'compiling',   -- AI is processing
    'ready',       -- Ready for parent review
    'approved',    -- Parent approved, ready to send
    'sending',     -- Currently being sent
    'sent',        -- Successfully sent
    'failed'       -- Send failed
  ));

-- =============================================================================
-- 5. ADD NEW COLUMNS FOR MEMORY BOOK FEATURES
-- =============================================================================

-- Add "new" badge tracking to memories
ALTER TABLE memories
  ADD COLUMN IF NOT EXISTS is_new BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS capture_channel VARCHAR(20) DEFAULT 'web',
  ADD COLUMN IF NOT EXISTS marked_ready_at TIMESTAMP WITH TIME ZONE;

-- Add auto-publish configuration to summaries
ALTER TABLE summaries
  ADD COLUMN IF NOT EXISTS auto_publish_hours INTEGER DEFAULT 168, -- 7 days default
  ADD COLUMN IF NOT EXISTS last_reminder_sent_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS reminder_count INTEGER DEFAULT 0;

-- Add content analysis for hybrid recipient experience
ALTER TABLE summary_memories
  ADD COLUMN IF NOT EXISTS photo_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS render_style VARCHAR(20) DEFAULT 'narrative'; -- 'gallery' or 'narrative'

-- =============================================================================
-- 5. DROP UNUSED COLUMNS
-- =============================================================================

-- Remove version tracking (not needed per requirements)
ALTER TABLE memories DROP COLUMN IF EXISTS version;
ALTER TABLE memories DROP COLUMN IF EXISTS edit_count;
ALTER TABLE memories DROP COLUMN IF EXISTS last_edited_at;

-- =============================================================================
-- 6. UPDATE INDEXES
-- =============================================================================

-- Drop old indexes with old table names
DROP INDEX IF EXISTS idx_updates_digest_id;
DROP INDEX IF EXISTS idx_updates_parent_status_created;
DROP INDEX IF EXISTS idx_updates_status;
DROP INDEX IF EXISTS idx_digest_updates_digest_id;
DROP INDEX IF EXISTS idx_digest_updates_update_id;
DROP INDEX IF EXISTS idx_digest_updates_recipient_id;
DROP INDEX IF EXISTS idx_digest_updates_included;
DROP INDEX IF EXISTS idx_digests_parent_id;
DROP INDEX IF EXISTS idx_digests_status;
DROP INDEX IF EXISTS idx_digests_digest_date;
DROP INDEX IF EXISTS idx_digests_created_at;

-- Create new indexes with updated names
CREATE INDEX idx_memories_summary_id ON memories(summary_id);
CREATE INDEX idx_memories_parent_status_created ON memories(parent_id, distribution_status, created_at DESC);
CREATE INDEX idx_memories_status ON memories(distribution_status);
CREATE INDEX idx_memories_is_new ON memories(is_new) WHERE is_new = true;
CREATE INDEX idx_memories_capture_channel ON memories(capture_channel);

CREATE INDEX idx_summary_memories_summary_id ON summary_memories(summary_id);
CREATE INDEX idx_summary_memories_memory_id ON summary_memories(memory_id);
CREATE INDEX idx_summary_memories_recipient_id ON summary_memories(recipient_id);
CREATE INDEX idx_summary_memories_included ON summary_memories(included) WHERE included = true;

CREATE INDEX idx_summaries_parent_id ON summaries(parent_id);
CREATE INDEX idx_summaries_status ON summaries(status);
CREATE INDEX idx_summaries_digest_date ON summaries(digest_date);
CREATE INDEX idx_summaries_created_at ON summaries(created_at);
CREATE INDEX idx_summaries_auto_publish ON summaries(status, compiled_at)
  WHERE status = 'ready';

-- =============================================================================
-- 7. UPDATE RLS POLICIES
-- =============================================================================

-- Drop old RLS policies
DROP POLICY IF EXISTS "Parents can manage their own digests" ON summaries;
DROP POLICY IF EXISTS "Parents can manage their digest updates" ON summary_memories;

-- Create new RLS policies with correct table names
CREATE POLICY "Parents can manage their own summaries" ON summaries
  FOR ALL USING (auth.uid() = parent_id);

CREATE POLICY "Parents can manage their summary memories" ON summary_memories
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM summaries
      WHERE summaries.id = summary_memories.summary_id
      AND summaries.parent_id = auth.uid()
    )
  );

-- =============================================================================
-- 8. UPDATE TRIGGERS AND FUNCTIONS
-- =============================================================================

-- Drop old triggers
DROP TRIGGER IF EXISTS trigger_update_digest_stats ON summary_memories;
DROP TRIGGER IF EXISTS trigger_track_update_edit ON memories;
DROP TRIGGER IF EXISTS trigger_update_digest_updated_at ON summaries;

-- Update function names and logic
DROP FUNCTION IF EXISTS update_digest_stats();
CREATE OR REPLACE FUNCTION update_summary_stats()
RETURNS TRIGGER AS $$
BEGIN
  -- Update total_updates count (now total_memories)
  UPDATE summaries
  SET total_updates = (
    SELECT COUNT(DISTINCT memory_id)
    FROM summary_memories
    WHERE summary_id = NEW.summary_id AND included = true
  )
  WHERE id = NEW.summary_id;

  -- Update total_recipients count
  UPDATE summaries
  SET total_recipients = (
    SELECT COUNT(DISTINCT recipient_id)
    FROM summary_memories
    WHERE summary_id = NEW.summary_id AND included = true
  )
  WHERE id = NEW.summary_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recreate trigger with new function
CREATE TRIGGER trigger_update_summary_stats
  AFTER INSERT OR UPDATE OR DELETE ON summary_memories
  FOR EACH ROW
  EXECUTE FUNCTION update_summary_stats();

-- Drop old edit tracking trigger (not needed)
DROP FUNCTION IF EXISTS track_update_edit();

-- Update auto-update timestamp function
DROP FUNCTION IF EXISTS update_digest_updated_at();
CREATE OR REPLACE FUNCTION update_summary_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_summary_updated_at
  BEFORE UPDATE ON summaries
  FOR EACH ROW
  EXECUTE FUNCTION update_summary_updated_at();

-- =============================================================================
-- 9. CREATE AUTO-PUBLISH HELPER FUNCTIONS
-- =============================================================================

-- Function to identify summaries ready for auto-publish
CREATE OR REPLACE FUNCTION get_summaries_for_auto_publish()
RETURNS TABLE(
  summary_id UUID,
  parent_id UUID,
  compiled_at TIMESTAMP WITH TIME ZONE,
  hours_since_compiled INTEGER,
  auto_publish_hours INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    s.id as summary_id,
    s.parent_id,
    s.compiled_at,
    EXTRACT(EPOCH FROM (NOW() - s.compiled_at)) / 3600 as hours_since_compiled,
    s.auto_publish_hours
  FROM summaries s
  WHERE s.status = 'ready'
    AND s.compiled_at IS NOT NULL
    AND EXTRACT(EPOCH FROM (NOW() - s.compiled_at)) / 3600 >= s.auto_publish_hours;
END;
$$ LANGUAGE plpgsql;

-- Function to get summaries needing reminder notifications
CREATE OR REPLACE FUNCTION get_summaries_needing_reminders()
RETURNS TABLE(
  summary_id UUID,
  parent_id UUID,
  hours_until_auto_publish INTEGER,
  last_reminder_hours_ago INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    s.id as summary_id,
    s.parent_id,
    s.auto_publish_hours - EXTRACT(EPOCH FROM (NOW() - s.compiled_at)) / 3600 as hours_until_auto_publish,
    CASE
      WHEN s.last_reminder_sent_at IS NULL THEN NULL
      ELSE EXTRACT(EPOCH FROM (NOW() - s.last_reminder_sent_at)) / 3600
    END as last_reminder_hours_ago
  FROM summaries s
  WHERE s.status = 'ready'
    AND s.compiled_at IS NOT NULL
    AND EXTRACT(EPOCH FROM (NOW() - s.compiled_at)) / 3600 < s.auto_publish_hours
    AND (
      -- 48 hour reminder (if auto_publish > 48hrs and hasn't been sent)
      (s.auto_publish_hours - EXTRACT(EPOCH FROM (NOW() - s.compiled_at)) / 3600 <= 48
       AND s.auto_publish_hours - EXTRACT(EPOCH FROM (NOW() - s.compiled_at)) / 3600 > 24
       AND (s.last_reminder_sent_at IS NULL OR s.reminder_count = 0))
      OR
      -- 24 hour reminder (if auto_publish > 24hrs and 48hr reminder sent)
      (s.auto_publish_hours - EXTRACT(EPOCH FROM (NOW() - s.compiled_at)) / 3600 <= 24
       AND s.auto_publish_hours - EXTRACT(EPOCH FROM (NOW() - s.compiled_at)) / 3600 > 0
       AND s.reminder_count <= 1)
    );
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- 10. ADDITIONAL DATA MIGRATION - Update flags and metadata
-- =============================================================================

-- Set is_new flag based on current status (after constraint is added)
UPDATE memories
SET is_new = (distribution_status = 'new');

-- Set default capture channel for existing memories
UPDATE memories
SET capture_channel = CASE
  WHEN content_format = 'email' THEN 'email'
  WHEN content_format = 'sms' THEN 'sms'
  WHEN content_format = 'whatsapp' THEN 'whatsapp'
  ELSE 'web'
END;

-- Analyze summary_memories content for hybrid rendering
UPDATE summary_memories sm
SET
  photo_count = (
    SELECT COALESCE(array_length(m.media_urls, 1), 0)
    FROM memories m
    WHERE m.id = sm.memory_id
  ),
  render_style = CASE
    WHEN (
      SELECT COALESCE(array_length(m.media_urls, 1), 0)
      FROM memories m
      WHERE m.id = sm.memory_id
    ) >= 3 THEN 'gallery'
    ELSE 'narrative'
  END;

-- =============================================================================
-- 11. ADD COMMENTS FOR DOCUMENTATION
-- =============================================================================

COMMENT ON TABLE memories IS 'User-generated memories (formerly updates) - photos, text, milestones about children';
COMMENT ON TABLE summaries IS 'Weekly AI-compiled summaries (formerly digests) of memories';
COMMENT ON TABLE summary_memories IS 'Junction table linking memories to summaries for specific recipients';

COMMENT ON COLUMN memories.is_new IS 'Badge indicator - true until user marks memory as ready for compilation';
COMMENT ON COLUMN memories.capture_channel IS 'Source of memory capture: web, email, sms, whatsapp, audio, video';
COMMENT ON COLUMN memories.marked_ready_at IS 'Timestamp when user marked memory as approved/ready';

COMMENT ON COLUMN summaries.auto_publish_hours IS 'Hours to wait before auto-publishing if not manually approved (default 168 = 7 days)';
COMMENT ON COLUMN summaries.last_reminder_sent_at IS 'Last time reminder notification was sent to parent';
COMMENT ON COLUMN summaries.reminder_count IS 'Number of reminders sent (max 2: 48hr and 24hr before auto-publish)';

COMMENT ON COLUMN summary_memories.photo_count IS 'Number of photos in this memory (for content-based rendering)';
COMMENT ON COLUMN summary_memories.render_style IS 'How to render for recipient: gallery (3+ photos) or narrative (<3 photos)';

-- =============================================================================
-- VERIFICATION QUERIES
-- =============================================================================

-- Verify table renames
-- SELECT table_name FROM information_schema.tables
-- WHERE table_schema = 'public'
-- AND table_name IN ('memories', 'summaries', 'summary_memories');

-- Verify new columns
-- SELECT column_name, data_type, column_default
-- FROM information_schema.columns
-- WHERE table_name = 'memories'
-- AND column_name IN ('is_new', 'capture_channel', 'marked_ready_at');

-- Verify status distribution
-- SELECT distribution_status, COUNT(*)
-- FROM memories
-- GROUP BY distribution_status;

-- Test auto-publish query
-- SELECT * FROM get_summaries_for_auto_publish();

-- Test reminder query
-- SELECT * FROM get_summaries_needing_reminders();
