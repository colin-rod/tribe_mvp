# Offline Handling - Network Failure Strategy

**Priority**: Medium
**Category**: Reliability
**Effort**: Large
**Labels**: ux, reliability, pwa, resilience

## Description

Implement comprehensive offline handling to gracefully manage network failures and provide a smooth user experience when connectivity is lost or unreliable.

## Problem Statement

Currently, the application assumes constant internet connectivity. When network fails:
- Users see cryptic error messages
- Form submissions fail silently
- Data fetch errors are unclear
- No indication of offline status
- No recovery mechanism when connection returns
- Lost work without warning

## Goals

1. **Detect** offline/online status reliably
2. **Inform** users about connectivity status
3. **Handle** failed operations gracefully
4. **Queue** actions for retry when online
5. **Sync** data when connection returns
6. **Persist** critical data locally

## Technical Requirements

### 1. Network Status Detection

```typescript
// hooks/useNetworkStatus.ts
export function useNetworkStatus() {
  const [isOnline, setIsOnline] = useState(true)
  const [wasOffline, setWasOffline] = useState(false)

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true)
      setWasOffline(true)
      // Trigger sync after coming back online
      syncPendingActions()
    }

    const handleOffline = () => {
      setIsOnline(false)
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    // Ping server periodically to verify actual connectivity
    const interval = setInterval(async () => {
      const online = await checkServerReachability()
      setIsOnline(online)
    }, 30000) // Check every 30 seconds

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
      clearInterval(interval)
    }
  }, [])

  return { isOnline, wasOffline }
}
```

### 2. Offline Banner

Display persistent banner when offline:

```tsx
// components/ui/OfflineBanner.tsx
export function OfflineBanner() {
  const { isOnline, wasOffline } = useNetworkStatus()
  const [show, setShow] = useState(false)

  useEffect(() => {
    if (!isOnline) {
      setShow(true)
    } else if (wasOffline) {
      // Show "Back online" briefly
      setTimeout(() => setShow(false), 3000)
    }
  }, [isOnline, wasOffline])

  if (!show) return null

  return (
    <Banner type={isOnline ? 'success' : 'warning'}>
      {isOnline ? (
        <>
          <WifiIcon /> Back online. Syncing...
        </>
      ) : (
        <>
          <WifiOffIcon /> You're offline. Some features may be unavailable.
        </>
      )}
    </Banner>
  )
}
```

### 3. Action Queue System

Queue failed actions for retry:

```typescript
// lib/offline/action-queue.ts
interface QueuedAction {
  id: string
  type: 'create' | 'update' | 'delete'
  resource: string
  data: any
  timestamp: number
  retries: number
}

class ActionQueue {
  private queue: QueuedAction[] = []
  private processing = false

  async add(action: Omit<QueuedAction, 'id' | 'timestamp' | 'retries'>) {
    const queuedAction: QueuedAction = {
      ...action,
      id: generateId(),
      timestamp: Date.now(),
      retries: 0
    }

    this.queue.push(queuedAction)
    await this.persist()
    return queuedAction.id
  }

  async processQueue() {
    if (this.processing || this.queue.length === 0) return

    this.processing = true

    while (this.queue.length > 0) {
      const action = this.queue[0]

      try {
        await this.executeAction(action)
        this.queue.shift() // Remove successful action
        await this.persist()
      } catch (error) {
        action.retries++

        if (action.retries >= 3) {
          // Max retries reached, remove and notify user
          this.queue.shift()
          notifyActionFailed(action)
        } else {
          // Will retry on next sync
          break
        }
      }
    }

    this.processing = false
  }

  private async executeAction(action: QueuedAction) {
    // Execute the queued action based on type
    switch (action.type) {
      case 'create':
        return await api.create(action.resource, action.data)
      case 'update':
        return await api.update(action.resource, action.data)
      case 'delete':
        return await api.delete(action.resource, action.data.id)
    }
  }

  private async persist() {
    // Save queue to localStorage
    localStorage.setItem('action-queue', JSON.stringify(this.queue))
  }

  async restore() {
    // Restore queue from localStorage
    const saved = localStorage.getItem('action-queue')
    if (saved) {
      this.queue = JSON.parse(saved)
    }
  }
}

export const actionQueue = new ActionQueue()
```

### 4. Optimistic Updates

Implement optimistic UI updates:

```typescript
// hooks/useOptimisticMutation.ts
export function useOptimisticMutation<T>({
  mutationFn,
  onSuccess,
  onError
}: MutationOptions<T>) {
  const { isOnline } = useNetworkStatus()
  const [optimisticData, setOptimisticData] = useState<T | null>(null)

  const mutate = async (data: T) => {
    // Show optimistic update immediately
    setOptimisticData(data)

    if (!isOnline) {
      // Queue for later if offline
      await actionQueue.add({
        type: 'create',
        resource: 'updates',
        data
      })
      toast.info('Saved locally. Will sync when online.')
      return
    }

    try {
      const result = await mutationFn(data)
      setOptimisticData(null)
      onSuccess?.(result)
    } catch (error) {
      setOptimisticData(null)
      // Queue for retry
      await actionQueue.add({
        type: 'create',
        resource: 'updates',
        data
      })
      toast.error('Failed to save. Queued for retry.')
      onError?.(error)
    }
  }

  return { mutate, optimisticData }
}
```

