# Linear Feature: Mobile Bottom Navigation Layout (Future Scope)

**Feature Title**: Mobile Bottom Navigation - Mobile-First Experience

**Feature Description**:
Create a mobile-optimized navigation experience for Tribe with bottom navigation bar, floating action button (FAB), and gesture-based interactions. This provides mobile users with:
- Sticky bottom navigation with 4 main sections + FAB
- Elevated central FAB for quick "Create Update" access
- Full-screen content sections with tabbed sub-navigation
- Swipe gestures for natural mobile interactions
- PWA capabilities for app-like experience

**Priority**: P2 (Future Scope)

**Target Release**: Q3 2025 (Post Desktop MVP)

**Project ID**: 76e4b902-0484-480e-bd8a-c151c003211f

**Dependencies**: Feature 1 (Desktop 3-Pane Layout) must be complete

---

## Architecture Overview

### Mobile Layout Structure
1. **Slim Top Bar**: Logo, search icon, notifications (56px height)
2. **Main Content**: Full-screen single column, scrollable
3. **Bottom Navigation**: 4 icons + central elevated FAB (64px + safe area)
4. **Tabbed Sections**: Each main section has tabbed sub-navigation

### Navigation Structure
- **Home (Activity)**: Main feed, filters, stats (3 tabs)
- **Digests**: Upcoming, history, settings (3 tabs)
- **People**: Recipients, groups, invites (3 tabs)
- **FAB (Center)**: Create update action sheet
- **Settings**: Profile, notifications, preferences (3 tabs)

---

## Issue 2.1: Bottom Navigation Bar Component

**Title**: Bottom Navigation Bar with FAB

**Priority**: P2 (Future Scope)

**Effort Estimate**: M (Medium - 4-5 days)

**Labels**: `mobile`, `navigation`, `ux`, `future`

**Dependencies**: Feature 1 (Desktop 3-Pane Layout) complete

**Description**:
Build the sticky bottom navigation bar with 4 navigation items and a central elevated FAB (Floating Action Button) for quick "Create Update" access.

**Navigation Items**:
1. **Home (Activity)** - `HomeIcon` - `/dashboard`
2. **Digests** - `EnvelopeIcon` - `/dashboard/digests`
3. **People** - `UsersIcon` - `/dashboard/recipients`
4. **FAB (Create)** - `PlusIcon` - Elevated, primary color
5. **Settings** - `Cog6ToothIcon` - `/dashboard/settings`

**Design Specifications**:
- Bar height: 64px base + `env(safe-area-inset-bottom)`
- FAB size: 56px diameter
- FAB elevation: 8px shadow, translates up by 50%
- Active state: Primary color with label
- Inactive state: Neutral gray
- Touch targets: Minimum 44x44px

**Tasks**:
- [ ] Create `BottomNavigation` component
- [ ] Implement 4 navigation items with icons
- [ ] Build central FAB button with elevation styling
- [ ] Add active state highlighting (primary color)
- [ ] Implement haptic feedback on tap (iOS/Android via Capacitor)
- [ ] Ensure safe area handling for notched devices
- [ ] Add smooth transition animations between tabs
- [ ] Implement labels that appear on active tab
- [ ] Add proper z-index layering (FAB above bar)

**Acceptance Criteria**:
- [ ] Bottom bar is sticky at viewport bottom
- [ ] FAB is visually elevated above other icons
- [ ] Active state is clearly visible with color and label
- [ ] Safe area insets are respected on iOS/Android devices
- [ ] All touch targets are ≥ 44px (WCAG compliance)
- [ ] Haptic feedback works on supported devices
- [ ] No layout shift when changing tabs
- [ ] Smooth transitions between active states

**Technical Notes**:
```tsx
// Bottom navigation structure
<nav className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-neutral-200"
     style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
  <div className="flex items-center justify-around h-16">
    <NavItem icon={HomeIcon} label="Home" />
    <NavItem icon={EnvelopeIcon} label="Digests" />

    {/* Elevated FAB */}
    <button className="absolute left-1/2 -translate-x-1/2 -translate-y-1/2
                       w-14 h-14 bg-primary-600 rounded-full shadow-lg">
      <PlusIcon className="w-6 h-6 text-white" />
    </button>

    <NavItem icon={UsersIcon} label="People" />
    <NavItem icon={Cog6ToothIcon} label="Settings" />
  </div>
</nav>
```

