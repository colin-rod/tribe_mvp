# Response Collection & Display System - Testing Guide

## Overview

This guide provides comprehensive testing strategies for the Response Collection & Display system (CRO-26), covering unit tests, integration tests, real-time functionality, and edge case scenarios.

## Table of Contents

1. [Test Environment Setup](#test-environment-setup)
2. [Unit Tests](#unit-tests)
3. [Integration Tests](#integration-tests)
4. [Real-Time Testing](#real-time-testing)
5. [Edge Case Testing](#edge-case-testing)
6. [Performance Testing](#performance-testing)
7. [Manual Testing Scenarios](#manual-testing-scenarios)
8. [Test Data Setup](#test-data-setup)

## Test Environment Setup

### Prerequisites

```bash
# Install testing dependencies
npm install --save-dev @testing-library/react @testing-library/jest-dom
npm install --save-dev @testing-library/user-event
npm install --save-dev jest-environment-jsdom
npm install --save-dev msw # Mock Service Worker for API mocking
npm install --save-dev @supabase/supabase-js
```

### Jest Configuration

Create or update `jest.config.js`:

```javascript
module.exports = {
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  testPathIgnorePatterns: [
    '<rootDir>/.next/',
    '<rootDir>/node_modules/',
    '<rootDir>/supabase/functions/',
  ],
  collectCoverageFrom: [
    'src/components/responses/**/*.{ts,tsx}',
    'src/components/media/**/*.{ts,tsx}',
    'src/hooks/useResponses*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/*.stories.{ts,tsx}',
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
}
```

### Jest Setup File

Create `jest.setup.js`:

```javascript
import '@testing-library/jest-dom'

// Mock Supabase
jest.mock('@/lib/supabase/client', () => ({
  createClient: jest.fn(() => ({
    from: jest.fn(),
    auth: { getUser: jest.fn() },
    channel: jest.fn(),
    removeChannel: jest.fn(),
  })),
}))

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
  ChatBubbleLeftIcon: () => <div data-testid="chat-icon" />,
  EnvelopeIcon: () => <div data-testid="email-icon" />,
  UsersIcon: () => <div data-testid="users-icon" />,
  ArrowTrendingUpIcon: () => <div data-testid="trending-icon" />,
  // Add other icons as needed
}))

// Mock date-fns
jest.mock('date-fns', () => ({
  formatDistanceToNow: jest.fn(() => '2 hours ago'),
}))
```

## Unit Tests

### 1. ResponseCard Component Tests

Create `src/components/responses/__tests__/ResponseCard.test.tsx`:

```typescript
import { render, screen, fireEvent } from '@testing-library/react'
import { ResponseCard } from '../ResponseCard'

const mockResponse = {
  id: 'response-1',
  update_id: 'update-1',
  recipient_id: 'recipient-1',
  channel: 'email' as const,
  content: 'This is a test response content',
  media_urls: ['https://example.com/image1.jpg'],
  received_at: '2024-01-15T10:30:00Z',
  recipients: {
    id: 'recipient-1',
    name: 'John Doe',
    relationship: 'grandfather',
    email: 'john@example.com',
  },
}

describe('ResponseCard', () => {
  it('renders response content correctly', () => {
    render(<ResponseCard response={mockResponse} />)

    expect(screen.getByText('John Doe')).toBeInTheDocument()
    expect(screen.getByText('grandfather')).toBeInTheDocument()
    expect(screen.getByText('This is a test response content')).toBeInTheDocument()
    expect(screen.getByText('2 hours ago')).toBeInTheDocument()
  })

  it('displays channel badge correctly', () => {
    render(<ResponseCard response={mockResponse} showChannel={true} />)

    expect(screen.getByText('email')).toBeInTheDocument()
    expect(screen.getByTestId('email-icon')).toBeInTheDocument()
  })

  it('handles long content with show more/less', () => {
    const longContentResponse = {
      ...mockResponse,
      content: 'A'.repeat(250), // Long content to trigger truncation
    }

    render(<ResponseCard response={longContentResponse} />)

    const showMoreButton = screen.getByText('Show more')
    expect(showMoreButton).toBeInTheDocument()

    fireEvent.click(showMoreButton)

    expect(screen.getByText('Show less')).toBeInTheDocument()
  })

  it('renders media gallery when media URLs are present', () => {
    render(<ResponseCard response={mockResponse} />)

    // Check if MediaGallery is rendered (assuming it has a specific test ID)
    expect(screen.getByRole('img')).toBeInTheDocument()
  })

  it('calls onMediaClick when provided', () => {
    const mockOnMediaClick = jest.fn()
    render(
      <ResponseCard
        response={mockResponse}
        onMediaClick={mockOnMediaClick}
      />
    )

    const mediaElement = screen.getByRole('img')
    fireEvent.click(mediaElement)

    expect(mockOnMediaClick).toHaveBeenCalledWith(
      'https://example.com/image1.jpg',
      0
    )
  })

  it('handles missing content gracefully', () => {
    const noContentResponse = {
      ...mockResponse,
      content: null,
    }

    render(<ResponseCard response={noContentResponse} />)

    expect(screen.getByText('John Doe')).toBeInTheDocument()
    expect(screen.queryByText('This is a test response content')).not.toBeInTheDocument()
  })

  it('displays correct avatar initial', () => {
    render(<ResponseCard response={mockResponse} />)

    expect(screen.getByText('J')).toBeInTheDocument()
  })
})
```

### 2. useResponses Hook Tests

Create `src/hooks/__tests__/useResponses.test.ts`:

```typescript
import { renderHook, waitFor } from '@testing-library/react'
import { useResponses } from '../useResponses'

// Mock Supabase client
const mockSelect = jest.fn()
const mockEq = jest.fn()
const mockOrder = jest.fn()
const mockChannel = jest.fn()
const mockOn = jest.fn()
const mockSubscribe = jest.fn()

jest.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    from: () => ({
      select: mockSelect,
    }),
    channel: mockChannel,
    removeChannel: jest.fn(),
  }),
}))

const mockResponses = [
  {
    id: 'response-1',
    update_id: 'update-1',
    recipient_id: 'recipient-1',
    channel: 'email',
    content: 'Test response',
    media_urls: [],
    received_at: '2024-01-15T10:30:00Z',
    recipients: {
      id: 'recipient-1',
      name: 'John Doe',
      relationship: 'grandfather',
      email: 'john@example.com',
    },
  },
]

describe('useResponses', () => {
  beforeEach(() => {
    jest.clearAllMocks()

    mockSelect.mockReturnValue({
      eq: mockEq,
    })
    mockEq.mockReturnValue({
      order: mockOrder,
    })
    mockOrder.mockResolvedValue({
      data: mockResponses,
      error: null,
    })

    mockChannel.mockReturnValue({
      on: mockOn,
    })
    mockOn.mockReturnValue({
      subscribe: mockSubscribe,
    })
  })

  it('fetches responses on mount', async () => {
    const { result } = renderHook(() => useResponses('update-1'))

    expect(result.current.loading).toBe(true)

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.responses).toEqual(mockResponses)
    expect(result.current.error).toBeNull()
  })

  it('handles fetch errors gracefully', async () => {
    mockOrder.mockResolvedValue({
      data: null,
      error: { message: 'Database error' },
    })

    const { result } = renderHook(() => useResponses('update-1'))

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.error).toBe('Failed to load responses')
    expect(result.current.responses).toEqual([])
  })

  it('sets up real-time subscription', () => {
    renderHook(() => useResponses('update-1'))

    expect(mockChannel).toHaveBeenCalledWith('responses_update-1')
    expect(mockOn).toHaveBeenCalledWith(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'responses',
        filter: 'update_id=eq.update-1',
      },
      expect.any(Function)
    )
    expect(mockSubscribe).toHaveBeenCalled()
  })

  it('tracks new response count correctly', async () => {
    const { result } = renderHook(() => useResponses('update-1'))

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.newResponseCount).toBe(0)

    // Simulate new response via real-time subscription
    const subscriptionCallback = mockOn.mock.calls[0][2]
    subscriptionCallback({ new: { id: 'new-response' } })

    await waitFor(() => {
      expect(result.current.newResponseCount).toBe(1)
    })
  })

  it('marks responses as read', async () => {
    const { result } = renderHook(() => useResponses('update-1'))

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    // Simulate new responses
    const subscriptionCallback = mockOn.mock.calls[0][2]
    subscriptionCallback({ new: { id: 'new-response' } })

    await waitFor(() => {
      expect(result.current.newResponseCount).toBe(1)
    })

    result.current.markResponsesAsRead()

    expect(result.current.newResponseCount).toBe(0)
  })
})
```

### 3. MediaGallery Component Tests

Create `src/components/media/__tests__/MediaGallery.test.tsx`:

```typescript
import { render, screen, fireEvent } from '@testing-library/react'
import { MediaGallery } from '../MediaGallery'

const mockMediaUrls = [
  'https://example.com/image1.jpg',
  'https://example.com/image2.jpg',
  'https://example.com/video1.mp4',
  'https://example.com/image3.jpg',
  'https://example.com/image4.jpg',
]

describe('MediaGallery', () => {
  it('renders media grid correctly', () => {
    render(<MediaGallery mediaUrls={mockMediaUrls.slice(0, 3)} />)

    const images = screen.getAllByRole('img')
    expect(images).toHaveLength(2) // 2 images, 1 video

    const videos = screen.getAllByTagName('video')
    expect(videos).toHaveLength(1)
  })

  it('shows overflow indicator when more than maxPreview', () => {
    render(<MediaGallery mediaUrls={mockMediaUrls} maxPreview={3} />)

    expect(screen.getByText('+2 more')).toBeInTheDocument()
  })

  it('opens lightbox on media click', () => {
    render(<MediaGallery mediaUrls={mockMediaUrls.slice(0, 2)} />)

    const firstImage = screen.getAllByRole('img')[0]
    fireEvent.click(firstImage)

    // Check if lightbox is open
    expect(screen.getByText('1 of 2')).toBeInTheDocument()
  })

  it('navigates through lightbox correctly', () => {
    render(<MediaGallery mediaUrls={mockMediaUrls.slice(0, 3)} />)

    const firstImage = screen.getAllByRole('img')[0]
    fireEvent.click(firstImage)

    // Navigate to next
    const nextButton = screen.getByTestId('next-button') // Assuming you add test IDs
    fireEvent.click(nextButton)

    expect(screen.getByText('2 of 3')).toBeInTheDocument()

    // Navigate to previous
    const prevButton = screen.getByTestId('prev-button')
    fireEvent.click(prevButton)

    expect(screen.getByText('1 of 3')).toBeInTheDocument()
  })

  it('calls custom onMediaClick when provided', () => {
    const mockOnMediaClick = jest.fn()
    render(
      <MediaGallery
        mediaUrls={mockMediaUrls.slice(0, 2)}
        onMediaClick={mockOnMediaClick}
      />
    )

    const firstImage = screen.getAllByRole('img')[0]
    fireEvent.click(firstImage)

    expect(mockOnMediaClick).toHaveBeenCalledWith(mockMediaUrls[0], 0)
  })

  it('closes lightbox on overlay click', () => {
    render(<MediaGallery mediaUrls={mockMediaUrls.slice(0, 2)} />)

    const firstImage = screen.getAllByRole('img')[0]
    fireEvent.click(firstImage)

    const overlay = screen.getByTestId('lightbox-overlay') // Assuming you add test ID
    fireEvent.click(overlay)

    expect(screen.queryByText('1 of 2')).not.toBeInTheDocument()
  })

  it('handles video files correctly', () => {
    const videoUrls = ['https://example.com/video1.mp4']
    render(<MediaGallery mediaUrls={videoUrls} />)

    const video = screen.getByTagName('video')
    expect(video).toBeInTheDocument()
    expect(screen.getByTestId('play-icon')).toBeInTheDocument()
  })
})
```

## Integration Tests

### 1. ConversationView Integration Test

Create `src/components/responses/__tests__/ConversationView.integration.test.tsx`:

```typescript
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { ConversationView } from '../ConversationView'

const mockUpdate = {
  id: 'update-1',
  content: 'Test update content',
  created_at: '2024-01-15T09:00:00Z',
  child_id: 'child-1',
  parent_id: 'parent-1',
  media_urls: ['https://example.com/update-image.jpg'],
  confirmed_recipients: [{ id: 'recipient-1' }],
  children: {
    id: 'child-1',
    name: 'Alice',
    birth_date: '2020-01-01',
    profile_photo_url: 'https://example.com/alice.jpg',
  },
}

// Mock the hooks
jest.mock('@/hooks/useResponses', () => ({
  useResponses: jest.fn(() => ({
    responses: [
      {
        id: 'response-1',
        content: 'Great update!',
        received_at: '2024-01-15T10:30:00Z',
        channel: 'email',
        recipients: {
          name: 'John Doe',
          relationship: 'grandfather',
        },
      },
    ],
    loading: false,
    error: null,
    newResponseCount: 0,
    markResponsesAsRead: jest.fn(),
  })),
}))

describe('ConversationView Integration', () => {
  it('renders complete conversation flow', async () => {
    render(
      <ConversationView
        updateId="update-1"
        update={mockUpdate}
        showAnalytics={true}
      />
    )

    // Check update content
    expect(screen.getByText('Update from Alice')).toBeInTheDocument()
    expect(screen.getByText('Test update content')).toBeInTheDocument()

    // Check response stats
    expect(screen.getByText('1 response')).toBeInTheDocument()

    // Check responses
    expect(screen.getByText('Great update!')).toBeInTheDocument()
    expect(screen.getByText('John Doe')).toBeInTheDocument()
  })

  it('switches between conversation and analytics tabs', async () => {
    render(
      <ConversationView
        updateId="update-1"
        update={mockUpdate}
        showAnalytics={true}
      />
    )

    // Initially on conversation tab
    expect(screen.getByText('Great update!')).toBeInTheDocument()

    // Switch to analytics
    const analyticsTab = screen.getByText('Insights')
    fireEvent.click(analyticsTab)

    // Should show analytics (mocked)
    await waitFor(() => {
      expect(screen.queryByText('Great update!')).not.toBeInTheDocument()
    })
  })

  it('handles loading state correctly', () => {
    jest.mocked(require('@/hooks/useResponses').useResponses).mockReturnValue({
      responses: [],
      loading: true,
      error: null,
      newResponseCount: 0,
      markResponsesAsRead: jest.fn(),
    })

    render(
      <ConversationView
        updateId="update-1"
        update={mockUpdate}
      />
    )

    expect(screen.getByText('Loading responses...')).toBeInTheDocument()
  })

  it('handles error state correctly', () => {
    jest.mocked(require('@/hooks/useResponses').useResponses).mockReturnValue({
      responses: [],
      loading: false,
      error: 'Failed to load responses',
      newResponseCount: 0,
      markResponsesAsRead: jest.fn(),
    })

    render(
      <ConversationView
        updateId="update-1"
        update={mockUpdate}
      />
    )

    expect(screen.getByText('Failed to load responses')).toBeInTheDocument()
  })
})
```

### 2. Real-Time Integration Test

Create `src/__tests__/realtime-integration.test.tsx`:

```typescript
import { renderHook, act } from '@testing-library/react'
import { useResponses } from '@/hooks/useResponses'

// Mock Supabase with real-time simulation
const mockChannel = {
  on: jest.fn(),
  subscribe: jest.fn(),
}

const mockSupabase = {
  from: jest.fn(() => ({
    select: jest.fn(() => ({
      eq: jest.fn(() => ({
        order: jest.fn(() => Promise.resolve({
          data: [],
          error: null,
        })),
      })),
    })),
  })),
  channel: jest.fn(() => mockChannel),
  removeChannel: jest.fn(),
}

jest.mock('@/lib/supabase/client', () => ({
  createClient: () => mockSupabase,
}))

describe('Real-time Integration', () => {
  let realtimeCallback: (payload: any) => void

  beforeEach(() => {
    jest.clearAllMocks()

    mockChannel.on.mockImplementation((event, config, callback) => {
      realtimeCallback = callback
      return mockChannel
    })
  })

  it('handles real-time response insertion', async () => {
    const { result } = renderHook(() => useResponses('update-1'))

    // Wait for initial load
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0))
    })

    expect(result.current.newResponseCount).toBe(0)

    // Simulate real-time response
    act(() => {
      realtimeCallback({
        new: {
          id: 'new-response-1',
          content: 'New response via email',
          channel: 'email',
        },
      })
    })

    expect(result.current.newResponseCount).toBe(1)
  })

  it('maintains subscription cleanup', () => {
    const { unmount } = renderHook(() => useResponses('update-1'))

    expect(mockSupabase.channel).toHaveBeenCalledWith('responses_update-1')
    expect(mockChannel.subscribe).toHaveBeenCalled()

    unmount()

    expect(mockSupabase.removeChannel).toHaveBeenCalledWith(mockChannel)
  })
})
```

## Edge Case Testing

### 1. Edge Cases Test Suite

Create `src/__tests__/edge-cases.test.tsx`:

```typescript
import { render, screen } from '@testing-library/react'
import { ResponseCard } from '@/components/responses/ResponseCard'
import { MediaGallery } from '@/components/media/MediaGallery'

describe('Edge Cases', () => {
  describe('ResponseCard Edge Cases', () => {
    it('handles extremely long names gracefully', () => {
      const responseWithLongName = {
        id: 'response-1',
        update_id: 'update-1',
        recipient_id: 'recipient-1',
        channel: 'email' as const,
        content: 'Test content',
        media_urls: [],
        received_at: '2024-01-15T10:30:00Z',
        recipients: {
          id: 'recipient-1',
          name: 'This is an extremely long name that might break the UI layout',
          relationship: 'great-grandmother',
          email: 'test@example.com',
        },
      }

      render(<ResponseCard response={responseWithLongName} />)

      expect(screen.getByText('This is an extremely long name that might break the UI layout')).toBeInTheDocument()
    })

    it('handles missing recipient data', () => {
      const responseWithMissingRecipient = {
        id: 'response-1',
        update_id: 'update-1',
        recipient_id: 'recipient-1',
        channel: 'email' as const,
        content: 'Test content',
        media_urls: [],
        received_at: '2024-01-15T10:30:00Z',
        recipients: {
          id: 'recipient-1',
          name: '',
          relationship: '',
          email: null,
        },
      }

      render(<ResponseCard response={responseWithMissingRecipient} />)

      // Should render empty string without crashing
      expect(screen.getByText('')).toBeInTheDocument()
    })

    it('handles invalid channel types', () => {
      const responseWithInvalidChannel = {
        id: 'response-1',
        update_id: 'update-1',
        recipient_id: 'recipient-1',
        channel: 'invalid-channel' as any,
        content: 'Test content',
        media_urls: [],
        received_at: '2024-01-15T10:30:00Z',
        recipients: {
          id: 'recipient-1',
          name: 'John Doe',
          relationship: 'grandfather',
          email: 'john@example.com',
        },
      }

      render(<ResponseCard response={responseWithInvalidChannel} />)

      // Should fallback to default icon/color
      expect(screen.getByTestId('email-icon')).toBeInTheDocument()
    })

    it('handles very old timestamps', () => {
      const responseWithOldTimestamp = {
        id: 'response-1',
        update_id: 'update-1',
        recipient_id: 'recipient-1',
        channel: 'email' as const,
        content: 'Test content',
        media_urls: [],
        received_at: '1990-01-15T10:30:00Z', // Very old timestamp
        recipients: {
          id: 'recipient-1',
          name: 'John Doe',
          relationship: 'grandfather',
          email: 'john@example.com',
        },
      }

      render(<ResponseCard response={responseWithOldTimestamp} />)

      expect(screen.getByText('2 hours ago')).toBeInTheDocument() // Mocked response
    })
  })

  describe('MediaGallery Edge Cases', () => {
    it('handles empty media array', () => {
      render(<MediaGallery mediaUrls={[]} />)

      // Should render without errors
      expect(screen.queryByRole('img')).not.toBeInTheDocument()
    })

    it('handles invalid media URLs', () => {
      const invalidUrls = [
        'not-a-valid-url',
        'https://',
        '',
        null as any,
      ]

      render(<MediaGallery mediaUrls={invalidUrls} />)

      // Should handle gracefully
      expect(screen.queryByRole('img')).toBeInTheDocument()
    })

    it('handles very large media arrays', () => {
      const largeMediaArray = Array.from({ length: 100 }, (_, i) =>
        `https://example.com/image${i}.jpg`
      )

      render(<MediaGallery mediaUrls={largeMediaArray} maxPreview={4} />)

      expect(screen.getByText('+96 more')).toBeInTheDocument()
    })

    it('handles mixed valid and invalid file extensions', () => {
      const mixedUrls = [
        'https://example.com/image.jpg',
        'https://example.com/video.mp4',
        'https://example.com/document.pdf', // Not supported
        'https://example.com/image.webp',
      ]

      render(<MediaGallery mediaUrls={mixedUrls} />)

      // Should render supported formats
      expect(screen.getAllByRole('img')).toHaveLength(3) // jpg, pdf, webp as images
      expect(screen.getAllByTagName('video')).toHaveLength(1) // mp4 as video
    })
  })

  describe('Hook Edge Cases', () => {
    it('handles rapid subscription updates', async () => {
      // This would test the debouncing or throttling of real-time updates
      // Implementation depends on how you handle rapid updates
    })

    it('handles network disconnection gracefully', async () => {
      // Test what happens when Supabase connection is lost
      // Implementation depends on error handling strategy
    })

    it('handles malformed real-time payloads', async () => {
      // Test with invalid JSON or missing required fields
      // Implementation depends on payload validation
    })
  })
})
```

### 2. Performance Edge Cases

Create `src/__tests__/performance.test.tsx`:

```typescript
import { render, act } from '@testing-library/react'
import { ResponseThread } from '@/components/responses/ResponseThread'

describe('Performance Edge Cases', () => {
  it('handles large number of responses efficiently', () => {
    const manyResponses = Array.from({ length: 1000 }, (_, i) => ({
      id: `response-${i}`,
      update_id: 'update-1',
      recipient_id: 'recipient-1',
      channel: 'email' as const,
      content: `Response content ${i}`,
      media_urls: [],
      received_at: new Date(Date.now() - i * 1000).toISOString(),
      recipients: {
        id: 'recipient-1',
        name: `User ${i}`,
        relationship: 'family',
        email: `user${i}@example.com`,
      },
    }))

    const startTime = performance.now()

    render(
      <ResponseThread
        updateId="update-1"
        responses={manyResponses}
        loading={false}
      />
    )

    const endTime = performance.now()

    // Should render within reasonable time (adjust threshold as needed)
    expect(endTime - startTime).toBeLessThan(1000) // 1 second
  })

  it('handles frequent real-time updates without memory leaks', () => {
    // This would test that components properly clean up listeners
    // and don't accumulate memory over time
  })
})
```

## Real-Time Testing

### Manual Real-Time Testing Script

Create `scripts/test-realtime.js`:

```javascript
// Manual test script for real-time functionality
const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const supabase = createClient(supabaseUrl, supabaseKey)

async function testRealTimeResponses() {
  console.log('Starting real-time response test...')

  // Subscribe to responses
  const channel = supabase
    .channel('test-responses')
    .on('postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'responses'
      },
      (payload) => {
        console.log('Received real-time update:', payload)
      }
    )
    .subscribe()

  console.log('Subscribed to real-time updates')
  console.log('Now create a test response in another terminal:')
  console.log(`
    INSERT INTO responses (update_id, recipient_id, channel, content)
    VALUES ('test-update', 'test-recipient', 'email', 'Test real-time response');
  `)

  // Keep script running
  setTimeout(() => {
    console.log('Test completed')
    supabase.removeChannel(channel)
    process.exit(0)
  }, 30000) // 30 seconds
}

