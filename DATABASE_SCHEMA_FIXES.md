# Database Schema Migration Guide

## Overview
This document outlines the database schema mismatches between the codebase and the actual Supabase database schema. There are **233 TypeScript errors** in the `src/` directory due to these mismatches.

## Summary of Issues

### ✅ Fixed Issues
1. **Supabase Database Types** - Regenerated types from database
2. **Drag Event Handlers** - Fixed type mismatches in SmartContextualInput
3. **FormValidationContext** - Fixed variable declaration order
4. **NavigationContext** - Fixed route type mismatch
5. **Accessibility Module** - Fixed duplicate exports
6. **Update Type** - Made content field nullable
7. **Group Settings** - Removed references to non-existent columns (partial fix)

### ⚠️ Major Schema Mismatches

#### 1. Non-Existent Tables
The code references tables that don't exist in the database:

| Referenced Table | Actual Table | Impact |
|-----------------|--------------|--------|
| `group_memberships` | **DOES NOT EXIST** | Recipients link to groups via `group_id` column directly in `recipients` table |
| `child_updates` | **DOES NOT EXIST** | Use `delivery_jobs` or `updates` table instead |

#### 2. Non-Existent Columns

**`recipient_groups` table:**
- ❌ `notification_settings` - **DOES NOT EXIST**
- ❌ `access_settings` - **DOES NOT EXIST**
- ✅ `default_frequency` - EXISTS
- ✅ `default_channels` - EXISTS

**`recipients` table:**
- ❌ `group_preferences` - **DOES NOT EXIST**
- ❌ `last_seen_at` - **DOES NOT EXIST**
- ✅ `digest_preferences` - EXISTS (JSONB column)
- ✅ `frequency` - EXISTS
- ✅ `group_id` - EXISTS (links to recipient_groups)

**`children` table:**
- ❌ `title` - **DOES NOT EXIST**
- ❌ `status` - **DOES NOT EXIST**
- ❌ `is_active` - **DOES NOT EXIST**
- ❌ `group_id` - **DOES NOT EXIST**
- ❌ `recipient_id` - **DOES NOT EXIST**
- ❌ `delivery_method` - **DOES NOT EXIST**

**`profiles` table:**
- ❌ `title` - **DOES NOT EXIST**
- ❌ `status` - **DOES NOT EXIST**
- ❌ `group_id` - **DOES NOT EXIST**

**`updates` table:**
- ✅ `content` - EXISTS but should be **nullable** (fixed)
- ✅ `subject` - EXISTS but should be **nullable** (fixed)
- ❌ Many queries try to select columns that don't exist on joined tables

#### 3. Column Name Mismatches

| Code Uses | Actual Column | Table |
|-----------|---------------|-------|
| `notification_frequency` | `frequency` | `recipients` |
| `group_preferences` | `digest_preferences` | `recipients` |
| `last_seen_at` | **N/A** | `recipients` |

## Files with Most Errors

### Top 15 Files by Error Count:
1. **src/app/api/recipients/[token]/mute/route.ts** - 22 errors
2. **src/lib/updates.ts** - 21 errors (partially fixed)
3. **src/app/api/recipients/[token]/membership/route.ts** - 18 errors (partially fixed)
4. **src/lib/group-management.ts** - 16 errors
5. **src/lib/services/groupNotificationService.ts** - 12 errors
6. **src/lib/utils/update-formatting.ts** - 10 errors
7. **src/app/api/recipients/[token]/group-preferences/route.ts** - 10 errors
8. **src/lib/group-cache.ts** - 9 errors
9. **src/app/api/preferences/[token]/route.ts** - 9 errors
10. **src/app/api/notifications/group-delivery/route.ts** - 9 errors

## Recommended Fixes

### Option 1: Update Database Schema (Recommended)
Add the missing columns to match what the code expects:

```sql
-- Add columns to recipient_groups
ALTER TABLE recipient_groups
  ADD COLUMN notification_settings JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN access_settings JSONB DEFAULT '{}'::jsonb;

-- Add columns to recipients
ALTER TABLE recipients
  ADD COLUMN last_seen_at TIMESTAMP WITH TIME ZONE;

-- Create group_memberships table (if this architecture is desired)
CREATE TABLE group_memberships (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  recipient_id UUID NOT NULL REFERENCES recipients(id),
  group_id UUID NOT NULL REFERENCES recipient_groups(id),
  notification_frequency VARCHAR,
  preferred_channels VARCHAR[],
  content_types VARCHAR[],
  role VARCHAR,
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Option 2: Update Code to Match Schema
Systematically update all references:

1. **Replace table references:**
   - `group_memberships` → Query `recipients` with `group_id`
   - `child_updates` → Use `updates` or `delivery_jobs`

2. **Replace column references:**
   - `notification_settings` → Use `default_frequency` and `default_channels`
   - `group_preferences` → Use `digest_preferences`
   - `notification_frequency` → Use `frequency`

3. **Remove invalid queries:**
   - Remove `.select()` clauses for columns that don't exist on joined tables
   - Fix type assertions for query results

### Option 3: Hybrid Approach
1. Add critical missing columns (notification_settings, access_settings)
2. Update code for other mismatches
3. Decide on group membership architecture:
   - Keep current: Recipients → group_id → recipient_groups
   - OR Create: Recipients → group_memberships ← recipient_groups

## Next Steps

1. **Review Architecture**: Determine if group_memberships table is needed
2. **Database Migration**: Run migrations to add missing columns OR
3. **Code Refactoring**: Update all references to match current schema
4. **Type Regeneration**: Run `npx supabase gen types typescript` after schema changes
5. **Incremental Fixes**: Fix files in order of error count (see list above)

## Common Error Patterns

### Pattern 1: SelectQueryError Types
```typescript
// Error: Type 'SelectQueryError<"column 'X' does not exist">'
// Fix: Remove non-existent column from select() clause
```

### Pattern 2: Type Assertions Failing
```typescript
// Error: Conversion may be a mistake
// Fix: Update type to match actual database schema
```

### Pattern 3: Unused @ts-expect-error
```typescript
// Error: Unused '@ts-expect-error' directive
// Fix: Remove the directive (error no longer exists)
```

## Verification

After applying fixes:
```bash
# Check TypeScript errors
npx tsc --noEmit

# Count remaining errors
npx tsc --noEmit 2>&1 | grep "^src/" | wc -l

# Run tests
npm test

# Run linter
npm run lint
```
