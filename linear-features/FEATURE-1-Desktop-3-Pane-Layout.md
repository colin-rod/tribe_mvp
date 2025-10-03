# Linear Feature: Desktop 3-Pane Layout (MVP)

**Feature Title**: Desktop 3-Pane Layout - Modern Dashboard Architecture

**Feature Description**:
Transform Tribe's dashboard from a traditional page-based layout to a modern 3-pane desktop layout with persistent navigation. This provides users with:
- Collapsible left navigation panel (icon-only or icon+label)
- Dynamic middle content pane that updates based on navigation
- Contextual right sidebar with filters, search, and quick actions
- Slim persistent top bar with global search and profile

**Priority**: P0 (Critical - MVP Blocker)

**Target Release**: Q2 2025

**Project ID**: 76e4b902-0484-480e-bd8a-c151c003211f

---

## Issue 1.1: Core Layout Shell & Top Bar

**Title**: Core Layout Shell & Top Bar

**Priority**: P0 (Blocker)

**Effort Estimate**: M (Medium - 3-5 days)

**Labels**: `frontend`, `layout`, `foundation`, `mvp`

**Dependencies**: None

**Description**:
Create the foundational 3-pane layout structure with persistent top bar. This is the base shell that all other components will integrate into.

**Technical Requirements**:
- CSS Grid layout: `grid-template-columns: [nav] auto [main] 1fr [sidebar] auto`
- Top bar height: 64px fixed
- z-index hierarchy: TopBar (50) > LeftNav (40) > RightPane (30)
- Responsive breakpoint: Hide 3-pane below 1024px
- localStorage integration for state persistence

**Tasks**:
- [ ] Create `DashboardShell` component with CSS Grid layout
- [ ] Build `TopBar` component with three sections (logo left, search center, profile right)
- [ ] Implement responsive breakpoint (fallback to mobile layout below 1024px)
- [ ] Add localStorage for layout state persistence
- [ ] Set up global layout context provider (`LayoutContext`)
- [ ] Add proper TypeScript types for layout state

**Acceptance Criteria**:
- [ ] Grid layout renders correctly with proper proportions
- [ ] Top bar is fixed and always visible during scroll
- [ ] Layout state (collapsed panels) persists across page refreshes
- [ ] Mobile viewport shows single-column fallback layout
- [ ] No layout shift on initial render
- [ ] TypeScript types are properly defined

**Technical Notes**:
```tsx
// Layout structure
<div className="grid grid-cols-[auto_1fr_auto] h-screen">
  <TopBar /> {/* Fixed across all columns */}
  <LeftNav collapsed={leftNavCollapsed} />
  <MiddlePane />
  <RightPane collapsed={rightPaneCollapsed} />
</div>
```

**Files to Create**:
- `src/components/layout/DashboardShell.tsx`
- `src/components/layout/TopBar.tsx`
- `src/contexts/LayoutContext.tsx`
- `src/hooks/useLayoutState.ts`

---

## Issue 1.2: Left Navigation Panel - Structure & Toggle

**Title**: Left Navigation Panel - Structure & Toggle

**Priority**: P0 (Blocker)

**Effort Estimate**: L (Large - 5-8 days)

**Labels**: `frontend`, `navigation`, `ux`, `mvp`

**Dependencies**: Issue 1.1 (Core Layout Shell)

**Description**:
Build the collapsible left navigation panel with icon-only and expanded states. This is the primary navigation mechanism for the entire dashboard.

**Navigation Items**:
1. Activity - `RectangleStackIcon` - `/dashboard` or `/dashboard/activity`
2. Digests - `EnvelopeIcon` - `/dashboard/digests`
3. Children - `UserGroupIcon` - `/dashboard/children`
4. Recipients - `UsersIcon` - `/dashboard/recipients`
5. Groups - `Squares2X2Icon` - `/dashboard/groups`
6. Drafts - `DocumentTextIcon` - `/dashboard/drafts`
7. Settings - `Cog6ToothIcon` - `/dashboard/settings`

**Technical Requirements**:
- Collapsed width: 64px (icon-only)
- Expanded width: 240px (icon + label)
- Smooth transition: `transition: width 200ms ease-out`
- Active state: `bg-primary-50 border-l-4 border-primary-600`
- Tooltips in collapsed state using Radix UI or Headless UI

**Tasks**:
- [ ] Create `LeftNavigation` component with collapse/expand states
- [ ] Implement all 7 nav items with Heroicons
- [ ] Build toggle button at bottom of navigation panel
- [ ] Implement smooth width transition animation
- [ ] Add tooltips for collapsed state (icon-only mode)
- [ ] Implement active state highlighting based on current route
- [ ] Persist collapse state to localStorage
- [ ] Add keyboard navigation (Tab, Arrow keys, Enter)
- [ ] Implement proper ARIA labels and roles

**Acceptance Criteria**:
- [ ] Nav toggles smoothly between 64px and 240px widths
- [ ] Tooltips appear on hover when in collapsed state
- [ ] Active route is highlighted with primary color
- [ ] Collapse state persists across browser sessions
- [ ] All keyboard navigation works (Tab, Enter, Arrow keys)
- [ ] Screen readers announce navigation items correctly
- [ ] Hover states provide visual feedback
- [ ] Focus indicators meet WCAG AA standards (3:1 contrast)

