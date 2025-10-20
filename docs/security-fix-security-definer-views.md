# Security Fix: SECURITY DEFINER Views

**Date:** 2025-10-13
**Migration:** `20251013000002_fix_security_definer_views.sql`
**Severity:** CRITICAL (recipient_preferences) / LOW (prompt_analytics)
**Status:** Ready for deployment

## Overview

This document describes a critical security fix for two database views that were flagged by Supabase's security linter as having the `SECURITY DEFINER` property, which bypasses Row Level Security (RLS) policies.

## Security Issues Identified

### 1. `recipient_preferences` View - CRITICAL 🚨

**Risk Level:** HIGH
**Impact:** Cross-user data exposure

**Issue:**
- View was defined with `SECURITY DEFINER`, causing it to execute with creator's permissions
- No user-scoped filtering - any authenticated user could see ALL recipients across the platform
- Exposed sensitive PII: emails, phone numbers, preference tokens for all users

**Example of vulnerability:**
```sql
-- Before fix: Any user could run this and see ALL recipients
SELECT email, phone, preference_token FROM recipient_preferences;
-- Returns: All recipients from all parents in the system
```

**Data at Risk:**
- Recipient emails
- Recipient phone numbers
- Preference tokens (used for unsubscribe/manage preferences)
- Personal relationships
- Contact preferences

### 2. `prompt_analytics` View - LOW ℹ️

**Risk Level:** LOW
**Impact:** Minimal (public analytics data)

**Issue:**
- View was defined with `SECURITY DEFINER` unnecessarily
- Contains only public prompt suggestion analytics (no PII)
- No security risk, but violates security best practices

## The Fix

### Migration: 20251013000002_fix_security_definer_views.sql

The migration performs the following changes:

#### For `recipient_preferences`:

1. **Drops the existing view**
2. **Recreates with explicit `security_invoker = true`**
3. **Adds user-scoped filtering:** `WHERE parent_id = auth.uid()`
4. **Result:** Users can now ONLY see their own recipients

**Before:**
```sql
CREATE VIEW recipient_preferences AS
SELECT ... FROM recipients r
WHERE r.is_active = true;
-- Shows ALL active recipients (security issue)
```

**After:**
```sql
CREATE VIEW recipient_preferences
WITH (security_invoker = true) AS
SELECT ... FROM recipients r
WHERE r.is_active = true
  AND r.parent_id = auth.uid();  -- Only current user's recipients
```

#### For `prompt_analytics`:

1. **Drops the existing view**
2. **Recreates with explicit `security_invoker = true`**
3. **No filtering needed** (public data by design)

## Deployment Instructions

### Step 1: Review the Migration

Location: [supabase/migrations/20251013000002_fix_security_definer_views.sql](../supabase/migrations/20251013000002_fix_security_definer_views.sql)

Review the SQL to ensure it aligns with your security requirements.

### Step 2: Execute via Supabase SQL Editor

**IMPORTANT:** Execute this migration manually via Supabase SQL Editor, not via CLI.

1. Open your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Copy the entire contents of `20251013000002_fix_security_definer_views.sql`
4. Paste into the SQL Editor
5. Review the SQL one final time
6. Click **Run** to execute

### Step 3: Verify the Fix

Run this verification query in the SQL Editor:

```sql
-- Check that views no longer have SECURITY DEFINER
SELECT
  schemaname,
  viewname,
  definition
FROM pg_views
WHERE viewname IN ('recipient_preferences', 'prompt_analytics')
  AND schemaname = 'public';
```

Expected result: Views should be recreated without SECURITY DEFINER property.

### Step 4: Test User Isolation

Test with different user accounts:

```sql
-- Login as User A and run:
SELECT COUNT(*), parent_id FROM recipient_preferences GROUP BY parent_id;
-- Should only show User A's parent_id

-- Login as User B and run:
SELECT COUNT(*), parent_id FROM recipient_preferences GROUP BY parent_id;
-- Should only show User B's parent_id (different from User A)
```

