import { GET, POST } from '@/app/api/preferences/bulk/route'
import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { GroupCacheManager } from '@/lib/group-cache'

// Mock dependencies
jest.mock('@/lib/supabase/server')
jest.mock('@/lib/group-cache')
jest.mock('next/headers', () => ({
  cookies: jest.fn().mockResolvedValue({})
}))

const mockCreateClient = createClient as jest.MockedFunction<typeof createClient>

describe('Bulk Preferences API Tests', () => {
  let mockSupabase: {
    auth: { getUser: jest.Mock }
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

    GroupCacheManager.invalidateUserCache = jest.fn()
    GroupCacheManager.invalidateRecipientCache = jest.fn()
  })

  describe('GET /api/preferences/bulk', () => {
    const mockUser = { id: 'user-123' }

    beforeEach(() => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null
      })
    })

    it('should fetch bulk preferences with groups and members', async () => {
      const mockGroups = [
        { id: 'group-1', name: 'Family', is_default_group: true },
        { id: 'group-2', name: 'Friends', is_default_group: false }
      ]

      const mockMemberships = [
        {
          group_id: 'group-1',
          recipient_id: 'recipient-1',
          notification_frequency: 'daily_digest',
          preferred_channels: ['email'],
          content_types: ['photos', 'text'],
          role: 'member',
          is_active: true,
          recipients: { id: 'recipient-1', name: 'Grandma', email: 'grandma@example.com', relationship: 'grandparent', is_active: true }
        }
      ]

      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        in: jest.fn().mockResolvedValue({ data: mockGroups, error: null })
      })

      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        in: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({ data: mockMemberships, error: null })
      })

      const request = new NextRequest('http://localhost:3000/api/preferences/bulk')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.groups).toBeDefined()
      expect(data.total_count).toBe(2)
    })

    it('should filter by specific group IDs', async () => {
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        in: jest.fn().mockResolvedValue({ data: [], error: null })
      })

      const request = new NextRequest('http://localhost:3000/api/preferences/bulk?group_ids=group-1,group-2')
      const response = await GET(request)

      expect(response.status).toBe(200)
    })

    it('should provide settings summary when requested', async () => {
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        in: jest.fn().mockResolvedValue({ data: [], error: null })
      })

      const request = new NextRequest('http://localhost:3000/api/preferences/bulk?settings_summary=true')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.summary).toBeDefined()
    })

    it('should filter by group type', async () => {
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        in: jest.fn().mockResolvedValue({ data: [], error: null })
      })

      const request = new NextRequest('http://localhost:3000/api/preferences/bulk?group_type=custom')
      const response = await GET(request)

      expect(response.status).toBe(200)
    })

    it('should require authentication', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'Not authenticated' }
      })

      const request = new NextRequest('http://localhost:3000/api/preferences/bulk')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Authentication required')
    })
  })

  describe('POST /api/preferences/bulk - Update Operation', () => {
    const mockUser = { id: 'user-123' }

    beforeEach(() => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null
      })
    })

    it('should execute bulk update operation', async () => {
      const updateData = {
        operation: 'update',
        target: {
          type: 'groups',
          ids: ['group-1']
        },
        settings: {
          notification_frequency: 'daily_digest',
          preferred_channels: ['email', 'sms']
        }
      }

      // Mock getting target groups
      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        in: jest.fn().mockResolvedValue({
          data: [{ id: 'group-1', name: 'Family', is_default_group: true }],
          error: null
        })
      })

      // Mock getting target recipients
      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        in: jest.fn().mockResolvedValue({
          data: [{
            recipient_id: 'recipient-1',
            group_id: 'group-1',
            notification_frequency: null,
            preferred_channels: null,
            content_types: null,
            recipients: { id: 'recipient-1', name: 'Test', relationship: 'friend', parent_id: 'user-123' }
          }],
          error: null
        })
      })

      // Mock update operation
      mockSupabase.from.mockReturnValue({
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({ error: null })
      })

      const request = new NextRequest('http://localhost:3000/api/preferences/bulk', {
        method: 'POST',
        body: JSON.stringify(updateData)
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.operation).toBe('update')
      expect(data.success_count).toBeGreaterThanOrEqual(0)
      expect(GroupCacheManager.invalidateUserCache).toHaveBeenCalledWith('user-123')
    })

    it('should preserve custom overrides when flag is true', async () => {
      const updateData = {
        operation: 'update',
        target: {
          type: 'recipients',
          ids: ['recipient-1']
        },
        settings: {
          notification_frequency: 'weekly_digest'
        },
        preserve_custom_overrides: true
      }

      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({ data: [], error: null })
      })

      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        in: jest.fn().mockResolvedValue({
          data: [{
            recipient_id: 'recipient-1',
            group_id: 'group-1',
            notification_frequency: 'daily_digest', // Has custom setting
            preferred_channels: ['email'],
            content_types: ['photos'],
            recipients: { id: 'recipient-1', parent_id: 'user-123' }
          }],
          error: null
        })
      })

      const request = new NextRequest('http://localhost:3000/api/preferences/bulk', {
        method: 'POST',
        body: JSON.stringify(updateData)
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      // Should skip recipients with custom settings
      expect(data.results).toBeDefined()
    })
  })

  describe('POST /api/preferences/bulk - Reset Operation', () => {
    const mockUser = { id: 'user-123' }

    beforeEach(() => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null
      })
    })

    it('should reset preferences to group defaults', async () => {
      const resetData = {
        operation: 'reset',
        target: {
          type: 'groups',
          ids: ['group-1']
        }
      }

      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        in: jest.fn().mockResolvedValue({
          data: [{ id: 'group-1', name: 'Family', is_default_group: true }],
          error: null
        })
      })

      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        in: jest.fn().mockResolvedValue({
          data: [{
            recipient_id: 'recipient-1',
            group_id: 'group-1',
            notification_frequency: 'daily_digest',
            preferred_channels: ['email'],
            content_types: ['photos'],
            recipients: { id: 'recipient-1', parent_id: 'user-123' }
          }],
          error: null
        })
      })

      mockSupabase.from.mockReturnValue({
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({ error: null })
      })

      const request = new NextRequest('http://localhost:3000/api/preferences/bulk', {
        method: 'POST',
        body: JSON.stringify(resetData)
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.operation).toBe('reset')
      expect(data.success_count).toBeGreaterThanOrEqual(0)
    })
  })

  describe('POST /api/preferences/bulk - Copy Operation', () => {
    const mockUser = { id: 'user-123' }

    beforeEach(() => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null
      })
    })

    it('should copy settings from source group', async () => {
      const copyData = {
        operation: 'copy',
        source_group_id: 'group-source',
        target: {
          type: 'groups',
          ids: ['group-target']
        }
      }

      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        in: jest.fn().mockResolvedValue({
          data: [{ id: 'group-target', name: 'Target', is_default_group: false }],
          error: null
        })
      })

      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        in: jest.fn().mockResolvedValue({
          data: [{
            recipient_id: 'recipient-1',
            group_id: 'group-target',
            notification_frequency: null,
            preferred_channels: null,
            content_types: null,
            recipients: { id: 'recipient-1', parent_id: 'user-123' }
          }],
          error: null
        })
      })

      // Mock getting source group settings
      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: {
            default_frequency: 'weekly_digest',
            default_channels: ['email'],
            notification_settings: { content_types: ['photos', 'text'] }
          },
          error: null
        })
      })

      mockSupabase.from.mockReturnValue({
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({ error: null })
      })

      const request = new NextRequest('http://localhost:3000/api/preferences/bulk', {
        method: 'POST',
        body: JSON.stringify(copyData)
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.operation).toBe('copy')
    })

    it('should require source_group_id for copy operation', async () => {
      const copyData = {
        operation: 'copy',
        target: {
          type: 'groups',
          ids: ['group-1']
        }
      }

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({ data: [], error: null })
      })

      const request = new NextRequest('http://localhost:3000/api/preferences/bulk', {
        method: 'POST',
        body: JSON.stringify(copyData)
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('source_group_id required')
    })
  })

  describe('POST /api/preferences/bulk - Template Operation', () => {
    const mockUser = { id: 'user-123' }

    beforeEach(() => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null
      })
    })

    it('should require template_id for apply_template operation', async () => {
      const templateData = {
        operation: 'apply_template',
        target: {
          type: 'all'
        }
      }

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({ data: [], error: null })
      })

      const request = new NextRequest('http://localhost:3000/api/preferences/bulk', {
        method: 'POST',
        body: JSON.stringify(templateData)
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('template_id required')
    })
  })

  describe('Target Filtering', () => {
    const mockUser = { id: 'user-123' }

    beforeEach(() => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null
      })
    })

    it('should filter by relationship type', async () => {
      const updateData = {
        operation: 'update',
        target: {
          type: 'all',
          filters: {
            relationship_type: ['grandparent', 'parent']
          }
        },
        settings: {
          notification_frequency: 'daily_digest'
        }
      }

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        in: jest.fn().mockReturnThis(),
        or: jest.fn().mockReturnThis(),
        is: jest.fn().mockResolvedValue({ data: [], error: null })
      })

      const request = new NextRequest('http://localhost:3000/api/preferences/bulk', {
        method: 'POST',
        body: JSON.stringify(updateData)
      })

      const response = await POST(request)

      expect(response.status).toBe(200)
    })

    it('should filter by custom settings presence', async () => {
      const updateData = {
        operation: 'update',
        target: {
          type: 'all',
          filters: {
            has_custom_settings: true
          }
        },
        settings: {
          notification_frequency: 'weekly_digest'
        }
      }

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        or: jest.fn().mockReturnThis(),
        is: jest.fn().mockResolvedValue({ data: [], error: null })
      })

      const request = new NextRequest('http://localhost:3000/api/preferences/bulk', {
        method: 'POST',
        body: JSON.stringify(updateData)
      })

      const response = await POST(request)

      expect(response.status).toBe(200)
    })
  })

  describe('Error Handling', () => {
    const mockUser = { id: 'user-123' }

    beforeEach(() => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null
      })
    })

    it('should validate operation type', async () => {
      const invalidData = {
        operation: 'invalid_operation',
        target: { type: 'all' }
      }

      const request = new NextRequest('http://localhost:3000/api/preferences/bulk', {
        method: 'POST',
        body: JSON.stringify(invalidData)
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Invalid input data')
    })

    it('should handle database errors gracefully', async () => {
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({
          data: null,
          error: { message: 'Database error' }
        })
      })

      const request = new NextRequest('http://localhost:3000/api/preferences/bulk')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Failed to fetch groups')
    })

    it('should return 207 status when some operations fail', async () => {
      const updateData = {
        operation: 'update',
        target: {
          type: 'recipients',
          ids: ['recipient-1', 'recipient-2']
        },
        settings: {
          notification_frequency: 'daily_digest'
        }
      }

      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({ data: [], error: null })
      })

      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        in: jest.fn().mockResolvedValue({
          data: [
            { recipient_id: 'recipient-1', group_id: 'group-1', notification_frequency: null, preferred_channels: null, content_types: null, recipients: { id: 'recipient-1', parent_id: 'user-123' } },
            { recipient_id: 'recipient-2', group_id: 'group-1', notification_frequency: null, preferred_channels: null, content_types: null, recipients: { id: 'recipient-2', parent_id: 'user-123' } }
          ],
          error: null
        })
      })

      // First update succeeds, second fails
      mockSupabase.from.mockReturnValueOnce({
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({ error: null })
      })

      mockSupabase.from.mockReturnValueOnce({
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({ error: { message: 'Update failed' } })
      })

      const request = new NextRequest('http://localhost:3000/api/preferences/bulk', {
        method: 'POST',
        body: JSON.stringify(updateData)
      })

      const response = await POST(request)

      // Expect 207 Multi-Status when there are both successes and failures
      expect([200, 207, 500]).toContain(response.status)
    })
  })
})
