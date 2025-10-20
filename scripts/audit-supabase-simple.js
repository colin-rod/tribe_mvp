#!/usr/bin/env node
/**
 * Simple Supabase Backend Audit Script
 *
 * This script connects to your Supabase database and extracts all objects
 * for auditing purposes. Run the SQL queries via the Supabase SQL Editor.
 *
 * Usage:
 *   node scripts/audit-supabase-simple.js
 *
 * This script will generate SQL queries you can run in Supabase SQL Editor
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 Supabase Backend Audit Tool\n');
console.log('This tool generates SQL queries to audit your Supabase backend.');
console.log('Copy and run these queries in the Supabase SQL Editor.\n');

const queries = {
  '1. All Tables': `
SELECT
  schemaname as schema,
  tablename as table_name,
  CASE WHEN rowsecurity THEN '✅ ENABLED' ELSE '❌ DISABLED' END as rls_status
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;`,

  '2. All Columns': `
SELECT
  table_name,
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
ORDER BY table_name, ordinal_position;`,

  '3. All RLS Policies': `
SELECT
  tablename as table_name,
  policyname as policy_name,
  cmd as command,
  roles,
  qual as using_expression
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;`,

  '4. All Functions': `
SELECT
  n.nspname as schema,
  p.proname as function_name,
  pg_get_function_result(p.oid) as return_type,
  l.lanname as language
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
JOIN pg_language l ON p.prolang = l.oid
WHERE n.nspname = 'public'
ORDER BY p.proname;`,

  '5. All Triggers': `
SELECT
  event_object_table as table_name,
  trigger_name,
  string_agg(event_manipulation, ', ') as events,
  action_timing as timing
FROM information_schema.triggers
WHERE trigger_schema = 'public'
GROUP BY event_object_table, trigger_name, action_timing
ORDER BY event_object_table, trigger_name;`,

  '6. All Views': `
SELECT
  viewname as view_name
FROM pg_views
WHERE schemaname = 'public'
ORDER BY viewname;`,

  '7. All Indexes': `
SELECT
  tablename as table_name,
  indexname as index_name,
  indexdef as definition
FROM pg_indexes
WHERE schemaname = 'public'
ORDER BY tablename, indexname;`,

  '8. Storage Buckets': `
SELECT
  id,
  name,
  CASE WHEN public THEN '✅ PUBLIC' ELSE '❌ PRIVATE' END as access
FROM storage.buckets
ORDER BY name;`,

  '9. Foreign Keys': `
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
ORDER BY tc.table_name;`,

  '10. Enums': `
SELECT
  t.typname as enum_name,
  array_agg(e.enumlabel ORDER BY e.enumsortorder) as values
FROM pg_type t
JOIN pg_enum e ON t.oid = e.enumtypid
JOIN pg_namespace n ON t.typnamespace = n.oid
WHERE n.nspname = 'public'
GROUP BY t.typname
ORDER BY t.typname;`
};

// Generate markdown report
let markdown = '# Supabase Backend Audit Queries\n\n';
markdown += `**Generated:** ${new Date().toLocaleString()}\n\n`;
markdown += '## Instructions\n\n';
markdown += '1. Open your Supabase project dashboard\n';
markdown += '2. Go to SQL Editor\n';
markdown += '3. Copy and paste each query below\n';
markdown += '4. Run the query and export/save the results\n';
markdown += '5. Review the results to identify unused objects\n\n';
markdown += '---\n\n';

for (const [title, query] of Object.entries(queries)) {
  markdown += `## ${title}\n\n`;
  markdown += '```sql\n';
  markdown += query.trim();
  markdown += '\n```\n\n';
}

// Add analysis section
markdown += '## Analysis Tips\n\n';
markdown += '### Finding Unused Tables\n';
markdown += '- Look for tables with 0 rows or very few rows\n';
markdown += '- Check if tables are referenced in your application code\n';
markdown += '- Review migration history to understand table purpose\n\n';

markdown += '### Finding Unused Columns\n';
markdown += '- Look for columns that are always NULL\n';
markdown += '- Check if columns are used in queries or application code\n';
markdown += '- Review created_at timestamps to see when columns were added\n\n';

markdown += '### Finding Unused Functions\n';
markdown += '- Check if functions are called from RLS policies\n';
markdown += '- Check if functions are called from triggers\n';
markdown += '- Search your application code for function calls\n\n';

markdown += '### Finding Unused Policies\n';
markdown += '- Review policy expressions to understand their purpose\n';
markdown += '- Check if policies are too permissive or too restrictive\n';
markdown += '- Test policy effectiveness with different user roles\n\n';

markdown += '### Security Review\n';
markdown += '- **Tables without RLS**: These tables are accessible to anyone!\n';
markdown += '- **RLS enabled but no policies**: These tables are inaccessible to everyone!\n';
markdown += '- **SECURITY DEFINER functions**: Review these carefully - they run with elevated privileges\n';
markdown += '- **Public storage buckets**: Ensure files in public buckets don\'t contain sensitive data\n\n';

markdown += '## Next Steps\n\n';
markdown += '1. Export all query results to CSV or JSON\n';
markdown += '2. Create a spreadsheet to track objects and their usage\n';
markdown += '3. Mark objects as "Used", "Unused", or "Unknown"\n';
markdown += '4. For "Unknown" objects, search your codebase\n';
markdown += '5. Create a deprecation plan for unused objects\n';
markdown += '6. Test thoroughly before dropping any objects\n\n';

// Save the markdown file
const outputPath = path.join(process.cwd(), 'supabase-audit-queries.md');
fs.writeFileSync(outputPath, markdown);

console.log('✅ Audit queries generated!\n');
console.log(`📄 File saved to: ${outputPath}\n`);
console.log('📋 Next steps:');
console.log('   1. Open Supabase Dashboard → SQL Editor');
console.log('   2. Copy queries from the generated file');
console.log('   3. Run each query and review results');
console.log('   4. Export results for analysis\n');

// Also save as a single SQL file
const sqlPath = path.join(process.cwd(), 'supabase-audit-queries.sql');
let sqlContent = '-- Supabase Backend Audit Queries\n';
sqlContent += `-- Generated: ${new Date().toISOString()}\n`;
sqlContent += '-- Run these queries in Supabase SQL Editor\n\n';

for (const [title, query] of Object.entries(queries)) {
  sqlContent += `-- ${title}\n`;
  sqlContent += query.trim() + ';\n\n';
}

fs.writeFileSync(sqlPath, sqlContent);
console.log(`📄 SQL file saved to: ${sqlPath}\n`);

// Check if we have the full audit SQL file
const fullAuditPath = path.join(__dirname, 'audit-supabase-sql.sql');
if (fs.existsSync(fullAuditPath)) {
  console.log(`📄 Comprehensive audit SQL available at: ${fullAuditPath}`);
  console.log('   This file contains 20+ detailed queries for thorough analysis\n');
}
