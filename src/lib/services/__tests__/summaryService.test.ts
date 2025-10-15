import { jest, describe, it, expect, beforeEach } from '@jest/globals'

// Mock logger BEFORE imports
const mockLogger = {
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  errorWithStack: jest.fn()
}

jest.mock('@/lib/logger', () => ({
  createLogger: () => mockLogger
}))

// Create the mock client with mocks defined in the factory BEFORE imports
const createMockClient = () => {
  const mockGetUser = jest.fn()
  const mockFunctionsInvoke = jest.fn()
  const mockFrom = jest.fn()

  return {
    client: {
      auth: { getUser: mockGetUser },
      functions: { invoke: mockFunctionsInvoke },
      from: mockFrom
    },
    mocks: {
      getUser: mockGetUser,
      functionsInvoke: mockFunctionsInvoke,
      from: mockFrom
    }
  }
}

const mockClientData = createMockClient()

jest.mock('@/lib/supabase/client', () => ({
  createClient: jest.fn(() => mockClientData.client)
}))

// Import types only (types don't execute code)
import type { CompileSummaryRequest, SummaryPreviewData } from '@/lib/types/summary'

const mocks = {
  ...mockClientData.mocks,
  select: jest.fn(),
  eq: jest.fn(),
  single: jest.fn(),
  update: jest.fn(),
  insert: jest.fn(),
  gte: jest.fn(),
  lte: jest.fn()
}

// Load the service functions AFTER mocks are set up using require
const { compileSummary, getSummaryPreview, approveSummary, getSummaryStats } = require('../summaryService')

describe('summaryService', () => {
  const mockUser = {
    id: 'user-123',
    email: 'parent@example.com'
  }

  beforeEach(() => {
    jest.clearAllMocks()
    ;(mocks.getUser as any).mockResolvedValue({ data: { user: mockUser }, error: null })
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

      ;(mocks.functionsInvoke as any).mockResolvedValue({
        data: {
          success: true,
          summary_id: 'summary-123',
          summary: mockSummary
        },
        error: null
      })

      // Mock getSummaryPreview - first call for summary fetch
      ;(mocks.from as any).mockReturnValueOnce({
        select: (mocks.select as any).mockReturnValue({
          eq: (mocks.eq as any).mockReturnValue({
            single: (mocks.single as any).mockResolvedValue({
              data: mockSummary,
              error: null
            })
          })
        })
      })

      // Mock getSummaryPreview - second call for summary_memories fetch
      ;(mocks.from as any).mockReturnValueOnce({
        select: (mocks.select as any).mockReturnValue({
          eq: (mocks.eq as any).mockResolvedValue({
            data: [],
            error: null
          })
        })
      })

      const result = await compileSummary(mockRequest)

      expect(result.success).toBe(true)
      expect(result.summary).toEqual(mockSummary)
      expect(mocks.functionsInvoke).toHaveBeenCalledWith('compile-summary', {
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
      // Ensure auth is mocked

      ;(mocks.functionsInvoke as any).mockResolvedValue({
        data: null,
        error: { message: 'Compilation failed' }
      })

      const result = await compileSummary(mockRequest)

      expect(result.success).toBe(false)
      expect(result.error).toBe('Failed to compile summary: Compilation failed')
      expect(mockLogger.error).toHaveBeenCalled()
    })

    it('should handle unauthenticated user', async () => {
      ;(mocks.getUser as any).mockResolvedValue({ data: { user: null }, error: null })

      await expect(compileSummary(mockRequest)).rejects.toThrow('Not authenticated')
    })

    it('should handle function returning success: false', async () => {
      ;(mocks.getUser as any).mockResolvedValue({ data: { user: mockUser }, error: null })

      ;(mocks.functionsInvoke as any).mockResolvedValue({
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
      ;(mocks.from as any).mockReturnValueOnce({
        select: (mocks.select as any).mockReturnValue({
          eq: (mocks.eq as any).mockReturnValue({
            single: (mocks.single as any).mockResolvedValue({
              data: mockSummary,
              error: null
            })
          })
        })
      })

      // Mock summary_memories fetch
      ;(mocks.from as any).mockReturnValueOnce({
        select: (mocks.select as any).mockReturnValue({
          eq: (mocks.eq as any).mockResolvedValue({
            data: mockMemories,
            error: null
          })
        })
      })

      const result = await getSummaryPreview(mockSummaryId)

      expect(result).toBeDefined()
      expect(result.summary).toEqual(mockSummary)
      expect(mocks.from).toHaveBeenCalledWith('summaries')
      expect(mocks.from).toHaveBeenCalledWith('summary_memories')
    })

    it('should handle summary not found', async () => {

      ;(mocks.from as any).mockReturnValue({
        select: (mocks.select as any).mockReturnValue({
          eq: (mocks.eq as any).mockReturnValue({
            single: (mocks.single as any).mockResolvedValue({
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

      ;(mocks.from as any).mockReturnValue({
        update: (mocks.update as any).mockReturnValue({
          eq: (mocks.eq as any).mockReturnValue({
            eq: (mocks.eq as any).mockReturnValue({
              select: (mocks.select as any).mockReturnValue({
                single: (mocks.single as any).mockResolvedValue({
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
      expect(mocks.update).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'approved'
        })
      )
    })

    it('should handle approval failure', async () => {

      ;(mocks.from as any).mockReturnValue({
        update: (mocks.update as any).mockReturnValue({
          eq: (mocks.eq as any).mockReturnValue({
            eq: (mocks.eq as any).mockReturnValue({
              select: (mocks.select as any).mockReturnValue({
                single: (mocks.single as any).mockResolvedValue({
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
      ;(mocks.from as any).mockReturnValueOnce({
        select: (mocks.select as any).mockReturnValue({
          eq: (mocks.eq as any).mockReturnValue({
            gte: (mocks.gte as any).mockReturnValue({
              lte: (mocks.lte as any).mockResolvedValue({
                data: mockStats,
                error: null
              })
            })
          })
        })
      })

      // Mock last sent query
      ;(mocks.from as any).mockReturnValueOnce({
        select: (mocks.select as any).mockReturnValue({
          eq: (mocks.eq as any).mockReturnValue({
            eq: (mocks.eq as any).mockReturnValue({
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

      ;(mocks.from as any).mockReturnValue({
        select: (mocks.select as any).mockReturnValue({
          eq: (mocks.eq as any).mockReturnValue({
            gte: (mocks.gte as any).mockReturnValue({
              lte: (mocks.lte as any).mockResolvedValue({
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
