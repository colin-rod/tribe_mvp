-- =====================================================
-- Supabase Backend Audit SQL Queries
-- =====================================================
-- Run these queries in the Supabase SQL Editor to audit your backend
-- Copy the results to analyze what can be deprecated

-- =====================================================
-- 1. ALL TABLES WITH RLS STATUS AND ROW COUNTS
-- =====================================================
SELECT
  schemaname as schema,
  tablename as table_name,
  CASE WHEN rowsecurity THEN '✅ ENABLED' ELSE '❌ DISABLED' END as rls_status,
  obj_description((schemaname||'.'||tablename)::regclass, 'pg_class') as description
FROM pg_tables
WHERE schemaname NOT IN ('pg_catalog', 'information_schema', 'auth', 'extensions', 'graphql', 'graphql_public', 'pgbouncer', 'pgsodium', 'pgsodium_masks', 'realtime', 'storage', 'supabase_functions', 'supabase_migrations', 'vault')
ORDER BY schemaname, tablename;

-- =====================================================
-- 2. ALL COLUMNS FOR EACH TABLE
-- =====================================================
SELECT
  c.table_schema as schema,
  c.table_name,
  c.column_name,
  c.data_type,
  c.is_nullable,
  c.column_default as default_value,
  CASE WHEN pk.column_name IS NOT NULL THEN '✓' ELSE '' END as is_pk,
  CASE WHEN fk.column_name IS NOT NULL THEN '✓' ELSE '' END as is_fk,
  pgd.description as column_description
FROM information_schema.columns c
LEFT JOIN (
  SELECT ku.table_schema, ku.table_name, ku.column_name
  FROM information_schema.table_constraints tc
  JOIN information_schema.key_column_usage ku
    ON tc.constraint_name = ku.constraint_name
    AND tc.table_schema = ku.table_schema
  WHERE tc.constraint_type = 'PRIMARY KEY'
) pk ON c.table_schema = pk.table_schema
  AND c.table_name = pk.table_name
  AND c.column_name = pk.column_name
LEFT JOIN (
  SELECT ku.table_schema, ku.table_name, ku.column_name
  FROM information_schema.table_constraints tc
  JOIN information_schema.key_column_usage ku
    ON tc.constraint_name = ku.constraint_name
    AND tc.table_schema = ku.table_schema
  WHERE tc.constraint_type = 'FOREIGN KEY'
) fk ON c.table_schema = fk.table_schema
  AND c.table_name = fk.table_name
  AND c.column_name = fk.column_name
LEFT JOIN pg_catalog.pg_statio_all_tables st
  ON c.table_schema = st.schemaname
  AND c.table_name = st.relname
LEFT JOIN pg_catalog.pg_description pgd
  ON pgd.objoid = st.relid
  AND pgd.objsubid = c.ordinal_position
WHERE c.table_schema NOT IN ('pg_catalog', 'information_schema', 'auth', 'extensions', 'graphql', 'graphql_public', 'pgbouncer', 'pgsodium', 'pgsodium_masks', 'realtime', 'storage', 'supabase_functions', 'supabase_migrations', 'vault')
ORDER BY c.table_schema, c.table_name, c.ordinal_position;

-- =====================================================
-- 3. ALL RLS POLICIES
-- =====================================================
SELECT
  schemaname as schema,
  tablename as table_name,
  policyname as policy_name,
  permissive as permissive_type,
  cmd as command,
  roles,
  qual as using_expression,
  with_check as check_expression
FROM pg_policies
WHERE schemaname NOT IN ('pg_catalog', 'information_schema')
ORDER BY schemaname, tablename, policyname;

-- =====================================================
-- 4. TABLES WITH RLS ENABLED BUT NO POLICIES (Potential Issue)
-- =====================================================
SELECT
  t.schemaname as schema,
  t.tablename as table_name,
  '⚠️ RLS enabled but no policies!' as warning
