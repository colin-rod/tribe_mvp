# Group Management Components

This directory contains React components for managing group memberships and notification preferences in the Tribe MVP platform. These components provide a comprehensive interface for recipients to view their group memberships and manage their notification settings.

## Components Overview

### 1. GroupMembershipCard
**File**: `GroupMembershipCard.tsx`

A card component that displays individual group membership information with quick settings overview.

**Key Features**:
- Progressive disclosure of group settings
- Visual indicators for personal overrides vs group defaults
- Quick mute/unmute toggle
- Settings access button
- Loading and error states
- Mobile-responsive design

**Props**:
```typescript
interface GroupMembershipCardProps {
  membership: GroupMembership
  onToggleMute: (groupId: string, mute: boolean) => void
  onUpdatePreferences: (groupId: string, preferences: Partial<GroupMembership['personal_preferences']>) => void
  onResetToDefaults: (groupId: string) => void
  onViewSettings: (groupId: string) => void
  isLoading?: boolean
  className?: string
}
```

### 2. GroupPreferenceManager
**File**: `GroupPreferenceManager.tsx`

A comprehensive preference management interface for individual groups.

**Key Features**:
- Full preference customization (frequency, channels, content types)
- Toggle between group defaults and personal preferences
- Advanced settings with progressive disclosure
- Real-time validation
- Visual diff indicators

**Props**:
```typescript
interface GroupPreferenceManagerProps {
  membership: GroupMembership
  onUpdatePreferences: (groupId: string, preferences: Partial<GroupMembership['personal_preferences']>) => Promise<void>
  onResetToDefaults: (groupId: string) => Promise<void>
  onClose: () => void
  isLoading?: boolean
  className?: string
}
```

### 3. MuteControls
**File**: `MuteControls.tsx`

Specialized component for managing temporary and permanent muting of group notifications.

**Key Features**:
- Predefined mute durations (1 hour, 1 day, 1 week, 1 month, indefinite)
- Current mute status display
- Easy unmute functionality
- Duration countdown

**Props**:
```typescript
interface MuteControlsProps {
  groupId: string
  groupName: string
  isMuted: boolean
  muteUntil?: string | null
  onMute: (groupId: string, duration?: number) => Promise<void>
  onUnmute: (groupId: string) => Promise<void>
  onClose: () => void
  isLoading?: boolean
  className?: string
}
```

### 4. BulkPreferenceActions
**File**: `BulkPreferenceActions.tsx`

Component for performing bulk operations across multiple selected groups.

**Key Features**:
- Bulk mute/unmute operations
- Bulk preference updates (frequency, channels, content types)
- Reset to defaults for multiple groups
- Selection count display
- Progressive disclosure for complex operations

**Props**:
```typescript
interface BulkPreferenceActionsProps {
  selectedGroupIds: string[]
  totalGroups: number
  onBulkAction: (action: BulkAction['type'], preferences?: BulkPreferences) => Promise<void>
  onClearSelection: () => void
  isLoading?: boolean
  className?: string
}
```

### 5. GroupOverviewDashboard
**File**: `GroupOverviewDashboard.tsx`

Main dashboard component that orchestrates all group management functionality.

**Key Features**:
- Statistics overview (total, active, muted, custom settings)
- Search and filtering capabilities
- Bulk selection and operations
- Modal management for detailed views
- Responsive grid layout
- Loading states

**Props**:
```typescript
interface GroupOverviewDashboardProps {
  memberships: GroupMembership[]
  recipientName: string
  onUpdatePreferences: (groupId: string, preferences: Partial<GroupMembership['personal_preferences']>) => Promise<void>
  onResetToDefaults: (groupId: string) => Promise<void>
  onMuteGroup: (groupId: string, duration?: number) => Promise<void>
  onUnmuteGroup: (groupId: string) => Promise<void>
  onBulkAction: (action: string, preferences?: BulkPreferences, groupIds?: string[]) => Promise<void>
  isLoading?: boolean
  className?: string
}
```

## Data Types

