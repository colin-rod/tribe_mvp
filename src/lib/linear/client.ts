import { LinearClient } from '@linear/sdk'
import { createLogger } from '@/lib/logger'
import type { FeedbackData } from '@/lib/types/feedback'

const logger = createLogger('LinearClient')

/**
 * Linear SDK client singleton
 */
let linearClient: LinearClient | null = null

/**
 * Get or create Linear client instance
 */
function getLinearClient(): LinearClient {
  if (!process.env.LINEAR_API_KEY) {
    throw new Error('LINEAR_API_KEY environment variable is not configured')
  }

  if (!linearClient) {
    linearClient = new LinearClient({
      apiKey: process.env.LINEAR_API_KEY,
    })
  }

  return linearClient
}

/**
 * Get the Linear team ID from environment or query
 */
async function getTeamId(): Promise<string> {
  // First try environment variable
  if (process.env.LINEAR_TEAM_ID) {
    return process.env.LINEAR_TEAM_ID
  }

  // Fall back to querying the first team
  const client = getLinearClient()
  const teams = await client.teams()

  if (!teams.nodes.length) {
    throw new Error('No Linear teams found for this API key')
  }

  const teamId = teams.nodes[0].id
  logger.info('Using first available Linear team', { teamId })

  return teamId
}

/**
 * Get or create the "beta feedback" label
 */
async function getBetaFeedbackLabelId(): Promise<string> {
  const client = getLinearClient()
  const teamId = await getTeamId()

  // Query for existing label
  const labels = await client.issueLabels({
    filter: {
      name: { eq: 'beta feedback' },
    },
  })

  if (labels.nodes.length > 0) {
    return labels.nodes[0].id
  }

  // Create label if it doesn't exist
  logger.info('Creating "beta feedback" label in Linear')
  const labelResult = await client.createIssueLabel({
    name: 'beta feedback',
    teamId,
    color: '#5E6AD2', // Linear purple
  })

  if (!labelResult.success || !labelResult.issueLabel) {
    throw new Error('Failed to create beta feedback label')
  }

  const issueLabel = await labelResult.issueLabel
  return issueLabel.id
}

/**
 * Get the parent issue ID (CRO-354)
 */
async function getParentIssueId(): Promise<string> {
  const client = getLinearClient()

  // Query for CRO-354
  const issues = await client.issues({
    filter: {
      number: { eq: 354 },
    },
  })

  if (issues.nodes.length === 0) {
    throw new Error('Parent issue CRO-354 not found')
  }

  return issues.nodes[0].id
}

/**
 * Format feedback data into Linear issue description
 */
function formatIssueDescription(feedback: FeedbackData): string {
  const sections = [
    '## Feedback',
    feedback.description,
    '',
    '## Metadata',
    `**Type:** ${feedback.type}`,
    `**Page:** ${feedback.pageUrl}`,
    `**User:** ${feedback.userEmail || 'Anonymous'}`,
    `**Timestamp:** ${feedback.timestamp}`,
  ]

  return sections.join('\n')
}

/**
 * Create issue title from feedback
 */
function createIssueTitle(feedback: FeedbackData): string {
  const maxLength = 50
  const descPreview = feedback.description.slice(0, maxLength)
  const truncated = feedback.description.length > maxLength ? '...' : ''

  return `[${feedback.type}] ${descPreview}${truncated}`
}

/**
 * Submit feedback to Linear as an issue
 */
export async function submitFeedbackToLinear(
  feedback: FeedbackData
): Promise<{ success: boolean; issueId?: string; error?: string }> {
  try {
    logger.info('Submitting feedback to Linear', {
      type: feedback.type,
      hasEmail: !!feedback.userEmail,
    })

    const client = getLinearClient()
    const teamId = await getTeamId()
    const labelId = await getBetaFeedbackLabelId()
    const parentId = await getParentIssueId()

    const issueResult = await client.createIssue({
      teamId,
      title: createIssueTitle(feedback),
      description: formatIssueDescription(feedback),
      parentId,
      labelIds: [labelId],
    })

    if (!issueResult.success || !issueResult.issue) {
      logger.error('Failed to create Linear issue', {
        success: issueResult.success,
      })
      return {
        success: false,
        error: 'Failed to create issue in Linear',
      }
    }

    const issue = await issueResult.issue
    logger.info('Successfully created Linear issue', {
      issueId: issue.id,
    })

    return {
      success: true,
      issueId: issue.id,
    }
  } catch (error) {
    logger.errorWithStack('Error submitting feedback to Linear', error as Error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Test Linear connection and configuration
 */
export async function testLinearConnection(): Promise<{
  success: boolean
  error?: string
}> {
  try {
    const client = getLinearClient()
    const viewer = await client.viewer

    logger.info('Linear connection test successful', {
      userName: viewer.name,
      userEmail: viewer.email,
    })

    return { success: true }
  } catch (error) {
    logger.errorWithStack('Linear connection test failed', error as Error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}
