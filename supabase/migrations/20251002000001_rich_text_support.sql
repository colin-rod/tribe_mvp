-- Migration: 20251002000001_rich_text_support.sql
-- Description: Add support for rich text formatting in updates
-- Issue: CRO-90 - Add ability for users to adjust their text formatting in their updates
--
-- IMPORTANT: Execute this migration via Supabase SQL Editor
-- Do NOT run via CLI or automated migration tools

-- The updates table already has the necessary columns for rich text support:
-- - content (TEXT): Can store both plain text and HTML
-- - content_format (VARCHAR): Already supports 'plain' and 'rich' formats
-- - rich_content (JSONB): Can store structured rich text data
--
-- This migration adds helpful comments and a function to validate rich text content

-- Add comment to clarify content column usage
COMMENT ON COLUMN public.updates.content IS 'Stores update content. Can contain plain text or HTML for rich text formatting. Use content_format to indicate the format type.';

-- Add comment to clarify content_format column usage
COMMENT ON COLUMN public.updates.content_format IS 'Format of the content: plain (plain text), rich (HTML with formatting), email/sms/whatsapp (channel-specific formats)';

-- Add comment to clarify rich_content column usage
COMMENT ON COLUMN public.updates.rich_content IS 'Optional JSONB storage for structured rich text data. Can store HTML, plain text, and metadata about formatting.';

-- Create a function to extract plain text from HTML content (useful for search, character counting)
CREATE OR REPLACE FUNCTION public.extract_plain_text_from_html(html_content TEXT)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  plain_text TEXT;
BEGIN
  -- Remove HTML tags using regex
  plain_text := regexp_replace(html_content, '<[^>]*>', '', 'g');

  -- Decode common HTML entities
  plain_text := replace(plain_text, '&nbsp;', ' ');
  plain_text := replace(plain_text, '&amp;', '&');
  plain_text := replace(plain_text, '&lt;', '<');
  plain_text := replace(plain_text, '&gt;', '>');
  plain_text := replace(plain_text, '&quot;', '"');
  plain_text := replace(plain_text, '&#39;', '''');

  -- Trim whitespace
  plain_text := trim(plain_text);

  RETURN plain_text;
END;
$$;

-- Add comment to the function
COMMENT ON FUNCTION public.extract_plain_text_from_html(TEXT) IS 'Extracts plain text from HTML content by removing tags and decoding entities. Useful for search indexing and character counting.';

-- Create a helper function to validate rich text content length
CREATE OR REPLACE FUNCTION public.validate_rich_text_length(html_content TEXT, max_length INTEGER DEFAULT 2000)
RETURNS BOOLEAN
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  plain_text TEXT;
  text_length INTEGER;
BEGIN
  -- Extract plain text from HTML
  plain_text := public.extract_plain_text_from_html(html_content);

  -- Get length
  text_length := length(plain_text);

  -- Return true if within limit
  RETURN text_length <= max_length;
END;
$$;

-- Add comment to the validation function
COMMENT ON FUNCTION public.validate_rich_text_length(TEXT, INTEGER) IS 'Validates that the plain text extracted from HTML content does not exceed the specified character limit (default 2000).';

-- Update the search_vector trigger to handle HTML content
-- This ensures that even with HTML formatting, search still works on plain text
CREATE OR REPLACE FUNCTION public.update_updates_search_vector()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  searchable_content TEXT;
BEGIN
  -- Extract plain text if content_format is 'rich'
  IF NEW.content_format = 'rich' THEN
    searchable_content := public.extract_plain_text_from_html(NEW.content);
  ELSE
    searchable_content := NEW.content;
  END IF;

  -- Update search vector with plain text content and subject
  NEW.search_vector :=
    setweight(to_tsvector('english', COALESCE(NEW.subject, '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(searchable_content, '')), 'B');

  RETURN NEW;
END;
$$;

-- Drop existing trigger if it exists and recreate it
DROP TRIGGER IF EXISTS updates_search_vector_update ON public.updates;

CREATE TRIGGER updates_search_vector_update
  BEFORE INSERT OR UPDATE OF content, subject, content_format
  ON public.updates
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updates_search_vector();

-- Grant execute permissions on the new functions to authenticated users
GRANT EXECUTE ON FUNCTION public.extract_plain_text_from_html(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.validate_rich_text_length(TEXT, INTEGER) TO authenticated;

-- Migration complete
-- The schema now fully supports rich text formatting with:
-- 1. Proper column documentation
-- 2. Helper functions for text extraction and validation
-- 3. Updated search functionality that works with HTML content
