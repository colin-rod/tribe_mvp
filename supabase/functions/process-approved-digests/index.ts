/**
 * Process Approved Digests Edge Function
 *
 * This function runs on a schedule (via cron) to check for approved digests
 * that are ready to be sent and triggers email delivery.
 *
 * Workflow:
 * 1. Query summaries table for approved digests ready to send
 * 2. For each digest, call send-digest-emails function
 * 3. Return count of digests processed
 *
 * Cron Schedule: Runs every 15 minutes
 */

import { corsHeaders } from '../_shared/cors.ts'
import { createSupabaseClient } from '../_shared/database.ts'

interface ProcessApprovedDigestsResponse {
  success: boolean
  processed_count?: number
  errors?: Array<{
    digest_id: string
    error: string
  }>
  error?: string
}

async function processApprovedDigests(): Promise<ProcessApprovedDigestsResponse> {
  const supabase = createSupabaseClient()

  try {
    console.log('[process-approved-digests] Checking for approved digests to send...')

    // Find approved digests that are ready to send
    // Include digests with:
    // - status = 'approved' (manually approved and ready to send immediately)
    // - scheduled_for is null or scheduled_for <= now
    const { data: approvedDigests, error: fetchError } = await supabase
      .from('summaries')
      .select('id, title, parent_id, approved_at, scheduled_for')
      .eq('status', 'approved')
      .or('scheduled_for.is.null,scheduled_for.lte.' + new Date().toISOString())
      .order('approved_at', { ascending: true })
      .limit(20) // Process up to 20 digests per run

    if (fetchError) {
      throw new Error(`Failed to fetch approved digests: ${fetchError.message}`)
    }

    if (!approvedDigests || approvedDigests.length === 0) {
      console.log('[process-approved-digests] No approved digests to send')
      return {
        success: true,
        processed_count: 0
      }
    }

    console.log(`[process-approved-digests] Found ${approvedDigests.length} approved digests to send`)

    const errors: Array<{ digest_id: string; error: string }> = []
    let processedCount = 0

    // Process each digest
    for (const digest of approvedDigests) {
      try {
        console.log(`[process-approved-digests] Sending digest ${digest.id}: ${digest.title}`)

        // Call send-digest-emails function
        const { data, error } = await supabase.functions.invoke('send-digest-emails', {
          body: {
            digest_id: digest.id
          }
        })

        if (error) {
          throw new Error(`Edge function error: ${error.message}`)
        }

        if (!data.success) {
          throw new Error(data.error || 'Unknown error from send-digest-emails')
        }

        console.log(`[process-approved-digests] Successfully sent digest ${digest.id}. Sent: ${data.sent_count}, Failed: ${data.failed_count}`)
        processedCount++

      } catch (error) {
        console.error(`[process-approved-digests] Failed to send digest ${digest.id}:`, error)
        errors.push({
          digest_id: digest.id,
          error: error instanceof Error ? error.message : String(error)
        })

        // Update digest status to failed
        await supabase
          .from('summaries')
          .update({ status: 'failed' })
          .eq('id', digest.id)
      }
    }

    return {
      success: true,
      processed_count: processedCount,
      errors: errors.length > 0 ? errors : undefined
    }

  } catch (error) {
    console.error('[process-approved-digests] Error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const result = await processApprovedDigests()

    return new Response(
      JSON.stringify({
        ...result,
        processed_at: new Date().toISOString()
      }),
      {
        status: result.success ? 200 : 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  } catch (error) {
    console.error('[process-approved-digests] Request handling error:', error)
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        processed_at: new Date().toISOString()
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})
