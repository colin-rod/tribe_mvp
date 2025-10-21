import type { SupabaseClient, User } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { enforceAuthGuards } from '@/middleware/guards/auth'

jest.mock('@/lib/logger', () => ({
  createLogger: jest.fn(() => ({
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    errorWithStack: jest.fn(),
  })),
}))

function createMockRequest(pathname: string): NextRequest {
  const url = `https://example.com${pathname}`
  const nextUrl = new URL(url)
  return {
    url,
    nextUrl,
  } as unknown as NextRequest
}

function createSupabaseStub(onboardingCompleted: boolean | null) {
  const single = jest.fn(async () => ({
    data:
      onboardingCompleted === null
        ? null
        : { onboarding_completed: onboardingCompleted },
    error: null,
  }))
  const eq = jest.fn(() => ({ single }))
  const select = jest.fn(() => ({ eq }))
  const from = jest.fn(() => ({ select }))

  return {
    client: { from } as unknown as SupabaseClient,
    from,
    select,
    eq,
    single,
  }
}

function createRedirectSpy() {
  return jest.spyOn(NextResponse, 'redirect').mockImplementation((input: string | URL) => {
    const location = input instanceof URL ? input.toString() : input
    const headers = {
      get: (name: string) => (name.toLowerCase() === 'location' ? location : null),
    }

    return {
      headers,
      status: 307,
    } as unknown as NextResponse
  })
}

describe('enforceAuthGuards', () => {
  let redirectSpy: jest.SpyInstance

  beforeEach(() => {
    redirectSpy = createRedirectSpy()
  })

  afterEach(() => {
    redirectSpy.mockRestore()
  })

  it('redirects authenticated users away from auth pages', async () => {
    const request = createMockRequest('/login')
    const { client, from } = createSupabaseStub(true)
    const user = { id: 'user-123' } as User

    const response = await enforceAuthGuards({ request, user, supabase: client })

    expect(response).not.toBeNull()
    const location = response?.headers.get('location') ?? response?.headers.get('Location')
    expect(location).toBe('https://example.com/dashboard')
    expect(from).not.toHaveBeenCalled()
    expect(redirectSpy).toHaveBeenCalled()
  })

  it('redirects unauthenticated users to login for protected routes', async () => {
    const request = createMockRequest('/dashboard')
    const { client, from } = createSupabaseStub(true)

    const response = await enforceAuthGuards({ request, user: null, supabase: client })

    expect(response).not.toBeNull()
    const location = response?.headers.get('location') ?? response?.headers.get('Location')
    expect(location).toBe('https://example.com/login?redirectedFrom=%2Fdashboard')
    expect(from).not.toHaveBeenCalled()
    expect(redirectSpy).toHaveBeenCalled()
  })

  it('redirects users with incomplete onboarding to onboarding flow', async () => {
    const request = createMockRequest('/dashboard/memory-book')
    const { client, from, eq, single } = createSupabaseStub(false)
    const user = { id: 'user-123' } as User

    const response = await enforceAuthGuards({ request, user, supabase: client })

    expect(response).not.toBeNull()
    const location = response?.headers.get('location') ?? response?.headers.get('Location')
    expect(location).toBe('https://example.com/onboarding')
    expect(from).toHaveBeenCalledWith('profiles')
    expect(eq).toHaveBeenCalledWith('id', 'user-123')
    expect(single).toHaveBeenCalled()
    expect(redirectSpy).toHaveBeenCalled()
  })

  it('allows access when onboarding is complete', async () => {
    const request = createMockRequest('/dashboard/settings')
    const { client } = createSupabaseStub(true)
    const user = { id: 'user-123' } as User

    const response = await enforceAuthGuards({ request, user, supabase: client })

    expect(response).toBeNull()
  })

  it('does not block onboarding routes for users mid-flow', async () => {
    const request = createMockRequest('/onboarding/welcome')
    const { client, from } = createSupabaseStub(false)
    const user = { id: 'user-123' } as User

    const response = await enforceAuthGuards({ request, user, supabase: client })

    expect(response).toBeNull()
    expect(from).not.toHaveBeenCalled()
  })
})