testRealTimeResponses()
```

## Manual Testing Scenarios

### Complete End-to-End Testing Checklist

#### 1. Response Display Testing
- [ ] Load page with existing responses
- [ ] Verify all response metadata displays correctly
- [ ] Test different channel types (email, SMS, WhatsApp)
- [ ] Verify timestamps are formatted correctly
- [ ] Test long and short response content
- [ ] Verify media attachments display correctly

#### 2. Real-Time Testing
- [ ] Open conversation in browser
- [ ] Send test email response via external email client
- [ ] Verify response appears without refresh
- [ ] Check browser notification appears
- [ ] Verify response counter updates
- [ ] Test multiple rapid responses

#### 3. Media Testing
- [ ] Upload responses with images
- [ ] Upload responses with videos
- [ ] Test media gallery lightbox functionality
- [ ] Test navigation between media items
- [ ] Test download functionality
- [ ] Test with large media files

#### 4. Analytics Testing
- [ ] Switch to analytics tab
- [ ] Verify metrics display correctly
- [ ] Test different timeframes (7d, 30d, 90d)
- [ ] Check response rate calculations
- [ ] Verify top responders list
- [ ] Test charts and visualizations

#### 5. Error Handling Testing
- [ ] Test with no internet connection
- [ ] Test with invalid update ID
- [ ] Test with corrupted media URLs
- [ ] Test with malformed response data
- [ ] Verify error messages are user-friendly

#### 6. Mobile Testing
- [ ] Test on iOS Safari
- [ ] Test on Android Chrome
- [ ] Verify responsive layout
- [ ] Test touch interactions
- [ ] Test media gallery on mobile

## Test Data Setup

### Database Test Data Script

Create `scripts/setup-test-data.sql`:

```sql
-- Insert test child
INSERT INTO children (id, name, birth_date, parent_id)
VALUES ('test-child-1', 'Test Child', '2020-01-01', 'test-parent-1');

