import { createClient } from './supabase/client'
import { createLogger } from '@/lib/logger'
import type { Json } from '@/lib/types/database.types'
import type { Memory, CreateMemoryRequest, RecentMemoriesWithStatsResult, MemoryWithStats } from './types/memory'

const logger = createLogger('Memories')

function attachNewMemoriesCount(memories: MemoryWithStats[], newMemoriesCount: number): RecentMemoriesWithStatsResult {
  Object.defineProperty(memories, 'newMemoriesCount', {
    value: newMemoriesCount,
    enumerable: false,
    writable: false,
    configurable: true
  })

  return memories
}

/**
 * Perform diagnostic checks when database errors occur
 * Temporarily disabled - uncomment if needed for debugging
 */
// async function performDiagnosticChecks(supabase: ReturnType<typeof createClient>, user: { id: string }, requestId: string) {
//   logger.info('Performing diagnostic checks after error', { requestId })

//   try {
//     // Check if we can access any table
//     const { data: healthCheck, error: healthError } = await supabase
//       .from('children')
//       .select('count', { count: 'exact', head: true })
//       .eq('parent_id', user.id)

//     if (healthError) {
//       logger.error('Diagnostic: Cannot access children table', {
//         requestId,
//         error: {
//           code: healthError.code,
//           message: healthError.message,
//           details: healthError.details
//         }
//       })
//     } else {
//       logger.info('Diagnostic: Successfully accessed children table', {
//         requestId,
//         childrenCount: healthCheck
//       })
//     }

//     // Check current session status
//     const { data: sessionData, error: sessionError } = await supabase.auth.getSession()
//     if (sessionError) {
//       logger.error('Diagnostic: Session check failed', {
//         requestId,
//         sessionError: sessionError.message
//       })
//     } else {
//       logger.info('Diagnostic: Session status', {
//         requestId,
//         hasSession: !!sessionData.session,
//         hasUser: !!sessionData.session?.user,
//         sessionExpiry: sessionData.session?.expires_at,
//         accessToken: sessionData.session?.access_token ? 'Present' : 'Missing'
//       })
//     }

//     // Check if we can access the memories table with a simpler query
//     const { data: simpleQuery, error: simpleError } = await supabase
//       .from('memories')
//       .select('id')
//       .eq('parent_id', user.id)
//       .limit(1)

//     if (simpleError) {
//       logger.error('Diagnostic: Simple memories query failed', {
//         requestId,
//         error: {
//           code: simpleError.code,
//           message: simpleError.message,
//           details: simpleError.details
//         }
//       })
//     } else {
//       logger.info('Diagnostic: Simple memories query succeeded', {
//         requestId,
//         hasMemories: (simpleQuery?.length || 0) > 0
//       })
//     }

//   } catch (diagnosticError) {
//     logger.error('Diagnostic checks themselves failed', {
//       requestId,
//       diagnosticError: diagnosticError instanceof Error ? diagnosticError.message : 'Unknown'
//     })
//   }
// }

/**
 * Create a new memory
 */
export async function createMemory(memoryData: CreateMemoryRequest): Promise<Memory> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) throw new Error('Not authenticated')

  const { data, error} = await supabase
    .from('memories')
    .insert({
      parent_id: user.id,
      child_id: memoryData.child_id,
      content: memoryData.content,
      subject: memoryData.subject,
      rich_content: memoryData.rich_content as Json | undefined,
      content_format: memoryData.content_format || 'plain',
      milestone_type: memoryData.milestone_type,
      metadata: memoryData.metadata as Json | undefined,
      media_urls: memoryData.media_urls || [],
      ai_analysis: (memoryData.ai_analysis as Json | undefined) || {},
      suggested_recipients: memoryData.suggested_recipients || [],
      confirmed_recipients: memoryData.confirmed_recipients || [],
      distribution_status: 'new',  // All new memories start as 'new'
      is_new: true,  // Badge indicator
      capture_channel: memoryData.capture_channel || 'web'
    })
    .select()
    .single()

  if (error) throw error
  return data as Memory
}

/**
 * Get memories for the current user
 */
export async function getMemories(limit?: number): Promise<Memory[]> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) throw new Error('Not authenticated')

  let query = supabase
    .from('memories')
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
  return (data || []) as Memory[]
}

/**
 * Get a specific memory by ID
 */
export async function getMemoryById(memoryId: string): Promise<Memory | null> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) throw new Error('Not authenticated')

  const { data, error } = await supabase
    .from('memories')
    .select(`
      *,
      children:child_id (
        name,
        birth_date,
        profile_photo_url
      )
    `)
    .eq('id', memoryId)
    .eq('parent_id', user.id)
    .single()

  if (error) {
    if (error.code === 'PGRST116') return null
    throw error
  }
  return data as Memory
}

/**
 * Update an existing memory
 */
