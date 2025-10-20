jest.mock('@/lib/supabase/auth', () => ({
  requireAuthenticatedClient: jest.fn(),
}))

jest.mock('@/lib/services/clientEmailService', () => ({
  clientEmailService: {
    sendTemplatedEmail: jest.fn().mockResolvedValue({ success: true, messageId: 'test' }),
  },
}))

import { createRecipient, deleteRecipient, getRecipients } from '@/lib/recipients'
import { requireAuthenticatedClient } from '@/lib/supabase/auth'

const mockRequireAuthenticatedClient = requireAuthenticatedClient as jest.MockedFunction<
  typeof requireAuthenticatedClient
>

function createSupabaseInsertStub<T extends Record<string, unknown>>(response: T) {
  const singleMock = jest.fn().mockResolvedValue({
    data: response,
    error: null,
  })
  const selectMock = jest.fn().mockReturnValue({ single: singleMock })
  const insertMock = jest.fn().mockReturnValue({ select: selectMock })
  const fromMock = jest.fn().mockReturnValue({ insert: insertMock })

  return { fromMock, insertMock, selectMock, singleMock }
}

function createSupabaseUpdateStub(result: { error: null }) {
  const finalEqMock = jest.fn().mockResolvedValue(result)
  const firstEqMock = jest.fn().mockReturnValue({ eq: finalEqMock })
  const updateMock = jest.fn().mockReturnValue({ eq: firstEqMock })
  const fromMock = jest.fn().mockReturnValue({ update: updateMock })

  return { fromMock, updateMock, firstEqMock, finalEqMock }
}

describe('recipients supabase auth integration', () => {
  beforeAll(() => {
    const randomUUID = jest.fn(() => 'test-token')

    if (!global.crypto) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ;(global as any).crypto = { randomUUID }
    } else {
      Object.defineProperty(global.crypto, 'randomUUID', {
        value: randomUUID,
        configurable: true,
      })
    }
  })

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('uses requireAuthenticatedClient when creating a recipient', async () => {
    const insertResponse = {
      id: 'rec-1',
      parent_id: 'user-1',
      name: 'Sam Recipient',
      phone: '123',
      email: null,
      relationship: 'family',
      group_id: null,
      frequency: 'weekly_digest',
      preferred_channels: ['sms'],
      content_types: ['photos'],
      importance_threshold: null,
      overrides_group_default: false,
      preference_token: 'token',
      is_active: true,
      created_at: '2024-01-01T00:00:00.000Z',
      recipient_groups: null,
    }

    const { fromMock, insertMock, selectMock, singleMock } = createSupabaseInsertStub(insertResponse)

    mockRequireAuthenticatedClient.mockResolvedValue({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      supabase: { from: fromMock } as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      user: { id: 'user-1' } as any,
    })

    const result = await createRecipient({
      name: 'Sam Recipient',
      phone: '123',
      relationship: 'family',
    })

    expect(mockRequireAuthenticatedClient).toHaveBeenCalledTimes(1)
    expect(fromMock).toHaveBeenCalledWith('recipients')
    expect(insertMock).toHaveBeenCalled()
    expect(selectMock).toHaveBeenCalled()
    expect(singleMock).toHaveBeenCalled()
    expect(result.id).toBe('rec-1')
  })

  it('uses requireAuthenticatedClient when deleting a recipient', async () => {
    const { fromMock, updateMock, firstEqMock, finalEqMock } = createSupabaseUpdateStub({ error: null })

    mockRequireAuthenticatedClient.mockResolvedValue({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      supabase: { from: fromMock } as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      user: { id: 'user-42' } as any,
    })

    const result = await deleteRecipient('recipient-123')

    expect(mockRequireAuthenticatedClient).toHaveBeenCalledTimes(1)
    expect(fromMock).toHaveBeenCalledWith('recipients')
    expect(updateMock).toHaveBeenCalledWith({ is_active: false })
    expect(firstEqMock).toHaveBeenCalledWith('id', 'recipient-123')
    expect(finalEqMock).toHaveBeenCalledWith('parent_id', 'user-42')
    expect(result).toBe(true)
  })

  it('surfaces not authenticated errors from the helper', async () => {
    mockRequireAuthenticatedClient.mockRejectedValue(new Error('Not authenticated'))

    await expect(getRecipients()).rejects.toThrow('Not authenticated')
  })
})
