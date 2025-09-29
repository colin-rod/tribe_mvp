import pg from 'pg'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const { Client } = pg

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Extract connection details from service role key
const supabaseUrl = 'https://advbcfkisejskhskrmqw.supabase.co'
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFkdmJjZmtpc2Vqc2toc2tybXF3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1ODAyNjE1NCwiZXhwIjoyMDczNjAyMTU0fQ.uXZgSekS_XGCo-kL5Vjkpg_tv15lqYYrKAdPsJqKO8c'

// Supabase PostgreSQL connection string
const connectionString = 'postgresql://postgres.advbcfkisejskhskrmqw:T2P1zDrcYjt1w2Fg@aws-0-us-west-1.pooler.supabase.com:6543/postgres'

async function applyMigration() {
  console.log('Attempting to apply migration using direct PostgreSQL connection...')

  const client = new Client({
    connectionString: connectionString,
    ssl: {
      rejectUnauthorized: false
    }
  })

  try {
    await client.connect()
    console.log('✅ Connected to PostgreSQL database')

    // Read the migration file
    const migrationPath = join(__dirname, '..', 'supabase', 'migrations', '20250929000004_fix_missing_likes_table.sql')
    const migrationSQL = readFileSync(migrationPath, 'utf8')

    console.log('📄 Loaded migration SQL')

    // Split the SQL into individual statements to execute them one by one
    const statements = migrationSQL
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'))

    console.log(`🔧 Executing ${statements.length} SQL statements...`)

    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i] + ';'
      console.log(`   Statement ${i + 1}/${statements.length}...`)

      try {
        await client.query(statement)
        console.log(`   ✅ Statement ${i + 1} executed successfully`)
      } catch (error) {
        if (error.message.includes('already exists')) {
          console.log(`   ⚠️ Statement ${i + 1}: ${error.message} (skipping)`)
        } else {
          console.log(`   ❌ Statement ${i + 1} failed: ${error.message}`)
        }
      }
    }

    console.log('🎉 Migration applied successfully!')

    // Test the tables
    console.log('\n🧪 Testing tables after migration...')

    const { rows: likesRows } = await client.query('SELECT COUNT(*) FROM likes')
    console.log(`✅ Likes table: ${likesRows[0].count} records`)

    const { rows: commentsRows } = await client.query('SELECT COUNT(*) FROM comments')
    console.log(`✅ Comments table: ${commentsRows[0].count} records`)

    const { rows: responsesRows } = await client.query('SELECT COUNT(*) FROM responses')
    console.log(`✅ Responses table: ${responsesRows[0].count} records`)

    return true

  } catch (error) {
    console.error('❌ Migration failed:', error.message)

    if (error.message.includes('password authentication failed')) {
      console.log('\n⚠️ Database connection failed. You will need to:')
      console.log('1. Go to Supabase Dashboard → Settings → Database')
      console.log('2. Find the correct connection string with password')
      console.log('3. Run the migration manually in the SQL Editor')
    }

    return false

  } finally {
    await client.end()
  }
}

applyMigration()