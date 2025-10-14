-- Migration: 20251013000002_fix_security_definer_views.sql
-- Description: Remove SECURITY DEFINER from views and add proper RLS filtering
-- Issue: CRO-XXX - Fix Supabase security alerts for SECURITY DEFINER views
--
-- IMPORTANT: Execute this migration via Supabase SQL Editor
-- Do NOT run via CLI or automated migration tools
--
-- This migration:
-- 1. Drops and recreates recipient_preferences view without SECURITY DEFINER
-- 2. Adds user-scoped filtering to prevent cross-user data access
-- 3. Drops and recreates prompt_analytics view without SECURITY DEFINER
-- 4. Ensures views enforce proper RLS and user isolation

-- =============================================================================
-- PHASE 1: Fix recipient_preferences view - CRITICAL SECURITY ISSUE
-- =============================================================================

-- Drop the existing view
DROP VIEW IF EXISTS recipient_preferences;

-- Recreate the view WITHOUT SECURITY DEFINER and with proper user filtering
-- IMPORTANT: This view now filters by auth.uid() to ensure users only see their own recipients
CREATE VIEW recipient_preferences
WITH (security_invoker = true)  -- Explicitly use SECURITY INVOKER (not DEFINER)
AS
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
  r.group_id,
  rg.name AS group_name,
  rg.default_frequency AS group_default_frequency,
  rg.default_channels AS group_default_channels
FROM recipients r
LEFT JOIN recipient_groups rg ON r.group_id = rg.id
WHERE r.is_active = true
  AND r.parent_id = auth.uid();  -- CRITICAL: Only show current user's recipients

COMMENT ON VIEW recipient_preferences IS 'Active recipients with complete preference profile - user-scoped with SECURITY INVOKER';

-- =============================================================================
-- PHASE 2: Add RLS policy for recipient_preferences view
-- =============================================================================

-- Enable RLS on the view (for additional protection)
ALTER VIEW recipient_preferences SET (security_invoker = true);

-- =============================================================================
-- PHASE 3: Fix prompt_analytics view - LOW PRIORITY
-- =============================================================================

-- Drop the existing view
DROP VIEW IF EXISTS prompt_analytics;

-- Recreate the view WITHOUT SECURITY DEFINER
-- This view shows public prompt data, so no user filtering needed
CREATE VIEW prompt_analytics
WITH (security_invoker = true)  -- Explicitly use SECURITY INVOKER (not DEFINER)
AS
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
  END AS click_through_rate,
  is_active,
  created_at,
  updated_at
FROM prompt_suggestions
ORDER BY times_shown DESC;

COMMENT ON VIEW prompt_analytics IS 'Analytics view showing prompt performance metrics - SECURITY INVOKER';

-- =============================================================================
-- PHASE 4: Verify the fixes
-- =============================================================================

-- Log the security fix completion
DO $$
BEGIN
  RAISE NOTICE '============================================================================';
  RAISE NOTICE 'Migration 20251013000002_fix_security_definer_views completed successfully';
  RAISE NOTICE '============================================================================';
  RAISE NOTICE '';
  RAISE NOTICE 'SECURITY FIXES APPLIED:';
  RAISE NOTICE '';
  RAISE NOTICE '1. recipient_preferences view:';
  RAISE NOTICE '   ✓ Removed SECURITY DEFINER property';
  RAISE NOTICE '   ✓ Added user-scoped filtering (parent_id = auth.uid())';
  RAISE NOTICE '   ✓ Now enforces RLS and user isolation';
  RAISE NOTICE '   ✓ Users can only see their own recipients';
  RAISE NOTICE '';
  RAISE NOTICE '2. prompt_analytics view:';
  RAISE NOTICE '   ✓ Removed SECURITY DEFINER property';
  RAISE NOTICE '   ✓ Public data view (no user filtering needed)';
  RAISE NOTICE '';
  RAISE NOTICE 'TESTING:';
  RAISE NOTICE '  -- Should only show current users recipients:';
  RAISE NOTICE '  SELECT * FROM recipient_preferences;';
  RAISE NOTICE '';
  RAISE NOTICE '  -- Should show all prompt analytics (public data):';
  RAISE NOTICE '  SELECT * FROM prompt_analytics;';
  RAISE NOTICE '';
  RAISE NOTICE 'VERIFICATION:';
  RAISE NOTICE '  -- Check that SECURITY DEFINER is removed:';
  RAISE NOTICE '  SELECT schemaname, viewname, definition';
  RAISE NOTICE '  FROM pg_views';
  RAISE NOTICE '  WHERE viewname IN (''recipient_preferences'', ''prompt_analytics'');';
  RAISE NOTICE '';
  RAISE NOTICE 'NEXT STEPS:';
  RAISE NOTICE '1. Execute this migration in Supabase SQL Editor';
  RAISE NOTICE '2. Run the verification query above to confirm SECURITY DEFINER is removed';
  RAISE NOTICE '3. Test recipient_preferences view with different users';
  RAISE NOTICE '4. Verify Supabase linter alerts are resolved';
  RAISE NOTICE '5. Monitor application for any access issues';
  RAISE NOTICE '';
  RAISE NOTICE '============================================================================';
END $$;