FROM pg_tables t
WHERE t.rowsecurity = true
  AND t.schemaname NOT IN ('pg_catalog', 'information_schema', 'auth', 'extensions', 'graphql', 'graphql_public', 'pgbouncer', 'pgsodium', 'pgsodium_masks', 'realtime', 'storage', 'supabase_functions', 'supabase_migrations', 'vault')
  AND NOT EXISTS (
    SELECT 1
    FROM pg_policies p
    WHERE p.schemaname = t.schemaname
      AND p.tablename = t.tablename
  )
ORDER BY t.schemaname, t.tablename;

-- =====================================================
-- 5. TABLES WITHOUT RLS ENABLED (Potential Security Issue)
-- =====================================================
SELECT
  schemaname as schema,
  tablename as table_name,
  '⚠️ RLS not enabled!' as warning
FROM pg_tables
WHERE rowsecurity = false
  AND schemaname NOT IN ('pg_catalog', 'information_schema', 'auth', 'extensions', 'graphql', 'graphql_public', 'pgbouncer', 'pgsodium', 'pgsodium_masks', 'realtime', 'storage', 'supabase_functions', 'supabase_migrations', 'vault')
ORDER BY schemaname, tablename;

-- =====================================================
-- 6. ALL DATABASE FUNCTIONS
-- =====================================================
SELECT
  n.nspname as schema,
  p.proname as function_name,
  pg_get_function_result(p.oid) as return_type,
  l.lanname as language,
  pg_get_function_arguments(p.oid) as arguments,
  CASE WHEN p.prosecdef THEN '✅ YES' ELSE '❌ NO' END as security_definer,
  obj_description(p.oid, 'pg_proc') as description
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
JOIN pg_language l ON p.prolang = l.oid
WHERE n.nspname NOT IN ('pg_catalog', 'information_schema', 'auth', 'extensions', 'graphql', 'graphql_public', 'pgbouncer', 'pgsodium', 'pgsodium_masks', 'realtime', 'storage', 'supabase_functions', 'vault')
  AND p.prokind = 'f'
ORDER BY n.nspname, p.proname;

-- =====================================================
-- 7. SECURITY DEFINER FUNCTIONS (Review Carefully)
-- =====================================================
SELECT
  n.nspname as schema,
  p.proname as function_name,
  pg_get_function_result(p.oid) as return_type,
  pg_get_function_arguments(p.oid) as arguments,
  '⚠️ SECURITY DEFINER - Review carefully!' as warning
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname NOT IN ('pg_catalog', 'information_schema', 'auth', 'extensions', 'graphql', 'graphql_public', 'pgbouncer', 'pgsodium', 'pgsodium_masks', 'realtime', 'storage', 'supabase_functions', 'vault')
  AND p.prokind = 'f'
  AND p.prosecdef = true
ORDER BY n.nspname, p.proname;

-- =====================================================
-- 8. ALL TRIGGERS
-- =====================================================
SELECT
  trigger_schema as schema,
  event_object_table as table_name,
  trigger_name,
  string_agg(event_manipulation, ', ') as events,
  action_timing as timing,
  action_statement as function_call
FROM information_schema.triggers
WHERE trigger_schema NOT IN ('pg_catalog', 'information_schema')
GROUP BY trigger_schema, event_object_table, trigger_name, action_timing, action_statement
ORDER BY trigger_schema, event_object_table, trigger_name;

-- =====================================================
-- 9. ALL VIEWS
-- =====================================================
SELECT
  schemaname as schema,
  viewname as view_name,
  definition
FROM pg_views
WHERE schemaname NOT IN ('pg_catalog', 'information_schema', 'auth', 'extensions', 'graphql', 'graphql_public', 'pgbouncer', 'pgsodium', 'pgsodium_masks', 'realtime', 'storage', 'supabase_functions', 'supabase_migrations', 'vault')
ORDER BY schemaname, viewname;

-- =====================================================
-- 10. ALL INDEXES
-- =====================================================
SELECT
  schemaname as schema,
  tablename as table_name,
  indexname as index_name,
  indexdef as definition
