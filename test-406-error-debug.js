#!/usr/bin/env node

/**
 * Test script to reproduce and debug the HTTP 406 error on responses table
 * This script attempts to replicate the exact queries made by getRecentUpdatesWithStats
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

// Test user credentials from test_data.sql
const TEST_USER = {
  id: '550e8400-e29b-41d4-a716-446655440001',
  email: 'colin@colinrodrigues.com',
  password: 'test-password-123'
};

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('🔍 Testing 406 Error with Responses Table\n');
console.log('Environment:');
console.log('- Supabase URL:', supabaseUrl);
console.log('- Anon Key (first 20):', supabaseAnonKey?.substring(0, 20) + '...');
console.log('- Service Key available:', !!supabaseServiceKey);
console.log('- Test User:', TEST_USER.email);
console.log('');

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing Supabase environment variables');
  process.exit(1);
}

async function testAuthenticatedAccess() {
  console.log('📝 Test 1: Authenticated User Access');
  console.log('-----------------------------------');

  const supabase = createClient(supabaseUrl, supabaseAnonKey);

  try {
    // Try to sign in the test user
    console.log('1. Attempting to sign in test user...');
    const { data: { user }, error: signInError } = await supabase.auth.signInWithPassword({
      email: TEST_USER.email,
      password: TEST_USER.password,
    });

    if (signInError) {
      console.error('❌ Sign in failed:', signInError.message);
      console.log('⚠️  This might be expected if test user doesn\'t exist or password is wrong');
      return false;
    }

    if (!user) {
      console.error('❌ No user returned from sign in');
      return false;
    }

    console.log('✅ User signed in successfully:', {
      id: user.id,
      email: user.email,
      lastSignIn: user.last_sign_in_at
    });

    // Test 1: Get user's updates
    console.log('\n2. Testing updates table access...');
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

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
      .eq('parent_id', user.id)
      .gte('created_at', thirtyDaysAgo.toISOString())
      .order('created_at', { ascending: false })
      .limit(5);

    if (updatesError) {
      console.error('❌ Updates query failed:', {
        code: updatesError.code,
        message: updatesError.message,
        details: updatesError.details,
        hint: updatesError.hint
      });
      return false;
    }

    console.log('✅ Updates retrieved:', updates?.length || 0);

    if (updates && updates.length > 0) {
      console.log('📊 Sample update:', {
        id: updates[0].id,
        created_at: updates[0].created_at,
        content: updates[0].content.substring(0, 50) + '...'
      });

      // Test 2: Test the exact responses query that's failing
      console.log('\n3. Testing responses table access (the failing query)...');
      const updateId = updates[0].id;

      console.log(`Testing with update_id: ${updateId}`);

      // Test the exact query from the error log
      const { data: responseData, error: responseError } = await supabase
        .from('responses')
        .select('received_at')
        .eq('update_id', updateId)
        .order('received_at', { ascending: false })
        .limit(1);

      if (responseError) {
        console.error('❌ RESPONSES QUERY FAILED (This is the 406 error!):', {
          code: responseError.code,
          message: responseError.message,
          details: responseError.details,
          hint: responseError.hint,
          statusCode: responseError.statusCode,
          status: responseError.status
        });

        // Additional debugging
        console.log('\n🔬 Additional Debug Info:');
        console.log('- Query: responses.select(received_at).eq(update_id, ' + updateId + ')');
        console.log('- User ID:', user.id);
        console.log('- Update owner:', updates[0].parent_id);
        console.log('- User owns update:', user.id === updates[0].parent_id);

        return false;
      }

      console.log('✅ Responses query succeeded:', responseData?.length || 0);
      if (responseData && responseData.length > 0) {
        console.log('📊 Last response:', responseData[0]);
      }

      // Test 3: Test response count query
      console.log('\n4. Testing response count query...');
      const { count, error: countError } = await supabase
        .from('responses')
        .select('*', { count: 'exact', head: true })
        .eq('update_id', updateId);

      if (countError) {
        console.error('❌ Response count query failed:', {
          code: countError.code,
          message: countError.message,
          details: countError.details,
          hint: countError.hint
        });
        return false;
      }

      console.log('✅ Response count query succeeded:', count);
    } else {
      console.log('⚠️  No updates found for user, cannot test responses queries');
    }

    return true;

  } catch (error) {
    console.error('❌ Unexpected error:', error);
    return false;
  }
}

async function testServiceRoleAccess() {
  console.log('\n📝 Test 2: Service Role Access');
  console.log('------------------------------');

  if (!supabaseServiceKey) {
    console.log('⚠️  Service key not available, skipping service role test');
    return;
  }

  const adminClient = createClient(supabaseUrl, supabaseServiceKey);

  try {
    // Test accessing responses table with service role
    console.log('1. Testing responses table with service role...');

    const { data: allResponses, error: responseError } = await adminClient
      .from('responses')
      .select('*')
      .limit(10);

    if (responseError) {
      console.error('❌ Service role responses query failed:', responseError);
      return false;
    }

    console.log('✅ Service role can access responses:', allResponses?.length || 0);

    if (allResponses && allResponses.length > 0) {
      console.log('📊 Sample response:', {
        id: allResponses[0].id,
        update_id: allResponses[0].update_id,
        received_at: allResponses[0].received_at
      });
    }

    return true;

  } catch (error) {
    console.error('❌ Service role test error:', error);
    return false;
  }
}

async function testRLSPolicies() {
  console.log('\n📝 Test 3: RLS Policy Analysis');
  console.log('-------------------------------');

  if (!supabaseServiceKey) {
    console.log('⚠️  Service key not available, skipping RLS policy test');
    return;
  }

  const adminClient = createClient(supabaseUrl, supabaseServiceKey);

  try {
    // Get RLS policies for responses table
    console.log('1. Checking RLS policies for responses table...');

    const { data: policies, error: policyError } = await adminClient
      .from('pg_policies')
      .select('*')
      .eq('tablename', 'responses');

    if (policyError) {
      console.error('❌ Failed to get RLS policies:', policyError);
      return false;
    }

    console.log('✅ RLS policies for responses table:', policies?.length || 0);

    if (policies && policies.length > 0) {
      policies.forEach((policy, index) => {
        console.log(`📋 Policy ${index + 1}: ${policy.policyname}`);
        console.log(`   - Command: ${policy.cmd}`);
        console.log(`   - Expression: ${policy.qual}`);
        console.log(`   - With Check: ${policy.with_check}`);
        console.log('');
      });
    }

    return true;

  } catch (error) {
    console.error('❌ RLS policy test error:', error);
    return false;
  }
}

async function runAllTests() {
  console.log('🚀 Starting comprehensive 406 error debugging...\n');

  const test1Result = await testAuthenticatedAccess();
  const test2Result = await testServiceRoleAccess();
  const test3Result = await testRLSPolicies();

  console.log('\n📊 Test Results Summary');
  console.log('=======================');
  console.log('- Authenticated Access:', test1Result ? '✅ PASS' : '❌ FAIL');
  console.log('- Service Role Access:', test2Result ? '✅ PASS' : '❌ FAIL');
  console.log('- RLS Policy Analysis:', test3Result ? '✅ PASS' : '❌ FAIL');

  if (!test1Result) {
    console.log('\n💡 Next Steps:');
    console.log('1. Check if test user exists and password is correct');
    console.log('2. Verify RLS policies on responses table');
    console.log('3. Check if migration was applied correctly');
    console.log('4. Ensure responses table exists and has data');
  }
}

runAllTests().catch(console.error);