### 5. Local Storage Caching

Cache critical data locally:

```typescript
// lib/offline/cache.ts
class OfflineCache {
  private readonly TTL = 24 * 60 * 60 * 1000 // 24 hours

  async get<T>(key: string): Promise<T | null> {
    const item = localStorage.getItem(key)
    if (!item) return null

    const { data, timestamp } = JSON.parse(item)

    // Check if expired
    if (Date.now() - timestamp > this.TTL) {
      localStorage.removeItem(key)
      return null
    }

    return data as T
  }

  async set<T>(key: string, data: T): Promise<void> {
    const item = {
      data,
      timestamp: Date.now()
    }
    localStorage.setItem(key, JSON.stringify(item))
  }

  async invalidate(key: string): Promise<void> {
    localStorage.removeItem(key)
  }
}

export const offlineCache = new OfflineCache()
```

### 6. Fetch with Fallback

Wrap API calls with offline handling:

```typescript
// lib/offline/fetch-with-fallback.ts
export async function fetchWithFallback<T>(
  key: string,
  fetchFn: () => Promise<T>
): Promise<T> {
  try {
    const data = await fetchFn()
    // Cache successful response
    await offlineCache.set(key, data)
    return data
  } catch (error) {
    // If offline, return cached data
    if (!navigator.onLine) {
      const cached = await offlineCache.get<T>(key)
      if (cached) {
        toast.info('Showing cached data (offline)')
        return cached
      }
    }
    throw error
  }
}
```

## Acceptance Criteria

### Detection & Indication
- [ ] Detects when device goes offline
- [ ] Detects when device comes back online
- [ ] Shows offline banner immediately when offline
- [ ] Shows "back online" notification briefly
- [ ] Verifies actual server reachability (not just browser status)
- [ ] Updates status in real-time

### Action Handling
- [ ] Forms show warning when submitting offline
- [ ] Actions are queued when offline
- [ ] Queue persists across page reloads
- [ ] Queue processes automatically when back online
- [ ] Failed actions retry up to 3 times
- [ ] User is notified of permanently failed actions

### Data Management
- [ ] Recently viewed data cached locally
- [ ] Cached data shown when offline (with indicator)
- [ ] Cache expires after 24 hours
- [ ] Cache invalidated when fresh data fetched
- [ ] Optimistic updates shown immediately

### User Experience
- [ ] Clear messaging about offline status
- [ ] Actions don't fail silently
- [ ] No data loss from offline submissions
- [ ] Smooth transition when connectivity returns
- [ ] Option to retry failed actions manually
- [ ] Can view cached content while offline

### Edge Cases
- [ ] Handles slow/intermittent connections
- [ ] Handles partial request failures
- [ ] Prevents duplicate submissions after reconnect
- [ ] Handles conflicts between local and server data
- [ ] Clears old queued actions (>7 days)

## User Scenarios

### Scenario 1: Creating Update While Offline
```
1. User writes an update
2. Loses internet connection
3. Clicks "Create Update"
4. See offline banner
5. Update saved locally with "Queued" badge
6. Connection restored
7. Banner shows "Back online. Syncing..."
8. Update automatically syncs to server
9. Success notification shown
```

### Scenario 2: Browsing While Offline
```
1. User browses dashboard
2. Loses connection
3. Sees offline banner
4. Previously loaded updates still visible
5. Can view update details
6. Cannot create new updates (button disabled)
7. Sees "You're offline" message on disabled actions
```

### Scenario 3: Intermittent Connection
```
1. User on slow/spotty connection
2. Request times out
3. Error message: "Connection issue. Retrying..."
4. Automatic retry attempts (3 times)
5. After 3 failures: "Still having trouble. Try again later."
6. Action queued for when connection improves
```

## UI Components

### 1. Offline Banner
```tsx
<Banner variant={isOnline ? 'success' : 'warning'}>
  {isOnline ? (
    <div className="flex items-center gap-2">
      <WifiIcon className="text-green-600" />
      <span>Back online</span>
      {queueLength > 0 && (
        <span className="text-sm">
          Syncing {queueLength} pending {pluralize('action', queueLength)}...
        </span>
      )}
    </div>
  ) : (
    <div className="flex items-center gap-2">
      <WifiOffIcon className="text-amber-600" />
      <span>You're offline</span>
      <span className="text-sm">Changes will sync when you're back online</span>
    </div>
  )}
</Banner>
```

### 2. Queued Action Badge
```tsx
<Badge variant="warning">
  <ClockIcon /> Queued
</Badge>
```

### 3. Retry Button
```tsx
<Button
  variant="secondary"
  onClick={retryFailedActions}
>
  <RefreshIcon /> Retry Failed Actions ({failedCount})
</Button>
```

