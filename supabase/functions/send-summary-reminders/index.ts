/**
 * Send Summary Reminders Edge Function
 *
 * This function runs periodically (via cron) to send reminder notifications to parents
 * about summaries approaching their auto-publish deadline.
 *
 * Workflow:
 * 1. Query summaries needing reminders using get_summaries_needing_reminders()
 * 2. For each summary:
 *    - Calculate hours remaining until auto-publish
 *    - Determine reminder type (48hr or 24hr)
 *    - Send notification to parent
 *    - Update reminder_count and last_reminder_sent_at
 * 3. Return summary of actions taken
 *
 * Reminder schedule:
 * - 48 hours before deadline (reminder_count = 0)
 * - 24 hours before deadline (reminder_count = 1)
 *
 * Cron schedule: Every hour
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
  reminder_count: number
  last_reminder_sent_at: string | null
  total_recipients: number
  total_updates: number
}

interface ParentProfile {
  id: string
  email: string
  full_name: string
  notification_settings: {
    email_enabled?: boolean
    push_enabled?: boolean
    summary_reminders?: boolean
  }
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

    console.log('[reminders] Starting reminder check...')

    // Get summaries needing reminders
    const { data: summaries, error: fetchError } = await supabaseClient
      .rpc('get_summaries_needing_reminders')

    if (fetchError) {
      throw new Error(`Failed to fetch summaries: ${fetchError.message}`)
    }

    if (!summaries || summaries.length === 0) {
      console.log('[reminders] No summaries need reminders')
      return new Response(
        JSON.stringify({
          success: true,
          sent: 0,
          message: 'No summaries need reminders',
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      )
    }

    console.log(`[reminders] Found ${summaries.length} summaries needing reminders`)

    const results = []

    // Process each summary
    for (const summary of summaries as Summary[]) {
      try {
        console.log(`[reminders] Processing summary ${summary.id} for parent ${summary.parent_id}`)

        // Calculate hours remaining until auto-publish
        const compiledAt = new Date(summary.compiled_at)
        const deadlineAt = new Date(compiledAt.getTime() + summary.auto_publish_hours * 60 * 60 * 1000)
        const now = new Date()
        const hoursRemaining = Math.max(0, (deadlineAt.getTime() - now.getTime()) / (1000 * 60 * 60))

        // Determine reminder type based on reminder_count
        let reminderType: '48hr' | '24hr'
        if (summary.reminder_count === 0) {
          reminderType = '48hr'
        } else if (summary.reminder_count === 1) {
          reminderType = '24hr'
        } else {
          // Already sent both reminders, skip
          console.log(`[reminders] Summary ${summary.id} already received max reminders`)
          continue
        }

        // Get parent profile
        const { data: parent, error: parentError } = await supabaseClient
          .from('profiles')
          .select('id, email, full_name, notification_settings')
          .eq('id', summary.parent_id)
          .single()

        if (parentError || !parent) {
          throw new Error(`Failed to fetch parent profile: ${parentError?.message}`)
        }

        const parentProfile = parent as ParentProfile

        // Check if parent has reminders enabled
        const notificationSettings = parentProfile.notification_settings || {}
        const summaryRemindersEnabled = notificationSettings.summary_reminders !== false // Default true

        if (!summaryRemindersEnabled) {
          console.log(`[reminders] Parent ${summary.parent_id} has reminders disabled`)
          continue
        }

        // Send notification
        const notificationPayload = {
          type: 'summary_reminder',
          summaryId: summary.id,
          summaryTitle: summary.title,
          reminderType,
          hoursRemaining: Math.round(hoursRemaining),
          totalMemories: summary.total_updates,
          totalRecipients: summary.total_recipients,
          deadlineAt: deadlineAt.toISOString(),
        }

        // Insert notification record
        const { error: notificationError } = await supabaseClient
          .from('notifications')
          .insert({
            user_id: summary.parent_id,
            type: 'summary_reminder',
            title: `${reminderType === '48hr' ? '48 hours' : '24 hours'} until auto-publish`,
            message: `Your summary "${summary.title}" will be automatically sent in ${Math.round(hoursRemaining)} hours. Review and approve now to send immediately.`,
            data: notificationPayload,
            read: false,
          })

        if (notificationError) {
          console.warn(
            `[reminders] Failed to create notification for summary ${summary.id}: ${notificationError.message}`
          )
        }

        // Send email if enabled
        if (notificationSettings.email_enabled !== false && parentProfile.email) {
          try {
            const emailResponse = await fetch(
              `${supabaseUrl}/functions/v1/send-email`,
              {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  Authorization: `Bearer ${supabaseServiceRoleKey}`,
                },
                body: JSON.stringify({
                  to: parentProfile.email,
                  template: 'summary_reminder',
                  data: {
                    parentName: parentProfile.full_name || 'there',
                    summaryTitle: summary.title,
                    reminderType,
                    hoursRemaining: Math.round(hoursRemaining),
                    totalMemories: summary.total_updates,
                    totalRecipients: summary.total_recipients,
                    reviewUrl: `${Deno.env.get('APP_URL')}/summaries/${summary.id}`,
                  },
                }),
              }
            )

            if (!emailResponse.ok) {
              const errorText = await emailResponse.text()
              console.warn(`[reminders] Email send failed for summary ${summary.id}: ${errorText}`)
            }
          } catch (emailError) {
            console.warn(`[reminders] Email send error for summary ${summary.id}:`, emailError)
          }
        }

        // Update reminder tracking
        const { error: updateError } = await supabaseClient
          .from('summaries')
          .update({
            reminder_count: summary.reminder_count + 1,
            last_reminder_sent_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('id', summary.id)

        if (updateError) {
          throw new Error(`Failed to update reminder tracking: ${updateError.message}`)
        }

        console.log(
          `[reminders] Successfully sent ${reminderType} reminder for summary ${summary.id}`
        )

        results.push({
          summaryId: summary.id,
          parentId: summary.parent_id,
          title: summary.title,
          reminderType,
          hoursRemaining: Math.round(hoursRemaining),
          success: true,
        })
      } catch (error) {
        console.error(`[reminders] Error processing summary ${summary.id}:`, error)
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
      `[reminders] Completed: ${successCount} successful, ${failureCount} failed`
    )

    return new Response(
      JSON.stringify({
        success: true,
        processed: summaries.length,
        sent: successCount,
        failed: failureCount,
        results,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error) {
    console.error('[reminders] Fatal error:', error)
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
