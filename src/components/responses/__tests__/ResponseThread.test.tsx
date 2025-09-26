import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { ResponseThread } from '../ResponseThread'
import { mockResponses } from '@/test-utils/mockData'

// Mock the useResponses hook
const mockMarkResponsesAsRead = jest.fn()
const mockUseResponses = {
  responses: mockResponses,
  loading: false,
  error: null,
  newResponseCount: 0,
  markResponsesAsRead: mockMarkResponsesAsRead,
}

jest.mock('@/hooks/useResponses', () => ({
  useResponses: jest.fn(() => mockUseResponses),
}))

// Mock ResponseCard component
jest.mock('../ResponseCard', () => {
  return function MockResponseCard({ response, showChannel }: Record<string, unknown>) {
    return (
      <div data-testid="response-card" data-response-id={response.id}>
        <div>Response from {response.recipients.name}</div>
        <div>Content: {response.content}</div>
        <div>Channel: {showChannel ? response.channel : 'hidden'}</div>
      </div>
    )
  }
})

const { useResponses } = require('@/hooks/useResponses')

describe('ResponseThread', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    // Reset default mock values
    useResponses.mockReturnValue({
      responses: mockResponses,
      loading: false,
      error: null,
      newResponseCount: 0,
      markResponsesAsRead: mockMarkResponsesAsRead,
    })
  })

  it('renders loading state', () => {
    useResponses.mockReturnValue({
      ...mockUseResponses,
      loading: true,
    })

    render(<ResponseThread updateId="test-update" />)

    expect(screen.getByTestId('loading-spinner')).toBeInTheDocument()
    expect(screen.getByText('Loading responses...')).toBeInTheDocument()
  })

  it('renders error state', () => {
    const errorMessage = 'Failed to load responses'
    useResponses.mockReturnValue({
      ...mockUseResponses,
      error: errorMessage,
    })

    render(<ResponseThread updateId="test-update" />)

    expect(screen.getByText(errorMessage)).toBeInTheDocument()
    expect(screen.getByText(errorMessage).closest('div')).toHaveClass('bg-red-50')
  })

  it('renders empty state when no responses', () => {
    useResponses.mockReturnValue({
      ...mockUseResponses,
      responses: [],
    })

    render(<ResponseThread updateId="test-update" />)

    expect(screen.getByText('No responses yet')).toBeInTheDocument()
    expect(
      screen.getByText('When family members reply to this update via email, their responses will appear here.')
    ).toBeInTheDocument()
    expect(screen.getByTestId('chat-icon')).toBeInTheDocument()
  })

  it('renders responses with header and count', () => {
    render(<ResponseThread updateId="test-update" />)

    expect(screen.getByText('Family Responses')).toBeInTheDocument()
    expect(screen.getByText('3 responses')).toBeInTheDocument() // mockResponses has 3 items
    expect(screen.getAllByTestId('response-card')).toHaveLength(3)
  })

  it('shows singular response count', () => {
    useResponses.mockReturnValue({
      ...mockUseResponses,
      responses: [mockResponses[0]],
    })

    render(<ResponseThread updateId="test-update" />)

    expect(screen.getByText('1 response')).toBeInTheDocument()
  })

  it('uses external responses when provided', () => {
    const externalResponses = [
      {
        id: 'external-1',
        recipients: { name: 'External User' },
        content: 'External response',
        channel: 'email',
      },
    ]

    render(
      <ResponseThread
        updateId="test-update"
        responses={externalResponses}
        loading={false}
      />
    )

    expect(screen.getByText('1 response')).toBeInTheDocument()
    expect(screen.getByText('Response from External User')).toBeInTheDocument()
  })

  it('uses external loading state when provided', () => {
    render(
      <ResponseThread
        updateId="test-update"
        responses={[]}
        loading={true}
      />
    )

    expect(screen.getByTestId('loading-spinner')).toBeInTheDocument()
    expect(screen.getByText('Loading responses...')).toBeInTheDocument()
  })

  it('shows new response count when notifications enabled', () => {
    useResponses.mockReturnValue({
      ...mockUseResponses,
      newResponseCount: 2,
    })

    render(<ResponseThread updateId="test-update" showNotifications={true} />)

    expect(screen.getByText('2 new')).toBeInTheDocument()
    const badge = screen.getByText('2 new')
    expect(badge).toHaveClass('bg-blue-500', 'text-white', 'rounded-full')
  })

  it('does not show new response count when notifications disabled', () => {
    useResponses.mockReturnValue({
      ...mockUseResponses,
      newResponseCount: 2,
    })

    render(<ResponseThread updateId="test-update" showNotifications={false} />)

    expect(screen.queryByText('2 new')).not.toBeInTheDocument()
  })

  it('does not show new response badge when count is 0', () => {
    useResponses.mockReturnValue({
      ...mockUseResponses,
      newResponseCount: 0,
    })

    render(<ResponseThread updateId="test-update" showNotifications={true} />)

    expect(screen.queryByText('0 new')).not.toBeInTheDocument()
  })

  it('marks responses as read when clicked with notifications', async () => {
    useResponses.mockReturnValue({
      ...mockUseResponses,
      newResponseCount: 2,
    })

    render(<ResponseThread updateId="test-update" showNotifications={true} />)

    const responsesContainer = screen.getByText('Family Responses').closest('div')?.querySelector('.space-y-3')
    expect(responsesContainer).toBeInTheDocument()

    if (responsesContainer) {
      fireEvent.click(responsesContainer)
    }

    expect(mockMarkResponsesAsRead).toHaveBeenCalled()
  })

  it('does not mark responses as read when clicked without notifications', async () => {
    useResponses.mockReturnValue({
      ...mockUseResponses,
      newResponseCount: 2,
    })

    render(<ResponseThread updateId="test-update" showNotifications={false} />)

    const responsesContainer = screen.getByText('Family Responses').closest('div')?.querySelector('.space-y-3')
    expect(responsesContainer).toBeInTheDocument()

    if (responsesContainer) {
      fireEvent.click(responsesContainer)
    }

    expect(mockMarkResponsesAsRead).not.toHaveBeenCalled()
  })

  it('does not mark responses as read when no new responses', async () => {
    useResponses.mockReturnValue({
      ...mockUseResponses,
      newResponseCount: 0,
    })

    render(<ResponseThread updateId="test-update" showNotifications={true} />)

    const responsesContainer = screen.getByText('Family Responses').closest('div')?.querySelector('.space-y-3')
    expect(responsesContainer).toBeInTheDocument()

    if (responsesContainer) {
      fireEvent.click(responsesContainer)
    }

    expect(mockMarkResponsesAsRead).not.toHaveBeenCalled()
  })

  it('applies maxHeight style when provided', () => {
    render(<ResponseThread updateId="test-update" maxHeight="400px" />)

    const responsesContainer = screen.getByText('Family Responses').closest('div')?.querySelector('.space-y-3')
    expect(responsesContainer).toHaveStyle('max-height: 400px')
  })

  it('does not apply maxHeight style when not provided', () => {
    render(<ResponseThread updateId="test-update" />)

    const responsesContainer = screen.getByText('Family Responses').closest('div')?.querySelector('.space-y-3')
    expect(responsesContainer).not.toHaveStyle('max-height: 400px')
  })

  it('passes correct props to ResponseCard components', () => {
    render(<ResponseThread updateId="test-update" />)

    const responseCards = screen.getAllByTestId('response-card')

    responseCards.forEach((card, index) => {
      expect(card).toHaveAttribute('data-response-id', mockResponses[index].id)
      expect(card).toHaveTextContent(`Response from ${mockResponses[index].recipients.name}`)
      expect(card).toHaveTextContent(`Content: ${mockResponses[index].content}`)
      expect(card).toHaveTextContent(`Channel: ${mockResponses[index].channel}`)
    })
  })

  it('has proper accessibility structure', () => {
    render(<ResponseThread updateId="test-update" />)

    const heading = screen.getByText('Family Responses')
    expect(heading.tagName).toBe('H3')
    expect(heading).toHaveClass('text-lg', 'font-semibold')

    const chatIcon = screen.getByTestId('chat-icon')
    expect(chatIcon.closest('h3')).toBe(heading)
  })

  it('renders responses in correct order', () => {
    render(<ResponseThread updateId="test-update" />)

    const responseCards = screen.getAllByTestId('response-card')

    // Verify responses are rendered in the same order as mockResponses
    expect(responseCards[0]).toHaveAttribute('data-response-id', mockResponses[0].id)
    expect(responseCards[1]).toHaveAttribute('data-response-id', mockResponses[1].id)
    expect(responseCards[2]).toHaveAttribute('data-response-id', mockResponses[2].id)
  })

  it('handles overflow-y-auto class for scrolling', () => {
    render(<ResponseThread updateId="test-update" />)

    const responsesContainer = screen.getByText('Family Responses').closest('div')?.querySelector('.space-y-3')
    expect(responsesContainer).toHaveClass('overflow-y-auto')
  })

  it('calls useResponses with correct updateId', () => {
    render(<ResponseThread updateId="specific-update-123" />)

    expect(useResponses).toHaveBeenCalledWith('specific-update-123')
  })

  it('handles mixed loading states correctly', () => {
    // External loading should override hook loading
    useResponses.mockReturnValue({
      ...mockUseResponses,
      loading: false,
    })

    render(
      <ResponseThread
        updateId="test-update"
        loading={true}
        responses={mockResponses}
      />
    )

    expect(screen.getByTestId('loading-spinner')).toBeInTheDocument()
  })

  it('handles empty external responses correctly', () => {
    render(
      <ResponseThread
        updateId="test-update"
        responses={[]}
        loading={false}
      />
    )

    expect(screen.getByText('No responses yet')).toBeInTheDocument()
  })
})
