import { jest, describe, it, expect, beforeEach } from '@jest/globals'
import {
  createDraft,
  updateDraft,
  addMediaToDraft,
  deleteDraft,
  markDraftReady,
  getDraftById,
  getDraftsByChild,
  getWorkspaceSummary
} from '../draftService'
import type { DraftUpdateRequest } from '@/lib/types/digest'

// Mock logger
const mockLogger = {
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn()
}

jest.mock('@/lib/logger', () => ({
  createLogger: () => mockLogger
}))

// Mock Supabase client
const mockGetUser = jest.fn()
const mockFrom = jest.fn()
const mockSelect = jest.fn()
const mockInsert = jest.fn()
const mockUpdate = jest.fn()
const mockDelete = jest.fn()
const mockEq = jest.fn()
const mockSingle = jest.fn()
const mockOrder = jest.fn()
const mockIn = jest.fn()

jest.mock('@/lib/supabase/client', () => ({
  createClient: jest.fn(() => ({
    auth: {
      getUser: mockGetUser
    },
    from: mockFrom
  }))
}))

describe('draftService', () => {
  const mockUser = {
    id: 'user-123',
    email: 'parent@example.com'
  }

  const mockChild = {
    id: 'child-123',
    name: 'Emma',
    birth_date: '2024-01-01'
  }

  beforeEach(() => {
    jest.clearAllMocks()
    mockGetUser.mockResolvedValue({ data: { user: mockUser }, error: null })
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
        distribution_status: 'draft',
        version: 1,
        edit_count: 0,
        created_at: new Date().toISOString()
      }

      mockFrom.mockReturnValue({
        insert: mockInsert.mockReturnValue({
          select: mockSelect.mockReturnValue({
            single: mockSingle.mockResolvedValue({
              data: mockDraft,
              error: null
            })
          })
        })
      })

      const result = await createDraft(mockDraftRequest)

      expect(result).toEqual(mockDraft)
      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          parent_id: mockUser.id,
          child_id: mockDraftRequest.child_id,
          content: mockDraftRequest.content,
          distribution_status: 'draft'
        })
      )
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Creating new draft',
        expect.objectContaining({ childId: mockChild.id })
      )
    })

    it('should handle creation failure', async () => {
      mockFrom.mockReturnValue({
        insert: mockInsert.mockReturnValue({
          select: mockSelect.mockReturnValue({
            single: mockSingle.mockResolvedValue({
              data: null,
              error: { message: 'Insert failed' }
            })
          })
        })
      })

      await expect(createDraft(mockDraftRequest)).rejects.toThrow(
        'Failed to create draft: Insert failed'
      )
      expect(mockLogger.error).toHaveBeenCalled()
    })

    it('should handle unauthenticated user', async () => {
      mockGetUser.mockResolvedValue({ data: { user: null }, error: null })

      await expect(createDraft(mockDraftRequest)).rejects.toThrow('Not authenticated')
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

      mockFrom.mockReturnValue({
        insert: mockInsert.mockReturnValue({
          select: mockSelect.mockReturnValue({
            single: mockSingle.mockResolvedValue({
              data: mockDraft,
              error: null
            })
          })
        })
      })

      const result = await createDraft(minimalRequest)

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

      mockFrom.mockReturnValue({
        update: mockUpdate.mockReturnValue({
          eq: mockEq.mockReturnValue({
            eq: mockEq.mockReturnValue({
              eq: mockEq.mockReturnValue({
                select: mockSelect.mockReturnValue({
                  single: mockSingle.mockResolvedValue({
                    data: mockUpdatedDraft,
                    error: null
                  })
                })
              })
            })
          })
        })
      })

      const result = await updateDraft(draftId, updateData)

      expect(result.content).toBe('Updated content')
      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          content: 'Updated content',
          subject: 'Updated Subject'
        })
      )
    })

    it('should only update status on drafts', async () => {
      mockFrom.mockReturnValue({
        update: mockUpdate.mockReturnValue({
          eq: mockEq.mockReturnValue({
            eq: mockEq.mockReturnValue({
              eq: mockEq.mockReturnValue({
                select: mockSelect.mockReturnValue({
                  single: mockSingle.mockResolvedValue({
                    data: null,
                    error: { message: 'Not a draft' }
                  })
                })
              })
            })
          })
        })
      })

      await expect(updateDraft(draftId, { content: 'Test' })).rejects.toThrow(
        'Failed to update draft'
      )
    })
  })

  describe('addMediaToDraft', () => {
    const draftId = 'draft-123'
    const newMediaUrls = ['photo2.jpg', 'photo3.jpg']

    it('should add media to draft successfully', async () => {
      const existingDraft = {
        id: draftId,
        media_urls: ['photo1.jpg']
      }

      const updatedDraft = {
        ...existingDraft,
        media_urls: ['photo1.jpg', 'photo2.jpg', 'photo3.jpg']
      }

      // Mock fetch current draft
      mockFrom.mockReturnValueOnce({
        select: mockSelect.mockReturnValue({
          eq: mockEq.mockReturnValue({
            eq: mockEq.mockReturnValue({
              eq: mockEq.mockReturnValue({
                single: mockSingle.mockResolvedValue({
                  data: existingDraft,
                  error: null
                })
              })
            })
          })
        })
      })

      // Mock update draft
      mockFrom.mockReturnValueOnce({
        update: mockUpdate.mockReturnValue({
          eq: mockEq.mockReturnValue({
            eq: mockEq.mockReturnValue({
              eq: mockEq.mockReturnValue({
                select: mockSelect.mockReturnValue({
                  single: mockSingle.mockResolvedValue({
                    data: updatedDraft,
                    error: null
                  })
                })
              })
            })
          })
        })
      })

      const result = await addMediaToDraft(draftId, newMediaUrls)

      expect(result.media_urls).toHaveLength(3)
      expect(result.media_urls).toContain('photo2.jpg')
      expect(result.media_urls).toContain('photo3.jpg')
    })
  })

  describe('deleteDraft', () => {
    const draftId = 'draft-123'

    it('should delete draft successfully', async () => {
      mockFrom.mockReturnValue({
        delete: mockDelete.mockReturnValue({
          eq: mockEq.mockReturnValue({
            eq: mockEq.mockReturnValue({
              eq: mockEq.mockResolvedValue({
                error: null
              })
            })
          })
        })
      })

      await expect(deleteDraft(draftId)).resolves.not.toThrow()
      expect(mockDelete).toHaveBeenCalled()
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Draft deleted successfully',
        expect.objectContaining({ draftId })
      )
    })

    it('should handle deletion failure', async () => {
      mockFrom.mockReturnValue({
        delete: mockDelete.mockReturnValue({
          eq: mockEq.mockReturnValue({
            eq: mockEq.mockReturnValue({
              eq: mockEq.mockResolvedValue({
                error: { message: 'Delete failed' }
              })
            })
          })
        })
      })

      await expect(deleteDraft(draftId)).rejects.toThrow('Failed to delete draft')
    })
  })

  describe('markDraftReady', () => {
    const draftId = 'draft-123'

    it('should mark draft as ready successfully', async () => {
      const readyDraft = {
        id: draftId,
        distribution_status: 'draft',
        marked_ready_at: new Date().toISOString()
      }

      mockFrom.mockReturnValue({
        update: mockUpdate.mockReturnValue({
          eq: mockEq.mockReturnValue({
            eq: mockEq.mockReturnValue({
              eq: mockEq.mockReturnValue({
                select: mockSelect.mockReturnValue({
                  single: mockSingle.mockResolvedValue({
                    data: readyDraft,
                    error: null
                  })
                })
              })
            })
          })
        })
      })

      const result = await markDraftReady(draftId)

      expect(result.marked_ready_at).toBeDefined()
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Draft marked as ready',
        expect.objectContaining({ draftId })
      )
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

      mockFrom.mockReturnValue({
        select: mockSelect.mockReturnValue({
          eq: mockEq.mockReturnValue({
            eq: mockEq.mockReturnValue({
              single: mockSingle.mockResolvedValue({
                data: mockDraft,
                error: null
              })
            })
          })
        })
      })

      const result = await getDraftById(draftId)

      expect(result).toEqual(mockDraft)
      expect(mockFrom).toHaveBeenCalledWith('memories')
    })

    it('should handle draft not found', async () => {
      mockFrom.mockReturnValue({
        select: mockSelect.mockReturnValue({
          eq: mockEq.mockReturnValue({
            eq: mockEq.mockReturnValue({
              single: mockSingle.mockResolvedValue({
                data: null,
                error: { message: 'Not found', code: 'PGRST116' }
              })
            })
          })
        })
      })

      await expect(getDraftById(draftId)).rejects.toThrow()
    })
  })

  describe('getDraftsByChild', () => {
    const childId = mockChild.id

    it('should fetch drafts for a child successfully', async () => {
      const mockDrafts = [
        {
          id: 'draft-1',
          child_id: childId,
          content: 'Draft 1',
          created_at: '2025-01-01T10:00:00Z'
        },
        {
          id: 'draft-2',
          child_id: childId,
          content: 'Draft 2',
          created_at: '2025-01-02T10:00:00Z'
        }
      ]

      mockFrom.mockReturnValue({
        select: mockSelect.mockReturnValue({
          eq: mockEq.mockReturnValue({
            eq: mockEq.mockReturnValue({
              eq: mockEq.mockReturnValue({
                order: mockOrder.mockResolvedValue({
                  data: mockDrafts,
                  error: null
                })
              })
            })
          })
        })
      })

      const result = await getDraftsByChild(childId)

      expect(result).toHaveLength(2)
      expect(result[0].child_id).toBe(childId)
      expect(mockOrder).toHaveBeenCalledWith('created_at', { ascending: false })
    })
  })

  describe('getWorkspaceSummary', () => {
    it('should fetch workspace summary successfully', async () => {
      const mockDrafts = [
        {
          id: 'draft-1',
          distribution_status: 'draft',
          marked_ready_at: null,
          child_id: 'child-1'
        },
        {
          id: 'draft-2',
          distribution_status: 'draft',
          marked_ready_at: new Date().toISOString(),
          child_id: 'child-1'
        }
      ]

      mockFrom.mockReturnValue({
        select: mockSelect.mockReturnValue({
          eq: mockEq.mockReturnValue({
            eq: mockEq.mockResolvedValue({
              data: mockDrafts,
              error: null
            })
          })
        })
      })

      const result = await getWorkspaceSummary()

      expect(result).toBeDefined()
      expect(result.total_drafts).toBe(2)
      expect(result.ready_count).toBe(1)
      expect(result.can_compile_digest).toBe(true)
    })

    it('should indicate no drafts ready when none marked', async () => {
      mockFrom.mockReturnValue({
        select: mockSelect.mockReturnValue({
          eq: mockEq.mockReturnValue({
            eq: mockEq.mockResolvedValue({
              data: [],
              error: null
            })
          })
        })
      })

      const result = await getWorkspaceSummary()

      expect(result.total_drafts).toBe(0)
      expect(result.ready_count).toBe(0)
      expect(result.can_compile_digest).toBe(false)
    })
  })
})
