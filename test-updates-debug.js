const { createClient } = require('@supabase/supabase-js')

// Load environment variables
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

console.log('Testing Supabase connection for updates debugging...')
console.log('Supabase URL:', supabaseUrl)
console.log('Supabase Key (first 20 chars):', supabaseAnonKey?.substring(0, 20) + '...')

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function testUpdatesAccess() {
  try {
    console.log('\n1. Testing auth status...')
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError) {
      console.error('Auth error:', authError)
      return
    }

    if (!user) {
      console.log('No authenticated user found')

      // Try to test with a mock query to see if we get the same 406 error
      console.log('\n2. Testing unauthenticated access to updates table...')
      const { data, error } = await supabase
        .from('updates')
        .select('id, created_at')
        .limit(1)

      if (error) {
        console.error('Error accessing updates (expected):', {
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint
        })
      } else {
        console.log('Unexpected: got data without auth:', data)
      }

      console.log('\n3. Testing unauthenticated access to responses table...')
      const { data: responseData, error: responseError } = await supabase
        .from('responses')
        .select('received_at')
        .eq('update_id', '16f040b0-3677-453e-93f0-743d616db2b4')
        .order('received_at', { ascending: false })
        .limit(1)

      if (responseError) {
        console.error('Error accessing responses:', {
          code: responseError.code,
          message: responseError.message,
          details: responseError.details,
          hint: responseError.hint,
          statusCode: responseError.statusCode,
          status: responseError.status
        })
      } else {
        console.log('Unexpected: got response data without auth:', responseData)
      }

      return
    }

    console.log('User authenticated:', {
      id: user.id,
      email: user.email,
      lastSignIn: user.last_sign_in_at
    })

    // Test authenticated access
    console.log('\n2. Testing authenticated access to updates...')
    const { data: updates, error: updatesError } = await supabase
      .from('updates')
      .select('id, created_at, parent_id')
      .eq('parent_id', user.id)
      .limit(5)

    if (updatesError) {
      console.error('Error accessing updates:', updatesError)
    } else {
      console.log('Updates retrieved:', updates?.length || 0)
    }

    console.log('\n3. Testing authenticated access to responses...')
    if (updates && updates.length > 0) {
      const updateId = updates[0].id
      const { data: responses, error: responsesError } = await supabase
        .from('responses')
        .select('received_at')
        .eq('update_id', updateId)
        .order('received_at', { ascending: false })
        .limit(1)

      if (responsesError) {
        console.error('Error accessing responses:', {
          code: responsesError.code,
          message: responsesError.message,
          details: responsesError.details,
          hint: responsesError.hint,
          statusCode: responsesError.statusCode,
          status: responsesError.status
        })
      } else {
        console.log('Responses retrieved:', responses?.length || 0)
      }
    }

  } catch (error) {
    console.error('Unexpected error:', error)
  }
}

testUpdatesAccess()