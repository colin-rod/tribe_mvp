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
  differenceInDays: jest.fn(() => 250),
  differenceInWeeks: jest.fn(() => 35),
  differenceInMonths: jest.fn(() => 8),
  format: jest.fn(() => 'September'),
  getDay: jest.fn(() => 1),
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

// Mock Math.random for consistent test results
Math.random = jest.fn(() => 0.8) // Always trigger variety bonus

// Mock Web APIs for server-side tests only if they don't exist
if (typeof global.Request === 'undefined') {
  global.Request = class MockRequest {
    constructor(input, init) {
      this.url = typeof input === 'string' ? input : input.url
      this.method = init?.method || 'GET'
      this.headers = new Map(Object.entries(init?.headers || {}))
      this._body = init?.body
    }

    async json() {
      return JSON.parse(this._body || '{}')
    }

    async text() {
      return this._body || ''
    }
  }
}

global.Response = class MockResponse {
  constructor(body, init) {
    this.body = body
    this.status = init?.status || 200
    this.statusText = init?.statusText || 'OK'
    this.headers = new Map(Object.entries(init?.headers || {}))
  }

  static json(data, init) {
    return new MockResponse(JSON.stringify(data), {
      ...init,
      headers: { 'Content-Type': 'application/json', ...init?.headers }
    })
  }
}

global.Headers = class MockHeaders extends Map {
  constructor(init) {
    super(Object.entries(init || {}))
  }

  get(name) {
    return super.get(name.toLowerCase())
  }

  set(name, value) {
    return super.set(name.toLowerCase(), value)
  }
}

// Mock Supabase client
jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => ({
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          single: jest.fn(() => Promise.resolve({ data: null, error: null })),
          gte: jest.fn(() => Promise.resolve({ data: [], error: null }))
        })),
        gte: jest.fn(() => Promise.resolve({ data: [], error: null }))
      })),
      insert: jest.fn(() => Promise.resolve({ data: null, error: null })),
      update: jest.fn(() => ({
        eq: jest.fn(() => Promise.resolve({ data: null, error: null }))
      })),
      delete: jest.fn(() => ({
        eq: jest.fn(() => Promise.resolve({ data: null, error: null }))
      }))
    }))
  }))
}))

// Global test setup
beforeEach(() => {
  // Clear all mocks before each test
  jest.clearAllMocks()
})

// Handle window.open for media gallery tests
if (typeof window !== 'undefined') {
  Object.defineProperty(window, 'open', {
    writable: true,
    value: jest.fn(),
  })
}