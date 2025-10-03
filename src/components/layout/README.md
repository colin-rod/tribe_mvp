# Desktop 3-Pane Layout System

**Linear Issue:** [CRO-293](linear://issue/CRO-293) - Core Layout Shell & Top Bar

This directory contains the foundational 3-pane layout system for the Tribe MVP dashboard.

## Overview

The layout system provides a responsive, persistent 3-pane dashboard layout with:

- **Fixed Top Bar** (64px height) spanning the full viewport width
- **Left Navigation Panel** (collapsible)
- **Main Content Area** (flexible, takes remaining space)
- **Right Sidebar Panel** (collapsible)
- **Responsive Design** (single-column layout below 1024px)
- **State Persistence** (localStorage for collapsed panel states)

## Architecture

### CSS Grid Layout

```
┌─────────────────────────────────────────┐
│              TopBar (z: 50)             │
├──────────┬───────────────────┬──────────┤
│  LeftNav │   Main Content    │ RightPane│
│ (z: 40)  │                   │ (z: 30)  │
│  (auto)  │      (1fr)        │  (auto)  │
└──────────┴───────────────────┴──────────┘
```

Grid Template: `grid-template-columns: [nav] auto [main] 1fr [sidebar] auto`

### Component Hierarchy

```
LayoutProvider (Context)
└── DashboardShell
    ├── TopBar (fixed)
    ├── LeftNav (optional, collapsible)
    ├── Main Content (children)
    └── RightPane (optional, collapsible)
```

## Files

| File | Description |
|------|-------------|
| `DashboardShell.tsx` | Main layout container with CSS Grid |
| `TopBar.tsx` | Fixed top navigation bar |
| `LayoutContext.tsx` | React context for layout state management |
| `useLayoutState.ts` | Hook for layout state with localStorage |
| `layout.ts` (types) | TypeScript types and constants |
| `example-usage.tsx` | Example implementation |

## Usage

### 1. Wrap your app with LayoutProvider

In your `app/dashboard/layout.tsx`:

```tsx
import { LayoutProvider } from '@/contexts/LayoutContext'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <LayoutProvider>
      {children}
    </LayoutProvider>
  )
}
```

### 2. Use DashboardShell in your pages

In your `app/dashboard/page.tsx`:

```tsx
import { DashboardShell } from '@/components/layout/DashboardShell'
import { LeftNav } from '@/components/layout/LeftNav'
import { ActivityPane } from '@/components/layout/ActivityPane'

export default function DashboardPage() {
  return (
    <DashboardShell
      leftNav={<LeftNav />}
      rightPane={<ActivityPane />}
    >
      <YourMainContent />
    </DashboardShell>
  )
}
```

### 3. Access layout state in components

```tsx
import { useLayout } from '@/contexts/LayoutContext'

function MyComponent() {
  const { leftNavCollapsed, toggleLeftNav, isMobile } = useLayout()

  return (
    <button onClick={toggleLeftNav}>
      {leftNavCollapsed ? 'Expand' : 'Collapse'} Navigation
    </button>
  )
}
```

## Features

### State Persistence

Panel collapse states are automatically saved to localStorage and restored on page load.

**Storage Key:** `tribe-layout-state`

**Stored State:**
```json
{
  "leftNavCollapsed": false,
  "rightPaneCollapsed": false
}
```

### Responsive Breakpoints

- **Desktop (≥ 1024px):** 3-pane layout with collapsible panels
- **Mobile (< 1024px):** Single-column layout (main content only)

### Z-Index Hierarchy

Ensures proper stacking order for overlays and dropdowns:

- TopBar: 50
- LeftNav: 40
- RightPane: 30

## TypeScript Types

```tsx
interface LayoutState {
  leftNavCollapsed: boolean
  rightPaneCollapsed: boolean
  isMobile: boolean
}

interface LayoutContextValue extends LayoutState {
  toggleLeftNav: () => void
  toggleRightPane: () => void
  setIsMobile: (isMobile: boolean) => void
}
```

## Accessibility

- Semantic HTML elements (`<header>`, `<nav>`, `<main>`, `<aside>`)
- Proper ARIA labels on interactive elements
- Focus management for collapsible panels
- Keyboard navigation support

## Performance

- Layout state changes don't cause unnecessary re-renders
- localStorage operations are debounced
- Resize observer efficiently detects mobile/desktop transitions
- CSS Grid ensures smooth layout shifts

## Next Steps

The following components should be built next to complete the desktop layout:

1. **LeftNav Component** - Actual navigation links and sections
2. **RightPane Component** - Activity feed or contextual sidebar
3. **Toggle Buttons** - UI controls for collapsing/expanding panels
4. **Mobile Menu** - Alternative navigation for mobile viewports

See Linear project for related issues and implementation details.