### 4. Cached Data Indicator
```tsx
<div className="text-sm text-neutral-600 flex items-center gap-1">
  <DatabaseIcon className="h-4 w-4" />
  Showing cached data (offline)
</div>
```

## Error Messages

### Offline Errors
- "You're offline. This action will be saved and synced when you're back online."
- "Showing cached data from earlier (offline)"
- "Some features are unavailable while offline"

### Retry Messages
- "Connection issue. Retrying... (attempt 2 of 3)"
- "Still having trouble connecting. We'll keep trying in the background."
- "Action failed after multiple attempts. Please try again later."

### Success Messages
- "Back online! Syncing your changes..."
- "Successfully synced 3 pending actions"
- "All changes saved to server"

## Technical Implementation

### Phase 1: Detection (Week 1)
- Implement useNetworkStatus hook
- Add server reachability check
- Create offline banner component
- Test detection reliability

### Phase 2: UI Indicators (Week 2)
- Add offline banner to layout
- Update buttons to show offline state
- Add cached data indicators
- Implement loading states during sync

### Phase 3: Action Queue (Week 3)
- Build action queue system
- Implement localStorage persistence
- Create retry mechanism
- Add conflict resolution

### Phase 4: Caching (Week 4)
- Implement offline cache
- Add cache warming for critical data
- Create cache invalidation logic
- Handle cache expiry

### Phase 5: Integration (Week 5)
- Integrate with all forms
- Update API calls with fallback
- Add optimistic updates
- Handle edge cases

### Phase 6: Testing (Week 6)
- Test all offline scenarios
- Test reconnection logic
- Performance testing
- User acceptance testing

## Testing Strategy

### Manual Testing
1. **Offline Mode**
   - Disable network in DevTools
   - Try all major actions
   - Verify queuing works
   - Re-enable network
   - Verify sync works

2. **Slow Connection**
   - Throttle network to 3G
   - Test form submissions
   - Verify timeout handling
   - Check retry logic

3. **Intermittent Connection**
   - Toggle network on/off rapidly
   - Verify state consistency
   - Check for race conditions

### Automated Tests
```typescript
describe('Offline Handling', () => {
  it('detects offline status', () => {
    // Mock navigator.onLine
    mockNavigatorOffline()
    const { isOnline } = renderHook(() => useNetworkStatus())
    expect(isOnline).toBe(false)
  })

  it('queues actions when offline', async () => {
    mockNavigatorOffline()
    await createUpdate(data)
    expect(actionQueue.length).toBe(1)
  })

  it('syncs queue when back online', async () => {
    // Start offline with queued action
    mockNavigatorOffline()
    await createUpdate(data)

    // Go online
    mockNavigatorOnline()
    triggerOnlineEvent()

    // Wait for sync
    await waitFor(() => {
      expect(actionQueue.length).toBe(0)
    })
  })

  it('shows cached data when offline', async () => {
    // Cache data
    await offlineCache.set('updates', mockData)

    // Go offline
    mockNavigatorOffline()

    // Fetch should return cached data
    const data = await fetchUpdates()
    expect(data).toEqual(mockData)
  })
})
```

## Dependencies

- localStorage API (built-in)
- navigator.onLine API (built-in)
- React hooks
- Toast notifications
- LocalForage (optional, for larger data)

## Related Issues

- Loading States issue
- Error Pages issue
- CRO-109: Rate Limiting

## Performance Considerations

- Queue size limit (max 100 actions)
- Cache size limit (max 10MB)
- Periodic cache cleanup
- Efficient diff algorithms for sync
- Debounce network status checks

## Security Considerations

- Sensitive data not cached locally
- Queue encryption in localStorage
- Clear cache on logout
- Validate queued actions before execution
- Rate limiting on retry attempts

## Accessibility

- Screen reader announcements for status changes
- Visual and auditory feedback
- Keyboard shortcuts for retry
- High contrast mode support

## Files to Create

- `/src/hooks/useNetworkStatus.ts`
- `/src/hooks/useOptimisticMutation.ts`
- `/src/lib/offline/action-queue.ts`
- `/src/lib/offline/cache.ts`
- `/src/lib/offline/fetch-with-fallback.ts`
- `/src/components/ui/OfflineBanner.tsx`
- `/src/__tests__/offline/network-status.test.ts`
- `/src/__tests__/offline/action-queue.test.ts`

## Files to Modify

- `/src/app/layout.tsx` - Add offline banner
- `/src/components/ui/Button.tsx` - Add offline state
- All form components - Add offline handling
- All API calls - Wrap with fallback

## Estimated Effort

- Network Detection: 8 hours
- UI Indicators: 12 hours
- Action Queue: 24 hours
- Caching System: 20 hours
- Integration: 24 hours
- Testing: 16 hours
- **Total: 104 hours** (~13 days, 2.5 weeks with 2 devs)

## Success Metrics

- Zero data loss from offline submissions
- <5% of users report connectivity confusion
- 95% of queued actions sync successfully
- Average sync time <5 seconds
- Cache hit rate >80% when offline