-- Insert test recipients
INSERT INTO recipients (id, parent_id, name, email, relationship, frequency, channels)
VALUES
  ('test-recipient-1', 'test-parent-1', 'John Doe', 'john@example.com', 'grandfather', 'every_update', ARRAY['email']),
  ('test-recipient-2', 'test-parent-1', 'Jane Smith', 'jane@example.com', 'grandmother', 'weekly_digest', ARRAY['email', 'sms']);

-- Insert test update
INSERT INTO updates (id, parent_id, child_id, content, created_at)
VALUES ('test-update-1', 'test-parent-1', 'test-child-1', 'This is a test update for response testing', NOW() - INTERVAL '2 hours');

-- Insert test responses
INSERT INTO responses (id, update_id, recipient_id, channel, content, received_at)
VALUES
  ('test-response-1', 'test-update-1', 'test-recipient-1', 'email', 'What a wonderful update! Thanks for sharing.', NOW() - INTERVAL '1 hour'),
  ('test-response-2', 'test-update-1', 'test-recipient-2', 'email', 'So cute! 😍', NOW() - INTERVAL '30 minutes'),
  ('test-response-3', 'test-update-1', 'test-recipient-1', 'sms', 'Love this!', NOW() - INTERVAL '15 minutes');

-- Insert test responses with media
INSERT INTO responses (id, update_id, recipient_id, channel, content, media_urls, received_at)
VALUES
  ('test-response-4', 'test-update-1', 'test-recipient-2', 'email', 'Here are some photos in response!',
   ARRAY['https://example.com/response1.jpg', 'https://example.com/response2.jpg'],
   NOW() - INTERVAL '5 minutes');