**Haptic Feedback**:
```tsx
const triggerHaptic = () => {
  if ('vibrate' in navigator) {
    navigator.vibrate(10) // 10ms vibration
  }
}
```

**Files to Create**:
- `src/components/mobile/BottomNavigation.tsx`
- `src/components/mobile/BottomNavItem.tsx`
- `src/components/mobile/FABButton.tsx`
- `src/hooks/useHapticFeedback.ts`

**Design Considerations**:
- FAB should be the visual focal point
- Use subtle shadows for depth perception
- Active state should be immediately obvious
- Consider color-blind friendly indicators (icon + color + label)

---

## Issue 2.2: Mobile Top Bar

**Title**: Slim Mobile Top Bar

**Priority**: P2 (Future Scope)

**Effort Estimate**: S (Small - 2-3 days)

**Labels**: `mobile`, `navigation`, `ux`, `future`

**Dependencies**: Issue 2.1 (Bottom Navigation)

**Description**:
Build a slim mobile top bar with logo, search icon, notifications, and profile menu. Optionally implement scroll-to-hide behavior for more screen space.

**Top Bar Elements**:
- **Left**: Logo/Brand (tappable, goes to home)
- **Center**: Search icon (opens full-screen search)
- **Right**: Notifications bell, Profile avatar

**Design Specifications**:
- Bar height: 56px + `env(safe-area-inset-top)`
- Fixed position at top
- Optional: Hide on scroll down, show on scroll up
- Background: White with subtle shadow
- All icons: 24x24px, touch targets: 44x44px

**Tasks**:
- [ ] Create `MobileTopBar` component
- [ ] Add logo/brand on left side
- [ ] Add search icon button (opens full-screen search modal)
- [ ] Add notifications bell icon with badge support
- [ ] Add profile avatar button (opens slide-in menu)
- [ ] Implement scroll-to-hide behavior (optional)
- [ ] Ensure safe area handling for status bar
- [ ] Add proper z-index (above content, below modals)

**Acceptance Criteria**:
- [ ] Top bar is slim (56px) and fixed at top
- [ ] All icons have touch targets ≥ 44px
- [ ] Search icon opens full-screen search modal
- [ ] Profile avatar opens slide-in menu from right
- [ ] Notification badge displays unread count
- [ ] Safe area is respected on notched devices
- [ ] Scroll behavior feels natural (if implemented)

**Technical Notes**:
```tsx
// Scroll-to-hide behavior
const useScrollDirection = () => {
  const [scrollDirection, setScrollDirection] = useState<'up' | 'down'>('up')
  const [lastScroll, setLastScroll] = useState(0)

  useEffect(() => {
    const handleScroll = () => {
      const currentScroll = window.scrollY
      if (currentScroll > lastScroll && currentScroll > 50) {
        setScrollDirection('down')
      } else {
        setScrollDirection('up')
      }
      setLastScroll(currentScroll)
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [lastScroll])

  return scrollDirection
}

// Top bar component
<header className={cn(
  'fixed top-0 left-0 right-0 z-40 bg-white border-b transition-transform',
  scrollDirection === 'down' && 'translate-y-[-100%]'
)}
  style={{ paddingTop: 'env(safe-area-inset-top)' }}>
  {/* Content */}
</header>
```

**Files to Create**:
- `src/components/mobile/MobileTopBar.tsx`
- `src/components/mobile/NotificationBadge.tsx`
- `src/components/mobile/ProfileMenu.tsx`
- `src/hooks/useScrollDirection.ts`

---

## Issue 2.3: Tabbed Content Sections

**Title**: Tabbed Content Within Sections

**Priority**: P2 (Future Scope)

**Effort Estimate**: L (Large - 6-8 days)

**Labels**: `mobile`, `navigation`, `ux`, `gestures`, `future`

**Dependencies**: Issue 2.1 (Bottom Navigation)

**Description**:
Implement tabbed sub-navigation within each main section (Home, Digests, People, Settings) with swipe gesture support for natural mobile interaction.

**Tab Structure by Section**:

### Home (Activity)
1. **Feed**: Main activity feed
2. **Filters**: Advanced filtering UI
3. **Stats**: Quick stats and insights

### Digests
1. **Upcoming**: Scheduled digests
2. **History**: Sent digests archive
3. **Settings**: Digest preferences