**Technical Notes**:
```tsx
// Nav item structure
interface NavItem {
  id: string
  label: string
  icon: React.ComponentType
  href: string
  badge?: number // For notification counts
}

// Active state styling
className={cn(
  'flex items-center gap-3 px-3 py-2 rounded-lg transition-colors',
  isActive && 'bg-primary-50 border-l-4 border-primary-600 text-primary-700',
  !isActive && 'text-neutral-700 hover:bg-neutral-100'
)}
```

**Files to Create**:
- `src/components/layout/LeftNavigation.tsx`
- `src/components/layout/NavItem.tsx`
- `src/components/layout/NavToggleButton.tsx`
- `src/lib/constants/navigationItems.ts`

**Design Assets Needed**:
- Icon set from Heroicons
- Spacing and padding specifications
- Hover/active state colors

---

## Issue 1.3: Routing & Navigation State Management

**Title**: Routing & Navigation State Management

**Priority**: P0 (Blocker)

**Effort Estimate**: M (Medium - 3-5 days)

**Labels**: `frontend`, `routing`, `state-management`, `mvp`

**Dependencies**: Issue 1.2 (Left Navigation Panel)

**Description**:
Implement client-side routing with URL preservation and comprehensive state management. Ensure browser back/forward buttons work correctly and URLs are shareable.

**Route Mapping**:
- `/dashboard` or `/dashboard/activity` → Activity feed view
- `/dashboard/digests` → Digests compilation view
- `/dashboard/children` → Children management view
- `/dashboard/recipients` → Recipients management view
- `/dashboard/groups` → Groups management view
- `/dashboard/drafts` → Draft updates view
- `/dashboard/settings` → Settings/Profile view

**Technical Requirements**:
- Use Next.js App Router (`usePathname`, `useRouter`)
- Preserve URL search params across navigation
- Implement route prefetching for performance
- Sync active nav item with URL pathname
- Support programmatic navigation from anywhere in the app

**Tasks**:
- [ ] Set up route mapping configuration
- [ ] Implement Next.js App Router navigation hooks
- [ ] Create navigation state context (`NavigationContext`)
- [ ] Add URL parameter preservation logic
- [ ] Implement programmatic navigation helpers
- [ ] Add route transition animations (fade/slide)
- [ ] Create `useNavigationState` custom hook
- [ ] Implement route guards if needed
- [ ] Add loading states during route transitions

**Acceptance Criteria**:
- [ ] Clicking nav items updates URL correctly
- [ ] Direct URL access works (deep linking)
- [ ] Browser back/forward buttons work correctly
- [ ] Active nav item always syncs with current URL
- [ ] Search params are preserved across navigation
- [ ] Route prefetching improves perceived performance
- [ ] Transition animations are smooth (60fps)
- [ ] No flash of incorrect content during navigation

**Technical Notes**:
```tsx
// Navigation state hook
const useNavigationState = () => {
  const pathname = usePathname()
  const router = useRouter()

  const navigate = (path: string, preserveParams = true) => {
    // Implementation
  }

  return { pathname, navigate, activeView }
}
```

**Files to Create**:
- `src/contexts/NavigationContext.tsx`
- `src/hooks/useNavigationState.ts`
- `src/lib/routing/navigationHelpers.ts`
- `src/lib/constants/routes.ts`

---

## Issue 1.4: Middle Pane - Content Router

**Title**: Middle Pane - Content Router

**Priority**: P0 (Blocker)

**Effort Estimate**: M (Medium - 4-6 days)

**Labels**: `frontend`, `routing`, `content`, `mvp`

**Dependencies**: Issue 1.3 (Routing & Navigation State)

**Description**:
Build the dynamic content area that renders different views based on the selected navigation item. This is the main content area where users interact with features.

**Content Views to Support**:
1. **Activity**: `ActivityFeedView` - Updates timeline with filtering
2. **Digests**: `DigestsView` - Digest compilation and history
3. **Children**: `ChildrenView` - Child management interface
4. **Recipients**: `RecipientsView` - Recipient management
5. **Groups**: `GroupsView` - Group management
6. **Drafts**: `DraftsView` - Draft updates management
7. **Settings**: `SettingsView` - User settings and profile

**Technical Requirements**:
- Use React Suspense for async content loading
- Implement view-level scroll containers
- Cache scroll positions per view
- Smooth content transitions
- Loading states for async operations

**Tasks**:
- [ ] Create `MiddlePane` wrapper component
- [ ] Implement content router based on active navigation
- [ ] Add loading states for content transitions (Suspense)
- [ ] Implement scroll restoration per view
- [ ] Add page transition animations (fade-in)
- [ ] Migrate existing page components into middle pane views
- [ ] Create view-level error boundaries
- [ ] Implement scroll position caching
- [ ] Add empty states for each view

