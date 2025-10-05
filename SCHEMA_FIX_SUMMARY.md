# Schema Fix Summary

## What Was Done

### ✅ Migrations Created

1. **`supabase/migrations/20251005000002_add_children_columns.sql`**
   - Adds: `title`, `status`, `is_active`, `group_id`, `recipient_id`, `delivery_method`
   - **ACTION REQUIRED**: Execute via Supabase SQL Editor

2. **`supabase/migrations/20251005000003_add_profiles_columns.sql`**
   - Adds: `title`, `status`, `group_id`
   - **ACTION REQUIRED**: Execute via Supabase SQL Editor

### ✅ Automated Code Fixes Applied

Ran `fix-schema.sh` which performed:
1. Replaced `group_memberships` → `recipients` (13 files)
2. Replaced `notification_frequency` → `frequency`
3. Replaced `group_preferences` → `digest_preferences`
4. Replaced `child_updates` → `delivery_jobs`
5. Removed `notification_settings` references
6. Removed `access_settings` references
7. Removed `last_seen_at` references
8. Replaced `created_at` → `created_at` (for membership context)

### ✅ Manual Fixes Applied

1. **Update Type** - Made `content` field nullable (`src/lib/updates.ts`)
2. **Group Settings** - Removed non-existent columns (`src/app/api/groups/[groupId]/settings/route.ts`)
3. **Membership Route** - Fixed recipient queries (`src/app/api/recipients/[token]/membership/route.ts`)
4. **Bulk Preferences** - Fixed recipient_id → id (`src/app/api/preferences/bulk/route.ts`)
5. **Routes** - Fixed alternateHrefs type issue (`src/lib/constants/routes.ts`)
6. **Removed role references** - Role field doesn't exist

## Progress

- **Initial Errors**: 233
- **After Automated Fixes**: 190
- **After Manual Fixes**: 192 (slight increase due to type refinements)

## Remaining Issues (192 errors)

### Common Error Patterns

1. **SelectQueryError Types** - Invalid column selections causing query errors
2. **Type Assertions Failing** - Mismatches between expected and actual types
3. **Missing Columns in Joins** - Queries selecting columns that don't exist on joined tables

### Top Files Still With Errors

1. `src/app/api/notifications/group-delivery/route.ts` - 9+ errors
2. `src/lib/group-management.ts` - 16+ errors
3. `src/lib/services/groupNotificationService.ts` - 12+ errors
4. `src/app/api/recipients/[token]/membership/route.ts` - remaining errors
5. `src/lib/api/privacy.ts` - 6+ errors

## Next Steps

### Step 1: Execute Migrations

```bash
# Open Supabase SQL Editor at: https://supabase.com/dashboard/project/advbcfkisejskhskrmqw/sql
# Execute these files in order:
```

1. Copy `supabase/migrations/20251005000002_add_children_columns.sql`
2. Paste and execute in SQL Editor
3. Copy `supabase/migrations/20251005000003_add_profiles_columns.sql`
4. Paste and execute in SQL Editor

### Step 2: Regenerate Supabase Types

```bash
npx supabase gen types typescript --project-id advbcfkisejskhskrmqw > src/lib/types/database.types.ts
cp src/lib/types/database.types.ts src/lib/types/database.ts
```

### Step 3: Fix Remaining Errors Systematically

Focus on these patterns:

#### Pattern 1: Invalid Column in Select
```typescript
// WRONG:
.select('notification_settings')  // column doesn't exist

// RIGHT:
.select('default_frequency, default_channels')
```

#### Pattern 2: Self-Join Issues
```typescript
// WRONG:
.from('recipients')
.select('recipients!inner(id, name)')  // trying to self-join

// RIGHT:
.from('recipients')
.select('id, name, group_id, frequency')
```

#### Pattern 3: Recipient ID References
```typescript
// WRONG:
.eq('recipient_id', id)  // on recipients table

// RIGHT:
.eq('id', id)  // recipients.id IS the recipient_id
```

### Step 4: Common Fixes Needed

