# Custom 404 and Error Pages

**Priority**: Medium
**Category**: User Experience
**Effort**: Small
**Labels**: ux, error-handling, pages

## Description

Create custom error pages (404, 500, etc.) that match the Tribe brand, provide helpful information, and guide users back to useful parts of the application.

## Problem Statement

Currently, the application may show default or generic error pages when issues occur. This creates a poor user experience because:
- Users don't know what went wrong
- No guidance on what to do next
- Breaks brand continuity
- Doesn't help users recover from errors
- Looks unprofessional

## Error Pages Needed

### 1. 404 - Not Found
**When it appears:**
- User navigates to non-existent URL
- Bookmark/link to deleted content
- Typo in URL

**User needs:**
- Understand the page doesn't exist
- Easy way to navigate back
- Search or browse alternatives

### 2. 500 - Internal Server Error
**When it appears:**
- Server-side crash
- Database connection failure
- Unhandled exception

**User needs:**
- Know it's not their fault
- Estimated fix time (if known)
- Alternative actions

### 3. 403 - Forbidden
**When it appears:**
- Insufficient permissions
- Accessing another user's data
- Invalid authentication token

**User needs:**
- Understand why access denied
- How to get access (if applicable)
- Contact info for support

### 4. 401 - Unauthorized
**When it appears:**
- Not logged in
- Session expired
- Invalid credentials

**User needs:**
- Clear login prompt
- "Remember me" option
- Password reset link

### 5. 503 - Service Unavailable
**When it appears:**
- Scheduled maintenance
- Server overload
- Deployment in progress

**User needs:**
- Maintenance schedule
- Expected downtime
- Status page link

### 6. Network Error
**When it appears:**
- Client offline
- DNS failure
- Firewall blocking

**User needs:**
- Network troubleshooting
- Offline capabilities
- Retry option

### 7. Rate Limited
**When it appears:**
- Too many requests
- API quota exceeded
- DDoS protection triggered

**User needs:**
- When they can retry
- Rate limit details
- Premium upgrade options

## Design Specifications

### Visual Elements
- Tribe logo and branding
- Consistent color scheme
- Error illustration/icon
- Clear typography hierarchy
- Mobile-responsive layout

### Content Structure
```
1. Error code and title (H1)
2. Friendly explanation (paragraph)
3. Helpful suggestions (list)
4. Primary action button
5. Secondary links
6. Contact/support info
```

### Tone of Voice
- **Friendly**: Not technical jargon
- **Helpful**: Actionable next steps
- **Reassuring**: "We're on it" messaging
- **Honest**: Don't hide the problem
- **Brief**: Get user back on track quickly

## Technical Implementation

### Next.js Error Pages

```typescript
// app/not-found.tsx (404)
export default function NotFound() {
  return (
    <ErrorLayout>
      <ErrorIcon type="404" />
      <h1>Page Not Found</h1>
      <p>
        Sorry, we couldn't find the page you're looking for.
        It might have been moved or deleted.
      </p>
      <ErrorActions>
        <Button href="/dashboard" variant="primary">
          Go to Dashboard
        </Button>
        <Button href="/" variant="secondary">
          Go to Home
        </Button>
      </ErrorActions>
      <ErrorHelp>
        <p>Need help? <a href="/support">Contact Support</a></p>
      </ErrorHelp>
    </ErrorLayout>
  )
}

// app/error.tsx (500 and other errors)
'use client'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Log error to monitoring service
    console.error('Application error:', error)
  }, [error])

  return (
    <ErrorLayout>
      <ErrorIcon type="500" />
      <h1>Something Went Wrong</h1>
      <p>
        We're sorry, but something unexpected happened.
        Our team has been notified and is working on a fix.
      </p>
      <ErrorActions>
        <Button onClick={reset} variant="primary">
          Try Again
        </Button>
        <Button href="/dashboard" variant="secondary">
          Go to Dashboard
        </Button>
      </ErrorActions>
      {process.env.NODE_ENV === 'development' && (
        <ErrorDetails>
          <summary>Error Details</summary>
          <pre>{error.message}</pre>
          <pre>{error.stack}</pre>
        </ErrorDetails>
      )}
    </ErrorLayout>
  )
}

// app/global-error.tsx (Catch-all)
'use client'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <html>
      <body>
        <ErrorLayout>
          <h1>Application Error</h1>
          <p>A critical error occurred. Please refresh the page.</p>
          <Button onClick={reset}>Refresh Page</Button>
        </ErrorLayout>
      </body>
    </html>
  )
}
```

### Error Boundary Component

