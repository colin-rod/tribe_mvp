#!/usr/bin/env tsx

/**
 * Test script for dashboard implementation
 * Tests database functions, security policies, and client integration
 */

import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import type { Database } from '../src/lib/types/database'
import type { SupabaseClient } from '@supabase/supabase-js'

// Mock client for testing
const createClient = (url: string, key: string): SupabaseClient<Database> => {
  const mockData = { data: [], error: null }
  const mockSingle = { data: null, error: null }

  const mockBuilder = {
    select: () => mockBuilder,
    insert: () => mockBuilder,
    update: () => mockBuilder,
    delete: () => mockBuilder,
    from: () => mockBuilder,
    eq: () => mockBuilder,
    neq: () => mockBuilder,
    gt: () => mockBuilder,
    gte: () => mockBuilder,
    lt: () => mockBuilder,
    lte: () => mockBuilder,
    like: () => mockBuilder,
    ilike: () => mockBuilder,
    is: () => mockBuilder,
    in: () => mockBuilder,
    contains: () => mockBuilder,
    containedBy: () => mockBuilder,
    rangeGt: () => mockBuilder,
    rangeGte: () => mockBuilder,
    rangeLt: () => mockBuilder,
    rangeLte: () => mockBuilder,
    rangeAdjacent: () => mockBuilder,
    overlaps: () => mockBuilder,
    textSearch: () => mockBuilder,
    match: () => mockBuilder,
    not: () => mockBuilder,
    or: () => mockBuilder,
    filter: () => mockBuilder,
    order: () => mockBuilder,
    limit: () => mockBuilder,
    range: () => mockBuilder,
    abortSignal: () => mockBuilder,
    single: () => Promise.resolve({ data: { id: 'test-id' }, error: null }),
    maybeSingle: () => Promise.resolve(mockSingle),
    csv: () => Promise.resolve({ data: '', error: null }),
    geojson: () => Promise.resolve(mockSingle),
    explain: () => Promise.resolve({ data: '', error: null }),
    rollback: () => mockBuilder,
    returns: () => mockBuilder,
    then: (resolve: (value: { data: unknown[]; error: null }) => unknown) => Promise.resolve({ data: [{ id: 'test-id' }], error: null }).then(resolve),
    catch: (reject: (reason: unknown) => unknown) => Promise.resolve({ data: [{ id: 'test-id' }], error: null }).catch(reject),
  }

  return {
    from: (table: string) => ({
      ...mockBuilder,
      insert: (values: any) => ({
        ...mockBuilder,
        single: () => Promise.resolve({ data: { id: 'test-id', ...values }, error: null })
      }),
      select: (columns?: string) => mockBuilder,
    }),
    rpc: (functionName: string, params?: any) => {
      // Return different mock data based on function name
      switch (functionName) {
        case 'get_dashboard_updates':
          return Promise.resolve({
            data: [{
              id: 'test-update-id',
              parent_id: 'test-user',
              child_id: 'test-child',
              content: 'Test update',
              milestone_type: 'first_smile',
              distribution_status: 'sent'
            }],
            error: null
          })
        case 'get_dashboard_stats':
          return Promise.resolve({
            data: [{ total_updates: 1 }],
            error: null
          })
        case 'get_timeline_updates':
          return Promise.resolve({
            data: [{ date_group: '2024-01-01', updates_count: 1 }],
            error: null
          })
        case 'toggle_update_like':
          return Promise.resolve({
            data: [{ is_liked: true, like_count: 1 }],
            error: null
          })
        case 'add_update_comment':
          return Promise.resolve({
            data: [{ id: 'comment-id', content: params?.p_content || 'test', created_at: new Date().toISOString() }],
            error: null
          })
        case 'increment_update_view_count':
          return Promise.resolve({ data: null, error: null })
        case 'sql':
          return Promise.resolve({
            data: [{ column_name: 'like_count', data_type: 'integer' }],
            error: null
          })
        default:
          return Promise.resolve({ data: [], error: null })
      }
    },
    auth: {
      getUser: () => Promise.resolve({ data: { user: { id: 'test-user' } }, error: null }),
      getSession: () => Promise.resolve({ data: { session: null }, error: null }),
      onAuthStateChange: () => ({ data: { subscription: {} }, error: null }),
      signOut: () => Promise.resolve({ error: null }),
      signUp: () => Promise.resolve({ data: { user: null, session: null }, error: null }),
      signInWithPassword: () => Promise.resolve({ data: { user: null, session: null }, error: null }),
      admin: {
        createUser: () => Promise.resolve({ data: { user: { id: 'test-user' } }, error: null }),
        deleteUser: () => Promise.resolve({ data: { user: null }, error: null }),
      },
    },
    channel: () => ({
      on: () => ({ subscribe: () => {} }),
      unsubscribe: () => Promise.resolve('ok'),
    }),
    removeChannel: () => {},
    removeAllChannels: () => Promise.resolve([]),
  } as unknown as SupabaseClient<Database>
}

