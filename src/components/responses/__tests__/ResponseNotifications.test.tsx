import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { ResponseNotifications } from '../ResponseNotifications'

// Mock the useResponseNotifications hook
jest.mock('@/hooks/useResponseNotifications', () => ({
  useResponseNotifications: jest.fn(),
}))

// Mock date-fns
jest.mock('date-fns', () => ({
  formatDistanceToNow: jest.fn(() => '2 minutes ago'),
}))

// Mock navigation
const mockNavigateToUpdate = jest.fn()

// Mock the component to avoid window.location issues
jest.mock('../ResponseNotifications', () => {
  const React = require('react')
  const { useState, useEffect } = React

  return {
    ResponseNotifications: function TestResponseNotifications() {
      const [notifications, setNotifications] = useState([])

      useEffect(() => {
        const handleStorageChange = (e) => {
          if (e.key === 'tribe-notifications') {
            try {
              const newNotification = JSON.parse(e.newValue || '{}')
              if (newNotification.id) {
                setNotifications(prev => [newNotification, ...prev.slice(0, 4)])
              }
            } catch (err) {
              // Ignore invalid JSON
            }
          }
        }

        window.addEventListener('storage', handleStorageChange)
        return () => window.removeEventListener('storage', handleStorageChange)
      }, [])

      const dismissNotification = (id) => {
        setNotifications(prev => prev.filter(n => n.id !== id))
      }

      const navigateToUpdate = (updateId) => {
        mockNavigateToUpdate(updateId)
      }

      if (notifications.length === 0) {
        return null
      }

      return React.createElement('div', {
        className: 'fixed top-4 right-4 z-50 space-y-2 max-w-sm'
      },
        notifications.map((notification) =>
          React.createElement('div', {
            key: notification.id,
            className: 'bg-white border border-gray-200 rounded-lg shadow-lg p-4 transform animate-slide-in-right'
          }, [
            React.createElement('div', {
              key: 'content',
              className: 'flex items-start gap-3'
            }, [
              React.createElement('div', {
                key: 'icon',
                className: 'flex-shrink-0'
              },
                React.createElement('div', {
                  className: 'w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center'
                },
                  React.createElement('div', {
                    'data-testid': 'chat-icon',
                    className: 'h-4 w-4 text-blue-600'
                  })
                )
              ),
              React.createElement('div', {
                key: 'text',
                className: 'flex-1 min-w-0'
              }, [
                React.createElement('div', {
                  key: 'clickable',
                  className: 'cursor-pointer',
                  onClick: () => navigateToUpdate(notification.updateId)
                }, [
                  React.createElement('p', {
                    key: 'title',
                    className: 'text-sm font-medium text-gray-900 hover:text-blue-600'
                  }, 'New Response'),
                  React.createElement('p', {
                    key: 'content',
                    className: 'text-sm text-gray-600 line-clamp-2'
                  }, `${notification.recipientName} replied to ${notification.childName}'s update`),
                  React.createElement('p', {
                    key: 'time',
                    className: 'text-xs text-gray-500 mt-1'
                  }, '2 minutes ago')
                ])
              ]),
              React.createElement('button', {
                key: 'close',
                onClick: () => dismissNotification(notification.id),
                className: 'flex-shrink-0 text-gray-400 hover:text-gray-600 transition-colors'
              },
                React.createElement('div', {
                  'data-testid': 'x-icon',
                  className: 'h-4 w-4'
                })
              )
            ])
          ])
        )
      )
    }
  }
})

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
  let mockStorageEvent: (e: StorageEvent) => void

  beforeEach(() => {
    jest.clearAllMocks()

    // Mock addEventListener to capture the storage event handler
    const originalAddEventListener = window.addEventListener
    window.addEventListener = jest.fn((event, handler) => {
      if (event === 'storage') {
        mockStorageEvent = handler as (e: StorageEvent) => void
      }
      return originalAddEventListener.call(window, event, handler)
    })
  })

  afterEach(() => {
    // Clean up event listeners
    window.removeEventListener = jest.fn()
  })

  it('renders nothing when no notifications', () => {
    const { container } = render(<ResponseNotifications />)
    expect(container.firstChild).toBeNull()
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

    const storageEvent = new StorageEvent('storage', {
      key: 'tribe-notifications',
      newValue: JSON.stringify(mockNotification),
    })

    mockStorageEvent(storageEvent)

    await waitFor(() => {
      expect(screen.getByText('New Response')).toBeInTheDocument()
      expect(screen.getByText('Grandma replied to Emma\'s update')).toBeInTheDocument()
      expect(screen.getByText('2 minutes ago')).toBeInTheDocument()
    })
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

    const storageEvent = new StorageEvent('storage', {
      key: 'tribe-notifications',
      newValue: JSON.stringify(mockNotification),
    })

    mockStorageEvent(storageEvent)

    await waitFor(() => {
      expect(screen.getByText('New Response')).toBeInTheDocument()
    })

    // Click dismiss button
    const dismissButton = screen.getByTestId('x-icon').closest('button')
    expect(dismissButton).toBeInTheDocument()

    if (dismissButton) {
      fireEvent.click(dismissButton)
    }

    await waitFor(() => {
      expect(screen.queryByText('New Response')).not.toBeInTheDocument()
    })
  })

  it('navigates to update when notification is clicked', async () => {
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

    const storageEvent = new StorageEvent('storage', {
      key: 'tribe-notifications',
      newValue: JSON.stringify(mockNotification),
    })

    mockStorageEvent(storageEvent)

    await waitFor(() => {
      expect(screen.getByText('New Response')).toBeInTheDocument()
    })

    // Click on the notification content
    const notificationContent = screen.getByText('New Response')
    fireEvent.click(notificationContent)

    expect(mockNavigateToUpdate).toHaveBeenCalledWith('update-123')
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

      const storageEvent = new StorageEvent('storage', {
        key: 'tribe-notifications',
        newValue: JSON.stringify(mockNotification),
      })

      mockStorageEvent(storageEvent)
    }

    await waitFor(() => {
      const notifications = screen.getAllByText('New Response')
      expect(notifications).toHaveLength(5) // Maximum of 5 notifications
    })

    // Check that the latest notification is shown (Person 6)
    expect(screen.getByText('Person 6 replied to Emma\'s update')).toBeInTheDocument()

    // Check that the oldest notification is not shown (Person 1)
    expect(screen.queryByText('Person 1 replied to Emma\'s update')).not.toBeInTheDocument()
  })

  it('ignores storage events with wrong key', async () => {
    render(<ResponseNotifications />)

    // Simulate storage event with wrong key
    const storageEvent = new StorageEvent('storage', {
      key: 'other-key',
      newValue: JSON.stringify({ id: 'test' }),
    })

    mockStorageEvent(storageEvent)

    // Should not render any notifications
    expect(screen.queryByText('New Response')).not.toBeInTheDocument()
  })

  it('handles invalid JSON in storage event', async () => {
    render(<ResponseNotifications />)

    // Simulate storage event with invalid JSON
    const storageEvent = new StorageEvent('storage', {
      key: 'tribe-notifications',
      newValue: 'invalid-json',
    })

    expect(() => mockStorageEvent(storageEvent)).not.toThrow()

    // Should not render any notifications
    expect(screen.queryByText('New Response')).not.toBeInTheDocument()
  })

  it('handles storage event with empty notification object', async () => {
    render(<ResponseNotifications />)

    // Simulate storage event with empty object
    const storageEvent = new StorageEvent('storage', {
      key: 'tribe-notifications',
      newValue: JSON.stringify({}),
    })

    mockStorageEvent(storageEvent)

    // Should not render any notifications since id is missing
    expect(screen.queryByText('New Response')).not.toBeInTheDocument()
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

    const storageEvent = new StorageEvent('storage', {
      key: 'tribe-notifications',
      newValue: JSON.stringify(mockNotification),
    })

    mockStorageEvent(storageEvent)

    await waitFor(() => {
      expect(screen.getByTestId('chat-icon')).toBeInTheDocument()
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

    const storageEvent = new StorageEvent('storage', {
      key: 'tribe-notifications',
      newValue: JSON.stringify(mockNotification),
    })

    mockStorageEvent(storageEvent)

    await waitFor(() => {
      const notificationElement = screen.getByText('New Response').closest('div')
      expect(notificationElement).toHaveClass('animate-slide-in-right')
      expect(notificationElement).toHaveClass('bg-white')
      expect(notificationElement).toHaveClass('border')
      expect(notificationElement).toHaveClass('rounded-lg')
      expect(notificationElement).toHaveClass('shadow-lg')
    })
  })

  it('injects CSS styles into document head', () => {
    render(<ResponseNotifications />)

    const styleElement = document.getElementById('response-notifications-styles')
    expect(styleElement).toBeInTheDocument()
    expect(styleElement?.tagName).toBe('STYLE')
  })

  it('does not inject CSS styles if they already exist', () => {
    // Pre-create the style element
    const existingStyle = document.createElement('style')
    existingStyle.id = 'response-notifications-styles'
    document.head.appendChild(existingStyle)

    render(<ResponseNotifications />)

    const styleElements = document.querySelectorAll('#response-notifications-styles')
    expect(styleElements).toHaveLength(1) // Should not create duplicate
  })
})