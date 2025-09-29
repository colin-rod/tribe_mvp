import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const supabaseUrl = 'https://advbcfkisejskhskrmqw.supabase.co'
// Using service role key for database admin operations
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFkdmJjZmtpc2Vqc2toc2tybXF3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1ODAyNjE1NCwiZXhwIjoyMDczNjAyMTU0fQ.uXZgSekS_XGCo-kL5Vjkpg_tv15lqYYrKAdPsJqKO8c'

const supabase = createClient(supabaseUrl, serviceRoleKey)

async function runLikesMigration() {
  console.log('Running likes table migration...')

  try {
    // Read the SQL file
    const sqlFile = join(__dirname, 'create-likes-table.sql')
    const sql = readFileSync(sqlFile, 'utf8')

    console.log('Executing SQL migration...')

    // Execute the SQL using the rpc function
    const { data, error } = await supabase.rpc('exec_sql', { sql })

    if (error) {
      console.error('Migration error:', error)
      return false
    }

    console.log('Migration executed successfully!')

    // Test the likes table now
    console.log('\n--- Testing likes table after migration ---')
    const { data: likesTest, error: likesError } = await supabase
      .from('likes')
      .select('*')
      .limit(1)

    if (likesError) {
      console.error('Likes table still not accessible:', likesError)
      return false
    } else {
      console.log('✅ Likes table is now accessible!')
    }

    // Test the comments table
    console.log('\n--- Testing comments table after migration ---')
    const { data: commentsTest, error: commentsError } = await supabase
      .from('comments')
      .select('*')
      .limit(1)

    if (commentsError) {
      console.error('Comments table error:', commentsError)
    } else {
      console.log('✅ Comments table is accessible!')
    }

    return true

  } catch (error) {
    console.error('General error:', error)
    return false
  }
}

runLikesMigration()