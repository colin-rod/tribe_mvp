# Test Templates & Examples

This document provides ready-to-use test templates for the highest-priority untested areas.

---

## Template 1: API Route Integration Test

**File:** `src/__tests__/api/groups.integration.test.ts`

```typescript
import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { GET, POST } from '@/app/api/groups/route'
import { GroupCacheManager } from '@/lib/group-cache'

// Mock dependencies
jest.mock('@/lib/supabase/server')
jest.mock('@/lib/group-cache')
jest.mock('next/headers', () => ({
  cookies: jest.fn(() => Promise.resolve({}))
}))

const mockSupabase = {
  auth: {
    getUser: jest.fn()
  },
  from: jest.fn(() => ({
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    single: jest.fn()
  }))
}

;(createClient as jest.Mock).mockReturnValue(mockSupabase)

describe('Groups API Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('GET /api/groups', () => {
    it('requires authentication', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'Not authenticated' }
      })

      const request = new NextRequest('http://localhost/api/groups')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Authentication required')
    })

    it('returns user groups with counts', async () => {
      const mockUser = { id: 'user-123', email: 'test@example.com' }
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null
      })

      const mockGroups = [
        { id: 'g1', name: 'Family', is_default_group: true },
        { id: 'g2', name: 'Friends', is_default_group: false },
        { id: 'g3', name: 'Work', is_default_group: false }
      ]

      ;(GroupCacheManager.getUserGroups as jest.Mock).mockResolvedValue(mockGroups)

      const request = new NextRequest('http://localhost/api/groups')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.groups).toHaveLength(3)
      expect(data.total_count).toBe(3)
      expect(data.default_groups).toBe(1)
      expect(data.custom_groups).toBe(2)
    })
  })

  describe('POST /api/groups', () => {
    it('creates group with valid data', async () => {
      const mockUser = { id: 'user-123', email: 'test@example.com' }
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null
      })

      // Mock existing groups check
      ;(GroupCacheManager.getUserGroups as jest.Mock).mockResolvedValue([])

      const newGroup = {
        id: 'new-group',
        name: 'New Group',
        parent_id: 'user-123',
        default_frequency: 'daily_digest',
        default_channels: ['email']
      }

      mockSupabase.from().insert().select().single.mockResolvedValue({
        data: newGroup,
        error: null
      })

      const request = new NextRequest('http://localhost/api/groups', {
        method: 'POST',
        body: JSON.stringify({
          name: 'New Group',
          default_frequency: 'daily_digest',
          default_channels: ['email']
        })
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data.group).toEqual(newGroup)
      expect(data.message).toBe('Group created successfully')
    })

    it('enforces 25 group limit', async () => {
      const mockUser = { id: 'user-123', email: 'test@example.com' }
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null
      })

      // Mock 25 existing groups
      const existingGroups = Array(25).fill(null).map((_, i) => ({
        id: `group-${i}`,
        name: `Group ${i}`
      }))

      ;(GroupCacheManager.getUserGroups as jest.Mock).mockResolvedValue(existingGroups)

      const request = new NextRequest('http://localhost/api/groups', {
        method: 'POST',
        body: JSON.stringify({
          name: 'Too Many Groups',
          default_frequency: 'daily_digest',
          default_channels: ['email']
        })
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('Maximum number of groups')
    })

    it('prevents duplicate group names', async () => {
      const mockUser = { id: 'user-123', email: 'test@example.com' }
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null
      })

      const existingGroups = [
        { id: 'g1', name: 'Family', is_default_group: true }
      ]

      ;(GroupCacheManager.getUserGroups as jest.Mock).mockResolvedValue(existingGroups)

      const request = new NextRequest('http://localhost/api/groups', {
        method: 'POST',
        body: JSON.stringify({
          name: 'family', // Case-insensitive duplicate
          default_frequency: 'daily_digest',
          default_channels: ['email']
        })
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(409)
      expect(data.error).toBe('Group name already exists')
    })

    it('invalidates cache after creation', async () => {
      const mockUser = { id: 'user-123', email: 'test@example.com' }
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null
      })

      ;(GroupCacheManager.getUserGroups as jest.Mock).mockResolvedValue([])

      const newGroup = {
        id: 'new-group',
        name: 'Cache Test',
        parent_id: 'user-123'
      }

      mockSupabase.from().insert().select().single.mockResolvedValue({
        data: newGroup,
        error: null
      })

      const request = new NextRequest('http://localhost/api/groups', {
        method: 'POST',
        body: JSON.stringify({
          name: 'Cache Test',
          default_frequency: 'daily_digest',
          default_channels: ['email']
        })
      })

      await POST(request)

      expect(GroupCacheManager.invalidateUserCache).toHaveBeenCalledWith('user-123')
    })
  })
})
```

