-- Migration: Digest System - Multi-Modal Update Workflow
-- Date: 2025-09-30
-- Description: Complete database schema for draft management, digest compilation, and AI-powered personalization
-- This implements the "capture-refine-compile-approve-send" workflow

-- =============================================================================
-- 1. DIGESTS TABLE - Main digest entity
-- =============================================================================

CREATE TABLE IF NOT EXISTS digests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  parent_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,

  -- Digest metadata
  title VARCHAR(200) NOT NULL,
  digest_date DATE NOT NULL,
  date_range_start DATE NOT NULL,
  date_range_end DATE NOT NULL,

  -- Status workflow: compiling → ready → approved → sending → sent
  status VARCHAR DEFAULT 'compiling' CHECK (status IN (
    'compiling',      -- AI is processing
    'ready',          -- Ready for user review
    'approved',       -- User approved, ready to send
    'sending',        -- Currently being sent
    'sent',           -- Successfully sent
    'failed'          -- Send failed
  )),

  -- AI compilation metadata
  ai_compilation_data JSONB DEFAULT '{}'::jsonb,  -- AI reasoning, themes, groupings
  recipient_breakdown JSONB DEFAULT '{}'::jsonb,  -- Per-recipient digest summary

  -- Statistics
  total_updates INTEGER DEFAULT 0,
  total_recipients INTEGER DEFAULT 0,
  sent_count INTEGER DEFAULT 0,
  failed_count INTEGER DEFAULT 0,

  -- Timestamps
  compiled_at TIMESTAMP WITH TIME ZONE,
  approved_at TIMESTAMP WITH TIME ZONE,
  sent_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for digests
CREATE INDEX idx_digests_parent_id ON digests(parent_id);
CREATE INDEX idx_digests_status ON digests(status);
CREATE INDEX idx_digests_digest_date ON digests(digest_date);
CREATE INDEX idx_digests_created_at ON digests(created_at);

-- =============================================================================
-- 2. DIGEST UPDATES JUNCTION - Maps updates to digests with per-recipient customization
-- =============================================================================

CREATE TABLE IF NOT EXISTS digest_updates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  digest_id UUID REFERENCES digests(id) ON DELETE CASCADE NOT NULL,
  update_id UUID REFERENCES updates(id) ON DELETE CASCADE NOT NULL,
  recipient_id UUID REFERENCES recipients(id) ON DELETE CASCADE NOT NULL,

  -- Include/exclude per recipient
  included BOOLEAN DEFAULT true,

  -- Display customization per recipient
  display_order INTEGER NOT NULL DEFAULT 0,
  custom_caption TEXT,  -- Override caption for this specific recipient
  custom_subject TEXT,  -- Override subject line for this recipient

  -- AI reasoning for inclusion
  ai_rationale JSONB DEFAULT '{}'::jsonb,  -- Why AI included this for this recipient

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Ensure each update can only be included once per recipient per digest
  UNIQUE(digest_id, update_id, recipient_id)
);

-- Indexes for digest_updates
CREATE INDEX idx_digest_updates_digest_id ON digest_updates(digest_id);
CREATE INDEX idx_digest_updates_update_id ON digest_updates(update_id);
CREATE INDEX idx_digest_updates_recipient_id ON digest_updates(recipient_id);
CREATE INDEX idx_digest_updates_included ON digest_updates(included) WHERE included = true;

-- =============================================================================
-- 3. UPDATE STATUS EXPANSION - Support draft workflow and digest tracking
-- =============================================================================

-- Drop old constraint
ALTER TABLE updates DROP CONSTRAINT IF EXISTS updates_distribution_status_check;

-- Add new expanded statuses
ALTER TABLE updates
  ADD CONSTRAINT updates_distribution_status_check
  CHECK (distribution_status IN (
    'draft',           -- User is still editing/building the update
    'ready',           -- Ready to be compiled into digest
    'in_digest',       -- Included in a digest (not sent yet)
    'scheduled',       -- Scheduled for direct sending (bypasses digest)
    'sent',            -- Sent directly (not via digest)
    'sent_in_digest',  -- Sent as part of a digest
    'failed'           -- Send failed
  ));

-- Add digest reference to updates
ALTER TABLE updates
  ADD COLUMN IF NOT EXISTS digest_id UUID REFERENCES digests(id) ON DELETE SET NULL;

-- Add version tracking for iterative editing
ALTER TABLE updates
  ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1,
  ADD COLUMN IF NOT EXISTS last_edited_at TIMESTAMP WITH TIME ZONE;

-- Add edit count for analytics
ALTER TABLE updates
  ADD COLUMN IF NOT EXISTS edit_count INTEGER DEFAULT 0;

-- Add index for digest_id lookups
CREATE INDEX IF NOT EXISTS idx_updates_digest_id ON updates(digest_id);

-- =============================================================================
-- 4. RECIPIENT DIGEST PREFERENCES - Per-recipient digest settings
-- =============================================================================

-- Add digest-specific preferences to recipients table
ALTER TABLE recipients
  ADD COLUMN IF NOT EXISTS digest_preferences JSONB DEFAULT '{
    "include_in_digests": true,
    "max_updates_per_digest": null,
    "preferred_content_types": ["photos", "milestones", "text", "videos"],
    "min_importance_level": 1,
    "exclude_routine_updates": false,
    "personalization_level": "high"
  }'::jsonb;

