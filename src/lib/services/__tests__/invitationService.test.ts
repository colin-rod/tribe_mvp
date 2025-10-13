import { jest, describe, it, expect, beforeAll, afterEach } from '@jest/globals'

const mockLogger = {
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn()
}

jest.mock('@/lib/logger', () => ({
  createLogger: () => mockLogger
}))

const mockFrom = jest.fn()
const mockCreateClient = jest.fn(() => ({
  from: mockFrom
}))

jest.mock('@/lib/supabase/client', () => ({
  createClient: mockCreateClient
}))

let createSingleUseInvitation: typeof import('../invitationService').createSingleUseInvitation
let createReusableLink: typeof import('../invitationService').createReusableLink

type SupabaseResponse<T> = {
  data: T | null
  error: unknown | null
}

type SupabaseSetupResult = {
  profilesSelect: jest.Mock
  profilesEq: jest.Mock
  profilesSingle: jest.Mock
  invitationsInsert: jest.Mock
  invitationsSelect: jest.Mock
  invitationsSingle: jest.Mock
}

function setupSupabase({
  parentResponse,
  invitationResponse
}: {
  parentResponse: SupabaseResponse<{ id: string; name?: string }>
  invitationResponse: SupabaseResponse<unknown>
}): SupabaseSetupResult {
  mockFrom.mockReset()

  const profilesSingle = jest.fn().mockResolvedValue(parentResponse)
  const profilesEq = jest.fn().mockReturnValue({ single: profilesSingle })
  const profilesSelect = jest
    .fn()
    .mockReturnValue({ eq: profilesEq })

  const invitationsSingle = jest.fn().mockResolvedValue(invitationResponse)
  const invitationsSelect = jest
    .fn()
    .mockReturnValue({ single: invitationsSingle })
  const invitationsInsert = jest
    .fn()
    .mockReturnValue({ select: invitationsSelect })

  mockFrom.mockImplementation((table: string) => {
    throw new Error(`Unexpected table: ${table}`)
  })
  mockFrom.mockReturnValueOnce({ select: profilesSelect })
  mockFrom.mockReturnValueOnce({ insert: invitationsInsert })

  return {
    profilesSelect,
    profilesEq,
    profilesSingle,
    invitationsInsert,
    invitationsSelect,
    invitationsSingle
  }
}

beforeAll(async () => {
  // eslint-disable-next-line @next/next/no-assign-module-variable
  const module = await import('../invitationService')
  createSingleUseInvitation = module.createSingleUseInvitation
  createReusableLink = module.createReusableLink
})

describe('invitationService', () => {
  afterEach(() => {
    jest.useRealTimers()
    mockFrom.mockReset()
    mockCreateClient.mockClear()
    jest.clearAllMocks()
  })

  it('creates a single-use invitation with shared builder defaults', async () => {
    jest.useFakeTimers()
    jest.setSystemTime(new Date('2024-01-01T00:00:00.000Z'))

    const createdInvitation = { id: 'invitation-123' }

    const { invitationsInsert, profilesSelect, profilesEq } = setupSupabase({
      parentResponse: {
        data: { id: 'parent-123', name: 'Parent One' },
        error: null
      },
      invitationResponse: {
        data: createdInvitation,
        error: null
      }
    })

    const result = await createSingleUseInvitation({
      parentId: 'parent-123',
      email: 'family@example.com',
      phone: '555-1234',
      channel: 'email',
      groupId: 'group-456',
      customMessage: 'Hello there!'
    })

    expect(result).toEqual(createdInvitation)
    expect(mockFrom).toHaveBeenNthCalledWith(1, 'profiles')
    expect(mockFrom).toHaveBeenNthCalledWith(2, 'invitations')
    expect(profilesSelect).toHaveBeenCalledWith('id, name')
    expect(profilesEq).toHaveBeenCalledWith('id', 'parent-123')

    expect(invitationsInsert).toHaveBeenCalledTimes(1)
    const insertPayload = invitationsInsert.mock.calls[0][0]

    expect(insertPayload).toMatchObject({
      parent_id: 'parent-123',
      invitation_type: 'single_use',
      status: 'active',
      channel: 'email',
      recipient_email: 'family@example.com',
      recipient_phone: '555-1234',
      group_id: 'group-456',
      custom_message: 'Hello there!',
      use_count: 0,
      metadata: {}
    })
    expect(typeof insertPayload.token).toBe('string')
    expect(insertPayload.expires_at).toBe('2024-01-08T00:00:00.000Z')
  })

  it('creates a reusable invitation link with QR code metadata', async () => {
    const createdInvitation = { id: 'invite-reusable' }

    const { invitationsInsert } = setupSupabase({
      parentResponse: {
        data: { id: 'parent-abc', name: 'Parent Two' },
        error: null
      },
      invitationResponse: {
        data: createdInvitation,
        error: null
      }
    })

    const result = await createReusableLink({
      parentId: 'parent-abc',
      groupId: undefined,
      customMessage: 'Join our updates',
      qrCodeSettings: { size: 512 }
    })

    expect(result).toEqual(createdInvitation)
    expect(invitationsInsert).toHaveBeenCalledTimes(1)
    const insertPayload = invitationsInsert.mock.calls[0][0]

    expect(insertPayload).toMatchObject({
      parent_id: 'parent-abc',
      invitation_type: 'reusable',
      status: 'active',
      channel: 'link',
      recipient_email: null,
      recipient_phone: null,
      expires_at: null,
      group_id: null,
      custom_message: 'Join our updates',
      use_count: 0,
      metadata: {
        qrCodeSettings: { size: 512 }
      }
    })
  })

  it('throws when the parent profile cannot be found', async () => {
    const { invitationsInsert } = setupSupabase({
      parentResponse: {
        data: null,
        error: { message: 'Not found' }
      },
      invitationResponse: {
        data: null,
        error: null
      }
    })

    await expect(
      createReusableLink({
        parentId: 'missing-parent'
      })
    ).rejects.toThrow('Parent not found')

    expect(invitationsInsert).not.toHaveBeenCalled()
  })
})