### People
1. **Recipients**: Individual recipients
2. **Groups**: Recipient groups
3. **Invites**: Pending invitations

### Settings
1. **Profile**: User profile and account
2. **Notifications**: Notification preferences
3. **Preferences**: App preferences

**Design Specifications**:
- Tab bar: Fixed below top bar or scrollable with content
- Tab indicator: Bottom border (3px) in primary color
- Swipe threshold: 50px horizontal drag
- Swipe velocity: Consider for quick swipes
- Smooth animations: 200-300ms spring physics

**Tasks**:
- [ ] Create `MobileTabbedContent` component
- [ ] Implement tab indicators at top of section
- [ ] Add swipe gesture detection (left/right)
- [ ] Implement smooth tab switching animations
- [ ] Add tab state persistence per section
- [ ] Build content containers for each tab
- [ ] Add lazy loading for tab content
- [ ] Implement infinite swipe (wraps around)
- [ ] Add visual feedback during swipe gesture

**Acceptance Criteria**:
- [ ] Tabs switch smoothly on swipe (left/right)
- [ ] Tab indicators show active state clearly
- [ ] Content transitions feel natural (spring physics)
- [ ] Tab state persists when switching sections
- [ ] Swiping wraps around (last tab → first tab)
- [ ] Active tab is always visible in tab bar
- [ ] Loading states show when switching tabs
- [ ] No conflict with vertical scrolling

**Technical Notes**:
```tsx
// Swipe gesture implementation
import { useSwipeable } from 'react-swipeable'

const MobileTabbedContent = ({ tabs }) => {
  const [activeIndex, setActiveIndex] = useState(0)

  const handlers = useSwipeable({
    onSwipedLeft: () => setActiveIndex((i) => (i + 1) % tabs.length),
    onSwipedRight: () => setActiveIndex((i) => (i - 1 + tabs.length) % tabs.length),
    trackMouse: false,
    preventScrollOnSwipe: true,
  })

  return (
    <div {...handlers}>
      <TabBar tabs={tabs} activeIndex={activeIndex} />
      <TabContent>{tabs[activeIndex].content}</TabContent>
    </div>
  )
}
```

**Framer Motion Alternative**:
```tsx
import { motion, AnimatePresence } from 'framer-motion'

<AnimatePresence mode="wait">
  <motion.div
    key={activeTab}
    initial={{ x: direction > 0 ? 300 : -300, opacity: 0 }}
    animate={{ x: 0, opacity: 1 }}
    exit={{ x: direction > 0 ? -300 : 300, opacity: 0 }}
    transition={{ type: 'spring', stiffness: 300, damping: 30 }}
  >
    {tabContent}
  </motion.div>
</AnimatePresence>
```

**Files to Create**:
- `src/components/mobile/MobileTabbedContent.tsx`
- `src/components/mobile/TabBar.tsx`
- `src/components/mobile/TabIndicator.tsx`
- `src/components/mobile/sections/HomeSection.tsx`
- `src/components/mobile/sections/DigestsSection.tsx`
- `src/components/mobile/sections/PeopleSection.tsx`
- `src/components/mobile/sections/SettingsSection.tsx`
- `src/hooks/useSwipeNavigation.ts`

**Dependencies to Install**:
- `react-swipeable` OR `framer-motion`

---

## Issue 2.4: FAB Action Sheet

**Title**: FAB Expandable Action Sheet

**Priority**: P2 (Future Scope)

**Effort Estimate**: M (Medium - 4-5 days)

**Labels**: `mobile`, `ux`, `gestures`, `future`

**Dependencies**: Issue 2.1 (Bottom Navigation)

**Description**:
Build an expandable action sheet that slides up from the FAB when tapped, presenting quick "Create Update" options with different update types.

**Action Options**:
1. 📸 **Photo Update** - Upload/capture photo
2. 🎥 **Video Update** - Upload/capture video
3. 📝 **Text Update** - Text-only update
4. 🎉 **Milestone** - Record a milestone

**Design Specifications**:
- Slide up from FAB position
- Backdrop: 40% opacity black overlay
- Sheet background: White with rounded top corners (16px)
- Actions: Large touch targets (≥ 56px height)
- Animation: Spring physics (bouncy feel)
- Drag-to-dismiss: Swipe down gesture

