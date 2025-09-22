import '@testing-library/jest-dom'

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useParams: () => ({ id: 'test-update-id' }),
  useRouter: () => ({
    push: jest.fn(),
    back: jest.fn(),
  }),
}))

// Mock Heroicons
jest.mock('@heroicons/react/24/outline', () => ({
  ChatBubbleLeftIcon: ({ className, ...props }) => <div data-testid="chat-icon" className={className} {...props} />,
  EnvelopeIcon: ({ className, ...props }) => <div data-testid="email-icon" className={className} {...props} />,
  PhoneIcon: ({ className, ...props }) => <div data-testid="phone-icon" className={className} {...props} />,
  ChatBubbleLeftEllipsisIcon: ({ className, ...props }) => <div data-testid="sms-icon" className={className} {...props} />,
  UsersIcon: ({ className, ...props }) => <div data-testid="users-icon" className={className} {...props} />,
  ArrowTrendingUpIcon: ({ className, ...props }) => <div data-testid="trending-icon" className={className} {...props} />,
  CalendarDaysIcon: ({ className, ...props }) => <div data-testid="calendar-icon" className={className} {...props} />,
  PhotoIcon: ({ className, ...props }) => <div data-testid="photo-icon" className={className} {...props} />,
  ClockIcon: ({ className, ...props }) => <div data-testid="clock-icon" className={className} {...props} />,
  ChartBarIcon: ({ className, ...props }) => <div data-testid="chart-icon" className={className} {...props} />,
  XMarkIcon: ({ className, ...props }) => <div data-testid="x-icon" className={className} {...props} />,
  ArrowDownTrayIcon: ({ className, ...props }) => <div data-testid="download-icon" className={className} {...props} />,
  ArrowTopRightOnSquareIcon: ({ className, ...props }) => <div data-testid="external-icon" className={className} {...props} />,
  ChevronLeftIcon: ({ className, ...props }) => <div data-testid="chevron-left-icon" className={className} {...props} />,
  ChevronRightIcon: ({ className, ...props }) => <div data-testid="chevron-right-icon" className={className} {...props} />,
  PlayIcon: ({ className, ...props }) => <div data-testid="play-icon" className={className} {...props} />,
  ArrowLeftIcon: ({ className, ...props }) => <div data-testid="arrow-left-icon" className={className} {...props} />,
}))

// Mock date-fns
jest.mock('date-fns', () => ({
  formatDistanceToNow: jest.fn(() => '2 hours ago'),
}))

// Mock ChildImage component
jest.mock('@/components/ui/ChildImage', () => {
  return function MockChildImage({ alt, className, ...props }) {
    return <img alt={alt} className={className} {...props} data-testid="child-image" />
  }
})

// Mock LoadingSpinner component
jest.mock('@/components/ui/LoadingSpinner', () => {
  return function MockLoadingSpinner({ className, ...props }) {
    return <div data-testid="loading-spinner" className={className} {...props}>Loading...</div>
  }
})

// Global test setup
beforeEach(() => {
  // Clear all mocks before each test
  jest.clearAllMocks()
})

// Handle window.open for media gallery tests
Object.defineProperty(window, 'open', {
  writable: true,
  value: jest.fn(),
})