import { corsHeaders } from '../_shared/cors.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { update_id, recipient_ids } = await req.json()

    // Simple test - just return what we received
    const result = {
      success: true,
      message: "Function is working",
      received: {
        update_id,
        recipient_ids
      },
      environment: {
        SUPABASE_URL: Deno.env.get('SUPABASE_URL'),
        SENDGRID_FROM_EMAIL: Deno.env.get('SENDGRID_FROM_EMAIL'),
        SENDGRID_API_KEY: Deno.env.get('SENDGRID_API_KEY') ? 'Set' : 'Missing'
      }
    }

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})