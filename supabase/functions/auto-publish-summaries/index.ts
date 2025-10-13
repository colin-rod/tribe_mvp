/**
 * Auto-Publish Summaries Edge Function
 *
 * This function runs periodically (via cron) to check for summaries that have passed
 * their auto-publish deadline and automatically approves and sends them.
 *
 * Workflow:
 * 1. Query summaries past their deadline using get_summaries_for_auto_publish()
 * 2. For each summary:
 *    - Update status to 'approved'
 *    - Clear 'is_new' badge from all memories in the summary
 *    - Trigger send process
 * 3. Return summary of actions taken
 *
 * Cron schedule: Every 15 minutes
 */

import { createClient } from 'jsr:@supabase/supabase-js@2'
import { getSupabaseConfig } from '../_shared/supabase-config.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

interface Summary {
  id: string
  parent_id: string
  title: string
  status: string
  auto_publish_hours: number
  compiled_at: string
  total_recipients: number
  total_updates: number
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Initialize Supabase client with service role key
    const { supabaseUrl, supabaseServiceRoleKey } = getSupabaseConfig()

    const supabaseClient = createClient(
      supabaseUrl,
      supabaseServiceRoleKey,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    )

    console.log('[auto-publish] Starting auto-publish check...')

    // Get summaries ready for auto-publish
    const { data: summaries, error: fetchError } = await supabaseClient
      .rpc('get_summaries_for_auto_publish')

    if (fetchError) {
      throw new Error(`Failed to fetch summaries: ${fetchError.message}`)
    }

    if (!summaries || summaries.length === 0) {
      console.log('[auto-publish] No summaries ready for auto-publish')
      return new Response(
        JSON.stringify({
          success: true,
          processed: 0,
          message: 'No summaries ready for auto-publish',
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      )
    }

    console.log(`[auto-publish] Found ${summaries.length} summaries to auto-publish`)

    const results = []

    // Process each summary
    for (const summary of summaries as Summary[]) {
      try {
        console.log(`[auto-publish] Processing summary ${summary.id} for parent ${summary.parent_id}`)

        // 1. Update summary status to 'approved'
        const { error: approveError } = await supabaseClient
          .from('summaries')
          .update({
            status: 'approved',
            approved_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('id', summary.id)

        if (approveError) {
          throw new Error(`Failed to approve summary: ${approveError.message}`)
        }

        // 2. Get all memory IDs in this summary
        const { data: summaryMemories, error: memoriesError } = await supabaseClient
          .from('summary_memories')
          .select('memory_id')
          .eq('summary_id', summary.id)
          .eq('included', true)

        if (memoriesError) {
          throw new Error(`Failed to fetch summary memories: ${memoriesError.message}`)
        }

        // 3. Clear 'is_new' badge from all memories in this summary
        if (summaryMemories && summaryMemories.length > 0) {
          const memoryIds = summaryMemories.map((m) => m.memory_id)

          const { error: clearBadgeError } = await supabaseClient
            .from('memories')
            .update({ is_new: false })
            .in('id', memoryIds)

          if (clearBadgeError) {
            console.warn(
              `[auto-publish] Failed to clear badges for summary ${summary.id}: ${clearBadgeError.message}`
            )
          }
        }

        // 4. Trigger send process (call send-summary Edge Function)
        const sendResponse = await fetch(
          `${supabaseUrl}/functions/v1/send-summary`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${supabaseServiceRoleKey}`,
            },
            body: JSON.stringify({
              summaryId: summary.id,
              autoPublished: true,
            }),
          }
        )

        if (!sendResponse.ok) {
          const errorText = await sendResponse.text()
          throw new Error(`Send summary failed: ${errorText}`)
        }

        console.log(`[auto-publish] Successfully auto-published summary ${summary.id}`)

        results.push({
          summaryId: summary.id,
          parentId: summary.parent_id,
          title: summary.title,
          recipients: summary.total_recipients,
          memories: summary.total_updates,
          success: true,
        })
      } catch (error) {
        console.error(`[auto-publish] Error processing summary ${summary.id}:`, error)
        results.push({
          summaryId: summary.id,
          parentId: summary.parent_id,
          title: summary.title,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        })
      }
    }

    // Log summary of actions
    const successCount = results.filter((r) => r.success).length
    const failureCount = results.filter((r) => !r.success).length

    console.log(
      `[auto-publish] Completed: ${successCount} successful, ${failureCount} failed`
    )

    return new Response(
      JSON.stringify({
        success: true,
        processed: summaries.length,
        successful: successCount,
        failed: failureCount,
        results,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error) {
    console.error('[auto-publish] Fatal error:', error)
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    )
  }
})