FROM pg_indexes
WHERE schemaname NOT IN ('pg_catalog', 'information_schema', 'auth', 'extensions', 'graphql', 'graphql_public', 'pgbouncer', 'pgsodium', 'pgsodium_masks', 'realtime', 'storage', 'supabase_functions', 'supabase_migrations', 'vault')
ORDER BY schemaname, tablename, indexname;

-- =====================================================
-- 11. ALL ENUM TYPES
-- =====================================================
SELECT
  n.nspname as schema,
  t.typname as enum_name,
  array_agg(e.enumlabel ORDER BY e.enumsortorder) as values
FROM pg_type t
JOIN pg_enum e ON t.oid = e.enumtypid
JOIN pg_namespace n ON t.typnamespace = n.oid
WHERE n.nspname NOT IN ('pg_catalog', 'information_schema')
GROUP BY n.nspname, t.typname
ORDER BY n.nspname, t.typname;

-- =====================================================
-- 12. ALL FOREIGN KEY CONSTRAINTS
-- =====================================================
SELECT
  tc.table_schema as schema,
  tc.table_name,
  tc.constraint_name,
  string_agg(kcu.column_name, ', ') as columns,
  ccu.table_name as references_table,
  string_agg(ccu.column_name, ', ') as references_columns,
  rc.delete_rule as on_delete,
  rc.update_rule as on_update
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
JOIN information_schema.referential_constraints rc
  ON tc.constraint_name = rc.constraint_name
  AND tc.table_schema = rc.constraint_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_schema NOT IN ('pg_catalog', 'information_schema')
GROUP BY tc.table_schema, tc.table_name, tc.constraint_name, ccu.table_name, rc.delete_rule, rc.update_rule
ORDER BY tc.table_schema, tc.table_name;

-- =====================================================
-- 13. STORAGE BUCKETS
-- =====================================================
SELECT
  id as bucket_id,
  name as bucket_name,
  CASE WHEN public THEN '✅ PUBLIC' ELSE '❌ PRIVATE' END as public_access,
  file_size_limit,
  allowed_mime_types,
  created_at
FROM storage.buckets
ORDER BY name;

-- =====================================================
-- 14. STORAGE RLS POLICIES
-- =====================================================
SELECT
  bucket_id,
  name as policy_name,
  definition
FROM storage.policies
ORDER BY bucket_id, name;

-- =====================================================
-- 15. UNUSED INDEXES (Performance Analysis)
-- =====================================================
-- Indexes that are never used (can potentially be dropped)
SELECT
  schemaname as schema,
  tablename as table_name,
  indexname as index_name,
  idx_scan as times_used,
  pg_size_pretty(pg_relation_size(indexrelid)) as index_size,
  '⚠️ Never used - consider dropping' as warning
FROM pg_stat_user_indexes
WHERE idx_scan = 0
  AND schemaname NOT IN ('pg_catalog', 'information_schema')
  AND indexrelname NOT LIKE '%_pkey'
ORDER BY pg_relation_size(indexrelid) DESC;

-- =====================================================
-- 16. TABLE SIZES AND ROW COUNTS
-- =====================================================
SELECT
  schemaname as schema,
  tablename as table_name,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as total_size,
  pg_size_pretty(pg_relation_size(schemaname||'.'||tablename)) as table_size,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename) - pg_relation_size(schemaname||'.'||tablename)) as indexes_size,
  (SELECT count(*) FROM information_schema.columns WHERE table_schema = schemaname AND table_name = tablename) as column_count
FROM pg_tables
WHERE schemaname NOT IN ('pg_catalog', 'information_schema', 'auth', 'extensions', 'graphql', 'graphql_public', 'pgbouncer', 'pgsodium', 'pgsodium_masks', 'realtime', 'storage', 'supabase_functions', 'supabase_migrations', 'vault')
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- =====================================================
-- 17. DUPLICATE INDEXES (Potential Redundancy)
-- =====================================================
-- Find indexes that might be redundant
SELECT
  i1.schemaname as schema,
  i1.tablename as table_name,
  i1.indexname as index1,
  i2.indexname as index2,
  '⚠️ Potentially duplicate indexes' as warning
