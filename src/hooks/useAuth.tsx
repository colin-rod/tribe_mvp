'use client'

import { createLogger } from '@/lib/logger'

  const logger = createLogger('UseAuth')
import React, { createContext, useContext, useEffect, useState } from 'react'
import { User, Session, AuthChangeEvent } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/client'

interface AuthContextType {
  user: User | null
  session: Session | null
  loading: boolean
  signOut: () => Promise<void>
  refreshSession: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  const supabase = createClient()

  useEffect(() => {
    // Get initial session and verify user
    const getInitialSession = async () => {
      // Use getUser() instead of relying on session.user for security
      const { data: { user }, error } = await supabase.auth.getUser()

      if (error) {
        logger.warn('Error getting user on mount:', { error: error.message })
        setSession(null)
        setUser(null)
        setLoading(false)
        return
      }

      // If we have a verified user, also get the session for token refresh
      if (user) {
        const { data: { session } } = await supabase.auth.getSession()
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
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
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
  }, [supabase.auth])

  const signOut = async (scope: 'local' | 'global' | 'others' = 'local') => {
    try {
      // Call server-side logout endpoint for comprehensive session clearing
      const response = await fetch('/api/auth/logout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Logout failed')
      }

      // Also sign out from Supabase client
      const { error } = await supabase.auth.signOut({ scope })

      if (error) {
        logger.errorWithStack('Error signing out:', error as Error)
        throw error
      }

      // Clear local state
      setSession(null)
      setUser(null)

      logger.info('User signed out successfully', { scope })
    } catch (error) {
      logger.errorWithStack('Sign out error:', error as Error)
      throw error
    }
  }

  const refreshSession = async () => {
    try {
      const { data, error } = await supabase.auth.refreshSession()
      if (error) {
        logger.errorWithStack('Error refreshing session:', error as Error)
        throw error
      }
      setSession(data.session)
      setUser(data.session?.user ?? null)
      logger.debug('Session refreshed successfully')
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