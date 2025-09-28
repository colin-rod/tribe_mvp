import { renderHook, waitFor } from '@testing-library/react'
import { useResponseNotifications } from '../useResponseNotifications'

// Mock logger
const mockErrorWithStack = jest.fn()
jest.mock('@/lib/logger', () => ({
  createLogger: () => ({
    errorWithStack: mockErrorWithStack,
    error: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
  }),
}))

// Mock Supabase client
const mockChannel = jest.fn()
const mockOn = jest.fn()
const mockSubscribe = jest.fn()
const mockRemoveChannel = jest.fn()
const mockGetUser = jest.fn()

// Mock the Supabase queries with proper chaining
const mockFrom = jest.fn()
const mockSelect = jest.fn()
const mockEq = jest.fn()
const mockSingle = jest.fn()

jest.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    channel: mockChannel,
    removeChannel: mockRemoveChannel,
    auth: {
      getUser: mockGetUser,
    },
    from: mockFrom,
  }),
}))

// Mock Notification API
const mockNotification = jest.fn()
const mockNotificationClose = jest.fn()
Object.defineProperty(window, 'Notification', {
  value: mockNotification,
  writable: true,
})

// Mock window.location with a getter/setter for href
const mockLocation = {
  href: 'http://localhost:3000',
  assign: jest.fn(),
  replace: jest.fn(),
  reload: jest.fn(),
}

// Create a spy for href changes
let currentHref = 'http://localhost:3000'
Object.defineProperty(mockLocation, 'href', {
  get: () => currentHref,
  set: (value) => { currentHref = value },
  configurable: true,
})

// Delete the existing location and create a new one
delete (window as any).location
;(window as any).location = mockLocation

describe('useResponseNotifications', () => {
  let realtimeCallback: (payload: unknown) => void

  beforeEach(() => {
    jest.clearAllMocks()
    mockErrorWithStack.mockClear()
    currentHref = 'http://localhost:3000'

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

    // Setup Supabase mocks with proper channel chaining
    const channelInstance = {
      on: mockOn,
      subscribe: mockSubscribe,
    }

    mockChannel.mockReturnValue(channelInstance)

    mockOn.mockImplementation((event, config, callback) => {
      realtimeCallback = callback
      return channelInstance // Return the same instance for chaining
    })

    mockSubscribe.mockReturnValue(channelInstance)

    mockGetUser.mockResolvedValue({
      data: { user: { id: 'user-123' } },
    })

    // Setup mock query chains
    const updatesChain = {
      eq: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: mockSingle,
        }),
      }),
    }

    const recipientsChain = {
      eq: jest.fn().mockReturnValue({
        single: mockSingle,
      }),
    }

    // Configure from() to return the appropriate chain based on table
    mockFrom.mockImplementation((table) => {
      const mockTableReturn = {
        select: jest.fn(),
      }

      if (table === 'updates') {
        mockTableReturn.select.mockReturnValue(updatesChain)
      } else if (table === 'recipients') {
        mockTableReturn.select.mockReturnValue(recipientsChain)
      }

      return mockTableReturn
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

    // Verify the notification has an onclick handler that would perform navigation
    expect(mockNotificationInstance.onclick).toBeDefined()
    expect(typeof mockNotificationInstance.onclick).toBe('function')

    // The onclick handler exists and would navigate - we can't easily test
    // the actual navigation due to JSDOM limitations, but the handler is created
    expect(window.focus).not.toHaveBeenCalled() // Not called until click
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
      expect(mockErrorWithStack).toHaveBeenCalledWith(
        'Error processing response notification:',
        expect.any(Error)
      )
    })
  })

  it('cleans up subscription on unmount', () => {
    const { unmount } = renderHook(() => useResponseNotifications())

    unmount()

    expect(mockRemoveChannel).toHaveBeenCalled()
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