**Tasks**:
- [ ] Create `FABActionSheet` component
- [ ] Implement slide-up animation from FAB position
- [ ] Add backdrop overlay with opacity transition
- [ ] Build 4 action option buttons
- [ ] Implement drag-to-dismiss gesture (swipe down)
- [ ] Add haptic feedback on action selection
- [ ] Implement tap-outside-to-dismiss
- [ ] Add smooth spring animation using Framer Motion
- [ ] Route to correct create update flow on selection

**Acceptance Criteria**:
- [ ] Action sheet slides up smoothly from FAB
- [ ] Backdrop dims background to 40% opacity
- [ ] Swiping down dismisses the sheet
- [ ] Tapping backdrop dismisses the sheet
- [ ] Each action triggers correct create update modal
- [ ] Haptic feedback on action tap
- [ ] Animation feels natural with spring physics
- [ ] No scroll-through on backdrop

**Technical Notes**:
```tsx
// Framer Motion action sheet
import { motion } from 'framer-motion'

const FABActionSheet = ({ isOpen, onClose }) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.4 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black z-40"
          />

          {/* Action Sheet */}
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            drag="y"
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={0.2}
            onDragEnd={(e, { offset, velocity }) => {
              if (offset.y > 100 || velocity.y > 500) {
                onClose()
              }
            }}
            className="fixed bottom-0 left-0 right-0 bg-white rounded-t-2xl z-50"
          >
            <div className="p-6 space-y-3">
              <ActionButton icon="📸" label="Photo Update" />
              <ActionButton icon="🎥" label="Video Update" />
              <ActionButton icon="📝" label="Text Update" />
              <ActionButton icon="🎉" label="Milestone" />
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
```

**Files to Create**:
- `src/components/mobile/FABActionSheet.tsx`
- `src/components/mobile/ActionSheetButton.tsx`
- `src/hooks/useActionSheet.ts`

**Dependencies to Install**:
- `framer-motion`

---

## Issue 2.5: Mobile Search Experience

**Title**: Full-Screen Mobile Search

**Priority**: P2 (Future Scope)

**Effort Estimate**: M (Medium - 4-5 days)

**Labels**: `mobile`, `search`, `ux`, `future`

**Dependencies**: Issue 2.2 (Mobile Top Bar)

**Description**:
Implement a full-screen mobile search experience that opens from the top bar search icon, with category filtering and recent searches.

**Search Features**:
- Full-screen overlay (slides down from top)
- Search input with clear button
- Category filters (All, Updates, People, Groups)
- Recent searches (localStorage-backed, max 10)
- Search results with infinite scroll
- Virtual scrolling for performance

**Search Categories**:
- **All**: Search across all content
- **Updates**: Search update titles and content
- **People**: Search recipients by name/email
- **Groups**: Search group names

**Design Specifications**:
- Modal: Full screen with slide-down animation
- Input: Large touch-friendly (56px height)
- Results: Cards with icons and preview text
- Category tabs: Horizontal scroll if needed
- Recent searches: Show before typing

**Tasks**:
- [ ] Create `MobileSearchModal` component
- [ ] Implement full-screen overlay with slide-down animation
- [ ] Build search input with clear button
- [ ] Add category filter tabs
- [ ] Display recent searches from localStorage
- [ ] Show search results with infinite scroll
- [ ] Implement virtual scrolling for large result sets
- [ ] Add empty state for no results
- [ ] Navigate to item on result tap
- [ ] Close modal on Escape or back button

**Acceptance Criteria**:
- [ ] Search opens full-screen from top bar icon
- [ ] Results appear as user types (debounced)
- [ ] Category filters work correctly
- [ ] Recent searches are saved and displayed
- [ ] Tapping a result navigates to the item and closes search
- [ ] Clear button clears input and resets search
- [ ] Back button closes modal
- [ ] Virtual scrolling performs well with 1000+ results

**Technical Notes**:
```tsx
// Mobile search modal
import { motion } from 'framer-motion'
import { VariableSizeList } from 'react-window'

const MobileSearchModal = ({ isOpen, onClose }) => {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])

  // Debounced search
  const debouncedQuery = useDebounce(query, 200)

  useEffect(() => {
    if (debouncedQuery) {
      performSearch(debouncedQuery)
    }
  }, [debouncedQuery])

  return (
    <motion.div
      initial={{ y: '-100%' }}
      animate={{ y: 0 }}
      exit={{ y: '-100%' }}
      className="fixed inset-0 bg-white z-50"
    >
      <SearchInput value={query} onChange={setQuery} />
      <CategoryTabs />
      {query ? (
        <VirtualSearchResults results={results} />
      ) : (
        <RecentSearches />
      )}
    </motion.div>
  )
}
```

