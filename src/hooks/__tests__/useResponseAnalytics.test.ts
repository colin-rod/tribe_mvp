import { renderHook, waitFor } from '@testing-library/react'
import { useResponseAnalytics } from '../useResponseAnalytics'

// Mock logger
const mockLoggerError = jest.fn()
jest.mock('@/lib/logger', () => ({
  createLogger: () => ({
    error: mockLoggerError,
    info: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  }),
}))

// Mock Supabase client
const mockSelect = jest.fn()
const mockEq = jest.fn()
const mockGte = jest.fn()
const mockGetUser = jest.fn()

jest.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    auth: {
      getUser: mockGetUser,
    },
    from: () => ({
      select: mockSelect,
    }),
  }),
}))

const mockResponsesData = [
  {
    id: 'response-1',
    update_id: 'update-1',
    recipient_id: 'recipient-1',
    channel: 'email',
    content: 'Great photo!',
    received_at: '2024-01-20T14:30:00Z',
    recipients: { name: 'Grandma', relationship: 'grandmother' },
    updates: { parent_id: 'user-123', created_at: '2024-01-20T10:00:00Z' },
  },
  {
    id: 'response-2',
    update_id: 'update-1',
    recipient_id: 'recipient-2',
    channel: 'whatsapp',
    content: 'So cute!',
    received_at: '2024-01-20T15:45:00Z',
    recipients: { name: 'Uncle Bob', relationship: 'uncle' },
    updates: { parent_id: 'user-123', created_at: '2024-01-20T10:00:00Z' },
  },
  {
    id: 'response-3',
    update_id: 'update-2',
    recipient_id: 'recipient-1',
    channel: 'email',
    content: 'Love it!',
    received_at: '2024-01-21T09:15:00Z',
    recipients: { name: 'Grandma', relationship: 'grandmother' },
    updates: { parent_id: 'user-123', created_at: '2024-01-21T08:00:00Z' },
  },
]

const mockUpdatesData = [
  { id: 'update-1', created_at: '2024-01-20T10:00:00Z' },
  { id: 'update-2', created_at: '2024-01-21T08:00:00Z' },
]

