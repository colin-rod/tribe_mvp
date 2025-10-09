# Frontend Migration Status: Updates → Memories, Digests → Summaries

**Last Updated**: October 9, 2025
**Migration Progress**: 51% Complete (57/110+ files)

## ✅ Completed Changes - Phase 1: High-Visibility UI (COMPLETE)

### Navigation & Quick Actions
- [x] Updated navigation label "Digests" → "Memory Book" ([navigationItems.ts](src/lib/constants/navigationItems.ts))
- [x] Changed navigation icon from EnvelopeIcon → BookOpenIcon
- [x] Updated navigation href from `/dashboard/digests` → `/dashboard/memory-book`
- [x] Updated QuickActionsPanel button text "Create Update" → "Create Memory"
- [x] Updated QuickActionsPanel button text "Compile Digest" → "Compile Summary"

### Desktop Components
- [x] **ActivityFeedView.tsx** - Complete migration:
  - Updated imports (getRecentMemoriesWithStats, MemoryList)
  - Updated all state variables (memoriesCreated, showSummarySentAlert, etc.)
  - Updated onboarding steps ("Share Your First Memory")
  - Updated success alerts and query params (summary_sent, summary_scheduled)
  - Replaced UpdatesList with MemoryList component
  - Updated handleCompileSummary route → /dashboard/memory-book/compile
  - Updated stats references (memoizedStats.memories)
  - Fixed MemoryList props (onCreateMemory)
  - Updated "View all" link → /dashboard/memories

- [x] **EmptyTimelineState.tsx** - Complete migration:
  - Updated button text "Share Your First Memory"
  - Updated "See example memories"
  - Updated "No memories found" search state
  - Updated aria-labels for accessibility

- [x] **CompilationProgress.tsx** - Complete migration:
  - Updated step labels ("Analyzing Memories" instead of "Analyzing Updates")
  - Updated descriptions ("Reading your approved memories...")
  - Updated success message ("Summary Ready!")
  - Updated main title ("Compiling Your Summary")
  - Updated personalization text ("AI is personalizing memories...")

- [x] **DashboardHero.tsx** - Complete migration:
  - Updated dropdown options ("Photo Memory", "Text Memory", "Video Memory")
  - Updated main button text "Create Memory"
  - Updated quick actions ("View all memories")
  - Updated last activity text ("Last memory: 2 hours ago")

### Mobile Components
- [x] **MobileUpdateCard.tsx** - Complete migration:
  - Updated aria-label ("Memory about...")
  - Updated image alt text ("Photo from {child}'s memory")
  - Updated action labels ("Like memory", "Share memory")

- [x] **MobileTimelineContainer.tsx** - Complete migration:
  - Updated loading text ("Loading more memories...")

- [x] **MobileSearchBar.tsx** - Complete migration:
  - Updated search placeholder ("Search memories...")

- [x] **PersonalizedWelcome.tsx** - Complete migration:
  - Updated reminder messages ("last memory", "more memories")
  - Updated action labels ("Quick memory", "Add memory")
  - Updated engagement text ("Your family loves your memories!")
  - Updated last activity label ("Last memory:")

### Updates Components (Phase 2 - Partial)
- [x] **UpdatePreview.tsx** - Updated terminology:
  - Header title ("Memory Preview")
  - Image alt text ("Memory photo {n}")

- [x] **AIReview.tsx** - Updated terminology:
  - AI analysis subtitle ("analyzed your memory")
  - Recipient selection ("receive this memory")
  - No recipients message ("sending memories")
  - Frequency label ("Wants every memory")
  - Loading state ("Creating Memory...")

- [x] **AISuggestionsPanel.tsx** - Updated terminology:
  - Analysis status ("Analyzing your memory...")

- [x] **UpdateForm.tsx** - Updated terminology:
  - Child selector placeholder ("Select a child for this memory")
  - Content label ("Memory Content")

- [x] **SendUpdateModal.tsx** - Updated terminology:
  - Step titles ("Send Memory", "Sending Memory...", "Memory Sent!")
  - Empty state ("send memories")
  - Recipient selection ("receive this memory via email")

