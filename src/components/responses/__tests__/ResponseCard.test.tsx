import { render, screen, fireEvent } from '@testing-library/react'
import { ResponseCard } from '../ResponseCard'
import { mockResponse, mockResponseWithMedia, mockLongContentResponse, mockEmptyResponse } from '@/test-utils/mockData'

describe('ResponseCard', () => {
  it('renders response content correctly', () => {
    render(<ResponseCard response={mockResponse} />)

    expect(screen.getByText('John Doe')).toBeInTheDocument()
    expect(screen.getByText('grandfather')).toBeInTheDocument()
    expect(screen.getByText('What a wonderful update! Thanks for sharing this precious moment.')).toBeInTheDocument()
    expect(screen.getByText('2 hours ago')).toBeInTheDocument()
  })

  it('displays channel badge correctly', () => {
    render(<ResponseCard response={mockResponse} showChannel={true} />)

    expect(screen.getByText('email')).toBeInTheDocument()
    expect(screen.getByTestId('email-icon')).toBeInTheDocument()
  })

  it('hides channel badge when showChannel is false', () => {
    render(<ResponseCard response={mockResponse} showChannel={false} />)

    expect(screen.queryByText('email')).not.toBeInTheDocument()
    expect(screen.queryByTestId('email-icon')).not.toBeInTheDocument()
  })

  it('handles long content with show more/less', () => {
    render(<ResponseCard response={mockLongContentResponse} />)

    const showMoreButton = screen.getByText('Show more')
    expect(showMoreButton).toBeInTheDocument()

    fireEvent.click(showMoreButton)

    expect(screen.getByText('Show less')).toBeInTheDocument()

    fireEvent.click(screen.getByText('Show less'))

    expect(screen.getByText('Show more')).toBeInTheDocument()
  })

  it('renders media gallery when media URLs are present', () => {
    render(<ResponseCard response={mockResponseWithMedia} />)

    // Should render MediaGallery component
    const images = screen.getAllByRole('img')
    expect(images.length).toBeGreaterThan(0)
  })

  it('calls onMediaClick when provided', () => {
    const mockOnMediaClick = jest.fn()
    render(
      <ResponseCard
        response={mockResponseWithMedia}
        onMediaClick={mockOnMediaClick}
      />
    )

    const mediaElement = screen.getAllByRole('img')[0]
    fireEvent.click(mediaElement)

    expect(mockOnMediaClick).toHaveBeenCalled()
  })

  it('handles missing content gracefully', () => {
    render(<ResponseCard response={mockEmptyResponse} />)

    expect(screen.getByText('John Doe')).toBeInTheDocument()
    expect(screen.queryByText('What a wonderful update!')).not.toBeInTheDocument()
  })

  it('displays correct avatar initial', () => {
    render(<ResponseCard response={mockResponse} />)

    expect(screen.getByText('J')).toBeInTheDocument()
  })

  it('handles different channel types correctly', () => {
    const smsResponse = { ...mockResponse, channel: 'sms' as const }
    const { rerender } = render(<ResponseCard response={smsResponse} showChannel={true} />)

    expect(screen.getByText('sms')).toBeInTheDocument()
    expect(screen.getByTestId('sms-icon')).toBeInTheDocument()

    const whatsappResponse = { ...mockResponse, channel: 'whatsapp' as const }
    rerender(<ResponseCard response={whatsappResponse} showChannel={true} />)

    expect(screen.getByText('whatsapp')).toBeInTheDocument()
    expect(screen.getByTestId('phone-icon')).toBeInTheDocument()
  })

  it('displays relationship with proper capitalization', () => {
    const response = {
      ...mockResponse,
      recipients: {
        ...mockResponse.recipients,
        relationship: 'great-grandmother'
      }
    }

    render(<ResponseCard response={response} />)

    expect(screen.getByText('great-grandmother')).toBeInTheDocument()
  })
})