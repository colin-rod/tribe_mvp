-- Add narrative storage for two-AI digest workflow (CRO-267)
-- This migration adds structured narrative fields to support:
-- 1. Recipient-facing narratives (email/SMS/WhatsApp)
-- 2. Parent-facing narratives (print/archival)

-- Add narrative_data to digest_updates table
-- Stores the AI-generated narrative for each recipient
ALTER TABLE digest_updates
ADD COLUMN IF NOT EXISTS narrative_data JSONB;

COMMENT ON COLUMN digest_updates.narrative_data IS
'AI-generated narrative for recipient including intro, body, closing, and media references.
Schema: { intro: string, narrative: string, closing: string, media_references: [{id, reference_text, url, type}] }';

-- Add parent_narrative to digests table
-- Stores the detailed chronological narrative for parent's archival/print view
ALTER TABLE digests
ADD COLUMN IF NOT EXISTS parent_narrative JSONB;

COMMENT ON COLUMN digests.parent_narrative IS
'AI-generated parent-facing narrative for print/archival.
Schema: { title: string, intro: string, narrative: string, closing: string, media_references: [{id, reference_text, url, type}] }';

-- Create GIN index for efficient JSONB queries
CREATE INDEX IF NOT EXISTS idx_digest_updates_narrative_data
  ON digest_updates USING gin(narrative_data);

CREATE INDEX IF NOT EXISTS idx_digests_parent_narrative
  ON digests USING gin(parent_narrative);

-- Add function to validate narrative_data structure
CREATE OR REPLACE FUNCTION validate_narrative_data()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.narrative_data IS NOT NULL THEN
    -- Check required fields exist
    IF NOT (
      NEW.narrative_data ? 'intro' AND
      NEW.narrative_data ? 'narrative' AND
      NEW.narrative_data ? 'closing' AND
      NEW.narrative_data ? 'media_references'
    ) THEN
      RAISE EXCEPTION 'narrative_data must contain intro, narrative, closing, and media_references fields';
    END IF;

    -- Check media_references is an array
    IF jsonb_typeof(NEW.narrative_data->'media_references') != 'array' THEN
      RAISE EXCEPTION 'media_references must be an array';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add trigger for narrative_data validation
DROP TRIGGER IF EXISTS validate_digest_update_narrative ON digest_updates;
CREATE TRIGGER validate_digest_update_narrative
  BEFORE INSERT OR UPDATE ON digest_updates
  FOR EACH ROW
  EXECUTE FUNCTION validate_narrative_data();

-- Add function to validate parent_narrative structure
CREATE OR REPLACE FUNCTION validate_parent_narrative()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.parent_narrative IS NOT NULL THEN
    -- Check required fields exist
    IF NOT (
      NEW.parent_narrative ? 'title' AND
      NEW.parent_narrative ? 'intro' AND
      NEW.parent_narrative ? 'narrative' AND
      NEW.parent_narrative ? 'closing' AND
      NEW.parent_narrative ? 'media_references'
    ) THEN
      RAISE EXCEPTION 'parent_narrative must contain title, intro, narrative, closing, and media_references fields';
    END IF;

    -- Check media_references is an array
    IF jsonb_typeof(NEW.parent_narrative->'media_references') != 'array' THEN
      RAISE EXCEPTION 'media_references must be an array';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add trigger for parent_narrative validation
DROP TRIGGER IF EXISTS validate_digest_parent_narrative ON digests;
CREATE TRIGGER validate_digest_parent_narrative
  BEFORE INSERT OR UPDATE ON digests
  FOR EACH ROW
  EXECUTE FUNCTION validate_parent_narrative();

-- Update RLS policies to allow narrative access (same as other digest fields)
-- Narratives inherit the same access control as the digest/digest_update records

-- Add helper function to get narrative preview (first 200 chars)
CREATE OR REPLACE FUNCTION get_narrative_preview(narrative_json JSONB)
RETURNS TEXT AS $$
BEGIN
  IF narrative_json IS NULL THEN
    RETURN NULL;
  END IF;

  RETURN substring(
    COALESCE(narrative_json->>'narrative', ''),
    1,
    200
  ) || CASE
    WHEN length(narrative_json->>'narrative') > 200 THEN '...'
    ELSE ''
  END;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

COMMENT ON FUNCTION get_narrative_preview IS
'Helper function to get a preview of the narrative text (first 200 characters)';