---

## Template 2: Service Layer Test

**File:** `src/__tests__/services/invitationService.test.ts`

```typescript
import { createClient } from '@/lib/supabase/client'
import {
  createSingleUseInvitation,
  createReusableLink,
  validateInvitation,
  redeemInvitation
} from '@/lib/services/invitationService'

jest.mock('@/lib/supabase/client')

const mockSupabase = {
  from: jest.fn(() => ({
    select: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    single: jest.fn()
  }))
}

;(createClient as jest.Mock).mockReturnValue(mockSupabase)

describe('Invitation Service', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('createSingleUseInvitation', () => {
    it('creates invitation with secure token', async () => {
      const mockParent = { id: 'parent-123', name: 'John Doe' }
      const mockInvitation = {
        id: 'inv-123',
        token: 'secure-token-abc',
        invitation_type: 'single_use',
        channel: 'email',
        recipient_email: 'test@example.com',
        status: 'active'
      }

      mockSupabase.from().select().eq().single.mockResolvedValueOnce({
        data: mockParent,
        error: null
      })

      mockSupabase.from().insert().select().single.mockResolvedValueOnce({
        data: mockInvitation,
        error: null
      })

      const result = await createSingleUseInvitation({
        parentId: 'parent-123',
        email: 'test@example.com',
        channel: 'email',
        expiresInDays: 7
      })

      expect(result).toEqual(mockInvitation)
      expect(result.token).toBeDefined()
      expect(result.token.length).toBeGreaterThan(20)
    })

    it('validates parent exists', async () => {
      mockSupabase.from().select().eq().single.mockResolvedValueOnce({
        data: null,
        error: { message: 'Parent not found' }
      })

      await expect(
        createSingleUseInvitation({
          parentId: 'invalid-parent',
          email: 'test@example.com',
          channel: 'email'
        })
      ).rejects.toThrow('Parent not found')
    })

    it('sets correct expiration date', async () => {
      const mockParent = { id: 'parent-123', name: 'John Doe' }

      mockSupabase.from().select().eq().single.mockResolvedValueOnce({
        data: mockParent,
        error: null
      })

      const insertMock = jest.fn().mockReturnThis()
      mockSupabase.from().insert = insertMock

      insertMock.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { id: 'inv-123' },
          error: null
        })
      })

      await createSingleUseInvitation({
        parentId: 'parent-123',
        email: 'test@example.com',
        channel: 'email',
        expiresInDays: 14
      })

      const insertCall = insertMock.mock.calls[0][0]
      const expiresAt = new Date(insertCall.expires_at)
      const expectedDate = new Date()
      expectedDate.setDate(expectedDate.getDate() + 14)

      expect(expiresAt.getDate()).toBe(expectedDate.getDate())
    })
  })

  describe('validateInvitation', () => {
    it('validates active invitation', async () => {
      const futureDate = new Date()
      futureDate.setDate(futureDate.getDate() + 7)

      const mockInvitation = {
        id: 'inv-123',
        token: 'valid-token',
        status: 'active',
        expires_at: futureDate.toISOString(),
        use_count: 0,
        invitation_type: 'single_use'
      }

      mockSupabase.from().select().eq().single.mockResolvedValue({
        data: mockInvitation,
        error: null
      })

      const result = await validateInvitation('valid-token')

      expect(result.valid).toBe(true)
      expect(result.invitation).toEqual(mockInvitation)
    })

    it('rejects expired invitation', async () => {
      const pastDate = new Date()
      pastDate.setDate(pastDate.getDate() - 1)

      const mockInvitation = {
        id: 'inv-123',
        token: 'expired-token',
        status: 'active',
        expires_at: pastDate.toISOString(),
        use_count: 0
      }

      mockSupabase.from().select().eq().single.mockResolvedValue({
        data: mockInvitation,
        error: null
      })

      const result = await validateInvitation('expired-token')

      expect(result.valid).toBe(false)
      expect(result.reason).toBe('expired')
    })

    it('rejects already used single-use invitation', async () => {
      const futureDate = new Date()
      futureDate.setDate(futureDate.getDate() + 7)

      const mockInvitation = {
        id: 'inv-123',
        token: 'used-token',
        status: 'used',
        expires_at: futureDate.toISOString(),
        use_count: 1,
        invitation_type: 'single_use'
      }

      mockSupabase.from().select().eq().single.mockResolvedValue({
        data: mockInvitation,
        error: null
      })

      const result = await validateInvitation('used-token')

      expect(result.valid).toBe(false)
      expect(result.reason).toBe('already_used')
    })
  })

  describe('redeemInvitation', () => {
    it('creates recipient and updates invitation', async () => {
      const mockInvitation = {
        id: 'inv-123',
        parent_id: 'parent-123',
        group_id: 'group-123',
        status: 'active',
        invitation_type: 'single_use'
      }

      const mockRecipient = {
        id: 'recipient-123',
        parent_id: 'parent-123',
        name: 'Jane Doe',
        email: 'jane@example.com'
      }

      // Mock invitation fetch
      mockSupabase.from().select().eq().single.mockResolvedValueOnce({
        data: mockInvitation,
        error: null
      })

      // Mock recipient creation
      mockSupabase.from().insert().select().single.mockResolvedValueOnce({
        data: mockRecipient,
        error: null
      })

      // Mock invitation update
      mockSupabase.from().update().eq().mockResolvedValueOnce({
        data: null,
        error: null
      })

      const result = await redeemInvitation('inv-token', {
        name: 'Jane Doe',
        email: 'jane@example.com',
        relationship: 'friend'
      })

      expect(result.success).toBe(true)
      expect(result.recipient).toEqual(mockRecipient)
    })
  })
})
```