**Acceptance Criteria**:
- [ ] Content updates smoothly when navigation changes
- [ ] Scroll position is maintained when returning to a view
- [ ] Loading states display during async operations
- [ ] All existing functionality is preserved after migration
- [ ] No layout shift during content loading
- [ ] Error boundaries catch and display errors gracefully
- [ ] Transitions are smooth (60fps)
- [ ] Views are keyboard-accessible

**Technical Notes**:
```tsx
// Middle pane structure
<MiddlePane>
  <Suspense fallback={<ViewLoadingState />}>
    {activeView === 'activity' && <ActivityFeedView />}
    {activeView === 'digests' && <DigestsView />}
    {/* ... other views */}
  </Suspense>
</MiddlePane>

// Scroll restoration
useEffect(() => {
  scrollPositions.current[activeView] = scrollY
  return () => {
    window.scrollTo(0, scrollPositions.current[activeView] || 0)
  }
}, [activeView])
```

**Files to Create**:
- `src/components/layout/MiddlePane.tsx`
- `src/components/views/ActivityFeedView.tsx`
- `src/components/views/DigestsView.tsx`
- `src/components/views/ChildrenView.tsx`
- `src/components/views/RecipientsView.tsx`
- `src/components/views/GroupsView.tsx`
- `src/components/views/DraftsView.tsx`
- `src/components/views/SettingsView.tsx`
- `src/hooks/useScrollRestoration.ts`

**Migration Notes**:
- Move content from `src/app/dashboard/page.tsx` to `ActivityFeedView`
- Preserve all existing functionality during migration
- Ensure data fetching still works correctly

---

## Issue 1.5: Right Pane - Base Structure & Collapse

**Title**: Right Pane - Base Structure & Collapse

**Priority**: P1 (High)

**Effort Estimate**: M (Medium - 3-5 days)

**Labels**: `frontend`, `layout`, `ux`, `mvp`

**Dependencies**: Issue 1.1 (Core Layout Shell)

**Description**:
Build the collapsible right sidebar that will contain contextual content, filters, and quick actions. This pane provides context-aware tools for the current view.

**Technical Requirements**:
- Fixed width: 320px when expanded
- Collapsed width: 0px (hidden)
- Smooth transition: `transition: width 200ms ease-out`
- Collapse button on left edge with icons (`ChevronRightIcon` / `ChevronLeftIcon`)
- Persist collapse state to localStorage

**Tasks**:
- [ ] Create `RightPane` component with collapse functionality
- [ ] Implement fixed width (320px) with smooth collapse to 0px
- [ ] Add collapse toggle button on left edge of pane
- [ ] Implement smooth transition animation
- [ ] Add empty/placeholder state for collapsed pane
- [ ] Persist collapse state to localStorage
- [ ] Add resize handle for future width adjustment capability
- [ ] Ensure middle pane reflows to fill space when collapsed
- [ ] Add proper z-index layering

**Acceptance Criteria**:
- [ ] Right pane toggles smoothly between 320px and 0px
- [ ] Collapse button is accessible and clearly visible
- [ ] Collapse state persists across browser sessions
- [ ] Content in middle pane reflows gracefully when right pane toggles
- [ ] Middle pane expands to fill available space when right pane collapses
- [ ] No horizontal scrolling occurs at any screen size
- [ ] Button has proper hover and focus states
- [ ] Keyboard shortcut (⌘. / Ctrl+.) toggles right pane

**Technical Notes**:
```tsx
// Right pane structure
<aside className={cn(
  'border-l border-neutral-200 transition-all duration-200 ease-out',
  collapsed ? 'w-0' : 'w-80'
)}>
  <button
    onClick={toggleCollapse}
    className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1/2"
  >
    {collapsed ? <ChevronLeftIcon /> : <ChevronRightIcon />}
  </button>
  {!collapsed && <RightPaneContent />}
</aside>
```

**Files to Create**:
- `src/components/layout/RightPane.tsx`
- `src/components/layout/RightPaneToggle.tsx`
- `src/hooks/useRightPaneState.ts`

---

## Issue 1.6: Right Pane - Activity View Context

**Title**: Right Pane - Activity View Context

**Priority**: P1 (High)

**Effort Estimate**: L (Large - 5-7 days)

**Labels**: `frontend`, `filters`, `search`, `ux`, `mvp`

**Dependencies**: Issue 1.5 (Right Pane Base Structure)

**Description**:
Implement contextual content for the Activity feed view in the right pane. This includes filters, search controls, quick stats, AI suggestions, and quick actions.

**Right Pane Sections for Activity View**:
1. **Filters Panel**
   - Date range picker
   - Child filter (multi-select)
   - Update type filter (photo, video, text, milestone)
   - Clear all filters button

2. **Quick Stats Card**
   - Total updates count
   - Sent digests count
   - Active recipients count
   - Updates this week

3. **AI Suggestions Panel**
   - 2-3 AI-generated prompt cards
   - Thumbnail preview
   - One-click apply

4. **Quick Actions**
   - "Create Update" button (opens modal)
   - "Compile Digest" button

**Technical Requirements**:
- Filter state syncs with middle pane content
- Debounced search input (300ms)
- Filter state persists to URL params for sharing
- Real-time stats updates

