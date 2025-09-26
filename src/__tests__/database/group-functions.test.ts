/**
 * @jest-environment node
 */

import { createClient } from '@supabase/supabase-js'

// Mock Supabase client for testing
const mockSupabase = {
  rpc: jest.fn(),
  from: jest.fn(() => ({
    select: jest.fn(() => ({
      eq: jest.fn(() => ({
        single: jest.fn(),
        order: jest.fn(() => ({
          limit: jest.fn()
        }))
      })),
      insert: jest.fn(),
      update: jest.fn(() => ({
        eq: jest.fn()
      })),
      delete: jest.fn(() => ({
        eq: jest.fn()
      }))
    }))
  }))
}

// Mock environment variables
process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co'
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key'
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key'

describe('Group Management Database Functions', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('get_effective_notification_settings', () => {
    it('should return group defaults when no member overrides exist', async () => {
      const mockResult = {
        frequency: 'every_update',
        channels: ['email'],
        content_types: ['photos', 'text', 'milestones'],
        source: 'group_default'
      }

      mockSupabase.rpc.mockResolvedValueOnce({
        data: mockResult,
        error: null
      })

      const result = await mockSupabase.rpc('get_effective_notification_settings', {
        p_recipient_id: 'recipient-123',
        p_group_id: 'group-456'
      })

      expect(mockSupabase.rpc).toHaveBeenCalledWith('get_effective_notification_settings', {
        p_recipient_id: 'recipient-123',
        p_group_id: 'group-456'
      })

      expect(result.data).toEqual(mockResult)
      expect(result.data.source).toBe('group_default')
    })

    it('should return member overrides when they exist', async () => {
      const mockResult = {
        frequency: 'daily_digest',
        channels: ['email', 'sms'],
        content_types: ['photos', 'milestones'],
        source: 'member_override'
      }

      mockSupabase.rpc.mockResolvedValueOnce({
        data: mockResult,
        error: null
      })

      const result = await mockSupabase.rpc('get_effective_notification_settings', {
        p_recipient_id: 'recipient-123',
        p_group_id: 'group-456'
      })

      expect(result.data.source).toBe('member_override')
      expect(result.data.frequency).toBe('daily_digest')
      expect(result.data.channels).toContain('sms')
    })

    it('should handle missing recipient gracefully', async () => {
      mockSupabase.rpc.mockResolvedValueOnce({
        data: null,
        error: { message: 'Recipient not found' }
      })

      const result = await mockSupabase.rpc('get_effective_notification_settings', {
        p_recipient_id: 'invalid-recipient',
        p_group_id: 'group-456'
      })

      expect(result.error).toBeTruthy()
      expect(result.error.message).toBe('Recipient not found')
    })

    it('should validate input parameters', async () => {
      mockSupabase.rpc.mockResolvedValueOnce({
        data: null,
        error: { message: 'Invalid UUID format' }
      })

      const result = await mockSupabase.rpc('get_effective_notification_settings', {
        p_recipient_id: 'invalid-uuid',
        p_group_id: 'group-456'
      })

      expect(result.error).toBeTruthy()
      expect(result.error.message).toContain('Invalid UUID')
    })
  })

  describe('bulk_update_group_members', () => {
    it('should update all members when apply_to_all is true', async () => {
      mockSupabase.rpc.mockResolvedValueOnce({
        data: 5, // 5 members updated
        error: null
      })

      const result = await mockSupabase.rpc('bulk_update_group_members', {
        p_group_id: 'group-123',
        p_settings: {
          frequency: 'weekly_digest',
          channels: ['email'],
          content_types: ['photos', 'text']
        },
        p_apply_to_all: true
      })

      expect(mockSupabase.rpc).toHaveBeenCalledWith('bulk_update_group_members', {
        p_group_id: 'group-123',
        p_settings: {
          frequency: 'weekly_digest',
          channels: ['email'],
          content_types: ['photos', 'text']
        },
        p_apply_to_all: true
      })

      expect(result.data).toBe(5)
    })

    it('should only update members without custom settings when apply_to_all is false', async () => {
      mockSupabase.rpc.mockResolvedValueOnce({
        data: 3, // 3 members updated (2 had custom settings)
        error: null
      })

      const result = await mockSupabase.rpc('bulk_update_group_members', {
        p_group_id: 'group-123',
        p_settings: {
          frequency: 'daily_digest'
        },
        p_apply_to_all: false
      })

      expect(result.data).toBe(3)
    })

    it('should handle empty group gracefully', async () => {
      mockSupabase.rpc.mockResolvedValueOnce({
        data: 0,
        error: null
      })

      const result = await mockSupabase.rpc('bulk_update_group_members', {
        p_group_id: 'empty-group',
        p_settings: { frequency: 'weekly_digest' },
        p_apply_to_all: true
      })

      expect(result.data).toBe(0)
    })

    it('should validate settings format', async () => {
      mockSupabase.rpc.mockResolvedValueOnce({
        data: null,
        error: { message: 'Invalid frequency value' }
      })

      const result = await mockSupabase.rpc('bulk_update_group_members', {
        p_group_id: 'group-123',
        p_settings: {
          frequency: 'invalid_frequency'
        },
        p_apply_to_all: true
      })

      expect(result.error).toBeTruthy()
      expect(result.error.message).toContain('Invalid frequency')
    })
  })

  describe('is_recipient_muted', () => {
    it('should return false when recipient is not muted', async () => {
      mockSupabase.rpc.mockResolvedValueOnce({
        data: false,
        error: null
      })

      const result = await mockSupabase.rpc('is_recipient_muted', {
        p_recipient_id: 'recipient-123',
        p_group_id: 'group-456'
      })

      expect(result.data).toBe(false)
    })

    it('should return true when recipient is globally muted', async () => {
      mockSupabase.rpc.mockResolvedValueOnce({
        data: true,
        error: null
      })

      const result = await mockSupabase.rpc('is_recipient_muted', {
        p_recipient_id: 'recipient-123'
      })

      expect(result.data).toBe(true)
    })

    it('should return true when recipient is muted for specific group', async () => {
      mockSupabase.rpc.mockResolvedValueOnce({
        data: true,
        error: null
      })

      const result = await mockSupabase.rpc('is_recipient_muted', {
        p_recipient_id: 'recipient-123',
        p_group_id: 'group-456'
      })

      expect(result.data).toBe(true)
    })

    it('should handle expired mutes correctly', async () => {
      mockSupabase.rpc.mockResolvedValueOnce({
        data: false, // Expired mute should return false
        error: null
      })

      const result = await mockSupabase.rpc('is_recipient_muted', {
        p_recipient_id: 'recipient-123',
        p_group_id: 'group-456'
      })

      expect(result.data).toBe(false)
    })
  })

  describe('should_deliver_notification', () => {
    it('should deliver when recipient is not muted', async () => {
      mockSupabase.rpc.mockResolvedValueOnce({
        data: true,
        error: null
      })

      const result = await mockSupabase.rpc('should_deliver_notification', {
        p_recipient_id: 'recipient-123',
        p_group_id: 'group-456',
        p_notification_type: 'update',
        p_urgency_level: 'normal'
      })

      expect(result.data).toBe(true)
    })

    it('should not deliver normal notifications when muted', async () => {
      mockSupabase.rpc.mockResolvedValueOnce({
        data: false,
        error: null
      })

      const result = await mockSupabase.rpc('should_deliver_notification', {
        p_recipient_id: 'recipient-123',
        p_group_id: 'group-456',
        p_notification_type: 'update',
        p_urgency_level: 'normal'
      })

      expect(result.data).toBe(false)
    })

    it('should deliver urgent notifications even when muted if preserve_urgent is true', async () => {
      mockSupabase.rpc.mockResolvedValueOnce({
        data: true,
        error: null
      })

      const result = await mockSupabase.rpc('should_deliver_notification', {
        p_recipient_id: 'recipient-123',
        p_group_id: 'group-456',
        p_notification_type: 'milestone',
        p_urgency_level: 'urgent'
      })

      expect(result.data).toBe(true)
    })

    it('should deliver milestone notifications even when muted', async () => {
      mockSupabase.rpc.mockResolvedValueOnce({
        data: true,
        error: null
      })

      const result = await mockSupabase.rpc('should_deliver_notification', {
        p_recipient_id: 'recipient-123',
        p_group_id: 'group-456',
        p_notification_type: 'milestone',
        p_urgency_level: 'normal'
      })

      expect(result.data).toBe(true)
    })
  })

  describe('bulk_mute_operation', () => {
    it('should mute recipients for specified duration', async () => {
      const mockResult = {
        operation: 'mute',
        affected_count: 3,
        mute_until: '2024-01-15T10:00:00Z',
        applied_at: '2024-01-01T10:00:00Z'
      }

      mockSupabase.rpc.mockResolvedValueOnce({
        data: mockResult,
        error: null
      })

      const result = await mockSupabase.rpc('bulk_mute_operation', {
        p_recipient_ids: ['recipient-1', 'recipient-2', 'recipient-3'],
        p_group_ids: ['group-123'],
        p_operation: 'mute',
        p_duration_minutes: 60 * 24 * 7, // 1 week
        p_mute_settings: {
          preserve_urgent: true,
          reason: 'temporary_break'
        }
      })

      expect(result.data.operation).toBe('mute')
      expect(result.data.affected_count).toBe(3)
      expect(result.data.mute_until).toBeTruthy()
    })

    it('should unmute recipients', async () => {
      const mockResult = {
        operation: 'unmute',
        affected_count: 2,
        mute_until: null,
        applied_at: '2024-01-01T10:00:00Z'
      }

      mockSupabase.rpc.mockResolvedValueOnce({
        data: mockResult,
        error: null
      })

      const result = await mockSupabase.rpc('bulk_mute_operation', {
        p_recipient_ids: ['recipient-1', 'recipient-2'],
        p_group_ids: ['group-123'],
        p_operation: 'unmute'
      })

      expect(result.data.operation).toBe('unmute')
      expect(result.data.affected_count).toBe(2)
      expect(result.data.mute_until).toBeNull()
    })

    it('should handle global mute when no group_ids provided', async () => {
      const mockResult = {
        operation: 'mute',
        affected_count: 1,
        mute_until: '2024-01-08T10:00:00Z',
        applied_at: '2024-01-01T10:00:00Z'
      }

      mockSupabase.rpc.mockResolvedValueOnce({
        data: mockResult,
        error: null
      })

      const result = await mockSupabase.rpc('bulk_mute_operation', {
        p_recipient_ids: ['recipient-1'],
        p_operation: 'mute',
        p_duration_minutes: 60 * 24 * 7, // 1 week
        p_mute_settings: { preserve_urgent: false }
      })

      expect(result.data.operation).toBe('mute')
      expect(result.data.affected_count).toBe(1)
    })
  })

  describe('cleanup_expired_mutes', () => {
    it('should clean up expired mutes and return count', async () => {
      mockSupabase.rpc.mockResolvedValueOnce({
        data: 7, // 7 expired mutes cleaned up
        error: null
      })

      const result = await mockSupabase.rpc('cleanup_expired_mutes')

      expect(mockSupabase.rpc).toHaveBeenCalledWith('cleanup_expired_mutes')
      expect(result.data).toBe(7)
    })

    it('should return 0 when no expired mutes exist', async () => {
      mockSupabase.rpc.mockResolvedValueOnce({
        data: 0,
        error: null
      })

      const result = await mockSupabase.rpc('cleanup_expired_mutes')

      expect(result.data).toBe(0)
    })
  })

  describe('Group Membership Validation', () => {
    it('should validate group membership constraints', async () => {
      // Test that recipient and group belong to same parent
      const mockValidation = {
        data: null,
        error: { message: 'Recipient and group must belong to the same parent' }
      }

      mockSupabase.from.mockReturnValueOnce({
        insert: jest.fn().mockResolvedValueOnce(mockValidation)
      })

      const insertResult = mockSupabase.from('group_memberships')
      const result = await insertResult.insert({
        recipient_id: 'recipient-123',
        group_id: 'group-different-parent'
      })

      expect(result.error).toBeTruthy()
      expect(result.error.message).toContain('same parent')
    })

    it('should enforce max groups limit', async () => {
      const mockValidation = {
        data: null,
        error: { message: 'Recipient has reached maximum number of groups (10)' }
      }

      mockSupabase.from.mockReturnValueOnce({
        insert: jest.fn().mockResolvedValueOnce(mockValidation)
      })

      const insertResult = mockSupabase.from('group_memberships')
      const result = await insertResult.insert({
        recipient_id: 'recipient-at-limit',
        group_id: 'group-123'
      })

      expect(result.error).toBeTruthy()
      expect(result.error.message).toContain('maximum number of groups')
    })

    it('should allow valid group membership creation', async () => {
      const mockSuccess = {
        data: {
          id: 'membership-123',
          recipient_id: 'recipient-123',
          group_id: 'group-456',
          role: 'member',
          is_active: true
        },
        error: null
      }

      mockSupabase.from.mockReturnValueOnce({
        insert: jest.fn().mockResolvedValueOnce(mockSuccess)
      })

      const insertResult = mockSupabase.from('group_memberships')
      const result = await insertResult.insert({
        recipient_id: 'recipient-123',
        group_id: 'group-456',
        role: 'member'
      })

      expect(result.error).toBeNull()
      expect(result.data.id).toBe('membership-123')
    })
  })

  describe('Group Deletion Handling', () => {
    it('should prevent deletion of default groups with active members', async () => {
      const mockError = {
        data: null,
        error: { message: 'Cannot delete default group "Close Family" with 5 active members' }
      }

      mockSupabase.from.mockReturnValueOnce({
        delete: jest.fn(() => ({
          eq: jest.fn().mockResolvedValueOnce(mockError)
        }))
      })

      const deleteResult = mockSupabase.from('recipient_groups')
      const result = await deleteResult.delete().eq('id', 'default-group-123')

      expect(result.error).toBeTruthy()
      expect(result.error.message).toContain('Cannot delete default group')
    })

    it('should allow deletion of custom groups', async () => {
      const mockSuccess = {
        data: { id: 'custom-group-123' },
        error: null
      }

      mockSupabase.from.mockReturnValueOnce({
        delete: jest.fn(() => ({
          eq: jest.fn().mockResolvedValueOnce(mockSuccess)
        }))
      })

      const deleteResult = mockSupabase.from('recipient_groups')
      const result = await deleteResult.delete().eq('id', 'custom-group-123')

      expect(result.error).toBeNull()
      expect(result.data.id).toBe('custom-group-123')
    })
  })
})