---

## Template 3: Hook Test with React Testing Library

**File:** `src/hooks/__tests__/useEmailDistribution.test.ts`

```typescript
import { renderHook, act, waitFor } from '@testing-library/react'
import { useEmailDistribution } from '@/hooks/useEmailDistribution'
import { supabase } from '@/lib/supabase/client'

jest.mock('@/lib/supabase/client', () => ({
  supabase: {
    functions: {
      invoke: jest.fn()
    }
  }
}))

describe('useEmailDistribution', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('initializes with default state', () => {
    const { result } = renderHook(() => useEmailDistribution())

    expect(result.current.loading).toBe(false)
    expect(result.current.success).toBeNull()
    expect(result.current.error).toBeNull()
    expect(result.current.deliveryJobs).toEqual([])
  })

  it('sets loading state during distribution', async () => {
    ;(supabase.functions.invoke as jest.Mock).mockImplementation(
      () => new Promise(resolve => setTimeout(() => resolve({ data: { success: true }, error: null }), 100))
    )

    const { result } = renderHook(() => useEmailDistribution())

    act(() => {
      result.current.distributeUpdate({
        update_id: 'update-123',
        recipient_ids: ['rec-1', 'rec-2']
      })
    })

    expect(result.current.loading).toBe(true)

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })
  })

  it('updates delivery jobs on success', async () => {
    const mockDeliveryJobs = [
      { id: 'job-1', recipient_id: 'rec-1', status: 'queued' as const },
      { id: 'job-2', recipient_id: 'rec-2', status: 'queued' as const }
    ]

    ;(supabase.functions.invoke as jest.Mock).mockResolvedValue({
      data: { success: true, delivery_jobs: mockDeliveryJobs },
      error: null
    })

    const { result } = renderHook(() => useEmailDistribution())

    await act(async () => {
      await result.current.distributeUpdate({
        update_id: 'update-123',
        recipient_ids: ['rec-1', 'rec-2']
      })
    })

    expect(result.current.success).toBe(true)
    expect(result.current.deliveryJobs).toEqual(mockDeliveryJobs)
    expect(result.current.error).toBeNull()
  })

  it('handles distribution errors', async () => {
    const errorMessage = 'Failed to distribute email'

    ;(supabase.functions.invoke as jest.Mock).mockResolvedValue({
      data: null,
      error: { message: errorMessage }
    })

    const { result } = renderHook(() => useEmailDistribution())

    await act(async () => {
      const response = await result.current.distributeUpdate({
        update_id: 'update-123',
        recipient_ids: ['rec-1']
      })

      expect(response.success).toBe(false)
      expect(response.error).toBe(errorMessage)
    })

    expect(result.current.success).toBe(false)
    expect(result.current.error).toBe(errorMessage)
  })

  it('resets state correctly', () => {
    const { result } = renderHook(() => useEmailDistribution())

    // Set some state
    act(() => {
      result.current.distributeUpdate({
        update_id: 'update-123',
        recipient_ids: ['rec-1']
      })
    })

    // Reset
    act(() => {
      result.current.resetState()
    })

    expect(result.current.loading).toBe(false)
    expect(result.current.success).toBeNull()
    expect(result.current.error).toBeNull()
    expect(result.current.deliveryJobs).toEqual([])
  })
})
```