**Tasks**:
- [ ] Create `ActivityRightPane` component
- [ ] Build filters section with date range, child, and type filters
- [ ] Implement search/filter state management
- [ ] Display quick stats with live data
- [ ] Add AI prompt suggestions panel (reuse existing components)
- [ ] Implement "Create Update" quick action button
- [ ] Add "Clear Filters" functionality
- [ ] Sync filter state with URL search params
- [ ] Debounce search input for performance
- [ ] Add loading states for stats

**Acceptance Criteria**:
- [ ] Filters update activity feed in real-time
- [ ] Stats are accurate and update dynamically
- [ ] AI suggestions are contextually relevant
- [ ] Quick actions trigger correct modals/flows
- [ ] Filter state is preserved in URL (shareable)
- [ ] Search input is debounced (no excessive re-renders)
- [ ] Clear filters button resets all filters at once
- [ ] UI responds immediately to filter changes

**Technical Notes**:
```tsx
// Filter state management
interface ActivityFilters {
  dateRange: { start: Date; end: Date } | null
  childIds: string[]
  updateTypes: UpdateType[]
  searchQuery: string
}

// Sync with URL
useEffect(() => {
  const params = new URLSearchParams()
  if (filters.searchQuery) params.set('q', filters.searchQuery)
  if (filters.childIds.length) params.set('children', filters.childIds.join(','))
  // ... update URL
}, [filters])
```

**Files to Create**:
- `src/components/layout/rightPane/ActivityRightPane.tsx`
- `src/components/layout/rightPane/FiltersPanel.tsx`
- `src/components/layout/rightPane/QuickStatsCard.tsx`
- `src/components/layout/rightPane/QuickActionsPanel.tsx`
- `src/hooks/useActivityFilters.ts`

**Design Considerations**:
- Keep filters simple and intuitive
- Provide visual feedback when filters are active
- Show filter count badges

---

## Issue 1.7: Right Pane - Other View Contexts

**Title**: Right Pane - Other View Contexts

**Priority**: P2 (Medium)

**Effort Estimate**: XL (Extra Large - 8-12 days)

**Labels**: `frontend`, `contextual-ui`, `ux`

**Dependencies**: Issue 1.6 (Activity View Context)

**Description**:
Implement contextual right pane content for all remaining navigation views (Digests, Children, Recipients, Groups, Drafts, Settings). Each view gets custom context-aware content.

**Right Pane Content by View**:

### 1. Digests View
- **Digest Preview**: Live preview of current digest being compiled
- **Recent Digests**: List of last 5 sent digests with dates
- **Schedule Controls**: Quick schedule/send actions
- **Recipient Count**: How many recipients will receive

### 2. Children View
- **Selected Child Details**: When a child is selected, show details
- **Milestones Timeline**: Recent milestones for selected child
- **Quick Stats**: Total updates per child, age, birthday
- **Quick Actions**: "Add Child", "Edit Child"

### 3. Recipients View
- **Selected Recipient Details**: Contact info, preferences
- **Preference Summary**: Email frequency, content preferences
- **Group Memberships**: Which groups this recipient belongs to
- **Recent Activity**: Last digest sent, last response

### 4. Groups View
- **Group Member List**: Members in selected group
- **Preference Overview**: Aggregate preference settings
- **Quick Stats**: Member count, active members
- **Quick Actions**: "Add Member", "Edit Group"

### 5. Drafts View
- **Draft Metadata**: Created date, last modified
- **Scheduled Time**: If scheduled, show send time
- **Recipient Preview**: Who will receive this draft
- **Quick Actions**: "Edit Draft", "Send Now", "Schedule"

### 6. Settings View
- **Quick Toggles**: Frequently used settings toggles
- **Recent Changes Log**: History of setting changes
- **Account Info**: Plan details, storage usage
- **Help Links**: Quick access to docs and support

**Tasks**:
- [ ] Create `DigestsRightPane` component
- [ ] Create `ChildrenRightPane` component
- [ ] Create `RecipientsRightPane` component
- [ ] Create `GroupsRightPane` component
- [ ] Create `DraftsRightPane` component
- [ ] Create `SettingsRightPane` component
- [ ] Implement selection state sharing via context
- [ ] Build shared components (DetailCard, StatCard, etc.)
- [ ] Add empty states for each view
- [ ] Implement bidirectional data updates
- [ ] Add loading states for async content

**Acceptance Criteria**:
- [ ] Each view shows contextually relevant content in right pane
- [ ] Interactive elements in right pane correctly affect middle pane
- [ ] Data updates are bidirectional (right pane ↔ middle pane)
- [ ] Empty states are handled gracefully
- [ ] Selection state persists during navigation within view
- [ ] Loading states display during data fetching
- [ ] All quick actions work correctly

**Technical Notes**:
```tsx
// Shared selection context
interface ViewSelectionContext {
  selectedId: string | null
  setSelectedId: (id: string | null) => void
}

// Right pane content router
const RightPaneContent = () => {
  switch (activeView) {
    case 'activity': return <ActivityRightPane />
    case 'digests': return <DigestsRightPane />
    case 'children': return <ChildrenRightPane />
    // ... etc
  }
}
```

