import { getRecentMemoriesWithStats } from '@/lib/memories'

type JestMock = jest.Mock

jest.mock('@/lib/logger', () => {
  const logger = {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  }

  return {
    __esModule: true,
    createLogger: () => logger,
    mockLogger: logger,
  }
})

jest.mock('@/lib/supabase/client', () => {
  const supabaseMock = {
    auth: {
      getUser: jest.fn(),
    },
    from: jest.fn(),
  }

  return {
    __esModule: true,
    createClient: () => supabaseMock,
    mockSupabase: supabaseMock,
  }
})

const { mockLogger } = jest.requireMock('@/lib/logger') as {
  mockLogger: {
    info: JestMock
    error: JestMock
    warn: JestMock
    debug: JestMock
  }
}

const { mockSupabase } = jest.requireMock('@/lib/supabase/client') as {
  mockSupabase: {
    auth: { getUser: JestMock }
    from: JestMock
  }
}

const mockMemoriesSelect = jest.fn()
const mockMemoriesEq = jest.fn()
const mockMemoriesGte = jest.fn()
const mockMemoriesOrder = jest.fn()
const mockMemoriesLimit = jest.fn()

const mockLikesSelect = jest.fn()
const mockLikesEq = jest.fn()
const mockLikesIn = jest.fn()

const mockResponsesSelect = jest.fn()
const mockResponsesIn = jest.fn()
const mockResponsesGroup = jest.fn()

describe('getRecentMemoriesWithStats', () => {
  beforeEach(() => {
    jest.clearAllMocks()

    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: 'parent-123' } },
      error: null,
    })

    mockSupabase.from.mockImplementation((table: string) => {
      switch (table) {
        case 'memories':
          return { select: mockMemoriesSelect }
        case 'likes':
          return { select: mockLikesSelect }
        case 'responses':
          return { select: mockResponsesSelect }
        default:
          throw new Error(`Unexpected table ${table}`)
      }
    })

    mockMemoriesSelect.mockReturnValue({ eq: mockMemoriesEq })
    mockMemoriesEq.mockReturnValue({ gte: mockMemoriesGte })
    mockMemoriesGte.mockReturnValue({ order: mockMemoriesOrder })
    mockMemoriesOrder.mockReturnValue({ limit: mockMemoriesLimit })

    mockLikesSelect.mockReturnValue({ eq: mockLikesEq })
    mockLikesEq.mockReturnValue({ in: mockLikesIn })

    mockResponsesSelect.mockReturnValue({ in: mockResponsesIn })
    mockResponsesIn.mockReturnValue({ group: mockResponsesGroup })
  })

  it('returns memories enriched with aggregated response stats', async () => {
    const memories = [
      {
        id: 'memory-1',
        parent_id: 'parent-123',
        child_id: 'child-1',
        content: 'First memory',
        subject: null,
        rich_content: null,
        content_format: 'plain',
        media_urls: [],
        milestone_type: null,
        metadata: null,
        ai_analysis: {},
        suggested_recipients: [],
        confirmed_recipients: [],
        distribution_status: 'new',
        is_new: true,
        capture_channel: 'web',
        marked_ready_at: null,
        created_at: '2024-01-01T00:00:00.000Z',
        summary_id: null,
        sent_at: null,
        comment_count: 1,
        like_count: 2,
        view_count: null,
        children: {
          id: 'child-1',
          name: 'Kid One',
          birth_date: '2020-01-01',
          profile_photo_url: null,
        },
      },
      {
        id: 'memory-2',
        parent_id: 'parent-123',
        child_id: 'child-2',
        content: 'Second memory',
        subject: null,
        rich_content: null,
        content_format: 'plain',
        media_urls: [],
        milestone_type: null,
        metadata: null,
        ai_analysis: {},
        suggested_recipients: [],
        confirmed_recipients: [],
        distribution_status: 'new',
        is_new: false,
        capture_channel: 'web',
        marked_ready_at: null,
        created_at: '2024-01-02T00:00:00.000Z',
        summary_id: null,
        sent_at: null,
        comment_count: 0,
        like_count: 0,
        view_count: null,
        children: {
          id: 'child-2',
          name: 'Kid Two',
          birth_date: '2021-01-01',
          profile_photo_url: null,
        },
      },
    ]

    mockMemoriesLimit.mockResolvedValue({ data: memories, error: null })
    mockLikesIn.mockResolvedValue({ data: [{ update_id: 'memory-1' }], error: null })
    mockResponsesGroup.mockResolvedValue({
      data: [
        {
          update_id: 'memory-1',
          response_count: 3,
          last_response_at: '2024-01-05T12:00:00.000Z',
        },
        {
          update_id: 'memory-2',
          response_count: 1,
          last_response_at: '2024-01-04T08:00:00.000Z',
        },
      ],
      error: null,
    })

    const result = await getRecentMemoriesWithStats(2)

    expect(mockMemoriesLimit).toHaveBeenCalledWith(2)
    expect(mockLikesIn).toHaveBeenCalledWith('update_id', ['memory-1', 'memory-2'])
    expect(mockResponsesSelect).toHaveBeenCalledWith('update_id,response_count:count(*),last_response_at:max(received_at)')
    expect(mockResponsesIn).toHaveBeenCalledWith('update_id', ['memory-1', 'memory-2'])
    expect(mockResponsesGroup).toHaveBeenCalledWith('update_id')

    expect(result).toEqual([
      {
        ...memories[0],
        response_count: 3,
        last_response_at: '2024-01-05T12:00:00.000Z',
        has_unread_responses: false,
        like_count: 2,
        comment_count: 1,
        isLiked: true,
      },
      {
        ...memories[1],
        response_count: 1,
        last_response_at: '2024-01-04T08:00:00.000Z',
        has_unread_responses: false,
        like_count: 0,
        comment_count: 0,
        isLiked: false,
      },
    ])
  })

  it('defaults stats when aggregated data is unavailable', async () => {
    const memories = [
      {
        id: 'memory-3',
        parent_id: 'parent-123',
        child_id: 'child-3',
        content: 'Third memory',
        subject: null,
        rich_content: null,
        content_format: 'plain',
        media_urls: [],
        milestone_type: null,
        metadata: null,
        ai_analysis: {},
        suggested_recipients: [],
        confirmed_recipients: [],
        distribution_status: 'new',
        is_new: true,
        capture_channel: 'web',
        marked_ready_at: null,
        created_at: '2024-01-03T00:00:00.000Z',
        summary_id: null,
        sent_at: null,
        comment_count: null,
        like_count: null,
        view_count: null,
        children: {
          id: 'child-3',
          name: 'Kid Three',
          birth_date: '2022-01-01',
          profile_photo_url: null,
        },
      },
    ]

    mockMemoriesLimit.mockResolvedValue({ data: memories, error: null })
    mockLikesIn.mockResolvedValue({ data: [], error: null })
    mockResponsesGroup.mockResolvedValue({ data: null, error: { message: 'boom' } })

    const result = await getRecentMemoriesWithStats(1)

    expect(mockLogger.error).toHaveBeenCalledWith(
      'Error fetching aggregated response stats',
      expect.objectContaining({
        requestId: expect.any(String),
        error: 'boom',
      })
    )

    expect(result).toEqual([
      {
        ...memories[0],
        response_count: 0,
        last_response_at: null,
        has_unread_responses: false,
        like_count: 0,
        comment_count: 0,
        isLiked: false,
      },
    ])
  })
})