---

## Template 4: Authentication Flow Test

**File:** `src/__tests__/auth/authentication.test.ts`

```typescript
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import LoginForm from '@/components/auth/LoginForm'
import { signIn, getAuthErrorMessage } from '@/lib/supabase/auth'
import { useRouter } from 'next/navigation'

jest.mock('@/lib/supabase/auth')
jest.mock('next/navigation', () => ({
  useRouter: jest.fn()
}))

describe('Login Authentication', () => {
  const mockPush = jest.fn()
  const mockRefresh = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
    ;(useRouter as jest.Mock).mockReturnValue({
      push: mockPush,
      refresh: mockRefresh
    })
  })

  it('validates email format', async () => {
    const user = userEvent.setup()
    render(<LoginForm />)

    const emailInput = screen.getByLabelText(/email address/i)
    const submitButton = screen.getByRole('button', { name: /sign in/i })

    await user.type(emailInput, 'invalid-email')

    // HTML5 validation should prevent submission
    expect(submitButton).toBeDisabled()
  })

  it('validates password presence', () => {
    render(<LoginForm />)

    const submitButton = screen.getByRole('button', { name: /sign in/i })

    // Button should be disabled without password
    expect(submitButton).toBeDisabled()
  })

  it('handles invalid credentials', async () => {
    const user = userEvent.setup()
    const errorMessage = 'Invalid email or password'

    ;(signIn as jest.Mock).mockResolvedValue({
      data: { user: null },
      error: { message: 'Invalid login credentials' }
    })
    ;(getAuthErrorMessage as jest.Mock).mockReturnValue(errorMessage)

    render(<LoginForm />)

    await user.type(screen.getByLabelText(/email address/i), 'test@example.com')
    await user.type(screen.getByLabelText(/password/i), 'wrongpassword')
    await user.click(screen.getByRole('button', { name: /sign in/i }))

    await waitFor(() => {
      expect(screen.getByText(errorMessage)).toBeInTheDocument()
    })

    expect(mockPush).not.toHaveBeenCalled()
  })

  it('redirects to dashboard on success', async () => {
    const user = userEvent.setup()

    ;(signIn as jest.Mock).mockResolvedValue({
      data: { user: { id: 'user-123', email: 'test@example.com' } },
      error: null
    })

    render(<LoginForm />)

    await user.type(screen.getByLabelText(/email address/i), 'test@example.com')
    await user.type(screen.getByLabelText(/password/i), 'correctpassword')
    await user.click(screen.getByRole('button', { name: /sign in/i }))

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/dashboard')
      expect(mockRefresh).toHaveBeenCalled()
    })
  })

  it('displays loading state during submission', async () => {
    const user = userEvent.setup()

    ;(signIn as jest.Mock).mockImplementation(
      () => new Promise(resolve => setTimeout(() => resolve({ data: { user: {} }, error: null }), 100))
    )

    render(<LoginForm />)

    await user.type(screen.getByLabelText(/email address/i), 'test@example.com')
    await user.type(screen.getByLabelText(/password/i), 'password123')

    const submitButton = screen.getByRole('button', { name: /sign in/i })
    await user.click(submitButton)

    expect(screen.getByText(/signing in/i)).toBeInTheDocument()
    expect(submitButton).toBeDisabled()

    await waitFor(() => {
      expect(screen.queryByText(/signing in/i)).not.toBeInTheDocument()
    })
  })
})
```