**Files to Create**:
- `src/components/mobile/MobileSearchModal.tsx`
- `src/components/mobile/SearchInput.tsx`
- `src/components/mobile/SearchResults.tsx`
- `src/components/mobile/RecentSearches.tsx`
- `src/hooks/useMobileSearch.ts`
- `src/hooks/useDebounce.ts`

**Performance Considerations**:
- Virtual scrolling for 100+ results
- Debounce search input (200ms)
- Lazy load result images
- Cache recent searches locally

---

## Issue 2.6: Swipe Gestures & Interactions

**Title**: Swipe Gestures & Mobile Interactions

**Priority**: P2 (Future Scope)

**Effort Estimate**: M (Medium - 4-6 days)

**Labels**: `mobile`, `gestures`, `ux`, `future`

**Dependencies**: Issues 2.3 (Tabs), 2.4 (FAB Sheet)

**Description**:
Implement comprehensive swipe gesture support throughout the mobile app for natural mobile interactions, including tab switching, modal dismissal, pull-to-refresh, and swipe actions.

**Gesture Types**:

1. **Swipe Left/Right**: Switch between tabs
2. **Swipe Down**: Dismiss modals and sheets
3. **Pull Down**: Refresh content
4. **Swipe Left on Item**: Reveal action buttons (archive, delete)
5. **Long Press**: Context menu (optional)

**Haptic Feedback Points**:
- Action sheet opens
- Tab switches
- Pull-to-refresh triggers
- Swipe action threshold reached
- Delete/archive action

**Tasks**:
- [ ] Implement swipe-between-tabs gesture
- [ ] Add swipe-to-dismiss for modals and sheets
- [ ] Implement pull-to-refresh for content lists
- [ ] Build swipe actions on list items (reveal buttons)
- [ ] Add haptic feedback for all gesture interactions
- [ ] Implement long-press context menu (optional)
- [ ] Add visual feedback during gestures (rubber band effect)
- [ ] Ensure gestures don't conflict with scrolling
- [ ] Add gesture indicators/hints for discoverability

**Acceptance Criteria**:
- [ ] Gestures feel natural and responsive
- [ ] Visual feedback is provided during all gestures
- [ ] Haptic feedback works on iOS/Android
- [ ] Gestures don't interfere with vertical scrolling
- [ ] Swipe thresholds are consistent (50px or 30% width)
- [ ] Animations use spring physics for natural feel
- [ ] Pull-to-refresh triggers at 80px pull distance
- [ ] Swipe actions have proper undo/cancel mechanism

**Technical Notes**:
```tsx
// Pull-to-refresh implementation
import { motion, useMotionValue, useTransform } from 'framer-motion'

const PullToRefresh = ({ onRefresh, children }) => {
  const y = useMotionValue(0)
  const opacity = useTransform(y, [0, 100], [0, 1])

  const handleDragEnd = (event, info) => {
    if (info.offset.y > 80) {
      onRefresh()
    }
  }

  return (
    <motion.div
      drag="y"
      dragConstraints={{ top: 0, bottom: 0 }}
      dragElastic={0.2}
      onDragEnd={handleDragEnd}
      style={{ y }}
    >
      <motion.div style={{ opacity }}>
        <RefreshIndicator />
      </motion.div>
      {children}
    </motion.div>
  )
}

// Swipe action on list item
const SwipeableListItem = ({ onDelete, onArchive, children }) => {
  const x = useMotionValue(0)

  return (
    <motion.div className="relative">
      {/* Action buttons revealed on swipe */}
      <div className="absolute right-0 top-0 bottom-0 flex">
        <button onClick={onArchive}>Archive</button>
        <button onClick={onDelete}>Delete</button>
      </div>

      {/* Swipeable content */}
      <motion.div
        drag="x"
        dragConstraints={{ left: -150, right: 0 }}
        dragElastic={0.1}
        style={{ x }}
      >
        {children}
      </motion.div>
    </motion.div>
  )
}
```