FROM pg_indexes i1
JOIN pg_indexes i2
  ON i1.schemaname = i2.schemaname
  AND i1.tablename = i2.tablename
  AND i1.indexname < i2.indexname
  AND i1.indexdef = i2.indexdef
WHERE i1.schemaname NOT IN ('pg_catalog', 'information_schema')
ORDER BY i1.schemaname, i1.tablename;

-- =====================================================
-- 18. COLUMNS THAT MIGHT BE UNUSED (NULL Analysis)
-- =====================================================
-- This is a template - you'll need to run for each table
-- SELECT 'table_name', 'column_name', COUNT(*) as total_rows, COUNT(column_name) as non_null_rows
-- FROM schema.table_name
-- GROUP BY ...;

-- =====================================================
-- 19. AUTHENTICATION OBJECTS
-- =====================================================
SELECT
  schemaname as schema,
  tablename as table_name,
  'auth schema' as type
FROM pg_tables
WHERE schemaname = 'auth'
ORDER BY tablename;

-- =====================================================
-- 20. EXTENSIONS
-- =====================================================
SELECT
  extname as extension_name,
  extversion as version,
  nspname as schema
FROM pg_extension
JOIN pg_namespace ON pg_extension.extnamespace = pg_namespace.oid
ORDER BY extname;

-- =====================================================
-- SUMMARY QUERY
-- =====================================================
SELECT
  'Tables' as object_type,
  count(*)::text as count
FROM pg_tables
WHERE schemaname NOT IN ('pg_catalog', 'information_schema', 'auth', 'extensions', 'graphql', 'graphql_public', 'pgbouncer', 'pgsodium', 'pgsodium_masks', 'realtime', 'storage', 'supabase_functions', 'supabase_migrations', 'vault')

UNION ALL

SELECT
  'RLS Policies',
  count(*)::text
FROM pg_policies
WHERE schemaname NOT IN ('pg_catalog', 'information_schema')

UNION ALL

SELECT
  'Functions',
  count(*)::text
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname NOT IN ('pg_catalog', 'information_schema', 'auth', 'extensions', 'graphql', 'graphql_public', 'pgbouncer', 'pgsodium', 'pgsodium_masks', 'realtime', 'storage', 'supabase_functions', 'vault')
  AND p.prokind = 'f'

UNION ALL

SELECT
  'Triggers',
  count(DISTINCT trigger_name)::text
FROM information_schema.triggers
WHERE trigger_schema NOT IN ('pg_catalog', 'information_schema')

UNION ALL

SELECT
  'Views',
  count(*)::text
FROM pg_views
WHERE schemaname NOT IN ('pg_catalog', 'information_schema', 'auth', 'extensions', 'graphql', 'graphql_public', 'pgbouncer', 'pgsodium', 'pgsodium_masks', 'realtime', 'storage', 'supabase_functions', 'supabase_migrations', 'vault')

UNION ALL

SELECT
  'Indexes',
  count(*)::text
FROM pg_indexes
WHERE schemaname NOT IN ('pg_catalog', 'information_schema', 'auth', 'extensions', 'graphql', 'graphql_public', 'pgbouncer', 'pgsodium', 'pgsodium_masks', 'realtime', 'storage', 'supabase_functions', 'supabase_migrations', 'vault')

UNION ALL

SELECT
  'Enums',
  count(DISTINCT t.typname)::text
FROM pg_type t
JOIN pg_namespace n ON t.typnamespace = n.oid
WHERE n.nspname NOT IN ('pg_catalog', 'information_schema')
  AND EXISTS (SELECT 1 FROM pg_enum e WHERE e.enumtypid = t.oid)

UNION ALL

SELECT
  'Storage Buckets',
  count(*)::text
FROM storage.buckets;
