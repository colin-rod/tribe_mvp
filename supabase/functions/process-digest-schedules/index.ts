/**
 * Process Digest Schedules Edge Function
 *
 * This function runs on a schedule (via cron) to check for recipients
 * who need daily or weekly digests based on their preferences.
 *
 * Workflow:
 * 1. Query digest_schedules table for due digests
 * 2. For each due schedule:
 *    - Check if recipient has unread updates since last digest
 *    - If yes, create notification job for digest
 *    - Update next_digest_scheduled timestamp
 * 3. Return count of digests created
 *
 * Cron Schedule: Daily at 9am (see _cron/cron.yaml)
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { corsHeaders } from '../_shared/cors.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { getSupabaseConfig } from '../_shared/supabase-config.ts'

const { supabaseUrl, supabaseServiceRoleKey } = getSupabaseConfig()

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    if (req.method !== 'POST') {
      throw new Error('Method not allowed')
    }

    console.log('[digest-scheduler] Starting digest schedule processing...')

    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey)

    // Call the database function to create digest jobs
    const { data: jobCount, error: digestError } = await supabase
      .rpc('create_digest_jobs')

    if (digestError) {
      throw new Error(`Failed to create digest jobs: ${digestError.message}`)
    }

    console.log(`[digest-scheduler] Created ${jobCount} digest jobs`)

    // Get summary of what was created
    const { data: recentJobs } = await supabase
      .from('notification_jobs')
      .select(`
        id,
        notification_type,
        recipient_id,
        scheduled_for,
        recipients!notification_jobs_recipient_id_fkey(name, email)
      `)
      .eq('notification_type', 'digest')
      .gte('created_at', new Date(Date.now() - 60000).toISOString()) // Last minute
      .order('created_at', { ascending: false })
      .limit(50)

    return new Response(
      JSON.stringify({
        success: true,
        digests_created: jobCount || 0,
        message: `Successfully created ${jobCount || 0} digest notification jobs`,
        recent_jobs: recentJobs?.map(job => ({
          id: job.id,
          recipient_name: job.recipients?.name,
          recipient_email: job.recipients?.email,
          scheduled_for: job.scheduled_for
        })) || [],
        processed_at: new Date().toISOString()
      }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      }
    )

  } catch (error) {
    console.error('[digest-scheduler] Error:', error)

    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        processed_at: new Date().toISOString()
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      }
    )
  }
})
