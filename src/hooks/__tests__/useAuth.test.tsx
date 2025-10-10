import { jest, describe, it, expect, beforeEach } from '@jest/globals'
import { renderHook, waitFor, act } from '@testing-library/react'
import { AuthProvider, useAuth } from '../useAuth'
import React from 'react'

// Mock logger
const mockLogger = {
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  errorWithStack: jest.fn()
}

jest.mock('@/lib/logger', () => ({
  createLogger: () => mockLogger
}))

// Mock Supabase client
const mockGetUser = jest.fn()
const mockGetSession = jest.fn()
const mockSignOut = jest.fn()
const mockOnAuthStateChange = jest.fn()

jest.mock('@/lib/supabase/client', () => ({
  createClient: jest.fn(() => ({
    auth: {
      getUser: mockGetUser,
      getSession: mockGetSession,
      signOut: mockSignOut,
      onAuthStateChange: mockOnAuthStateChange
    }
  }))
}))

// Mock fetch for logout API
global.fetch = jest.fn() as jest.Mock

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

    // Default mocks - auth state change subscription
    mockOnAuthStateChange.mockReturnValue({
      data: {
        subscription: {
          unsubscribe: jest.fn()
        }
      }
    })
  })

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <AuthProvider>{children}</AuthProvider>
  )

  describe('AuthProvider initialization', () => {
    it('should initialize with loading state', () => {
      mockGetUser.mockResolvedValue({ data: { user: null }, error: null })

      const { result } = renderHook(() => useAuth(), { wrapper })

      expect(result.current.loading).toBe(true)
      expect(result.current.user).toBeNull()
      expect(result.current.session).toBeNull()
    })

    it('should load authenticated user on mount', async () => {
      mockGetUser.mockResolvedValue({ data: { user: mockUser }, error: null })
      mockGetSession.mockResolvedValue({ data: { session: mockSession }, error: null })

      const { result } = renderHook(() => useAuth(), { wrapper })

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      expect(result.current.user).toEqual(mockUser)
      expect(result.current.session).toEqual(mockSession)
    })

    it('should handle unauthenticated state', async () => {
      mockGetUser.mockResolvedValue({ data: { user: null }, error: null })

      const { result } = renderHook(() => useAuth(), { wrapper })

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      expect(result.current.user).toBeNull()
      expect(result.current.session).toBeNull()
    })

    it('should handle initial authentication error', async () => {
      mockGetUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'Auth error' }
      })

      const { result } = renderHook(() => useAuth(), { wrapper })

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      expect(result.current.user).toBeNull()
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Error getting user on mount:',
        expect.objectContaining({ error: 'Auth error' })
      )
    })
  })

  describe('auth state changes', () => {
    it('should handle SIGNED_IN event', async () => {
      let authCallback: ((event: string, session: unknown) => void) | undefined

      mockOnAuthStateChange.mockImplementation((callback) => {
        authCallback = callback
        return {
          data: {
            subscription: {
              unsubscribe: jest.fn()
            }
          }
        }
      })

      mockGetUser.mockResolvedValue({ data: { user: null }, error: null })

      const { result } = renderHook(() => useAuth(), { wrapper })

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      // Simulate sign in
      act(() => {
        authCallback?.('SIGNED_IN', mockSession)
      })

      await waitFor(() => {
        expect(result.current.user).toEqual(mockUser)
        expect(result.current.session).toEqual(mockSession)
      })

      expect(mockLogger.info).toHaveBeenCalledWith(
        'User signed in:',
        expect.objectContaining({ data: mockUser.email })
      )
    })

    it('should handle SIGNED_OUT event', async () => {
      let authCallback: ((event: string, session: unknown) => void) | undefined

      mockOnAuthStateChange.mockImplementation((callback) => {
        authCallback = callback
        return {
          data: {
            subscription: {
              unsubscribe: jest.fn()
            }
          }
        }
      })

      mockGetUser.mockResolvedValue({ data: { user: mockUser }, error: null })
      mockGetSession.mockResolvedValue({ data: { session: mockSession }, error: null })

      const { result } = renderHook(() => useAuth(), { wrapper })

      await waitFor(() => {
        expect(result.current.user).toEqual(mockUser)
      })

      // Simulate sign out
      act(() => {
        authCallback?.('SIGNED_OUT', null)
      })

      await waitFor(() => {
        expect(result.current.user).toBeNull()
        expect(result.current.session).toBeNull()
      })

      expect(mockLogger.info).toHaveBeenCalledWith('User signed out')
    })

    it('should handle TOKEN_REFRESHED event', async () => {
      let authCallback: ((event: string, session: unknown) => void) | undefined

      mockOnAuthStateChange.mockImplementation((callback) => {
        authCallback = callback
        return {
          data: {
            subscription: {
              unsubscribe: jest.fn()
            }
          }
        }
      })

      mockGetUser.mockResolvedValue({ data: { user: mockUser }, error: null })
      mockGetSession.mockResolvedValue({ data: { session: mockSession }, error: null })

      const { result } = renderHook(() => useAuth(), { wrapper })

      await waitFor(() => {
        expect(result.current.user).toEqual(mockUser)
      })

      const newSession = {
        ...mockSession,
        access_token: 'new-token'
      }

      // Simulate token refresh
      act(() => {
        authCallback?.('TOKEN_REFRESHED', newSession)
      })

      await waitFor(() => {
        expect(result.current.session?.access_token).toBe('new-token')
      })

      expect(mockLogger.info).toHaveBeenCalledWith('Token refreshed')
    })
  })

  describe('signOut', () => {
    it('should sign out successfully', async () => {
      mockGetUser.mockResolvedValue({ data: { user: mockUser }, error: null })
      mockGetSession.mockResolvedValue({ data: { session: mockSession }, error: null })
      mockSignOut.mockResolvedValue({ error: null })

      // Mock fetch for logout API
      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ success: true })
      })

      const { result } = renderHook(() => useAuth(), { wrapper })

      await waitFor(() => {
        expect(result.current.user).toEqual(mockUser)
      })

      await act(async () => {
        await result.current.signOut()
      })

      expect(global.fetch).toHaveBeenCalledWith('/api/auth/logout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      })
      expect(mockSignOut).toHaveBeenCalledWith({ scope: 'local' })
    })

    it('should handle sign out API error', async () => {
      mockGetUser.mockResolvedValue({ data: { user: mockUser }, error: null })
      mockGetSession.mockResolvedValue({ data: { session: mockSession }, error: null })

      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        json: async () => ({ error: 'Logout failed' })
      })

      const { result } = renderHook(() => useAuth(), { wrapper })

      await waitFor(() => {
        expect(result.current.user).toEqual(mockUser)
      })

      await expect(
        act(async () => {
          await result.current.signOut()
        })
      ).rejects.toThrow('Logout failed')
    })

    it('should handle Supabase signOut error', async () => {
      mockGetUser.mockResolvedValue({ data: { user: mockUser }, error: null })
      mockGetSession.mockResolvedValue({ data: { session: mockSession }, error: null })
      mockSignOut.mockResolvedValue({ error: { message: 'Sign out failed' } })

      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ success: true })
      })

      const { result } = renderHook(() => useAuth(), { wrapper })

      await waitFor(() => {
        expect(result.current.user).toEqual(mockUser)
      })

      await expect(
        act(async () => {
          await result.current.signOut()
        })
      ).rejects.toThrow()

      expect(mockLogger.errorWithStack).toHaveBeenCalled()
    })
  })

  describe('refreshSession', () => {
    it('should refresh session successfully', async () => {
      mockGetUser.mockResolvedValue({ data: { user: mockUser }, error: null })
      mockGetSession.mockResolvedValue({ data: { session: mockSession }, error: null })

      const { result } = renderHook(() => useAuth(), { wrapper })

      await waitFor(() => {
        expect(result.current.user).toEqual(mockUser)
      })

      const newSession = {
        ...mockSession,
        access_token: 'refreshed-token'
      }

      mockGetSession.mockResolvedValue({ data: { session: newSession }, error: null })

      await act(async () => {
        await result.current.refreshSession()
      })

      await waitFor(() => {
        expect(result.current.session?.access_token).toBe('refreshed-token')
      })
    })

    it('should handle refresh error gracefully', async () => {
      mockGetUser.mockResolvedValue({ data: { user: mockUser }, error: null })
      mockGetSession.mockResolvedValue({ data: { session: mockSession }, error: null })

      const { result } = renderHook(() => useAuth(), { wrapper })

      await waitFor(() => {
        expect(result.current.user).toEqual(mockUser)
      })

      mockGetSession.mockResolvedValue({
        data: { session: null },
        error: { message: 'Refresh failed' }
      })

      await expect(
        act(async () => {
          await result.current.refreshSession()
        })
      ).rejects.toThrow()
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

      mockOnAuthStateChange.mockReturnValue({
        data: {
          subscription: {
            unsubscribe: mockUnsubscribe
          }
        }
      })

      mockGetUser.mockResolvedValue({ data: { user: null }, error: null })

      const { unmount } = renderHook(() => useAuth(), { wrapper })

      await waitFor(() => {
        expect(mockOnAuthStateChange).toHaveBeenCalled()
      })

      unmount()

      expect(mockUnsubscribe).toHaveBeenCalled()
    })
  })
})
