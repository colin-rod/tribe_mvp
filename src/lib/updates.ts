import { createClient } from './supabase/client'
import type { DistributionStatus, MilestoneType } from './validation/update'
import { createLogger } from '@/lib/logger'


const logger = createLogger('Updates')

/**
 * Perform diagnostic checks when database errors occur
 */
async function performDiagnosticChecks(supabase: ReturnType<typeof createClient>, user: { id: string }, requestId: string) {
  logger.info('Performing diagnostic checks after error', { requestId })

  try {
    // Check if we can access any table
    const { data: healthCheck, error: healthError } = await supabase
      .from('children')
      .select('count', { count: 'exact', head: true })
      .eq('parent_id', user.id)

    if (healthError) {
      logger.error('Diagnostic: Cannot access children table', {
        requestId,
        error: {
          code: healthError.code,
          message: healthError.message,
          details: healthError.details
        }
      })
    } else {
      logger.info('Diagnostic: Successfully accessed children table', {
        requestId,
        childrenCount: healthCheck
      })
    }

    // Check current session status
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession()
    if (sessionError) {
      logger.error('Diagnostic: Session check failed', {
        requestId,
        sessionError: sessionError.message
      })
    } else {
      logger.info('Diagnostic: Session status', {
        requestId,
        hasSession: !!sessionData.session,
        hasUser: !!sessionData.session?.user,
        sessionExpiry: sessionData.session?.expires_at,
        accessToken: sessionData.session?.access_token ? 'Present' : 'Missing'
      })
    }

    // Check if we can access the updates table with a simpler query
    const { data: simpleQuery, error: simpleError } = await supabase
      .from('updates')
      .select('id')
      .eq('parent_id', user.id)
      .limit(1)

    if (simpleError) {
      logger.error('Diagnostic: Simple updates query failed', {
        requestId,
        error: {
          code: simpleError.code,
          message: simpleError.message,
          details: simpleError.details
        }
      })
    } else {
      logger.info('Diagnostic: Simple updates query succeeded', {
        requestId,
        hasUpdates: (simpleQuery?.length || 0) > 0
      })
    }

  } catch (diagnosticError) {
    logger.error('Diagnostic checks themselves failed', {
      requestId,
      diagnosticError: diagnosticError instanceof Error ? diagnosticError.message : 'Unknown'
    })
  }
}
export interface Update {
  id: string
  parent_id: string
  child_id: string
  content: string
  /** Optional email subject line for email-formatted updates */
  subject?: string
  /** Rich content stored as JSONB for advanced formatting (Quill Delta, HTML, etc.) */
  rich_content?: Record<string, unknown>
  /** Format type indicating how the content should be rendered and distributed */
  content_format?: 'plain' | 'rich' | 'email' | 'sms' | 'whatsapp'
  media_urls: string[]
  milestone_type?: MilestoneType
  ai_analysis: Record<string, unknown>
  suggested_recipients: string[]
  confirmed_recipients: string[]
  distribution_status: DistributionStatus
  created_at: string
  scheduled_for?: string
  sent_at?: string
}

export interface CreateUpdateRequest {
  child_id: string
  content: string
  /** Optional email subject line for email-formatted updates */
  subject?: string
  /** Rich content stored as JSONB for advanced formatting (Quill Delta, HTML, etc.) */
  rich_content?: Record<string, unknown>
  /** Format type indicating how the content should be rendered and distributed */
  content_format?: 'plain' | 'rich' | 'email' | 'sms' | 'whatsapp'
  milestone_type?: MilestoneType
  media_urls?: string[]
  scheduled_for?: Date
  confirmed_recipients?: string[]
  ai_analysis?: Record<string, unknown>
  suggested_recipients?: string[]
}

export type UpdateWithStats = Update & {
  response_count: number
  last_response_at: string | null
  has_unread_responses: boolean
  // Engagement fields
  like_count: number
  comment_count: number
  isLiked: boolean
}

/**
 * Create a new update
 */
