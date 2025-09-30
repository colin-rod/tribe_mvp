#!/usr/bin/env node

/**
 * Test script to simulate the updates loading process that happens in the browser
 * This script will attempt to reproduce the exact error scenario
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

console.log('🧪 Testing Updates Loading Process (Simulating Browser)');
console.log('========================================================\n');

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing Supabase environment variables');
  process.exit(1);
}

// Simulate the exact getRecentUpdatesWithStats function
async function simulateGetRecentUpdatesWithStats(limit = 5) {
  const supabase = createClient(supabaseUrl, supabaseAnonKey);

  console.log('📊 Getting recent updates with stats', { limit });

  // Log client connection status
  console.log('🔗 Supabase client info', {
    supabaseUrl: supabase.supabaseUrl,
    supabaseKey: supabase.supabaseKey?.substring(0, 20) + '...',
    clientType: 'browser',
    storageKey: supabase.storageKey
  });

  // Check authentication with detailed logging
  console.log('\n1. Checking authentication...');
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError) {
    console.error('❌ Authentication error:', {
      error: authError,
      code: authError.code,
      message: authError.message
    });
    throw new Error(`Authentication failed: ${authError.message}`);
  }

  if (!user) {
    console.error('❌ No user found - not authenticated');
    throw new Error('Not authenticated - no user session found');
  }

  console.log('✅ User authenticated successfully:', {
    userId: user.id,
    email: user.email,
    lastSignIn: user.last_sign_in_at
  });

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  // Get basic update data with child information and engagement counts
  console.log('\n2. Querying updates table...');
  console.log('📋 Query params:', {
    userId: user.id,
    thirtyDaysAgo: thirtyDaysAgo.toISOString(),
    limit
  });

  const { data: updates, error } = await supabase
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
    .limit(limit);

  if (error) {
    console.error('❌ Error querying updates table:', {
      error,
      code: error.code,
      message: error.message,
      details: error.details,
      hint: error.hint
    });
    throw error;
  }

  console.log('✅ Successfully retrieved updates:', {
    count: updates?.length || 0,
    updateIds: updates?.map(u => u.id) || []
  });

  if (!updates || updates.length === 0) {
    console.log('⚠️  No updates found, skipping responses queries');
    return [];
  }

  // Get the update IDs for batch queries
  const updateIds = updates.map(update => update.id);

  // Get user's likes for these updates in a single query
  console.log('\n3. Querying likes table...');
  const { data: userLikes, error: likesError } = await supabase
    .from('likes')
    .select('update_id')
    .eq('parent_id', user.id)
    .in('update_id', updateIds);

  if (likesError) {
    console.warn('⚠️  Error querying likes table (non-fatal):', {
      error: likesError,
      code: likesError.code,
      message: likesError.message
    });
  }

  const likedUpdateIds = new Set(userLikes?.map(like => like.update_id) || []);

  // Get response counts and engagement data for each update
  console.log('\n4. Getting response counts for updates...');

  const updatesWithStats = [];

  for (const update of updates) {
    console.log(`\n   Processing update: ${update.id}`);

    // Get response count - THIS IS WHERE THE 406 ERROR OCCURS
    console.log('     🔍 Querying response count...');
    const { count, error: countError } = await supabase
      .from('responses')
      .select('*', { count: 'exact', head: true })
      .eq('update_id', update.id);

    if (countError) {
      console.error('     ❌ ERROR getting response count (THIS IS THE 406 ERROR!):', {
        updateId: update.id,
        error: countError,
        code: countError.code,
        message: countError.message,
        details: countError.details,
        hint: countError.hint,
        statusCode: countError.statusCode,
        status: countError.status
      });
      // Don't throw here, just log and continue with 0 count
    } else {
      console.log('     ✅ Response count retrieved:', count);
    }

    // Get last response - THIS MIGHT ALSO FAIL
    console.log('     🔍 Querying last response...');
    const { data: lastResponse, error: lastResponseError } = await supabase
      .from('responses')
      .select('received_at')
      .eq('update_id', update.id)
      .order('received_at', { ascending: false })
      .limit(1)
      .single();

    if (lastResponseError && lastResponseError.code !== 'PGRST116') {
      console.error('     ❌ ERROR getting last response:', {
        updateId: update.id,
        error: lastResponseError,
        code: lastResponseError.code,
        message: lastResponseError.message,
        details: lastResponseError.details,
        hint: lastResponseError.hint,
        statusCode: lastResponseError.statusCode,
        status: lastResponseError.status
      });
      // Don't throw here, just log and continue
    } else if (lastResponseError && lastResponseError.code === 'PGRST116') {
      console.log('     ℹ️  No responses found for this update (PGRST116)');
    } else {
      console.log('     ✅ Last response retrieved:', lastResponse?.received_at);
    }

    const result = {
      ...update,
      response_count: count || 0,
      last_response_at: lastResponse?.received_at || null,
      has_unread_responses: false,
      like_count: update.like_count || 0,
      comment_count: update.comment_count || 0,
      isLiked: likedUpdateIds.has(update.id)
    };

    console.log('     📊 Processed update stats:', {
      updateId: update.id,
      responseCount: result.response_count,
      lastResponseAt: result.last_response_at,
      isLiked: result.isLiked
    });

    updatesWithStats.push(result);
  }

  console.log('\n✅ Successfully processed all updates with stats:', {
    totalUpdates: updatesWithStats.length,
    totalResponses: updatesWithStats.reduce((sum, u) => sum + u.response_count, 0)
  });

  return updatesWithStats;
}

async function main() {
  try {
    const updates = await simulateGetRecentUpdatesWithStats(5);
    console.log('\n🎉 Updates loading simulation completed successfully!');
    console.log(`📈 Retrieved ${updates.length} updates with stats`);
  } catch (error) {
    console.error('\n💥 Updates loading simulation failed!');
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      code: error.code,
      details: error.details,
      hint: error.hint
    });
  }
}

main();