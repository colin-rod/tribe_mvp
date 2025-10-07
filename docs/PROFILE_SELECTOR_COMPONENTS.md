# Profile Selector Components

Visual profile selector components for choosing children, recipients, or any profile-based items. These components replace traditional dropdowns with icon-based selection for better visual recognition and user experience.

## Components Overview

### ProfileIcon
Display a single profile with photo, name, and optional subtitle.

### ProfileSelector
Generic profile selector with single or multi-select modes.

### ChildProfileSelector
Specialized selector for children with automatic data loading.

### RecipientProfileSelector
Specialized selector for recipients with AI suggestion support.

## Usage Examples

### ProfileIcon

Display a single profile with photo, name, and optional subtitle.

```tsx
import { ProfileIcon } from '@/components/ui/ProfileIcon'

<ProfileIcon
  id="123"
  name="Emma Smith"
  photoUrl="/path/to/photo.jpg"
  alt="Emma Smith's profile"
  subtitle="2 years old"
  size="lg"
  isSelected={true}
  onClick={handleClick}
/>
```

**Props:**
| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `id` | string | required | Unique identifier for the profile |
| `name` | string | required | Display name |
| `photoUrl` | string | optional | Photo URL (shows initials if not provided) |
| `alt` | string | required | Accessibility alt text |
| `subtitle` | string | optional | Text below name (e.g., age, relationship) |
| `size` | 'sm' \| 'md' \| 'lg' \| 'xl' | 'md' | Icon size |
| `isSelected` | boolean | false | Whether profile is selected |
| `onClick` | function | optional | Click handler |
| `badge` | ReactNode | optional | Badge element to display |
| `className` | string | optional | Additional CSS classes |

**Features:**
- Automatically generates colored initials if no photo provided
- Selection indicator (ring + checkmark)
- Hover and focus states
- Touch-friendly
- Accessible (ARIA labels, keyboard navigation)

---

### ProfileSelector

Generic profile selector with single or multi-select modes.

```tsx
import { ProfileSelector } from '@/components/ui/ProfileSelector'

// Single select example
<ProfileSelector
  items={[
    { id: '1', name: 'Emma', photoUrl: '/emma.jpg', subtitle: '2 years' },
    { id: '2', name: 'Noah', photoUrl: '/noah.jpg', subtitle: '4 years' },
  ]}
  selectedIds={[childId]}
  onSelect={(ids) => setChildId(ids[0])}
  mode="single"
  size="lg"
/>

// Multi select example
<ProfileSelector
  items={recipients}
  selectedIds={selectedRecipientIds}
  onSelect={setSelectedRecipientIds}
  mode="multi"
  showSelectAll
  maxHeight="400px"
/>
```

**Props:**
| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `items` | ProfileItem[] | required | Array of profile items |
| `selectedIds` | string[] | required | Currently selected IDs |
| `onSelect` | (ids: string[]) => void | required | Selection change callback |
| `mode` | 'single' \| 'multi' | 'single' | Selection mode |
| `size` | 'sm' \| 'md' \| 'lg' \| 'xl' | 'md' | Profile icon size |
| `columns` | object | `{mobile: 2, tablet: 3, desktop: 4}` | Responsive columns |
| `placeholder` | string | 'Select an item' | Hint text |
| `emptyMessage` | string | 'No items available' | Empty state message |
| `loading` | boolean | false | Show loading state |
| `showSelectAll` | boolean | false | Show select all button (multi only) |
| `maxHeight` | string | undefined | Max height before scrolling |
| `className` | string | optional | Additional CSS classes |

**ProfileItem Interface:**
```typescript
interface ProfileItem {
  id: string
  name: string
  photoUrl?: string
  subtitle?: string
}
```

**Features:**
- Single or multi-select modes
- Responsive grid layout
- Loading and empty states
- Keyboard navigation (arrow keys, home/end)
- Select all / deselect all (multi mode)
- Accessible (ARIA roles, keyboard support)
- Touch-friendly (44x44px minimum)

**Keyboard Navigation:**
- Arrow keys: Navigate between profiles
- Space/Enter: Toggle selection
- Home/End: Jump to first/last profile
- Tab: Enter/exit grid

---

### ChildProfileSelector

Specialized selector for children with automatic data loading.

```tsx
import { ChildProfileSelector } from '@/components/children/ChildProfileSelector'

<ChildProfileSelector
  selectedChildId={childId}
  onChildSelect={setChildId}
  placeholder="Select a child for this update"
  size="lg"
/>
```

**Props:**
| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `selectedChildId` | string | optional | Currently selected child ID |
| `onChildSelect` | (childId: string) => void | required | Selection callback |
| `size` | 'sm' \| 'md' \| 'lg' \| 'xl' | 'lg' | Icon size |
| `columns` | object | `{mobile: 2, tablet: 3, desktop: 4}` | Responsive columns |
| `placeholder` | string | 'Select a child' | Hint text |
| `className` | string | optional | Additional CSS classes |
| `autoLoad` | boolean | true | Auto-load children on mount |

**Features:**
- Automatically loads children from database
- Displays profile photos and ages
- Always single-select mode
- Error handling with retry button
- Loading state
- Age formatting (e.g., "2y 3m")

**Example in Form:**
```tsx
<div>
  <label className="block text-sm font-medium text-gray-900 mb-3">
    Who is this update about?
  </label>
  <ChildProfileSelector
    selectedChildId={formData.childId}
    onChildSelect={(childId) => setFormData({ childId })}
    placeholder="Select a child for this update"
    size="lg"
  />
</div>
```

---

### RecipientProfileSelector

Specialized selector for recipients with AI suggestion support.

