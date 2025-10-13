import { jest, describe, it, expect, beforeEach } from '@jest/globals'
import {
  createDraft,
  updateDraft,
  addMediaToDraft,
  deleteDraft,
  markDraftAsReady,
  markReadyAsDraft,
  getDraftById,
  getDrafts,
  getDraftWorkspaceSummary,
  type SupabaseClientLike
} from '../draftService'
import type { DraftUpdateRequest } from '@/lib/types/digest'

const mockLogger = {
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn()
}

jest.mock('@/lib/logger', () => ({
  createLogger: () => mockLogger
}))

type SupabaseFactoryOptions = {
  getUserResult?: { data: { user: { id: string } | null }; error: { message?: string } | null }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  fromImpl: (...args: any[]) => any
}

function createSupabaseOverride({
  getUserResult = { data: { user: { id: 'user-123' } }, error: null },
  fromImpl
}: SupabaseFactoryOptions): SupabaseClientLike {
  return {
    auth: {
      getUser: jest.fn(async () => getUserResult)
    },
    from: (...args: Parameters<SupabaseClientLike['from']>) => fromImpl(...args)
  }
}

function createSelectSingleChain<T>(response: { data: T; error: { message?: string; code?: string } | null }) {
  const single = jest.fn(async () => response)
  const select = jest.fn(() => ({ single }))
  return { select, single }
}

function createUpdateChain<T>(
  response: { data: T; error: { message?: string } | null },
  eqCountBeforeSelect = 3
) {
  const { select, single } = createSelectSingleChain(response)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const buildLevel = (depth: number): any => {
    if (depth === 0) {
      return { select }
    }

    const next = buildLevel(depth - 1)
    const eq = jest.fn(() => next)
    return { eq }
  }

  const chain = buildLevel(eqCountBeforeSelect)
  const update = jest.fn(() => chain)
  return { update, select, single }
}

function createDeleteChain(response: { error: { message?: string } | null }) {
  const inFn = jest.fn(async () => response)
  const secondEq = jest.fn(() => ({ in: inFn }))
  const firstEq = jest.fn(() => ({ eq: secondEq }))
  const del = jest.fn(() => ({ eq: firstEq }))
  return { del, firstEq, secondEq, inFn }
}

function createFetchChain<T>(response: { data: T; error: { message?: string } | null }) {
  const { select, single } = createSelectSingleChain(response)
  const secondEq = jest.fn(() => ({ single }))
  const firstEq = jest.fn(() => ({ eq: secondEq }))
  return { select: jest.fn(() => ({ eq: firstEq })), firstEq, secondEq, single }
}

function createByIdChain<T>(response: { data: T; error: { message?: string; code?: string } | null }) {
  const { select, single } = createSelectSingleChain(response)
  const inFn = jest.fn(() => ({ single }))
  const secondEq = jest.fn(() => ({ in: inFn }))
  const firstEq = jest.fn(() => ({ eq: secondEq }))
  return { select: jest.fn(() => ({ eq: firstEq })), firstEq, secondEq, inFn, single }
}

function createListChain<T>(response: { data: T; error: { message?: string } | null }) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const builder: any = {}
  builder.eq = jest.fn(() => builder)
  builder.in = jest.fn(() => builder)
  builder.gte = jest.fn(() => builder)
  builder.lte = jest.fn(() => builder)
  builder.not = jest.fn(() => builder)
  builder.or = jest.fn(() => builder)
  builder.is = jest.fn(() => builder)
  builder.order = jest.fn(async () => response)
  const select = jest.fn(() => builder)
  return { select, builder }
}

