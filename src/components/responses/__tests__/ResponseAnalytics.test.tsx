import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { ResponseAnalytics } from '../ResponseAnalytics'

// Mock heroicons
jest.mock('@heroicons/react/24/outline', () => ({
  ArrowTrendingUpIcon: ({ className }: { className?: string }) => <div data-testid="trending-icon" className={className} />,
  UsersIcon: ({ className }: { className?: string }) => <div data-testid="users-icon" className={className} />,
  ChatBubbleLeftIcon: ({ className }: { className?: string }) => <div data-testid="chat-icon" className={className} />,
  ClockIcon: ({ className }: { className?: string }) => <div data-testid="clock-icon" className={className} />,
  ChartBarIcon: ({ className }: { className?: string }) => <div data-testid="chart-icon" className={className} />,
  CalendarDaysIcon: ({ className }: { className?: string }) => <div data-testid="calendar-icon" className={className} />,
}))

// Mock LoadingSpinner component
jest.mock('@/components/ui/LoadingSpinner', () => ({
  LoadingSpinner: () => <div data-testid="loading-spinner">Loading analytics...</div>
}))

// Mock the useResponseAnalytics hook
const mockAnalytics = {
  totalResponses: 42,
  responseRate: 85,
  averageResponseTime: 2.5,
  topResponders: [
    { recipient: 'Grandma Smith', count: 15, relationship: 'grandmother' },
    { recipient: 'Uncle Bob', count: 12, relationship: 'uncle' },
    { recipient: 'Aunt Sarah', count: 8, relationship: 'aunt' },
  ],
  responsesByChannel: [
    { channel: 'Email', count: 25 },
    { channel: 'Whatsapp', count: 12 },
    { channel: 'SMS', count: 5 },
  ],
  responsesByHour: Array.from({ length: 24 }, (_, i) => ({
    hour: i,
    count: i === 9 ? 10 : i === 14 ? 8 : i === 19 ? 12 : Math.floor(Math.random() * 5),
  })),
  engagementTrend: [
    { date: '2024-01-15', responses: 5 },
    { date: '2024-01-16', responses: 8 },
    { date: '2024-01-17', responses: 12 },
    { date: '2024-01-18', responses: 3 },
    { date: '2024-01-19', responses: 10 },
    { date: '2024-01-20', responses: 2 },
    { date: '2024-01-21', responses: 7 },
  ],
}

const mockUseResponseAnalytics = {
  analytics: mockAnalytics,
  loading: false,
  error: null,
}

jest.mock('@/hooks/useResponseAnalytics', () => ({
  useResponseAnalytics: jest.fn(() => mockUseResponseAnalytics),
}))

const { useResponseAnalytics } = require('@/hooks/useResponseAnalytics')

