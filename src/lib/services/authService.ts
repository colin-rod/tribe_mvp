import type { SupabaseClient, AuthChangeEvent, Session, User } from '@supabase/supabase-js'
import type { Database } from '@/lib/types/database'
import { createLogger } from '@/lib/logger'

const logger = createLogger('AuthService')

export interface AuthResult<T> {
  data: T
  error: { message: string } | null
}

export interface SessionResult {
  session: Session | null
}

export interface UserResult {
  user: User | null
}

export interface AuthStateChangeSubscription {
  unsubscribe: () => void
}

/**
 * AuthService encapsulates all authentication operations with Supabase.
 * This service layer makes auth operations testable and maintainable.
 */
export class AuthService {
  constructor(private supabaseClient: SupabaseClient<Database>) {}

  /**
   * Get the current authenticated user
   */
  async getUser(): Promise<AuthResult<UserResult>> {
    try {
      const result = await this.supabaseClient.auth.getUser()
      return result
    } catch (error) {
      logger.errorWithStack('Failed to get user', error as Error)
      throw error
    }
  }

  /**
   * Get the current session
   */
  async getSession(): Promise<AuthResult<SessionResult>> {
    try {
      const result = await this.supabaseClient.auth.getSession()
      return result
    } catch (error) {
      logger.errorWithStack('Failed to get session', error as Error)
      throw error
    }
  }

  /**
   * Sign out the current user
   * @param scope - The scope of the sign out operation
   */
  async signOut(scope: 'local' | 'global' | 'others' = 'local'): Promise<{ error: { message: string } | null }> {
    try {
      // Call backend logout API to clear session
      const response = await fetch('/api/auth/logout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Logout failed')
      }

      // Sign out from Supabase
      const { error } = await this.supabaseClient.auth.signOut({ scope })

      if (error) {
        logger.errorWithStack('Supabase sign out error', new Error(error.message))
        throw new Error(error.message)
      }

      logger.info('User signed out successfully', { scope })
      return { error: null }
    } catch (error) {
      logger.errorWithStack('Sign out failed', error as Error)
      throw error
    }
  }

  /**
   * Refresh the current session
   */
  async refreshSession(): Promise<void> {
    try {
      const { data, error } = await this.supabaseClient.auth.getSession()

      if (error) {
        logger.error('Failed to refresh session', { error: error.message })
        throw new Error(error.message)
      }

      if (!data.session) {
        throw new Error('No active session to refresh')
      }

      logger.info('Session refreshed successfully')
    } catch (error) {
      logger.errorWithStack('Session refresh failed', error as Error)
      throw error
    }
  }

  /**
   * Subscribe to auth state changes
   * @param callback - Function to call when auth state changes
   * @returns Subscription object with unsubscribe method
   */
  onAuthStateChange(
    callback: (event: AuthChangeEvent, session: Session | null) => void | Promise<void>
  ): { data: { subscription: AuthStateChangeSubscription } } {
    return this.supabaseClient.auth.onAuthStateChange(callback)
  }
}
