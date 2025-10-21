import { NextRequest, NextResponse } from 'next/server'
import { resolveLegacyRedirect } from '@/middleware/redirects'

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

describe('resolveLegacyRedirect', () => {
  let redirectSpy: jest.SpyInstance

  beforeEach(() => {
    redirectSpy = createRedirectSpy()
  })

  afterEach(() => {
    redirectSpy.mockRestore()
  })

  it('returns redirect for legacy digest routes', () => {
    const request = createMockRequest('/dashboard/digests/123?filter=all')

    const response = resolveLegacyRedirect(request)

    expect(response).not.toBeNull()
    const location = response?.headers.get('location') ?? response?.headers.get('Location')
    expect(location).toBe('https://example.com/dashboard/memory-book/123?filter=all')
    expect(redirectSpy).toHaveBeenCalled()
  })

  it('returns null for non-legacy routes', () => {
    const request = createMockRequest('/dashboard/memory-book')

    const response = resolveLegacyRedirect(request)

    expect(response).toBeNull()
    expect(redirectSpy).not.toHaveBeenCalled()
  })
})
