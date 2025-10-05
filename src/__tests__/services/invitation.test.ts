import { POST as createInvitation, GET as getInvitations } from '@/app/api/invitations/route'
import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  createSingleUseInvitation,
  createReusableLink,
  getUserInvitations
} from '@/lib/services/invitationService'

// Mock dependencies
jest.mock('@/lib/supabase/server')
jest.mock('@/lib/services/invitationService')
jest.mock('next/headers', () => ({
  cookies: jest.fn().mockResolvedValue({})
}))

const mockCreateClient = createClient as jest.MockedFunction<typeof createClient>
const mockCreateSingleUseInvitation = createSingleUseInvitation as jest.MockedFunction<typeof createSingleUseInvitation>
const mockCreateReusableLink = createReusableLink as jest.MockedFunction<typeof createReusableLink>
const mockGetUserInvitations = getUserInvitations as jest.MockedFunction<typeof getUserInvitations>

describe('Invitation System Tests', () => {
  let mockSupabase: {
    auth: {
      getUser: jest.Mock
    }
  }

  beforeEach(() => {
    jest.clearAllMocks()

    mockSupabase = {
      auth: {
        getUser: jest.fn()
      }
    }

    mockCreateClient.mockReturnValue(mockSupabase as never)
  })

  describe('POST /api/invitations - Single-Use Invitation', () => {
    const mockUser = { id: 'user-123', email: 'parent@example.com' }

    beforeEach(() => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null
      })
    })

    it('should create email invitation successfully', async () => {
      const invitationData = {
        invitationType: 'single_use',
        email: 'grandma@example.com',
        channel: 'email',
        groupId: 'group-123',
        customMessage: 'Join our family updates!',
        expiresInDays: 30
      }

      const mockInvitation = {
        id: 'inv-123',
        token: 'abc123',
        parent_id: 'user-123',
        email: 'grandma@example.com',
        channel: 'email',
        status: 'pending',
        expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
      }

      mockCreateSingleUseInvitation.mockResolvedValue(mockInvitation as never)

      const request = new NextRequest('http://localhost:3000/api/invitations', {
        method: 'POST',
        body: JSON.stringify(invitationData)
      })

      const response = await createInvitation(request)
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data.success).toBe(true)
      expect(data.invitation).toEqual(mockInvitation)
      expect(mockCreateSingleUseInvitation).toHaveBeenCalledWith({
        parentId: 'user-123',
        email: 'grandma@example.com',
        phone: undefined,
        channel: 'email',
        groupId: 'group-123',
        customMessage: 'Join our family updates!',
        expiresInDays: 30
      })
    })

    it('should create SMS invitation successfully', async () => {
      const invitationData = {
        invitationType: 'single_use',
        phone: '+1234567890',
        channel: 'sms',
        groupId: 'group-123'
      }

      const mockInvitation = {
        id: 'inv-124',
        token: 'xyz789',
        parent_id: 'user-123',
        phone: '+1234567890',
        channel: 'sms',
        status: 'pending'
      }

      mockCreateSingleUseInvitation.mockResolvedValue(mockInvitation as never)

      const request = new NextRequest('http://localhost:3000/api/invitations', {
        method: 'POST',
        body: JSON.stringify(invitationData)
      })

      const response = await createInvitation(request)
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data.invitation.channel).toBe('sms')
      expect(data.invitation.phone).toBe('+1234567890')
    })

    it('should validate required fields', async () => {
      const invalidData = {
        invitationType: 'single_use',
        // Missing email or phone
        channel: 'email'
      }

      const request = new NextRequest('http://localhost:3000/api/invitations', {
        method: 'POST',
        body: JSON.stringify(invalidData)
      })

      const response = await createInvitation(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Validation failed')
      expect(data.details).toBeDefined()
    })

    it('should validate email format', async () => {
      const invalidData = {
        invitationType: 'single_use',
        email: 'invalid-email',
        channel: 'email'
      }

      const request = new NextRequest('http://localhost:3000/api/invitations', {
        method: 'POST',
        body: JSON.stringify(invalidData)
      })

      const response = await createInvitation(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Validation failed')
    })
  })

  describe('POST /api/invitations - Reusable Link', () => {
    const mockUser = { id: 'user-123', email: 'parent@example.com' }

    beforeEach(() => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null
      })
    })

    it('should create reusable link successfully', async () => {
      const linkData = {
        invitationType: 'reusable',
        groupId: 'group-123',
        customMessage: 'Join our updates',
        qrCodeSettings: {
          enabled: true,
          size: 256
        }
      }

      const mockLink = {
        id: 'inv-125',
        token: 'reusable-abc',
        parent_id: 'user-123',
        type: 'reusable',
        status: 'active',
        usage_count: 0,
        max_uses: null
      }

      mockCreateReusableLink.mockResolvedValue(mockLink as never)

      const request = new NextRequest('http://localhost:3000/api/invitations', {
        method: 'POST',
        body: JSON.stringify(linkData)
      })

      const response = await createInvitation(request)
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data.success).toBe(true)
      expect(data.invitation.type).toBe('reusable')
      expect(mockCreateReusableLink).toHaveBeenCalledWith({
        parentId: 'user-123',
        groupId: 'group-123',
        customMessage: 'Join our updates',
        qrCodeSettings: {
          enabled: true,
          size: 256
        }
      })
    })

    it('should default to reusable when no contact info provided', async () => {
      const linkData = {
        groupId: 'group-123'
        // No invitationType specified, no email/phone
      }

      const mockLink = {
        id: 'inv-126',
        token: 'reusable-xyz',
        parent_id: 'user-123',
        type: 'reusable'
      }

      mockCreateReusableLink.mockResolvedValue(mockLink as never)

      const request = new NextRequest('http://localhost:3000/api/invitations', {
        method: 'POST',
        body: JSON.stringify(linkData)
      })

      const response = await createInvitation(request)
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(mockCreateReusableLink).toHaveBeenCalled()
    })
  })

  describe('GET /api/invitations', () => {
    const mockUser = { id: 'user-123', email: 'parent@example.com' }

    beforeEach(() => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null
      })
    })

    it('should return all invitations for user', async () => {
      const mockInvitations = [
        {
          id: 'inv-1',
          type: 'single_use',
          email: 'test1@example.com',
          status: 'pending'
        },
        {
          id: 'inv-2',
          type: 'reusable',
          status: 'active'
        }
      ]

      mockGetUserInvitations.mockResolvedValue(mockInvitations as never)

      const request = new NextRequest('http://localhost:3000/api/invitations')
      const response = await getInvitations(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.invitations).toEqual(mockInvitations)
      expect(data.count).toBe(2)
      expect(mockGetUserInvitations).toHaveBeenCalledWith('user-123', {})
    })

    it('should filter invitations by type', async () => {
      const mockFiltered = [
        { id: 'inv-1', type: 'single_use', status: 'pending' }
      ]

      mockGetUserInvitations.mockResolvedValue(mockFiltered as never)

      const request = new NextRequest('http://localhost:3000/api/invitations?type=single_use')
      const response = await getInvitations(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.invitations).toEqual(mockFiltered)
      expect(mockGetUserInvitations).toHaveBeenCalledWith('user-123', {
        type: 'single_use'
      })
    })

    it('should filter invitations by status', async () => {
      const mockFiltered = [
        { id: 'inv-2', type: 'reusable', status: 'active' }
      ]

      mockGetUserInvitations.mockResolvedValue(mockFiltered as never)

      const request = new NextRequest('http://localhost:3000/api/invitations?status=active')
      const response = await getInvitations(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(mockGetUserInvitations).toHaveBeenCalledWith('user-123', {
        status: 'active'
      })
    })

    it('should support search filter', async () => {
      const mockSearchResults = [
        { id: 'inv-1', email: 'grandma@example.com', status: 'pending' }
      ]

      mockGetUserInvitations.mockResolvedValue(mockSearchResults as never)

      const request = new NextRequest('http://localhost:3000/api/invitations?search=grandma')
      const response = await getInvitations(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(mockGetUserInvitations).toHaveBeenCalledWith('user-123', {
        search: 'grandma'
      })
    })

    it('should require authentication', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'Not authenticated' }
      })

      const request = new NextRequest('http://localhost:3000/api/invitations')
      const response = await getInvitations(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
    })

    it('should handle service errors gracefully', async () => {
      mockGetUserInvitations.mockRejectedValue(new Error('Database connection failed'))

      const request = new NextRequest('http://localhost:3000/api/invitations')
      const response = await getInvitations(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Failed to fetch invitations')
    })
  })

  describe('Edge Cases and Error Handling', () => {
    const mockUser = { id: 'user-123' }

    beforeEach(() => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null
      })
    })

    it('should handle malformed JSON in POST', async () => {
      const request = new NextRequest('http://localhost:3000/api/invitations', {
        method: 'POST',
        body: 'invalid json{'
      })

      const response = await createInvitation(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBeDefined()
    })

    it('should handle service layer errors in POST', async () => {
      mockCreateSingleUseInvitation.mockRejectedValue(
        new Error('Failed to send invitation email')
      )

      const request = new NextRequest('http://localhost:3000/api/invitations', {
        method: 'POST',
        body: JSON.stringify({
          invitationType: 'single_use',
          email: 'test@example.com',
          channel: 'email'
        })
      })

      const response = await createInvitation(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Failed to create invitation')
      expect(data.message).toBe('Failed to send invitation email')
    })

    it('should validate filter parameters in GET', async () => {
      const request = new NextRequest('http://localhost:3000/api/invitations?type=invalid_type')
      const response = await getInvitations(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Invalid filters')
    })
  })
})
