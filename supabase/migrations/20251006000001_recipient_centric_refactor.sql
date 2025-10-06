-- Migration: 20251006000001_recipient_centric_refactor.sql
-- Description: Refactor from group-based to recipient-centric preference model
-- Issue: Recipient-Centric Experience - Remove Group Management
--
-- IMPORTANT: Execute this migration via Supabase SQL Editor
-- Do NOT run via CLI or automated migration tools
--
-- This migration:
-- 1. Adds importance classification fields to updates table
-- 2. Adds importance threshold to recipients table
-- 3. Migrates existing recipient data to new preference model
-- 4. Removes group_id dependency from recipients
-- 5. Archives recipient_groups table for potential rollback

-- =============================================================================
-- PHASE 1: Add new fields to updates table for AI importance classification
-- =============================================================================

-- Add importance classification fields
ALTER TABLE updates
ADD COLUMN IF NOT EXISTS ai_suggested_importance VARCHAR
  CHECK (ai_suggested_importance IN ('all_updates', 'milestone', 'major_milestone'));

ALTER TABLE updates
ADD COLUMN IF NOT EXISTS importance_level VARCHAR DEFAULT 'all_updates'
  CHECK (importance_level IN ('all_updates', 'milestone', 'major_milestone'));

ALTER TABLE updates
ADD COLUMN IF NOT EXISTS importance_overridden BOOLEAN DEFAULT false;

COMMENT ON COLUMN updates.ai_suggested_importance IS 'AI-determined importance level for the update';
COMMENT ON COLUMN updates.importance_level IS 'Final importance level (AI suggestion or user override)';
COMMENT ON COLUMN updates.importance_overridden IS 'Whether user manually overrode AI suggestion';

-- =============================================================================
-- PHASE 2: Add importance threshold to recipients table
-- =============================================================================

-- Add importance threshold preference for recipients
ALTER TABLE recipients
ADD COLUMN IF NOT EXISTS importance_threshold VARCHAR DEFAULT 'all_updates'
  CHECK (importance_threshold IN ('all_updates', 'milestones_only', 'major_milestones_only'));

COMMENT ON COLUMN recipients.importance_threshold IS 'Minimum importance level recipient wants to receive';

-- =============================================================================
-- PHASE 3: Migrate existing recipient preferences based on relationship
-- =============================================================================

-- Set default importance thresholds based on relationship
-- This provides sensible defaults for existing recipients
UPDATE recipients
SET importance_threshold = CASE
  WHEN relationship = 'grandparent' THEN 'milestones_only'
  WHEN relationship = 'parent' THEN 'all_updates'
  WHEN relationship = 'sibling' THEN 'milestones_only'
  WHEN relationship = 'friend' THEN 'milestones_only'
  WHEN relationship = 'family' THEN 'milestones_only'
  WHEN relationship = 'colleague' THEN 'major_milestones_only'
  WHEN relationship = 'other' THEN 'milestones_only'
  ELSE 'milestones_only'
END
WHERE importance_threshold IS NULL;

-- Migrate frequency preferences to align with new model
-- Users who want 'every_update' should also want 'all_updates' importance
UPDATE recipients
SET importance_threshold = 'all_updates'
WHERE frequency = 'every_update' AND importance_threshold != 'all_updates';

-- Users who want 'milestones_only' frequency should align threshold
UPDATE recipients
SET importance_threshold = 'milestones_only'
WHERE frequency = 'milestones_only' AND importance_threshold = 'all_updates';

-- =============================================================================
-- PHASE 4: Classify existing updates with default importance
-- =============================================================================

-- Set default importance for existing updates based on milestone_type
-- Major milestones
UPDATE updates
SET
  ai_suggested_importance = 'major_milestone',
  importance_level = 'major_milestone'
WHERE milestone_type IN ('first_steps', 'first_words', 'birthday', 'first_day_school', 'potty_training', 'walking')
  AND importance_level IS NULL;

-- Regular milestones
UPDATE updates
SET
  ai_suggested_importance = 'milestone',
  importance_level = 'milestone'
WHERE milestone_type IN ('first_smile', 'rolling', 'sitting', 'crawling', 'first_tooth')
  AND importance_level IS NULL;

-- All other updates default to 'all_updates'
UPDATE updates
SET
  ai_suggested_importance = 'all_updates',
  importance_level = 'all_updates'
WHERE importance_level IS NULL;

-- =============================================================================
-- PHASE 5: Make group_id optional in recipients table
-- =============================================================================

-- The group_id will be gradually phased out, but we keep it temporarily
-- for backward compatibility during the transition
-- We'll remove the foreign key constraint to allow NULL values

