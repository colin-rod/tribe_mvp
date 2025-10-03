# Right Pane Components

## Overview
Context-aware right sidebar components for the Tribe MVP dashboard. Each navigation view has its own specialized right pane content.

## Components

### RightPaneContent (Router)
Main content router that displays the appropriate right pane component based on the active navigation view.

```tsx
import { RightPaneContent } from '@/components/layout/rightPane'

<RightPane>
  <RightPaneContent />
</RightPane>
```

### View-Specific Components

#### ActivityRightPane
- Filters panel (search, date range, child, type)
- Quick stats card
- AI suggestions panel
- Quick actions (Create Update, Compile Digest)

#### DigestsRightPane
- Digest preview
- Recent digests (last 5)
- Schedule controls
- Recipient count

#### ChildrenRightPane
- Selected child details
- Milestones timeline
- Quick stats (updates per child, age, birthday)
- Quick actions (Add Child, Edit Child)

#### RecipientsRightPane
- Selected recipient details
- Preference summary
- Group memberships
- Recent activity

#### GroupsRightPane
- Group member list
- Preference overview
- Quick stats (member count, active members)
- Quick actions (Add Member, Edit Group)

#### DraftsRightPane
- Draft metadata
- Scheduled time
- Recipient preview
- Quick actions (Edit, Send Now, Schedule)

#### SettingsRightPane
- Quick toggles (frequently used settings)
- Recent changes log
- Account info (plan, storage)
- Help links

## Shared Components

### DetailCard
Displays labeled information in a card layout.

```tsx
import { DetailCard, DetailRow } from '@/components/layout/rightPane'

<DetailCard title="Contact Information">
  <DetailRow label="Email" value="user@example.com" />
  <DetailRow label="Phone" value="+1 234-567-8900" />
</DetailCard>
```

### StatCard
Displays a statistic with optional trend indicator.

```tsx
import { StatCard } from '@/components/layout/rightPane'

<StatCard
  label="Total Updates"
  value={145}
  trend={{ value: '+12 this month', direction: 'up' }}
/>
```

## Context Management

### ViewSelectionContext
Manages selection state across views for bidirectional data updates.

```tsx
import { useViewSelection } from '@/contexts/ViewSelectionContext'

function MyComponent() {
  const { selectedId, setSelectedId, clearSelection } = useViewSelection()

  // Use selectedId to show/hide content
  // Call setSelectedId when user selects an item
  // Call clearSelection when deselecting
}
```

## Features

### Selection State
- Persists during navigation within view
- Clears when switching between views
- Supports bidirectional updates between middle pane and right pane

### Empty States
Each component handles empty/no-selection states gracefully:
- Shows helpful message when no item is selected
- Provides context-appropriate placeholder content

### Loading States
Components are ready to display loading indicators when fetching data (TODO: implement with real data)

## Usage Example

```tsx
// In your dashboard layout
import { RightPane } from '@/components/layout/RightPane'
import { RightPaneContent } from '@/components/layout/rightPane'
import { ViewSelectionProvider } from '@/contexts/ViewSelectionContext'

export default function DashboardLayout({ children }) {
  return (
    <ViewSelectionProvider>
      <div className="flex h-screen">
        <LeftNavigation />
        <MiddlePane>{children}</MiddlePane>
        <RightPane>
          <RightPaneContent />
        </RightPane>
      </div>
    </ViewSelectionProvider>
  )
}
```

## Related Issues
- CRO-297: Right Pane - Base Structure & Collapse
- CRO-298: Right Pane - Activity View Context
- CRO-299: Right Pane - Other View Contexts
