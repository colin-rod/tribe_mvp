import { NextRequest, NextResponse } from 'next/server'
import { GET as getGroups, POST as createGroup } from '@/app/api/groups/route'
import { GET as getMembers, POST as addMembers } from '@/app/api/groups/[groupId]/members/route'
import { createClient } from '@/lib/supabase/server'
import { getUserGroups, createGroup as createGroupLib } from '@/lib/recipient-groups'
import { getGroupWithMembers, addRecipientsToGroup } from '@/lib/group-management'
import { GroupCacheManager } from '@/lib/group-cache'
import { validateParentGroupAccess } from '@/middleware/group-security'

// Mock dependencies
jest.mock('@/lib/supabase/server')
jest.mock('@/lib/recipient-groups', () => ({
  ...jest.requireActual('@/lib/recipient-groups'),
  getUserGroups: jest.fn(),
  createGroup: jest.fn()
}))
jest.mock('@/lib/group-management')
jest.mock('@/lib/group-cache')
jest.mock('@/middleware/group-security')
jest.mock('next/headers', () => ({
  cookies: jest.fn().mockResolvedValue({})
}))

const mockCreateClient = createClient as jest.MockedFunction<typeof createClient>
const mockGetUserGroups = getUserGroups as jest.MockedFunction<typeof getUserGroups>
const mockCreateGroupLib = createGroupLib as jest.MockedFunction<typeof createGroupLib>
const mockGetGroupWithMembers = getGroupWithMembers as jest.MockedFunction<typeof getGroupWithMembers>
const mockAddRecipientsToGroup = addRecipientsToGroup as jest.MockedFunction<typeof addRecipientsToGroup>
const mockValidateParentGroupAccess = validateParentGroupAccess as jest.MockedFunction<typeof validateParentGroupAccess>