**Files to Create**:
- `src/components/layout/rightPane/DigestsRightPane.tsx`
- `src/components/layout/rightPane/ChildrenRightPane.tsx`
- `src/components/layout/rightPane/RecipientsRightPane.tsx`
- `src/components/layout/rightPane/GroupsRightPane.tsx`
- `src/components/layout/rightPane/DraftsRightPane.tsx`
- `src/components/layout/rightPane/SettingsRightPane.tsx`
- `src/components/layout/rightPane/shared/DetailCard.tsx`
- `src/components/layout/rightPane/shared/StatCard.tsx`
- `src/contexts/ViewSelectionContext.tsx`

---

## Issue 1.8: Search Functionality in Top Bar

**Title**: Global Search in Top Bar with Command Palette

**Priority**: P1 (High)

**Effort Estimate**: M (Medium - 4-6 days)

**Labels**: `frontend`, `search`, `ux`, `accessibility`

**Dependencies**: Issue 1.1 (Core Layout Shell)

**Description**:
Implement global search in the top bar with keyboard shortcut activation (⌘K / Ctrl+K) and command palette-style interface. Search across updates, children, recipients, and groups.

**Search Categories**:
- **Updates**: Search by title, content text
- **Children**: Search by child name
- **Recipients**: Search by name, email
- **Groups**: Search by group name
- **Drafts**: Search by title, content

**Technical Requirements**:
- Keyboard shortcut: ⌘K (Mac) / Ctrl+K (Windows/Linux)
- Fuzzy search using Fuse.js
- Debounced input (200ms)
- Recent searches stored in localStorage (max 10)
- Headless UI Combobox component for accessibility

**Tasks**:
- [ ] Create `GlobalSearch` component in top bar
- [ ] Implement search input with keyboard shortcut listener
- [ ] Add search dropdown/modal with results
- [ ] Implement fuzzy search using Fuse.js across all content types
- [ ] Add recent searches section (localStorage-backed)
- [ ] Display search results grouped by category
- [ ] Navigate to selected result (close search, route to item)
- [ ] Add keyboard navigation (arrows, enter, escape)
- [ ] Implement search highlighting in results
- [ ] Add "No results" empty state

**Acceptance Criteria**:
- [ ] Search activates with ⌘K (Mac) or Ctrl+K (Windows/Linux)
- [ ] Results appear as user types (debounced 200ms)
- [ ] Clicking a result navigates to the correct view and closes search
- [ ] Recent searches are saved and displayed
- [ ] Escape key closes search modal
- [ ] Keyboard navigation works (up/down arrows, enter)
- [ ] Search works across all content types
- [ ] Results are grouped by category (Updates, Children, etc.)
- [ ] Search is accessible via screen readers

**Technical Notes**:
```tsx
// Search implementation
import Fuse from 'fuse.js'

const fuse = new Fuse(searchableItems, {
  keys: ['title', 'content', 'name', 'email'],
  threshold: 0.3,
  includeScore: true
})

// Keyboard shortcut
useEffect(() => {
  const handleKeyDown = (e: KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
      e.preventDefault()
      setSearchOpen(true)
    }
  }
  window.addEventListener('keydown', handleKeyDown)
  return () => window.removeEventListener('keydown', handleKeyDown)
}, [])
```

**Files to Create**:
- `src/components/layout/GlobalSearch.tsx`
- `src/components/layout/SearchResults.tsx`
- `src/components/layout/SearchResultItem.tsx`
- `src/hooks/useGlobalSearch.ts`
- `src/lib/search/fuseConfig.ts`
- `src/lib/search/searchableContent.ts`

**Dependencies to Install**:
- `fuse.js` for fuzzy search
- `@headlessui/react` Combobox component

---

## Issue 1.9: Responsive Breakpoint Handling

**Title**: Responsive Breakpoint Handling

**Priority**: P1 (High)

**Effort Estimate**: S (Small - 2-3 days)

**Labels**: `frontend`, `responsive`, `ux`

**Dependencies**: Issues 1.1, 1.2, 1.5 (All layout components)

**Description**:
Handle the 3-pane layout gracefully at various screen sizes, with automatic adjustments and fallbacks for smaller viewports.

**Breakpoint Strategy**:
- **< 1024px (below lg)**: Show existing mobile layout (fallback)
- **1024px - 1279px (lg)**: Show 2-pane layout (left nav + middle, right pane auto-collapsed)
- **≥ 1280px (xl and above)**: Show full 3-pane layout

**Technical Requirements**:
- Use Tailwind breakpoints (`lg:` and `xl:`)
- Implement `useMediaQuery` hook for JS-based logic
- Add CSS `@container` queries for future-proofing
- Auto-collapse right pane below 1280px

**Tasks**:
- [ ] Implement responsive breakpoint logic
- [ ] Hide 3-pane layout below 1024px (show mobile fallback)
- [ ] Auto-collapse right pane below 1280px
- [ ] Add optional warning banner for unsupported screen sizes
- [ ] Test layout at breakpoints: 1024px, 1280px, 1440px, 1920px
- [ ] Ensure no horizontal scrolling at any size
- [ ] Create `useMediaQuery` hook for JS-based responsive logic
- [ ] Persist auto-collapse states appropriately