### GroupMembership
```typescript
interface GroupMembership {
  id: string
  name: string
  description?: string
  is_admin: boolean
  is_muted: boolean
  mute_until?: string | null
  member_count: number
  last_update?: string | null

  // Group default preferences
  group_defaults: {
    frequency: 'every_update' | 'daily_digest' | 'weekly_digest' | 'milestones_only'
    channels: Array<'email' | 'sms' | 'whatsapp'>
    content_types: Array<'photos' | 'text' | 'milestones'>
  }

  // User's personal overrides (null means using group defaults)
  personal_preferences: {
    frequency?: 'every_update' | 'daily_digest' | 'weekly_digest' | 'milestones_only' | null
    channels?: Array<'email' | 'sms' | 'whatsapp'> | null
    content_types?: Array<'photos' | 'text' | 'milestones'> | null
  }
}
```

## Usage Examples

### Basic Group Dashboard
```tsx
import { GroupOverviewDashboard } from '@/components/groups'

function GroupsPage({ token }: { token: string }) {
  const [memberships, setMemberships] = useState<GroupMembership[]>([])

  const handleUpdatePreferences = async (groupId: string, preferences: any) => {
    // API call to update preferences
    const response = await updateGroupPreferences(token, groupId, preferences)
    // Update local state
    setMemberships(prev =>
      prev.map(m => m.id === groupId ? { ...m, personal_preferences: preferences } : m)
    )
  }

  const handleMuteGroup = async (groupId: string, duration?: number) => {
    // API call to mute group
    await muteGroup(token, groupId, duration)
    // Update local state
  }

  // ... other handlers

  return (
    <GroupOverviewDashboard
      memberships={memberships}
      recipientName="John Doe"
      onUpdatePreferences={handleUpdatePreferences}
      onResetToDefaults={handleResetToDefaults}
      onMuteGroup={handleMuteGroup}
      onUnmuteGroup={handleUnmuteGroup}
      onBulkAction={handleBulkAction}
    />
  )
}
```

### Individual Group Card
```tsx
import { GroupMembershipCard } from '@/components/groups'

function GroupList({ memberships }: { memberships: GroupMembership[] }) {
  return (
    <div className="space-y-4">
      {memberships.map(membership => (
        <GroupMembershipCard
          key={membership.id}
          membership={membership}
          onToggleMute={handleToggleMute}
          onUpdatePreferences={handleUpdatePreferences}
          onResetToDefaults={handleResetToDefaults}
          onViewSettings={handleViewSettings}
        />
      ))}
    </div>
  )
}
```

## Design System Integration

These components integrate seamlessly with the existing Tribe MVP design system:

- **Colors**: Uses primary, secondary, success, warning, and error color tokens
- **Typography**: Follows established font weights and sizes
- **Spacing**: Uses consistent padding and margin scales
- **Shadows**: Implements elevation system with hover states
- **Borders**: Uses standard border radius and opacity values
- **Animations**: Implements smooth transitions and loading states

## Accessibility Features

All components include comprehensive accessibility features:

- **Keyboard Navigation**: Full keyboard support with logical tab order
- **Screen Reader Support**: Proper ARIA labels and descriptions
- **Focus Management**: Visible focus indicators and focus trapping in modals
- **Color Contrast**: Meets WCAG 2.1 AA standards
- **Responsive Design**: Mobile-first approach with touch-friendly interactions

## Performance Considerations

- **Memoization**: Uses React.memo and useMemo for expensive operations
- **Lazy Loading**: Progressive disclosure prevents overwhelming users
- **Optimistic Updates**: Immediate feedback with graceful error handling
- **Efficient Re-renders**: Minimal re-renders through careful state management

## Integration Points

These components are designed to integrate with:

- **Existing Token System**: Uses the current token-based authentication
- **Supabase Backend**: Compatible with existing database schema
- **Notification System**: Integrates with current delivery mechanisms
- **Email Templates**: Works with existing template system

## Future Enhancements

Planned enhancements include:

- **Real-time Updates**: WebSocket integration for live preference changes
- **Export/Import**: Preference backup and restoration
- **Advanced Filtering**: Date-based and content-type filtering
- **Analytics Integration**: Preference change tracking
- **Mobile App Support**: React Native compatibility

## Testing

Each component includes comprehensive test coverage:

- **Unit Tests**: Individual component functionality
- **Integration Tests**: Component interaction patterns
- **Accessibility Tests**: Screen reader and keyboard navigation
- **Visual Regression Tests**: Consistent visual appearance
- **Performance Tests**: Render performance and memory usage