- [x] **VirtualizedUpdatesList.tsx** - Updated terminology:
  - Empty state ("created any memories", "Share your first memory")
  - Button text ("Create Your First Memory")
  - View all link ("View all memories")
  - Route updated → /dashboard/memories

- [x] **UpdatesList.tsx** - Updated terminology:
  - Error state ("Unable to Load Memories")
  - Empty state ("haven't created any memories", "Create Your First Memory")
  - View all link ("View all memories")
  - Route updated → /dashboard/memories

- [x] **CreateUpdateWizard.tsx** - Updated terminology:
  - Page title ("Create Memory")
  - Modal header ("Create Memory")
  - Processing overlay ("Processing your memory...")

- [x] **UpdateCard.tsx** - Updated terminology:
  - Aria-label ("View memory about {child}...")

- [x] **ResponseThread.tsx** - Updated terminology:
  - Empty state ("reactions to this memory")

- [x] **UpdateCardSkeleton.tsx** - No user-facing text (skeleton only)

### Digest/Summary Components (Phase 2 - Partial)
- [x] **DigestStats.tsx** - Updated terminology:
  - Card title ("Summary System")
  - Section labels ("Pending Summaries", "Sent Summaries")
  - Action button ("Compile Summary Now")
  - Route updated → /dashboard/memory-book/compile
  - Workflow description ("Capture moments as memories, then compile summaries")

- [x] **UpdateInDigest.tsx** - Updated terminology:
  - Button title ("Remove from summary")

- [x] **ViewModeToggle.tsx** - Updated terminology:
  - View mode label ("Digest" → "Summary")

- [x] **DigestSettings.tsx** - Updated terminology:
  - Response description ("responses to your memories")
  - Frequency descriptions ("Receive summary every day/week/month")

- [x] **DigestsRightPane.tsx** - Updated terminology:
  - Page title ("Summary Overview")
  - Card title ("Current Summary")

- [x] **DigestNarrativeView.tsx** - Updated terminology:
  - AI attribution ("crafted by AI from {child}'s memories")

- [x] **RecipientDigestPreview.tsx** - Updated terminology:
  - Frequency preference ("{frequency} memories")
  - View mode toggle ("Memory List")
  - Section title ("Individual Memories")
  - Section description ("source memories for this narrative")
  - List view heading ("Memories ({count})")
  - Empty state ("No Memories Selected", "no memories match")
  - Date range ("Memories from the past week")

- [x] **ParentNarrativeView.tsx** - No user-facing "update" text

- [x] **EmailPreview.tsx** - No user-facing "update" text

### Settings & Profile Components (Phase 2 - Partial)
- [x] **NotificationSettings.tsx** - Updated terminology:
  - Response notification text ("respond to your memories")
  - Weekly digest label ("Weekly Summary")

- [x] **DigestsView.tsx** - Updated terminology:
  - Page title ("Digests" → "Memory Book")

- [x] **PreferenceForm.tsx** - Updated terminology:
  - Frequency label ("receive memories")
  - Frequency description ("notified about new memories")
  - Importance label ("types of memories do you want to receive")
  - Importance description ("which memories reach you")
  - Smart filtering ("categorizes each memory", "receive memories")
  - Channel label ("receive memories")
  - Content types ("types of memories you want to see")

### Onboarding Components (Phase 2 - Partial)
- [x] **FirstUpdateStep.tsx** - Updated terminology:
  - Page title ("Share Your First Memory")
  - Description ("Create a practice memory")
  - Skip text ("create your first memory later")
  - Validation errors ("Memory content is required", "Memory should be at least 5 characters")
  - Send options ("Who should receive this memory?")
  - Testing notice ("memory won't actually be sent")
  - AI preview ("In a real memory", "appreciate this memory")
  - Privacy notice ("practice memory won't be sent")
  - Help text ("No memories will be sent", "create and send real memories")
  - Compact version ("Practice Memory", "creating your first memory")

- [x] **SmartContextualInput.tsx** - No user-facing "update" text

### Right Pane Components (Phase 2 - Partial)
- [x] **ActivityRightPane.tsx** - Updated terminology:
  - Header comments ("Summary System stats", "Create Memory, Compile Summary")
  - JSDoc comments ("Create Memory is clicked", "Compile Summary is clicked")
  - Function comments ("Create Memory action", "Compile Summary action")
  - Default behavior ("create memory modal with prompt")
  - Section heading ("Summary Overview")