```

### Jest Test Data Helper

Create `src/test-utils/mockData.ts`:

```typescript
export const mockUpdate = {
  id: 'test-update-1',
  content: 'Test update content',
  created_at: '2024-01-15T09:00:00Z',
  child_id: 'test-child-1',
  parent_id: 'test-parent-1',
  media_urls: ['https://example.com/test-image.jpg'],
  confirmed_recipients: [{ id: 'test-recipient-1' }],
  children: {
    id: 'test-child-1',
    name: 'Test Child',
    birth_date: '2020-01-01',
    profile_photo_url: 'https://example.com/child-photo.jpg',
  },
}

export const mockResponses = [
  {
    id: 'test-response-1',
    update_id: 'test-update-1',
    recipient_id: 'test-recipient-1',
    channel: 'email' as const,
    content: 'Great update!',
    media_urls: [],
    received_at: '2024-01-15T10:30:00Z',
    recipients: {
      id: 'test-recipient-1',
      name: 'John Doe',
      relationship: 'grandfather',
      email: 'john@example.com',
    },
  },
  {
    id: 'test-response-2',
    update_id: 'test-update-1',
    recipient_id: 'test-recipient-2',
    channel: 'sms' as const,
    content: 'So cute! 😍',
    media_urls: ['https://example.com/response-image.jpg'],
    received_at: '2024-01-15T11:00:00Z',
    recipients: {
      id: 'test-recipient-2',
      name: 'Jane Smith',
      relationship: 'grandmother',
      email: 'jane@example.com',
    },
  },
]

