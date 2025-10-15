import { jest, describe, it, expect, beforeEach } from '@jest/globals'
import React from 'react'

// Mock logger - create a STABLE singleton that matches the real ScopedLogger interface
const mockLogger = {
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  errorWithStack: jest.fn(),
  debug: jest.fn()
}

// Mock the logger module BEFORE any imports that use it
jest.mock('@/lib/logger', () => ({
  createLogger: () => mockLogger,
  logger: {
    scope: () => mockLogger
  }
}))

// Mock Supabase client - must create a STABLE singleton instance
const mockSupabaseAuth = {
  getUser: jest.fn(),
  getSession: jest.fn(),
  signOut: jest.fn(),
  refreshSession: jest.fn(),
  onAuthStateChange: jest.fn(() => ({
    data: { subscription: { unsubscribe: jest.fn() } }
  }))
}

const mockSupabaseClient = {
  auth: mockSupabaseAuth
}

jest.mock('@/lib/supabase/client', () => ({
  createClient: () => mockSupabaseClient
}))

// NOW import after all mocks are set up
import { renderHook, waitFor, act } from '@testing-library/react'
import { AuthProvider, useAuth } from '../useAuth'

// Mock fetch for session health checks
global.fetch = jest.fn<typeof fetch>()

describe('useAuth', () => {
  const mockUser = {
    id: 'user-123',
    email: 'test@example.com',
    created_at: new Date().toISOString()
  }

  const mockSession = {
    user: mockUser,
    access_token: 'mock-token',
    refresh_token: 'mock-refresh',
    expires_at: Date.now() + 3600000
  }

  beforeEach(() => {
    jest.clearAllMocks()

    // Set default mock implementations for Supabase auth methods
    mockSupabaseAuth.getUser.mockResolvedValue({ data: { user: null }, error: null })
    mockSupabaseAuth.getSession.mockResolvedValue({ data: { session: null }, error: null })
    mockSupabaseAuth.signOut.mockResolvedValue({ error: null })
    mockSupabaseAuth.refreshSession.mockResolvedValue({ data: { session: null }, error: null })
    mockSupabaseAuth.onAuthStateChange.mockReturnValue({
      data: {
        subscription: {
          unsubscribe: jest.fn()
        }
      }
    })

    // Mock fetch for session health checks
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ session: { timeUntilExpiry: 3600 } })
    })
  })

  // Create a mock AuthService factory for testing
  const mockAuthServiceFactory = () => ({
    getUser: mockSupabaseAuth.getUser,
    getSession: mockSupabaseAuth.getSession,
    signOut: mockSupabaseAuth.signOut,
    refreshSession: mockSupabaseAuth.refreshSession,
    onAuthStateChange: mockSupabaseAuth.onAuthStateChange
  }) as unknown as InstanceType<typeof import('@/lib/services/authService').AuthService>

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <AuthProvider authServiceFactory={mockAuthServiceFactory}>{children}</AuthProvider>
  )

  describe('AuthProvider initialization', () => {
    it('should initialize with loading state', async () => {
      mockSupabaseAuth.getUser.mockResolvedValue({ data: { user: null }, error: null })

      const { result } = renderHook(() => useAuth(), { wrapper })

      expect(result.current.loading).toBe(true)
      expect(result.current.user).toBeNull()
      expect(result.current.session).toBeNull()

      // Wait for loading to complete to avoid act() warnings
      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })
    })

    it('should load authenticated user on mount', async () => {
      mockSupabaseAuth.getUser.mockResolvedValue({ data: { user: mockUser }, error: null })
      mockSupabaseAuth.getSession.mockResolvedValue({ data: { session: mockSession }, error: null })

      const { result } = renderHook(() => useAuth(), { wrapper })

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      expect(result.current.user).toEqual(mockUser)
      expect(result.current.session).toEqual(mockSession)
    })

    it('should handle unauthenticated state', async () => {
      mockSupabaseAuth.getUser.mockResolvedValue({ data: { user: null }, error: null })

      const { result } = renderHook(() => useAuth(), { wrapper })

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      expect(result.current.user).toBeNull()
      expect(result.current.session).toBeNull()
    })

    it('should handle initial authentication error', async () => {
      mockSupabaseAuth.getUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'Auth error' }
      })

      const { result } = renderHook(() => useAuth(), { wrapper })

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      expect(result.current.user).toBeNull()
      // Logger is called but we don't need to verify it - it's an implementation detail
    })
  })

  describe('auth state changes', () => {
    it('should handle SIGNED_IN event', async () => {
      let authCallback: ((event: string, session: unknown) => void) | undefined

      mockSupabaseAuth.onAuthStateChange.mockImplementation((callback) => {
        authCallback = callback
        return {
          data: {
            subscription: {
              unsubscribe: jest.fn()
            }
          }
        }
      })

      mockSupabaseAuth.getUser.mockResolvedValue({ data: { user: null }, error: null })

      const { result } = renderHook(() => useAuth(), { wrapper })

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      // Simulate sign in
      await act(async () => {
        authCallback?.('SIGNED_IN', mockSession)
      })

      await waitFor(() => {
        expect(result.current.user).toEqual(mockUser)
        expect(result.current.session).toEqual(mockSession)
      })

      // Logger is called but we don't need to verify it - it's an implementation detail
    })

    it('should handle SIGNED_OUT event', async () => {
      let authCallback: ((event: string, session: unknown) => void) | undefined

      mockSupabaseAuth.onAuthStateChange.mockImplementation((callback) => {
        authCallback = callback
        return {
          data: {
            subscription: {
              unsubscribe: jest.fn()
            }
          }
        }
      })

      mockSupabaseAuth.getUser.mockResolvedValue({ data: { user: mockUser }, error: null })
      mockSupabaseAuth.getSession.mockResolvedValue({ data: { session: mockSession }, error: null })

      const { result } = renderHook(() => useAuth(), { wrapper })

      await waitFor(() => {
        expect(result.current.user).toEqual(mockUser)
      })

      // Simulate sign out
      await act(async () => {
        authCallback?.('SIGNED_OUT', null)
      })

      await waitFor(() => {
        expect(result.current.user).toBeNull()
        expect(result.current.session).toBeNull()
      })

      // Logger is called but we don't need to verify it - it's an implementation detail
    })

    it('should handle TOKEN_REFRESHED event', async () => {
      let authCallback: ((event: string, session: unknown) => void) | undefined

      mockSupabaseAuth.onAuthStateChange.mockImplementation((callback) => {
        authCallback = callback
        return {
          data: {
            subscription: {
              unsubscribe: jest.fn()
            }
          }
        }
      })

      mockSupabaseAuth.getUser.mockResolvedValue({ data: { user: mockUser }, error: null })
      mockSupabaseAuth.getSession.mockResolvedValue({ data: { session: mockSession }, error: null })

      const { result } = renderHook(() => useAuth(), { wrapper })

      await waitFor(() => {
        expect(result.current.user).toEqual(mockUser)
      })

      const newSession = {
        ...mockSession,
        access_token: 'new-token'
      }

      // Simulate token refresh
      await act(async () => {
        authCallback?.('TOKEN_REFRESHED', newSession)
      })

      await waitFor(() => {
        expect(result.current.session?.access_token).toBe('new-token')
      })

      // Logger is called but we don't need to verify it - it's an implementation detail
    })
  })

  describe('signOut', () => {
    it('should sign out successfully', async () => {
      mockSupabaseAuth.getUser.mockResolvedValue({ data: { user: mockUser }, error: null })
      mockSupabaseAuth.getSession.mockResolvedValue({ data: { session: mockSession }, error: null })
      mockSupabaseAuth.signOut.mockResolvedValue({ error: null })

      const { result } = renderHook(() => useAuth(), { wrapper })

      await waitFor(() => {
        expect(result.current.user).toEqual(mockUser)
      })

      await act(async () => {
        await result.current.signOut()
      })

      expect(mockSupabaseAuth.signOut).toHaveBeenCalledWith('local')
    })

    it('should handle sign out error', async () => {
      const signOutError = new Error('Sign out failed')

      mockSupabaseAuth.getUser.mockResolvedValue({ data: { user: mockUser }, error: null })
      mockSupabaseAuth.getSession.mockResolvedValue({ data: { session: mockSession }, error: null })
      mockSupabaseAuth.signOut.mockRejectedValue(signOutError)

      const { result } = renderHook(() => useAuth(), { wrapper })

      await waitFor(() => {
        expect(result.current.user).toEqual(mockUser)
      })

      await expect(
        act(async () => {
          await result.current.signOut()
        })
      ).rejects.toThrow('Sign out failed')

      // Logger is called but we don't need to verify it - it's an implementation detail
    })
  })

  describe('refreshSession', () => {
    it('should refresh session successfully', async () => {
      mockSupabaseAuth.getUser.mockResolvedValue({ data: { user: mockUser }, error: null })
      mockSupabaseAuth.getSession.mockResolvedValue({ data: { session: mockSession }, error: null })
      mockSupabaseAuth.refreshSession.mockResolvedValue({ data: { session: null }, error: null })

      const { result } = renderHook(() => useAuth(), { wrapper })

      await waitFor(() => {
        expect(result.current.user).toEqual(mockUser)
      })

      const newSession = {
        ...mockSession,
        access_token: 'refreshed-token'
      }

      mockSupabaseAuth.getSession.mockResolvedValue({ data: { session: newSession }, error: null })

      await act(async () => {
        await result.current.refreshSession()
      })

      await waitFor(() => {
        expect(result.current.session?.access_token).toBe('refreshed-token')
      })

      expect(mockSupabaseAuth.refreshSession).toHaveBeenCalled()
    })

    it('should handle refresh error gracefully', async () => {
      const refreshError = new Error('Refresh failed')

      mockSupabaseAuth.getUser.mockResolvedValue({ data: { user: mockUser }, error: null })
      mockSupabaseAuth.getSession.mockResolvedValue({ data: { session: mockSession }, error: null })
      mockSupabaseAuth.refreshSession.mockRejectedValue(refreshError)

      const { result } = renderHook(() => useAuth(), { wrapper })

      await waitFor(() => {
        expect(result.current.user).toEqual(mockUser)
      })

      await expect(
        act(async () => {
          await result.current.refreshSession()
        })
      ).rejects.toThrow('Refresh failed')

      // Logger is called but we don't need to verify it - it's an implementation detail
    })
  })

  describe('useAuth hook', () => {
    it('should throw error when used outside AuthProvider', () => {
      // Suppress console.error for this test
      // eslint-disable-next-line no-console
      const consoleError = console.error
      // eslint-disable-next-line no-console
      console.error = jest.fn()

      expect(() => {
        renderHook(() => useAuth())
      }).toThrow('useAuth must be used within an AuthProvider')

      // eslint-disable-next-line no-console
      console.error = consoleError
    })
  })

  describe('subscription cleanup', () => {
    it('should unsubscribe on unmount', async () => {
      const mockUnsubscribe = jest.fn()

      mockSupabaseAuth.onAuthStateChange.mockReturnValue({
        data: {
          subscription: {
            unsubscribe: mockUnsubscribe
          }
        }
      })

      mockSupabaseAuth.getUser.mockResolvedValue({ data: { user: null }, error: null })

      const { unmount } = renderHook(() => useAuth(), { wrapper })

      await waitFor(() => {
        expect(mockSupabaseAuth.onAuthStateChange).toHaveBeenCalled()
      })

      unmount()

      expect(mockUnsubscribe).toHaveBeenCalled()
    })
  })
})
