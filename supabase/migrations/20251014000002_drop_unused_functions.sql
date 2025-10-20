-- Migration: Drop Unused Functions
-- Description: Remove 2 confirmed unused functions (migration/debugging tools)
-- Issue: Backend Audit - Function Cleanup
-- Generated: 2025-10-14
--
-- IMPORTANT: Execute this migration via Supabase SQL Editor
-- Do NOT run via CLI or automated migration tools
--
-- SAFETY: Only drops confirmed unused functions
-- These are one-time migration/debugging tools that are no longer needed
--
-- FUNCTIONS TO DROP:
-- 1. migrate_email_updates - One-time migration (already completed)
-- 2. analyze_content_formats - Development/debugging tool (not used in production)

-- ============================================================================
-- SECTION 1: Drop Migration Function
-- ============================================================================

-- migrate_email_updates()
-- Purpose: One-time migration to convert plain text updates to email format
-- Status: Migration already completed
-- Used by: Nothing (one-time use)
-- Risk: NONE - Function not called anywhere

DROP FUNCTION IF EXISTS public.migrate_email_updates();

-- ============================================================================
-- SECTION 2: Drop Debugging/Analysis Function
-- ============================================================================

-- analyze_content_formats()
-- Purpose: Development tool to analyze content format distribution
-- Status: Not used in application code
-- Used by: Manual debugging only
-- Risk: LOW - Can be recreated if needed for debugging

DROP FUNCTION IF EXISTS public.analyze_content_formats();

-- ============================================================================
-- POST-MIGRATION VERIFICATION
-- ============================================================================

-- After running this migration, verify functions were dropped:
-- SELECT count(*) FROM pg_proc p
-- JOIN pg_namespace n ON p.pronamespace = n.oid
-- WHERE n.nspname = 'public'
-- AND p.proname IN ('migrate_email_updates', 'analyze_content_formats');
-- Expected: 0

-- Check remaining function count:
-- SELECT count(*) as total_functions
-- FROM pg_proc p
-- JOIN pg_namespace n ON p.pronamespace = n.oid
-- WHERE n.nspname = 'public'
-- AND pg_get_function_identity_arguments(p.oid) NOT LIKE '%pg_trgm%';
-- Expected: ~53 functions (down from 55)

-- ============================================================================
-- ROLLBACK INSTRUCTIONS
-- ============================================================================

-- If you need to restore these functions, the original definitions are:

/*
-- migrate_email_updates()
CREATE OR REPLACE FUNCTION public.migrate_email_updates()
RETURNS integer
LANGUAGE plpgsql
AS $function$
  DECLARE
    update_record RECORD;
    subject_part TEXT;
    content_part TEXT;
    subject_end INTEGER;
    migrated_count INTEGER := 0;
  BEGIN
    FOR update_record IN
      SELECT id, content
      FROM updates
      WHERE content LIKE '%' || E'\\n\\n' || '%'
        AND subject IS NULL
        AND content_format = 'plain'
    LOOP
      subject_end := position(E'\\n\\n' in update_record.content);
      IF subject_end > 0 AND subject_end < 200 THEN
        subject_part := trim(substring(update_record.content from 1 for subject_end - 1));
        content_part := trim(substring(update_record.content from subject_end + 2));
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
$function$;

-- analyze_content_formats()
CREATE OR REPLACE FUNCTION public.analyze_content_formats()
RETURNS TABLE(content_format text, count bigint, avg_content_length numeric, has_subject_count bigint, has_rich_content_count bigint)
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
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
$function$;
*/

-- ============================================================================
-- NOTES
-- ============================================================================

-- 1. These functions are confirmed unused through comprehensive analysis:
--    - Not called in application code
--    - Not used by triggers
--    - Not used in RLS policies
--    - Not used in views
--    - Not called by other functions

-- 2. migrate_email_updates was a one-time migration function
--    - The migration has already been completed
--    - No data will be affected by dropping this function

-- 3. analyze_content_formats was a development/debugging tool
--    - Used for manual analysis during development
--    - Can be recreated if needed for future debugging
--    - Not required for production operation

-- 4. If you need to analyze content formats in the future, you can run:
--    SELECT
--      COALESCE(content_format, 'unknown') as format,
--      COUNT(*) as count,
--      AVG(LENGTH(content)) as avg_length
--    FROM memories
--    GROUP BY content_format;

-- ============================================================================
-- AUDIT TRAIL
-- ============================================================================

-- Migration created as part of comprehensive backend audit
-- See FUNCTION-DEPENDENCY-ANALYSIS.md for full analysis
-- Total functions analyzed: 89 (55 user-defined, 34 pg_trgm extension)
-- Functions in use: 53
-- Functions dropped: 2
-- Functions needing review: 5 (kept for safety)

-- End of migration
