# Database Fix Instructions

## Problem Summary

The dashboard is showing "Unable to Load Updates" with the following errors:

1. **HTTP 404** on `/rest/v1/likes` table - **Table doesn't exist**
2. **HTTP 406** on `/rest/v1/responses` table - **RLS policy issues**

## Root Cause Analysis

✅ **Confirmed Issues:**
- `likes` table is missing from the database
- `comments` table is missing from the database
- `responses` table exists but may have restrictive RLS policies
- `updates` table exists with `like_count` and `comment_count` columns

## Solution

### Step 1: Apply Database Migration

1. **Go to your Supabase Dashboard:**
   ```
   https://supabase.com/dashboard/project/advbcfkisejskhskrmqw
   ```

2. **Navigate to SQL Editor:**
   - Click on "SQL Editor" in the left sidebar
   - Click "New Query"

3. **Copy and paste the entire contents** of this file:
   ```
   supabase/migrations/20250929000004_fix_missing_likes_table.sql
   ```

4. **Execute the SQL:**
   - Click "Run" to execute the migration
   - The migration will create all missing tables and fix RLS policies

### Step 2: Verify the Fix

Run the verification script:
```bash
node scripts/manual-database-fix.js --verify
```

This should show:
```
✅ likes table is working correctly
✅ comments table is working correctly
✅ responses table is working correctly
✅ updates table is working correctly
```

### Step 3: Test Dashboard

1. Refresh your dashboard at: `http://localhost:3000/dashboard`
2. The "Unable to Load Updates" error should be resolved
3. Updates should now load properly

## What the Migration Does

### Creates Missing Tables:
- **`likes` table** - Stores user likes/reactions on updates
- **`comments` table** - Stores user comments on updates

### Fixes RLS Policies:
- Updates RLS policies for `responses` table to fix 406 errors
- Sets up proper access control for `likes` and `comments`

### Adds Functionality:
- Engagement count triggers for automatic like/comment counting
- Real-time subscriptions for live updates
- Proper indexing for performance

## Files Created/Updated

1. `supabase/migrations/20250929000004_fix_missing_likes_table.sql` - Complete migration
2. `scripts/manual-database-fix.js` - Diagnosis and verification script
3. `DATABASE_FIX_INSTRUCTIONS.md` - This instruction file

## Migration Safety

The migration is designed to be **safe and idempotent**:
- Uses `CREATE TABLE IF NOT EXISTS` - won't fail if tables exist
- Uses `DROP POLICY IF EXISTS` before creating policies
- Checks for column existence before adding them
- Will not affect existing data

## Troubleshooting

If the migration fails:

1. **Check the error message** in the SQL Editor
2. **Run statements individually** - copy sections of the migration one at a time
3. **Check permissions** - ensure you're using the project owner account

If dashboard still shows errors after migration:

1. **Hard refresh** the browser (Ctrl+F5 or Cmd+Shift+R)
2. **Check browser network tab** for any remaining 404/406 errors
3. **Run verification script** to confirm tables are accessible

## Next Steps

After applying this fix:

1. **Test creating updates** - Verify the full functionality works
2. **Test likes/comments** - Try the engagement features
3. **Monitor performance** - New indexes should improve query speed

---

**Need Help?**

If you encounter any issues:
1. Run `node scripts/manual-database-fix.js` to diagnose current state
2. Check the Supabase dashboard logs for detailed error messages
3. Verify your user has proper database permissions