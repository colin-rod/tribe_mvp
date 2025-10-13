import { jest, describe, it, expect, beforeAll, afterEach } from '@jest/globals'
import type { Invitation } from '../../types/invitation'

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

const sendInvitationEmailMock = jest.fn()
const sendInvitationSMSMock = jest.fn()
const sendInvitationWhatsAppMock = jest.fn()

jest.mock('../clientEmailService', () => ({
  clientEmailService: {
    sendInvitationEmail: sendInvitationEmailMock
  }
}))

jest.mock('../smsService', () => ({
  smsService: {
    sendInvitationSMS: sendInvitationSMSMock,
    sendInvitationWhatsApp: sendInvitationWhatsAppMock
  }
}))

let createSingleUseInvitation: typeof import('../invitationService').createSingleUseInvitation
let createReusableLink: typeof import('../invitationService').createReusableLink
let sendInvitation: typeof import('../invitationService').sendInvitation

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

function setupProfileFetch({
  profileResponse
}: {
  profileResponse: SupabaseResponse<{
    id: string
    name?: string | null
    email?: string | null
    phone?: string | null
  }>
}) {
  mockFrom.mockReset()

  const profilesSingle = jest.fn().mockResolvedValue(profileResponse)
  const profilesEq = jest.fn().mockReturnValue({ single: profilesSingle })
  const profilesSelect = jest.fn().mockReturnValue({ eq: profilesEq })

  mockFrom.mockImplementation((table: string) => {
    if (table === 'profiles') {
      return { select: profilesSelect }
    }

    throw new Error(`Unexpected table: ${table}`)
  })

  return { profilesSelect, profilesEq, profilesSingle }
}

function buildInvitation(overrides: Partial<Invitation> = {}): Invitation {
  const base: Invitation = {
    id: 'invitation-test',
    parent_id: 'parent-123',
    invitation_type: 'single_use',
    token: 'token-123',
    status: 'active',
    channel: 'email',
    recipient_email: 'family@example.com',
    recipient_phone: '+15551234567',
    expires_at: '2024-01-08T00:00:00.000Z',
    group_id: null,
    custom_message: null,
    use_count: 0,
    metadata: {},
    created_at: '2024-01-01T00:00:00.000Z',
    updated_at: '2024-01-01T00:00:00.000Z'
  }

  return { ...base, ...overrides }
}

beforeAll(async () => {
  const invitationModule = await import('../invitationService')
  createSingleUseInvitation = invitationModule.createSingleUseInvitation
  createReusableLink = invitationModule.createReusableLink
  sendInvitation = invitationModule.sendInvitation
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

  describe('sendInvitation', () => {
    it('fetches inviter profile and passes the inviter name to the email service', async () => {
      const { profilesSelect, profilesEq } = setupProfileFetch({
        profileResponse: {
          data: {
            id: 'parent-123',
            name: 'Jamie Parent',
            email: 'jamie@example.com',
            phone: '+15550001111'
          },
          error: null
        }
      })

      sendInvitationEmailMock.mockResolvedValue({ success: true, messageId: 'email-123' })

      const invitation = buildInvitation({
        parent_id: 'parent-123',
        recipient_email: 'relative@example.com',
        channel: 'email'
      })

      const result = await sendInvitation(invitation, 'email')

      expect(mockFrom).toHaveBeenCalledWith('profiles')
      expect(profilesSelect).toHaveBeenCalledWith('id, name, email, phone')
      expect(profilesEq).toHaveBeenCalledWith('id', 'parent-123')
      expect(sendInvitationEmailMock).toHaveBeenCalledWith(
        'relative@example.com',
        expect.objectContaining({ inviterName: 'Jamie Parent' }),
        { replyTo: 'jamie@example.com' }
      )
      expect(result).toEqual({ success: true, messageId: 'email-123', error: undefined })
    })

    it('passes the inviter name to the SMS service', async () => {
      setupProfileFetch({
        profileResponse: {
          data: {
            id: 'parent-456',
            name: 'Alex Sender'
          },
          error: null
        }
      })

      sendInvitationSMSMock.mockResolvedValue({ success: true, messageId: 'sms-456' })

      const invitation = buildInvitation({
        parent_id: 'parent-456',
        recipient_phone: '+15558889999',
        channel: 'sms',
        custom_message: 'Join us!'
      })

      const result = await sendInvitation(invitation, 'sms', 'Join soon')

      expect(sendInvitationSMSMock).toHaveBeenCalledTimes(1)
      const smsCall = sendInvitationSMSMock.mock.calls[0]
      expect(smsCall[0]).toBe('+15558889999')
      expect(smsCall[1]).toBe('Alex Sender')
      expect(result).toEqual({ success: true, messageId: 'sms-456', error: undefined })
    })

    it('passes the inviter name to the WhatsApp service', async () => {
      setupProfileFetch({
        profileResponse: {
          data: {
            id: 'parent-789',
            name: 'Taylor Host'
          },
          error: null
        }
      })

      sendInvitationWhatsAppMock.mockResolvedValue({ success: true, messageId: 'wa-789' })

      const invitation = buildInvitation({
        parent_id: 'parent-789',
        recipient_phone: '+15557778888',
        channel: 'whatsapp'
      })

      const result = await sendInvitation(invitation, 'whatsapp')

      expect(sendInvitationWhatsAppMock).toHaveBeenCalledTimes(1)
      const whatsappCall = sendInvitationWhatsAppMock.mock.calls[0]
      expect(whatsappCall[0]).toBe('+15557778888')
      expect(whatsappCall[1]).toBe('Taylor Host')
      expect(result).toEqual({ success: true, messageId: 'wa-789', error: undefined })
    })
  })
})