```tsx
// components/ErrorBoundary.tsx
'use client'

import { Component, ReactNode } from 'react'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error?: Error
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log to monitoring service
    console.error('ErrorBoundary caught:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <DefaultErrorFallback
          error={this.state.error}
          reset={() => this.setState({ hasError: false })}
        />
      )
    }

    return this.props.children
  }
}
```

### HTTP Error Handler

```typescript
// lib/errors/http-errors.ts
export class HttpError extends Error {
  constructor(
    public statusCode: number,
    public message: string,
    public userMessage?: string
  ) {
    super(message)
    this.name = 'HttpError'
  }
}

export function handleHttpError(error: unknown) {
  if (error instanceof HttpError) {
    switch (error.statusCode) {
      case 401:
        return redirect('/login')
      case 403:
        return <ForbiddenError />
      case 404:
        return <NotFoundError />
      case 429:
        return <RateLimitError />
      case 503:
        return <MaintenanceError />
      default:
        return <ServerError />
    }
  }

  // Unknown error
  return <GenericError error={error} />
}
```

## Error Page Content

### 404 - Not Found

```tsx
<ErrorPage>
  <ErrorIcon>
    <MagnifyingGlassIcon className="h-24 w-24 text-neutral-400" />
  </ErrorIcon>

  <h1 className="text-4xl font-bold text-neutral-900">
    Page Not Found
  </h1>

  <p className="text-lg text-neutral-600 max-w-md">
    The page you're looking for doesn't exist or has been moved.
  </p>

  <div className="space-y-2">
    <h2 className="text-sm font-medium text-neutral-700">
      Here are some helpful links:
    </h2>
    <ul className="space-y-1">
      <li>
        <a href="/dashboard" className="text-primary-600 hover:underline">
          View Your Dashboard
        </a>
      </li>
      <li>
        <a href="/dashboard/updates" className="text-primary-600 hover:underline">
          Browse Updates
        </a>
      </li>
      <li>
        <a href="/dashboard/recipients" className="text-primary-600 hover:underline">
          Manage Recipients
        </a>
      </li>
    </ul>
  </div>

  <ErrorActions>
    <Button href="/dashboard" variant="primary">
      Go to Dashboard
    </Button>
    <Button href="/" variant="secondary">
      Go Home
    </Button>
  </ErrorActions>
</ErrorPage>
```

### 500 - Internal Server Error

```tsx
<ErrorPage>
  <ErrorIcon>
    <ExclamationTriangleIcon className="h-24 w-24 text-red-500" />
  </ErrorIcon>

  <h1 className="text-4xl font-bold text-neutral-900">
    Something Went Wrong
  </h1>

  <p className="text-lg text-neutral-600 max-w-md">
    We encountered an unexpected error. Our team has been automatically
    notified and is working on a fix.
  </p>

  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 max-w-md">
    <p className="text-sm text-blue-800">
      💡 <strong>Tip:</strong> Try refreshing the page or clearing your
      browser cache.
    </p>
  </div>

  <ErrorActions>
    <Button onClick={() => window.location.reload()} variant="primary">
      Refresh Page
    </Button>
    <Button href="/dashboard" variant="secondary">
      Go to Dashboard
    </Button>
  </ErrorActions>

  <p className="text-sm text-neutral-500">
    Error ID: {errorId} • <a href="/support" className="underline">Contact Support</a>
  </p>
</ErrorPage>
```

### 403 - Forbidden

```tsx
<ErrorPage>
  <ErrorIcon>
    <LockClosedIcon className="h-24 w-24 text-amber-500" />
  </ErrorIcon>

  <h1 className="text-4xl font-bold text-neutral-900">
    Access Denied
  </h1>

  <p className="text-lg text-neutral-600 max-w-md">
    You don't have permission to access this page. This might be because:
  </p>

  <ul className="text-left space-y-2 text-neutral-700">
    <li>• You're trying to access someone else's content</li>
    <li>• Your account doesn't have the required permissions</li>
    <li>• This content has been removed or restricted</li>
  </ul>

  <ErrorActions>
    <Button href="/dashboard" variant="primary">
      Go to Dashboard
    </Button>
    <Button href="/support" variant="secondary">
      Contact Support
    </Button>
  </ErrorActions>
</ErrorPage>
```

### 401 - Unauthorized (Session Expired)

```tsx
<ErrorPage>
  <ErrorIcon>
    <UserIcon className="h-24 w-24 text-neutral-400" />
  </ErrorIcon>

  <h1 className="text-4xl font-bold text-neutral-900">
    Session Expired
  </h1>

  <p className="text-lg text-neutral-600 max-w-md">
    Your session has expired for security reasons. Please log in again
    to continue.
  </p>

  <ErrorActions>
    <Button href="/login" variant="primary">
      Log In
    </Button>
    <Button href="/" variant="secondary">
      Go Home
    </Button>
  </ErrorActions>

  <p className="text-sm text-neutral-500">
    <a href="/forgot-password" className="underline">Forgot your password?</a>
  </p>
</ErrorPage>
```