---

## Template 5: Middleware Security Test

**File:** `src/__tests__/middleware/security.test.ts`

```typescript
import { NextRequest } from 'next/server'
import {
  validateCSRF,
  sanitizeRequestBody,
  checkSecurityHeaders
} from '@/lib/middleware/security'

describe('Security Middleware', () => {
  describe('CSRF Protection', () => {
    it('validates CSRF tokens', () => {
      const validToken = 'valid-csrf-token-123'

      const request = new NextRequest('http://localhost/api/test', {
        method: 'POST',
        headers: {
          'x-csrf-token': validToken,
          'cookie': `csrf_token=${validToken}`
        }
      })

      const result = validateCSRF(request)

      expect(result.valid).toBe(true)
    })

    it('rejects invalid tokens', () => {
      const request = new NextRequest('http://localhost/api/test', {
        method: 'POST',
        headers: {
          'x-csrf-token': 'invalid-token',
          'cookie': 'csrf_token=valid-token'
        }
      })

      const result = validateCSRF(request)

      expect(result.valid).toBe(false)
      expect(result.reason).toBe('token_mismatch')
    })

    it('rejects requests without tokens', () => {
      const request = new NextRequest('http://localhost/api/test', {
        method: 'POST'
      })

      const result = validateCSRF(request)

      expect(result.valid).toBe(false)
      expect(result.reason).toBe('missing_token')
    })
  })

  describe('XSS Prevention', () => {
    it('sanitizes request body', () => {
      const maliciousBody = {
        name: '<script>alert("xss")</script>John',
        description: '<img src=x onerror=alert("xss")>',
        safe: 'This is safe content'
      }

      const sanitized = sanitizeRequestBody(maliciousBody)

      expect(sanitized.name).not.toContain('<script>')
      expect(sanitized.description).not.toContain('onerror')
      expect(sanitized.safe).toBe('This is safe content')
    })

    it('sanitizes nested objects', () => {
      const maliciousBody = {
        user: {
          profile: {
            bio: '<script>alert("xss")</script>'
          }
        }
      }

      const sanitized = sanitizeRequestBody(maliciousBody)

      expect(sanitized.user.profile.bio).not.toContain('<script>')
    })

    it('sanitizes arrays', () => {
      const maliciousBody = {
        tags: [
          'safe-tag',
          '<script>alert("xss")</script>',
          'another-safe-tag'
        ]
      }

      const sanitized = sanitizeRequestBody(maliciousBody)

      expect(sanitized.tags[0]).toBe('safe-tag')
      expect(sanitized.tags[1]).not.toContain('<script>')
      expect(sanitized.tags[2]).toBe('another-safe-tag')
    })
  })

  describe('Security Headers', () => {
    it('sets Content-Security-Policy', () => {
      const response = new Response('test')
      checkSecurityHeaders(response)

      expect(response.headers.get('Content-Security-Policy')).toBeTruthy()
    })

    it('sets X-Frame-Options', () => {
      const response = new Response('test')
      checkSecurityHeaders(response)

      expect(response.headers.get('X-Frame-Options')).toBe('DENY')
    })

    it('sets X-Content-Type-Options', () => {
      const response = new Response('test')
      checkSecurityHeaders(response)

      expect(response.headers.get('X-Content-Type-Options')).toBe('nosniff')
    })

    it('sets Strict-Transport-Security', () => {
      const response = new Response('test')
      checkSecurityHeaders(response)

      expect(response.headers.get('Strict-Transport-Security')).toContain('max-age=')
    })
  })
})
```

