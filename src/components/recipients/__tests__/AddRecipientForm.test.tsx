import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import AddRecipientForm from '../AddRecipientForm'
import type { Recipient } from '@/lib/recipients'

jest.mock('@/lib/api/recipients', () => ({
  checkRecipientDuplicate: jest.fn()
}))

jest.mock('@/lib/recipients', () => ({
  createRecipient: jest.fn(),
  updateRecipient: jest.fn()
}))

const { checkRecipientDuplicate } = jest.requireMock('@/lib/api/recipients') as {
  checkRecipientDuplicate: jest.Mock
}

const { createRecipient, updateRecipient } = jest.requireMock('@/lib/recipients') as {
  createRecipient: jest.Mock
  updateRecipient: jest.Mock
}

const buildRecipient = (overrides: Partial<Recipient> = {}): Recipient => ({
  id: overrides.id ?? 'rec-1',
  parent_id: overrides.parent_id ?? 'parent-1',
  name: overrides.name ?? 'Grandma',
  email: overrides.email ?? 'grandma@example.com',
  phone: overrides.phone ?? null,
  relationship: overrides.relationship ?? 'other',
  group_id: overrides.group_id ?? null,
  frequency: overrides.frequency ?? 'weekly_digest',
  preferred_channels: overrides.preferred_channels ?? ['email'],
  content_types: overrides.content_types ?? ['photos', 'text'],
  importance_threshold: overrides.importance_threshold ?? 'all_updates',
  overrides_group_default: overrides.overrides_group_default ?? false,
  preference_token: overrides.preference_token ?? 'token-123',
  is_active: overrides.is_active ?? true,
  created_at: overrides.created_at ?? new Date().toISOString(),
  group: overrides.group
})

describe('AddRecipientForm duplicate handling', () => {
  const onRecipientAdded = jest.fn()
  const onCancel = jest.fn()
  const onRecipientMerged = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('shows duplicate warning when duplicate is detected', async () => {
    checkRecipientDuplicate.mockResolvedValue({
      match: {
        id: 'rec-existing',
        name: 'Grandma Existing',
        email: 'grandma@example.com',
        phone: '+15555550123',
        source: 'email'
      }
    })

    render(
      <AddRecipientForm
        onRecipientAdded={onRecipientAdded}
        onRecipientMerged={onRecipientMerged}
        onCancel={onCancel}
      />
    )

    await userEvent.type(screen.getByLabelText(/full name/i), 'Grandma Existing')
    const emailInput = screen.getByLabelText(/email address/i)
    await userEvent.type(emailInput, 'grandma@example.com')
    fireEvent.blur(emailInput)

    expect(await screen.findByText(/possible duplicate found/i)).toBeInTheDocument()
    expect(screen.getByText(/Grandma Existing already uses grandma@example.com/i)).toBeInTheDocument()
  })

  it('merges details with existing recipient when requested', async () => {
    checkRecipientDuplicate.mockResolvedValue({
      match: {
        id: 'rec-existing',
        name: 'Grandma Existing',
        email: 'grandma@example.com',
        phone: '+15555550123',
        source: 'email'
      }
    })

    const updatedRecipient = buildRecipient({ id: 'rec-existing', phone: '+15555550999' })
    updateRecipient.mockResolvedValue(updatedRecipient)

    render(
      <AddRecipientForm
        onRecipientAdded={onRecipientAdded}
        onRecipientMerged={onRecipientMerged}
        onCancel={onCancel}
      />
    )

    await userEvent.type(screen.getByLabelText(/full name/i), 'Grandma Existing')
    const emailInput = screen.getByLabelText(/email address/i)
    await userEvent.type(emailInput, 'grandma@example.com')
    fireEvent.blur(emailInput)

    const phoneInput = screen.getByLabelText(/phone number/i)
    await userEvent.type(phoneInput, '+15555550999')

    const mergeButton = await screen.findByRole('button', { name: /merge details/i })
    await userEvent.click(mergeButton)

    await waitFor(() => {
      expect(updateRecipient).toHaveBeenCalledWith('rec-existing', expect.objectContaining({
        phone: '+15555550999'
      }))
      expect(onRecipientMerged).toHaveBeenCalledWith(updatedRecipient)
    })
  })

  it('blocks submission until override is selected', async () => {
    checkRecipientDuplicate.mockResolvedValue({
      match: {
        id: 'rec-existing',
        name: 'Grandma Existing',
        email: 'grandma@example.com',
        phone: '+15555550123',
        source: 'email'
      }
    })

    const createdRecipient = buildRecipient({ id: 'rec-new', email: 'grandma@example.com' })
    createRecipient.mockResolvedValue(createdRecipient)

    render(
      <AddRecipientForm
        onRecipientAdded={onRecipientAdded}
        onRecipientMerged={onRecipientMerged}
        onCancel={onCancel}
      />
    )

    await userEvent.type(screen.getByLabelText(/full name/i), 'Grandma Existing')
    const emailInput = screen.getByLabelText(/email address/i)
    await userEvent.type(emailInput, 'grandma@example.com')
    fireEvent.blur(emailInput)

    await userEvent.click(screen.getByRole('button', { name: /add recipient/i }))

    expect(createRecipient).not.toHaveBeenCalled()
    expect(screen.getByText(/choose an action below/i)).toBeInTheDocument()

    const overrideButton = await screen.findByRole('button', { name: /create new anyway/i })
    await userEvent.click(overrideButton)

    await userEvent.click(screen.getByRole('button', { name: /add recipient/i }))

    await waitFor(() => {
      expect(createRecipient).toHaveBeenCalled()
      expect(onRecipientAdded).toHaveBeenCalledWith(createdRecipient)
    })
  })
})