export async function createUpdate(updateData: CreateUpdateRequest): Promise<Update> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) throw new Error('Not authenticated')

  const { data, error } = await supabase
    .from('updates')
    .insert({
      parent_id: user.id,
      child_id: updateData.child_id,
      content: updateData.content,
      subject: updateData.subject,
      rich_content: updateData.rich_content,
      content_format: updateData.content_format || 'plain',
      milestone_type: updateData.milestone_type,
      media_urls: updateData.media_urls || [],
      ai_analysis: updateData.ai_analysis || {},
      suggested_recipients: updateData.suggested_recipients || [],
      confirmed_recipients: updateData.confirmed_recipients || [],
      distribution_status: updateData.scheduled_for ? 'scheduled' : 'draft',
      scheduled_for: updateData.scheduled_for?.toISOString()
    })
    .select()
    .single()

  if (error) throw error
  return data
}

/**
 * Get updates for the current user
 */
export async function getUpdates(limit?: number): Promise<Update[]> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) throw new Error('Not authenticated')

  let query = supabase
    .from('updates')
    .select(`
      *,
      children:child_id (
        name,
        birth_date,
        profile_photo_url
      )
    `)
    .eq('parent_id', user.id)
    .order('created_at', { ascending: false })

  if (limit) {
    query = query.limit(limit)
  }

  const { data, error } = await query

  if (error) throw error
  return data || []
}

/**
 * Get a specific update by ID
 */
export async function getUpdateById(updateId: string): Promise<Update | null> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) throw new Error('Not authenticated')

  const { data, error } = await supabase
    .from('updates')
    .select(`
      *,
      children:child_id (
        name,
        birth_date,
        profile_photo_url
      )
    `)
    .eq('id', updateId)
    .eq('parent_id', user.id)
    .single()

  if (error) {
    if (error.code === 'PGRST116') return null
    throw error
  }
  return data
}

/**
 * Update an existing update
 */
export async function updateUpdate(
  updateId: string,
  updates: Partial<Omit<Update, 'id' | 'parent_id' | 'created_at'>>
): Promise<Update> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) throw new Error('Not authenticated')

  const { data, error } = await supabase
    .from('updates')
    .update(updates)
    .eq('id', updateId)
    .eq('parent_id', user.id)
    .select()
    .single()

  if (error) throw error
  return data
}

/**
 * Delete an update
 */
export async function deleteUpdate(updateId: string): Promise<void> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) throw new Error('Not authenticated')

  // First get the update to check for media files
  const { data: update, error: fetchError } = await supabase
    .from('updates')
    .select('media_urls')
    .eq('id', updateId)
    .eq('parent_id', user.id)
    .single()

  if (fetchError) throw fetchError

  // Delete the update from database
  const { error } = await supabase
    .from('updates')
    .delete()
    .eq('id', updateId)
    .eq('parent_id', user.id)

  if (error) throw error

  // Delete associated media files from storage
  if (update.media_urls && update.media_urls.length > 0) {
    try {
      const filePaths = update.media_urls.map((url: string) => {
        // Extract file path from URL
        const urlParts = url.split('/')
        const fileName = urlParts[urlParts.length - 1].split('?')[0]
        return `${user.id}/updates/${updateId}/${fileName}`
      })

      const { error: storageError } = await supabase.storage
        .from('media')
        .remove(filePaths)

      if (storageError) {
        logger.warn('Failed to delete media files from storage:', { data: storageError })
      }
    } catch (error) {
      logger.warn('Error deleting media files:', { data: error })
    }
  }
}

/**
 * Mark an update as sent
 */
export async function markUpdateAsSent(updateId: string): Promise<Update> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) throw new Error('Not authenticated')

  const { data, error } = await supabase
    .from('updates')
    .update({
      distribution_status: 'sent',
      sent_at: new Date().toISOString()
    })
    .eq('id', updateId)
    .eq('parent_id', user.id)
    .select()
    .single()

  if (error) throw error
  return data
}

/**
 * Update recipients for an update
 */