---

## Quick Start Guide

### 1. Setup Test Environment

```bash
# Install additional testing utilities if needed
npm install --save-dev @testing-library/user-event

# Verify jest configuration
npm test -- --listTests
```

### 2. Create Test File Structure

```bash
# API tests
mkdir -p src/__tests__/api
touch src/__tests__/api/groups.integration.test.ts
touch src/__tests__/api/invitations.integration.test.ts

# Service tests
mkdir -p src/__tests__/services
touch src/__tests__/services/invitationService.test.ts
touch src/__tests__/services/emailDistribution.test.ts

# Auth tests
mkdir -p src/__tests__/auth
touch src/__tests__/auth/authentication.test.ts

# Middleware tests
mkdir -p src/__tests__/middleware
touch src/__tests__/middleware/security.test.ts
```

### 3. Run Tests

```bash
# Run specific test file
npm test src/__tests__/api/groups.integration.test.ts

# Run with coverage
npm test -- --coverage --collectCoverageFrom='src/**/*.{ts,tsx}'

# Watch mode for development
npm test -- --watch
```

### 4. Best Practices

1. **AAA Pattern:** Arrange, Act, Assert
2. **Clear Test Names:** Describe what is being tested
3. **Isolated Tests:** Each test should be independent
4. **Mock External Dependencies:** Keep tests fast and deterministic
5. **Test Edge Cases:** Not just happy paths
6. **Readable Assertions:** Use clear, descriptive matchers

---

## Common Testing Patterns

### Pattern 1: Testing Async Operations

```typescript
it('handles async operation', async () => {
  const result = await someAsyncFunction()
  expect(result).toBeDefined()
})
```

### Pattern 2: Testing Error Cases

```typescript
it('throws error for invalid input', async () => {
  await expect(
    someFunction('invalid')
  ).rejects.toThrow('Expected error message')
})
```

### Pattern 3: Testing State Changes

```typescript
it('updates state correctly', async () => {
  const { result } = renderHook(() => useCustomHook())

  act(() => {
    result.current.updateState('new value')
  })

  expect(result.current.state).toBe('new value')
})
```

### Pattern 4: Testing User Interactions

```typescript
it('handles user click', async () => {
  const user = userEvent.setup()
  render(<Component />)

  await user.click(screen.getByRole('button'))

  expect(screen.getByText('Updated')).toBeInTheDocument()
})
```

---

## Additional Resources

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/)
- [Testing Best Practices](https://testingjavascript.com/)
- [Next.js Testing Guide](https://nextjs.org/docs/testing)
