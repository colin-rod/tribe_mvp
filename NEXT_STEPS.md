# Memory Book Implementation - Next Steps

## 🎯 Current Status
- ✅ Database migration COMPLETE and executed
- ✅ TypeScript types created
- ✅ Core library functions ready
- ✅ ~35% of implementation complete

---

## 🚀 What to Do Next

### Option A: I Continue the Implementation

I can continue building out:
1. Update UI components (MemoryCard with badges, actions)
2. Create Memory Book timeline UI
3. Build auto-publish Edge Functions
4. Implement hybrid email templates
5. Update API routes

**Estimate:** 4-6 hours of development

### Option B: You Take Over

Here's what you need to do:

#### Step 1: Update UI Components (2-3 hours)
```bash
# Rename files
mv src/components/updates/UpdateCard.tsx src/components/memories/MemoryCard.tsx
mv src/components/updates/UpdatesList.tsx src/components/memories/MemoryList.tsx

# Update imports throughout codebase
# Find and replace: 'updates' → 'memories', 'Update' → 'Memory'
```

**Key changes:**
- Add "New" badge when `is_new = true`
- Add "Mark as Ready" button for `status = 'new'`
- Use `memory-formatting.ts` utilities for status display
- Remove draft workspace components

#### Step 2: Create Memory Book Timeline (3-4 hours)
Create new file: `src/app/memory-book/page.tsx`
```typescript
// Weekly timeline view
// Shows past summaries as browsable pages
// Includes print/export placeholder CTAs
```

#### Step 3: Build Auto-Publish System (4-5 hours)
Create Edge Functions:
```bash
# 1. Auto-publish function
supabase/functions/auto-publish-summaries/index.ts

# 2. Reminder function
supabase/functions/send-summary-reminders/index.ts

# 3. Update compile function
supabase/functions/compile-summary/index.ts (rename from compile-digest)
```

Setup cron jobs in Supabase dashboard

#### Step 4: Hybrid Email Templates (2-3 hours)
Update email generation logic to check `render_style`:
- Gallery template for 3+ photos
- Narrative template for <3 photos

---

## 📋 Detailed Task Breakdown

### UI Components Update

**Files to Update:**
1. `src/components/updates/` → `src/components/memories/`
2. `src/components/dashboard/` - Update memory displays
3. `src/hooks/useUpdateCreation.ts` → `src/hooks/useMemoryCreation.ts`
4. `src/app/dashboard/page.tsx` - Update main feed

**New Components Needed:**
- `MemoryBadge.tsx` - "New" badge indicator
- `MemoryActions.tsx` - "Mark as Ready" button
- `MemoryBookTimeline.tsx` - Timeline view
- `MemoryBookPage.tsx` - Individual summary page

### Auto-Publish Edge Functions

**1. auto-publish-summaries/index.ts**
```typescript
import { createClient } from '@supabase/supabase-js'

export default async function autoPublishSummaries() {
  // 1. Query: get_summaries_for_auto_publish()
  // 2. For each summary:
  //    - Update status to 'approved'
  //    - Set approved_at timestamp
  //    - Trigger send-summary function
  //    - Clear is_new on all memories
  // 3. Log results
}
```

**2. send-summary-reminders/index.ts**
```typescript
export default async function sendReminders() {
  // 1. Query: get_summaries_needing_reminders()
  // 2. For each summary:
  //    - Send notification to parent
  //    - Update last_reminder_sent_at
  //    - Increment reminder_count
  // 3. Track which reminders sent (48hr vs 24hr)
}
```

**3. Cron Setup (Supabase Dashboard)**
```sql
-- Auto-publish check (hourly)
select cron.schedule(
  'auto-publish-summaries',
  '0 * * * *',
  $$
  select net.http_post(
    url:='https://[project].supabase.co/functions/v1/auto-publish-summaries',
    headers:='{"Content-Type": "application/json", "Authorization": "Bearer [key]"}'::jsonb
  ) as request_id;
  $$
);

-- Reminders check (every 6 hours)
select cron.schedule(
  'send-summary-reminders',
  '0 */6 * * *',
  $$
  select net.http_post(
    url:='https://[project].supabase.co/functions/v1/send-summary-reminders',
    headers:='{"Content-Type": "application/json", "Authorization": "Bearer [key]"}'::jsonb
  ) as request_id;
  $$
);
```

---

## 🔧 Quick Commands

### Find and Replace (Update Terminology)
```bash
# Find all instances of old terminology
grep -r "Update" src/components/ | wc -l
grep -r "update" src/lib/ | wc -l
grep -r "Digest" src/ | wc -l

# Use your IDE's find/replace:
# Update → Memory (in component names)
# update → memory (in variables)
# Digest → Summary
# digest → summary
```

### Run Quality Checks
```bash
# Type check
npx tsc --noEmit

# Lint
npm run lint

# Test
npm test

# Build
npm run build
```

---

## ⚠️ Important Notes

### Database is Ready ✅
- All tables renamed
- New columns added
- Indexes updated
- Helper functions created
- Data migrated

### Code Needs Updates ⚠️
- UI components still reference "updates"
- API routes need renaming
- Edge Functions need updating
- Import paths need fixing

### No Breaking Changes ✅
- Old functionality still works
- Can update incrementally
- Database handles both old and new code (for now)

---

## 🎨 UI Component Example

**Before (UpdateCard.tsx):**
```typescript
<div className="update-card">
  <h3>{update.content}</h3>
  <span className="status">{update.distribution_status}</span>
</div>
```

**After (MemoryCard.tsx):**
```typescript
import { shouldShowNewBadge, getStatusDisplayText } from '@/lib/utils/memory-formatting'

<div className="memory-card">
  {shouldShowNewBadge(memory.is_new, memory.distribution_status) && (
    <span className="new-badge">✨ New</span>
  )}
  <h3>{memory.content}</h3>
  <span className="status">{getStatusDisplayText(memory.distribution_status)}</span>

  {memory.distribution_status === 'new' && (
    <button onClick={() => approveMemory(memory.id)}>
      Mark as Ready
    </button>
  )}
</div>
```

---

## 📚 Reference Files

All the foundation is in place:

1. **Database:** Migration executed successfully
2. **Types:** `src/lib/types/memory.ts`, `src/lib/types/summary.ts`
3. **Validation:** `src/lib/validation/memory.ts`
4. **Library:** `src/lib/memories.ts`, `src/lib/services/summaryService.ts`
5. **Utilities:** `src/lib/utils/memory-formatting.ts`
6. **Status:** `MEMORY_BOOK_IMPLEMENTATION_STATUS.md` (this file)

---

## 🤝 How I Can Help

**Option 1:** I continue the implementation
- Update all UI components
- Build auto-publish system
- Create Memory Book timeline
- Implement hybrid templates

**Option 2:** You implement with my guidance
- I provide code examples
- Answer specific questions
- Review your work
- Debug issues

**Option 3:** Hybrid approach
- You do UI components (straightforward)
- I do Edge Functions (more complex)
- We collaborate on timeline UI

**What would you prefer?**
