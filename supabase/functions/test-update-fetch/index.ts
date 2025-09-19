import { corsHeaders } from '../_shared/cors.ts'
import { createSupabaseClient } from '../_shared/database.ts'

Deno.serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { update_id } = await req.json()

    if (!update_id) {
      return new Response(
        JSON.stringify({ error: 'update_id required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    const supabase = createSupabaseClient()

    console.log(`Testing fetch for update_id: ${update_id}`)

    // Test 1: Basic update fetch
    console.log('Step 1: Basic update fetch...')
    const { data: basicUpdate, error: basicError } = await supabase
      .from('updates')
      .select('*')
      .eq('id', update_id)
      .single()

    console.log('Basic update result:', { data: basicUpdate, error: basicError })

    if (basicError || !basicUpdate) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Basic update fetch failed',
          details: basicError
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    // Test 2: Child fetch
    console.log('Step 2: Child fetch...')
    const { data: child, error: childError } = await supabase
      .from('children')
      .select('id, name, birth_date, profile_photo_url')
      .eq('id', basicUpdate.child_id)
      .single()

    console.log('Child result:', { data: child, error: childError })

    // Test 3: Parent fetch
    console.log('Step 3: Parent fetch...')
    const { data: parent, error: parentError } = await supabase
      .from('profiles')
      .select('id, name, email')
      .eq('id', basicUpdate.parent_id)
      .single()

    console.log('Parent result:', { data: parent, error: parentError })

    // Return combined result
    const result = {
      success: true,
      update: basicUpdate,
      child: child || { error: childError },
      parent: parent || { error: parentError },
      combined: {
        ...basicUpdate,
        child,
        parent
      }
    }

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Test function error:', error)
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        stack: error.stack
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})