-- =============================================================================
-- 5. HELPER FUNCTIONS
-- =============================================================================

-- Function to update digest statistics
CREATE OR REPLACE FUNCTION update_digest_stats()
RETURNS TRIGGER AS $$
BEGIN
  -- Update total_updates count
  UPDATE digests
  SET total_updates = (
    SELECT COUNT(DISTINCT update_id)
    FROM digest_updates
    WHERE digest_id = NEW.digest_id AND included = true
  )
  WHERE id = NEW.digest_id;

  -- Update total_recipients count
  UPDATE digests
  SET total_recipients = (
    SELECT COUNT(DISTINCT recipient_id)
    FROM digest_updates
    WHERE digest_id = NEW.digest_id AND included = true
  )
  WHERE id = NEW.digest_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to maintain digest statistics
DROP TRIGGER IF EXISTS trigger_update_digest_stats ON digest_updates;
CREATE TRIGGER trigger_update_digest_stats
  AFTER INSERT OR UPDATE OR DELETE ON digest_updates
  FOR EACH ROW
  EXECUTE FUNCTION update_digest_stats();

-- Function to track update edits
CREATE OR REPLACE FUNCTION track_update_edit()
RETURNS TRIGGER AS $$
BEGIN
  -- Increment version and edit count
  NEW.version = OLD.version + 1;
  NEW.edit_count = OLD.edit_count + 1;
  NEW.last_edited_at = NOW();

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for update edit tracking
DROP TRIGGER IF EXISTS trigger_track_update_edit ON updates;
CREATE TRIGGER trigger_track_update_edit
  BEFORE UPDATE ON updates
  FOR EACH ROW
  WHEN (OLD.content IS DISTINCT FROM NEW.content
    OR OLD.subject IS DISTINCT FROM NEW.subject
    OR OLD.rich_content IS DISTINCT FROM NEW.rich_content
    OR OLD.media_urls IS DISTINCT FROM NEW.media_urls)
  EXECUTE FUNCTION track_update_edit();

-- Function to auto-update digest updated_at
CREATE OR REPLACE FUNCTION update_digest_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for digest updated_at
DROP TRIGGER IF EXISTS trigger_update_digest_updated_at ON digests;
CREATE TRIGGER trigger_update_digest_updated_at
  BEFORE UPDATE ON digests
  FOR EACH ROW
  EXECUTE FUNCTION update_digest_updated_at();

-- =============================================================================
-- 6. ENABLE RLS (Row Level Security)
-- =============================================================================

-- Enable RLS on digests table
ALTER TABLE digests ENABLE ROW LEVEL SECURITY;

-- RLS policies for digests
DROP POLICY IF EXISTS "Parents can manage their own digests" ON digests;
CREATE POLICY "Parents can manage their own digests" ON digests
  FOR ALL USING (auth.uid() = parent_id);

-- Enable RLS on digest_updates table
ALTER TABLE digest_updates ENABLE ROW LEVEL SECURITY;

-- RLS policies for digest_updates
DROP POLICY IF EXISTS "Parents can manage their digest updates" ON digest_updates;
CREATE POLICY "Parents can manage their digest updates" ON digest_updates
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM digests
      WHERE digests.id = digest_updates.digest_id
      AND digests.parent_id = auth.uid()
    )
  );

-- =============================================================================
-- 7. DATA MIGRATION - Update existing records
-- =============================================================================

-- Migrate existing 'confirmed' status to 'ready' (better matches new workflow)
UPDATE updates
SET distribution_status = 'ready'
WHERE distribution_status = 'confirmed';

-- Initialize last_edited_at for existing updates
UPDATE updates
SET last_edited_at = updated_at
WHERE last_edited_at IS NULL;

-- =============================================================================
-- 8. PERFORMANCE INDEXES
-- =============================================================================

-- Additional composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_updates_parent_status_created
  ON updates(parent_id, distribution_status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_digest_updates_digest_recipient
  ON digest_updates(digest_id, recipient_id) WHERE included = true;

CREATE INDEX IF NOT EXISTS idx_digests_parent_status_date
  ON digests(parent_id, status, digest_date DESC);

-- =============================================================================
-- VERIFICATION QUERIES (Run after migration to verify)
-- =============================================================================

-- Verify tables exist
-- SELECT table_name FROM information_schema.tables
-- WHERE table_schema = 'public'
-- AND table_name IN ('digests', 'digest_updates');

-- Verify new columns on updates
-- SELECT column_name, data_type
-- FROM information_schema.columns
-- WHERE table_name = 'updates'
-- AND column_name IN ('digest_id', 'version', 'last_edited_at', 'edit_count');

-- Verify RLS is enabled
-- SELECT tablename, rowsecurity
-- FROM pg_tables
-- WHERE schemaname = 'public'
-- AND tablename IN ('digests', 'digest_updates');

-- Count existing updates by status
-- SELECT distribution_status, COUNT(*)
-- FROM updates
-- GROUP BY distribution_status;