- [x] **DraftsRightPane.tsx** - Updated terminology:
  - Sample data ("Weekly Summary - Dec 3")

- [x] **FiltersPanel.tsx** - Updated terminology:
  - Header comment ("Memory type filter")
  - Search placeholder ("Search memories...")
  - Filter label ("Memory Type Filter")
  - Aria-label ("Filter by memory type")

- [x] **QuickActionsPanel.tsx** - Already updated (verified)

- [x] **AISuggestionsPanel.tsx** - Updated terminology:
  - Header comment ("creating memories")
  - Panel title ("Memory Suggestions")

### Modal Components (Phase 2 - Partial)
- [x] **UpdateDetailModal.tsx** - Updated terminology:
  - Error message ("Failed to load memory")

- [x] **CreateUpdateModal.tsx** - Updated terminology:
  - JSDoc comments (backward compatibility notes)

### Hooks (Phase 2 - Partial)
- [x] **useUpdateCreation.ts** - Updated terminology:
  - Step descriptions ("Write your memory", "Review and send your memory")
  - Error messages ("Failed to create memory", "Failed to finalize memory")

- [x] **useDigestCompilation.ts** - Updated terminology:
  - JSDoc comments ("summary from ready memories", "summary email", "Customize summary", "Approve and send summary", "Load all summaries", "Load summary statistics", "Delete summary", "Load single summary by ID")
  - Logger messages ("summary compilation", "Summary compiled successfully", "Summaries loaded", "Summary customized", "Summary approved", "Summary deleted", "Summary loaded")
  - Error messages ("Failed to compile summary", "Failed to customize summary", "Failed to approve summary", "Failed to load summaries", "Failed to delete summary", "Failed to load summary")
  - Comment ("Reload summary to show updated status")

### Pages (Phase 2 - Partial)
- [x] **create-update/page.tsx** - Updated terminology:
  - Query parameter (memory_sent=true)

- [x] **updates/page.tsx** - Updated terminology:
  - Page header comment ("Memories Page")

### Contexts (Phase 2 - Partial)
- [x] **DashboardActionsContext.tsx** - Updated terminology:
  - JSDoc comment ("create memory modal")
  - JSDoc comment ("summary compilation")

### Response Components (Phase 2 - Partial)
- [x] **ConversationView.tsx** - Updated terminology:
  - Section comment ("Original Memory")
  - Header comment ("Memory Header")
  - Content comments ("Memory Content", "Memory Text", "Memory Photos")
  - Page title ("Memory from {child}")
  - Image alt ("Memory photo {n}")

- [x] **ResponseAnalytics.tsx** - No user-facing "update" text

### Right Pane Stats (Phase 2 - Partial)
- [x] **QuickStatsCard.tsx** - Updated terminology:
  - Header comments ("memories count", "summaries count", "Memories this week")
  - Stat labels ("Total Memories", "Sent Summaries")
  - Query comments ("memories", "summaries")

### Constants & Configuration (Phase 2 - Partial)
- [x] **routes.ts** - Updated terminology:
  - Navigation label ("Memory Book")

### Utils & Templates (Phase 2 - Partial)
- [x] **emailTemplates.ts** - Updated terminology:
  - Header comment ("Summaries", "summary-templates.ts")
  - JSDoc comment ("summary email")
  - Email title ("{child}'s Memories")
  - Email header ("{child}'s Memories")
  - CTA button ("View All Memories")
  - CTA URL (/memories?ref=summary)

### Digest Pages (Phase 2 - Partial)
- [x] **digests/compile/page.tsx** - Updated terminology:
  - Logger message ("summary compilation")

- [x] **digests/[id]/preview/page.tsx** - Updated terminology:
  - Logger messages ("Summary approved and sent", "Summary scheduled")
  - Query parameters (summary_sent=true, summary_scheduled=true)
  - Error state ("Summary Not Found", "summary you are looking for")
  - Stats display ("{n} memories")
  - Section comment ("Summary Info")
  - Modal title ("Schedule Summary")
  - Modal description ("send this summary")

