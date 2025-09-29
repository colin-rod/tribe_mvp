import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://advbcfkisejskhskrmqw.supabase.co'
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFkdmJjZmtpc2Vqc2toc2tybXF3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1ODAyNjE1NCwiZXhwIjoyMDczNjAyMTU0fQ.uXZgSekS_XGCo-kL5Vjkpg_tv15lqYYrKAdPsJqKO8c'

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  db: {
    schema: 'public'
  }
})

async function createLikesTable() {
  console.log('Creating likes table manually...')

  try {
    // Create the likes table using SQL
    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS likes (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        update_id UUID REFERENCES updates(id) ON DELETE CASCADE NOT NULL,
        parent_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `

    console.log('Step 1: Creating likes table...')
    const { error: createError } = await supabase.rpc('exec_sql', {
      sql: createTableSQL
    })

    if (createError) {
      console.error('Error creating table:', createError)
      // Let's try a different approach - using the REST API directly
      console.log('Trying alternative approach...')

      // Test if we can access the database with service role
      const { data: test, error: testError } = await supabase
        .from('updates')
        .select('id')
        .limit(1)

      if (testError) {
        console.error('Cannot access database with service role:', testError)
        return false
      }

      console.log('Database access confirmed. The likes table migration needs to be run manually.')
      console.log('Please run the SQL from create-likes-table.sql in your Supabase dashboard SQL editor.')
      return false
    }

    console.log('✅ Likes table created successfully!')
    return true

  } catch (error) {
    console.error('General error:', error)

    // Try to check if the problem is just that we need to create the table differently
    console.log('\nTrying to verify current table status...')

    // Check what tables exist
    const { data: tables, error: tablesError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .eq('table_type', 'BASE TABLE')

    if (!tablesError && tables) {
      console.log('Existing tables:', tables.map(t => t.table_name))

      const hasLikes = tables.some(t => t.table_name === 'likes')
      if (hasLikes) {
        console.log('✅ Likes table already exists!')
        return true
      } else {
        console.log('❌ Likes table is missing')
      }
    }

    return false
  }
}

createLikesTable()