export async function updateUpdateRecipients(
  updateId: string,
  suggestedRecipients: string[],
  confirmedRecipients: string[]
): Promise<Update> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) throw new Error('Not authenticated')

  const { data, error } = await supabase
    .from('updates')
    .update({
      suggested_recipients: suggestedRecipients,
      confirmed_recipients: confirmedRecipients
    })
    .eq('id', updateId)
    .eq('parent_id', user.id)
    .select()
    .single()

  if (error) throw error
  return data
}

/**
 * Update AI analysis for an update
 */
export async function updateUpdateAIAnalysis(
  updateId: string,
  aiAnalysis: Record<string, unknown>
): Promise<Update> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) throw new Error('Not authenticated')

  const { data, error } = await supabase
    .from('updates')
    .update({
      ai_analysis: aiAnalysis
    })
    .eq('id', updateId)
    .eq('parent_id', user.id)
    .select()
    .single()

  if (error) throw error
  return data
}

/**
 * Update media URLs for an update
 */
export async function updateUpdateMediaUrls(
  updateId: string,
  mediaUrls: string[]
): Promise<Update> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) throw new Error('Not authenticated')

  const { data, error } = await supabase
    .from('updates')
    .update({
      media_urls: mediaUrls
    })
    .eq('id', updateId)
    .eq('parent_id', user.id)
    .select()
    .single()

  if (error) throw error
  return data
}

/**
 * Get updates by child ID
 */
export async function getUpdatesByChild(childId: string): Promise<Update[]> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) throw new Error('Not authenticated')

  const { data, error } = await supabase
    .from('updates')
    .select('*')
    .eq('parent_id', user.id)
    .eq('child_id', childId)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data || []
}

/**
 * Get recent updates (last 30 days)
 */
export async function getRecentUpdates(): Promise<Update[]> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) throw new Error('Not authenticated')

  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

  const { data, error } = await supabase
    .from('updates')
    .select(`
      *,
      children:child_id (
        name,
        birth_date,
        profile_photo_url
      )
    `)
    .eq('parent_id', user.id)
    .gte('created_at', thirtyDaysAgo.toISOString())
    .order('created_at', { ascending: false })

  if (error) throw error
  return data || []
}

/**
 * Schedule an update for later sending
 */
export async function scheduleUpdate(
  updateId: string,
  scheduledFor: Date
): Promise<Update> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) throw new Error('Not authenticated')

  const { data, error } = await supabase
    .from('updates')
    .update({
      scheduled_for: scheduledFor.toISOString(),
      distribution_status: 'scheduled'
    })
    .eq('id', updateId)
    .eq('parent_id', user.id)
    .select()
    .single()

  if (error) throw error
  return data
}

/**
 * Get draft updates
 */
export async function getDraftUpdates(): Promise<Update[]> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) throw new Error('Not authenticated')

  const { data, error } = await supabase
    .from('updates')
    .select(`
      *,
      children:child_id (
        name,
        birth_date,
        profile_photo_url
      )
    `)
    .eq('parent_id', user.id)
    .eq('distribution_status', 'draft')
    .order('created_at', { ascending: false })

  if (error) throw error
  return data || []
}

/**
 * Update subject and content format for an update
 */
export async function updateUpdateContent(
  updateId: string,
  content?: string,
  subject?: string,
  richContent?: Record<string, unknown>,
  contentFormat?: 'plain' | 'rich' | 'email' | 'sms' | 'whatsapp'
): Promise<Update> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) throw new Error('Not authenticated')

  const updateData: Partial<Update> = {}
  if (content !== undefined) updateData.content = content
  if (subject !== undefined) updateData.subject = subject
  if (richContent !== undefined) updateData.rich_content = richContent
  if (contentFormat !== undefined) updateData.content_format = contentFormat

  const { data, error } = await supabase
    .from('updates')
    .update(updateData)
    .eq('id', updateId)
    .eq('parent_id', user.id)
    .select()
    .single()

  if (error) throw error
  return data
}

/**
 * Get recent updates with response counts for dashboard display
 * Always returns an array, never null or undefined
 */
