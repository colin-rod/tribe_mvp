import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import { ResponseNotifications } from '../ResponseNotifications'

// Mock the useResponseNotifications hook
jest.mock('@/hooks/useResponseNotifications', () => ({
  useResponseNotifications: jest.fn(),
}))

// Mock date-fns
jest.mock('date-fns', () => ({
  formatDistanceToNow: jest.fn(() => '2 minutes ago'),
}))

// Mock HeroIcons components with proper SVG structure
jest.mock('@heroicons/react/24/outline', () => ({
  XMarkIcon: function MockXMarkIcon({ className, ...props }: { className?: string; [key: string]: unknown }) {
    return (
      <svg
        className={className}
        data-testid="x-mark-icon"
        {...props}
      >
        <path d="M6 18L18 6M6 6l12 12" />
      </svg>
    )
  },
  ChatBubbleLeftIcon: function MockChatBubbleLeftIcon({ className, ...props }: { className?: string; [key: string]: unknown }) {
    return (
      <svg
        className={className}
        data-testid="chat-bubble-left-icon"
        {...props}
      >
        <path d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.608-.067 2.19.14 2.83A3.333 3.333 0 003.75 18.75H12a3 3 0 003-3V8.25a3 3 0 00-3-3H3.75a3 3 0 00-3 3v7.51z" />
      </svg>
    )
  },
}))

// Mock localStorage for storage events
const mockLocalStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
}
Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
})

