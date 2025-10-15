/* eslint-disable @typescript-eslint/no-explicit-any */
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

// Create mock factory functions that return fresh mocks for each chain
const createMockChain = () => ({
  select: jest.fn(),
  eq: jest.fn(),
  single: jest.fn(),
  update: jest.fn(),
  insert: jest.fn(),
  gte: jest.fn(),
  lte: jest.fn(),
  order: jest.fn(),
  limit: jest.fn(),
  maybeSingle: jest.fn(),
  returns: jest.fn()
})

const mocks = {
  ...mockClientData.mocks,
  ...createMockChain()
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
        recipients: []
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
      const mockSingle1 = (jest.fn() as any).mockResolvedValue({
        data: mockSummary,
        error: null
      })
      const mockEq2_1 = (jest.fn() as any).mockReturnValue({ single: mockSingle1 })
      const mockEq1_1 = (jest.fn() as any).mockReturnValue({ eq: mockEq2_1 })
      const mockSelect1 = (jest.fn() as any).mockReturnValue({ eq: mockEq1_1 })

      // Mock getSummaryPreview - second call for summary_memories fetch
      const mockOrder = (jest.fn() as any).mockResolvedValue({
        data: [],
        error: null
      })
      const mockEq2_2 = (jest.fn() as any).mockReturnValue({ order: mockOrder })
      const mockEq1_2 = (jest.fn() as any).mockReturnValue({ eq: mockEq2_2 })
      const mockSelect2 = (jest.fn() as any).mockReturnValue({ eq: mockEq1_2 })

      ;(mocks.from as any)
        .mockReturnValueOnce({ select: mockSelect1 })
        .mockReturnValueOnce({ select: mockSelect2 })

      const result = await compileSummary(mockRequest)

      expect(result.success).toBe(true)
      expect(result.summary).toEqual(mockSummary)
      expect(result.preview_data).toEqual(mockPreview)
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

      // Mock summary fetch (needs double .eq() for id and parent_id)
      const mockSingle = (jest.fn() as any).mockResolvedValue({
        data: mockSummary,
        error: null
      })
      const mockEq2 = (jest.fn() as any).mockReturnValue({ single: mockSingle })
      const mockEq1 = (jest.fn() as any).mockReturnValue({ eq: mockEq2 })
      const mockSelect = (jest.fn() as any).mockReturnValue({ eq: mockEq1 })

      // Mock summary_memories fetch (needs double .eq() and .order())
      const mockOrder = (jest.fn() as any).mockResolvedValue({
        data: mockMemories,
        error: null
      })
      const mockEq2_mem = (jest.fn() as any).mockReturnValue({ order: mockOrder })
      const mockEq1_mem = (jest.fn() as any).mockReturnValue({ eq: mockEq2_mem })
      const mockSelect_mem = (jest.fn() as any).mockReturnValue({ eq: mockEq1_mem })

      ;(mocks.from as any)
        .mockReturnValueOnce({ select: mockSelect })
        .mockReturnValueOnce({ select: mockSelect_mem })

      const result = await getSummaryPreview(mockSummaryId)

      expect(result).toBeDefined()
      expect(result.summary).toEqual(mockSummary)
      expect(mocks.from).toHaveBeenCalledWith('summaries')
      expect(mocks.from).toHaveBeenCalledWith('summary_memories')
    })

    it('should handle summary not found', async () => {
      const mockSingle = (jest.fn() as any).mockResolvedValue({
        data: null,
        error: { message: 'Not found', code: 'PGRST116' }
      })
      const mockEq2 = (jest.fn() as any).mockReturnValue({ single: mockSingle })
      const mockEq1 = (jest.fn() as any).mockReturnValue({ eq: mockEq2 })
      const mockSelect = (jest.fn() as any).mockReturnValue({ eq: mockEq1 })

      ;(mocks.from as any).mockReturnValue({ select: mockSelect })

      await expect(getSummaryPreview(mockSummaryId)).rejects.toThrow('Failed to fetch summary: Not found')
    })
  })

  describe('approveSummary', () => {
    const mockSummaryId = 'summary-123'

    it('should approve summary successfully', async () => {
      // Mock first from() call for summaries update
      const mockEq2_update = (jest.fn() as any).mockResolvedValue({
        data: null,
        error: null
      })
      const mockEq1_update = (jest.fn() as any).mockReturnValue({ eq: mockEq2_update })
      const mockUpdate = (jest.fn() as any).mockReturnValue({ eq: mockEq1_update })

      // Mock second from() call for summary_memories select
      const mockEq_select = (jest.fn() as any).mockResolvedValue({
        data: [],
        error: null
      })
      const mockSelect = (jest.fn() as any).mockReturnValue({ eq: mockEq_select })

      ;(mocks.from as any)
        .mockReturnValueOnce({ update: mockUpdate })
        .mockReturnValueOnce({ select: mockSelect })

      await approveSummary({
        summary_id: mockSummaryId,
        parent_narrative: { introduction: 'Great week!' }
      })

      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'approved'
        })
      )
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Summary approved successfully',
        expect.objectContaining({ summaryId: mockSummaryId })
      )
    })

    it('should handle approval failure', async () => {
      const mockEq2 = (jest.fn() as any).mockResolvedValue({
        data: null,
        error: { message: 'Update failed' }
      })
      const mockEq1 = (jest.fn() as any).mockReturnValue({ eq: mockEq2 })
      const mockUpdate = (jest.fn() as any).mockReturnValue({ eq: mockEq1 })

      ;(mocks.from as any).mockReturnValue({ update: mockUpdate })

      await expect(
        approveSummary({
          summary_id: mockSummaryId
        })
      ).rejects.toThrow('Failed to approve summary: Update failed')
    })
  })

  describe('getSummaryStats', () => {
    it('should fetch summary statistics successfully', async () => {

      const mockSummaries = [
        { total_updates: 3, total_recipients: 2 },
        { total_updates: 5, total_recipients: 3 }
      ]

      const mockLastSent = {
        sent_at: '2025-01-07T10:00:00Z'
      }

      // Mock first query: total summaries count
      const mockEq1 = (jest.fn() as any).mockResolvedValue({ count: 10, error: null })
      const mockSelect1 = (jest.fn() as any).mockReturnValue({ eq: mockEq1 })

      // Mock second query: sent this month count (with .eq() twice and .gte())
      const mockGte = (jest.fn() as any).mockResolvedValue({ count: 5, error: null })
      const mockEq2_2 = (jest.fn() as any).mockReturnValue({ gte: mockGte })
      const mockEq2_1 = (jest.fn() as any).mockReturnValue({ eq: mockEq2_2 })
      const mockSelect2 = (jest.fn() as any).mockReturnValue({ eq: mockEq2_1 })

      // Mock third query: pending review count (with .eq() twice)
      const mockEq3_2 = (jest.fn() as any).mockResolvedValue({ count: 2, error: null })
      const mockEq3_1 = (jest.fn() as any).mockReturnValue({ eq: mockEq3_2 })
      const mockSelect3 = (jest.fn() as any).mockReturnValue({ eq: mockEq3_1 })

      // Mock fourth query: summaries for averages
      const mockReturns = (jest.fn() as any).mockResolvedValue({
        data: mockSummaries,
        error: null
      })
      const mockEq4 = (jest.fn() as any).mockReturnValue({ returns: mockReturns })
      const mockSelect4 = (jest.fn() as any).mockReturnValue({ eq: mockEq4 })

      // Mock fifth query: last sent (with .eq() twice, .order(), .limit(), .maybeSingle())
      const mockMaybeSingle = (jest.fn() as any).mockResolvedValue({
        data: mockLastSent,
        error: null
      })
      const mockLimit = (jest.fn() as any).mockReturnValue({ maybeSingle: mockMaybeSingle })
      const mockOrder = (jest.fn() as any).mockReturnValue({ limit: mockLimit })
      const mockEq5_2 = (jest.fn() as any).mockReturnValue({ order: mockOrder })
      const mockEq5_1 = (jest.fn() as any).mockReturnValue({ eq: mockEq5_2 })
      const mockSelect5 = (jest.fn() as any).mockReturnValue({ eq: mockEq5_1 })

      ;(mocks.from as any)
        .mockReturnValueOnce({ select: mockSelect1 })
        .mockReturnValueOnce({ select: mockSelect2 })
        .mockReturnValueOnce({ select: mockSelect3 })
        .mockReturnValueOnce({ select: mockSelect4 })
        .mockReturnValueOnce({ select: mockSelect5 })

      const result = await getSummaryStats()

      expect(result).toBeDefined()
      expect(result.total_summaries).toBe(10)
      expect(result.sent_this_month).toBe(5)
      expect(result.pending_review).toBe(2)
    })

    it('should handle database error gracefully', async () => {
      // Mock first query: total summaries count (returns null)
      const mockEq1 = (jest.fn() as any).mockResolvedValue({ count: null, error: null })
      const mockSelect1 = (jest.fn() as any).mockReturnValue({ eq: mockEq1 })

      // Mock second query: sent this month count
      const mockGte2 = (jest.fn() as any).mockResolvedValue({ count: null, error: null })
      const mockEq2_2 = (jest.fn() as any).mockReturnValue({ gte: mockGte2 })
      const mockEq2_1 = (jest.fn() as any).mockReturnValue({ eq: mockEq2_2 })
      const mockSelect2 = (jest.fn() as any).mockReturnValue({ eq: mockEq2_1 })

      // Mock third query: pending review count
      const mockEq3_2 = (jest.fn() as any).mockResolvedValue({ count: null, error: null })
      const mockEq3_1 = (jest.fn() as any).mockReturnValue({ eq: mockEq3_2 })
      const mockSelect3 = (jest.fn() as any).mockReturnValue({ eq: mockEq3_1 })

      // Mock fourth query: summaries for averages
      const mockReturns = (jest.fn() as any).mockResolvedValue({ data: [], error: null })
      const mockEq4 = (jest.fn() as any).mockReturnValue({ returns: mockReturns })
      const mockSelect4 = (jest.fn() as any).mockReturnValue({ eq: mockEq4 })

      // Mock fifth query: last sent
      const mockMaybeSingle = (jest.fn() as any).mockResolvedValue({ data: null, error: null })
      const mockLimit = (jest.fn() as any).mockReturnValue({ maybeSingle: mockMaybeSingle })
      const mockOrder = (jest.fn() as any).mockReturnValue({ limit: mockLimit })
      const mockEq5_2 = (jest.fn() as any).mockReturnValue({ order: mockOrder })
      const mockEq5_1 = (jest.fn() as any).mockReturnValue({ eq: mockEq5_2 })
      const mockSelect5 = (jest.fn() as any).mockReturnValue({ eq: mockEq5_1 })

      ;(mocks.from as any)
        .mockReturnValueOnce({ select: mockSelect1 })
        .mockReturnValueOnce({ select: mockSelect2 })
        .mockReturnValueOnce({ select: mockSelect3 })
        .mockReturnValueOnce({ select: mockSelect4 })
        .mockReturnValueOnce({ select: mockSelect5 })

      const result = await getSummaryStats()

      // Should return zeros when counts are null
      expect(result.total_summaries).toBe(0)
      expect(result.sent_this_month).toBe(0)
      expect(result.pending_review).toBe(0)
    })
  })
})
