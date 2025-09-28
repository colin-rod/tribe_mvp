import { serve } from 'https://deno.land/std@0.208.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import JSZip from 'https://esm.sh/jszip@3.10.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface ExportRequest {
  export_type?: 'full' | 'minimal' | 'media_only'
}

interface UserData {
  profile: any
  privacy_settings: any
  children: any[]
  recipient_groups: any[]
  recipients: any[]
  updates: any[]
  responses: any[]
  ai_prompts: any[]
  export_metadata: any
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
    const { export_type = 'full' }: ExportRequest = await req.json()

    // Create export job record
    const { data: exportJob, error: jobError } = await supabaseClient
      .from('data_export_jobs')
      .insert({
        user_id: user.id,
        export_type,
        status: 'processing',
        started_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days
      })
      .select()
      .single()

    if (jobError) {
      console.error('Error creating export job:', jobError)
      return new Response(
        JSON.stringify({ error: 'Failed to create export job' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    try {
      // Get user data using the database function
      const { data: userData, error: dataError } = await supabaseClient
        .rpc('get_user_export_data', { user_id: user.id })

      if (dataError) {
        throw new Error(`Failed to fetch user data: ${dataError.message}`)
      }

      const userDataTyped: UserData = userData as UserData

      // Create ZIP archive
      const zip = new JSZip()

      // Add main data file
      zip.file('user_data.json', JSON.stringify(userDataTyped, null, 2))

      // Add summary file
      const summary = {
        export_info: {
          user_id: user.id,
          email: user.email,
          export_type,
          exported_at: new Date().toISOString(),
          export_job_id: exportJob.id,
        },
        data_summary: {
          total_children: userDataTyped.children?.length || 0,
          total_updates: userDataTyped.updates?.length || 0,
          total_recipients: userDataTyped.recipients?.length || 0,
          total_recipient_groups: userDataTyped.recipient_groups?.length || 0,
          total_responses: userDataTyped.responses?.length || 0,
          total_ai_prompts: userDataTyped.ai_prompts?.length || 0,
        },
        privacy_settings: userDataTyped.privacy_settings,
      }

      zip.file('export_summary.json', JSON.stringify(summary, null, 2))

      // Add individual data files for easier parsing
      if (export_type === 'full') {
        zip.file('children.json', JSON.stringify(userDataTyped.children || [], null, 2))
        zip.file('updates.json', JSON.stringify(userDataTyped.updates || [], null, 2))
        zip.file('recipients.json', JSON.stringify(userDataTyped.recipients || [], null, 2))
        zip.file('recipient_groups.json', JSON.stringify(userDataTyped.recipient_groups || [], null, 2))
        zip.file('responses.json', JSON.stringify(userDataTyped.responses || [], null, 2))
        zip.file('ai_prompts.json', JSON.stringify(userDataTyped.ai_prompts || [], null, 2))
      }

      // Add README file
      const readme = `
# Your Tribe Data Export

This archive contains all your personal data from Tribe.

## Files Included:

- **user_data.json**: Complete data export in single file
- **export_summary.json**: Summary of exported data and privacy settings
${export_type === 'full' ? `- **children.json**: Your children's profiles
- **updates.json**: All updates you've shared
- **recipients.json**: Your recipient list
- **recipient_groups.json**: Your recipient groups
- **responses.json**: Responses to your updates
- **ai_prompts.json**: AI-generated prompts` : ''}

## Export Details:

- **Export Type**: ${export_type}
- **Exported At**: ${new Date().toISOString()}
- **User ID**: ${user.id}
- **Email**: ${user.email}

## Data Privacy:

This export contains personal data. Please handle it securely and delete it when no longer needed.

For questions about your data, contact support.
      `.trim()

      zip.file('README.txt', readme)

      // Generate ZIP file
      const zipBlob = await zip.generateAsync({ type: 'uint8array' })
      const fileSize = zipBlob.length

      // In a real implementation, you would upload this to storage
      // For now, we'll create a temporary download URL
      const downloadUrl = `${Deno.env.get('SUPABASE_URL')}/storage/v1/object/sign/exports/${user.id}/${exportJob.id}.zip`

      // Update export job with completion details
      const { error: updateError } = await supabaseClient
        .from('data_export_jobs')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
          file_size_bytes: fileSize,
          download_url: downloadUrl,
        })
        .eq('id', exportJob.id)

      if (updateError) {
        console.error('Error updating export job:', updateError)
      }

      // Update privacy settings with export info
      await supabaseClient
        .from('privacy_settings')
        .update({
          last_export_requested_at: new Date().toISOString(),
          last_export_completed_at: new Date().toISOString(),
          last_export_download_url: downloadUrl,
          last_export_expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        })
        .eq('user_id', user.id)

      // Return the ZIP file directly as download
      return new Response(zipBlob, {
        status: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/zip',
          'Content-Disposition': `attachment; filename="tribe_data_export_${user.id}_${new Date().toISOString().split('T')[0]}.zip"`,
          'Content-Length': fileSize.toString(),
        },
      })

    } catch (processingError) {
      console.error('Error processing export:', processingError)

      // Update job status to failed
      await supabaseClient
        .from('data_export_jobs')
        .update({
          status: 'failed',
          error_message: processingError.message,
        })
        .eq('id', exportJob.id)

      return new Response(
        JSON.stringify({
          error: 'Failed to process data export',
          details: processingError.message,
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

  } catch (error) {
    console.error('Unexpected error in data export:', error)
    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        details: error.message,
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})