**Files to Create**:
- `src/components/mobile/PullToRefresh.tsx`
- `src/components/mobile/SwipeableListItem.tsx`
- `src/hooks/useGesture.ts`
- `src/hooks/useHapticFeedback.ts`

**Haptic Feedback Implementation**:
```tsx
const useHapticFeedback = () => {
  const trigger = (type: 'light' | 'medium' | 'heavy' = 'light') => {
    if ('vibrate' in navigator) {
      const pattern = {
        light: 10,
        medium: 20,
        heavy: 30,
      }
      navigator.vibrate(pattern[type])
    }
  }

  return { trigger }
}
```

**Dependencies to Install**:
- `framer-motion` (if not already installed)
- `react-use-gesture` (alternative to Framer Motion drag)

---

## Issue 2.7: Mobile Responsive Breakpoint

**Title**: Mobile/Desktop Responsive Breakpoint

**Priority**: P2 (Future Scope)

**Effort Estimate**: S (Small - 2-3 days)

**Labels**: `mobile`, `responsive`, `future`

**Dependencies**: All mobile issues (2.1-2.6)

**Description**:
Implement the responsive breakpoint to intelligently switch between desktop 3-pane layout and mobile bottom navigation layout, ensuring smooth transitions and state preservation.

**Breakpoint Strategy**:
- **< 768px**: Mobile layout (bottom navigation)
- **≥ 768px**: Desktop layout (3-pane)
- **Tablets in portrait**: Mobile layout
- **Tablets in landscape**: Desktop layout

**Technical Requirements**:
- Use `useMediaQuery('(max-width: 768px)')`
- Preserve navigation state during layout switch
- Handle orientation changes gracefully
- No layout shift or content flash during transition

**Tasks**:
- [ ] Add media query breakpoint at 768px
- [ ] Show mobile layout below 768px
- [ ] Show desktop 3-pane layout above 768px
- [ ] Test layout transitions at breakpoint
- [ ] Handle orientation changes (portrait ↔ landscape)
- [ ] Preserve navigation state during switch
- [ ] Test on tablets in both orientations
- [ ] Ensure no layout shift during transition
- [ ] Add smooth transition animations

**Acceptance Criteria**:
- [ ] Layout switches smoothly at 768px breakpoint
- [ ] Active navigation state is preserved during switch
- [ ] Orientation changes are handled gracefully
- [ ] No layout shifts or content flashing
- [ ] Tablets in portrait show mobile layout
- [ ] Tablets in landscape show desktop layout
- [ ] State (selected tab, scroll position) is preserved

**Technical Notes**:
```tsx
// Responsive layout switcher
const DashboardLayout = () => {
  const isMobile = useMediaQuery('(max-width: 768px)')
  const [activeView, setActiveView] = useState('activity')

  // Preserve state during layout switch
  useLayoutEffect(() => {
    // Immediate re-render to prevent flash
  }, [isMobile])

  return isMobile ? (
    <MobileLayout activeView={activeView} onNavigate={setActiveView} />
  ) : (
    <DesktopLayout activeView={activeView} onNavigate={setActiveView} />
  )
}

// Orientation detection
const useOrientation = () => {
  const [orientation, setOrientation] = useState<'portrait' | 'landscape'>('portrait')

  useEffect(() => {
    const handleOrientationChange = () => {
      setOrientation(
        window.innerHeight > window.innerWidth ? 'portrait' : 'landscape'
      )
    }

    window.addEventListener('resize', handleOrientationChange)
    handleOrientationChange() // Initial

    return () => window.removeEventListener('resize', handleOrientationChange)
  }, [])

  return orientation
}
```

**Files to Create/Update**:
- `src/hooks/useMediaQuery.ts` (if not exists)
- `src/hooks/useOrientation.ts`
- `src/components/layout/ResponsiveLayout.tsx`

**Test Cases**:
- [ ] Test at 767px (mobile layout)
- [ ] Test at 768px (desktop layout)
- [ ] Test tablet portrait (mobile layout)
- [ ] Test tablet landscape (desktop layout)
- [ ] Test orientation change while using app
- [ ] Test state preservation during resize

**Devices to Test**:
- iPhone 14 Pro (393x852)
- iPad Mini (768x1024)
- iPad Pro (1024x1366)
- Samsung Galaxy S23 (360x800)
- Samsung Galaxy Tab (800x1280)