export async function updateMemory(
  memoryId: string,
  updates: Partial<Omit<Memory, 'id' | 'parent_id' | 'created_at'>>
): Promise<Memory> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) throw new Error('Not authenticated')

  const { data, error } = await supabase
    .from('memories')
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .update(updates as any)
    .eq('id', memoryId)
    .eq('parent_id', user.id)
    .select()
    .single()

  if (error) throw error
  return data as Memory
}

/**
 * Delete a memory
 */
export async function deleteMemory(memoryId: string): Promise<void> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) throw new Error('Not authenticated')

  // First get the memory to check for media files
  const { data: memory, error: fetchError } = await supabase
    .from('memories')
    .select('media_urls')
    .eq('id', memoryId)
    .eq('parent_id', user.id)
    .single()

  type MemoryWithMedia = {
    media_urls: string[] | null
  }

  if (fetchError) throw fetchError

  // Delete the memory from database
  const { error } = await supabase
    .from('memories')
    .delete()
    .eq('id', memoryId)
    .eq('parent_id', user.id)

  if (error) throw error

  const typedMemory = memory as MemoryWithMedia

  // Delete associated media files from storage
  if (typedMemory.media_urls && typedMemory.media_urls.length > 0) {
    try {
      const filePaths = typedMemory.media_urls.map((url: string) => {
        // Extract file path from URL
        const urlParts = url.split('/')
        const fileName = urlParts[urlParts.length - 1].split('?')[0]
        return `${user.id}/memories/${memoryId}/${fileName}`
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
 * Mark a memory as approved (ready for compilation)
 * This clears the "new" badge and changes status to "approved"
 */
export async function approveMemory(memoryId: string): Promise<Memory> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) throw new Error('Not authenticated')

  const { data, error } = await supabase
    .from('memories')
    .update({
      distribution_status: 'approved',
      is_new: false,  // Clear the "new" badge
      marked_ready_at: new Date().toISOString()
    })
    .eq('id', memoryId)
    .eq('parent_id', user.id)
    .select()
    .single()

  if (error) throw error
  return data as Memory
}

/**
 * Mark multiple memories as approved (bulk operation)
 */
export async function approveMemories(memoryIds: string[]): Promise<Memory[]> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) throw new Error('Not authenticated')

  const { data, error } = await supabase
    .from('memories')
    .update({
      distribution_status: 'approved',
      is_new: false,
      marked_ready_at: new Date().toISOString()
    })
    .in('id', memoryIds)
    .eq('parent_id', user.id)
    .select()

  if (error) throw error
  return (data || []) as Memory[]
}

/**
 * Mark a memory as sent (called when summary is approved and sent)
 */
export async function markMemoryAsSent(memoryId: string, summaryId?: string): Promise<Memory> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) throw new Error('Not authenticated')

  const updateData: Partial<Memory> = {
    distribution_status: 'sent',
    sent_at: new Date().toISOString()
  }

  if (summaryId) {
    updateData.summary_id = summaryId
  }

  const { data, error } = await supabase
    .from('memories')
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .update(updateData as any)
    .eq('id', memoryId)
    .eq('parent_id', user.id)
    .select()
    .single()

  if (error) throw error
  return data as Memory
}

/**
 * Update memory content (text, subject, rich content, media)
 */
export async function updateMemoryContent(
  memoryId: string,
  content?: string,
  subject?: string,
  richContent?: Record<string, unknown>,
  contentFormat?: 'plain' | 'rich' | 'email' | 'sms' | 'whatsapp'
): Promise<Memory> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) throw new Error('Not authenticated')

  const updateData: Partial<Memory> = {}
  if (content !== undefined) updateData.content = content
  if (subject !== undefined) updateData.subject = subject
  if (richContent !== undefined) updateData.rich_content = richContent as Json
  if (contentFormat !== undefined) updateData.content_format = contentFormat

  const { data, error } = await supabase
    .from('memories')
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .update(updateData as any)
    .eq('id', memoryId)
    .eq('parent_id', user.id)
    .select()
    .single()

  if (error) throw error
  return data as Memory
}

/**
 * Update media URLs for a memory
 */
export async function updateMemoryMediaUrls(
  memoryId: string,
  mediaUrls: string[]
): Promise<Memory> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) throw new Error('Not authenticated')

  const { data, error } = await supabase
    .from('memories')
    .update({
      media_urls: mediaUrls
    })
    .eq('id', memoryId)
    .eq('parent_id', user.id)
    .select()
    .single()

  if (error) throw error
  return data as Memory
}

/**
 * Get memories by child ID
 */
export async function getMemoriesByChild(childId: string): Promise<Memory[]> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) throw new Error('Not authenticated')

  const { data, error } = await supabase
    .from('memories')
    .select('*')
    .eq('parent_id', user.id)
    .eq('child_id', childId)
    .order('created_at', { ascending: false })

  if (error) throw error
  return (data || []) as Memory[]
}

/**
 * Get recent memories (last 30 days)
 */
