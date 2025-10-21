import { beforeEach, describe, expect, test, afterAll } from '@jest/globals'

jest.mock('@linear/sdk', () => {
  const createIssueMock = jest.fn().mockResolvedValue({
    success: true,
    issue: Promise.resolve({ id: 'ISSUE-123' }),
  })

  const mockClient = {
    teams: jest.fn().mockResolvedValue({ nodes: [{ id: 'team-1' }] }),
    issueLabels: jest.fn().mockResolvedValue({ nodes: [{ id: 'label-1' }] }),
    createIssueLabel: jest.fn().mockResolvedValue({
      success: true,
      issueLabel: Promise.resolve({ id: 'label-1' }),
    }),
    issues: jest.fn().mockResolvedValue({ nodes: [{ id: 'parent-1' }] }),
    createIssue: createIssueMock,
  }

  const LinearClient = jest.fn(() => mockClient)

  return {
    __esModule: true,
    LinearClient,
    __mock: {
      createIssueMock,
      mockClient,
    },
  }
})

const linearSdkMock = jest.requireMock('@linear/sdk') as {
  __mock: {
    createIssueMock: jest.Mock
    mockClient: {
      teams: jest.Mock
      issueLabels: jest.Mock
      createIssueLabel: jest.Mock
      issues: jest.Mock
      createIssue: jest.Mock
    }
  }
}

const ORIGINAL_ENV = { ...process.env }

describe('Feedback sanitization', () => {
  beforeEach(() => {
    process.env.LINEAR_API_KEY = 'test-linear-key'
    process.env.LINEAR_TEAM_ID = 'team-1'

    linearSdkMock.__mock.createIssueMock.mockClear()
    linearSdkMock.__mock.createIssueMock.mockResolvedValue({
      success: true,
      issue: Promise.resolve({ id: 'ISSUE-123' }),
    })

    Object.values(linearSdkMock.__mock.mockClient).forEach((maybeMock) => {
      if (typeof maybeMock === 'function' && 'mockClear' in maybeMock) {
        ;(maybeMock as jest.Mock).mockClear()
      }
    })
  })

  afterAll(() => {
    process.env.LINEAR_API_KEY = ORIGINAL_ENV.LINEAR_API_KEY
    process.env.LINEAR_TEAM_ID = ORIGINAL_ENV.LINEAR_TEAM_ID
  })

  test('feedbackRequestSchema removes malicious markup', async () => {
    const { feedbackRequestSchema, FeedbackType } = await import('../../lib/types/feedback.server')

    const result = feedbackRequestSchema.parse({
      type: FeedbackType.BUG,
      description: 'Legitimate <strong>feedback</strong><script>alert("xss")</script> please',
      pageUrl: ' https://example.com/feedback ',
      timestamp: ' 2024-01-01T00:00:00.000Z ',
      userEmail: ' tester@example.com ',
      screenshotUrls: [' https://example.com/screenshot.png '],
    })

    expect(result.description).toContain('Legitimate')
    expect(result.description).toContain('feedback')
    expect(result.description).toContain('please')
    expect(result.description).not.toContain('<script>')
    expect(result.description).not.toContain('alert(')
    expect(result.pageUrl).toBe('https://example.com/feedback')
    expect(result.timestamp).toBe('2024-01-01T00:00:00.000Z')
    expect(result.userEmail).toBe('tester@example.com')
    expect(result.screenshotUrls?.[0]).toBe('https://example.com/screenshot.png')
  })

  test('submitFeedbackToLinear uses sanitized values for issue creation', async () => {
    const { feedbackRequestSchema, FeedbackType } = await import('../../lib/types/feedback.server')
    const { submitFeedbackToLinear } = await import('../../lib/linear/client')

    const maliciousPayload = feedbackRequestSchema.parse({
      type: FeedbackType.OTHER,
      description: 'Important details<script>alert("pwned")</script> remain',
      pageUrl: 'https://example.com/path?param=value',
      timestamp: '2024-02-02T12:34:56.000Z',
      screenshotUrls: ['https://example.com/safe.png'],
    })

    const result = await submitFeedbackToLinear(maliciousPayload)

    expect(result.success).toBe(true)
    expect(linearSdkMock.__mock.createIssueMock).toHaveBeenCalledTimes(1)

    const issueInput = linearSdkMock.__mock.createIssueMock.mock.calls[0][0]

    expect(issueInput.title).not.toContain('<script>')
    expect(issueInput.title).not.toContain('alert(')
    expect(issueInput.description).toContain('Important details')
    expect(issueInput.description).toContain('remain')
    expect(issueInput.description).not.toContain('<script>')
    expect(issueInput.description).not.toContain('alert(')
    expect(issueInput.description).toContain('https://example.com/path?param=value')
  })
})