1. **Remove notification_settings usage in group-management.ts**:
   ```typescript
   // Line 233 and similar
   // REMOVE: group.notification_settings
   // USE: group.default_frequency, group.default_channels
   ```

2. **Fix delivery job queries**:
   ```typescript
   // Replace child_updates with delivery_jobs
   // Use queued_at instead of created_at
   // Use status instead of delivery_status
   ```

3. **Fix recipient self-joins**:
   ```typescript
   // Don't try to join recipients to recipients
   // Just select the fields you need directly
   ```

## Files Created

1. `DATABASE_SCHEMA_FIXES.md` - Original comprehensive analysis
2. `SCHEMA_FIX_INSTRUCTIONS.md` - Detailed fix instructions
3. `fix-schema.sh` - Automated fix script (already executed)
4. `supabase/migrations/20251005000002_add_children_columns.sql`
5. `supabase/migrations/20251005000003_add_profiles_columns.sql`
6. `SCHEMA_FIX_SUMMARY.md` (this file)

## Quick Verification Commands

```bash
# Count errors by file
npx tsc --noEmit 2>&1 | grep "^src/" | sed 's/([0-9]*,[0-9]*).*//' | sort | uniq -c | sort -rn

# See specific errors in a file
npx tsc --noEmit 2>&1 | grep "src/lib/group-management.ts"

# Check for specific error patterns
npx tsc --noEmit 2>&1 | grep "SelectQueryError"
npx tsc --noEmit 2>&1 | grep "does not exist"
```

## Database Schema Reference

### recipients table (actual schema):
```typescript
{
  id: string                    // This IS the recipient_id
  parent_id: string
  email: string | null
  phone: string | null
  name: string
  relationship: string
  group_id: string | null       // FK to recipient_groups
  frequency: string             // NOT notification_frequency
  preferred_channels: string[]
  content_types: string[]
  overrides_group_default: boolean
  preference_token: string
  is_active: boolean
  digest_preferences: JSONB     // NOT group_preferences
  created_at: timestamp
  updated_at: timestamp
}
```

### recipient_groups table (actual schema):
```typescript
{
  id: string
  parent_id: string
  name: string
  default_frequency: string     // NO notification_settings
  default_channels: string[]    // NO access_settings
  is_default_group: boolean
  created_at: timestamp
  updated_at: timestamp
}
```

### children table (after migration):
```typescript
{
  id: string
  parent_id: string
  name: string
  birth_date: date
  profile_photo_url: string | null
  created_at: timestamp
  updated_at: timestamp
  // NEW COLUMNS:
  title: string | null
  status: string | null
  is_active: boolean | null
  group_id: string | null
  recipient_id: string | null
  delivery_method: string | null
}
```

### profiles table (after migration):
```typescript
{
  id: string
  email: string
  name: string
  notification_preferences: JSONB
  onboarding_completed: boolean
  onboarding_step: number
  onboarding_skipped: boolean
  created_at: timestamp
  updated_at: timestamp
  // NEW COLUMNS:
  title: string | null
  status: string | null
  group_id: string | null
}
```

## Important Notes

1. **No group_memberships table** - Recipients link directly to groups via `group_id`
2. **No child_updates table** - Use `delivery_jobs` or `updates` table
3. **recipients.id IS the recipient_id** - Don't look for a separate column
4. **frequency, not notification_frequency** - Column was renamed
5. **digest_preferences, not group_preferences** - Different column name

## Recommended Approach

Fix errors file by file, starting with the most errors:

1. Start with `group-management.ts` (16 errors)
2. Then `groupNotificationService.ts` (12 errors)
3. Then `notifications/group-delivery/route.ts` (9 errors)
4. Continue down the list

For each file:
1. Run: `npx tsc --noEmit 2>&1 | grep "filename.ts"`
2. Fix each error one by one
3. Verify with type check
4. Move to next file

## Support

If you encounter issues:
1. Check the database schema in this file
2. Review `SCHEMA_FIX_INSTRUCTIONS.md` for detailed patterns
3. Look at `DATABASE_SCHEMA_FIXES.md` for the original analysis