**Acceptance Criteria**:
- [ ] Layout adapts smoothly at all breakpoints
- [ ] No horizontal scrolling occurs at any screen size
- [ ] Content remains accessible at all viewport sizes
- [ ] Auto-collapse states are saved to localStorage
- [ ] Mobile fallback works correctly below 1024px
- [ ] Middle pane always fills available space
- [ ] No layout shift when resizing window

**Technical Notes**:
```tsx
// Responsive logic
const useMediaQuery = (query: string) => {
  const [matches, setMatches] = useState(false)

  useEffect(() => {
    const media = window.matchMedia(query)
    setMatches(media.matches)

    const listener = () => setMatches(media.matches)
    media.addEventListener('change', listener)
    return () => media.removeEventListener('change', listener)
  }, [query])

  return matches
}

// Usage
const isLargeScreen = useMediaQuery('(min-width: 1024px)')
const isXLScreen = useMediaQuery('(min-width: 1280px)')
```

**Files to Create**:
- `src/hooks/useMediaQuery.ts`
- `src/components/layout/ResponsiveWarning.tsx` (optional)

**Test Cases**:
- Test at 1023px (mobile fallback)
- Test at 1024px (2-pane shows)
- Test at 1279px (right pane auto-collapsed)
- Test at 1280px (full 3-pane shows)
- Test at 1920px (full 3-pane)

---

## Issue 1.10: Keyboard Navigation & Accessibility

**Title**: Keyboard Navigation & Accessibility (WCAG 2.1 AA)

**Priority**: P1 (High)

**Effort Estimate**: M (Medium - 4-5 days)

**Labels**: `frontend`, `accessibility`, `a11y`, `ux`

**Dependencies**: Issues 1.2 (Left Nav), 1.8 (Search)

**Description**:
Ensure the entire 3-pane layout is fully keyboard-navigable and meets WCAG 2.1 AA accessibility standards. Add keyboard shortcuts, focus management, and screen reader support.

**Keyboard Shortcuts**:
- **⌘K / Ctrl+K**: Open global search
- **⌘B / Ctrl+B**: Toggle left navigation collapse
- **⌘. / Ctrl+.**: Toggle right pane collapse
- **1-7**: Navigate to nav items (Activity, Digests, Children, etc.)
- **Esc**: Close modals/search
- **Tab / Shift+Tab**: Navigate focus forward/backward
- **Enter**: Activate focused element
- **Arrow Keys**: Navigate within menus and lists

**WCAG 2.1 AA Requirements**:
- Minimum contrast ratio: 4.5:1 for text, 3:1 for UI components
- All interactive elements keyboard accessible
- Focus indicators visible (3:1 contrast)
- Logical focus order
- Screen reader compatibility (NVDA, VoiceOver)
- Skip links for main content

**Tasks**:
- [ ] Implement focus management across all three panes
- [ ] Add keyboard shortcuts and document them
- [ ] Test with screen readers (NVDA on Windows, VoiceOver on Mac)
- [ ] Add skip links ("Skip to main content")
- [ ] Ensure proper ARIA labels and roles throughout
- [ ] Implement focus trap in modals and search
- [ ] Add visible focus indicators (ring, outline)
- [ ] Test tab order and ensure it's logical
- [ ] Add keyboard shortcuts help modal (? key)
- [ ] Ensure color contrast meets WCAG AA standards

