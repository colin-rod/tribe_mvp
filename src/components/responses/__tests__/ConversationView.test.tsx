import { render, screen, fireEvent, waitFor } from '@testing-library/react'

// Mock all dependencies first before any component imports
const mockMarkResponsesAsRead = jest.fn()

jest.mock('@/hooks/useResponses', () => ({
  useResponses: jest.fn(),
}))

// Mock child components
jest.mock('../ResponseThread', () => ({
  ResponseThread: function MockResponseThread({ updateId, responses, loading, showNotifications }: Record<string, unknown>) {
    return (
      <div data-testid="response-thread">
        <div>Update ID: {updateId}</div>
        <div>Responses: {responses?.length || 0}</div>
        <div>Loading: {loading ? 'true' : 'false'}</div>
        <div>Show Notifications: {showNotifications ? 'true' : 'false'}</div>
      </div>
    )
  }
}))

// Mock ChildImage component to prevent DOM prop warnings
jest.mock('@/components/ui/ChildImage', () => {
  return {
    __esModule: true,
    default: function MockChildImage({ childId, photoUrl, name, alt, className }: {
      childId: string,
      photoUrl?: string,
      name?: string,
      alt: string,
      className?: string
    }) {
      return (
        <div
          data-testid="child-image"
          className={className}
          aria-label={alt}
          data-child-id={childId}
          data-photo-url={photoUrl}
        >
          {name || 'Child'}
        </div>
      )
    }
  }
})

jest.mock('../ResponseAnalytics', () => ({
  ResponseAnalytics: function MockResponseAnalytics({ updateId }: Record<string, unknown>) {
    return (
      <div data-testid="response-analytics">
        <div>Analytics for: {updateId}</div>
      </div>
    )
  }
}))

// Mock date-fns
jest.mock('date-fns', () => ({
  formatDistanceToNow: jest.fn(() => '2 hours ago'),
}))

// Mock photo upload utility
jest.mock('@/lib/photo-upload', () => ({
  getChildPhotoUrl: jest.fn(() => Promise.resolve('/placeholder.png')),
  refreshChildPhotoUrl: jest.fn(() => Promise.resolve('/placeholder.png')),
}))

// Mock logger
jest.mock('@/lib/logger', () => ({
  createLogger: jest.fn(() => ({
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
  })),
}))

// Mock LoadingSpinner component
jest.mock('@/components/ui/LoadingSpinner', () => ({
  LoadingSpinner: () => <div data-testid="loading-spinner">Loading...</div>
}))

// Mock hooks
jest.mock('@/hooks/useResponseAnalytics', () => ({
  useResponseAnalytics: jest.fn(() => ({
    analytics: null,
    loading: false,
    error: null,
  })),
}))

// Mock heroicons
jest.mock('@heroicons/react/24/outline', () => ({
  ChatBubbleLeftIcon: ({ className }: { className?: string }) => <div data-testid="chat-icon" className={className} />,
  ArrowTrendingUpIcon: ({ className }: { className?: string }) => <div data-testid="trending-icon" className={className} />,
  UsersIcon: ({ className }: { className?: string }) => <div data-testid="users-icon" className={className} />,
  CalendarDaysIcon: ({ className }: { className?: string }) => <div data-testid="calendar-icon" className={className} />,
  PhotoIcon: ({ className }: { className?: string }) => <div data-testid="photo-icon" className={className} />,
  ClockIcon: ({ className }: { className?: string }) => <div data-testid="clock-icon" className={className} />,
  ChartBarIcon: ({ className }: { className?: string }) => <div data-testid="chart-icon" className={className} />,
}))

// Mock Next.js Image component
jest.mock('next/image', () => {
  return {
    __esModule: true,
    default: function MockImage({ src, alt, className, onClick }: { src: string, alt: string, className?: string, onClick?: () => void }) {
      return (
        <div
          data-testid="mock-image"
          data-src={src}
          data-alt={alt}
          className={className}
          onClick={onClick}
          role="img"
          aria-label={alt}
        />
      )
    }
  }
})

// Mock window.open
Object.defineProperty(window, 'open', {
  writable: true,
  value: jest.fn(),
})

// Import ConversationView after all mocks are set up
import { ConversationView } from '../ConversationView'
import { mockResponses } from '@/test-utils/mockData'

const { useResponses } = require('@/hooks/useResponses')
const { formatDistanceToNow } = require('date-fns')

const mockUseResponses = {
  responses: mockResponses,
  loading: false,
  error: null,
  newResponseCount: 0,
  markResponsesAsRead: mockMarkResponsesAsRead,
}

const mockUpdate = {
  id: 'update-123',
  content: 'Look at Emma playing in the garden! She loves the flowers.',
  created_at: '2024-01-15T10:30:00Z',
  child_id: 'child-1',
  parent_id: 'parent-1',
  media_urls: [
    'https://example.com/photo1.jpg',
    'https://example.com/photo2.jpg',
  ],
  confirmed_recipients: [
    { id: 'recipient-1', name: 'Grandma' },
    { id: 'recipient-2', name: 'Uncle Bob' },
  ],
  children: {
    id: 'child-1',
    name: 'Emma',
    birth_date: '2020-05-15',
    profile_photo_url: 'https://example.com/emma.jpg',
  },
}

