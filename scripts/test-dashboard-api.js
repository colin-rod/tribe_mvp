import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://advbcfkisejskhskrmqw.supabase.co'
const anonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFkdmJjZmtpc2Vqc2toc2tybXF3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgwMjYxNTQsImV4cCI6MjA3MzYwMjE1NH0.PscxgrYSa54u37Nwi08QyTmKs6TEdMEcPYdHUTxLi18'

const supabase = createClient(supabaseUrl, anonKey)

console.log('🧪 TESTING DASHBOARD API CALLS')
console.log('========================================')
console.log('')

async function testDashboardAPIs() {
  console.log('This simulates the exact API calls made by the dashboard.')
  console.log('Run this AFTER applying the database migration.')
  console.log('')

  try {
    // These are the exact queries that were failing in the dashboard
    console.log('1️⃣ Testing getRecentUpdatesWithStats query...')
    console.log('   This is what UpdatesList component calls')
    console.log('')

    // Simulate the likes query that was causing 404
    console.log('   📊 Querying likes table...')
    const { data: likesData, error: likesError } = await supabase
      .from('likes')
      .select('update_id')
      .limit(1)

    if (likesError) {
      console.log('   ❌ LIKES ERROR:', likesError.message)
      console.log('   → This is the cause of the HTTP 404 error')
    } else {
      console.log('   ✅ Likes table accessible')
    }

    // Simulate the responses query that was causing 406
    console.log('   📊 Querying responses table...')
    const { data: responsesData, error: responsesError } = await supabase
      .from('responses')
      .select('*', { count: 'exact', head: true })

    if (responsesError) {
      console.log('   ❌ RESPONSES ERROR:', responsesError.message)
      console.log('   → This is the cause of the HTTP 406 error')
    } else {
      console.log('   ✅ Responses table accessible')
    }

    // Test the full query that UpdatesList makes
    console.log('')
    console.log('2️⃣ Testing full updates query with stats...')

    const { data: updates, error: updatesError } = await supabase
      .from('updates')
      .select(`
        *,
        children:child_id (
          id,
          name,
          birth_date,
          profile_photo_url
        )
      `)
      .order('created_at', { ascending: false })
      .limit(5)

    if (updatesError) {
      console.log('   ❌ UPDATES ERROR:', updatesError.message)
    } else {
      console.log(`   ✅ Updates query successful (${updates?.length || 0} updates)`)

      if (updates && updates.length > 0) {
        // Test getting likes for specific update
        const updateId = updates[0].id
        console.log('   📊 Testing likes for specific update...')

        const { data: userLikes, error: likesSpecificError } = await supabase
          .from('likes')
          .select('update_id')
          .eq('update_id', updateId)

        if (likesSpecificError) {
          console.log('   ❌ SPECIFIC LIKES ERROR:', likesSpecificError.message)
        } else {
          console.log('   ✅ Specific update likes query successful')
        }

        // Test getting responses for specific update
        console.log('   📊 Testing responses for specific update...')
        const { count, error: responsesCountError } = await supabase
          .from('responses')
          .select('*', { count: 'exact', head: true })
          .eq('update_id', updateId)

        if (responsesCountError) {
          console.log('   ❌ RESPONSES COUNT ERROR:', responsesCountError.message)
        } else {
          console.log('   ✅ Responses count query successful')
        }
      }
    }

    console.log('')
    console.log('3️⃣ Summary:')

    if (!likesError && !responsesError && !updatesError) {
      console.log('🎉 ALL API CALLS SUCCESSFUL!')
      console.log('')
      console.log('✅ The dashboard should now load correctly')
      console.log('✅ No more HTTP 404/406 errors')
      console.log('✅ Updates will display with engagement stats')
    } else {
      console.log('⚠️  Some API calls are still failing')
      console.log('')
      console.log('Please ensure you have:')
      console.log('1. Applied the database migration')
      console.log('2. Created the missing tables')
      console.log('3. Set up proper RLS policies')
    }

  } catch (error) {
    console.error('❌ GENERAL ERROR:', error)
  }
}

testDashboardAPIs()