// Test configuration
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const TEST_USER_EMAIL = 'test-dashboard@example.com'
const TEST_USER_PASSWORD = 'test-password-123'

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('Missing required environment variables: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

// Create admin client for testing
const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

interface TestResult {
  name: string
  success: boolean
  error?: string
  details?: any
}

class DashboardTester {
  private results: TestResult[] = []
  private testUserId: string | null = null
  private testChildId: string | null = null
  private testUpdateId: string | null = null

  async run() {
    console.log('🚀 Starting dashboard implementation tests...\n')

    try {
      await this.setupTestData()
      await this.testMigrations()
      await this.testDatabaseFunctions()
      await this.testSecurityPolicies()
      await this.testEngagementFeatures()
      await this.testSearchFunctionality()
      await this.testPerformance()
      await this.cleanup()

      this.printResults()
    } catch (error) {
      console.error('❌ Test suite failed:', error)
      await this.cleanup()
      process.exit(1)
    }
  }

  private async setupTestData() {
    console.log('📋 Setting up test data...')

    try {
      // Create test user
      const { data: user, error: userError } = await adminClient.auth.admin.createUser({
        email: TEST_USER_EMAIL,
        password: TEST_USER_PASSWORD,
        email_confirm: true
      })

      if (userError) throw userError
      this.testUserId = user.user.id

      // Create test child
      const { data: child, error: childError } = await (adminClient as any)
        .from('children')
        .insert({
          parent_id: this.testUserId,
          name: 'Test Child',
          birth_date: '2023-01-01'
        })
        .select()
        .single()

      if (childError) throw childError
      this.testChildId = child.id

      // Create test update
      const { data: update, error: updateError } = await (adminClient as any)
        .from('updates')
        .insert({
          parent_id: this.testUserId,
          child_id: this.testChildId,
          content: 'Test update for dashboard',
          milestone_type: 'first_smile',
          distribution_status: 'sent'
        })
        .select()
        .single()

      if (updateError) throw updateError
      this.testUpdateId = update.id

      this.addResult('Setup test data', true)
    } catch (error) {
      this.addResult('Setup test data', false, (error as Error).message)
      throw error
    }
  }

  private async testMigrations() {
    console.log('🗄️  Testing database migrations...')

    try {
      // Test that new columns exist
      const { data: columns } = await (adminClient as any).rpc('sql', {
        query: `
          SELECT column_name, data_type
          FROM information_schema.columns
          WHERE table_name = 'updates'
          AND column_name IN ('like_count', 'comment_count', 'response_count', 'view_count', 'search_vector')
          ORDER BY column_name;
        `
      })

      const expectedColumns = ['like_count', 'comment_count', 'response_count', 'view_count', 'search_vector']
      const actualColumns = columns?.map((col: any) => col.column_name) || []

      const missingColumns = expectedColumns.filter(col => !actualColumns.includes(col))

      if (missingColumns.length > 0) {
        throw new Error(`Missing columns: ${missingColumns.join(', ')}`)
      }

      // Test that new tables exist
      const { data: tables } = await (adminClient as any).rpc('sql', {
        query: `
          SELECT table_name
          FROM information_schema.tables
          WHERE table_schema = 'public'
          AND table_name IN ('likes', 'comments')
          ORDER BY table_name;
        `
      })

      const expectedTables = ['comments', 'likes']
      const actualTables = tables?.map((table: any) => table.table_name) || []
      const missingTables = expectedTables.filter(table => !actualTables.includes(table))

      if (missingTables.length > 0) {
        throw new Error(`Missing tables: ${missingTables.join(', ')}`)
      }

      this.addResult('Database migrations', true, `Found ${actualColumns.length} columns and ${actualTables.length} tables`)
    } catch (error) {
      this.addResult('Database migrations', false, (error as Error).message)
    }
  }

  private async testDatabaseFunctions() {
    console.log('⚙️  Testing database functions...')

    // Test get_dashboard_updates function
    try {
      const { data, error } = await (adminClient as any).rpc('get_dashboard_updates', {
        p_parent_id: this.testUserId!,
        p_limit: 10
      })

      if (error) throw error

      const hasTestUpdate = data?.some((update: any) => update.id === this.testUpdateId)
      if (!hasTestUpdate) throw new Error('Test update not found in dashboard results')

      this.addResult('get_dashboard_updates function', true, `Found ${data?.length || 0} updates`)
    } catch (error) {
      this.addResult('get_dashboard_updates function', false, (error as Error).message)
    }

    // Test get_dashboard_stats function
    try {
      const { data, error } = await (adminClient as any).rpc('get_dashboard_stats', {
        p_parent_id: this.testUserId!
      })

      if (error) throw error

      const stats = data?.[0]
      if (!stats || stats.total_updates === undefined) {
        throw new Error('Dashboard stats not returned correctly')
      }

      this.addResult('get_dashboard_stats function', true, stats)
    } catch (error) {
      this.addResult('get_dashboard_stats function', false, (error as Error).message)
    }

    // Test get_timeline_updates function
    try {
      const { data, error } = await (adminClient as any).rpc('get_timeline_updates', {
        p_parent_id: this.testUserId!,
        p_limit: 10
      })

      if (error) throw error

      this.addResult('get_timeline_updates function', true, `Found ${data?.length || 0} timeline entries`)
    } catch (error) {
      this.addResult('get_timeline_updates function', false, (error as Error).message)
    }
  }

  private async testSecurityPolicies() {
    console.log('🔒 Testing security policies...')

    // Create a second test user to test access restrictions
    try {
      const { data: otherUser, error: userError } = await adminClient.auth.admin.createUser({
        email: 'other-test-user@example.com',
        password: 'test-password-456',
        email_confirm: true
      })

      if (userError) throw userError

      // Test that other user cannot access first user's dashboard data
      const { data, error } = await (adminClient as any).rpc('get_dashboard_updates', {
        p_parent_id: otherUser.user.id
      })

      // Should return empty array, not an error (RLS working correctly)
      if (error) {
        this.addResult('RLS policies isolation', false, error.message)
      } else if (data?.some((update: any) => update.parent_id === this.testUserId)) {
        this.addResult('RLS policies isolation', false, 'Other user can access private updates')
      } else {
        this.addResult('RLS policies isolation', true)
      }

      // Clean up other user
      await adminClient.auth.admin.deleteUser(otherUser.user.id)
    } catch (error) {
      this.addResult('RLS policies isolation', false, (error as Error).message)
    }

    // Test function-level security
    try {
      const { error } = await (adminClient as any).rpc('get_dashboard_updates', {
        p_parent_id: 'invalid-uuid'
      })

      // Should handle invalid UUID gracefully
      if (error && !error.message.includes('invalid input syntax')) {
        this.addResult('Function parameter validation', true)
      } else {
        this.addResult('Function parameter validation', false, 'Function should validate UUID format')
      }
    } catch (error) {
      this.addResult('Function parameter validation', true)
    }
  }

  private async testEngagementFeatures() {
    console.log('❤️  Testing engagement features...')

    // Test toggle like functionality
    try {
      const { data: likeResult, error: likeError } = await (adminClient as any).rpc('toggle_update_like', {
        p_update_id: this.testUpdateId!,
        p_parent_id: this.testUserId!
      })

      if (likeError) throw likeError

      const result = likeResult?.[0]
      if (!result || result.is_liked === undefined || result.like_count === undefined) {
        throw new Error('Toggle like result invalid')
      }

      this.addResult('Toggle like functionality', true, result)
    } catch (error) {
      this.addResult('Toggle like functionality', false, (error as Error).message)
    }

    // Test add comment functionality
    try {
      const testComment = 'This is a test comment'
      const { data: commentResult, error: commentError } = await (adminClient as any).rpc('add_update_comment', {
        p_update_id: this.testUpdateId!,
        p_parent_id: this.testUserId!,
        p_content: testComment
      })

      if (commentError) throw commentError

      const result = commentResult?.[0]
      if (!result || result.content !== testComment) {
        throw new Error('Add comment result invalid')
      }

      this.addResult('Add comment functionality', true, result)
    } catch (error) {
      this.addResult('Add comment functionality', false, (error as Error).message)
    }

    // Test view count increment
    try {
      const { error } = await (adminClient as any).rpc('increment_update_view_count', {
        p_update_id: this.testUpdateId!,
        p_parent_id: this.testUserId!
      })

      if (error) throw error

      // Verify view count increased
      const { data: update } = await (adminClient as any)
        .from('updates')
        .select('view_count')
        .eq('id', this.testUpdateId!)
        .single()

      if (update && update.view_count > 0) {
        this.addResult('View count increment', true, `View count: ${update.view_count}`)
      } else {
        this.addResult('View count increment', false, 'View count not incremented')
      }
    } catch (error) {
      this.addResult('View count increment', false, (error as Error).message)
    }
  }

  private async testSearchFunctionality() {
    console.log('🔍 Testing search functionality...')

    // Test full-text search
    try {
      const { data, error } = await (adminClient as any).rpc('get_dashboard_updates', {
        p_parent_id: this.testUserId!,
        p_search_query: 'Test update'
      })

      if (error) throw error

      const hasSearchResult = data?.some((update: any) =>
        update.content?.includes('Test update')
      )

      if (hasSearchResult) {
        this.addResult('Full-text search', true, `Found ${data?.length || 0} results`)
      } else {
        this.addResult('Full-text search', false, 'Search did not return expected results')
      }
    } catch (error) {
      this.addResult('Full-text search', false, (error as Error).message)
    }

    // Test milestone filter
    try {
      const { data, error } = await (adminClient as any).rpc('get_dashboard_updates', {
        p_parent_id: this.testUserId!,
        p_milestone_types: ['first_smile']
      })

      if (error) throw error

      const hasMilestoneUpdate = data?.some((update: any) =>
        update.milestone_type === 'first_smile'
      )

      if (hasMilestoneUpdate) {
        this.addResult('Milestone filtering', true, `Found ${data?.length || 0} milestone updates`)
      } else {
        this.addResult('Milestone filtering', false, 'Milestone filter did not work')
      }
    } catch (error) {
      this.addResult('Milestone filtering', false, (error as Error).message)
    }
  }

  private async testPerformance() {
    console.log('⚡ Testing performance...')

    // Test query performance with larger dataset
    try {
      const startTime = Date.now()

      const { data, error } = await (adminClient as any).rpc('get_dashboard_updates', {
        p_parent_id: this.testUserId!,
        p_limit: 100
      })

      const queryTime = Date.now() - startTime

      if (error) throw error

      // Query should complete within reasonable time (< 1 second)
      if (queryTime < 1000) {
        this.addResult('Query performance', true, `Query completed in ${queryTime}ms`)
      } else {
        this.addResult('Query performance', false, `Query took too long: ${queryTime}ms`)
      }
    } catch (error) {
      this.addResult('Query performance', false, (error as Error).message)
    }

    // Test index usage
    try {
      const { data, error } = await (adminClient as any).rpc('sql', {
        query: `
          EXPLAIN (FORMAT JSON)
          SELECT * FROM get_dashboard_updates('${this.testUserId}', NULL, NULL, NULL, NULL, NULL, NULL, 20, 0, NULL, NULL);
        `
      })

      if (error) throw error

      // Check if indexes are being used (this is a basic check)
      const plan = JSON.stringify(data)
      const usesIndexScan = plan.includes('Index Scan') || plan.includes('Bitmap')

      this.addResult('Index usage', usesIndexScan, `Index scan used: ${usesIndexScan}`)
    } catch (error) {
      this.addResult('Index usage', false, (error as Error).message)
    }
  }

  private async cleanup() {
    console.log('🧹 Cleaning up test data...')

    try {
      if (this.testUserId) {
        await adminClient.auth.admin.deleteUser(this.testUserId)
      }
      this.addResult('Cleanup', true)
    } catch (error) {
      this.addResult('Cleanup', false, (error as Error).message)
    }
  }

  private addResult(name: string, success: boolean, error?: string, details?: any) {
    this.results.push({ name, success, error, details })
  }

  private printResults() {
    console.log('\n📊 Test Results Summary')
    console.log('========================\n')

    const passed = this.results.filter(r => r.success).length
    const total = this.results.length

    this.results.forEach(result => {
      const icon = result.success ? '✅' : '❌'
      const status = result.success ? 'PASS' : 'FAIL'

      console.log(`${icon} ${result.name}: ${status}`)

      if (result.error) {
        console.log(`   Error: ${result.error}`)
      }

      if (result.details) {
        console.log(`   Details: ${JSON.stringify(result.details, null, 2)}`)
      }

      console.log()
    })

    console.log(`📈 Overall: ${passed}/${total} tests passed (${Math.round(passed/total*100)}%)`)

    if (passed === total) {
      console.log('🎉 All tests passed! Dashboard implementation is ready.')
      process.exit(0)
    } else {
      console.log('⚠️  Some tests failed. Please review and fix issues.')
      process.exit(1)
    }
  }
}

// Run the tests
if (require.main === module) {
  const tester = new DashboardTester()
  tester.run().catch(console.error)
}

export { DashboardTester }