describe('draftService', () => {
  const mockUser = { id: 'user-123' }
  const mockChild = {
    id: 'child-123',
    name: 'Emma'
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('createDraft', () => {
    const mockDraftRequest: DraftUpdateRequest = {
      child_id: mockChild.id,
      content: 'Emma smiled for the first time!',
      subject: 'First Smile',
      content_format: 'plain',
      media_urls: ['photo1.jpg'],
      milestone_type: 'first_smile'
    }

    it('should create draft successfully', async () => {
      const mockDraft = {
        id: 'draft-123',
        parent_id: mockUser.id,
        child_id: mockChild.id,
        content: mockDraftRequest.content,
        subject: mockDraftRequest.subject,
        media_urls: mockDraftRequest.media_urls,
        milestone_type: mockDraftRequest.milestone_type,
        distribution_status: 'draft'
      }

      const insert = jest.fn(() => ({
        select: () => ({
          single: () => Promise.resolve({ data: mockDraft, error: null })
        })
      }))

      const supabase = createSupabaseOverride({
        getUserResult: { data: { user: mockUser }, error: null },
        fromImpl: () => ({ insert })
      })

      const result = await createDraft(mockDraftRequest, supabase)

      expect(result).toEqual(mockDraft)
      expect(insert).toHaveBeenCalledWith(
        expect.objectContaining({
          parent_id: mockUser.id,
          child_id: mockDraftRequest.child_id,
          content: mockDraftRequest.content,
          distribution_status: 'draft'
        })
      )
    })

    it('should handle creation failure', async () => {
      const insert = jest.fn(() => ({
        select: () => ({
          single: () => Promise.resolve({ data: null, error: { message: 'Insert failed' } })
        })
      }))

      const supabase = createSupabaseOverride({
        getUserResult: { data: { user: mockUser }, error: null },
        fromImpl: () => ({ insert })
      })

      await expect(createDraft(mockDraftRequest, supabase)).rejects.toThrow(
        'Failed to create draft: Insert failed'
      )
    })

    it('should handle unauthenticated user', async () => {
      const supabase = createSupabaseOverride({
        getUserResult: { data: { user: null }, error: null },
        fromImpl: () => ({ insert: jest.fn() })
      })

      await expect(createDraft(mockDraftRequest, supabase)).rejects.toThrow('Not authenticated')
    })

    it('should create draft with minimal data', async () => {
      const minimalRequest: DraftUpdateRequest = {
        child_id: mockChild.id,
        content: 'Quick note'
      }

      const mockDraft = {
        id: 'draft-456',
        parent_id: mockUser.id,
        child_id: mockChild.id,
        content: 'Quick note',
        media_urls: [],
        distribution_status: 'draft'
      }

      const supabase = createSupabaseOverride({
        getUserResult: { data: { user: mockUser }, error: null },
        fromImpl: () => ({
          insert: () => ({
            select: () => ({
              single: () => Promise.resolve({ data: mockDraft, error: null })
            })
          })
        })
      })

      const result = await createDraft(minimalRequest, supabase)

      expect(result.content).toBe('Quick note')
      expect(result.media_urls).toEqual([])
    })
  })

  describe('updateDraft', () => {
    const draftId = 'draft-123'

    it('should update draft successfully', async () => {
      const updateData = {
        content: 'Updated content',
        subject: 'Updated Subject'
      }

      const mockUpdatedDraft = {
        id: draftId,
        parent_id: mockUser.id,
        ...updateData,
        last_edited_at: new Date().toISOString()
      }

      const { update } = createUpdateChain({ data: mockUpdatedDraft, error: null })

      const supabase = createSupabaseOverride({
        getUserResult: { data: { user: mockUser }, error: null },
        fromImpl: () => ({ update })
      })

      const result = await updateDraft(draftId, updateData, supabase)

      expect(result.content).toBe('Updated content')
      expect(update).toHaveBeenCalledWith(expect.objectContaining(updateData))
    })

    it('should only update status on drafts', async () => {
      const { update } = createUpdateChain({ data: null, error: { message: 'Not a draft' } })

      const supabase = createSupabaseOverride({
        getUserResult: { data: { user: mockUser }, error: null },
        fromImpl: () => ({ update })
      })

      await expect(updateDraft(draftId, { content: 'Test' }, supabase)).rejects.toThrow(
        'Failed to update draft: Not a draft'
      )
    })
  })

  describe('addMediaToDraft', () => {
    const draftId = 'draft-123'
    const newMediaUrls = ['photo2.jpg', 'photo3.jpg']

    it('should add media to draft successfully', async () => {
      const fetchChain = createFetchChain({
        data: { media_urls: ['photo1.jpg'] },
        error: null
      })

      const { update } = createUpdateChain({
        data: { id: draftId, media_urls: ['photo1.jpg', ...newMediaUrls] },
        error: null
      }, 2)

      let callIndex = 0
      const supabase = createSupabaseOverride({
        getUserResult: { data: { user: mockUser }, error: null },
        fromImpl: () => (callIndex++ === 0 ? { select: fetchChain.select } : { update })
      })

      const result = await addMediaToDraft(draftId, newMediaUrls, supabase)

      expect(result.media_urls).toEqual(['photo1.jpg', ...newMediaUrls])
    })
  })

  describe('deleteDraft', () => {
    const draftId = 'draft-123'

    it('should delete draft successfully', async () => {
      const { del } = createDeleteChain({ error: null })

      const supabase = createSupabaseOverride({
        getUserResult: { data: { user: mockUser }, error: null },
        fromImpl: () => ({ delete: del })
      })

      await expect(deleteDraft(draftId, supabase)).resolves.not.toThrow()
    })

    it('should handle deletion failure', async () => {
      const { del } = createDeleteChain({ error: { message: 'Delete failed' } })

      const supabase = createSupabaseOverride({
        getUserResult: { data: { user: mockUser }, error: null },
        fromImpl: () => ({ delete: del })
      })

      await expect(deleteDraft(draftId, supabase)).rejects.toThrow('Failed to delete draft: Delete failed')
    })
  })

  describe('markDraftAsReady', () => {
    const draftId = 'draft-123'

    it('should mark draft as ready successfully', async () => {
      const { update } = createUpdateChain({
        data: { id: draftId, distribution_status: 'ready' },
        error: null
      })

      const supabase = createSupabaseOverride({
        getUserResult: { data: { user: mockUser }, error: null },
        fromImpl: () => ({ update })
      })

      const result = await markDraftAsReady(draftId, supabase)

      expect(result.distribution_status).toBe('ready')
    })
  })

  describe('markReadyAsDraft', () => {
    const draftId = 'draft-123'

    it('should revert ready draft to draft status', async () => {
      const { update } = createUpdateChain({
        data: { id: draftId, distribution_status: 'draft' },
        error: null
      })

      const supabase = createSupabaseOverride({
        getUserResult: { data: { user: mockUser }, error: null },
        fromImpl: () => ({ update })
      })

      const result = await markReadyAsDraft(draftId, supabase)

      expect(result.distribution_status).toBe('draft')
    })
  })

  describe('getDraftById', () => {
    const draftId = 'draft-123'

    it('should fetch draft by ID successfully', async () => {
      const mockDraft = {
        id: draftId,
        parent_id: mockUser.id,
        child_id: mockChild.id,
        content: 'Test content',
        distribution_status: 'draft'
      }

      const chain = createByIdChain({ data: mockDraft, error: null })

      const supabase = createSupabaseOverride({
        getUserResult: { data: { user: mockUser }, error: null },
        fromImpl: () => ({ select: chain.select })
      })

      const result = await getDraftById(draftId, supabase)

      expect(result).toEqual(mockDraft)
    })

    it('should return null when draft not found', async () => {
      const chain = createByIdChain({
        data: null,
        error: { message: 'Not found', code: 'PGRST116' }
      })

      const supabase = createSupabaseOverride({
        getUserResult: { data: { user: mockUser }, error: null },
        fromImpl: () => ({ select: chain.select })
      })

      const result = await getDraftById(draftId, supabase)

      expect(result).toBeNull()
    })
  })

  describe('getDrafts', () => {
    const childId = mockChild.id

    it('should fetch drafts with filters successfully', async () => {
      const mockDrafts = [
        {
          id: 'draft-1',
          child_id: childId,
          content: 'Draft 1',
          created_at: '2025-01-01T10:00:00Z',
          distribution_status: 'draft'
        },
        {
          id: 'draft-2',
          child_id: childId,
          content: 'Draft 2',
          created_at: '2025-01-02T10:00:00Z',
          distribution_status: 'ready'
        }
      ]

      const { select, builder } = createListChain({ data: mockDrafts, error: null })

      const supabase = createSupabaseOverride({
        getUserResult: { data: { user: mockUser }, error: null },
        fromImpl: () => ({ select })
      })

      const result = await getDrafts({ child_id: childId }, supabase)

      expect(result).toHaveLength(2)
      expect(builder.order).toHaveBeenCalledWith('created_at', { ascending: false })
      expect(builder.eq).toHaveBeenCalledWith('child_id', childId)
      expect(builder.in).toHaveBeenCalledWith('distribution_status', ['draft', 'ready'])
    })
  })

  describe('getDraftWorkspaceSummary', () => {
    it('should fetch workspace summary successfully', async () => {
      const mockDrafts = [
        {
          id: 'draft-1',
          distribution_status: 'draft',
          child_id: 'child-1',
          created_at: '2025-01-01T10:00:00Z',
          children: {
            id: 'child-1',
            name: 'Emma',
            profile_photo_url: 'avatar.jpg'
          }
        },
        {
          id: 'draft-2',
          distribution_status: 'ready',
          child_id: 'child-1',
          created_at: '2025-01-02T10:00:00Z',
          children: {
            id: 'child-1',
            name: 'Emma',
            profile_photo_url: 'avatar.jpg'
          }
        }
      ]

      const { select, builder } = createListChain({ data: mockDrafts, error: null })

      const supabase = createSupabaseOverride({
        getUserResult: { data: { user: mockUser }, error: null },
        fromImpl: () => ({ select })
      })

      const result = await getDraftWorkspaceSummary(supabase)

      expect(result.total_drafts).toBe(2)
      expect(result.ready_count).toBe(1)
      expect(result.can_compile_digest).toBe(true)
      expect(builder.order).toHaveBeenCalledWith('created_at', { ascending: false })
    })

    it('should indicate no drafts ready when none marked', async () => {
      const { select } = createListChain({ data: [], error: null })

      const supabase = createSupabaseOverride({
        getUserResult: { data: { user: mockUser }, error: null },
        fromImpl: () => ({ select })
      })

      const result = await getDraftWorkspaceSummary(supabase)

      expect(result.total_drafts).toBe(0)
      expect(result.ready_count).toBe(0)
      expect(result.can_compile_digest).toBe(false)
    })
  })
})