---

## Issue 2.8: Mobile Performance & PWA

**Title**: Mobile Performance Optimization & PWA

**Priority**: P2 (Future Scope)

**Effort Estimate**: M (Medium - 5-7 days)

**Labels**: `mobile`, `performance`, `pwa`, `future`

**Dependencies**: All mobile issues (2.1-2.7)

**Description**:
Optimize the mobile experience for performance on low-end devices and add Progressive Web App (PWA) capabilities for app-like installation and offline support.

**Performance Targets (Mobile)**:
- **First Contentful Paint**: < 1.5s on 3G
- **Time to Interactive**: < 3.5s on 3G
- **Lighthouse Mobile**: > 85
- **Bundle size**: < 150KB gzipped (mobile)

**PWA Features**:
- ✅ Install to home screen
- ✅ Offline support for cached content
- ✅ App manifest with icons
- 🔮 Push notifications (future)
- 🔮 Background sync (future)

**Tasks**:
- [ ] Install and configure `next-pwa`
- [ ] Create service worker for offline support
- [ ] Build app manifest (name, icons, theme color)
- [ ] Optimize bundle size specifically for mobile
- [ ] Implement lazy loading for images and components
- [ ] Add request batching to reduce network calls
- [ ] Implement offline indicators in UI
- [ ] Test on low-end Android devices
- [ ] Add caching strategies for API responses
- [ ] Implement background sync for offline actions (future)
- [ ] Add push notification support (future)

**Acceptance Criteria**:
- [ ] Lighthouse PWA score > 90
- [ ] App works offline for viewing cached content
- [ ] Install prompt appears on eligible mobile devices
- [ ] Performance is smooth on low-end devices (3GB RAM)
- [ ] Bundle size meets mobile targets
- [ ] Images are lazy-loaded
- [ ] Offline indicator shows when network is unavailable
- [ ] Service worker updates in background

**Technical Notes**:
```tsx
// next.config.js with PWA
const withPWA = require('next-pwa')({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development',
})

module.exports = withPWA({
  // Next.js config
})

// manifest.json
{
  "name": "Tribe - Baby Updates",
  "short_name": "Tribe",
  "description": "Share baby updates with family",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#f3841c",
  "icons": [
    {
      "src": "/icons/icon-192.png",
      "sizes": "192x192",
      "type": "image/png"
    },
    {
      "src": "/icons/icon-512.png",
      "sizes": "512x512",
      "type": "image/png"
    }
  ]
}
```

**Service Worker Caching Strategy**:
```js
// Cache-first for static assets
workbox.routing.registerRoute(
  ({ request }) => request.destination === 'image',
  new workbox.strategies.CacheFirst()
)

// Network-first for API calls
workbox.routing.registerRoute(
  ({ url }) => url.pathname.startsWith('/api/'),
  new workbox.strategies.NetworkFirst({
    networkTimeoutSeconds: 3,
    cacheName: 'api-cache',
  })
)
```

**Files to Create**:
- `public/manifest.json`
- `public/icons/` (PWA icons)
- Service worker config
- `src/components/mobile/OfflineIndicator.tsx`
- `src/components/mobile/InstallPrompt.tsx`

**PWA Icons Needed**:
- 192x192px
- 512x512px
- Favicon (multiple sizes)
- Apple touch icon

**Testing Checklist**:
- [ ] Test install prompt on iOS Safari
- [ ] Test install prompt on Android Chrome
- [ ] Test offline mode (airplane mode)
- [ ] Test service worker updates
- [ ] Test on 3G throttled connection
- [ ] Test on low-end Android (3GB RAM)
- [ ] Verify Lighthouse PWA score
- [ ] Test background sync (if implemented)

**Dependencies to Install**:
- `next-pwa`

**Low-End Device Testing**:
- Samsung Galaxy A13 (3GB RAM, Android 12)
- Moto G Power (4GB RAM, Android 11)
- iPhone SE 2020 (3GB RAM, iOS 16)

---

## Dependencies Map

```
Feature 1 (Desktop 3-Pane) Complete
  ↓
2.1 (Bottom Navigation) → 2.2 (Top Bar)
  ↓                         ↓
2.3 (Tabs)              2.5 (Search)
  ↓
2.4 (FAB Sheet)
  ↓
2.6 (Gestures) ← (2.3 + 2.4)
  ↓
2.7 (Responsive) ← All above
  ↓
2.8 (Performance & PWA) ← All above
```

