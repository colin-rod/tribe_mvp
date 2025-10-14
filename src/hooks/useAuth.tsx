'use client'

import { createLogger } from '@/lib/logger'
import React, { createContext, useContext, useEffect, useState } from 'react'
import { User, Session, AuthChangeEvent } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/client'
import { AuthService } from '@/lib/services/authService'

const logger = createLogger('UseAuth')

interface AuthContextType {
  user: User | null
  session: Session | null
  loading: boolean
  signOut: () => Promise<void>
  refreshSession: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

// Create auth service factory (allows for testing)
export const createAuthService = () => new AuthService(createClient())

interface AuthProviderProps {
  children: React.ReactNode
  authServiceFactory?: () => AuthService  // Allow injection for testing
}

export function AuthProvider({ children, authServiceFactory }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  // Create auth service instance once per provider - use injected factory if provided
  const [authService] = useState(() => authServiceFactory ? authServiceFactory() : createAuthService())

  useEffect(() => {
    // Get initial session and verify user
    const getInitialSession = async () => {
      // Use getUser() instead of relying on session.user for security
      const { data: { user }, error } = await authService.getUser()

      if (error) {
        logger.warn('Error getting user on mount:', { error: error.message })
        setSession(null)
        setUser(null)
        setLoading(false)
        return
      }

      // If we have a verified user, also get the session for token refresh
      if (user) {
        const { data: { session } } = await authService.getSession()
        setSession(session)
        setUser(user)
      } else {
        setSession(null)
        setUser(null)
      }

      setLoading(false)
    }

    getInitialSession()

    // Listen for auth changes
    const { data: { subscription } } = authService.onAuthStateChange(
      async (event: AuthChangeEvent, session: Session | null) => {
        setSession(session)
        setUser(session?.user ?? null)
        setLoading(false)

        // Handle specific auth events
        if (event === 'SIGNED_IN') {
          logger.info('User signed in:', { data: session?.user?.email })
        } else if (event === 'SIGNED_OUT') {
          logger.info('User signed out')
        } else if (event === 'TOKEN_REFRESHED') {
          logger.info('Token refreshed')
        }
      }
    )

    return () => {
      subscription.unsubscribe()
    }
    // authService is stable via useState initializer
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const signOut = async (scope: 'local' | 'global' | 'others' = 'local') => {
    try {
      await authService.signOut(scope)

      // Clear local state
      setSession(null)
      setUser(null)
    } catch (error) {
      logger.errorWithStack('Sign out error:', error as Error)
      throw error
    }
  }

  const refreshSession = async () => {
    try {
      await authService.refreshSession()

      // Get the new session
      const { data: { session } } = await authService.getSession()
      setSession(session)
      setUser(session?.user ?? null)
    } catch (error) {
      logger.errorWithStack('Session refresh error:', error as Error)
      throw error
    }
  }

  // Periodically check session health and refresh if needed
  useEffect(() => {
    if (!user) return

    const checkSessionHealth = async () => {
      try {
        const response = await fetch('/api/auth/session')
        if (!response.ok) {
          logger.warn('Session health check failed', { status: response.status })
          // If session is invalid, sign out
          if (response.status === 401) {
            await signOut()
          }
          return
        }

        const data = await response.json()

        // Log warnings if any
        if (data.warnings?.length > 0) {
          logger.warn('Session health warnings', { warnings: data.warnings })
        }

        // Auto-refresh if session is about to expire (within 10 minutes)
        if (data.session?.timeUntilExpiry && data.session.timeUntilExpiry < 600) {
          logger.info('Session expiring soon, refreshing', {
            timeUntilExpiry: data.session.timeUntilExpiry,
          })
          await refreshSession()
        }
      } catch (error) {
        logger.errorWithStack('Session health check error:', error as Error)
      }
    }

    // Check session health every 5 minutes
    const interval = setInterval(checkSessionHealth, 5 * 60 * 1000)

    // Initial check
    checkSessionHealth()

    return () => clearInterval(interval)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]) // signOut and refreshSession are stable functions

  const value: AuthContextType = {
    user,
    session,
    loading,
    signOut,
    refreshSession,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

// Convenience hook to check if user is authenticated
export function useUser() {
  const { user, loading } = useAuth()
  return { user, loading, isAuthenticated: !!user }
}