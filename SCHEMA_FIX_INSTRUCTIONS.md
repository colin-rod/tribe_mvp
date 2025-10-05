# Schema Fix Instructions

## Migrations Created

### ✅ Migration 1: Children Table
**File:** `supabase/migrations/20251005000002_add_children_columns.sql`

Execute this migration via Supabase SQL Editor to add:
- `title` VARCHAR
- `status` VARCHAR (active/inactive/archived)
- `is_active` BOOLEAN
- `group_id` UUID (FK to recipient_groups)
- `recipient_id` UUID (FK to recipients)
- `delivery_method` VARCHAR (email/sms/whatsapp)

### ✅ Migration 2: Profiles Table
**File:** `supabase/migrations/20251005000003_add_profiles_columns.sql`

Execute this migration via Supabase SQL Editor to add:
- `title` VARCHAR
- `status` VARCHAR (active/inactive/suspended/deleted)
- `group_id` UUID (FK to recipient_groups)

## Code Updates Required

### 1. Replace `group_memberships` Table References

**Pattern to Find:**
```typescript
.from('group_memberships')
```

**Replace With:**
```typescript
.from('recipients')
```

**Column Mapping:**
| group_memberships column | recipients column |
|-------------------------|-------------------|
| `recipient_id` | `id` (this is the recipient) |
| `group_id` | `group_id` |
| `notification_frequency` | `frequency` |
| `preferred_channels` | `preferred_channels` |
| `content_types` | `content_types` |
| `role` | ❌ NOT AVAILABLE (remove) |
| `joined_at` | `created_at` |
| `is_active` | `is_active` |

**Files to Update (13 files):**
1. `/src/app/api/recipients/[token]/membership/route.ts` (already partially fixed)
2. `/src/app/api/groups/[groupId]/settings/route.ts` (already partially fixed)
3. `/src/lib/services/groupNotificationService.ts`
4. `/src/app/api/recipients/[token]/group-preferences/route.ts`
5. `/src/app/api/recipients/[token]/mute/route.ts`
6. `/src/app/api/preferences/[token]/route.ts`
7. `/src/app/api/preferences/bulk/route.ts`
8. `/src/middleware/group-security.ts`
9. `/src/app/api/groups/[groupId]/members/route.ts`
10. `/src/lib/group-notification-integration.ts`
11. `/src/lib/group-management.ts`
12. `/src/lib/group-cache.ts`
13. `/src/__tests__/database/group-functions.test.ts`

### 2. Replace `child_updates` Table References

**Pattern to Find:**
```typescript
.from('child_updates')
```

**Replace With:**
```typescript
.from('delivery_jobs')
// OR
.from('updates')
```

**Decision Guide:**
- Use `delivery_jobs` when tracking delivery status/history
- Use `updates` when accessing the actual update content

**Column Mapping:**
| child_updates | delivery_jobs | updates |
|---------------|---------------|---------|
| `id` | `id` | `id` |
| `created_at` | `queued_at` | `created_at` |
| `delivery_status` | `status` | `distribution_status` |
| `group_id` | ❌ (join via recipient) | ❌ (not on updates) |

### 3. Remove Non-Existent Columns from `recipient_groups`

**Columns to Remove:**
- ❌ `notification_settings`
- ❌ `access_settings`

**Keep:**
- ✅ `default_frequency`
- ✅ `default_channels`
- ✅ `is_default_group`

**Example Fix:**
```typescript
// BEFORE:
.select('id, name, default_frequency, default_channels, notification_settings, access_settings')

// AFTER:
.select('id, name, default_frequency, default_channels, is_default_group')
```

### 4. Replace `group_preferences` with `digest_preferences`

**Pattern to Find:**
```typescript
.select('group_preferences')
// OR
recipient.group_preferences
```

**Replace With:**
```typescript
.select('digest_preferences')
// OR
recipient.digest_preferences
```

**Files to Update:**
- `/src/app/api/recipients/[token]/membership/route.ts` ✅ (fixed)
- `/src/app/api/recipients/[token]/mute/route.ts`
- `/src/app/api/preferences/[token]/route.ts`

### 5. Remove `last_seen_at` References

**Pattern to Find:**
```typescript
.select('last_seen_at')
// OR
recipient.last_seen_at
```