export const mockAnalytics = {
  totalResponses: 15,
  responseRate: 75,
  topResponders: [
    { recipient: 'John Doe', count: 8, relationship: 'grandfather' },
    { recipient: 'Jane Smith', count: 5, relationship: 'grandmother' },
  ],
  responsesByHour: Array.from({ length: 24 }, (_, hour) => ({
    hour,
    count: Math.floor(Math.random() * 5),
  })),
  responsesByChannel: [
    { channel: 'Email', count: 10 },
    { channel: 'SMS', count: 4 },
    { channel: 'WhatsApp', count: 1 },
  ],
  averageResponseTime: 2.5,
  engagementTrend: Array.from({ length: 7 }, (_, i) => ({
    date: new Date(Date.now() - (6 - i) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    responses: Math.floor(Math.random() * 10),
  })),
}
```

## Running Tests

### Test Commands

Add to `package.json`:

```json
{
  "scripts": {
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
    "test:ci": "jest --ci --coverage --watchAll=false",
    "test:unit": "jest --testPathPattern=/__tests__/.*\\.test\\.(ts|tsx)$",
    "test:integration": "jest --testPathPattern=integration",
    "test:edge-cases": "jest --testPathPattern=edge-cases",
    "test:realtime": "node scripts/test-realtime.js"
  }
}
```

### Coverage Requirements

Aim for:
- **Unit Tests**: 90%+ coverage
- **Integration Tests**: Key user flows covered
- **Edge Cases**: All error conditions tested
- **Real-time**: Subscription lifecycle tested

### CI/CD Integration

Example GitHub Actions workflow:

```yaml
name: Test Response Collection System

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'

      - run: npm ci
      - run: npm run test:ci
      - run: npm run build

      - name: Upload coverage
        uses: codecov/codecov-action@v3
```

This comprehensive testing guide ensures the Response Collection & Display system is thoroughly tested across all scenarios, from basic functionality to complex edge cases and real-time behavior.