export async function getRecentMemories(): Promise<Memory[]> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) throw new Error('Not authenticated')

  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

  const { data, error } = await supabase
    .from('memories')
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
  return (data || []) as Memory[]
}

/**
 * Get new memories (status = 'new', with is_new badge)
 */
export async function getNewMemories(): Promise<Memory[]> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) throw new Error('Not authenticated')

  const { data, error } = await supabase
    .from('memories')
    .select(`
      *,
      children:child_id (
        name,
        birth_date,
        profile_photo_url
      )
    `)
    .eq('parent_id', user.id)
    .eq('is_new', true)
    .order('created_at', { ascending: false })

  if (error) throw error
  return (data || []) as Memory[]
}

/**
 * Get approved memories ready for compilation
 */
export async function getApprovedMemories(): Promise<Memory[]> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) throw new Error('Not authenticated')

  const { data, error } = await supabase
    .from('memories')
    .select(`
      *,
      children:child_id (
        name,
        birth_date,
        profile_photo_url
      )
    `)
    .eq('parent_id', user.id)
    .eq('distribution_status', 'approved')
    .order('created_at', { ascending: false })

  if (error) throw error
  return (data || []) as Memory[]
}

/**
 * Get recent memories with response counts for dashboard display
 * Returns an array of memories with a non-enumerable newMemoriesCount property
 */
export async function getRecentMemoriesWithStats(limit: number = 5): Promise<RecentMemoriesWithStatsResult> {
  const startTime = Date.now()
  const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  const supabase = createClient()

  // Wrap entire function in try-catch to ensure we always return a consistent payload
  try {
    logger.info('Starting getRecentMemoriesWithStats request', {
      limit,
      requestId,
      timestamp: new Date().toISOString()
    })

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      logger.error('Authentication error in getRecentMemoriesWithStats', { requestId })
      return attachNewMemoriesCount([] as MemoryWithStats[], 0)
    }

    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const { data: memories, error } = await supabase
      .from('memories')
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

    if (error) {
      logger.error('Database query failed', { requestId, error: error.message })
      return attachNewMemoriesCount([] as MemoryWithStats[], 0)
    }

    if (!memories || memories.length === 0) {
      return attachNewMemoriesCount([] as MemoryWithStats[], 0)
    }

    const newMemoriesCount = memories.reduce((count, memory) => count + (memory.is_new ? 1 : 0), 0)

    // Get the memory IDs for batch queries
    const memoryIds = memories.map(memory => memory.id)

    // Get user's likes for these memories in a single query
    const { data: userLikes } = await supabase
      .from('likes')
      .select('update_id')
      .eq('parent_id', user.id)
      .in('update_id', memoryIds)

    type UserLike = {
      update_id: string
    }

    const likedMemoryIds = new Set((userLikes as UserLike[] | null)?.map(like => like.update_id) || [])

    type AggregatedResponseStat = {
      update_id: string
      response_count: number | null
      last_response_at: string | null
    }

    const { data: responseStats, error: responseStatsError } = await supabase
      .from('responses')
      .select('update_id,response_count:count(*),last_response_at:max(received_at)')
      .in('update_id', memoryIds)
      .group('update_id')

    if (responseStatsError) {
      logger.error('Error fetching aggregated response stats', {
        requestId,
        error: responseStatsError.message
      })
    }

    const responseStatsMap = new Map<string, AggregatedResponseStat>()

    if (responseStats) {
      for (const stat of responseStats as AggregatedResponseStat[]) {
        responseStatsMap.set(stat.update_id, {
          update_id: stat.update_id,
          response_count: stat.response_count ?? 0,
          last_response_at: stat.last_response_at ?? null
        })
      }
    }

    // Merge response stats and engagement data for each memory
    const memoriesWithStats: MemoryWithStats[] = memories.map((memory) => {
      const stats = responseStatsMap.get(memory.id)

      let responseCount = 0
      if (stats?.response_count !== undefined && stats?.response_count !== null) {
        const parsedCount = Number(stats.response_count)
        responseCount = Number.isNaN(parsedCount) ? 0 : parsedCount
      }

      return {
        ...memory,
        response_count: responseCount,
        last_response_at: stats?.last_response_at ?? null,
        has_unread_responses: false,
        like_count: memory.like_count ?? 0,
        comment_count: memory.comment_count ?? 0,
        isLiked: likedMemoryIds.has(memory.id)
      } as MemoryWithStats
    })

    logger.info('Successfully completed getRecentMemoriesWithStats', {
      requestId,
      totalMemories: memoriesWithStats.length,
      newMemoriesCount,
      duration: Date.now() - startTime
    })

    return attachNewMemoriesCount(memoriesWithStats, newMemoriesCount)

  } catch (globalError) {
    logger.error('Critical error in getRecentMemoriesWithStats', {
      requestId,
      error: globalError instanceof Error ? globalError.message : 'Unknown'
    })
    return attachNewMemoriesCount([] as MemoryWithStats[], 0)
  }
}