```tsx
import { RecipientProfileSelector } from '@/components/recipients/RecipientProfileSelector'

<RecipientProfileSelector
  recipients={recipients}
  selectedRecipientIds={selectedIds}
  onRecipientsChange={setSelectedIds}
  showSelectAll
  highlightSuggested
  suggestedIds={aiSuggestedIds}
  maxHeight="400px"
/>
```

**Props:**
| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `recipients` | Recipient[] | required | Array of recipients |
| `selectedRecipientIds` | string[] | required | Selected recipient IDs |
| `onRecipientsChange` | (ids: string[]) => void | required | Selection callback |
| `loading` | boolean | false | Loading state |
| `error` | string \| null | null | Error message |
| `size` | 'sm' \| 'md' \| 'lg' \| 'xl' | 'md' | Icon size |
| `columns` | object | `{mobile: 2, tablet: 3, desktop: 4}` | Responsive columns |
| `placeholder` | string | 'Select recipients' | Hint text |
| `emptyMessage` | string | 'No recipients found' | Empty message |
| `showSelectAll` | boolean | true | Show select all button |
| `maxHeight` | string | undefined | Max height |
| `highlightSuggested` | boolean | false | Show AI suggestions banner |
| `suggestedIds` | string[] | [] | AI suggested recipient IDs |
| `className` | string | optional | Additional CSS classes |

**Features:**
- Multi-select mode
- Displays relationship labels as subtitles
- AI suggestion highlighting with banner
- "Apply suggestions" quick action
- Select all / deselect all
- Error handling
- Scrollable with max height

**Example with AI Suggestions:**
```tsx
<RecipientProfileSelector
  recipients={recipients}
  selectedRecipientIds={selectedRecipientIds}
  onRecipientsChange={setSelectedRecipientIds}
  showSelectAll
  highlightSuggested
  suggestedIds={analysis?.suggested_recipients || []}
  maxHeight="400px"
  size="md"
  columns={{
    mobile: 2,
    tablet: 3,
    desktop: 3,
  }}
/>
```

---

## Design Specifications

### Visual Design

**Icon Sizes:**
- `sm`: 40px (w-10 h-10)
- `md`: 48px (w-12 h-12)
- `lg`: 56px (w-14 h-14)
- `xl`: 64px (w-16 h-16)

**Selection Indicator:**
- 3px ring in primary-600 color
- 2px ring offset
- White checkmark in primary-600 circle
- Subtle scale transform (1.02) on select

**Grid Layout:**
- Mobile (< 640px): 2 columns
- Tablet (640px - 1024px): 3 columns
- Desktop (> 1024px): 4 columns
- Gap: 16px (gap-4)

**Colors:**
- Selected ring: primary-600 (#e4690f)
- Hover shadow: shadow-lg
- Initials backgrounds: Consistent per-name colors

### Accessibility

**WCAG 2.1 AA Compliance:**
- Minimum 44x44px touch targets
- 4.5:1 text contrast ratio
- Visible focus indicators (2px ring)
- Proper ARIA labels and roles
- Keyboard navigation support

**ARIA Attributes:**
- `role="radiogroup"` for single-select
- `role="group"` for multi-select
- `role="radio"` or `role="checkbox"` for items
- `aria-checked` for selection state
- `aria-label` for context
- `tabindex` for keyboard navigation

**Keyboard Support:**
- Arrow keys for navigation
- Space/Enter for selection
- Home/End for first/last
- Tab to enter/exit grid
- Escape to close (if in modal)

### Responsive Behavior

**Breakpoints:**
```css
sm: 640px   /* 2 columns → 3 columns */
md: 768px   /* No change */
lg: 1024px  /* 3 columns → 4 columns */
xl: 1280px  /* Optional: 4 → 5-6 columns */
```

**Touch Considerations:**
- Minimum 44x44px target size
- Adequate spacing between items (16px)
- No hover-only interactions
- Large tap targets for selection

---

## Implementation Notes

### Performance

- Virtualization not implemented (suitable for < 100 items)
- Images lazy loaded via Next.js Image
- Memoized computed values
- Efficient re-renders on selection change

### Best Practices

**Do:**
- Use ChildProfileSelector for child selection
- Use RecipientProfileSelector for recipient selection
- Provide clear placeholder text
- Handle loading and error states
- Keep item counts reasonable (< 100)

**Don't:**
- Use for large datasets (> 100 items)
- Omit loading/error handling
- Use without accessibility testing
- Override focus styles
- Use in space-constrained layouts

### Replacing Existing Dropdowns

**Before (ChildSelector):**
```tsx
<ChildSelector
  selectedChildId={formData.childId}
  onChildSelect={handleChildSelect}
  placeholder="Select child"
  required
/>
```

**After (ChildProfileSelector):**
```tsx
<ChildProfileSelector
  selectedChildId={formData.childId}
  onChildSelect={handleChildSelect}
  placeholder="Select a child for this update"
  size="lg"
/>
```

**Benefits:**
- Better visual recognition
- Faster selection (no dropdown open/close)
- More intuitive UX
- Consistent pattern across app
- Touch-friendly

---

## Browser Support

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+
- Mobile Safari (iOS 14+)
- Chrome Mobile

---

## Related Components

- [Button](./design-system/README.md#buttons)
- [LoadingSpinner](./design-system/README.md#feedback-components)
- [ChildImage](../src/components/ui/ChildImage.tsx)

---

## Changelog

### v1.0.0 (2025-10-07)
- Initial implementation
- ProfileIcon base component
- ProfileSelector generic component
- ChildProfileSelector wrapper
- RecipientProfileSelector wrapper
- Full accessibility support
- Responsive grid layout
- Keyboard navigation
- AI suggestion support

---

*For questions or issues, please refer to the main [Design System README](../src/design-system/README.md)*
