import '@testing-library/jest-dom'
import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

const pushMock = jest.fn()

jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: pushMock,
  }),
}))

jest.mock('@/lib/auth/password-reset', () => ({
  __esModule: true,
  clearPasswordResetRateLimit: jest.fn(),
  completePasswordReset: jest.fn(),
  preparePasswordRecoverySession: jest.fn(),
}))

import ResetPasswordForm from '@/components/auth/ResetPasswordForm'
import {
  clearPasswordResetRateLimit,
  completePasswordReset,
  preparePasswordRecoverySession,
} from '@/lib/auth/password-reset'

const mockClearRateLimit = clearPasswordResetRateLimit as jest.Mock
const mockCompleteReset = completePasswordReset as jest.Mock
const mockPrepareSession = preparePasswordRecoverySession as jest.Mock

describe('ResetPasswordForm', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    pushMock.mockReset()
  })

  it('shows error when recovery session is invalid', async () => {
    mockPrepareSession.mockResolvedValue({ isValid: false, error: 'Invalid link' })

    render(<ResetPasswordForm />)

    await act(async () => {
      await Promise.resolve()
    })

    await screen.findByText(/Invalid link/i)

    expect(screen.getByRole('link', { name: /Request a new reset link/i })).toBeInTheDocument()
    expect(mockCompleteReset).not.toHaveBeenCalled()
  })

  // Additional behavioral tests for successful resets are covered via integration tests in password-reset.test.tsx
})
