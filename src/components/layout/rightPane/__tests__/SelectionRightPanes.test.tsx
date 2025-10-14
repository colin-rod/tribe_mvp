import { render, screen, waitFor } from '@testing-library/react'
import { RecipientsRightPane } from '../RecipientsRightPane'
import { SummaryRightPane } from '../SummaryRightPane'
import { DraftsRightPane } from '../DraftsRightPane'
import { useViewSelection } from '@/contexts/ViewSelectionContext'
import { getRecipientById, getRecipientsByIds, type Recipient } from '@/lib/recipients'
import { getSummaryById, getRecentSummaries, type SummaryListItem } from '@/lib/services/summaryService'
import { getDraftById } from '@/lib/services/draftService'
import { getChildById, type Child } from '@/lib/children'
import type { Summary } from '@/lib/types/summary'
import type { DraftUpdate } from '@/lib/types/digest'

jest.mock('@/contexts/ViewSelectionContext', () => ({
  useViewSelection: jest.fn()
}))

jest.mock('@/lib/recipients', () => ({
  getRecipientById: jest.fn(),
  getRecipientsByIds: jest.fn()
}))

jest.mock('@/lib/services/summaryService', () => ({
  getSummaryById: jest.fn(),
  getRecentSummaries: jest.fn()
}))

jest.mock('@/lib/services/draftService', () => ({
  getDraftById: jest.fn()
}))

jest.mock('@/lib/children', () => ({
  getChildById: jest.fn()
}))

jest.mock('@/components/ui/LoadingState', () => ({
  LoadingState: () => null
}))

const mockUseViewSelection = useViewSelection as jest.MockedFunction<typeof useViewSelection>
const mockGetRecipientById = getRecipientById as jest.MockedFunction<typeof getRecipientById>
const mockGetRecipientsByIds = getRecipientsByIds as jest.MockedFunction<typeof getRecipientsByIds>
const mockGetSummaryById = getSummaryById as jest.MockedFunction<typeof getSummaryById>
const mockGetRecentSummaries = getRecentSummaries as jest.MockedFunction<typeof getRecentSummaries>
const mockGetDraftById = getDraftById as jest.MockedFunction<typeof getDraftById>
const mockGetChildById = getChildById as jest.MockedFunction<typeof getChildById>

describe('RecipientsRightPane', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders empty state when no recipient is selected', () => {
    mockUseViewSelection.mockReturnValue({ selectedId: null } as any)

    render(<RecipientsRightPane />)

    expect(screen.getByText(/Select a recipient/i)).toBeInTheDocument()
  })

  it('renders recipient details when a recipient is selected', async () => {
    const recipient: Recipient = {
      id: 'recipient-1',
      parent_id: 'parent-1',
      name: 'Test Recipient',
      email: 'test@example.com',
      phone: '+1 (555) 555-5555',
      relationship: 'grandparent' as Recipient['relationship'],
      group_id: null,
      frequency: 'weekly' as Recipient['frequency'],
      preferred_channels: ['email'],
      content_types: ['photos'],
      importance_threshold: undefined,
      overrides_group_default: false,
      preference_token: 'token',
      is_active: true,
      created_at: new Date().toISOString(),
      group: { id: 'group-1', name: 'Family', created_at: null, parent_id: 'parent-1', description: null }
    }

    mockUseViewSelection.mockReturnValue({ selectedId: recipient.id } as any)
    mockGetRecipientById.mockResolvedValue(recipient)

    render(<RecipientsRightPane />)

    await waitFor(() => {
      expect(screen.getByText(recipient.name)).toBeInTheDocument()
    })

    expect(mockGetRecipientById).toHaveBeenCalledWith(recipient.id)
  })
})

