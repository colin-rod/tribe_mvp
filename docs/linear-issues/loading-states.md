# Loading States for All Async Operations

**Priority**: High
**Category**: User Experience
**Effort**: Large
**Labels**: ux, performance, accessibility

## Description

Implement comprehensive loading states for all asynchronous operations throughout the application to provide clear feedback to users during data fetching, form submissions, and other async actions.

## Problem Statement

Currently, many async operations lack visual feedback, leading to:
- Users clicking multiple times (duplicate submissions)
- Uncertainty about whether actions are processing
- Poor perceived performance
- Accessibility issues for screen reader users
- Confusion during slow network conditions

## Scope

This issue covers loading states for:
1. **Data Fetching** - API calls, database queries
2. **Form Submissions** - Create/update/delete operations
3. **File Uploads** - Media/avatar uploads with progress
4. **Navigation** - Page transitions
5. **Authentication** - Login, signup, logout
6. **Bulk Operations** - Batch updates, email sending

## Technical Requirements

### 1. Loading State Components

Create reusable loading components:

```tsx
// Skeleton loaders
<UpdateCardSkeleton />
<RecipientListSkeleton />
<DashboardSkeleton />

// Spinner variants
<Spinner size="sm" | "md" | "lg" />
<ButtonSpinner /> // Inline in buttons

// Progress bars
<ProgressBar value={progress} />
<LinearProgress indeterminate />

// Overlay loaders
<LoadingOverlay message="Processing..." />
```

### 2. Hook-Based State Management

```typescript
// Generic async action hook
const { loading, error, execute } = useAsyncAction(asyncFn)

// Mutation hook with loading
const { mutate, isLoading } = useMutation({
  mutationFn: createUpdate,
  onSuccess: () => {
    toast.success('Update created!')
  }
})

// Query hook with suspense
const { data, isLoading } = useQuery({
  queryKey: ['updates'],
  queryFn: fetchUpdates
})
```

### 3. Button States

All action buttons should have loading states:

```tsx
<Button
  onClick={handleSubmit}
  loading={isSubmitting}
  disabled={isSubmitting}
>
  {isSubmitting ? 'Creating...' : 'Create Update'}
</Button>
```

### 4. Form States

Forms should disable inputs during submission:

```tsx
<form onSubmit={handleSubmit}>
  <fieldset disabled={isSubmitting}>
    {/* All form inputs */}
  </fieldset>
  <Button type="submit" loading={isSubmitting}>
    Submit
  </Button>
</form>
```

### 5. Page-Level Loading

Use Next.js loading.tsx files:

```tsx
// app/dashboard/loading.tsx
export default function DashboardLoading() {
  return <DashboardSkeleton />
}
```

### 6. Upload Progress

File uploads should show progress:

```tsx
<UploadProgress
  fileName={file.name}
  progress={uploadProgress}
  onCancel={cancelUpload}
/>
```

## Acceptance Criteria

### General Requirements
- [ ] All async operations show loading state
- [ ] Loading states are visually distinct and clear
- [ ] Buttons disable during async operations
- [ ] Forms disable inputs during submission
- [ ] Loading states are accessible (ARIA labels)
- [ ] Screen readers announce loading states
- [ ] Consistent loading UI across the app
- [ ] Smooth transitions between states (no flash)
- [ ] Error states handled gracefully

### Specific Areas

**Dashboard:**
- [ ] Updates list shows skeleton while loading
- [ ] Refresh button shows spinner when loading
- [ ] Filter changes show loading indicator
- [ ] Infinite scroll shows "Loading more..."

**Create Update:**
- [ ] Form disables during submission
- [ ] Submit button shows spinner
- [ ] Media upload shows progress bar
- [ ] AI suggestions show loading state

**Recipients:**
- [ ] Recipient list shows skeleton while loading
- [ ] Add recipient form shows loading on submit
- [ ] Bulk actions show progress
- [ ] Delete confirmation shows loading

**Profile:**
- [ ] Avatar upload shows progress
- [ ] Save button shows loading state
- [ ] Profile data loads with skeleton

**Authentication:**
- [ ] Login button shows spinner
- [ ] Signup button shows spinner
- [ ] Logout shows confirmation loading
- [ ] Password reset shows loading