### Step 5: Check Supabase Linter

1. Navigate to **Database** → **Linter** in Supabase Dashboard
2. Verify the two `security_definer_view` alerts are now resolved
3. Expected result: 0 alerts for these views

## Testing Checklist

- [ ] Migration executed successfully via Supabase SQL Editor
- [ ] Verification query confirms views are recreated
- [ ] Test with multiple user accounts shows proper isolation
- [ ] Supabase linter shows alerts are resolved
- [ ] Application functionality works correctly
- [ ] No errors in application logs related to recipient data access

## Application Impact

### Expected Behavior Changes

**For `recipient_preferences`:**
- ✅ **Positive Change:** Users can now only see their own recipients (proper isolation)
- ✅ **Security:** Cross-user data leakage is prevented
- ⚠️ **Potential Issue:** If any code was relying on seeing all recipients (admin features?), it may break

**For `prompt_analytics`:**
- ✅ **No functional change:** Public data remains accessible to all users
- ✅ **Security:** Best practice compliance

### Code That May Be Affected

Search your codebase for direct queries to these views:

```bash
# Search for direct view usage
grep -r "recipient_preferences" src/
grep -r "prompt_analytics" src/
```

Common locations to check:
- API routes that fetch recipient data
- Admin dashboards (if any)
- Analytics queries
- Background jobs that process recipients

### Known Safe Patterns

These patterns should work fine after the migration:

```typescript
// User-scoped queries - SAFE
const { data } = await supabase
  .from('recipient_preferences')
  .select('*');
// Now automatically filtered to current user

// Public analytics - SAFE
const { data } = await supabase
  .from('prompt_analytics')
  .select('*')
  .order('click_through_rate', { ascending: false });
```

## Rollback Plan

If issues arise, you can rollback by recreating the views with the original definitions:

```sql
-- Rollback recipient_preferences (NOT RECOMMENDED - security issue)
DROP VIEW IF EXISTS recipient_preferences;
CREATE VIEW recipient_preferences AS
SELECT ... -- original definition without user filtering

-- Rollback prompt_analytics
DROP VIEW IF EXISTS prompt_analytics;
CREATE VIEW prompt_analytics AS
SELECT ... -- original definition
```

**Warning:** Rolling back `recipient_preferences` will re-introduce the security vulnerability.

## Post-Deployment Monitoring

Monitor for 24-48 hours after deployment:

1. **Application Errors**
   - Check for any errors related to recipient data access
   - Monitor Sentry/error tracking for database query failures

2. **User Reports**
   - Users reporting missing recipients
   - Admin features not working

3. **Performance**
   - Query performance should be similar or better
   - User-scoped filtering may improve performance via indexes

## Related Documentation

- [Supabase RLS Documentation](https://supabase.com/docs/guides/auth/row-level-security)
- [PostgreSQL View Security](https://www.postgresql.org/docs/current/sql-createview.html)
- [Database Linter - Security Definer](https://supabase.com/docs/guides/database/database-linter?lint=0010_security_definer_view)

## Questions or Issues?

If you encounter any issues during or after deployment:

1. Check the [Testing Checklist](#testing-checklist) above
2. Review application logs for database query errors
3. Verify RLS policies on the underlying `recipients` table
4. Check that `auth.uid()` is properly set in your queries

## Success Criteria

This security fix is considered successful when:

- ✅ Supabase linter shows 0 alerts for these views
- ✅ Users can only access their own recipient data
- ✅ Application functions normally with no errors
- ✅ No cross-user data leakage is possible
- ✅ Prompt analytics remains accessible to all users

---

**Migration File:** [20251013000002_fix_security_definer_views.sql](../supabase/migrations/20251013000002_fix_security_definer_views.sql)

**Next Steps:** Execute the migration via Supabase SQL Editor and complete the testing checklist.