describe('SummaryRightPane', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders empty state when no summary is selected', () => {
    mockUseViewSelection.mockReturnValue({ selectedId: null } as any)

    render(<SummaryRightPane />)

    expect(screen.getByText(/Select a summary/i)).toBeInTheDocument()
  })

  it('renders summary information when a summary is selected', async () => {
    const summary: Summary = {
      id: 'summary-1',
      parent_id: 'parent-1',
      title: 'Weekly Digest',
      digest_date: new Date().toISOString(),
      date_range_start: new Date().toISOString(),
      date_range_end: new Date().toISOString(),
      status: 'ready',
      ai_compilation_data: {},
      recipient_breakdown: {},
      total_updates: 3,
      total_recipients: 5,
      sent_count: 5,
      failed_count: 0,
      compiled_at: undefined,
      approved_at: undefined,
      sent_at: new Date().toISOString(),
      auto_publish_hours: 24,
      last_reminder_sent_at: null,
      reminder_count: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      parent_narrative: undefined
    }

    const recentSummaries: SummaryListItem[] = [
      {
        id: summary.id,
        title: summary.title,
        status: summary.status,
        total_recipients: summary.total_recipients,
        sent_at: summary.sent_at,
        digest_date: summary.digest_date,
        created_at: summary.created_at
      }
    ]

    mockUseViewSelection.mockReturnValue({ selectedId: summary.id } as any)
    mockGetSummaryById.mockResolvedValue(summary)
    mockGetRecentSummaries.mockResolvedValue(recentSummaries)

    render(<SummaryRightPane />)

    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 2, name: summary.title })).toBeInTheDocument()
    })

    expect(mockGetSummaryById).toHaveBeenCalledWith(summary.id)
  })
})

describe('DraftsRightPane', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders empty state when no draft is selected', () => {
    mockUseViewSelection.mockReturnValue({ selectedId: null } as any)

    render(<DraftsRightPane />)

    expect(screen.getByText(/Select a draft/i)).toBeInTheDocument()
  })

  it('renders draft information when a draft is selected', async () => {
    const draft: DraftUpdate = {
      id: 'draft-1',
      parent_id: 'parent-1',
      child_id: 'child-1',
      content: 'Draft content',
      subject: 'Draft Subject',
      rich_content: undefined,
      content_format: 'plain',
      media_urls: ['https://example.com/photo.jpg'],
      milestone_type: null,
      distribution_status: 'draft',
      version: 1,
      edit_count: 0,
      last_edited_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      confirmed_recipients: ['recipient-1'],
      suggested_recipients: null,
      summary_id: null,
      ai_analysis: null as any,
      ai_suggested_importance: null,
      importance_level: null,
      importance_overridden: null,
      is_new: true,
      capture_channel: null,
      response_count: null,
      scheduled_for: new Date().toISOString(),
      search_vector: null,
      sent_at: null,
      comment_count: null,
      like_count: null,
      view_count: null,
      metadata: null
    }

    const child: Child = {
      id: 'child-1',
      parent_id: 'parent-1',
      name: 'Avery',
      birth_date: new Date().toISOString(),
      profile_photo_url: null,
      created_at: new Date().toISOString()
    }

    const recipients: Recipient[] = [
      {
        id: 'recipient-1',
        parent_id: 'parent-1',
        name: 'Draft Recipient',
        email: 'draft@example.com',
        phone: null,
        relationship: 'friend' as Recipient['relationship'],
        group_id: null,
        frequency: 'weekly' as Recipient['frequency'],
        preferred_channels: ['email'],
        content_types: ['photos'],
        importance_threshold: undefined,
        overrides_group_default: false,
        preference_token: 'token',
        is_active: true,
        created_at: new Date().toISOString(),
        group: { id: 'group-1', name: 'Friends', created_at: null, parent_id: 'parent-1', description: null }
      }
    ]

    mockUseViewSelection.mockReturnValue({ selectedId: draft.id } as any)
    mockGetDraftById.mockResolvedValue(draft)
    mockGetChildById.mockResolvedValue(child)
    mockGetRecipientsByIds.mockResolvedValue(recipients)

    render(<DraftsRightPane />)

    await waitFor(() => {
      expect(screen.getByText(draft.subject!)).toBeInTheDocument()
    })

    expect(mockGetDraftById).toHaveBeenCalledWith(draft.id)
    expect(mockGetRecipientsByIds).toHaveBeenCalledWith(draft.confirmed_recipients as string[])
  })
})