### Services (Session 41-43 - Oct 9)
- [x] **digestService.ts** - Complete migration (32 instances):
  - JSDoc comments ("summary from ready memories", "summary preview", etc.)
  - Logger messages (all "digest" → "summary", "update" → "memory")
  - Error messages ("Failed to fetch summary", "Summary not found", etc.)
  - Code comments ("Can only delete non-sent summaries", "Memories will automatically revert")

- [x] **notificationService.ts** - Updated user-facing messages (4 instances):
  - Notification titles ("responded to your memory", "Memory request", "summary ({n} new memories)")
  - Notification content ("love to hear a memory!", "{n} new memories from your family")

### Utils (Session 41-43 - Oct 9)
- [x] **update-formatting.ts** - Updated JSDoc comments (3 instances):
  - "Transform database memory to display-ready card data"
  - "Sort memories by creation date"
  - "Filter memories by status"

### Backend Infrastructure (from previous session)
- [x] Database migration completed (tables renamed)
- [x] TypeScript types created (Memory, Summary, etc.)
- [x] Core libraries implemented (memories.ts, summaryService.ts)
- [x] UI components created (MemoryCard, MemoryList, MemoryDetailModal)
- [x] API routes created (/api/memories/*, /api/summaries/*)
- [x] Edge Functions created (auto-publish, compile-summary)
- [x] Email templates created (hybrid gallery/narrative)

## 🚧 In Progress

### Phase 1: Navigation & Routes
- [ ] Create route redirects for backward compatibility
- [ ] Update dashboard/memory-book route integration
- [ ] Remove old /dashboard/digests references

## 📋 Remaining Work

### HIGH PRIORITY - User-Visible Changes

#### Component Folders to Rename
- [ ] `src/components/updates/` → `src/components/memories/` (OR use existing components/memories)
- [ ] `src/components/digests/` → `src/components/summaries/`

#### Files to Rename/Replace
**Updates Folder** (13 files):
- [ ] UpdateForm.tsx → MemoryForm.tsx
- [ ] UpdateCard.tsx → REPLACE with existing MemoryCard.tsx
- [ ] UpdatesList.tsx → REPLACE with existing MemoryList.tsx
- [ ] UpdateDetailModal.tsx → REPLACE with existing MemoryDetailModal.tsx
- [ ] UpdatePreview.tsx → MemoryPreview.tsx
- [ ] CreateUpdateWizard.tsx → CreateMemoryWizard.tsx
- [ ] CreateUpdateModal.tsx → CreateMemoryModal.tsx
- [ ] SendUpdateModal.tsx → SendMemoryModal.tsx
- [ ] UpdateCardSkeleton.tsx → MemoryCardSkeleton.tsx
- [ ] VirtualizedUpdatesList.tsx → VirtualizedMemoriesList.tsx
- [ ] UpdateCard.stories.tsx → MemoryCard.stories.tsx
- [ ] AIReview.tsx (update text within file)
- [ ] SmartContextualInput.tsx (update text within file)

**Digests Folder** (4 files):
- [ ] DigestNarrativeView.tsx → SummaryNarrativeView.tsx
- [ ] DigestStats.tsx → SummaryStats.tsx
- [ ] RecipientDigestPreview.tsx → RecipientSummaryPreview.tsx
- [ ] UpdateInDigest.tsx → MemoryInSummary.tsx

#### Dashboard Routes to Rename
- [ ] `/app/dashboard/updates/` → `/app/dashboard/memories/`
- [ ] `/app/dashboard/create-update/` → `/app/dashboard/create-memory/`
- [ ] `/app/dashboard/digests/` → REMOVE (replaced by /memory-book)

#### Views to Update
- [ ] ActivityFeedView.tsx - Use MemoryList, getRecentMemoriesWithStats()
- [ ] DigestsView.tsx - REMOVE or redirect to /memory-book
- [ ] Create MemoriesView.tsx (new view for all memories)

#### Hooks to Migrate
- [ ] useUpdateCreation.ts → useMemoryCreation.ts
- [ ] useDigestCompilation.ts → useSummaryCompilation.ts
- [ ] useDraftManagement.ts - Update terminology
- [ ] useResponseNotifications.ts - Update terminology
- [ ] useTimelineData.ts - Update data fetching

#### Right Pane Components
- [ ] ActivityRightPane.tsx - Update comments and callbacks
- [ ] DigestsRightPane.tsx → SummaryRightPane.tsx OR remove
- [ ] DraftsRightPane.tsx - Consider removing per PRD
- [ ] RightPaneContent.tsx - Update terminology

### MEDIUM PRIORITY - Internal Changes

#### User-Facing Text Updates
Search and replace in all .tsx files:
- [ ] "update" → "memory" (in button text, labels, placeholders)
- [ ] "Update" → "Memory" (in headings, titles)
- [ ] "digest" → "summary" (in UI text)
- [ ] "Digest" → "Summary" (in headings)

Files containing old terminology (partial list):
- [ ] UpdatePreview.tsx: "Update Preview", "Send Update Now", "Schedule Update"
- [ ] AIReview.tsx: "Our AI has analyzed your update"
- [ ] CreateUpdateWizard.tsx: All wizard step text
- [ ] PreferenceForm.tsx: "new updates" → "new memories"
- [ ] FirstUpdateStep.tsx: "Share Your First Update"

#### Dashboard Components
- [ ] DigestModeView.tsx → SummaryModeView.tsx
- [ ] MobileUpdateCard.tsx → MobileMemoryCard.tsx

#### Profile Components
- [ ] DigestSettings.tsx → SummarySettings.tsx

#### Onboarding
- [ ] FirstUpdateStep.tsx → FirstMemoryStep.tsx

### LOW PRIORITY - Polish

#### Status Flow Updates
- [ ] Update all status displays to use new flow: new → approved → compiled → sent
- [ ] Update color schemes for new statuses
- [ ] Ensure "New" badge appears correctly

#### Draft Workspace Removal
- [ ] Remove draft navigation item (if keeping drafts, update terminology)
- [ ] Update ActivityFeedView to show new memories inline with badges
- [ ] Remove draft-related filters if no longer needed

#### Tests
- [ ] Update test files that reference old terminology
- [ ] Update test data/fixtures
- [ ] Update snapshot tests

## 🎯 Next Steps (Recommended Order)

1. **Immediate (User-Visible)**:
   - Integrate MemoryList into ActivityFeedView
   - Create route redirects for old URLs
   - Update remaining button text

2. **Phase 2 (Component Refactor)**:
   - Rename UpdateForm → MemoryForm
   - Rename CreateUpdateWizard → CreateMemoryWizard
   - Update all imports

3. **Phase 3 (Hooks & Logic)**:
   - Migrate hooks to use new APIs
   - Update useUpdateCreation to useMemoryCreation
   - Test end-to-end flows

4. **Phase 4 (Cleanup)**:
   - Remove old components
   - Update tests
   - Final terminology search/replace

## 📊 File Change Summary

| Category | Files Changed | Files Remaining |
|----------|--------------|-----------------|
| Navigation | 2/2 | ✅ Complete |
| Components | 2/80+ | 🚧 2.5% |
| Hooks | 0/10 | ⏳ Pending |
| Views | 0/5 | ⏳ Pending |
| Routes | 0/5 | ⏳ Pending |
| Tests | 0/10+ | ⏳ Pending |
| **TOTAL** | **4/110+** | **3.6%** |

## ⚠️ Critical Notes

1. **Backward Compatibility**: Consider keeping prop names like `onCreateUpdate` for backward compat while changing button text
2. **Existing Components**: We have new MemoryCard, MemoryList, MemoryDetailModal - use these instead of renaming old ones
3. **Draft Workspace**: PRD says remove it, but currently still in navigation - decision needed
4. **Testing**: Each phase should include testing before moving to next

## 🔗 Related Documents

- [MEMORY_BOOK_IMPLEMENTATION_STATUS.md](MEMORY_BOOK_IMPLEMENTATION_STATUS.md) - Backend implementation status
- [NEXT_STEPS.md](NEXT_STEPS.md) - Original implementation guide
- [PRD] - Memory Book Experience requirements
