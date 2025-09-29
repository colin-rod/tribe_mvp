import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://advbcfkisejskhskrmqw.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFkdmJjZmtpc2Vqc2toc2tybXF3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgwMjYxNTQsImV4cCI6MjA3MzYwMjE1NH0.PscxgrYSa54u37Nwi08QyTmKs6TEdMEcPYdHUTxLi18'

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkTables() {
  console.log('Checking database tables...')

  try {
    // Test likes table
    console.log('\n--- Testing likes table ---')
    const { data: likesData, error: likesError } = await supabase
      .from('likes')
      .select('*')
      .limit(1)

    if (likesError) {
      console.error('Likes table error:', likesError)
    } else {
      console.log('Likes table accessible:', likesData !== null)
    }

    // Test responses table
    console.log('\n--- Testing responses table ---')
    const { data: responsesData, error: responsesError } = await supabase
      .from('responses')
      .select('*')
      .limit(1)

    if (responsesError) {
      console.error('Responses table error:', responsesError)
    } else {
      console.log('Responses table accessible:', responsesData !== null)
    }

    // Test updates table
    console.log('\n--- Testing updates table ---')
    const { data: updatesData, error: updatesError } = await supabase
      .from('updates')
      .select('*')
      .limit(1)

    if (updatesError) {
      console.error('Updates table error:', updatesError)
    } else {
      console.log('Updates table accessible:', updatesData !== null)
    }

  } catch (error) {
    console.error('General error:', error)
  }
}

checkTables()