**Email Sending:**
- [ ] Send button shows loading
- [ ] Bulk send shows progress bar
- [ ] Delivery status updates in real-time

### Performance Requirements
- [ ] Skeleton loaders appear instantly (<100ms)
- [ ] Spinners appear after 300ms (avoid flash)
- [ ] Long operations show progress (>3s)
- [ ] Timeout handling (>30s operations)

## Design Specifications

### Loading Spinner
- Size variants: sm (16px), md (24px), lg (32px)
- Color: Primary brand color
- Animation: Smooth rotation (1s duration)
- Accessible label: "Loading..."

### Skeleton Loaders
- Background: Neutral gray gradient
- Animation: Shimmer effect (1.5s loop)
- Match actual content dimensions
- Preserve layout (no CLS)

### Progress Bars
- Height: 4px (linear), 8px (circular)
- Color: Primary brand color
- Show percentage for long operations
- Indeterminate for unknown duration

### Button Loading States
```tsx
// Default button
<Button>Submit</Button>

// Loading button
<Button loading>
  <Spinner size="sm" />
  <span>Submitting...</span>
</Button>

// Success state (brief)
<Button success>
  <CheckIcon />
  <span>Saved!</span>
</Button>
```

## Code Examples

### 1. Async Action Hook

```typescript
// hooks/useAsyncAction.ts
export function useAsyncAction<T>(
  action: () => Promise<T>
) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const execute = async () => {
    setLoading(true)
    setError(null)

    try {
      const result = await action()
      return result
    } catch (err) {
      setError(err as Error)
      throw err
    } finally {
      setLoading(false)
    }
  }

  return { loading, error, execute }
}
```

### 2. Button Component with Loading

```tsx
// components/ui/Button.tsx
interface ButtonProps {
  loading?: boolean
  success?: boolean
  children: React.ReactNode
  onClick?: () => void
  disabled?: boolean
}

export function Button({
  loading,
  success,
  children,
  onClick,
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={loading || disabled}
      className={cn(
        'btn',
        loading && 'btn-loading',
        success && 'btn-success'
      )}
      aria-busy={loading}
      {...props}
    >
      {loading && <Spinner size="sm" />}
      {success && <CheckIcon />}
      {!loading && !success && children}
    </button>
  )
}
```

### 3. Skeleton Loader

```tsx
// components/ui/Skeleton.tsx
export function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'animate-pulse rounded-md bg-neutral-200',
        className
      )}
      aria-label="Loading..."
      role="status"
      {...props}
    />
  )
}

// Usage
export function UpdateCardSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-12 w-12 rounded-full" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="h-32 w-full" />
    </div>
  )
}
```

### 4. Upload Progress

```tsx
// components/media/UploadProgress.tsx
interface UploadProgressProps {
  fileName: string
  progress: number
  onCancel: () => void
}

export function UploadProgress({
  fileName,
  progress,
  onCancel
}: UploadProgressProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm">{fileName}</span>
        <span className="text-sm text-neutral-600">
          {progress}%
        </span>
      </div>
      <ProgressBar value={progress} />
      <Button
        size="sm"
        variant="ghost"
        onClick={onCancel}
      >
        Cancel
      </Button>
    </div>
  )
}
```

### 5. Form with Loading State

```tsx
// components/updates/CreateUpdateForm.tsx
export function CreateUpdateForm() {
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      await createUpdate(formData)
      toast.success('Update created!')
      router.push('/dashboard')
    } catch (error) {
      toast.error('Failed to create update')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <fieldset disabled={isSubmitting}>
        <Input
          name="content"
          label="Update content"
        />
        {/* More inputs */}
      </fieldset>

      <Button
        type="submit"
        loading={isSubmitting}
      >
        {isSubmitting ? 'Creating...' : 'Create Update'}
      </Button>
    </form>
  )
}
```

## Accessibility Requirements

- All loading states have `aria-busy="true"`
- Loading indicators have `role="status"`
- Screen readers announce state changes
- Loading text alternatives provided
- Keyboard navigation not blocked during loading
- Focus management during state transitions

## Testing Checklist

