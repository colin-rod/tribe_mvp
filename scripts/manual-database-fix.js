import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://advbcfkisejskhskrmqw.supabase.co'
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFkdmJjZmtpc2Vqc2toc2tybXF3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1ODAyNjE1NCwiZXhwIjoyMDczNjAyMTU0fQ.uXZgSekS_XGCo-kL5Vjkpg_tv15lqYYrKAdPsJqKO8c'

const supabase = createClient(supabaseUrl, serviceRoleKey)

console.log('='.repeat(60))
console.log('TRIBE MVP DATABASE FIX SCRIPT')
console.log('='.repeat(60))
console.log('')
console.log('This script will:')
console.log('1. Check which tables are missing')
console.log('2. Provide instructions to fix the issues')
console.log('3. Test table access after manual fixes')
console.log('')

async function diagnoseDatabaseIssues() {
  console.log('🔍 DIAGNOSING DATABASE ISSUES...')
  console.log('')

  try {
    // Test likes table
    console.log('📊 Testing likes table...')
    const { data: likesData, error: likesError } = await supabase
      .from('likes')
      .select('*')
      .limit(1)

    if (likesError) {
      console.log('❌ LIKES TABLE ERROR:', likesError.message)
      if (likesError.code === 'PGRST205') {
        console.log('   → The likes table does not exist')
      }
    } else {
      console.log('✅ Likes table is accessible')
    }

    // Test responses table
    console.log('📊 Testing responses table...')
    const { data: responsesData, error: responsesError } = await supabase
      .from('responses')
      .select('received_at, update_id')
      .limit(1)

    if (responsesError) {
      console.log('❌ RESPONSES TABLE ERROR:', responsesError.message)
      if (responsesError.code === 'PGRST406') {
        console.log('   → HTTP 406 error - likely RLS policy issue')
      }
    } else {
      console.log('✅ Responses table is accessible')
    }

    // Test updates table
    console.log('📊 Testing updates table...')
    const { data: updatesData, error: updatesError } = await supabase
      .from('updates')
      .select('id, like_count, comment_count')
      .limit(1)

    if (updatesError) {
      console.log('❌ UPDATES TABLE ERROR:', updatesError.message)
    } else {
      console.log('✅ Updates table is accessible')
      if (updatesData && updatesData.length > 0) {
        const update = updatesData[0]
        if (update.like_count !== undefined) {
          console.log('   ✅ like_count column exists')
        } else {
          console.log('   ❌ like_count column missing')
        }
        if (update.comment_count !== undefined) {
          console.log('   ✅ comment_count column exists')
        } else {
          console.log('   ❌ comment_count column missing')
        }
      }
    }

    // Test comments table
    console.log('📊 Testing comments table...')
    const { data: commentsData, error: commentsError } = await supabase
      .from('comments')
      .select('*')
      .limit(1)

    if (commentsError) {
      console.log('❌ COMMENTS TABLE ERROR:', commentsError.message)
      if (commentsError.code === 'PGRST205') {
        console.log('   → The comments table does not exist')
      }
    } else {
      console.log('✅ Comments table is accessible')
    }

    console.log('')
    console.log('🔧 SOLUTION:')
    console.log('')
    console.log('To fix these issues, you need to run the SQL migration manually:')
    console.log('')
    console.log('1. Go to your Supabase Dashboard: https://supabase.com/dashboard/project/advbcfkisejskhskrmqw')
    console.log('2. Navigate to SQL Editor')
    console.log('3. Copy and paste the contents of: supabase/migrations/20250929000004_fix_missing_likes_table.sql')
    console.log('4. Execute the SQL')
    console.log('')
    console.log('This will:')
    console.log('  ✓ Create the missing likes table')
    console.log('  ✓ Create the missing comments table')
    console.log('  ✓ Add like_count and comment_count columns to updates')
    console.log('  ✓ Set up proper RLS policies')
    console.log('  ✓ Fix the 406 error on responses table')
    console.log('  ✓ Add necessary indexes and triggers')
    console.log('')
    console.log('After running the migration, run this script again to verify the fixes.')

  } catch (error) {
    console.error('❌ GENERAL ERROR:', error)
  }
}

async function verifyFixes() {
  console.log('')
  console.log('🧪 VERIFYING DATABASE FIXES...')
  console.log('')

  let allFixed = true

  try {
    // Test all tables again
    const tests = [
      { name: 'likes', columns: ['id', 'update_id', 'parent_id'] },
      { name: 'comments', columns: ['id', 'update_id', 'parent_id', 'content'] },
      { name: 'responses', columns: ['received_at', 'update_id'] },
      { name: 'updates', columns: ['id', 'like_count', 'comment_count'] }
    ]

    for (const test of tests) {
      console.log(`📊 Testing ${test.name} table...`)
      const { data, error } = await supabase
        .from(test.name)
        .select(test.columns.join(', '))
        .limit(1)

      if (error) {
        console.log(`❌ ${test.name.toUpperCase()} ERROR:`, error.message)
        allFixed = false
      } else {
        console.log(`✅ ${test.name} table is working correctly`)
      }
    }

    console.log('')
    if (allFixed) {
      console.log('🎉 ALL DATABASE ISSUES HAVE BEEN RESOLVED!')
      console.log('')
      console.log('Your dashboard should now load correctly without HTTP 404/406 errors.')
      console.log('Try refreshing your dashboard to see the updates.')
    } else {
      console.log('⚠️  Some issues remain. Please run the SQL migration as described above.')
    }

  } catch (error) {
    console.error('❌ VERIFICATION ERROR:', error)
  }
}

// Main execution
async function main() {
  await diagnoseDatabaseIssues()

  // Check if user wants to verify fixes
  if (process.argv.includes('--verify')) {
    await verifyFixes()
  }
}

main()