**Action:** Remove these references (column doesn't exist)

## Step-by-Step Fix Process

### Step 1: Execute Migrations
```bash
# Open Supabase SQL Editor
# Execute: supabase/migrations/20251005000002_add_children_columns.sql
# Execute: supabase/migrations/20251005000003_add_profiles_columns.sql
```

### Step 2: Regenerate Types
```bash
npx supabase gen types typescript --project-id advbcfkisejskhskrmqw > src/lib/types/database.types.ts
cp src/lib/types/database.types.ts src/lib/types/database.ts
```

### Step 3: Global Search & Replace

Use your IDE's find and replace across all files in `src/`:

1. **Replace group_memberships:**
   - Find: `from\('group_memberships'\)`
   - Replace: `from('recipients')`
   - Files: 13 (see list above)

2. **Replace notification_frequency:**
   - Find: `notification_frequency`
   - Replace: `frequency`
   - Context: In queries from group_memberships/recipients

3. **Replace group_preferences:**
   - Find: `group_preferences`
   - Replace: `digest_preferences`
   - Files: 3 (see list above)

4. **Remove notification_settings/access_settings:**
   - Find: `, notification_settings`
   - Replace: `` (empty)
   - Find: `, access_settings`
   - Replace: `` (empty)

5. **Remove last_seen_at:**
   - Find: `, last_seen_at`
   - Replace: `` (empty)

### Step 4: Fix Type Definitions

Update type definitions in affected files:

```typescript
// BEFORE:
type MembershipRecord = {
  notification_frequency: string | null
  role: string | null
  joined_at: string | null
}

// AFTER:
type MembershipRecord = {
  frequency: string | null
  created_at: string | null
}
```

### Step 5: Fix child_updates References

Manually review and update based on context:

```typescript
// For delivery tracking:
.from('child_updates') → .from('delivery_jobs')

// For update content:
.from('child_updates') → .from('updates')
```

### Step 6: Verify

```bash
# Type check
npx tsc --noEmit

# Count remaining errors
npx tsc --noEmit 2>&1 | grep "^src/" | wc -l

# Should be 0 or close to 0
```

## Quick Reference: Complete Column Mapping

### recipients table:
- ✅ `id`
- ✅ `parent_id`
- ✅ `email`
- ✅ `phone`
- ✅ `name`
- ✅ `relationship`
- ✅ `group_id` (FK to recipient_groups)
- ✅ `frequency` (NOT notification_frequency)
- ✅ `preferred_channels`
- ✅ `content_types`
- ✅ `overrides_group_default`
- ✅ `preference_token`
- ✅ `is_active`
- ✅ `digest_preferences` (JSONB, NOT group_preferences)
- ✅ `created_at`
- ✅ `updated_at`
- ❌ `last_seen_at` - DOES NOT EXIST
- ❌ `role` - DOES NOT EXIST

### recipient_groups table:
- ✅ `id`
- ✅ `parent_id`
- ✅ `name`
- ✅ `default_frequency`
- ✅ `default_channels`
- ✅ `is_default_group`
- ✅ `created_at`
- ✅ `updated_at`
- ❌ `notification_settings` - DOES NOT EXIST
- ❌ `access_settings` - DOES NOT EXIST

### children table (after migration):
- ✅ `id`
- ✅ `parent_id`
- ✅ `name`
- ✅ `birth_date`
- ✅ `profile_photo_url`
- ✅ `created_at`
- ✅ `updated_at`
- ✅ `title` (NEW)
- ✅ `status` (NEW)
- ✅ `is_active` (NEW)
- ✅ `group_id` (NEW)
- ✅ `recipient_id` (NEW)
- ✅ `delivery_method` (NEW)

### profiles table (after migration):
- ✅ `id`
- ✅ `email`
- ✅ `name`
- ✅ `notification_preferences`
- ✅ `onboarding_completed`
- ✅ `onboarding_step`
- ✅ `onboarding_skipped`
- ✅ `created_at`
- ✅ `updated_at`
- ✅ `title` (NEW)
- ✅ `status` (NEW)
- ✅ `group_id` (NEW)

## Automated Fix Script (Optional)

Save this as `fix-schema.sh`:

```bash
#!/bin/bash

# Replace group_memberships
find src -type f -name "*.ts" -not -path "*/node_modules/*" -exec sed -i '' "s/from('group_memberships')/from('recipients')/g" {} +
find src -type f -name "*.tsx" -not -path "*/node_modules/*" -exec sed -i '' "s/from('group_memberships')/from('recipients')/g" {} +

# Replace notification_frequency with frequency
find src -type f -name "*.ts" -not -path "*/node_modules/*" -exec sed -i '' 's/notification_frequency/frequency/g' {} +
find src -type f -name "*.tsx" -not -path "*/node_modules/*" -exec sed -i '' 's/notification_frequency/frequency/g' {} +

# Replace group_preferences with digest_preferences
find src -type f -name "*.ts" -not -path "*/node_modules/*" -exec sed -i '' 's/group_preferences/digest_preferences/g' {} +
find src -type f -name "*.tsx" -not -path "*/node_modules/*" -exec sed -i '' 's/group_preferences/digest_preferences/g' {} +

echo "Automated fixes complete. Please review changes and run: npx tsc --noEmit"
```

Make executable and run:
```bash
chmod +x fix-schema.sh
./fix-schema.sh
```

## Notes

- After migrations, regenerate Supabase types
- Test thoroughly after changes
- Some manual fixes will still be needed for complex queries
- The `role` field from group_memberships has no equivalent - remove from code
- The `joined_at` field should map to `created_at` in recipients table