describe('ResponseNotifications', () => {
  let storageEventListeners: ((e: StorageEvent) => void)[] = []

  beforeEach(() => {
    jest.clearAllMocks()
    storageEventListeners = []

    // Mock addEventListener to capture the storage event handlers
    window.addEventListener = jest.fn((event: string, handler: (e: StorageEvent) => void) => {
      if (event === 'storage') {
        storageEventListeners.push(handler)
      }
    })

    window.removeEventListener = jest.fn((event: string, handler: (e: StorageEvent) => void) => {
      if (event === 'storage') {
        const index = storageEventListeners.indexOf(handler)
        if (index > -1) {
          storageEventListeners.splice(index, 1)
        }
      }
    })

    // Clean up any existing style elements from previous tests
    const existingStyles = document.querySelectorAll('#response-notifications-styles')
    existingStyles.forEach(style => style.remove())
  })

  afterEach(() => {
    storageEventListeners = []
  })

  // Helper function to simulate storage events
  const simulateStorageEvent = (key: string, newValue: string | null) => {
    const event = new StorageEvent('storage', { key, newValue })
    storageEventListeners.forEach(listener => listener(event))
  }

  it('renders nothing when no notifications', () => {
    const { container } = render(<ResponseNotifications />)
    expect(container.firstChild).toBeNull()

    // Should set up event listener
    expect(window.addEventListener).toHaveBeenCalledWith('storage', expect.any(Function))
  })

  it('displays notifications when added via storage event', async () => {
    render(<ResponseNotifications />)

    // Simulate a storage event with new notification
    const mockNotification = {
      id: 'notif-1',
      recipientName: 'Grandma',
      childName: 'Emma',
      content: 'Such a cute photo!',
      timestamp: new Date('2024-01-01T10:00:00Z'),
      updateId: 'update-123',
    }

    act(() => {
      simulateStorageEvent('tribe-notifications', JSON.stringify(mockNotification))
    })

    await waitFor(() => {
      expect(screen.getByText('New Response')).toBeInTheDocument()
      expect(screen.getByText(/Grandma replied to Emma.*s update/)).toBeInTheDocument()
      expect(screen.getByText('2 minutes ago')).toBeInTheDocument()
    })

    // Should display HeroIcons
    expect(screen.getByTestId('chat-bubble-left-icon')).toBeInTheDocument()
    expect(screen.getByTestId('x-mark-icon')).toBeInTheDocument()
  })

  it('handles dismissing notifications', async () => {
    render(<ResponseNotifications />)

    // Add a notification
    const mockNotification = {
      id: 'notif-1',
      recipientName: 'Grandma',
      childName: 'Emma',
      content: 'Such a cute photo!',
      timestamp: new Date(),
      updateId: 'update-123',
    }

    act(() => {
      simulateStorageEvent('tribe-notifications', JSON.stringify(mockNotification))
    })

    await waitFor(() => {
      expect(screen.getByText('New Response')).toBeInTheDocument()
    })

    // Click dismiss button using the X mark icon
    const dismissButton = screen.getByTestId('x-mark-icon').closest('button')
    expect(dismissButton).toBeInTheDocument()

    if (dismissButton) {
      fireEvent.click(dismissButton)
    }

    await waitFor(() => {
      expect(screen.queryByText('New Response')).not.toBeInTheDocument()
    })
  })

  it('navigates to update when notification is clicked', async () => {
    // Suppress navigation error in JSDOM
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {})

    render(<ResponseNotifications />)

    // Add a notification
    const mockNotification = {
      id: 'notif-1',
      recipientName: 'Grandma',
      childName: 'Emma',
      content: 'Such a cute photo!',
      timestamp: new Date(),
      updateId: 'update-123',
    }

    act(() => {
      simulateStorageEvent('tribe-notifications', JSON.stringify(mockNotification))
    })

    await waitFor(() => {
      expect(screen.getByText('New Response')).toBeInTheDocument()
    })

    // Store original href before the test
    const originalHref = window.location.href

    // Click on the notification content - this will trigger navigation
    const notificationContent = screen.getByText('New Response')
    fireEvent.click(notificationContent)

    // JSDOM throws an error for navigation but we can verify it was attempted
    // by checking that the console error was called
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'not implemented'
      })
    )

    // Restore console
    consoleSpy.mockRestore()
  })

  it('limits notifications to maximum of 5', async () => {
    render(<ResponseNotifications />)

    // Add 6 notifications
    for (let i = 1; i <= 6; i++) {
      const mockNotification = {
        id: `notif-${i}`,
        recipientName: `Person ${i}`,
        childName: 'Emma',
        content: `Message ${i}`,
        timestamp: new Date(),
        updateId: `update-${i}`,
      }

      act(() => {
        simulateStorageEvent('tribe-notifications', JSON.stringify(mockNotification))
      })
    }

    await waitFor(() => {
      const notifications = screen.getAllByText('New Response')
      expect(notifications).toHaveLength(5) // Maximum of 5 notifications
    })

    // Check that the latest notification is shown (Person 6)
    expect(screen.getByText(/Person 6 replied to Emma.*s update/)).toBeInTheDocument()

    // Check that the oldest notification is not shown (Person 1)
    expect(screen.queryByText(/Person 1 replied to Emma.*s update/)).not.toBeInTheDocument()
  })

  it('ignores storage events with wrong key', async () => {
    render(<ResponseNotifications />)

    // Simulate storage event with wrong key
    act(() => {
      simulateStorageEvent('other-key', JSON.stringify({ id: 'test' }))
    })

    // Should not render any notifications
    await waitFor(() => {
      expect(screen.queryByText('New Response')).not.toBeInTheDocument()
    })
  })

  it('handles invalid JSON in storage event', async () => {
    render(<ResponseNotifications />)

    // Simulate storage event with invalid JSON
    act(() => {
      simulateStorageEvent('tribe-notifications', 'invalid-json')
    })

    // Should not render any notifications and not throw
    await waitFor(() => {
      expect(screen.queryByText('New Response')).not.toBeInTheDocument()
    })
  })

  it('handles storage event with empty notification object', async () => {
    render(<ResponseNotifications />)

    // Simulate storage event with empty object
    act(() => {
      simulateStorageEvent('tribe-notifications', JSON.stringify({}))
    })

    // Should not render any notifications since id is missing
    await waitFor(() => {
      expect(screen.queryByText('New Response')).not.toBeInTheDocument()
    })
  })

  it('displays notification with chat bubble icon', async () => {
    render(<ResponseNotifications />)

    const mockNotification = {
      id: 'notif-1',
      recipientName: 'Grandma',
      childName: 'Emma',
      content: 'Such a cute photo!',
      timestamp: new Date(),
      updateId: 'update-123',
    }

    act(() => {
      simulateStorageEvent('tribe-notifications', JSON.stringify(mockNotification))
    })

    await waitFor(() => {
      expect(screen.getByTestId('chat-bubble-left-icon')).toBeInTheDocument()
    })
  })

  it('applies correct CSS classes for styling and animation', async () => {
    render(<ResponseNotifications />)

    const mockNotification = {
      id: 'notif-1',
      recipientName: 'Grandma',
      childName: 'Emma',
      content: 'Such a cute photo!',
      timestamp: new Date(),
      updateId: 'update-123',
    }

    act(() => {
      simulateStorageEvent('tribe-notifications', JSON.stringify(mockNotification))
    })

    await waitFor(() => {
      // Find the notification container by looking for the element with specific classes
      const notificationElement = screen.getByText('New Response').closest('.bg-white')
      expect(notificationElement).toHaveClass('animate-slide-in-right')
      expect(notificationElement).toHaveClass('bg-white')
      expect(notificationElement).toHaveClass('border')
      expect(notificationElement).toHaveClass('rounded-lg')
      expect(notificationElement).toHaveClass('shadow-lg')
    })
  })

  it('handles null storage event value', async () => {
    render(<ResponseNotifications />)

    // Simulate storage event with null value
    act(() => {
      simulateStorageEvent('tribe-notifications', null)
    })

    // Should not render any notifications
    await waitFor(() => {
      expect(screen.queryByText('New Response')).not.toBeInTheDocument()
    })
  })

  it('cleans up event listener on unmount', () => {
    const { unmount } = render(<ResponseNotifications />)

    // Should add event listener on mount
    expect(window.addEventListener).toHaveBeenCalledWith('storage', expect.any(Function))

    unmount()

    // Should remove event listener on unmount
    expect(window.removeEventListener).toHaveBeenCalledWith('storage', expect.any(Function))
  })

  it('handles notification with special characters in names', async () => {
    render(<ResponseNotifications />)

    const mockNotification = {
      id: 'notif-1',
      recipientName: "O'Brien",
      childName: "José",
      content: 'Such a cute photo!',
      timestamp: new Date(),
      updateId: 'update-123',
    }

    act(() => {
      simulateStorageEvent('tribe-notifications', JSON.stringify(mockNotification))
    })

    await waitFor(() => {
      expect(screen.getByText(/O.*Brien replied to José.*s update/)).toBeInTheDocument()
    })
  })

  it('injects CSS styles into document head on component mount', () => {
    // Styles are injected when the module is imported, not when component mounts
    // Clean up any existing styles first
    const existingStyle = document.getElementById('response-notifications-styles')
    if (existingStyle) {
      existingStyle.remove()
    }

    // Re-import the module to trigger style injection
    jest.resetModules()
    require('../ResponseNotifications')

    const styleElement = document.getElementById('response-notifications-styles')
    expect(styleElement).toBeInTheDocument()
    expect(styleElement?.tagName).toBe('STYLE')

    // Should contain animation styles
    expect(styleElement?.textContent).toContain('.animate-slide-in-right')
    expect(styleElement?.textContent).toContain('slideInRight')
  })

  it('does not inject duplicate CSS styles if they already exist', () => {
    // Pre-inject styles
    const existingStyle = document.createElement('style')
    existingStyle.id = 'response-notifications-styles'
    existingStyle.textContent = 'existing styles'
    document.head.appendChild(existingStyle)

    render(<ResponseNotifications />)

    // Should not create duplicate styles
    const styleElements = document.querySelectorAll('#response-notifications-styles')
    expect(styleElements).toHaveLength(1)
    expect(styleElements[0].textContent).toBe('existing styles')

    // Clean up
    existingStyle.remove()
  })
})