describe('Groups API Integration Tests', () => {
  let mockSupabase: {
    auth: {
      getUser: jest.Mock
    }
    from: jest.Mock
  }

  beforeEach(() => {
    jest.clearAllMocks()

    mockSupabase = {
      auth: {
        getUser: jest.fn()
      },
      from: jest.fn()
    }

    mockCreateClient.mockReturnValue(mockSupabase as never)

    // Mock cache methods
    GroupCacheManager.getUserGroups = jest.fn()
    GroupCacheManager.getGroupMembers = jest.fn()
    GroupCacheManager.invalidateUserCache = jest.fn()
    GroupCacheManager.invalidateGroupCache = jest.fn()
  })

  describe('GET /api/groups', () => {
    it('should return groups for authenticated user', async () => {
      const mockUser = { id: 'user-123' }
      const mockGroups = [
        { id: 'group-1', name: 'Family', is_default_group: true, member_count: 5 },
        { id: 'group-2', name: 'Close Friends', is_default_group: false, member_count: 3 }
      ]

      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null
      })

      ;(GroupCacheManager.getUserGroups as jest.Mock).mockResolvedValue(mockGroups)

      const request = new NextRequest('http://localhost:3000/api/groups')
      const response = await getGroups(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.groups).toEqual(mockGroups)
      expect(data.total_count).toBe(2)
      expect(data.default_groups).toBe(1)
      expect(data.custom_groups).toBe(1)
      expect(GroupCacheManager.getUserGroups).toHaveBeenCalledWith('user-123')
    })

    it('should return 401 for unauthenticated user', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'Not authenticated' }
      })

      const request = new NextRequest('http://localhost:3000/api/groups')
      const response = await getGroups(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Authentication required')
    })

    it('should handle errors gracefully', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null
      })

      ;(GroupCacheManager.getUserGroups as jest.Mock).mockRejectedValue(
        new Error('Database error')
      )

      const request = new NextRequest('http://localhost:3000/api/groups')
      const response = await getGroups(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Failed to fetch groups')
    })
  })

  describe('POST /api/groups', () => {
    const mockUser = { id: 'user-123' }

    beforeEach(() => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null
      })
    })

    it('should create a new group successfully', async () => {
      const existingGroups = [
        { id: 'group-1', name: 'Family', is_default_group: true }
      ]
      const newGroupData = {
        name: 'Close-Friends',
        default_frequency: 'every_update',
        default_channels: ['email']
      }
      const createdGroup = {
        id: 'group-2',
        ...newGroupData,
        is_default_group: false
      }

      mockGetUserGroups.mockResolvedValue(existingGroups as never)
      mockCreateGroupLib.mockResolvedValue(createdGroup as never)

      const request = new NextRequest('http://localhost:3000/api/groups', {
        method: 'POST',
        body: JSON.stringify(newGroupData)
      })

      const response = await createGroup(request)
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data.group).toEqual(createdGroup)
      expect(data.message).toBe('Group created successfully')
      expect(GroupCacheManager.invalidateUserCache).toHaveBeenCalledWith('user-123')
    })

    it('should reject duplicate group names', async () => {
      const existingGroups = [
        { id: 'group-1', name: 'Family', is_default_group: true }
      ]

      mockGetUserGroups.mockResolvedValue(existingGroups as never)

      const request = new NextRequest('http://localhost:3000/api/groups', {
        method: 'POST',
        body: JSON.stringify({
          name: 'family', // Case-insensitive match
          default_frequency: 'every_update',
          default_channels: ['email']
        })
      })

      const response = await createGroup(request)
      const data = await response.json()

      expect(response.status).toBe(409)
      expect(data.error).toBe('Group name already exists')
    })

    it('should enforce maximum group limit', async () => {
      const existingGroups = Array.from({ length: 25 }, (_, i) => ({
        id: `group-${i}`,
        name: `Group ${i}`,
        is_default_group: i === 0
      }))

      mockGetUserGroups.mockResolvedValue(existingGroups as never)

      const request = new NextRequest('http://localhost:3000/api/groups', {
        method: 'POST',
        body: JSON.stringify({
          name: 'New Group',
          default_frequency: 'every_update',
          default_channels: ['email']
        })
      })

      const response = await createGroup(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Maximum number of groups (25) reached')
    })

    it('should validate input data', async () => {
      const request = new NextRequest('http://localhost:3000/api/groups', {
        method: 'POST',
        body: JSON.stringify({
          // Missing required fields
          name: ''
        })
      })

      const response = await createGroup(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Invalid input data')
      expect(data.details).toBeDefined()
    })
  })

  describe('GET /api/groups/[groupId]/members', () => {
    const mockUser = { id: 'user-123' }
    const groupId = 'group-1'

    beforeEach(() => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null
      })
    })

    it('should return group members for authorized user', async () => {
      const mockMembers = [
        { id: 'member-1', name: 'John Doe', is_active: true },
        { id: 'member-2', name: 'Jane Smith', is_active: true },
        { id: 'member-3', name: 'Bob Johnson', is_active: false }
      ]

      mockValidateParentGroupAccess.mockResolvedValue({
        can_view: true,
        can_modify: true,
        group: { id: groupId, parent_id: 'user-123' }
      } as never)

      ;(GroupCacheManager.getGroupMembers as jest.Mock).mockResolvedValue(mockMembers)

      const request = new NextRequest(`http://localhost:3000/api/groups/${groupId}/members`)
      const response = await getMembers(request, { params: Promise.resolve({ groupId }) })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.members).toEqual(mockMembers)
      expect(data.total_count).toBe(3)
      expect(data.active_count).toBe(2)
    })

    it('should deny access to unauthorized users', async () => {
      mockValidateParentGroupAccess.mockResolvedValue({
        can_view: false,
        can_modify: false,
        group: null
      } as never)

      const request = new NextRequest(`http://localhost:3000/api/groups/${groupId}/members`)
      const response = await getMembers(request, { params: Promise.resolve({ groupId }) })
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toBe('Group not found or access denied')
    })
  })

  describe('POST /api/groups/[groupId]/members', () => {
    const mockUser = { id: 'user-123' }
    const groupId = 'group-1'

    beforeEach(() => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null
      })

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        in: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        mockResolvedValue: jest.fn()
      })
    })

    it('should add recipients to group successfully', async () => {
      const recipientIds = ['a2a9a3f2-3e4d-4b1a-9e6a-1a2b3c4d5e6f', 'b2a9a3f2-3e4d-4b1a-9e6a-1a2b3c4d5e6f']
      const mockGroup = { id: groupId, name: 'Family', member_count: 3 }
      const mockRecipients = [
        { id: 'a2a9a3f2-3e4d-4b1a-9e6a-1a2b3c4d5e6f', name: 'Alice' },
        { id: 'b2a9a3f2-3e4d-4b1a-9e6a-1a2b3c4d5e6f', name: 'Bob' }
      ]
      const mockNewMemberships = [
        { id: 'membership-1', group_id: groupId, recipient_id: 'recipient-1' },
        { id: 'membership-2', group_id: groupId, recipient_id: 'recipient-2' }
      ]

      mockSupabase.from.mockReset()

      const recipientsQueryMock = {
        select: jest.fn().mockReturnThis(),
        in: jest.fn().mockReturnThis(),
        eq: jest.fn()
      }

      ;(recipientsQueryMock.eq as jest.Mock)
        .mockReturnValueOnce(recipientsQueryMock)
        .mockResolvedValueOnce({ data: mockRecipients, error: null })
        .mockReturnValueOnce(recipientsQueryMock)
        .mockResolvedValueOnce({ data: [], error: null })

      mockSupabase.from.mockImplementation(() => recipientsQueryMock as never)

      mockValidateParentGroupAccess.mockResolvedValue({
        can_view: true,
        can_modify: true,
        group: mockGroup
      } as never)

      mockGetGroupWithMembers.mockResolvedValue({ ...mockGroup, members: [] } as never)

      const addRecipientsToGroupMock = jest.spyOn(require('@/lib/group-management'), 'addRecipientsToGroup')
      addRecipientsToGroupMock.mockResolvedValue(mockNewMemberships as never)

      const request = new NextRequest(`http://localhost:3000/api/groups/${groupId}/members`, {
        method: 'POST',
        body: JSON.stringify({ recipient_ids: recipientIds })
      })

      const response = await addMembers(request, { params: Promise.resolve({ groupId }) })
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data.added_members).toBe(2)
      expect(GroupCacheManager.invalidateGroupCache).toHaveBeenCalledWith(groupId)
      expect(GroupCacheManager.invalidateUserCache).toHaveBeenCalledWith('user-123')
    })

    it('should enforce group size limit', async () => {
      const recipientIds = Array.from({ length: 50 }, (_, i) => `a2a9a3f2-3e4d-4b1a-9e6a-1a2b3c4d5e${i.toString().padStart(2, '0')}`)
      const mockGroup = { id: groupId, name: 'Family', member_count: 60 }

      mockValidateParentGroupAccess.mockResolvedValue({
        can_view: true,
        can_modify: true,
        group: mockGroup
      } as never)

      mockGetGroupWithMembers.mockResolvedValue({ ...mockGroup, members: Array.from({ length: 60 }) } as never)

      const request = new NextRequest(`http://localhost:3000/api/groups/${groupId}/members`, {
        method: 'POST',
        body: JSON.stringify({ recipient_ids: recipientIds })
      })

      const response = await addMembers(request, { params: Promise.resolve({ groupId }) })
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('exceed the maximum group size')
    })
  })
})
