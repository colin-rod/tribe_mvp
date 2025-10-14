-- Script to Analyze Database Function Dependencies
-- Run this in Supabase SQL Editor to identify truly unused functions

-- ============================================================================
-- SECTION 1: Get All Triggers and Their Functions
-- ============================================================================
SELECT
  'TRIGGER' as dependency_type,
  t.trigger_name,
  t.event_object_table as table_name,
  t.action_statement as function_reference,
  string_agg(t.event_manipulation, ', ') as events
FROM information_schema.triggers t
WHERE t.trigger_schema = 'public'
GROUP BY t.trigger_name, t.event_object_table, t.action_statement
ORDER BY t.event_object_table, t.trigger_name;

-- ============================================================================
-- SECTION 2: Get All RLS Policies and Extract Function References
-- ============================================================================
SELECT
  'RLS_POLICY' as dependency_type,
  tablename,
  policyname,
  cmd as command,
  qual as using_expression,
  with_check as with_check_expression
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- ============================================================================
-- SECTION 3: Get All Views and Their Definitions
-- ============================================================================
SELECT
  'VIEW' as dependency_type,
  viewname as view_name,
  definition
FROM pg_views
WHERE schemaname = 'public'
ORDER BY viewname;

-- ============================================================================
-- SECTION 4: Get All Function Definitions (to find internal calls)
-- ============================================================================
SELECT
  p.proname as function_name,
  pg_get_function_result(p.oid) as return_type,
  l.lanname as language,
  pg_get_functiondef(p.oid) as full_definition
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
JOIN pg_language l ON p.prolang = l.oid
WHERE n.nspname = 'public'
  AND l.lanname != 'c' -- Exclude C extension functions (pg_trgm)
ORDER BY p.proname;

-- ============================================================================
-- SECTION 5: Find Functions Called by Other Functions
-- ============================================================================
-- This requires parsing the function definitions (done client-side)
-- Export the results from SECTION 4 and analyze with the Node.js script

-- ============================================================================
-- SECTION 6: Summary - Count Dependencies
-- ============================================================================
SELECT 'Total Functions' as metric, count(*)::text as value
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'

UNION ALL

SELECT 'Total Triggers', count(*)::text
FROM information_schema.triggers
WHERE trigger_schema = 'public'

UNION ALL

SELECT 'Total RLS Policies', count(*)::text
FROM pg_policies
WHERE schemaname = 'public'

UNION ALL

SELECT 'Total Views', count(*)::text
FROM pg_views
WHERE schemaname = 'public';

-- ============================================================================
-- INSTRUCTIONS
-- ============================================================================
-- 1. Run each section separately in Supabase SQL Editor
-- 2. Export results as JSON or CSV
-- 3. Analyze function definitions to find internal function calls
-- 4. Cross-reference with application code (already done)
-- 5. Build dependency graph to identify orphaned functions