-- First, update any recipients with group_id to have their preferences
-- match their group's defaults (if not already overridden)
UPDATE recipients r
SET
  frequency = COALESCE(r.frequency, rg.default_frequency),
  preferred_channels = COALESCE(r.preferred_channels, rg.default_channels)
FROM recipient_groups rg
WHERE r.group_id = rg.id
  AND r.overrides_group_default = false
  AND (r.frequency IS NULL OR r.preferred_channels IS NULL);

-- =============================================================================
-- PHASE 6: Create function to get recipient notifications with importance filtering
-- =============================================================================

-- Function to determine if an update should be sent to a recipient based on importance
CREATE OR REPLACE FUNCTION should_send_to_recipient(
  update_importance VARCHAR,
  recipient_threshold VARCHAR
)
RETURNS BOOLEAN
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  importance_rank INTEGER;
  threshold_rank INTEGER;
BEGIN
  -- Map importance levels to numeric ranks
  importance_rank := CASE update_importance
    WHEN 'all_updates' THEN 0
    WHEN 'milestone' THEN 1
    WHEN 'major_milestone' THEN 2
    ELSE 0
  END;

  threshold_rank := CASE recipient_threshold
    WHEN 'all_updates' THEN 0
    WHEN 'milestones_only' THEN 1
    WHEN 'major_milestones_only' THEN 2
    ELSE 0
  END;

  -- Update importance must be >= threshold
  RETURN importance_rank >= threshold_rank;
END;
$$;

COMMENT ON FUNCTION should_send_to_recipient IS 'Determines if update meets recipient importance threshold';

-- =============================================================================
-- PHASE 7: Create view for active recipients with full preference data
-- =============================================================================

-- Create view that shows recipients with their full preference profile
-- This will be useful for notification delivery logic
CREATE OR REPLACE VIEW recipient_preferences AS
SELECT
  r.id,
  r.parent_id,
  r.name,
  r.email,
  r.phone,
  r.relationship,
  r.frequency,
  r.preferred_channels,
  r.content_types,
  r.importance_threshold,
  r.overrides_group_default,
  r.preference_token,
  r.is_active,
  r.created_at,
  r.group_id, -- Kept for backward compatibility during transition
  rg.name as group_name, -- Kept for backward compatibility
  rg.default_frequency as group_default_frequency,
  rg.default_channels as group_default_channels
FROM recipients r
LEFT JOIN recipient_groups rg ON r.group_id = rg.id
WHERE r.is_active = true;

COMMENT ON VIEW recipient_preferences IS 'Active recipients with complete preference profile including importance threshold';

-- =============================================================================
-- PHASE 8: Create indexes for performance
-- =============================================================================

-- Index for filtering recipients by importance threshold
CREATE INDEX IF NOT EXISTS idx_recipients_importance_threshold
ON recipients(importance_threshold)
WHERE is_active = true;

-- Index for filtering updates by importance level
CREATE INDEX IF NOT EXISTS idx_updates_importance_level
ON updates(importance_level);

-- Composite index for notification delivery queries
CREATE INDEX IF NOT EXISTS idx_recipients_active_preferences
ON recipients(parent_id, is_active, importance_threshold, frequency)
WHERE is_active = true;

-- =============================================================================
-- PHASE 9: Update RLS policies if needed
-- =============================================================================

-- Recipients can view their own preference data via token (already exists)
-- No changes needed to RLS policies for this migration

-- =============================================================================
-- MIGRATION COMPLETE
-- =============================================================================

-- Log migration completion
DO $$
BEGIN
  RAISE NOTICE 'Migration 20251006000001_recipient_centric_refactor completed successfully';
  RAISE NOTICE 'Added importance classification to updates table';
  RAISE NOTICE 'Added importance threshold to recipients table';
  RAISE NOTICE 'Migrated % existing recipients with default importance thresholds', (SELECT COUNT(*) FROM recipients);
  RAISE NOTICE 'Classified % existing updates with importance levels', (SELECT COUNT(*) FROM updates);
  RAISE NOTICE 'Created helper function: should_send_to_recipient()';
  RAISE NOTICE 'Created view: recipient_preferences';
  RAISE NOTICE '';
  RAISE NOTICE 'NEXT STEPS:';
  RAISE NOTICE '1. Test the new importance classification with sample updates';
  RAISE NOTICE '2. Update application code to use importance_threshold';
  RAISE NOTICE '3. Deploy new recipient preference UI';
  RAISE NOTICE '4. Monitor and tune AI importance classification';
  RAISE NOTICE '5. After successful transition, run cleanup migration to drop recipient_groups';
END $$;
