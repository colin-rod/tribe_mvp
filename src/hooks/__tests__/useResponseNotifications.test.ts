import { renderHook, waitFor } from '@testing-library/react'
import { useResponseNotifications } from '../useResponseNotifications'

// Mock Supabase client
const mockChannel = jest.fn()
const mockOn = jest.fn()
const mockSubscribe = jest.fn()
const mockRemoveChannel = jest.fn()
const mockSelect = jest.fn()
const mockEq = jest.fn()
const mockSingle = jest.fn()
const mockGetUser = jest.fn()

jest.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    channel: mockChannel,
    removeChannel: mockRemoveChannel,
    auth: {
      getUser: mockGetUser,
    },
    from: () => ({
      select: mockSelect,
    }),
  }),
}))

// Mock Notification API
const mockNotification = jest.fn()
const mockNotificationClose = jest.fn()
Object.defineProperty(window, 'Notification', {
  value: mockNotification,
  writable: true,
})

// Mock window.location
const mockLocationHref = jest.fn()
const originalLocation = window.location

beforeAll(() => {
  // Delete the existing property and create a new one
  delete (window as any).location

  const mutableLocation: Location = {
    ...originalLocation,
    assign: jest.fn(),
    replace: jest.fn(),
    reload: jest.fn(),
  }

  // Add getter/setter for href
  Object.defineProperty(mutableLocation, 'href', {
    configurable: true,
    get: () => '',
    set: mockLocationHref,
  })

  Object.defineProperty(window, 'location', {
    configurable: true,
    writable: true,
    value: mutableLocation,
  })
})

afterAll(() => {
  delete (window as any).location
  Object.defineProperty(window, 'location', {
    configurable: true,
    writable: true,
    value: originalLocation,
  })
})

