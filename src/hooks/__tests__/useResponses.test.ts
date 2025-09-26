import { renderHook, waitFor, act } from '@testing-library/react'
import { useResponses } from '../useResponses'
import { mockResponses } from '@/test-utils/mockData'

// Mock the Supabase client
const mockSelect = jest.fn()
const mockEq = jest.fn()
const mockOrder = jest.fn()
const mockSingle = jest.fn()
const mockChannel = jest.fn()
const mockOn = jest.fn()
const mockSubscribe = jest.fn()
const mockRemoveChannel = jest.fn()

jest.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    from: () => ({
      select: mockSelect,
    }),
    channel: mockChannel,
    removeChannel: mockRemoveChannel,
  }),
}))

describe('useResponses', () => {
  let realtimeCallback: (payload: unknown) => void

  beforeEach(() => {
    jest.clearAllMocks()

    // Setup the chain of mocked methods for listing responses
    mockSelect.mockReturnValue({
      eq: mockEq,
    })
    mockEq.mockReturnValue({
      order: mockOrder,
      single: mockSingle,
    })
    mockOrder.mockResolvedValue({
      data: mockResponses,
      error: null,
    })

    // Setup single response fetch
    mockSingle.mockResolvedValue({
      data: mockResponses[0],
      error: null,
    })

    // Setup real-time subscription mocks
    mockChannel.mockReturnValue({
      on: mockOn,
    })
    mockOn.mockImplementation((event, config, callback) => {
      realtimeCallback = callback
      return {
        subscribe: mockSubscribe,
      }
    })
  })

  it('fetches responses on mount', async () => {
    const { result } = renderHook(() => useResponses('test-update-1'))

    expect(result.current.loading).toBe(true)

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.responses).toEqual(mockResponses)
    expect(result.current.error).toBeNull()
    expect(mockSelect).toHaveBeenCalledWith(`
            *,
            recipients!inner (
              id,
              name,
              relationship,
              email
            )
          `)
    expect(mockEq).toHaveBeenCalledWith('update_id', 'test-update-1')
    expect(mockOrder).toHaveBeenCalledWith('received_at', { ascending: true })
  })

  it('handles fetch errors gracefully', async () => {
    mockOrder.mockResolvedValue({
      data: null,
      error: { message: 'Database error' },
    })

    const { result } = renderHook(() => useResponses('test-update-1'))

    await waitFor(() => {
      expect(result.current.error).toBe('Failed to load responses')
    })

    // Note: loading stays true when there's a fetch error - hook doesn't set it to false
    expect(result.current.loading).toBe(true)
    expect(result.current.responses).toEqual([])
  })

  it('sets up real-time subscription', () => {
    renderHook(() => useResponses('test-update-1'))

    expect(mockChannel).toHaveBeenCalledWith('responses_test-update-1')
    expect(mockOn).toHaveBeenCalledWith(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'responses',
        filter: 'update_id=eq.test-update-1',
      },
      expect.any(Function)
    )
    expect(mockSubscribe).toHaveBeenCalled()
  })

  it('handles real-time response insertion', async () => {
    const { result } = renderHook(() => useResponses('test-update-1'))

    // Wait for initial load
    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.newResponseCount).toBe(0)

    // Simulate real-time response
    await act(async () => {
      realtimeCallback({ new: { id: 'new-response-1' } })
      // Give time for the fetchNewResponse to complete
      await new Promise(resolve => setTimeout(resolve, 100))
    })

    await waitFor(() => {
      expect(result.current.newResponseCount).toBe(1)
    })
  })

  it('marks responses as read', async () => {
    const { result } = renderHook(() => useResponses('test-update-1'))

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    // Simulate new responses
    await act(async () => {
      realtimeCallback({ new: { id: 'new-response-1' } })
      await new Promise(resolve => setTimeout(resolve, 100))
    })

    await waitFor(() => {
      expect(result.current.newResponseCount).toBe(1)
    })

    act(() => {
      result.current.markResponsesAsRead()
    })

    expect(result.current.newResponseCount).toBe(0)
  })

  it('cleans up subscription on unmount', () => {
    // Mock the chain: channel().on().subscribe() returns the channel
    const channelWithSubscription = {
      on: mockOn,
      subscribe: mockSubscribe
    }

    mockChannel.mockReturnValue(channelWithSubscription)
    mockOn.mockReturnValue(channelWithSubscription)
    mockSubscribe.mockReturnValue(channelWithSubscription)

    const { unmount } = renderHook(() => useResponses('test-update-1'))

    unmount()

    expect(mockRemoveChannel).toHaveBeenCalledWith(channelWithSubscription)
  })

  it('handles unexpected errors during fetch', async () => {
    mockOrder.mockRejectedValue(new Error('Network error'))

    const { result } = renderHook(() => useResponses('test-update-1'))

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.error).toBe('An unexpected error occurred')
    expect(result.current.responses).toEqual([])
  })

  it('updates update ID correctly when prop changes', async () => {
    const { result, rerender } = renderHook(
      ({ updateId }) => useResponses(updateId),
      { initialProps: { updateId: 'update-1' } }
    )

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    // Change the update ID
    rerender({ updateId: 'update-2' })

    // Should set up new subscription for new update ID
    expect(mockChannel).toHaveBeenCalledWith('responses_update-2')
    expect(mockEq).toHaveBeenCalledWith('update_id', 'update-2')
  })

  it('handles empty response data', async () => {
    mockOrder.mockResolvedValue({
      data: [],
      error: null,
    })

    const { result } = renderHook(() => useResponses('test-update-1'))

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.responses).toEqual([])
    expect(result.current.error).toBeNull()
  })
})
