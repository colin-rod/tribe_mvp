import { render, screen } from '@testing-library/react'
import { MobileTimelineContainer } from '../MobileTimelineContainer'

describe('MobileTimelineContainer virtualization', () => {
  beforeAll(() => {
    class MockIntersectionObserver {
      callback: IntersectionObserverCallback

      constructor(callback: IntersectionObserverCallback) {
        this.callback = callback
      }

      observe() {
        // Immediately invoke the callback to simulate visibility
        this.callback([
          { isIntersecting: false, target: document.createElement('div') } as IntersectionObserverEntry
        ], this)
      }

      disconnect() {}

      unobserve() {}

      takeRecords(): IntersectionObserverEntry[] {
        return []
      }
    }

    Object.defineProperty(window, 'IntersectionObserver', {
      writable: true,
      configurable: true,
      value: MockIntersectionObserver
    })
  })

  it('renders timeline updates without crashing', () => {
    const updates = [
      {
        id: 'update-1',
        child: {
          id: 'child-1',
          name: 'Ava',
          avatar: undefined,
          age: '2 years old'
        },
        content: 'First steps captured today!',
        contentPreview: 'First steps captured today!',
        createdAt: new Date('2024-01-01T12:00:00Z'),
        timeAgo: '1d ago',
        mediaUrls: [],
        mediaCount: 0,
        responseCount: 3,
        hasUnreadResponses: false,
        distributionStatus: 'sent' as const,
        isLiked: false,
        likeCount: 0
      }
    ]

    render(
      <MobileTimelineContainer
        updates={updates}
        loading={false}
        hasMore={false}
        onLoadMore={jest.fn()}
        onUpdateClick={jest.fn()}
      />
    )

    expect(screen.getByText('First steps captured today!')).toBeInTheDocument()
  })
})
