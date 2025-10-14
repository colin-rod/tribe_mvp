# Supabase Backend Audit Guide

This guide explains how to audit your Supabase backend to identify unused tables, columns, functions, policies, and other database objects that can be deprecated.

## Overview

The audit tools help you:
- Extract all database objects (tables, columns, functions, policies, etc.)
- Identify security issues (missing RLS, unused indexes, etc.)
- Find candidates for deprecation
- Generate comprehensive reports for analysis

## Available Tools

### 1. Simple Audit Script (Recommended for Quick Start)

**File:** `scripts/audit-supabase-simple.js`

Generates SQL queries you can run directly in Supabase SQL Editor.

```bash
node scripts/audit-supabase-simple.js
```

**Output:**
- `supabase-audit-queries.md` - Formatted guide with queries
- `supabase-audit-queries.sql` - All queries in one file

**Advantages:**
- No dependencies required
- Works immediately
- Easy to customize queries
- Run queries directly in Supabase UI

### 2. Comprehensive SQL Queries

**File:** `scripts/audit-supabase-sql.sql`

Contains 20+ detailed SQL queries for thorough analysis.

**Includes:**
- All tables, columns, and constraints
- RLS policies and security analysis
- Functions (including SECURITY DEFINER)
- Triggers, views, and indexes
- Storage buckets and policies
- Unused indexes detection
- Duplicate indexes detection
- Table sizes and row counts

**Usage:**
1. Open Supabase Dashboard → SQL Editor
2. Copy queries from the file
3. Run each section and export results
4. Save results for analysis

### 3. Advanced TypeScript Script (Future)

**File:** `scripts/audit-supabase-backend.ts`

Automated script that generates JSON and Markdown reports.

**Note:** Requires custom RPC function setup. Use the SQL queries above for immediate results.

## Step-by-Step Audit Process

### Step 1: Generate Audit Queries

```bash
# Generate the audit queries
node scripts/audit-supabase-simple.js
```

This creates:
- `supabase-audit-queries.md` - Documentation with queries
- `supabase-audit-queries.sql` - All queries ready to run

### Step 2: Run Queries in Supabase

1. Open your Supabase project dashboard
2. Navigate to: **SQL Editor** (left sidebar)
3. Open the generated `supabase-audit-queries.sql` file
4. Copy and run each query section
5. Export results (CSV or copy to spreadsheet)

### Step 3: Analyze Results

Create a spreadsheet with the following columns:
- **Object Type** (table, column, function, etc.)
- **Object Name**
- **Schema**
- **Status** (Used / Unused / Unknown)
- **Notes**
- **Action** (Keep / Deprecate / Remove)

### Step 4: Mark Usage Status

For each object, determine if it's used:

#### Tables
- Check application code for references
- Look at row counts (0 rows might indicate unused)
- Review recent migrations
- Check if referenced by foreign keys

#### Columns
- Search codebase for column references
- Check if always NULL
- Look at RLS policies that use the column
- Review functions that reference it

#### Functions
- Check if called from RLS policies
- Check if called from triggers
- Search application code
- Look for API endpoints that call the function

#### RLS Policies
- Review policy expressions
- Check associated roles
- Test with different user types
- Verify they're not overly permissive

#### Indexes
- Check "unused indexes" query results
- Look for indexes with 0 scans
- Review duplicate index warnings
- Keep primary key and foreign key indexes

### Step 5: Identify Candidates for Deprecation

Look for:

✅ **Safe to Deprecate:**
- Tables with 0 rows and no code references
- Columns always NULL with no code references
- Functions never called
- Unused indexes (not on PKs/FKs)
- Duplicate indexes

⚠️ **Review Carefully:**
- Old migration tables
- Backup/archive tables
- Audit log tables (might be used for compliance)
- Functions used in policies or triggers

❌ **Do Not Remove:**
- Tables with foreign key references
- Columns used in indexes
- Functions used in policies/triggers
- Primary key and foreign key constraints

### Step 6: Create Deprecation Plan

1. **Prioritize by Risk:**
   - Low risk: Unused indexes, duplicate indexes
   - Medium risk: Unused columns (can cause issues if code references them)
   - High risk: Tables, functions (breaking changes)

2. **Test in Staging:**
   - Create migration to drop objects
   - Test all application features
   - Run automated tests
   - Check for errors in logs

3. **Plan Rollback:**
   - Keep backup of dropped objects
   - Document what was removed
   - Have rollback migration ready