**Acceptance Criteria**:
- [ ] All interactive elements are keyboard accessible
- [ ] Focus order is logical (left nav → middle pane → right pane)
- [ ] Screen reader announces navigation changes
- [ ] Focus indicators meet WCAG 3:1 contrast requirement
- [ ] Skip links work correctly and are visible on focus
- [ ] All modals trap focus (can't tab outside)
- [ ] Keyboard shortcuts work as documented
- [ ] No keyboard traps (can always tab out)
- [ ] ARIA labels are descriptive and accurate

**Technical Notes**:
```tsx
// Focus trap for modals
import { useFocusTrap } from '@/hooks/useFocusTrap'

const Modal = () => {
  const trapRef = useFocusTrap()

  return (
    <div ref={trapRef} role="dialog" aria-modal="true">
      {/* Modal content */}
    </div>
  )
}

// Skip link
<a href="#main-content" className="sr-only focus:not-sr-only">
  Skip to main content
</a>
```

**Files to Create**:
- `src/hooks/useFocusTrap.ts`
- `src/hooks/useKeyboardShortcuts.ts`
- `src/components/accessibility/SkipLinks.tsx`
- `src/components/accessibility/KeyboardShortcutsHelp.tsx`

**Testing Checklist**:
- [ ] Test with NVDA screen reader (Windows)
- [ ] Test with VoiceOver screen reader (Mac)
- [ ] Test all keyboard shortcuts
- [ ] Verify focus indicators are visible
- [ ] Check color contrast with tools
- [ ] Test focus trapping in modals

**Dependencies to Install**:
- `react-focus-lock` (optional, for focus trapping)

---

## Issue 1.11: Performance Optimization & Code Splitting

**Title**: Performance Optimization & Code Splitting

**Priority**: P2 (Medium)

**Effort Estimate**: M (Medium - 4-5 days)

**Labels**: `frontend`, `performance`, `optimization`

**Dependencies**: Issues 1.4 (Middle Pane), 1.7 (Right Pane Contexts)

**Description**:
Optimize the 3-pane layout for performance through code splitting, lazy loading, memoization, and bundle size reduction. Target excellent Core Web Vitals scores.

**Performance Targets**:
- **Initial bundle**: < 200KB gzipped
- **Time to Interactive (TTI)**: < 3s on 3G
- **First Contentful Paint (FCP)**: < 1.5s
- **Largest Contentful Paint (LCP)**: < 2.5s
- **Cumulative Layout Shift (CLS)**: < 0.1
- **Lighthouse Performance**: > 90

**Optimization Strategies**:
1. Route-based code splitting
2. Lazy loading for right pane content
3. React.memo for expensive components
4. Virtual scrolling for long lists
5. Image optimization
6. Prefetching for next likely navigation

**Tasks**:
- [ ] Implement route-based code splitting with `next/dynamic`
- [ ] Add lazy loading for right pane context components
- [ ] Optimize re-renders with `React.memo` and `useMemo`
- [ ] Implement virtual scrolling for activity feed and lists
- [ ] Add prefetching for likely next routes
- [ ] Optimize images with Next.js Image component
- [ ] Add performance monitoring (Vercel Analytics)
- [ ] Analyze bundle size with `@next/bundle-analyzer`
- [ ] Remove unused dependencies
- [ ] Implement service worker for caching (optional)

**Acceptance Criteria**:
- [ ] Lighthouse Performance score > 90
- [ ] No layout shifts during navigation (CLS < 0.1)
- [ ] Smooth 60fps animations throughout
- [ ] Bundle size meets target (< 200KB gzipped)
- [ ] Core Web Vitals all in "Good" range
- [ ] Time to Interactive < 3s on 3G
- [ ] Images are lazy-loaded and optimized
- [ ] Bundle analyzer shows no large unexpected dependencies

**Technical Notes**:
```tsx
// Code splitting with next/dynamic
const ActivityRightPane = dynamic(
  () => import('@/components/layout/rightPane/ActivityRightPane'),
  { loading: () => <RightPaneSkeleton /> }
)

// Memoization
const ExpensiveComponent = React.memo(({ data }) => {
  const computed = useMemo(() => heavyComputation(data), [data])
  return <div>{computed}</div>
})

// Virtual scrolling
import { VariableSizeList } from 'react-window'
```

**Files to Create/Update**:
- `next.config.js` - Add bundle analyzer
- `src/hooks/useVirtualScroll.ts`
- Performance monitoring integration

**Tools to Use**:
- `@next/bundle-analyzer`
- `react-window` for virtual scrolling
- Vercel Analytics for monitoring
- Lighthouse CI for automated testing

**Monitoring**:
- Set up Vercel Analytics
- Monitor Core Web Vitals in production
- Set up alerts for performance regressions

---

## Issue 1.12: Migration & Testing

**Title**: Component Migration & Comprehensive Testing

**Priority**: P0 (Blocker)

**Effort Estimate**: L (Large - 6-8 days)

**Labels**: `frontend`, `testing`, `migration`, `qa`

**Dependencies**: All previous issues (1.1-1.11)

**Description**:
Migrate all existing dashboard page components to the new 3-pane layout and perform comprehensive testing across all user flows, browsers, and devices.

**Components to Migrate**:
1. **Activity Feed**:
   - `PersonalizedWelcome` → Activity view
   - `UpdatesList` → Activity view
   - `DigestStats` → Activity view
   - `PromptFeed` → Activity view

2. **Children Management**:
   - `ChildManager` → Children view
   - Child cards and forms

3. **Recipients Management**:
   - `RecipientManager` → Recipients view
   - Recipient cards and forms

4. **Groups Management**:
   - `GroupManager` → Groups view
   - Group cards and settings

5. **Profile/Settings**:
   - `ProfileManager` → Settings view
   - All settings sections

6. **Remove Old Components**:
   - Old `Navigation` component
   - Old dashboard page layout

**Testing Strategy**:
- **Unit Tests**: Individual components
- **Integration Tests**: Navigation flows, filter interactions
- **E2E Tests**: Critical user journeys (create update, manage recipients, etc.)
- **Visual Regression**: Layout screenshots across breakpoints
- **Cross-Browser**: Chrome, Firefox, Safari, Edge
- **Real Data**: Test with production-like data volumes

**Tasks**:
- [ ] Migrate PersonalizedWelcome to Activity view
- [ ] Migrate UpdatesList to Activity view
- [ ] Migrate DigestStats to Activity/Digests views
- [ ] Migrate ChildManager to Children view
- [ ] Migrate RecipientManager to Recipients view
- [ ] Migrate GroupManager to Groups view
- [ ] Migrate ProfileManager to Settings view
- [ ] Remove old Navigation component
- [ ] Update all component imports
- [ ] Update routing configuration
- [ ] Write unit tests for new components
- [ ] Write integration tests for navigation flows
- [ ] Write E2E tests for critical user journeys
- [ ] Perform cross-browser testing (Chrome, Firefox, Safari, Edge)
- [ ] Test with real/production-like data
- [ ] Create migration documentation
- [ ] Update user-facing documentation

**Acceptance Criteria**:
- [ ] All existing features work in new layout
- [ ] No broken links or navigation issues
- [ ] User preferences and data are preserved
- [ ] Data loads correctly in all views
- [ ] All tests pass (unit, integration, E2E)
- [ ] Cross-browser compatibility verified
- [ ] Performance meets targets
- [ ] Documentation is updated
- [ ] Rollback plan is documented

**Test Cases (Critical User Journeys)**:
1. **Create and Send Update**:
   - Navigate to Activity → Click "Create Update" → Fill form → Send → Verify in feed

2. **Filter Activity Feed**:
   - Use right pane filters → Verify middle pane updates → Clear filters → Verify reset

3. **Manage Recipients**:
   - Navigate to Recipients → Add recipient → Edit recipient → Delete recipient

4. **Manage Groups**:
   - Navigate to Groups → Create group → Add members → Edit preferences

5. **Global Search**:
   - Press ⌘K → Search for update → Click result → Verify navigation

6. **Keyboard Navigation**:
   - Tab through all interactive elements → Verify focus order → Test shortcuts

**Technical Notes**:
```tsx
// Example migration
// Before (old dashboard page)
<div>
  <Navigation />
  <PersonalizedWelcome />
  <UpdatesList />
</div>

// After (new 3-pane layout)
<DashboardShell>
  <LeftNavigation />
  <MiddlePane>
    <ActivityFeedView>
      <PersonalizedWelcome />
      <UpdatesList />
    </ActivityFeedView>
  </MiddlePane>
  <RightPane>
    <ActivityRightPane />
  </RightPane>
</DashboardShell>
```

**Files to Update**:
- `src/app/dashboard/page.tsx` - Use new DashboardShell
- All view components
- Test files

**Files to Delete**:
- Old `src/components/layout/Navigation.tsx` (replaced by LeftNavigation)

**Testing Tools**:
- Vitest or Jest for unit tests
- React Testing Library for component tests
- Playwright or Cypress for E2E tests
- Percy or Chromatic for visual regression

**Documentation to Update**:
- Component usage docs
- Navigation flow diagrams
- Architecture documentation

---

## Rollout Plan

### Phase 1: Foundation (Weeks 1-2)
**Issues**: 1.1, 1.2, 1.3
- Core layout shell
- Left navigation
- Routing setup
**Goal**: Basic 3-pane structure with working navigation

### Phase 2: Content (Weeks 3-4)
**Issues**: 1.4, 1.5, 1.6
- Middle pane content routing
- Right pane base structure
- Activity view context
**Goal**: Functional activity feed with filters

### Phase 3: Features (Weeks 5-6)
**Issues**: 1.7, 1.8, 1.9, 1.10
- All right pane contexts
- Global search
- Responsive handling
- Accessibility
**Goal**: Complete feature set

### Phase 4: Polish & Ship (Weeks 7-8)
**Issues**: 1.11, 1.12
- Performance optimization
- Migration and testing
**Goal**: Production-ready deployment

---

## Success Metrics
**User Experience**:
- Time to complete common tasks (create update, filter feed) < 10s
- User satisfaction score > 4.5/5
- Navigation discoverability > 90%

**Performance**:
- Lighthouse Performance score > 90
- Core Web Vitals all "Good"
- Bundle size < 200KB gzipped

**Accessibility**:
- WCAG 2.1 AA compliance: 100%
- Keyboard navigation coverage: 100%
- Screen reader compatibility: NVDA, VoiceOver

**Quality**:
- Test coverage > 80%
- Zero critical bugs
- Cross-browser compatibility: Chrome, Firefox, Safari, Edge

---

## Risk Mitigation

**Risk**: Migration breaks existing functionality
**Mitigation**:
- Feature flag for gradual rollout
- Comprehensive testing before migration
- Rollback plan documented

**Risk**: Performance regression with 3-pane layout
**Mitigation**:
- Code splitting and lazy loading
- Performance monitoring from day 1
- Bundle size limits enforced

**Risk**: Accessibility issues in new layout
**Mitigation**:
- Accessibility testing from issue 1.1
- Screen reader testing throughout
- WCAG compliance checkpoints

**Risk**: User confusion with new navigation
**Mitigation**:
- User testing before launch
- In-app tooltips and help
- Migration guide for users

---

## Technical Stack

**Core**:
- Next.js 14+ (App Router)
- React 18+
- TypeScript
- Tailwind CSS

**UI Components**:
- Headless UI
- Radix UI (optional)
- Heroicons

**Search**:
- Fuse.js (fuzzy search)

**Performance**:
- next/dynamic (code splitting)
- react-window (virtual scrolling)

**Testing**:
- Vitest/Jest
- React Testing Library
- Playwright/Cypress

**Monitoring**:
- Vercel Analytics
- Lighthouse CI
