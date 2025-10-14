-- Supabase Backend Audit Queries
-- Generated: 2025-10-14T08:27:15.381Z
-- Run these queries in Supabase SQL Editor

-- 1. All Tables
SELECT
  schemaname as schema,
  tablename as table_name,
  CASE WHEN rowsecurity THEN '✅ ENABLED' ELSE '❌ DISABLED' END as rls_status
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;;

-- 2. All Columns
SELECT
  table_name,
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
ORDER BY table_name, ordinal_position;;

-- 3. All RLS Policies
SELECT
  tablename as table_name,
  policyname as policy_name,
  cmd as command,
  roles,
  qual as using_expression
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;;

-- 4. All Functions
SELECT
  n.nspname as schema,
  p.proname as function_name,
  pg_get_function_result(p.oid) as return_type,
  l.lanname as language
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
JOIN pg_language l ON p.prolang = l.oid
WHERE n.nspname = 'public'
ORDER BY p.proname;;

-- 5. All Triggers
SELECT
  event_object_table as table_name,
  trigger_name,
  string_agg(event_manipulation, ', ') as events,
  action_timing as timing
FROM information_schema.triggers
WHERE trigger_schema = 'public'
GROUP BY event_object_table, trigger_name, action_timing
ORDER BY event_object_table, trigger_name;;

-- 6. All Views
SELECT
  viewname as view_name
FROM pg_views
WHERE schemaname = 'public'
ORDER BY viewname;;

-- 7. All Indexes
SELECT
  tablename as table_name,
  indexname as index_name,
  indexdef as definition
FROM pg_indexes
WHERE schemaname = 'public'
ORDER BY tablename, indexname;;

-- 8. Storage Buckets
SELECT
  id,
  name,
  CASE WHEN public THEN '✅ PUBLIC' ELSE '❌ PRIVATE' END as access
FROM storage.buckets
ORDER BY name;;

-- 9. Foreign Keys
SELECT
  tc.table_name,
  kcu.column_name,
  ccu.table_name as references_table,
  ccu.column_name as references_column
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_schema = 'public'
ORDER BY tc.table_name;;

-- 10. Enums
SELECT
  t.typname as enum_name,
  array_agg(e.enumlabel ORDER BY e.enumsortorder) as values
FROM pg_type t
JOIN pg_enum e ON t.oid = e.enumtypid
JOIN pg_namespace n ON t.typnamespace = n.oid
WHERE n.nspname = 'public'
GROUP BY t.typname
ORDER BY t.typname;;