describe('useResponseNotifications', () => {
  let realtimeCallback: (payload: unknown) => void

  beforeEach(() => {
    jest.clearAllMocks()
    mockLocationHref.mockClear()

    // Reset Notification permission
    Object.defineProperty(Notification, 'permission', {
      value: 'default',
      writable: true,
    })

    // Reset requestPermission
    Notification.requestPermission = jest.fn().mockResolvedValue('granted')

    // Mock notification instance
    mockNotification.mockImplementation(() => ({
      close: mockNotificationClose,
      onclick: null,
    }))

    // Setup Supabase mocks
    mockChannel.mockReturnValue({
      on: mockOn,
    })

    mockOn.mockImplementation((event, config, callback) => {
      realtimeCallback = callback
      return {
        subscribe: mockSubscribe,
      }
    })

    mockGetUser.mockResolvedValue({
      data: { user: { id: 'user-123' } },
    })

    // Setup chained query methods
    mockSelect.mockReturnValue({
      eq: mockEq,
    })

    mockEq.mockReturnValue({
      single: mockSingle,
    })
  })

  it('requests notification permission on mount', () => {
    renderHook(() => useResponseNotifications())

    expect(Notification.requestPermission).toHaveBeenCalled()
  })

  it('does not request permission if already granted', () => {
    Object.defineProperty(Notification, 'permission', {
      value: 'granted',
      writable: true,
    })

    renderHook(() => useResponseNotifications())

    expect(Notification.requestPermission).not.toHaveBeenCalled()
  })

  it('sets up real-time subscription', () => {
    renderHook(() => useResponseNotifications())

    expect(mockChannel).toHaveBeenCalledWith('user_responses')
    expect(mockOn).toHaveBeenCalledWith(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'responses',
      },
      expect.any(Function)
    )
    expect(mockSubscribe).toHaveBeenCalled()
  })

  it('shows browser notification for user\'s update response', async () => {
    Object.defineProperty(Notification, 'permission', {
      value: 'granted',
      writable: true,
    })

    // Mock update and recipient data
    mockSingle
      .mockResolvedValueOnce({
        data: {
          id: 'update-123',
          parent_id: 'user-123',
          content: 'Test update',
          children: { name: 'Emma' },
        },
      })
      .mockResolvedValueOnce({
        data: {
          name: 'Grandma',
          relationship: 'grandmother',
        },
      })

    renderHook(() => useResponseNotifications())

    // Simulate response payload
    const responsePayload = {
      new: {
        id: 'response-1',
        update_id: 'update-123',
        recipient_id: 'recipient-1',
        content: 'Such a cute photo!',
      },
    }

    await realtimeCallback(responsePayload)

    await waitFor(() => {
      expect(mockNotification).toHaveBeenCalledWith(
        'Grandma responded to Emma\'s update',
        expect.objectContaining({
          body: 'Such a cute photo!',
          icon: '/favicon.ico',
          badge: '/favicon.ico',
          tag: 'response_update-123',
          data: { updateId: 'update-123' },
        })
      )
    })
  })

  it('handles notification click to navigate to update', async () => {
    Object.defineProperty(Notification, 'permission', {
      value: 'granted',
      writable: true,
    })

    const mockNotificationInstance = {
      close: mockNotificationClose,
      onclick: null,
    }
    mockNotification.mockReturnValue(mockNotificationInstance)

    // Mock update and recipient data
    mockSingle
      .mockResolvedValueOnce({
        data: {
          id: 'update-123',
          parent_id: 'user-123',
          content: 'Test update',
          children: { name: 'Emma' },
        },
      })
      .mockResolvedValueOnce({
        data: {
          name: 'Grandma',
          relationship: 'grandmother',
        },
      })

    // Mock window.focus
    window.focus = jest.fn()

    renderHook(() => useResponseNotifications())

    const responsePayload = {
      new: {
        id: 'response-1',
        update_id: 'update-123',
        recipient_id: 'recipient-1',
        content: 'Such a cute photo!',
      },
    }

    await realtimeCallback(responsePayload)

    await waitFor(() => {
      expect(mockNotification).toHaveBeenCalled()
    })

    // Simulate clicking the notification
    if (mockNotificationInstance.onclick) {
      mockNotificationInstance.onclick()
    }

    expect(window.focus).toHaveBeenCalled()
    expect(mockLocationHref).toHaveBeenCalledWith('/dashboard/updates/update-123')
    expect(mockNotificationClose).toHaveBeenCalled()
  })

  it('truncates long content in notification body', async () => {
    Object.defineProperty(Notification, 'permission', {
      value: 'granted',
      writable: true,
    })

    const longContent = 'A'.repeat(150) // 150 characters

    // Mock update and recipient data
    mockSingle
      .mockResolvedValueOnce({
        data: {
          id: 'update-123',
          parent_id: 'user-123',
          content: 'Test update',
          children: { name: 'Emma' },
        },
      })
      .mockResolvedValueOnce({
        data: {
          name: 'Grandma',
          relationship: 'grandmother',
        },
      })

    renderHook(() => useResponseNotifications())

    const responsePayload = {
      new: {
        id: 'response-1',
        update_id: 'update-123',
        recipient_id: 'recipient-1',
        content: longContent,
      },
    }

    await realtimeCallback(responsePayload)

    await waitFor(() => {
      expect(mockNotification).toHaveBeenCalledWith(
        'Grandma responded to Emma\'s update',
        expect.objectContaining({
          body: 'A'.repeat(100) + '...', // Truncated to 100 chars + ellipsis
        })
      )
    })
  })

  it('handles media response with fallback text', async () => {
    Object.defineProperty(Notification, 'permission', {
      value: 'granted',
      writable: true,
    })

    // Mock update and recipient data
    mockSingle
      .mockResolvedValueOnce({
        data: {
          id: 'update-123',
          parent_id: 'user-123',
          content: 'Test update',
          children: { name: 'Emma' },
        },
      })
      .mockResolvedValueOnce({
        data: {
          name: 'Grandma',
          relationship: 'grandmother',
        },
      })

    renderHook(() => useResponseNotifications())

    const responsePayload = {
      new: {
        id: 'response-1',
        update_id: 'update-123',
        recipient_id: 'recipient-1',
        content: null, // No text content, likely media
      },
    }

    await realtimeCallback(responsePayload)

    await waitFor(() => {
      expect(mockNotification).toHaveBeenCalledWith(
        'Grandma responded to Emma\'s update',
        expect.objectContaining({
          body: 'Sent a photo',
        })
      )
    })
  })

  it('does not show notification if user is not authenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } })

    renderHook(() => useResponseNotifications())

    const responsePayload = {
      new: {
        id: 'response-1',
        update_id: 'update-123',
        recipient_id: 'recipient-1',
        content: 'Test response',
      },
    }

    await realtimeCallback(responsePayload)

    // Should not call further database queries or show notification
    expect(mockNotification).not.toHaveBeenCalled()
  })

  it('does not show notification if update is not found', async () => {
    mockSingle.mockResolvedValueOnce({ data: null })

    renderHook(() => useResponseNotifications())

    const responsePayload = {
      new: {
        id: 'response-1',
        update_id: 'nonexistent-update',
        recipient_id: 'recipient-1',
        content: 'Test response',
      },
    }

    await realtimeCallback(responsePayload)

    await waitFor(() => {
      expect(mockNotification).not.toHaveBeenCalled()
    })
  })

  it('does not show notification if recipient is not found', async () => {
    // Mock update found but recipient not found
    mockSingle
      .mockResolvedValueOnce({
        data: {
          id: 'update-123',
          parent_id: 'user-123',
          content: 'Test update',
          children: { name: 'Emma' },
        },
      })
      .mockResolvedValueOnce({ data: null })

    renderHook(() => useResponseNotifications())

    const responsePayload = {
      new: {
        id: 'response-1',
        update_id: 'update-123',
        recipient_id: 'nonexistent-recipient',
        content: 'Test response',
      },
    }

    await realtimeCallback(responsePayload)

    await waitFor(() => {
      expect(mockNotification).not.toHaveBeenCalled()
    })
  })

  it('handles errors gracefully', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {})
    mockGetUser.mockRejectedValue(new Error('Auth error'))

    renderHook(() => useResponseNotifications())

    const responsePayload = {
      new: {
        id: 'response-1',
        update_id: 'update-123',
        recipient_id: 'recipient-1',
        content: 'Test response',
      },
    }

    await realtimeCallback(responsePayload)

    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith(
        'Error processing response notification:',
        expect.any(Error)
      )
    })

    consoleSpy.mockRestore()
  })

  it('cleans up subscription on unmount', () => {
    const channelInstance = { on: mockOn, subscribe: mockSubscribe }
    mockChannel.mockReturnValue(channelInstance)
    mockOn.mockReturnValue({ subscribe: mockSubscribe })

    const { unmount } = renderHook(() => useResponseNotifications())

    unmount()

    expect(mockRemoveChannel).toHaveBeenCalledWith(channelInstance)
  })

  it('does not show browser notification if permission denied', async () => {
    Object.defineProperty(Notification, 'permission', {
      value: 'denied',
      writable: true,
    })

    // Mock update and recipient data
    mockSingle
      .mockResolvedValueOnce({
        data: {
          id: 'update-123',
          parent_id: 'user-123',
          content: 'Test update',
          children: { name: 'Emma' },
        },
      })
      .mockResolvedValueOnce({
        data: {
          name: 'Grandma',
          relationship: 'grandmother',
        },
      })

    renderHook(() => useResponseNotifications())

    const responsePayload = {
      new: {
        id: 'response-1',
        update_id: 'update-123',
        recipient_id: 'recipient-1',
        content: 'Test response',
      },
    }

    await realtimeCallback(responsePayload)

    // Should not show browser notification but still process the response
    expect(mockNotification).not.toHaveBeenCalled()
  })
})
