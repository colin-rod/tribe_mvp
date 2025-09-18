#!/usr/bin/env node

/**
 * Supabase Connection and RLS Policy Test Script
 * Tests database connectivity, authentication, and Row Level Security policies
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Configuration
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Test user credentials (created in test_data.sql)
const TEST_USER = {
  id: '550e8400-e29b-41d4-a716-446655440001',
  email: 'colin@colinrodrigues.com',
  password: 'test-password-123'
};

// Colors for console output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m'
};

const log = {
  success: (msg) => console.log(`${colors.green}✅ ${msg}${colors.reset}`),
  error: (msg) => console.log(`${colors.red}❌ ${msg}${colors.reset}`),
  warning: (msg) => console.log(`${colors.yellow}⚠️  ${msg}${colors.reset}`),
  info: (msg) => console.log(`${colors.blue}ℹ️  ${msg}${colors.reset}`),
  test: (msg) => console.log(`\\n🧪 Testing: ${msg}`)
};

async function testSupabaseConnection() {
  log.test('Supabase Connection');

  try {
    // Test with service role key
    const adminClient = createClient(supabaseUrl, supabaseServiceKey);
    const { data: profiles, error } = await adminClient
      .from('profiles')
      .select('*')
      .limit(1);

    if (error) {
      log.error(`Connection failed: ${error.message}`);
      return false;
    }

    log.success('Connected to Supabase successfully');
    log.info(`Found ${profiles.length} profile(s) in database`);
    return true;
  } catch (error) {
    log.error(`Connection error: ${error.message}`);
    return false;
  }
}

async function testTableStructure() {
  log.test('Table Structure');

  const adminClient = createClient(supabaseUrl, supabaseServiceKey);

  const expectedTables = [
    'profiles',
    'children',
    'recipient_groups',
    'recipients',
    'updates',
    'delivery_jobs',
    'responses',
    'ai_prompts'
  ];

  try {
    for (const table of expectedTables) {
      const { data, error } = await adminClient
        .from(table)
        .select('*')
        .limit(1);

      if (error) {
        log.error(`Table '${table}' error: ${error.message}`);
        return false;
      }

      log.success(`Table '${table}' exists and accessible`);
    }

    return true;
  } catch (error) {
    log.error(`Table structure test failed: ${error.message}`);
    return false;
  }
}

async function testRLSPolicies() {
  log.test('Row Level Security Policies');

  try {
    // Test with anon client (no auth)
    const anonClient = createClient(supabaseUrl, supabaseAnonKey);

    // This should return empty results due to RLS
    const { data: profilesAnon, error: profilesError } = await anonClient
      .from('profiles')
      .select('*');

    if (profilesError) {
      log.error(`RLS test failed: ${profilesError.message}`);
      return false;
    }

    if (profilesAnon.length === 0) {
      log.success('RLS working - no data returned without auth');
    } else {
      log.warning(`RLS may not be working - got ${profilesAnon.length} profiles without auth`);
    }

    // Test with service role (should bypass RLS)
    const adminClient = createClient(supabaseUrl, supabaseServiceKey);
    const { data: profilesAdmin, error: adminError } = await adminClient
      .from('profiles')
      .select('*');

    if (adminError) {
      log.error(`Admin access failed: ${adminError.message}`);
      return false;
    }

    if (profilesAdmin.length > 0) {
      log.success(`Admin access working - found ${profilesAdmin.length} profile(s)`);
    }

    return true;
  } catch (error) {
    log.error(`RLS test error: ${error.message}`);
    return false;
  }
}

async function testStorageBucket() {
  log.test('Storage Bucket Configuration');

  try {
    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    // List buckets
    const { data: buckets, error } = await adminClient.storage.listBuckets();

    if (error) {
      log.error(`Storage test failed: ${error.message}`);
      return false;
    }

    const mediaBucket = buckets.find(bucket => bucket.name === 'media');

    if (!mediaBucket) {
      log.error('Media bucket not found');
      return false;
    }

    log.success('Media bucket exists');
    log.info(`Bucket public: ${mediaBucket.public}`);
    log.info(`File size limit: ${mediaBucket.file_size_limit / 1024 / 1024}MB`);

    return true;
  } catch (error) {
    log.error(`Storage test error: ${error.message}`);
    return false;
  }
}

async function testDatabaseFunctions() {
  log.test('Database Functions');

  try {
    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    // Test get_recipient_by_token function
    const { data, error } = await adminClient.rpc('get_recipient_by_token', {
      token: 'token_grandma_mary_001'
    });

    if (error) {
      log.error(`Function test failed: ${error.message}`);
      return false;
    }

    if (data && data.length > 0) {
      log.success('get_recipient_by_token function working');
      log.info(`Found recipient: ${data[0].recipient_data.name}`);
    } else {
      log.warning('Function returned no data - check test data was loaded');
    }

    return true;
  } catch (error) {
    log.error(`Function test error: ${error.message}`);
    return false;
  }
}

async function testDataIntegrity() {
  log.test('Data Integrity and Relationships');

  try {
    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    // Test profile -> children relationship
    const { data: profileWithChildren, error } = await adminClient
      .from('profiles')
      .select(`
        id,
        name,
        children (
          id,
          name,
          birth_date
        )
      `)
      .eq('email', 'colin@colinrodrigues.com')
      .single();

    if (error) {
      log.error(`Data integrity test failed: ${error.message}`);
      return false;
    }

    if (profileWithChildren) {
      log.success(`Profile found: ${profileWithChildren.name}`);
      log.info(`Children count: ${profileWithChildren.children.length}`);

      if (profileWithChildren.children.length > 0) {
        profileWithChildren.children.forEach(child => {
          log.info(`  - ${child.name} (born ${child.birth_date})`);
        });
      }
    }

    return true;
  } catch (error) {
    log.error(`Data integrity test error: ${error.message}`);
    return false;
  }
}

async function runAllTests() {
  console.log('🚀 Starting Supabase Test Suite for Tribe MVP\\n');

  // Check environment variables
  if (!supabaseUrl || !supabaseServiceKey || !supabaseAnonKey) {
    log.error('Missing required environment variables');
    log.info('Required: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, NEXT_PUBLIC_SUPABASE_ANON_KEY');
    process.exit(1);
  }

  log.info(`Testing Supabase URL: ${supabaseUrl}`);

  const tests = [
    { name: 'Connection', fn: testSupabaseConnection },
    { name: 'Table Structure', fn: testTableStructure },
    { name: 'RLS Policies', fn: testRLSPolicies },
    { name: 'Storage Bucket', fn: testStorageBucket },
    { name: 'Database Functions', fn: testDatabaseFunctions },
    { name: 'Data Integrity', fn: testDataIntegrity }
  ];

  let passed = 0;
  let failed = 0;

  for (const test of tests) {
    try {
      const result = await test.fn();
      if (result) {
        passed++;
      } else {
        failed++;
      }
    } catch (error) {
      log.error(`Test '${test.name}' threw error: ${error.message}`);
      failed++;
    }
  }

  console.log('\\n📊 Test Results:');
  console.log(`${colors.green}✅ Passed: ${passed}${colors.reset}`);
  console.log(`${colors.red}❌ Failed: ${failed}${colors.reset}`);

  if (failed === 0) {
    console.log(`\\n🎉 All tests passed! Supabase setup is working correctly.`);
    process.exit(0);
  } else {
    console.log(`\\n⚠️  Some tests failed. Check the output above for details.`);
    process.exit(1);
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  runAllTests().catch(error => {
    log.error(`Test suite failed: ${error.message}`);
    process.exit(1);
  });
}

module.exports = {
  testSupabaseConnection,
  testTableStructure,
  testRLSPolicies,
  testStorageBucket,
  testDatabaseFunctions,
  testDataIntegrity
};