4. **Execute Gradually:**
   - Start with low-risk items (indexes)
   - Monitor for errors
   - Proceed to medium-risk items
   - Leave high-risk items for major versions

## Common Findings

### Security Issues

#### Tables without RLS
```sql
-- From audit results, look for:
-- rls_status: ❌ DISABLED
```
**Action:** Enable RLS and create appropriate policies

#### Tables with RLS but No Policies
```sql
-- RLS enabled but pg_policies returns no rows
```
**Action:** Add policies or disable RLS if not needed

#### SECURITY DEFINER Functions
```sql
-- Functions with security_definer: ✅ YES
```
**Action:** Review carefully - these run with elevated privileges

### Performance Issues

#### Unused Indexes
```sql
-- From query 15 in audit-supabase-sql.sql
-- Look for idx_scan = 0
```
**Action:** Consider dropping (saves storage and write performance)

#### Duplicate Indexes
```sql
-- From query 17 in audit-supabase-sql.sql
```
**Action:** Drop duplicates, keep one

#### Large Tables
```sql
-- From query 16 in audit-supabase-sql.sql
-- Check total_size column
```
**Action:** Consider archiving old data or partitioning

## Deprecation Migration Example

Once you've identified objects to remove:

```sql
-- migration: YYYYMMDDHHMMSS_deprecate_unused_objects.sql

-- Drop unused indexes
DROP INDEX IF EXISTS public.unused_index_name;

-- Drop unused columns (be very careful!)
ALTER TABLE public.table_name
DROP COLUMN IF EXISTS unused_column;

-- Drop unused functions
DROP FUNCTION IF EXISTS public.unused_function();

-- Drop unused tables (backup first!)
DROP TABLE IF EXISTS public.unused_table;

-- Document what was removed
COMMENT ON SCHEMA public IS 'Deprecated objects removed: unused_table, unused_function, ...';
```

## Best Practices

### Before Removing Anything

1. **Backup:** Always backup before dropping objects
2. **Search Code:** Grep entire codebase for references
3. **Check Migrations:** Review migration history
4. **Test:** Test thoroughly in staging
5. **Document:** Document what and why you're removing
6. **Announce:** Communicate changes to team

### Regular Audits

Schedule regular audits:
- **Monthly:** Quick review of new objects
- **Quarterly:** Comprehensive audit
- **Before Major Releases:** Full security and performance audit

### Documentation

Keep audit results:
```
docs/audits/
├── 2025-01-audit.md
├── 2025-04-audit.md
└── deprecation-log.md
```

## Troubleshooting

### Query Fails with Permission Error

Some queries require elevated permissions. Run as service role or database admin.

### Can't Determine if Object is Used

Mark as "Unknown" and investigate:
1. Search codebase thoroughly
2. Check git history for when it was added
3. Review issue/PR that added it
4. Ask team members
5. If in doubt, keep it (for now)

### False Positives

Some objects appear unused but are critical:
- Audit tables (written to by triggers)
- Archive tables (written to by scheduled jobs)
- Migration tables (for schema versioning)
- Extension tables (managed by extensions)

## Query Reference

### Quick Queries

```sql
-- Count all objects by type
SELECT 'Tables' as type, count(*) FROM pg_tables WHERE schemaname = 'public'
UNION ALL
SELECT 'Functions', count(*) FROM pg_proc p JOIN pg_namespace n ON p.pronamespace = n.oid WHERE n.nspname = 'public'
UNION ALL
SELECT 'Policies', count(*) FROM pg_policies WHERE schemaname = 'public';

-- Find tables with no data
SELECT schemaname, tablename
FROM pg_tables
WHERE schemaname = 'public'
  AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = pg_tables.schemaname
      AND table_name = pg_tables.tablename
    LIMIT 1
  );

-- Find columns that are always NULL (requires checking data)
-- Run this for each table to check
SELECT 'column_name' as column_name,
       COUNT(*) as total_rows,
       COUNT(column_name) as non_null_rows,
       COUNT(*) - COUNT(column_name) as null_rows
FROM public.your_table_name;
```

## Additional Resources

- [Supabase RLS Documentation](https://supabase.com/docs/guides/auth/row-level-security)
- [PostgreSQL System Catalogs](https://www.postgresql.org/docs/current/catalogs.html)
- [Database Security Best Practices](https://supabase.com/docs/guides/database/security)

## Support

If you need help with the audit:
1. Review the SQL queries in `scripts/audit-supabase-sql.sql`
2. Check Supabase documentation
3. Consult with database administrator
4. Test in staging before making changes