### Visual Testing
- [ ] Loading states appear correctly
- [ ] Animations are smooth
- [ ] No layout shift (CLS)
- [ ] Works on all screen sizes
- [ ] Dark mode support (if applicable)

### Functional Testing
- [ ] Buttons disable during loading
- [ ] Forms disable during submission
- [ ] Duplicate submissions prevented
- [ ] Cancel actions work correctly
- [ ] Errors display after loading

### Accessibility Testing
- [ ] Screen reader announces loading
- [ ] ARIA attributes correct
- [ ] Keyboard navigation works
- [ ] Focus management correct
- [ ] Color contrast sufficient

### Performance Testing
- [ ] Loading states appear quickly
- [ ] No flash of loading (delay 300ms)
- [ ] Progress updates smoothly
- [ ] Memory leaks avoided
- [ ] Cleanup on unmount

### Network Testing
- [ ] Fast connection: smooth experience
- [ ] Slow connection: clear feedback
- [ ] Offline: appropriate handling
- [ ] Timeout: error message shown

## Areas Requiring Loading States

1. **Dashboard**
   - Updates list loading
   - Filter application
   - Refresh action
   - Infinite scroll

2. **Create/Edit Update**
   - Form submission
   - Media upload
   - AI generation
   - Draft saving

3. **Recipients**
   - List loading
   - Add/edit forms
   - Bulk operations
   - Delete confirmations

4. **Children**
   - List loading
   - Add/edit forms
   - Avatar upload

5. **Profile**
   - Profile data loading
   - Avatar upload
   - Save changes
   - Delete account

6. **Authentication**
   - Login
   - Signup
   - Logout
   - Password reset

7. **Groups**
   - Group list
   - Member management
   - Preference updates

8. **Email Distribution**
   - Send operation
   - Bulk send
   - Delivery status

9. **Responses**
   - Thread loading
   - Submit reply
   - Load more

## Implementation Strategy

### Phase 1: Core Components (Week 1)
1. Create base Skeleton component
2. Create Spinner component
3. Create ProgressBar component
4. Create LoadingOverlay component
5. Update Button component with loading prop

### Phase 2: Forms (Week 2)
1. Add loading to all form submissions
2. Implement field disabling during submit
3. Add upload progress indicators
4. Handle form errors after loading

### Phase 3: Data Fetching (Week 3)
1. Add skeleton loaders to all lists
2. Implement page-level loading.tsx files
3. Add refresh action loaders
4. Handle infinite scroll loading

### Phase 4: Bulk Operations (Week 4)
1. Add progress bars for bulk actions
2. Implement cancelable operations
3. Show operation status updates
4. Handle batch errors

### Phase 5: Polish & Testing (Week 5)
1. Ensure consistent timing
2. Test accessibility
3. Optimize animations
4. Document patterns

## Dependencies

- React useState, useEffect, useTransition
- Next.js Suspense and loading.tsx
- Framer Motion (for animations)
- React Query / SWR (for data fetching)

## Related Issues

- CRO-31: Profile Management UI
- Offline Handling issue
- Error Pages issue

## Files to Create

- `/src/components/ui/Skeleton.tsx`
- `/src/components/ui/Spinner.tsx`
- `/src/components/ui/ProgressBar.tsx`
- `/src/components/ui/LoadingOverlay.tsx`
- `/src/hooks/useAsyncAction.ts`
- `/src/hooks/useLoadingState.ts`
- `/src/app/*/loading.tsx` (multiple pages)
- `/src/__tests__/ui/loading-states.test.tsx`

## Files to Modify

- `/src/components/ui/Button.tsx` - Add loading prop
- All form components - Add loading states
- All list components - Add skeleton loaders
- All data fetching - Add loading indicators

## Estimated Effort

- Component Creation: 16 hours
- Form Updates: 20 hours
- Data Fetching Updates: 24 hours
- Bulk Operations: 12 hours
- Testing & Polish: 16 hours
- **Total: 88 hours** (~11 days, 2 weeks with 2 devs)

## Success Metrics

- Zero user reports of "not knowing if something is loading"
- <1% duplicate submissions
- 95% of operations have clear loading feedback
- All accessibility audits pass
- Positive feedback on perceived performance
