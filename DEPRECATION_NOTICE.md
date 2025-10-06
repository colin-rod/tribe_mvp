# Deprecation Notice

## Recipient-Centric Refactor - October 2025

As part of the recipient-centric experience refactor, the following group management features have been **deprecated** and should no longer be used. These files are kept temporarily for reference and potential rollback scenarios but will be removed in a future release.

### Migration Date
- **Migration Executed**: October 6, 2025
- **Migration File**: `supabase/migrations/20251006000001_recipient_centric_refactor.sql`
- **Deprecation Effective**: October 6, 2025
- **Planned Removal**: After 30-day transition period

---

## Deprecated Components

### Group Management UI Components
The following React components are no longer used in the application:

**Primary Group Components:**
- `src/components/groups/GroupManager.tsx` - Main group management interface
- `src/components/groups/GroupEditor.tsx` - Group editing form
- `src/components/groups/AddGroupForm.tsx` - Add new group form
- `src/components/groups/GroupCard.tsx` - Group display card
- `src/components/groups/GroupOverviewDashboard.tsx` - Group dashboard
- `src/components/groups/GroupMembershipCard.tsx` - Membership display
- `src/components/groups/GroupPreferenceManager.tsx` - Group preferences

**Preference-Related Group Components:**
- `src/components/preferences/GroupPreferenceSettings.tsx` - Group-specific preference settings
- `src/components/preferences/GroupOverviewDashboard.tsx` - Preference dashboard
- `src/components/preferences/GroupMembershipCard.tsx` - Membership card in preferences

**Layout Components:**
- `src/components/layout/rightPane/GroupsRightPane.tsx` - Right pane for groups view

**View Components:**
- `src/components/views/GroupsView.tsx` - Main groups view

---

## Deprecated API Routes

The following API endpoints are deprecated and should not be used:

**Group Management APIs:**
- `src/app/api/groups/route.ts` - GET/POST groups
- `src/app/api/groups/[groupId]/members/route.ts` - Group member management
- `src/app/api/groups/[groupId]/settings/route.ts` - Group settings management

**Group-Specific Preference APIs:**
- `src/app/api/recipients/[token]/groups/route.ts` - Get recipient groups
- `src/app/api/recipients/[token]/group-preferences/route.ts` - Group-specific preferences
- `src/app/api/notifications/group-delivery/route.ts` - Group-based notification delivery

**Other Group-Related APIs:**
- `src/app/api/preferences/bulk/route.ts` - May contain group-specific logic
- `src/app/api/recipients/[token]/membership/route.ts` - Group membership
- `src/app/api/recipients/[token]/mute/route.ts` - Group-specific muting

---

## Deprecated Library Files

**Group Management Services:**
- `src/lib/recipient-groups.ts` - Group CRUD operations
- `src/lib/group-management.ts` - Group management utilities
- `src/lib/group-cache.ts` - Group caching layer
- `src/lib/group-security-validator.ts` - Group security validation
- `src/lib/group-notification-integration.ts` - Group notification logic
- `src/lib/services/groupNotificationService.ts` - Group notification service

**Middleware:**
- `src/middleware/group-security.ts` - Group security middleware

---

## Deprecated Database Tables

The following database tables are deprecated but preserved for data integrity:

- `recipient_groups` - Group definitions (will be dropped after transition period)
  - Contains: Close Family, Extended Family, Friends, and custom groups
  - Deprecated Fields: `default_frequency`, `default_channels`, `is_default_group`

**Note**: The `group_id` column in the `recipients` table is now **optional** and will eventually be removed.

---

## Deprecated Functions

**Database Functions:**
- Group-related RLS policies (may be simplified)
- Group membership validation functions
- Group default retrieval functions

---

## Migration Path

### What Replaced Groups?

**Old Model (Deprecated):**
```
User creates groups → Assigns recipients to groups →
Groups have default preferences → Recipients can override
```

**New Model (Current):**
```
User adds recipients → Recipients get relationship-based defaults →
AI classifies update importance → Recipients control their own preferences
```

### Key Changes:

1. **No Group Management**: Users no longer create or manage groups
2. **Relationship-Based Defaults**: Defaults determined by recipient relationship (grandparent, parent, friend, etc.)
3. **Importance Threshold**: New recipient preference for filtering updates by importance
4. **AI Classification**: Updates automatically classified by importance level
5. **Recipient Control**: Recipients have full control via preference links

---

## Data Preservation

All existing data has been preserved:
- Recipient group assignments remain in the database
- Group default preferences were migrated to individual recipient preferences
- No data loss occurred during migration
- Rollback capability maintained

---

## Rollback Instructions

If issues arise, the migration can be reversed:

1. Keep `recipient_groups` table
2. Keep `group_id` foreign key in `recipients`
3. Restore group management UI components
4. Restore group API routes
5. Remove `importance_threshold` functionality

---

## Timeline

- ✅ **Day 0 (Oct 6, 2025)**: Migration executed, new model active
- ⏳ **Day 1-7**: Monitor for issues, collect feedback
- ⏳ **Day 8-30**: Transition period, deprecated code remains
- 🗑️ **Day 31+**: Remove deprecated files and database tables

---

## Questions or Issues?

If you need to reference old group functionality or encounter issues with the new system, contact the development team or refer to:
- Migration file: `supabase/migrations/20251006000001_recipient_centric_refactor.sql`
- Planning document: `CLAUDE.md`
- Git history: Commit with message "Recipient-centric refactor"

---

## For Developers

**DO NOT USE:**
- Group management components
- Group API endpoints
- `recipient-groups.ts` library
- Group-related services

**USE INSTEAD:**
- Relationship-based defaults from `src/lib/types/preferences.ts`
- Importance threshold in recipient preferences
- AI importance classification in updates
- Individual recipient preference management

**Code Review Checklist:**
- ❌ No new imports from deprecated group files
- ❌ No new group-related UI components
- ❌ No new group management endpoints
- ✅ Use relationship-based defaults
- ✅ Use importance threshold for filtering
- ✅ Leverage AI classification
