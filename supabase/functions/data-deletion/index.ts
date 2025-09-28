import { serve } from 'https://deno.land/std@0.208.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface DeletionRequest {
  deletion_type?: 'user_requested' | 'inactivity_cleanup' | 'gdpr_compliance' | 'account_closure'
  confirm_deletion?: boolean
  keep_audit_trail?: boolean
}

interface DeletionResult {
  user_id: string
  deletion_type: string
  deleted_tables: string[]
  total_records_deleted: number
  completed_at: string
  audit_trail_created: boolean
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Get the authorization header
    const authorization = req.headers.get('Authorization')
    if (!authorization) {
      return new Response(
        JSON.stringify({ error: 'No authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Create Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: authorization },
        },
      }
    )

    // Get the current user
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser()
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Parse request body
    const {
      deletion_type = 'user_requested',
      confirm_deletion = false,
      keep_audit_trail = true
    }: DeletionRequest = await req.json()

    // Safety check - require explicit confirmation
    if (!confirm_deletion) {
      return new Response(
        JSON.stringify({
          error: 'Deletion not confirmed',
          message: 'You must explicitly confirm the deletion by setting confirm_deletion to true'
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Additional safety check for user-requested deletions
    if (deletion_type === 'user_requested') {
      // Check if user has privacy settings and if they have opted for data deletion
      const { data: privacySettings } = await supabaseClient
        .from('privacy_settings')
        .select('delete_after_inactivity')
        .eq('user_id', user.id)
        .single()

      // For now, we'll proceed but log this for audit
      console.log('User deletion request:', {
        user_id: user.id,
        email: user.email,
        deletion_type,
        privacy_settings: privacySettings
      })
    }

    try {
      // Call the database function to perform the deletion
      const { data: deletionResult, error: deletionError } = await supabaseClient
        .rpc('delete_user_data', {
          user_id: user.id,
          deletion_type,
          keep_audit_trail
        })

      if (deletionError) {
        console.error('Error during data deletion:', deletionError)
        return new Response(
          JSON.stringify({
            error: 'Failed to delete user data',
            details: deletionError.message
          }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      const result: DeletionResult = deletionResult as DeletionResult

      // Log successful deletion for monitoring
      console.log('Data deletion completed:', {
        user_id: user.id,
        deletion_type,
        deleted_tables: result.deleted_tables,
        total_records: result.total_records_deleted,
        audit_created: result.audit_trail_created
      })

      // Update privacy settings to reflect deletion
      await supabaseClient
        .from('privacy_settings')
        .update({
          deletion_requested_at: new Date().toISOString(),
          deletion_completed_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user.id)

      return new Response(
        JSON.stringify({
          success: true,
          message: 'Your personal data has been successfully deleted',
          details: {
            deletion_type: result.deletion_type,
            deleted_tables: result.deleted_tables,
            total_records_deleted: result.total_records_deleted,
            completed_at: result.completed_at,
            audit_trail_created: result.audit_trail_created
          }
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )

    } catch (processingError) {
      console.error('Error processing deletion:', processingError)

      return new Response(
        JSON.stringify({
          error: 'Failed to process data deletion',
          details: processingError.message,
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

  } catch (error) {
    console.error('Unexpected error in data deletion:', error)
    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        details: error.message,
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})