### 503 - Maintenance

```tsx
<ErrorPage>
  <ErrorIcon>
    <WrenchIcon className="h-24 w-24 text-blue-500" />
  </ErrorIcon>

  <h1 className="text-4xl font-bold text-neutral-900">
    Scheduled Maintenance
  </h1>

  <p className="text-lg text-neutral-600 max-w-md">
    We're currently performing scheduled maintenance to improve your
    experience. We'll be back shortly.
  </p>

  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 max-w-md">
    <p className="text-sm text-blue-800">
      <strong>Expected Duration:</strong> 30 minutes<br />
      <strong>Completion Time:</strong> 3:00 PM EST
    </p>
  </div>

  <ErrorActions>
    <Button onClick={() => window.location.reload()} variant="primary">
      Check Status
    </Button>
    <Button href="https://status.tribe-app.com" variant="secondary">
      Status Page
    </Button>
  </ErrorActions>
</ErrorPage>
```

## Acceptance Criteria

### Functional Requirements
- [ ] Custom 404 page implemented
- [ ] Custom 500 error page implemented
- [ ] Custom 403 forbidden page implemented
- [ ] Custom 401 unauthorized page implemented
- [ ] Custom 503 maintenance page implemented
- [ ] Error boundary catches React errors
- [ ] All pages mobile-responsive
- [ ] Navigation buttons work correctly
- [ ] Error logging/monitoring integrated

### Visual Requirements
- [ ] Matches Tribe brand guidelines
- [ ] Consistent layout across all error pages
- [ ] Clear visual hierarchy
- [ ] Appropriate icons/illustrations
- [ ] Accessible color contrast
- [ ] Professional appearance

### Content Requirements
- [ ] Clear, friendly error messages
- [ ] Helpful suggestions for next steps
- [ ] No technical jargon (in prod)
- [ ] Contact/support information
- [ ] Error IDs for support reference

### UX Requirements
- [ ] Primary action button prominent
- [ ] Secondary navigation options
- [ ] Keyboard navigation works
- [ ] Screen reader compatible
- [ ] No dead ends (always path forward)

## Testing Checklist

- [ ] Test 404 by visiting non-existent URL
- [ ] Test 500 by triggering server error
- [ ] Test 403 by accessing unauthorized resource
- [ ] Test 401 by accessing while logged out
- [ ] Test error boundary with React error
- [ ] Test on mobile devices
- [ ] Test with screen reader
- [ ] Test all navigation buttons
- [ ] Test error logging
- [ ] Verify error IDs generated

## Implementation Order

1. **Phase 1: Core Pages** (Day 1-2)
   - Create 404 page
   - Create 500 error page
   - Implement error boundary

2. **Phase 2: Auth Errors** (Day 3)
   - Create 401 unauthorized page
   - Create 403 forbidden page

3. **Phase 3: Service Errors** (Day 4)
   - Create 503 maintenance page
   - Create rate limit page
   - Create network error component

4. **Phase 4: Polish** (Day 5)
   - Add illustrations/icons
   - Refine copy
   - Test all scenarios
   - Add error tracking

## Files to Create

- `/src/app/not-found.tsx` - 404 page
- `/src/app/error.tsx` - 500 error page
- `/src/app/global-error.tsx` - Global error page
- `/src/components/errors/ErrorLayout.tsx` - Shared layout
- `/src/components/errors/ErrorIcon.tsx` - Error icons
- `/src/components/errors/ErrorActions.tsx` - Action buttons
- `/src/components/errors/ErrorBoundary.tsx` - Error boundary
- `/src/components/errors/ForbiddenError.tsx` - 403 page
- `/src/components/errors/UnauthorizedError.tsx` - 401 page
- `/src/components/errors/MaintenanceError.tsx` - 503 page
- `/src/lib/errors/http-errors.ts` - Error utilities

## Related Issues

- Loading States issue
- Offline Handling issue
- Browser Compatibility issue

## Dependencies

- Next.js error handling features
- Error monitoring service (Sentry, etc.)
- Icon library (Heroicons)

## Estimated Effort

- Design & Copy: 6 hours
- Implementation: 12 hours
- Testing: 4 hours
- Polish: 2 hours
- **Total: 24 hours** (~3 days)

## Success Metrics

- Zero user confusion about error states
- <1% of users abandon after error
- Support tickets reference error IDs
- Users can recover from errors
- Professional brand perception maintained
