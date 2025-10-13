import { GET, POST } from '@/app/api/preferences/bulk/route'
import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { GroupCacheManager } from '@/lib/group-cache'

// Mock dependencies
jest.mock('@/lib/supabase/server');
jest.mock('@/lib/group-cache');
jest.mock('next/headers', () => ({
  cookies: jest.fn().mockResolvedValue({})
}));

const mockCreateClient = createClient as jest.MockedFunction<typeof createClient>;

describe('Bulk Preferences API Tests', () => {
  let mockSupabase: {
    auth: { getUser: jest.Mock };
    from: jest.Mock;
  };

  beforeEach(() => {
    jest.clearAllMocks();

    mockSupabase = {
      auth: {
        getUser: jest.fn(),
      },
      from: jest.fn(),
    };

    mockCreateClient.mockReturnValue(mockSupabase as never);

    GroupCacheManager.invalidateUserCache = jest.fn();
    GroupCacheManager.invalidateRecipientCache = jest.fn();
  });

  describe('GET /api/preferences/bulk', () => {
    const mockUser = { id: 'user-123' };

    beforeEach(() => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });
    });

    it('should fetch bulk preferences with groups and members', async () => {
      const mockGroups = [
        {
          id: 'c7f3e1d0-1234-5678-9abc-def012345678',
          name: 'Family',
          is_default_group: true,
          default_frequency: 'daily_digest',
          default_channels: ['email'],
          notification_settings: {},
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        {
          id: 'd8f4e2d1-2345-6789-abcd-ef0123456789',
          name: 'Friends',
          is_default_group: false,
          default_frequency: 'weekly_digest',
          default_channels: ['email'],
          notification_settings: {},
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
      ];

      const mockMemberships = [
        {
          group_id: 'c7f3e1d0-1234-5678-9abc-def012345678',
          recipient_id: 'a1b2c3d4-5678-90ab-cdef-1234567890ab',
          frequency: 'daily_digest',
          preferred_channels: ['email'],
          content_types: ['photos', 'text'],
          role: 'member',
          is_active: true,
          recipients: { id: 'a1b2c3d4-5678-90ab-cdef-1234567890ab', name: 'Grandma', email: 'grandma@example.com', relationship: 'grandparent', is_active: true },
        },
      ];

      // Mock groups query - no .in() call when no group_ids filter
      mockSupabase.from
        .mockReturnValueOnce({
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockResolvedValue({ data: mockGroups, error: null })
        })
        // Mock memberships query
        .mockReturnValueOnce({
          select: jest.fn().mockReturnThis(),
          in: jest.fn().mockReturnThis(),
          eq: jest.fn().mockResolvedValue({ data: mockMemberships, error: null })
        });

      const request = new NextRequest('http://localhost:3000/api/preferences/bulk')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.groups).toBeDefined()
      expect(data.groups.length).toBe(2)
      expect(data.total_count).toBe(2)
    })

    it('should filter by specific group IDs', async () => {
      const mockGroups = [
        { id: 'c7f3e1d0-1234-5678-9abc-def012345678', name: 'Family', is_default_group: true },
      ];

      // Mock groups query
      mockSupabase.from
        .mockReturnValueOnce({
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          in: jest.fn().mockResolvedValue({ data: mockGroups, error: null }),
        })
        // Mock memberships query
        .mockReturnValueOnce({
          select: jest.fn().mockReturnThis(),
          in: jest.fn().mockReturnThis(),
          eq: jest.fn().mockResolvedValue({ data: [], error: null }),
        });

      const request = new NextRequest('http://localhost:3000/api/preferences/bulk?group_ids=c7f3e1d0-1234-5678-9abc-def012345678')
      const response = await GET(request)

      expect(response.status).toBe(200)
    })

    it('should provide settings summary when requested', async () => {
      const mockGroups = [
        {
          id: 'c7f3e1d0-1234-5678-9abc-def012345678',
          name: 'Family',
          is_default_group: true,
          default_frequency: 'daily_digest',
          default_channels: ['email'],
          notification_settings: {},
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      ];

      // Mock groups query
      mockSupabase.from
        .mockReturnValueOnce({
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          in: jest.fn().mockResolvedValue({ data: mockGroups, error: null })
        })
        // Mock memberships query
        .mockReturnValueOnce({
          select: jest.fn().mockReturnThis(),
          in: jest.fn().mockReturnThis(),
          eq: jest.fn().mockResolvedValue({ data: [], error: null })
        });

      const request = new NextRequest('http://localhost:3000/api/preferences/bulk?settings_summary=true')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.summary).toBeDefined()
    })

    it('should filter by group type', async () => {
      const mockGroups = [{ id: 'c7f3e1d0-1234-5678-9abc-def012345678', name: 'Family', is_default_group: false }];

      // Mock groups query
      mockSupabase.from
        .mockReturnValueOnce({
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          in: jest.fn().mockResolvedValue({ data: mockGroups, error: null })
        })
        // Mock memberships query
        .mockReturnValueOnce({
          select: jest.fn().mockReturnThis(),
          in: jest.fn().mockReturnThis(),
          eq: jest.fn().mockResolvedValue({ data: [], error: null })
        });

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
          ids: ['c7f3e1d0-1234-5678-9abc-def012345678']
        },
        settings: {
          frequency: 'daily_digest',
          preferred_channels: ['email', 'sms']
        }
      }

      // Mock getting target groups
      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        in: jest.fn().mockResolvedValue({
          data: [{ id: 'c7f3e1d0-1234-5678-9abc-def012345678', name: 'Family', is_default_group: true }],
          error: null
        })
      })

      // Mock getting target recipients
      // Need to handle: .select().eq('is_active', true).eq('parent_id', userId).in('group_id', [...])
      const recipientsQueryChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        in: jest.fn().mockResolvedValue({
          data: [{
            id: 'a1b2c3d4-5678-90ab-cdef-1234567890ab',
            group_id: 'c7f3e1d0-1234-5678-9abc-def012345678',
            frequency: null,
            preferred_channels: null,
            content_types: null,
            name: 'Test',
            relationship: 'friend',
            parent_id: 'user-123'
          }],
          error: null
        })
      };
      mockSupabase.from.mockReturnValueOnce(recipientsQueryChain)

      // Mock update operation - needs to support .update().eq('id', ...).eq('group_id', ...)
      const updateQueryChain = {
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis()
      };
      // Make the last eq() call return a resolved promise
      (updateQueryChain.eq as jest.Mock).mockReturnValueOnce(updateQueryChain);
      (updateQueryChain.eq as jest.Mock).mockResolvedValueOnce({ error: null });
      mockSupabase.from.mockReturnValue(updateQueryChain)

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
          ids: ['a1b2c3d4-5678-90ab-cdef-1234567890ab']
        },
        settings: {
          frequency: 'weekly_digest'
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
            recipient_id: 'a1b2c3d4-5678-90ab-cdef-1234567890ab',
            group_id: 'c7f3e1d0-1234-5678-9abc-def012345678',
            frequency: 'daily_digest', // Has custom setting
            preferred_channels: ['email'],
            content_types: ['photos'],
            recipients: { id: 'a1b2c3d4-5678-90ab-cdef-1234567890ab', parent_id: 'user-123' }
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
          ids: ['c7f3e1d0-1234-5678-9abc-def012345678']
        }
      }

      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        in: jest.fn().mockResolvedValue({
          data: [{ id: 'c7f3e1d0-1234-5678-9abc-def012345678', name: 'Family', is_default_group: true }],
          error: null
        })
      })

      const recipientsQueryChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        in: jest.fn().mockResolvedValue({
          data: [{
            id: 'a1b2c3d4-5678-90ab-cdef-1234567890ab',
            group_id: 'c7f3e1d0-1234-5678-9abc-def012345678',
            frequency: 'daily_digest',
            preferred_channels: ['email'],
            content_types: ['photos'],
            name: 'Test User',
            relationship: 'friend',
            parent_id: 'user-123'
          }],
          error: null
        })
      };
      mockSupabase.from.mockReturnValueOnce(recipientsQueryChain)

      // Mock update operation - needs to support two .eq() calls
      const updateQueryChain = {
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis()
      };
      (updateQueryChain.eq as jest.Mock).mockReturnValueOnce(updateQueryChain);
      (updateQueryChain.eq as jest.Mock).mockResolvedValueOnce({ error: null });
      mockSupabase.from.mockReturnValue(updateQueryChain)

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
        source_group_id: 'e9f5e3d2-3456-789a-bcde-f01234567890',
        target: {
          type: 'groups',
          ids: ['f0f6e4d3-4567-89ab-cdef-012345678901']
        }
      }

      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        in: jest.fn().mockResolvedValue({
          data: [{ id: 'f0f6e4d3-4567-89ab-cdef-012345678901', name: 'Target', is_default_group: false }],
          error: null
        })
      })

      const recipientsQueryChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        in: jest.fn().mockResolvedValue({
          data: [{
            id: 'a1b2c3d4-5678-90ab-cdef-1234567890ab',
            group_id: 'f0f6e4d3-4567-89ab-cdef-012345678901',
            frequency: null,
            preferred_channels: null,
            content_types: null,
            name: 'Test User',
            relationship: 'friend',
            parent_id: 'user-123'
          }],
          error: null
        })
      };
      mockSupabase.from.mockReturnValueOnce(recipientsQueryChain)

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

      // Mock update operation - needs to support two .eq() calls
      const updateQueryChain = {
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis()
      };
      (updateQueryChain.eq as jest.Mock).mockReturnValueOnce(updateQueryChain);
      (updateQueryChain.eq as jest.Mock).mockResolvedValueOnce({ error: null });
      mockSupabase.from.mockReturnValue(updateQueryChain)

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
          ids: ['c7f3e1d0-1234-5678-9abc-def012345678']
        }
      }

      // Mock target groups query
      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        in: jest.fn().mockResolvedValue({
          data: [{ id: 'c7f3e1d0-1234-5678-9abc-def012345678', name: 'Family', is_default_group: true }],
          error: null
        })
      })

      // Mock recipients query
      const recipientsQueryChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        in: jest.fn().mockResolvedValue({
          data: [],
          error: null
        })
      };
      mockSupabase.from.mockReturnValueOnce(recipientsQueryChain)

      const request = new NextRequest('http://localhost:3000/api/preferences/bulk', {
        method: 'POST',
        body: JSON.stringify(copyData)
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('source_group_id required for copy operation')
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

      // Mock target groups query (for 'all' target type)
      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({
          data: [],
          error: null
        })
      })

      // Mock recipients query
      const recipientsQueryChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis()
      };
      (recipientsQueryChain.eq as jest.Mock).mockReturnValueOnce(recipientsQueryChain);
      (recipientsQueryChain.eq as jest.Mock).mockResolvedValueOnce({
        data: [],
        error: null
      });
      mockSupabase.from.mockReturnValueOnce(recipientsQueryChain)

      const request = new NextRequest('http://localhost:3000/api/preferences/bulk', {
        method: 'POST',
        body: JSON.stringify(templateData)
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('template_id required for apply_template operation')
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
          frequency: 'daily_digest'
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
          frequency: 'weekly_digest'
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
          ids: ['a1b2c3d4-5678-90ab-cdef-1234567890ab', 'b2c3d4e5-6789-0abc-def1-234567890abc']
        },
        settings: {
          frequency: 'daily_digest'
        }
      }

      // Mock target groups query
      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({ data: [], error: null })
      })

      // Mock target recipients query
      const recipientsQueryChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        in: jest.fn().mockResolvedValue({
          data: [
            { id: 'a1b2c3d4-5678-90ab-cdef-1234567890ab', group_id: 'c7f3e1d0-1234-5678-9abc-def012345678', frequency: null, preferred_channels: null, content_types: null, name: 'User 1', relationship: 'friend', parent_id: 'user-123' },
            { id: 'b2c3d4e5-6789-0abc-def1-234567890abc', group_id: 'c7f3e1d0-1234-5678-9abc-def012345678', frequency: null, preferred_channels: null, content_types: null, name: 'User 2', relationship: 'friend', parent_id: 'user-123' }
          ],
          error: null
        })
      };
      mockSupabase.from.mockReturnValueOnce(recipientsQueryChain)

      // First update succeeds - needs to support two .eq() calls
      const updateQueryChain1 = {
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis()
      };
      (updateQueryChain1.eq as jest.Mock).mockReturnValueOnce(updateQueryChain1);
      (updateQueryChain1.eq as jest.Mock).mockResolvedValueOnce({ error: null });
      mockSupabase.from.mockReturnValueOnce(updateQueryChain1)

      // Second update fails - needs to support two .eq() calls
      const updateQueryChain2 = {
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis()
      };
      (updateQueryChain2.eq as jest.Mock).mockReturnValueOnce(updateQueryChain2);
      (updateQueryChain2.eq as jest.Mock).mockResolvedValueOnce({ error: { message: 'Update failed' } });
      mockSupabase.from.mockReturnValueOnce(updateQueryChain2)

      const request = new NextRequest('http://localhost:3000/api/preferences/bulk', {
        method: 'POST',
        body: JSON.stringify(updateData)
      })

      const response = await POST(request)

      // Expect 207 Multi-Status when there are both successes and failures
      expect(response.status).toBe(207)
    })
  })
})
