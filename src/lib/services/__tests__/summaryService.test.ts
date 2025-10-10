import { jest, describe, it, expect, beforeEach } from '@jest/globals'
import { compileSummary, getSummaryPreview, approveSummary, getSummaryStats } from '../summaryService'
import type { CompileSummaryRequest, SummaryPreviewData } from '@/lib/types/summary'

// Mock logger
const mockLogger = {
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  errorWithStack: jest.fn()
}

jest.mock('@/lib/logger', () => ({
  createLogger: () => mockLogger
}))

// Mock Supabase client
const mockGetUser = jest.fn()
const mockFunctionsInvoke = jest.fn()
const mockFrom = jest.fn()
const mockSelect = jest.fn()
const mockEq = jest.fn()
const mockSingle = jest.fn()
const mockUpdate = jest.fn()
const mockInsert = jest.fn()
const mockGte = jest.fn()
const mockLte = jest.fn()

jest.mock('@/lib/supabase/client', () => ({
  createClient: jest.fn(() => ({
    auth: {
      getUser: mockGetUser
    },
    functions: {
      invoke: mockFunctionsInvoke
    },
    from: mockFrom
  }))
}))

describe('summaryService', () => {
  const mockUser = {
    id: 'user-123',
    email: 'parent@example.com'
  }

  beforeEach(() => {
    jest.clearAllMocks()
    mockGetUser.mockResolvedValue({ data: { user: mockUser }, error: null })
  })

  describe('compileSummary', () => {
    const mockRequest: Omit<CompileSummaryRequest, 'parent_id'> = {
      title: 'Weekly Update',
      date_range_start: '2025-01-01',
      date_range_end: '2025-01-07',
      memory_ids: ['mem-1', 'mem-2', 'mem-3'],
      recipient_ids: ['rec-1', 'rec-2']
    }

    it('should compile summary successfully', async () => {
      const mockSummary = {
        id: 'summary-123',
        parent_id: mockUser.id,
        title: 'Weekly Update',
        status: 'ready'
      }

      const mockPreview: SummaryPreviewData = {
        summary: mockSummary,
        recipient_previews: [],
        total_memories: 3,
        total_recipients: 2
      }

      mockFunctionsInvoke.mockResolvedValue({
        data: {
          success: true,
          summary_id: 'summary-123',
          summary: mockSummary
        },
        error: null
      })

      // Mock getSummaryPreview
      mockFrom.mockReturnValue({
        select: mockSelect.mockReturnValue({
          eq: mockEq.mockReturnValue({
            single: mockSingle.mockResolvedValue({
              data: mockSummary,
              error: null
            })
          })
        })
      })

      const result = await compileSummary(mockRequest)

      expect(result.success).toBe(true)
      expect(result.summary).toEqual(mockSummary)
      expect(mockFunctionsInvoke).toHaveBeenCalledWith('compile-summary', {
        body: {
          ...mockRequest,
          parent_id: mockUser.id
        }
      })
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Starting summary compilation',
        expect.objectContaining({ userId: mockUser.id })
      )
    })

    it('should handle compilation failure', async () => {
      mockFunctionsInvoke.mockResolvedValue({
        data: null,
        error: { message: 'Compilation failed' }
      })

      const result = await compileSummary(mockRequest)

      expect(result.success).toBe(false)
      expect(result.error).toBe('Failed to compile summary: Compilation failed')
      expect(mockLogger.error).toHaveBeenCalled()
    })

    it('should handle unauthenticated user', async () => {
      mockGetUser.mockResolvedValue({ data: { user: null }, error: null })

      await expect(compileSummary(mockRequest)).rejects.toThrow('Not authenticated')
    })

    it('should handle function returning success: false', async () => {
      mockFunctionsInvoke.mockResolvedValue({
        data: {
          success: false,
          error: 'No memories to compile'
        },
        error: null
      })

      const result = await compileSummary(mockRequest)

      expect(result.success).toBe(false)
      expect(result.error).toBe('No memories to compile')
    })
  })

  describe('getSummaryPreview', () => {
    const mockSummaryId = 'summary-123'

    it('should fetch summary preview successfully', async () => {
      const mockSummary = {
        id: mockSummaryId,
        parent_id: mockUser.id,
        title: 'Weekly Update',
        status: 'ready',
        total_recipients: 2
      }

      const mockMemories = [
        {
          recipients: { id: 'rec-1', name: 'Grandma', email: 'grandma@example.com' },
          narrative_data: null,
          render_style: 'narrative',
          display_order: 1,
          memories: {
            id: 'mem-1',
            content: 'First smile!',
            media_urls: ['photo1.jpg'],
            children: { name: 'Emma', birth_date: '2024-01-01' }
          }
        }
      ]

      // Mock summary fetch
      mockFrom.mockReturnValueOnce({
        select: mockSelect.mockReturnValue({
          eq: mockEq.mockReturnValue({
            single: mockSingle.mockResolvedValue({
              data: mockSummary,
              error: null
            })
          })
        })
      })

      // Mock summary_memories fetch
      mockFrom.mockReturnValueOnce({
        select: mockSelect.mockReturnValue({
          eq: mockEq.mockResolvedValue({
            data: mockMemories,
            error: null
          })
        })
      })

      const result = await getSummaryPreview(mockSummaryId)

      expect(result).toBeDefined()
      expect(result.summary).toEqual(mockSummary)
      expect(mockFrom).toHaveBeenCalledWith('summaries')
      expect(mockFrom).toHaveBeenCalledWith('summary_memories')
    })

    it('should handle summary not found', async () => {
      mockFrom.mockReturnValue({
        select: mockSelect.mockReturnValue({
          eq: mockEq.mockReturnValue({
            single: mockSingle.mockResolvedValue({
              data: null,
              error: { message: 'Not found', code: 'PGRST116' }
            })
          })
        })
      })

      await expect(getSummaryPreview(mockSummaryId)).rejects.toThrow('Not found')
    })
  })

  describe('approveSummary', () => {
    const mockSummaryId = 'summary-123'

    it('should approve summary successfully', async () => {
      const approvedSummary = {
        id: mockSummaryId,
        status: 'approved',
        approved_at: new Date().toISOString()
      }

      mockFrom.mockReturnValue({
        update: mockUpdate.mockReturnValue({
          eq: mockEq.mockReturnValue({
            eq: mockEq.mockReturnValue({
              select: mockSelect.mockReturnValue({
                single: mockSingle.mockResolvedValue({
                  data: approvedSummary,
                  error: null
                })
              })
            })
          })
        })
      })

      const result = await approveSummary({
        summary_id: mockSummaryId,
        parent_narrative: { introduction: 'Great week!' }
      })

      expect(result.status).toBe('approved')
      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'approved'
        })
      )
    })

    it('should handle approval failure', async () => {
      mockFrom.mockReturnValue({
        update: mockUpdate.mockReturnValue({
          eq: mockEq.mockReturnValue({
            eq: mockEq.mockReturnValue({
              select: mockSelect.mockReturnValue({
                single: mockSingle.mockResolvedValue({
                  data: null,
                  error: { message: 'Update failed' }
                })
              })
            })
          })
        })
      })

      await expect(
        approveSummary({
          summary_id: mockSummaryId
        })
      ).rejects.toThrow('Update failed')
    })
  })

  describe('getSummaryStats', () => {
    it('should fetch summary statistics successfully', async () => {
      const mockStats = [
        { status: 'sent', count: 5 },
        { status: 'pending_review', count: 2 },
        { status: 'draft', count: 1 }
      ]

      const mockLastSent = {
        sent_at: '2025-01-07T10:00:00Z'
      }

      // Mock stats query
      mockFrom.mockReturnValueOnce({
        select: mockSelect.mockReturnValue({
          eq: mockEq.mockReturnValue({
            gte: mockGte.mockReturnValue({
              lte: mockLte.mockResolvedValue({
                data: mockStats,
                error: null
              })
            })
          })
        })
      })

      // Mock last sent query
      mockFrom.mockReturnValueOnce({
        select: mockSelect.mockReturnValue({
          eq: mockEq.mockReturnValue({
            eq: mockEq.mockReturnValue({
              order: jest.fn().mockReturnValue({
                limit: jest.fn().mockResolvedValue({
                  data: [mockLastSent],
                  error: null
                })
              })
            })
          })
        })
      })

      const result = await getSummaryStats()

      expect(result).toBeDefined()
      expect(result.total_digests).toBeGreaterThanOrEqual(0)
      expect(result.sent_this_month).toBeGreaterThanOrEqual(0)
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Fetching summary stats',
        expect.any(Object)
      )
    })

    it('should handle database error gracefully', async () => {
      mockFrom.mockReturnValue({
        select: mockSelect.mockReturnValue({
          eq: mockEq.mockReturnValue({
            gte: mockGte.mockReturnValue({
              lte: mockLte.mockResolvedValue({
                data: null,
                error: { message: 'Database error' }
              })
            })
          })
        })
      })

      await expect(getSummaryStats()).rejects.toThrow()
      expect(mockLogger.error).toHaveBeenCalled()
    })
  })
})
