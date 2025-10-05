import {
  signUp,
  signIn,
  signOut,
  resetPassword,
  isValidEmail,
  isValidPassword,
  getPasswordStrength,
  getAuthErrorMessage
} from '@/lib/supabase/auth'
import { createClient } from '@/lib/supabase/client'
import type { AuthError } from '@supabase/supabase-js'

// Mock Supabase client
jest.mock('@/lib/supabase/client')

const mockCreateClient = createClient as jest.MockedFunction<typeof createClient>

describe('Authentication Flow Tests', () => {
  let mockSupabase: {
    auth: {
      signUp: jest.Mock
      signInWithPassword: jest.Mock
      signOut: jest.Mock
      resetPasswordForEmail: jest.Mock
    }
  }

  beforeEach(() => {
    jest.clearAllMocks()

    mockSupabase = {
      auth: {
        signUp: jest.fn(),
        signInWithPassword: jest.fn(),
        signOut: jest.fn(),
        resetPasswordForEmail: jest.fn()
      }
    }

    mockCreateClient.mockReturnValue(mockSupabase as never)
  })

  describe('Sign Up', () => {
    it('should successfully create new user account', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'newuser@example.com',
        created_at: new Date().toISOString()
      }

      mockSupabase.auth.signUp.mockResolvedValue({
        data: {
          user: mockUser,
          session: { access_token: 'token123' }
        },
        error: null
      })

      const result = await signUp('newuser@example.com', 'SecurePass123')

      expect(mockSupabase.auth.signUp).toHaveBeenCalledWith({
        email: 'newuser@example.com',
        password: 'SecurePass123',
        options: {
          emailRedirectTo: expect.stringContaining('/auth/callback')
        }
      })

      expect(result.data?.user).toEqual(mockUser)
      expect(result.error).toBeNull()
    })

    it('should handle duplicate email error', async () => {
      const mockError: AuthError = {
        name: 'AuthError',
        message: 'User already registered',
        status: 400
      }

      mockSupabase.auth.signUp.mockResolvedValue({
        data: { user: null, session: null },
        error: mockError
      })

      const result = await signUp('existing@example.com', 'Password123')

      expect(result.error).toEqual(mockError)
      expect(result.data?.user).toBeNull()
    })

    it('should handle weak password error', async () => {
      const mockError: AuthError = {
        name: 'AuthError',
        message: 'Password should be at least 6 characters',
        status: 400
      }

      mockSupabase.auth.signUp.mockResolvedValue({
        data: { user: null, session: null },
        error: mockError
      })

      const result = await signUp('user@example.com', '123')

      expect(result.error).toEqual(mockError)
    })
  })

  describe('Sign In', () => {
    it('should successfully authenticate user', async () => {
      const mockUser = {
        id: 'user-456',
        email: 'user@example.com'
      }

      const mockSession = {
        access_token: 'access-token-abc',
        refresh_token: 'refresh-token-xyz'
      }

      mockSupabase.auth.signInWithPassword.mockResolvedValue({
        data: {
          user: mockUser,
          session: mockSession
        },
        error: null
      })

      const result = await signIn('user@example.com', 'CorrectPassword123')

      expect(mockSupabase.auth.signInWithPassword).toHaveBeenCalledWith({
        email: 'user@example.com',
        password: 'CorrectPassword123'
      })

      expect(result.data?.user).toEqual(mockUser)
      expect(result.data?.session).toEqual(mockSession)
      expect(result.error).toBeNull()
    })

    it('should handle invalid credentials', async () => {
      const mockError: AuthError = {
        name: 'AuthError',
        message: 'Invalid login credentials',
        status: 400
      }

      mockSupabase.auth.signInWithPassword.mockResolvedValue({
        data: { user: null, session: null },
        error: mockError
      })

      const result = await signIn('user@example.com', 'WrongPassword')

      expect(result.error).toEqual(mockError)
      expect(result.data?.user).toBeNull()
    })

    it('should handle unconfirmed email', async () => {
      const mockError: AuthError = {
        name: 'AuthError',
        message: 'Email not confirmed',
        status: 400
      }

      mockSupabase.auth.signInWithPassword.mockResolvedValue({
        data: { user: null, session: null },
        error: mockError
      })

      const result = await signIn('unconfirmed@example.com', 'Password123')

      expect(result.error?.message).toBe('Email not confirmed')
    })
  })

  describe('Sign Out', () => {
    it('should successfully sign out user', async () => {
      mockSupabase.auth.signOut.mockResolvedValue({ error: null })

      const result = await signOut()

      expect(mockSupabase.auth.signOut).toHaveBeenCalled()
      expect(result.error).toBeNull()
    })

    it('should handle sign out errors', async () => {
      const mockError: AuthError = {
        name: 'AuthError',
        message: 'Failed to sign out',
        status: 500
      }

      mockSupabase.auth.signOut.mockResolvedValue({ error: mockError })

      const result = await signOut()

      expect(result.error).toEqual(mockError)
    })
  })

  describe('Password Reset', () => {
    it('should send password reset email successfully', async () => {
      mockSupabase.auth.resetPasswordForEmail.mockResolvedValue({
        data: {},
        error: null
      })

      const result = await resetPassword('user@example.com')

      expect(mockSupabase.auth.resetPasswordForEmail).toHaveBeenCalledWith(
        'user@example.com',
        {
          redirectTo: expect.stringContaining('/auth/reset-password')
        }
      )

      expect(result.error).toBeNull()
    })

    it('should handle invalid email for reset', async () => {
      const mockError: AuthError = {
        name: 'AuthError',
        message: 'User not found',
        status: 404
      }

      mockSupabase.auth.resetPasswordForEmail.mockResolvedValue({
        data: {},
        error: mockError
      })

      const result = await resetPassword('nonexistent@example.com')

      expect(result.error).toEqual(mockError)
    })
  })

  describe('Email Validation', () => {
    it('should validate correct email formats', () => {
      expect(isValidEmail('user@example.com')).toBe(true)
      expect(isValidEmail('test.user+tag@domain.co.uk')).toBe(true)
      expect(isValidEmail('name123@test-domain.org')).toBe(true)
    })

    it('should reject invalid email formats', () => {
      expect(isValidEmail('notanemail')).toBe(false)
      expect(isValidEmail('missing@domain')).toBe(false)
      expect(isValidEmail('@nodomain.com')).toBe(false)
      expect(isValidEmail('spaces in@email.com')).toBe(false)
      expect(isValidEmail('')).toBe(false)
    })
  })

  describe('Password Validation', () => {
    it('should validate strong passwords', () => {
      expect(isValidPassword('SecurePass123')).toBe(true)
      expect(isValidPassword('MyP@ssw0rd')).toBe(true)
      expect(isValidPassword('Complex1Password')).toBe(true)
    })

    it('should reject weak passwords', () => {
      expect(isValidPassword('short1A')).toBe(false) // Too short
      expect(isValidPassword('nouppercase1')).toBe(false) // No uppercase
      expect(isValidPassword('NOLOWERCASE1')).toBe(false) // No lowercase
      expect(isValidPassword('NoNumbers')).toBe(false) // No numbers
      expect(isValidPassword('12345678')).toBe(false) // Only numbers
      expect(isValidPassword('')).toBe(false) // Empty
    })
  })

  describe('Password Strength Meter', () => {
    it('should rate password strength correctly', () => {
      expect(getPasswordStrength('weak')).toBe('weak')
      expect(getPasswordStrength('12345')).toBe('weak')
      expect(getPasswordStrength('medium7')).toBe('medium')
      expect(getPasswordStrength('Strong1Pass')).toBe('strong')
      expect(getPasswordStrength('VerySecure123')).toBe('strong')
    })

    it('should handle edge cases', () => {
      expect(getPasswordStrength('')).toBe('weak')
      expect(getPasswordStrength('a')).toBe('weak')
      expect(getPasswordStrength('aB1')).toBe('weak')
      expect(getPasswordStrength('medPass1')).toBe('strong')
    })
  })

  describe('Error Message Formatting', () => {
    it('should format known auth errors', () => {
      const invalidCredError: AuthError = {
        name: 'AuthError',
        message: 'Invalid login credentials',
        status: 400
      }
      expect(getAuthErrorMessage(invalidCredError)).toBe(
        'Invalid email or password. Please check your credentials and try again.'
      )

      const duplicateError: AuthError = {
        name: 'AuthError',
        message: 'User already registered',
        status: 400
      }
      expect(getAuthErrorMessage(duplicateError)).toBe(
        'An account with this email already exists. Try signing in instead.'
      )

      const unconfirmedError: AuthError = {
        name: 'AuthError',
        message: 'Email not confirmed',
        status: 400
      }
      expect(getAuthErrorMessage(unconfirmedError)).toBe(
        'Please check your email and click the confirmation link before signing in.'
      )

      const weakPasswordError: AuthError = {
        name: 'AuthError',
        message: 'Password should be at least 6 characters',
        status: 400
      }
      expect(getAuthErrorMessage(weakPasswordError)).toBe(
        'Password must be at least 6 characters long.'
      )
    })

    it('should handle unknown errors gracefully', () => {
      const unknownError: AuthError = {
        name: 'AuthError',
        message: 'Something unexpected happened',
        status: 500
      }
      expect(getAuthErrorMessage(unknownError)).toBe('Something unexpected happened')
    })

    it('should handle null errors', () => {
      expect(getAuthErrorMessage(null)).toBe('')
    })
  })

  describe('Integration Scenarios', () => {
    it('should complete full registration flow', async () => {
      const email = 'newuser@example.com'
      const password = 'SecurePass123'

      // Validate inputs
      expect(isValidEmail(email)).toBe(true)
      expect(isValidPassword(password)).toBe(true)
      expect(getPasswordStrength(password)).toBe('strong')

      // Sign up
      mockSupabase.auth.signUp.mockResolvedValue({
        data: {
          user: { id: 'user-789', email },
          session: { access_token: 'token' }
        },
        error: null
      })

      const signUpResult = await signUp(email, password)
      expect(signUpResult.data?.user).toBeDefined()
      expect(signUpResult.error).toBeNull()
    })

    it('should handle login after registration', async () => {
      const email = 'user@example.com'
      const password = 'MyPassword123'

      // First attempt - unconfirmed email
      mockSupabase.auth.signInWithPassword.mockResolvedValueOnce({
        data: { user: null, session: null },
        error: {
          name: 'AuthError',
          message: 'Email not confirmed',
          status: 400
        }
      })

      const firstAttempt = await signIn(email, password)
      expect(firstAttempt.error?.message).toBe('Email not confirmed')

      // Second attempt - successful after confirmation
      mockSupabase.auth.signInWithPassword.mockResolvedValueOnce({
        data: {
          user: { id: 'user-101', email },
          session: { access_token: 'valid-token' }
        },
        error: null
      })

      const secondAttempt = await signIn(email, password)
      expect(secondAttempt.data?.user).toBeDefined()
      expect(secondAttempt.error).toBeNull()
    })
  })
})
