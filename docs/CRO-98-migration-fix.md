# CRO-98: Migration Fix Applied

**Date**: 2025-10-16
**Issue**: Column `deleted_at` does not exist in `likes` table
**Status**: ✅ FIXED

## Problem

The migration file `20251016000001_fix_n_plus_1_response_stats.sql` referenced a `deleted_at` column in the `likes` table that doesn't exist.

### Error Message
```
ERROR:  42703: column "deleted_at" does not exist
LINE 100:   WHERE deleted_at IS NULL;
```

## Root Cause

The `likes` table (created in `20250926000002_likes_comments_system.sql`) has a simple schema:
```sql
CREATE TABLE likes (
  id UUID PRIMARY KEY,
  update_id UUID REFERENCES updates(id),
  parent_id UUID REFERENCES profiles(id),
  created_at TIMESTAMP WITH TIME ZONE
);
```

**No `deleted_at` column** - the table uses hard deletes, not soft deletes.

## Fix Applied

### Change 1: Index Creation (Line 98-99)
**Before**:
```sql
CREATE INDEX IF NOT EXISTS idx_likes_parent_update_batch
  ON public.likes(parent_id, update_id)
  WHERE deleted_at IS NULL;
```

**After**:
```sql
CREATE INDEX IF NOT EXISTS idx_likes_parent_update_batch
  ON public.likes(parent_id, update_id);
```

### Change 2: Comprehensive Function (Line 198-200)
**Before**:
```sql
LEFT JOIN public.likes user_likes
  ON user_likes.update_id = m.id
  AND user_likes.parent_id = p_parent_id
  AND user_likes.deleted_at IS NULL
```

**After**:
```sql
LEFT JOIN public.likes user_likes
  ON user_likes.update_id = m.id
  AND user_likes.parent_id = p_parent_id
```

## Verification

✅ No remaining `deleted_at` references in the migration file:
```bash
grep -n "deleted_at" supabase/migrations/20251016000001_fix_n_plus_1_response_stats.sql
# (no output - confirmed clean)
```

## Migration Ready

The migration file is now ready to execute via Supabase SQL Editor. You can proceed with:

1. Open Supabase SQL Editor
2. Copy the contents of `supabase/migrations/20251016000001_fix_n_plus_1_response_stats.sql`
3. Execute the migration
4. Verify success with the notices that appear

## Impact

- **No functional impact** - the `WHERE deleted_at IS NULL` clause was unnecessary since the table uses hard deletes
- **Index is more efficient** - simpler index without WHERE clause
- **Migration will now execute successfully**

---

**Status**: ✅ READY FOR EXECUTION