export async function getRecentUpdatesWithStats(limit: number = 5): Promise<UpdateWithStats[]> {
  const startTime = Date.now()
  const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  const supabase = createClient()

  // Wrap entire function in try-catch to ensure we always return an array
  try {

  logger.info('Starting getRecentUpdatesWithStats request', {
    limit,
    requestId,
    timestamp: new Date().toISOString()
  })

  // Log detailed client connection status
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'unknown'
  logger.debug('Supabase client configuration', {
    requestId,
    supabaseUrl,
    supabaseKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.substring(0, 20) + '...' || 'unknown',
    clientType: 'browser',
    restUrl: `${supabaseUrl}/rest/v1`,
    authUrl: `${supabaseUrl}/auth/v1`
  })

  // Check authentication with comprehensive error capture
  logger.debug('Checking user authentication', { requestId })
  const authStartTime = Date.now()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  const authEndTime = Date.now()

  if (authError) {
    logger.error('Authentication error in getRecentUpdatesWithStats', {
      requestId,
      error: {
        code: authError.code,
        message: authError.message,
        details: (authError as unknown as Record<string, unknown>).details,
        hint: (authError as unknown as Record<string, unknown>).hint,
        status: (authError as unknown as Record<string, unknown>).status,
        statusCode: (authError as unknown as Record<string, unknown>).statusCode,
        statusText: (authError as unknown as Record<string, unknown>).statusText,
        headers: (authError as unknown as Record<string, unknown>).headers,
        name: authError.name,
        stack: authError.stack
      },
      authDuration: authEndTime - authStartTime,
      supabaseUrl,
      timestamp: new Date().toISOString()
    })
    logger.info('Returning empty array due to authentication error', { requestId, errorCode: authError.code })
    return []
  }

  if (!user) {
    logger.error('No user session found', {
      requestId,
      authDuration: authEndTime - authStartTime,
      supabaseUrl,
      timestamp: new Date().toISOString()
    })
    logger.info('Returning empty array due to no user session', { requestId })
    return []
  }

  // Log session details for debugging
  const sessionDetails = {
    userId: user.id,
    email: user.email,
    lastSignIn: user.last_sign_in_at,
    emailConfirmed: user.email_confirmed_at,
    userMetadata: user.user_metadata,
    appMetadata: user.app_metadata,
    role: user.role,
    aud: user.aud,
    sessionFactors: user.factors,
    authDuration: authEndTime - authStartTime
  }

  logger.info('User authenticated successfully', {
    requestId,
    ...sessionDetails
  })

  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

  // Get basic update data with child information and engagement counts
  const queryParams = {
    userId: user.id,
    thirtyDaysAgo: thirtyDaysAgo.toISOString(),
    limit,
    requestId
  }

  logger.info('Querying updates table', queryParams)

  // Add request tracing
  const queryStartTime = Date.now()
  const queryUrl = `${supabaseUrl}/rest/v1/updates`

  logger.debug('Executing updates query', {
    requestId,
    queryUrl,
    parameters: {
      select: 'updates with children join',
      parent_id: user.id,
      created_at_gte: thirtyDaysAgo.toISOString(),
      order: 'created_at desc',
      limit
    },
    expectedResponseFormat: 'array of updates with children'
  })

  const { data: updates, error } = await supabase
    .from('updates')
    .select(`
      *,
      children:child_id (
        id,
        name,
        birth_date,
        profile_photo_url
      )
    `)
    .eq('parent_id', user.id)
    .gte('created_at', thirtyDaysAgo.toISOString())
    .order('created_at', { ascending: false })
    .limit(limit)

  const queryEndTime = Date.now()

  if (error) {
    const errorDetails = {
      requestId,
      queryDuration: queryEndTime - queryStartTime,
      totalDuration: queryEndTime - startTime,
      queryUrl,
      error: {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint,
        status: (error as unknown as Record<string, unknown>).status,
        statusCode: (error as unknown as Record<string, unknown>).statusCode,
        statusText: (error as unknown as Record<string, unknown>).statusText,
        headers: (error as unknown as Record<string, unknown>).headers,
        name: error.name,
        stack: error.stack
      },
      supabaseDetails: {
        url: supabaseUrl,
        restUrl: queryUrl,
        method: 'GET',
        authHeader: user ? 'Bearer [REDACTED]' : 'None'
      },
      queryContext: {
        userId: user.id,
        limit,
        dateRange: {
          from: thirtyDaysAgo.toISOString(),
          to: new Date().toISOString()
        }
      },
      timestamp: new Date().toISOString()
    }

    // Special handling for HTTP 406 errors
    if (error.code === 'PGRST301' || (error as unknown as { statusCode?: number }).statusCode === 406) {
      logger.error('HTTP 406 Not Acceptable - possible RLS or permission issue', errorDetails)

      // Additional debugging for 406 errors
      logger.debug('RLS Policy Debugging Info', {
        requestId,
        tableName: 'updates',
        operation: 'SELECT',
        userId: user.id,
        userRole: user.role,
        policies: 'Checking if user can access their own updates',
        expectedRLS: 'parent_id = auth.uid()'
      })

      // Run diagnostic checks for 406 errors
      await performDiagnosticChecks(supabase, user, requestId)
    } else {
      logger.error('Database query failed with unexpected error', errorDetails)

      // Run diagnostic checks for any database error
      await performDiagnosticChecks(supabase, user, requestId)
    }

    // Return empty array instead of throwing error to prevent null access errors
    logger.info('Returning empty array due to database error', { requestId, errorCode: error.code })
    return []
  }

  logger.info('Successfully retrieved updates from database', {
    requestId,
    count: updates?.length || 0,
    updateIds: updates?.map(u => u.id) || [],
    queryDuration: queryEndTime - queryStartTime,
    dataSize: JSON.stringify(updates || []).length,
    hasChildrenData: updates?.every(u => u.children) || false,
    timestamp: new Date().toISOString()
  })

  if (!updates || updates.length === 0) {
    return []
  }

  // Get the update IDs for batch queries
  const updateIds = updates.map(update => update.id)

  // Get user's likes for these updates in a single query
  logger.info('Querying likes table', { requestId, updateIds, updateCount: updateIds.length })

  const likesQueryStart = Date.now()
  const { data: userLikes, error: likesError } = await supabase
    .from('likes')
    .select('update_id')
    .eq('parent_id', user.id)
    .in('update_id', updateIds)
  const likesQueryEnd = Date.now()

  if (likesError) {
    logger.warn('Error querying likes table (non-fatal)', {
      requestId,
      error: {
        code: likesError.code,
        message: likesError.message,
        details: likesError.details,
        hint: likesError.hint,
        status: (likesError as unknown as Record<string, unknown>).status,
        statusCode: (likesError as unknown as Record<string, unknown>).statusCode
      },
      queryDuration: likesQueryEnd - likesQueryStart,
      updateIds,
      timestamp: new Date().toISOString()
    })
    // Continue with empty likes array if query fails
  }

  const likedUpdateIds = new Set(userLikes?.map(like => like.update_id) || [])

  // Get response counts and engagement data for each update
  logger.info('Getting response counts for updates', {
    requestId,
    updateIds,
    updateCount: updateIds.length,
    likesFound: userLikes?.length || 0,
    likesQueryDuration: likesQueryEnd - likesQueryStart
  })

  const updatesWithStats = await Promise.all(
    updates.map(async (update) => {
      logger.debug('Querying responses for update', { updateId: update.id })

      try {
        // Get response count with detailed error tracking
        const responseCountStart = Date.now()
        const { count, error: countError } = await supabase
          .from('responses')
          .select('*', { count: 'exact', head: true })
          .eq('update_id', update.id)
        const responseCountEnd = Date.now()

        if (countError) {
          logger.error('Error getting response count for update', {
            requestId,
            updateId: update.id,
            error: {
              code: countError.code,
              message: countError.message,
              details: countError.details,
              hint: countError.hint,
              status: (countError as unknown as Record<string, unknown>).status,
              statusCode: (countError as unknown as Record<string, unknown>).statusCode,
              statusText: (countError as unknown as Record<string, unknown>).statusText
            },
            queryDuration: responseCountEnd - responseCountStart,
            tableName: 'responses',
            operation: 'COUNT',
            timestamp: new Date().toISOString()
          })
          // Set count to 0 if query fails to prevent null access
        }

        // Get last response with detailed error tracking
        const lastResponseStart = Date.now()
        const { data: lastResponseData, error: lastResponseError } = await supabase
          .from('responses')
          .select('received_at')
          .eq('update_id', update.id)
          .order('received_at', { ascending: false })
          .limit(1)
        const lastResponseEnd = Date.now()

        if (lastResponseError) {
          logger.error('Error getting last response for update', {
            requestId,
            updateId: update.id,
            error: {
              code: lastResponseError.code,
              message: lastResponseError.message,
              details: lastResponseError.details,
              hint: lastResponseError.hint,
              status: (lastResponseError as unknown as Record<string, unknown>).status,
              statusCode: (lastResponseError as unknown as Record<string, unknown>).statusCode,
              statusText: (lastResponseError as unknown as Record<string, unknown>).statusText
            },
            queryDuration: lastResponseEnd - lastResponseStart,
            tableName: 'responses',
            operation: 'SELECT_LATEST',
            timestamp: new Date().toISOString()
          })
          // Continue with null lastResponse if query fails
        }

        // Extract first response from array or use null
        const lastResponse = lastResponseData && lastResponseData.length > 0 ? lastResponseData[0] : null

        const result = {
          ...update,
          response_count: count || 0,
          last_response_at: lastResponse?.received_at || null,
          has_unread_responses: false, // For now, we'll implement this later
          // Engagement fields
          like_count: update.like_count || 0,
          comment_count: update.comment_count || 0,
          isLiked: likedUpdateIds.has(update.id)
        }

        logger.debug('Processed update stats', {
          requestId,
          updateId: update.id,
          responseCount: result.response_count,
          lastResponseAt: result.last_response_at,
          isLiked: result.isLiked,
          responseCountDuration: responseCountEnd - responseCountStart,
          lastResponseDuration: lastResponseEnd - lastResponseStart,
          childName: update.children?.name || 'Unknown',
          contentLength: update.content?.length || 0
        })

        return result
        } catch (updateError) {
        logger.error('Error processing individual update stats', {
          requestId,
          updateId: update.id,
          error: updateError instanceof Error ? updateError.message : 'Unknown',
          timestamp: new Date().toISOString()
        })

        // Return update with default stats if processing fails
        return {
          ...update,
          response_count: 0,
          last_response_at: null,
          has_unread_responses: false,
          like_count: update.like_count || 0,
          comment_count: update.comment_count || 0,
          isLiked: false
        }
      }
    })
  )

  const endTime = Date.now()
  const totalDuration = endTime - startTime

  logger.info('Successfully completed getRecentUpdatesWithStats', {
    requestId,
    totalUpdates: updatesWithStats.length,
    totalResponses: updatesWithStats.reduce((sum, u) => sum + u.response_count, 0),
    totalLikes: updatesWithStats.filter(u => u.isLiked).length,
    performance: {
      totalDuration,
      queryDuration: queryEndTime - queryStartTime,
      likesQueryDuration: likesQueryEnd - likesQueryStart,
      avgUpdateProcessing: updatesWithStats.length > 0 ? totalDuration / updatesWithStats.length : 0
    },
    dataTransferred: JSON.stringify(updatesWithStats).length,
    timestamp: new Date().toISOString()
  })

  return updatesWithStats as UpdateWithStats[]

  } catch (globalError) {
    const endTime = Date.now()
    const totalDuration = endTime - startTime

    logger.error('Critical error in getRecentUpdatesWithStats - returning empty array', {
      requestId,
      error: globalError instanceof Error ? {
        message: globalError.message,
        name: globalError.name,
        stack: globalError.stack
      } : globalError,
      totalDuration,
      timestamp: new Date().toISOString()
    })

    // Always return empty array, never null or undefined
    return []
  }
}
