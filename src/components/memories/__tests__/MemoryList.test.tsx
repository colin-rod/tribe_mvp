import { render, screen } from '@testing-library/react'
import React from 'react'

jest.mock('@/components/ui/ErrorBoundary', () => ({
  withErrorBoundary: (Component: React.ComponentType) => Component,
}))

jest.mock('@/components/ui/LoadingState', () => ({
  LoadingState: ({ message }: { message?: string }) => (
    <div data-testid="loading-state">{message ?? 'Loading...'}</div>
  ),
}))

jest.mock('@/components/memories/MemoryCard', () =>
  jest.fn(() => <div data-testid="memory-card" />)
)

jest.mock('@/components/memories/MemoryDetailModal', () =>
  jest.fn(() => null)
)

jest.mock('@/lib/memories', () => ({
  getRecentMemoriesWithStats: jest.fn(),
}))

import MemoryList from '../MemoryList'
import { getRecentMemoriesWithStats } from '@/lib/memories'

describe('MemoryList', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders the new memories count returned from the API', async () => {
    const mockMemories = [
      {
        id: 'memory-1',
        parent_id: 'parent-1',
        child_id: 'child-1',
        content: 'First steps today!',
        subject: null,
        rich_content: null,
        content_format: 'plain',
        media_urls: [],
        milestone_type: null,
        metadata: null,
        ai_analysis: {},
        suggested_recipients: null,
        confirmed_recipients: null,
        distribution_status: 'new',
        is_new: true,
        capture_channel: 'web',
        marked_ready_at: null,
        created_at: '2024-01-01T12:00:00.000Z',
        summary_id: null,
        sent_at: null,
        comment_count: 0,
        like_count: 0,
        view_count: 0,
        response_count: 0,
        last_response_at: null,
        has_unread_responses: false,
        isLiked: false,
        children: {
          id: 'child-1',
          name: 'Charlie',
          birth_date: '2021-01-01T00:00:00.000Z',
          profile_photo_url: null,
        },
      },
    ]

    ;(getRecentMemoriesWithStats as jest.Mock).mockResolvedValue({
      memories: mockMemories,
      newMemoriesCount: 2,
    })

    render(<MemoryList limit={5} />)

    expect(await screen.findByText('2 new memories')).toBeInTheDocument()
    expect(getRecentMemoriesWithStats).toHaveBeenCalledWith(5)
  })
})