---

## Rollout Plan

### Phase 1: Foundation (Weeks 1-2)
**Issues**: 2.1, 2.2
- Bottom navigation bar with FAB
- Mobile top bar
**Goal**: Basic mobile navigation structure

### Phase 2: Content & Gestures (Weeks 3-4)
**Issues**: 2.3, 2.4, 2.6
- Tabbed content sections
- FAB action sheet
- Swipe gestures
**Goal**: Interactive mobile experience

### Phase 3: Search & Polish (Week 5)
**Issues**: 2.5, 2.7
- Mobile search
- Responsive breakpoint
**Goal**: Complete mobile feature set

### Phase 4: Optimize & PWA (Weeks 6-7)
**Issues**: 2.8
- Performance optimization
- PWA capabilities
**Goal**: Production-ready mobile app

---

## Effort Summary

### Feature 2 (Mobile Bottom Navigation):
- **XS**: 0 issues
- **S**: 2 issues (2.2, 2.7)
- **M**: 5 issues (2.1, 2.4, 2.5, 2.6, 2.8)
- **L**: 1 issue (2.3)
- **XL**: 0 issues

**Total Estimated Effort**: ~4-5 weeks for 1 developer

---

## Success Metrics

**User Experience (Mobile)**:
- Task completion time < 15s on mobile
- User satisfaction score > 4.5/5
- Navigation discoverability > 85%
- Gesture adoption rate > 70%

**Performance (Mobile)**:
- Lighthouse Mobile score > 85
- Core Web Vitals all "Good" on 3G
- Bundle size < 150KB gzipped
- Time to Interactive < 3.5s on 3G

**PWA Adoption**:
- Install rate > 20% of mobile users
- Offline usage > 10% of sessions
- Return visit rate > 60%

**Accessibility**:
- WCAG 2.1 AA compliance: 100%
- Touch target compliance: 100%
- Screen reader compatibility: iOS VoiceOver, Android TalkBack

---

## Risk Mitigation

**Risk**: Gesture conflicts with native browser gestures
**Mitigation**:
- Use `preventDefault()` strategically
- Test on all major mobile browsers
- Provide alternative tap-based navigation

**Risk**: Poor performance on low-end devices
**Mitigation**:
- Aggressive code splitting
- Virtual scrolling everywhere
- Test on low-end devices from day 1
- Monitor performance in production

**Risk**: PWA install prompt doesn't show
**Mitigation**:
- Follow all PWA requirements
- Test install criteria thoroughly
- Provide fallback "Add to Home Screen" instructions

**Risk**: Users don't discover swipe gestures
**Mitigation**:
- First-time user tutorial
- Visual hints (swipe indicators)
- Tooltips on first interaction
- Fallback tap-based actions

---

## Technical Stack

**Core**:
- Next.js 14+ (App Router)
- React 18+
- TypeScript
- Tailwind CSS

**Mobile-Specific**:
- `framer-motion` (gestures and animations)
- `react-swipeable` (swipe gestures alternative)
- `react-window` (virtual scrolling)
- `next-pwa` (PWA support)

**Performance**:
- Service workers
- Request caching
- Image optimization
- Code splitting

**Testing**:
- BrowserStack (mobile device testing)
- Lighthouse CI (automated performance)
- PWA testing tools

---

## Browser/Device Support

**Mobile Browsers**:
- iOS Safari 14+
- Android Chrome 90+
- Samsung Internet 14+

**Devices**:
- iPhone (X and newer)
- Android (8.0 and newer)
- Tablets (iPad, Android tablets)

**PWA Support**:
- Android: Chrome, Samsung Internet, Edge
- iOS: Safari 16.4+ (limited PWA features)

---

## Future Enhancements (Post-MVP)

**Push Notifications**:
- Digest reminders
- Response notifications
- Milestone alerts

**Background Sync**:
- Offline update creation
- Queue updates when offline
- Sync when connection restored

**Advanced Gestures**:
- Pinch to zoom on images
- 3D Touch/Haptic Touch support
- Shake to undo

**Biometric Auth**:
- Face ID / Touch ID
- Fingerprint unlock

**Native Features**:
- Share sheet integration
- Camera integration
- Contact picker
- Calendar integration
