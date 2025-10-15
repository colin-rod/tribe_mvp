import '@testing-library/jest-dom'
import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import ForgotPasswordForm from '@/components/auth/ForgotPasswordForm'
import ResetPasswordForm from '@/components/auth/ResetPasswordForm'
import * as passwordResetModule from '@/lib/auth/password-reset'
import {
  evaluatePasswordStrength,
  getPasswordStrengthLabel,
  isValidPassword,
} from '@/lib/validation/password'

const pushMock = jest.fn()
const mockSupabaseClient = {
  auth: {
    getSession: jest.fn(),
    setSession: jest.fn(),
    updateUser: jest.fn(),
    signOut: jest.fn(),
  },
}

jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: pushMock,
  }),
}))

jest.mock('@/lib/supabase/auth', () => {
  const actual = jest.requireActual('@/lib/supabase/auth')
  return {
    ...actual,
    resetPassword: jest.fn(),
  }
})

jest.mock('@/lib/supabase/client', () => ({
  createClient: jest.fn(() => mockSupabaseClient),
}))

const mockResetPassword = jest.requireMock('@/lib/supabase/auth').resetPassword as jest.Mock
const mockGetSession = mockSupabaseClient.auth.getSession as jest.Mock
const mockSetSession = mockSupabaseClient.auth.setSession as jest.Mock
const mockUpdateUser = mockSupabaseClient.auth.updateUser as jest.Mock
const mockSignOut = mockSupabaseClient.auth.signOut as jest.Mock

describe('password reset utilities', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    localStorage.clear()
    sessionStorage.clear()
    mockGetSession.mockResolvedValue({ data: { session: null }, error: null })
    mockSetSession.mockResolvedValue({ data: { session: null }, error: null })
    mockUpdateUser.mockResolvedValue({ error: null })
    mockSignOut.mockResolvedValue({ error: null })
  })

  it('requests password reset and responds uniformly', async () => {
    mockResetPassword.mockResolvedValue({ data: {}, error: null })

    const initialState = passwordResetModule.getPasswordResetRateLimitInfo('user@example.com')
    expect(initialState.remainingAttempts).toBe(3)

    const result = await passwordResetModule.requestPasswordReset(' user@example.com ')

    expect(mockResetPassword).toHaveBeenCalledWith('user@example.com')
    expect(result.success).toBe(true)
    expect(result.rateLimited).toBe(false)
    expect(result.message).toMatch(/If an account exists/)

    const afterState = passwordResetModule.getPasswordResetRateLimitInfo('user@example.com')
    expect(afterState.remainingAttempts).toBe(2)
  })

  it('enforces client-side rate limiting after three attempts', async () => {
    mockResetPassword.mockResolvedValue({ data: {}, error: null })

    await passwordResetModule.requestPasswordReset('rate@example.com')
    await passwordResetModule.requestPasswordReset('rate@example.com')
    await passwordResetModule.requestPasswordReset('rate@example.com')

    const limited = await passwordResetModule.requestPasswordReset('rate@example.com')

    expect(limited.rateLimited).toBe(true)
    expect(limited.remainingAttempts).toBe(0)
    expect(limited.message).toMatch(/Too many password reset requests/)
  })

  it('captures Supabase errors but returns a neutral response', async () => {
    mockResetPassword.mockResolvedValue({
      data: {},
      error: { message: 'User not found' },
    })

    const result = await passwordResetModule.requestPasswordReset('missing@example.com')

    expect(result.success).toBe(true)
    expect(result.errorMessage).toBe('User not found')
    expect(result.message).toMatch(/If an account exists/)
  })

  it('evaluates password requirements accurately', () => {
    expect(isValidPassword('Short1')).toBe(false)
    expect(isValidPassword('NoNumberAA')).toBe(false)
    expect(isValidPassword('lowercase1')).toBe(false)
    expect(isValidPassword('StrongPass1')).toBe(true)

    expect(getPasswordStrengthLabel('weak')).toBe('weak')
    expect(getPasswordStrengthLabel('medium7')).toBe('medium')
    expect(getPasswordStrengthLabel('StrongPass1')).toBe('strong')

    const strength = evaluatePasswordStrength('StrongPass1!')
    expect(strength.score).toBeGreaterThanOrEqual(3)
    expect(strength.feedback.length).toBe(0)
  })

  it('prepares password recovery session using exchange tokens', async () => {
    mockGetSession.mockResolvedValueOnce({ data: { session: null }, error: null })
    mockSetSession.mockResolvedValueOnce({
      data: { session: { user: { email: 'reset@example.com' } } },
      error: null,
    })

    const originalHash = window.location.hash
    window.location.hash = '#type=recovery&access_token=abc&refresh_token=def'

    const replaceStateSpy = jest.spyOn(window.history, 'replaceState').mockImplementation(() => undefined)

    const result = await passwordResetModule.preparePasswordRecoverySession()

    expect(mockSetSession).toHaveBeenCalledWith({ access_token: 'abc', refresh_token: 'def' })
    expect(result.isValid).toBe(true)
    expect(result.email).toBe('reset@example.com')
    expect(replaceStateSpy).toHaveBeenCalled()

    replaceStateSpy.mockRestore()
    window.location.hash = originalHash
  })

  it('completes password reset and signs out session', async () => {
    mockGetSession.mockResolvedValueOnce({
      data: { session: { user: { email: 'reset@example.com' } } },
      error: null,
    })

    const result = await passwordResetModule.completePasswordReset('Stronger1')

    expect(mockUpdateUser).toHaveBeenCalledWith({ password: 'Stronger1' })
    expect(mockSignOut).toHaveBeenCalled()
    expect(result.success).toBe(true)
    expect(result.email).toBe('reset@example.com')
  })
})

describe('forgot password form', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    localStorage.clear()
    sessionStorage.clear()
  })

  it('submits reset requests and shows confirmation', async () => {
    mockResetPassword.mockResolvedValue({ data: {}, error: null })

    render(<ForgotPasswordForm />)

    const emailField = screen.getByLabelText(/Email address/i)
    await userEvent.type(emailField, 'user@example.com')

    const submitButton = screen.getByRole('button', { name: /send reset instructions/i })
    await userEvent.click(submitButton)

    await waitFor(() => {
      expect(screen.getByText(/Request received/i)).toBeInTheDocument()
    })
  })

  it('shows validation error for invalid email', async () => {
    render(<ForgotPasswordForm />)

    const emailField = screen.getByLabelText(/Email address/i)
    await userEvent.type(emailField, 'invalid-email')

    const submitButton = screen.getByRole('button', { name: /send reset instructions/i })
    await userEvent.click(submitButton)

    expect(screen.getByText(/Enter a valid email address/)).toBeInTheDocument()
  })

  it('displays rate limit alert when limit reached', async () => {
    mockResetPassword.mockResolvedValue({ data: {}, error: null })

    await passwordResetModule.requestPasswordReset('user@example.com')
    await passwordResetModule.requestPasswordReset('user@example.com')
    await passwordResetModule.requestPasswordReset('user@example.com')

    render(<ForgotPasswordForm />)

    const emailField = screen.getByLabelText(/Email address/i)
    await userEvent.type(emailField, 'user@example.com')

    const submitButton = screen.getByRole('button', { name: /send reset instructions/i })
    await userEvent.click(submitButton)

    await waitFor(() => {
      expect(screen.getByText(/Too many password reset requests/i)).toBeInTheDocument()
    })
  })
})