describe('ResponseAnalytics', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    useResponseAnalytics.mockReturnValue({
      analytics: mockAnalytics,
      loading: false,
      error: null,
    })
  })

  it('renders loading state', () => {
    useResponseAnalytics.mockReturnValue({
      analytics: null,
      loading: true,
      error: null,
    })

    render(<ResponseAnalytics />)

    expect(screen.getByTestId('loading-spinner')).toBeInTheDocument()
    expect(screen.getAllByText('Loading analytics...')).toHaveLength(2) // Both spinner and span
  })

  it('renders error state', () => {
    const errorMessage = 'Failed to load analytics'
    useResponseAnalytics.mockReturnValue({
      analytics: null,
      loading: false,
      error: errorMessage,
    })

    render(<ResponseAnalytics />)

    expect(screen.getByText(errorMessage)).toBeInTheDocument()
    expect(screen.getByText(errorMessage).closest('div')).toHaveClass('bg-red-50')
  })

  it('returns null when no analytics data', () => {
    useResponseAnalytics.mockReturnValue({
      analytics: null,
      loading: false,
      error: null,
    })

    const { container } = render(<ResponseAnalytics />)
    expect(container.firstChild).toBeNull()
  })

  it('renders header with timeframe selector', () => {
    render(<ResponseAnalytics />)

    expect(screen.getByText('Response Analytics')).toBeInTheDocument()
    expect(screen.getByTestId('chart-icon')).toBeInTheDocument()

    expect(screen.getByText('7 days')).toBeInTheDocument()
    expect(screen.getByText('30 days')).toBeInTheDocument()
    expect(screen.getByText('90 days')).toBeInTheDocument()
  })

  it('renders key metrics cards', () => {
    render(<ResponseAnalytics />)

    // Use more specific selectors to avoid ambiguity
    expect(screen.getByText('Total Responses').closest('div')?.querySelector('.text-2xl')).toHaveTextContent('42')
    expect(screen.getByText('Total Responses')).toBeInTheDocument()

    expect(screen.getByText('Response Rate').closest('div')?.querySelector('.text-2xl')).toHaveTextContent('85%')
    expect(screen.getByText('Response Rate')).toBeInTheDocument()

    expect(screen.getByText('Avg Response Time').closest('div')?.querySelector('.text-2xl')).toHaveTextContent('2.5h')
    expect(screen.getByText('Avg Response Time')).toBeInTheDocument()

    expect(screen.getByText('Active Responders').closest('div')?.querySelector('.text-2xl')).toHaveTextContent('3')
    expect(screen.getByText('Active Responders')).toBeInTheDocument()
  })

  it('renders top responders section', () => {
    render(<ResponseAnalytics />)

    expect(screen.getByText('Top Responders')).toBeInTheDocument()

    expect(screen.getByText('Grandma Smith')).toBeInTheDocument()
    expect(screen.getByText('grandmother')).toBeInTheDocument()
    expect(screen.getByText('15')).toBeInTheDocument()

    expect(screen.getByText('Uncle Bob')).toBeInTheDocument()
    expect(screen.getByText('uncle')).toBeInTheDocument()
    expect(screen.getAllByText('12').length).toBeGreaterThan(0) // 12 appears in multiple places

    expect(screen.getByText('Aunt Sarah')).toBeInTheDocument()
    expect(screen.getByText('aunt')).toBeInTheDocument()
    expect(screen.getAllByText('8').length).toBeGreaterThan(0) // 8 appears in multiple places
  })

  it('renders response channels section', () => {
    render(<ResponseAnalytics />)

    expect(screen.getByText('Response Channels')).toBeInTheDocument()

    expect(screen.getByText('Email')).toBeInTheDocument()
    expect(screen.getByText('25')).toBeInTheDocument()

    expect(screen.getByText('Whatsapp')).toBeInTheDocument()
    expect(screen.getAllByText('12').length).toBeGreaterThan(0) // 12 appears in multiple places

    expect(screen.getByText('SMS')).toBeInTheDocument()
    expect(screen.getAllByText('5').length).toBeGreaterThan(0) // 5 appears in multiple places
  })

  it('renders response activity by hour', () => {
    render(<ResponseAnalytics />)

    expect(screen.getByText('Response Activity by Hour')).toBeInTheDocument()

    // Check for formatted hours
    expect(screen.getByText('12 AM')).toBeInTheDocument()
    expect(screen.getByText('9 AM')).toBeInTheDocument()
    expect(screen.getByText('12 PM')).toBeInTheDocument()
    expect(screen.getByText('7 PM')).toBeInTheDocument()
    expect(screen.getByText('11 PM')).toBeInTheDocument()
  })

  it('formats hours correctly', () => {
    render(<ResponseAnalytics />)

    // Test hour formatting
    expect(screen.getByText('12 AM')).toBeInTheDocument() // 0
    expect(screen.getByText('1 AM')).toBeInTheDocument() // 1
    expect(screen.getByText('11 AM')).toBeInTheDocument() // 11
    expect(screen.getByText('12 PM')).toBeInTheDocument() // 12
    expect(screen.getByText('1 PM')).toBeInTheDocument() // 13
    expect(screen.getByText('11 PM')).toBeInTheDocument() // 23
  })

  it('renders engagement trend chart', () => {
    render(<ResponseAnalytics />)

    expect(screen.getByText('7-Day Engagement Trend')).toBeInTheDocument()

    // Check that weekdays are displayed
    expect(screen.getByText('Mon')).toBeInTheDocument()
    expect(screen.getByText('Tue')).toBeInTheDocument()
    expect(screen.getByText('Wed')).toBeInTheDocument()
    expect(screen.getByText('Thu')).toBeInTheDocument()
    expect(screen.getByText('Fri')).toBeInTheDocument()
    expect(screen.getByText('Sat')).toBeInTheDocument()
    expect(screen.getByText('Sun')).toBeInTheDocument()

    // Check that response counts are displayed
    expect(screen.getAllByText('5').length).toBeGreaterThan(0) // 5 appears in multiple places
    expect(screen.getAllByText('8').length).toBeGreaterThan(0) // 8 appears in multiple places
    expect(screen.getAllByText('12').length).toBeGreaterThan(0) // 12 appears in multiple places
    expect(screen.getAllByText('3').length).toBeGreaterThan(0) // 3 appears in multiple places
    expect(screen.getAllByText('10').length).toBeGreaterThan(0) // 10 appears in multiple places
    expect(screen.getAllByText('2').length).toBeGreaterThan(0) // 2 appears in multiple places
    expect(screen.getAllByText('7').length).toBeGreaterThan(0) // 7 appears in multiple places
  })

  it('changes timeframe when clicked', async () => {
    render(<ResponseAnalytics />)

    const sevenDaysButton = screen.getByText('7 days')
    fireEvent.click(sevenDaysButton)

    expect(useResponseAnalytics).toHaveBeenCalledWith('7d')

    const ninetyDaysButton = screen.getByText('90 days')
    fireEvent.click(ninetyDaysButton)

    expect(useResponseAnalytics).toHaveBeenCalledWith('90d')
  })

  it('shows active timeframe button styling', () => {
    render(<ResponseAnalytics timeframe="7d" />)

    const sevenDaysButton = screen.getByText('7 days')
    expect(sevenDaysButton).toHaveClass('bg-blue-100', 'text-blue-700')

    const thirtyDaysButton = screen.getByText('30 days')
    expect(thirtyDaysButton).toHaveClass('text-gray-500')
  })

  it('handles empty top responders', () => {
    useResponseAnalytics.mockReturnValue({
      analytics: { ...mockAnalytics, topResponders: [] },
      loading: false,
      error: null,
    })

    render(<ResponseAnalytics />)

    expect(screen.getByText('Top Responders')).toBeInTheDocument()
    expect(screen.getByText('No responses yet')).toBeInTheDocument()
  })

  it('handles empty response channels', () => {
    useResponseAnalytics.mockReturnValue({
      analytics: { ...mockAnalytics, responsesByChannel: [] },
      loading: false,
      error: null,
    })

    render(<ResponseAnalytics />)

    expect(screen.getByText('Response Channels')).toBeInTheDocument()
    expect(screen.getByText('No responses yet')).toBeInTheDocument()
  })

  it('applies correct channel colors', () => {
    render(<ResponseAnalytics />)

    // Email should be blue
    const emailIndicator = screen.getByText('Email').previousSibling
    expect(emailIndicator).toHaveClass('bg-blue-500')

    // Whatsapp should be green
    const whatsappIndicator = screen.getByText('Whatsapp').previousSibling
    expect(whatsappIndicator).toHaveClass('bg-green-500')

    // SMS should be purple (default)
    const smsIndicator = screen.getByText('SMS').previousSibling
    expect(smsIndicator).toHaveClass('bg-purple-500')
  })

  it('displays responder initials correctly', () => {
    render(<ResponseAnalytics />)

    // Check that first letter of each responder name is used
    expect(screen.getByText('G')).toBeInTheDocument() // Grandma
    expect(screen.getByText('U')).toBeInTheDocument() // Uncle
    expect(screen.getByText('A')).toBeInTheDocument() // Aunt
  })

  it('passes correct timeframe to hook', () => {
    render(<ResponseAnalytics timeframe="90d" />)

    expect(useResponseAnalytics).toHaveBeenCalledWith('90d')
  })

  it('defaults to 30d timeframe', () => {
    render(<ResponseAnalytics />)

    expect(useResponseAnalytics).toHaveBeenCalledWith('30d')
  })

  it('renders with updateId prop', () => {
    render(<ResponseAnalytics updateId="update-123" />)

    // Component should render normally even with updateId
    expect(screen.getByText('Response Analytics')).toBeInTheDocument()
  })

  it('has proper semantic structure', () => {
    render(<ResponseAnalytics />)

    const mainHeading = screen.getByText('Response Analytics')
    expect(mainHeading.tagName).toBe('H2')

    const sectionHeadings = screen.getAllByRole('heading', { level: 3 })
    expect(sectionHeadings).toHaveLength(4) // Top Responders, Response Channels, Response Activity, Engagement Trend
  })

  it('shows correct icon for each section', () => {
    render(<ResponseAnalytics />)

    expect(screen.getByTestId('chart-icon')).toBeInTheDocument() // Main header
    expect(screen.getAllByTestId('users-icon')).toHaveLength(2) // Top Responders and Active Responders metrics
    expect(screen.getAllByTestId('chat-icon')).toHaveLength(2) // Total Responses metric and Response Channels section
    expect(screen.getAllByTestId('clock-icon')).toHaveLength(2) // Avg Response Time metric and Activity by Hour section
    expect(screen.getByTestId('calendar-icon')).toBeInTheDocument() // Engagement Trend
  })

  it('applies correct metric card colors', () => {
    render(<ResponseAnalytics />)

    // Total Responses - Blue
    const totalResponsesSection = screen.getByText('Total Responses').closest('.bg-white')
    const blueIconContainer = totalResponsesSection?.querySelector('.bg-blue-100')
    expect(blueIconContainer).toBeInTheDocument()

    // Response Rate - Green
    const responseRateSection = screen.getByText('Response Rate').closest('.bg-white')
    const greenIconContainer = responseRateSection?.querySelector('.bg-green-100')
    expect(greenIconContainer).toBeInTheDocument()

    // Avg Response Time - Purple
    const responseTimeSection = screen.getByText('Avg Response Time').closest('.bg-white')
    const purpleIconContainer = responseTimeSection?.querySelector('.bg-purple-100')
    expect(purpleIconContainer).toBeInTheDocument()

    // Active Responders - Orange
    const activeRespondersSection = screen.getByText('Active Responders').closest('.bg-white')
    const orangeIconContainer = activeRespondersSection?.querySelector('.bg-orange-100')
    expect(orangeIconContainer).toBeInTheDocument()
  })

  it('handles zero values gracefully', () => {
    useResponseAnalytics.mockReturnValue({
      analytics: {
        ...mockAnalytics,
        totalResponses: 0,
        responseRate: 0,
        averageResponseTime: 0,
        topResponders: [],
        responsesByChannel: [],
      },
      loading: false,
      error: null,
    })

    render(<ResponseAnalytics />)

    // Use more specific selectors to find the metrics
    expect(screen.getByText('Total Responses').closest('div')?.querySelector('.text-2xl')).toHaveTextContent('0')
    expect(screen.getByText('Response Rate').closest('div')?.querySelector('.text-2xl')).toHaveTextContent('0%')
    expect(screen.getByText('Avg Response Time').closest('div')?.querySelector('.text-2xl')).toHaveTextContent('0h')
    expect(screen.getAllByText('No responses yet')).toHaveLength(2) // Both empty sections
  })
})