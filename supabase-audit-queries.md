# Supabase Backend Audit Queries

**Generated:** 10/14/2025, 10:27:15 AM

## Instructions

1. Open your Supabase project dashboard
2. Go to SQL Editor
3. Copy and paste each query below
4. Run the query and export/save the results
5. Review the results to identify unused objects

---

## 1. All Tables

```sql
SELECT
  schemaname as schema,
  tablename as table_name,
  CASE WHEN rowsecurity THEN '✅ ENABLED' ELSE '❌ DISABLED' END as rls_status
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;
```

## 2. All Columns

```sql
SELECT
  table_name,
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
ORDER BY table_name, ordinal_position;
```

## 3. All RLS Policies

```sql
SELECT
  tablename as table_name,
  policyname as policy_name,
  cmd as command,
  roles,
  qual as using_expression
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
```

## 4. All Functions

```sql
SELECT
  n.nspname as schema,
  p.proname as function_name,
  pg_get_function_result(p.oid) as return_type,
  l.lanname as language
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
JOIN pg_language l ON p.prolang = l.oid
WHERE n.nspname = 'public'
ORDER BY p.proname;
```

## 5. All Triggers

```sql
SELECT
  event_object_table as table_name,
  trigger_name,
  string_agg(event_manipulation, ', ') as events,
  action_timing as timing
FROM information_schema.triggers
WHERE trigger_schema = 'public'
GROUP BY event_object_table, trigger_name, action_timing
ORDER BY event_object_table, trigger_name;
```

## 6. All Views

```sql
SELECT
  viewname as view_name
FROM pg_views
WHERE schemaname = 'public'
ORDER BY viewname;
```

## 7. All Indexes

```sql
SELECT
  tablename as table_name,
  indexname as index_name,
  indexdef as definition
FROM pg_indexes
WHERE schemaname = 'public'
ORDER BY tablename, indexname;
```

## 8. Storage Buckets

```sql
SELECT
  id,
  name,
  CASE WHEN public THEN '✅ PUBLIC' ELSE '❌ PRIVATE' END as access
FROM storage.buckets
ORDER BY name;
```

## 9. Foreign Keys

```sql
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
ORDER BY tc.table_name;
```

## 10. Enums

```sql
SELECT
  t.typname as enum_name,
  array_agg(e.enumlabel ORDER BY e.enumsortorder) as values
FROM pg_type t
JOIN pg_enum e ON t.oid = e.enumtypid
JOIN pg_namespace n ON t.typnamespace = n.oid
WHERE n.nspname = 'public'
GROUP BY t.typname
ORDER BY t.typname;
```

## Analysis Tips

### Finding Unused Tables
- Look for tables with 0 rows or very few rows
- Check if tables are referenced in your application code
- Review migration history to understand table purpose

### Finding Unused Columns
- Look for columns that are always NULL
- Check if columns are used in queries or application code
- Review created_at timestamps to see when columns were added

### Finding Unused Functions
- Check if functions are called from RLS policies
- Check if functions are called from triggers
- Search your application code for function calls

### Finding Unused Policies
- Review policy expressions to understand their purpose
- Check if policies are too permissive or too restrictive
- Test policy effectiveness with different user roles

### Security Review
- **Tables without RLS**: These tables are accessible to anyone!
- **RLS enabled but no policies**: These tables are inaccessible to everyone!
- **SECURITY DEFINER functions**: Review these carefully - they run with elevated privileges
- **Public storage buckets**: Ensure files in public buckets don't contain sensitive data

## Next Steps

1. Export all query results to CSV or JSON
2. Create a spreadsheet to track objects and their usage
3. Mark objects as "Used", "Unused", or "Unknown"
4. For "Unknown" objects, search your codebase
5. Create a deprecation plan for unused objects
6. Test thoroughly before dropping any objects