describe('ConversationView', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    useResponses.mockReturnValue(mockUseResponses)
    formatDistanceToNow.mockReturnValue('2 hours ago')
  })

  it('renders update header with child info', () => {
    render(<ConversationView updateId="update-123" update={mockUpdate} />)

    expect(screen.getByText('Update from Emma')).toBeInTheDocument()
    expect(screen.getByText('2 hours ago')).toBeInTheDocument()
    expect(screen.getByTestId('child-image')).toBeInTheDocument()
    expect(screen.getByTestId('calendar-icon')).toBeInTheDocument()
  })

  it('renders update content', () => {
    render(<ConversationView updateId="update-123" update={mockUpdate} />)

    expect(screen.getByText('Look at Emma playing in the garden! She loves the flowers.')).toBeInTheDocument()
  })

  it('renders update photos when present', () => {
    render(<ConversationView updateId="update-123" update={mockUpdate} />)

    expect(screen.getByText('Photos (2)')).toBeInTheDocument()
    expect(screen.getByTestId('photo-icon')).toBeInTheDocument()

    const photos = screen.getAllByLabelText(/Update photo \d+/)
    expect(photos).toHaveLength(2)
    expect(photos[0]).toHaveAttribute('data-src', 'https://example.com/photo1.jpg')
    expect(photos[1]).toHaveAttribute('data-src', 'https://example.com/photo2.jpg')
  })

  it('does not render photos section when no media', () => {
    const updateWithoutMedia = { ...mockUpdate, media_urls: [] }
    render(<ConversationView updateId="update-123" update={updateWithoutMedia} />)

    expect(screen.queryByText('Photos (0)')).not.toBeInTheDocument()
    expect(screen.queryByTestId('photo-icon')).not.toBeInTheDocument()
  })

  it('opens photo in new tab when clicked', () => {
    render(<ConversationView updateId="update-123" update={mockUpdate} />)

    const firstPhoto = screen.getByLabelText('Update photo 1')
    fireEvent.click(firstPhoto)

    expect(window.open).toHaveBeenCalledWith('https://example.com/photo1.jpg', '_blank')
  })

  it('renders response stats', () => {
    render(<ConversationView updateId="update-123" update={mockUpdate} />)

    expect(screen.getByText('2 responses')).toBeInTheDocument()
    expect(screen.getByText(/Latest: 2 hours ago/)).toBeInTheDocument()
    expect(screen.getByText('Sent to 2 recipients')).toBeInTheDocument()
    expect(screen.getByTestId('users-icon')).toBeInTheDocument()
  })

  it('shows singular response count', () => {
    useResponses.mockReturnValue({
      ...mockUseResponses,
      responses: [mockResponses[0]],
    })

    render(<ConversationView updateId="update-123" update={mockUpdate} />)

    expect(screen.getByText('1 response')).toBeInTheDocument()
  })

  it('handles zero confirmed recipients', () => {
    const updateWithoutRecipients = { ...mockUpdate, confirmed_recipients: undefined }
    render(<ConversationView updateId="update-123" update={updateWithoutRecipients} />)

    expect(screen.getByText('Sent to 0 recipients')).toBeInTheDocument()
  })

  it('renders ResponseThread with correct props', () => {
    render(<ConversationView updateId="update-123" update={mockUpdate} />)

    const responseThread = screen.getByTestId('response-thread')
    expect(responseThread).toHaveTextContent('Update ID: update-123')
    expect(responseThread).toHaveTextContent('Responses: 2')
    expect(responseThread).toHaveTextContent('Loading: false')
    expect(responseThread).toHaveTextContent('Show Notifications: true')
  })

  it('does not show analytics tab when showAnalytics is false', () => {
    render(<ConversationView updateId="update-123" update={mockUpdate} showAnalytics={false} />)

    expect(screen.queryByText('Conversation')).not.toBeInTheDocument()
    expect(screen.queryByText('Insights')).not.toBeInTheDocument()
    expect(screen.getByTestId('response-thread')).toBeInTheDocument()
  })

  it('shows analytics tab when showAnalytics is true', () => {
    render(<ConversationView updateId="update-123" update={mockUpdate} showAnalytics={true} />)

    expect(screen.getByText('Conversation')).toBeInTheDocument()
    expect(screen.getByText('Insights')).toBeInTheDocument()
    expect(screen.getByTestId('chat-icon')).toBeInTheDocument()
    expect(screen.getByTestId('trending-icon')).toBeInTheDocument()
  })

  it('switches to analytics tab when clicked', async () => {
    render(<ConversationView updateId="update-123" update={mockUpdate} showAnalytics={true} />)

    const analyticsTab = screen.getByText('Insights')
    fireEvent.click(analyticsTab)

    await waitFor(() => {
      expect(screen.getByTestId('response-analytics')).toBeInTheDocument()
      expect(screen.queryByTestId('response-thread')).not.toBeInTheDocument()
    })

    expect(analyticsTab).toHaveClass('border-blue-500', 'text-blue-600')
    expect(screen.getByText('Conversation')).toHaveClass('border-transparent')
  })

  it('shows new response count in conversation tab', () => {
    useResponses.mockReturnValue({
      ...mockUseResponses,
      newResponseCount: 3,
    })

    render(<ConversationView updateId="update-123" update={mockUpdate} showAnalytics={true} />)

    expect(screen.getByText('3')).toBeInTheDocument()
    const badge = screen.getByText('3')
    expect(badge).toHaveClass('bg-blue-500', 'text-white', 'rounded-full')
  })

  it('does not show new response count when zero', () => {
    render(<ConversationView updateId="update-123" update={mockUpdate} showAnalytics={true} />)

    expect(screen.queryByText('0')).not.toBeInTheDocument()
  })

  it('marks responses as read when conversation tab is clicked', async () => {
    useResponses.mockReturnValue({
      ...mockUseResponses,
      newResponseCount: 2,
    })

    render(<ConversationView updateId="update-123" update={mockUpdate} showAnalytics={true} />)

    // Switch to analytics first
    fireEvent.click(screen.getByText('Insights'))

    // Then click conversation tab
    const conversationTab = screen.getByText('Conversation')
    fireEvent.click(conversationTab)

    expect(mockMarkResponsesAsRead).toHaveBeenCalled()
  })

  it('does not mark responses as read when analytics tab is clicked', () => {
    useResponses.mockReturnValue({
      ...mockUseResponses,
      newResponseCount: 2,
    })

    render(<ConversationView updateId="update-123" update={mockUpdate} showAnalytics={true} />)

    const analyticsTab = screen.getByText('Insights')
    fireEvent.click(analyticsTab)

    expect(mockMarkResponsesAsRead).not.toHaveBeenCalled()
  })

  it('does not mark responses as read when no new responses', () => {
    render(<ConversationView updateId="update-123" update={mockUpdate} showAnalytics={true} />)

    const conversationTab = screen.getByText('Conversation')
    fireEvent.click(conversationTab)

    expect(mockMarkResponsesAsRead).not.toHaveBeenCalled()
  })

  it('applies correct tab styling when active', () => {
    render(<ConversationView updateId="update-123" update={mockUpdate} showAnalytics={true} />)

    const conversationTab = screen.getByText('Conversation')
    const analyticsTab = screen.getByText('Insights')

    // Conversation tab should be active by default
    expect(conversationTab).toHaveClass('border-blue-500', 'text-blue-600')
    expect(analyticsTab).toHaveClass('border-transparent', 'text-gray-500')
  })

  it('calls useResponses with correct updateId', () => {
    render(<ConversationView updateId="specific-update-456" update={mockUpdate} />)

    expect(useResponses).toHaveBeenCalledWith('specific-update-456')
  })

  it('handles empty responses gracefully', () => {
    useResponses.mockReturnValue({
      ...mockUseResponses,
      responses: [],
    })

    render(<ConversationView updateId="update-123" update={mockUpdate} />)

    expect(screen.getByText('0 responses')).toBeInTheDocument()
    expect(screen.queryByText(/Latest:/)).not.toBeInTheDocument()
  })

  it('formats timestamps using date-fns', () => {
    formatDistanceToNow.mockReturnValue('3 minutes ago')

    render(<ConversationView updateId="update-123" update={mockUpdate} />)

    expect(formatDistanceToNow).toHaveBeenCalledWith(new Date(mockUpdate.created_at), { addSuffix: true })
    expect(screen.getByText('3 minutes ago')).toBeInTheDocument()
  })

  it('handles media_urls being null', () => {
    const updateWithNullMedia = { ...mockUpdate, media_urls: null }
    render(<ConversationView updateId="update-123" update={updateWithNullMedia} />)

    expect(screen.queryByText('Photos')).not.toBeInTheDocument()
  })

  it('preserves whitespace in update content', () => {
    const updateWithNewlines = {
      ...mockUpdate,
      content: 'First line\n\nSecond line\nThird line',
    }

    render(<ConversationView updateId="update-123" update={updateWithNewlines} />)

    const contentElement = screen.getByText((content, element) => {
      return element?.textContent === 'First line\n\nSecond line\nThird line' && element?.tagName === 'P'
    })
    expect(contentElement).toHaveClass('whitespace-pre-wrap')
  })

  it('has proper semantic structure', () => {
    render(<ConversationView updateId="update-123" update={mockUpdate} />)

    const heading = screen.getByText('Update from Emma')
    expect(heading.tagName).toBe('H2')

    const photoHeading = screen.getByText('Photos (2)')
    expect(photoHeading.tagName).toBe('H4')
  })
})
