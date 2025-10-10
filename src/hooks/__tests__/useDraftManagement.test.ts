import { jest, describe, it, expect, beforeEach } from '@jest/globals'
import { renderHook, waitFor, act } from '@testing-library/react'
import { useDraftManagement } from '../useDraftManagement'
import type { DraftUpdate, DraftUpdateRequest, DraftWorkspaceSummary } from '@/lib/types/digest'

// Mock logger
const mockLogger = {
  info: jest.fn(),
  error: jest.fn()
}

jest.mock('@/lib/logger', () => ({
  createLogger: () => mockLogger
}))

// Mock draft service
const mockCreateDraft = jest.fn()
const mockUpdateDraft = jest.fn()
const mockAddMediaToDraft = jest.fn()
const mockMarkDraftAsReady = jest.fn()
const mockDeleteDraft = jest.fn()
const mockGetDrafts = jest.fn()
const mockGetDraftWorkspaceSummary = jest.fn()
const mockGetDraftById = jest.fn()

jest.mock('@/lib/services/draftService', () => ({
  createDraft: (...args: unknown[]) => mockCreateDraft(...args),
  updateDraft: (...args: unknown[]) => mockUpdateDraft(...args),
  addMediaToDraft: (...args: unknown[]) => mockAddMediaToDraft(...args),
  markDraftAsReady: (...args: unknown[]) => mockMarkDraftAsReady(...args),
  deleteDraft: (...args: unknown[]) => mockDeleteDraft(...args),
  getDrafts: (...args: unknown[]) => mockGetDrafts(...args),
  getDraftWorkspaceSummary: (...args: unknown[]) => mockGetDraftWorkspaceSummary(...args),
  getDraftById: (...args: unknown[]) => mockGetDraftById(...args),
  addTextToDraft: jest.fn(),
  markReadyAsDraft: jest.fn()
}))

describe('useDraftManagement', () => {
  const mockDraft: DraftUpdate = {
    id: 'draft-123',
    parent_id: 'user-123',
    child_id: 'child-123',
    content: 'Test draft',
    subject: 'Test Subject',
    media_urls: [],
    distribution_status: 'draft',
    created_at: new Date().toISOString(),
    version: 1,
    edit_count: 0,
    last_edited_at: new Date().toISOString()
  }

  const mockSummary: DraftWorkspaceSummary = {
    total_drafts: 2,
    ready_count: 1,
    can_compile_digest: true,
    by_child: []
  }

  beforeEach(() => {
    jest.clearAllMocks()
    mockGetDrafts.mockResolvedValue([])
    mockGetDraftWorkspaceSummary.mockResolvedValue(mockSummary)
  })

  describe('loadDrafts', () => {
    it('should load drafts successfully', async () => {
      const drafts = [mockDraft]
      mockGetDrafts.mockResolvedValue(drafts)

      const { result } = renderHook(() => useDraftManagement())

      await act(async () => {
        await result.current.loadDrafts()
      })

      await waitFor(() => {
        expect(result.current.drafts).toEqual(drafts)
        expect(result.current.loading).toBe(false)
      })
    })

    it('should handle load error', async () => {
      mockGetDrafts.mockRejectedValue(new Error('Load failed'))

      const { result } = renderHook(() => useDraftManagement())

      await act(async () => {
        await result.current.loadDrafts()
      })

      await waitFor(() => {
        expect(result.current.error).toBe('Load failed')
        expect(result.current.loading).toBe(false)
      })
    })
  })

  describe('create', () => {
    it('should create draft and refresh lists', async () => {
      const draftRequest: DraftUpdateRequest = {
        child_id: 'child-123',
        content: 'New draft'
      }

      mockCreateDraft.mockResolvedValue(mockDraft)
      mockGetDrafts.mockResolvedValue([mockDraft])

      const { result } = renderHook(() => useDraftManagement())

      let createdDraft: DraftUpdate | null = null
      await act(async () => {
        createdDraft = await result.current.create(draftRequest)
      })

      await waitFor(() => {
        expect(createdDraft).toEqual(mockDraft)
        expect(mockCreateDraft).toHaveBeenCalledWith(draftRequest)
        expect(result.current.drafts).toContain(mockDraft)
      })
    })
  })

  describe('update', () => {
    it('should update draft successfully', async () => {
      const updatedDraft = { ...mockDraft, content: 'Updated' }
      mockUpdateDraft.mockResolvedValue(updatedDraft)
      mockGetDrafts.mockResolvedValue([updatedDraft])

      const { result } = renderHook(() => useDraftManagement())

      await act(async () => {
        await result.current.update('draft-123', { content: 'Updated' })
      })

      await waitFor(() => {
        expect(mockUpdateDraft).toHaveBeenCalledWith('draft-123', { content: 'Updated' })
      })
    })
  })

  describe('delete', () => {
    it('should delete draft and refresh list', async () => {
      mockDeleteDraft.mockResolvedValue(undefined)
      mockGetDrafts.mockResolvedValue([])

      const { result } = renderHook(() => useDraftManagement())

      await act(async () => {
        await result.current.remove('draft-123')
      })

      await waitFor(() => {
        expect(mockDeleteDraft).toHaveBeenCalledWith('draft-123')
        expect(result.current.drafts).toEqual([])
      })
    })
  })

  describe('markReady', () => {
    it('should mark draft as ready', async () => {
      const readyDraft = { ...mockDraft, marked_ready_at: new Date().toISOString() }
      mockMarkDraftAsReady.mockResolvedValue(readyDraft)
      mockGetDrafts.mockResolvedValue([readyDraft])

      const { result } = renderHook(() => useDraftManagement())

      await act(async () => {
        await result.current.markReady('draft-123')
      })

      await waitFor(() => {
        expect(mockMarkDraftAsReady).toHaveBeenCalledWith('draft-123')
      })
    })
  })

  describe('loadSummary', () => {
    it('should load workspace summary', async () => {
      mockGetDraftWorkspaceSummary.mockResolvedValue(mockSummary)

      const { result } = renderHook(() => useDraftManagement())

      await act(async () => {
        await result.current.loadSummary()
      })

      await waitFor(() => {
        expect(result.current.summary).toEqual(mockSummary)
      })
    })
  })
})