describe('useResponseAnalytics', () => {
  beforeEach(() => {
    jest.clearAllMocks()

    mockGetUser.mockResolvedValue({
      data: { user: { id: 'user-123' } },
    })

    // Setup chained query methods
    mockSelect.mockReturnValue({
      eq: mockEq,
    })

    mockEq.mockReturnValue({
      gte: mockGte,
    })

    // Default setup - will be overridden in individual tests
    mockGte.mockResolvedValue({
      data: mockResponsesData,
      error: null,
    })
  })

  it('fetches and calculates analytics correctly', async () => {
    // Set up specific mock for this test
    mockGte
      .mockResolvedValueOnce({
        data: mockResponsesData,
        error: null,
      })
      .mockResolvedValueOnce({
        data: mockUpdatesData,
        error: null,
      })

    const { result } = renderHook(() => useResponseAnalytics('30d'))

    expect(result.current.loading).toBe(true)

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.analytics).toBeDefined()
    expect(result.current.error).toBeNull()

    const analytics = result.current.analytics!
    expect(analytics.totalResponses).toBe(3)
    expect(analytics.responseRate).toBe(150) // 3 responses / 2 updates * 100
    expect(analytics.averageResponseTime).toBe(2.5)
  })

  it('calculates top responders correctly', async () => {
    mockGte
      .mockResolvedValueOnce({
        data: mockResponsesData,
        error: null,
      })
      .mockResolvedValueOnce({
        data: mockUpdatesData,
        error: null,
      })

    const { result } = renderHook(() => useResponseAnalytics('30d'))

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    const topResponders = result.current.analytics!.topResponders
    expect(topResponders).toHaveLength(2)

    // Grandma should be first with 2 responses
    expect(topResponders[0]).toEqual({
      recipient: 'Grandma',
      relationship: 'grandmother',
      count: 2,
    })

    // Uncle Bob should be second with 1 response
    expect(topResponders[1]).toEqual({
      recipient: 'Uncle Bob',
      relationship: 'uncle',
      count: 1,
    })
  })

  it('calculates responses by channel correctly', async () => {
    mockGte
      .mockResolvedValueOnce({
        data: mockResponsesData,
        error: null,
      })
      .mockResolvedValueOnce({
        data: mockUpdatesData,
        error: null,
      })

    const { result } = renderHook(() => useResponseAnalytics('30d'))

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    const responsesByChannel = result.current.analytics!.responsesByChannel
    expect(responsesByChannel).toHaveLength(2)

    const emailChannel = responsesByChannel.find(c => c.channel === 'Email')
    expect(emailChannel).toEqual({ channel: 'Email', count: 2 })

    const whatsappChannel = responsesByChannel.find(c => c.channel === 'Whatsapp')
    expect(whatsappChannel).toEqual({ channel: 'Whatsapp', count: 1 })
  })

  it('calculates responses by hour correctly', async () => {
    // Use recent dates that would be included in 30-day timeframe
    const recentResponsesData = [
      {
        ...mockResponsesData[0],
        received_at: '2024-09-20T14:30:00Z', // hour 14
      },
      {
        ...mockResponsesData[1],
        received_at: '2024-09-20T15:45:00Z', // hour 15
      },
      {
        ...mockResponsesData[2],
        received_at: '2024-09-21T09:15:00Z', // hour 9
      },
    ]

    mockGte
      .mockResolvedValueOnce({
        data: recentResponsesData,
        error: null,
      })
      .mockResolvedValueOnce({
        data: mockUpdatesData,
        error: null,
      })

    const { result } = renderHook(() => useResponseAnalytics('30d'))

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    const responsesByHour = result.current.analytics!.responsesByHour
    expect(responsesByHour).toHaveLength(24)

    // Check specific hours based on mock data - times are parsed with getHours() which uses local time
    const response1Hour = new Date('2024-01-21T09:15:00Z').getHours()
    const response2Hour = new Date('2024-01-20T14:30:00Z').getHours()
    const response3Hour = new Date('2024-01-20T15:45:00Z').getHours()

    expect(responsesByHour[response1Hour].count).toBe(1)
    expect(responsesByHour[response2Hour].count).toBe(1)
    expect(responsesByHour[response3Hour].count).toBe(1)

    // Other hours should have 0
    expect(responsesByHour[0].count).toBe(0)
    expect(responsesByHour[23].count).toBe(0)
  })

  it('calculates engagement trend correctly', async () => {
    // Mock Date to have consistent 7-day calculation
    const mockDate = new Date('2024-01-22T12:00:00Z')

    // Mock Date.now specifically
    const originalDateNow = Date.now
    const originalDate = global.Date

    global.Date = jest.fn(((...args: ConstructorParameters<typeof Date>) => {
      if (args.length === 0) {
        return new originalDate(mockDate)
      }
      return new originalDate(...args)
    }) as typeof Date)

    // Copy static methods
    Object.setPrototypeOf(global.Date, originalDate)
    global.Date.now = jest.fn(() => mockDate.getTime())

    mockGte
      .mockResolvedValueOnce({
        data: mockResponsesData,
        error: null,
      })
      .mockResolvedValueOnce({
        data: mockUpdatesData,
        error: null,
      })

    const { result } = renderHook(() => useResponseAnalytics('30d'))

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    const engagementTrend = result.current.analytics!.engagementTrend
    expect(engagementTrend).toHaveLength(7)

    // Check that dates are in correct format
    expect(engagementTrend[0].date).toBe('2024-01-16')
    expect(engagementTrend[6].date).toBe('2024-01-22')

    // Check specific days with responses
    const jan20 = engagementTrend.find(d => d.date === '2024-01-20')
    expect(jan20?.responses).toBe(2) // 2 responses on 2024-01-20

    const jan21 = engagementTrend.find(d => d.date === '2024-01-21')
    expect(jan21?.responses).toBe(1) // 1 response on 2024-01-21

    // Restore Date mocks
    global.Date = originalDate
    Date.now = originalDateNow
    jest.restoreAllMocks()
  })

  it('uses correct timeframe parameter', async () => {
    mockGte
      .mockResolvedValueOnce({
        data: mockResponsesData,
        error: null,
      })
      .mockResolvedValueOnce({
        data: mockUpdatesData,
        error: null,
      })

    renderHook(() => useResponseAnalytics('7d'))

    await waitFor(() => {
      expect(mockGte).toHaveBeenCalled()
    })
  })

  it('handles different timeframes correctly', async () => {
    const { rerender } = renderHook(
      ({ timeframe }) => useResponseAnalytics(timeframe),
      { initialProps: { timeframe: '30d' as const } }
    )

    await waitFor(() => {
      expect(mockGte).toHaveBeenCalled()
    })

    // Clear previous calls
    jest.clearAllMocks()
    mockGte
      .mockResolvedValueOnce({ data: mockResponsesData, error: null })
      .mockResolvedValueOnce({ data: mockUpdatesData, error: null })

    rerender({ timeframe: '90d' })

    await waitFor(() => {
      expect(mockGte).toHaveBeenCalled()
    })
  })

  it('handles unauthenticated user', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } })

    const { result } = renderHook(() => useResponseAnalytics('30d'))

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.analytics).toBeNull()
    expect(result.current.error).toBeNull()
  })

  it('handles responses query error', async () => {
    jest.clearAllMocks()
    mockGte.mockRejectedValueOnce({ message: 'Database error' })

    const { result } = renderHook(() => useResponseAnalytics('30d'))

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.error).toBe('Failed to load analytics')
    expect(result.current.analytics).toBeNull()
    expect(mockLoggerError).toHaveBeenCalledWith(
      'Error fetching response analytics:',
      { error: { message: 'Database error' } }
    )
  })

  it('handles updates query error', async () => {
    jest.clearAllMocks()
    mockGte
      .mockResolvedValueOnce({
        data: mockResponsesData,
        error: null,
      })
      .mockRejectedValueOnce({ message: 'Updates query failed' })

    const { result } = renderHook(() => useResponseAnalytics('30d'))

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.error).toBe('Failed to load analytics')
    expect(result.current.analytics).toBeNull()
    expect(mockLoggerError).toHaveBeenCalledWith(
      'Error fetching response analytics:',
      { error: { message: 'Updates query failed' } }
    )
  })

  it('handles network errors', async () => {
    jest.clearAllMocks()
    mockGetUser.mockRejectedValue(new Error('Network error'))

    const { result } = renderHook(() => useResponseAnalytics('30d'))

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.error).toBe('Failed to load analytics')
    expect(result.current.analytics).toBeNull()
    expect(mockLoggerError).toHaveBeenCalledWith(
      'Error fetching response analytics:',
      { error: expect.any(Error) }
    )
  })

  it('calculates zero response rate correctly', async () => {
    jest.clearAllMocks()
    mockGte
      .mockResolvedValueOnce({
        data: [], // No responses
        error: null,
      })
      .mockResolvedValueOnce({
        data: mockUpdatesData, // But updates exist
        error: null,
      })

    const { result } = renderHook(() => useResponseAnalytics('30d'))

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.analytics).toBeDefined()
    expect(result.current.analytics!.responseRate).toBe(0)
    expect(result.current.analytics!.totalResponses).toBe(0)
    expect(result.current.analytics!.topResponders).toEqual([])
    expect(result.current.analytics!.responsesByChannel).toEqual([])
  })

  it('handles no updates case correctly', async () => {
    jest.clearAllMocks()
    mockGte
      .mockResolvedValueOnce({
        data: mockResponsesData,
        error: null,
      })
      .mockResolvedValueOnce({
        data: [], // No updates
        error: null,
      })

    const { result } = renderHook(() => useResponseAnalytics('30d'))

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.analytics).toBeDefined()
    expect(result.current.analytics!.responseRate).toBe(0)
    expect(result.current.analytics!.totalResponses).toBe(3)
  })

  it('limits top responders to 5', async () => {
    const manyResponses = Array.from({ length: 10 }, (_, i) => ({
      id: `response-${i}`,
      update_id: 'update-1',
      recipient_id: `recipient-${i}`,
      channel: 'email',
      content: 'Response',
      received_at: '2024-01-20T10:00:00Z',
      recipients: { name: `Person ${i}`, relationship: 'friend' },
      updates: { parent_id: 'user-123', created_at: '2024-01-20T10:00:00Z' },
    }))

    jest.clearAllMocks()
    mockGte
      .mockResolvedValueOnce({
        data: manyResponses,
        error: null,
      })
      .mockResolvedValueOnce({
        data: mockUpdatesData,
        error: null,
      })

    const { result } = renderHook(() => useResponseAnalytics('30d'))

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.analytics).toBeDefined()
    expect(result.current.analytics!.topResponders).toHaveLength(5)
  })

  it('re-fetches data when timeframe changes', async () => {
    const { rerender } = renderHook(
      ({ timeframe }) => useResponseAnalytics(timeframe),
      { initialProps: { timeframe: '7d' as const } }
    )

    await waitFor(() => {
      expect(mockGte).toHaveBeenCalled()
    })

    const initialCallCount = mockGte.mock.calls.length

    // Reset mocks and setup for second call
    jest.clearAllMocks()
    mockGte
      .mockResolvedValueOnce({ data: mockResponsesData, error: null })
      .mockResolvedValueOnce({ data: mockUpdatesData, error: null })

    rerender({ timeframe: '90d' })

    await waitFor(() => {
      expect(mockGte).toHaveBeenCalled()
    })

    expect(mockGte).toHaveBeenCalledTimes(2) // Once for responses, once for updates
  })
})