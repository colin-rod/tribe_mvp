-- Migration: Test and Validate JSONB Index Optimizations
-- Date: 2025-10-01
-- Description: Test queries to validate index creation and performance
-- Priority: High | Category: Performance | Effort: Low

-- =============================================================================
-- PART 1: VERIFY INDEX CREATION
-- =============================================================================

-- Check that all expected indexes were created
DO $$
DECLARE
  missing_indexes TEXT[] := ARRAY[]::TEXT[];
  index_name TEXT;
  expected_indexes TEXT[] := ARRAY[
    'idx_profiles_email_notifications',
    'idx_profiles_browser_notifications',
    'idx_profiles_quiet_hours_start',
    'idx_profiles_quiet_hours_end',
    'idx_profiles_notification_prefs_gin',
    'idx_recipients_has_mute_settings',
    'idx_recipients_mute_until',
    'idx_recipients_notification_prefs_gin',
    'idx_notification_history_metadata_gin',
    'idx_notification_jobs_metadata_gin',
    'idx_digest_queue_content_gin',
    'idx_digests_ai_compilation_data_gin'
  ];
BEGIN
  RAISE NOTICE 'Verifying JSONB index creation...';

  -- Check each expected index
  FOREACH index_name IN ARRAY expected_indexes
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_indexes
      WHERE indexname = index_name
    ) THEN
      missing_indexes := array_append(missing_indexes, index_name);
    END IF;
  END LOOP;

  -- Report results
  IF array_length(missing_indexes, 1) > 0 THEN
    RAISE WARNING 'Missing indexes: %', array_to_string(missing_indexes, ', ');
  ELSE
    RAISE NOTICE '✓ All expected indexes created successfully';
  END IF;
END $$;

-- =============================================================================
-- PART 2: VERIFY HELPER FUNCTIONS
-- =============================================================================

DO $$
DECLARE
  missing_functions TEXT[] := ARRAY[]::TEXT[];
  function_name TEXT;
  expected_functions TEXT[] := ARRAY[
    'has_email_notifications_enabled',
    'is_in_quiet_hours',
    'get_active_notification_channels',
    'is_recipient_globally_muted',
    'get_bulk_notification_preferences',
    'get_unmuted_recipients_for_group',
    'get_profiles_for_weekly_digest',
    'find_notifications_by_metadata',
    'find_jobs_by_content',
    'analyze_jsonb_query_performance'
  ];
BEGIN
  RAISE NOTICE 'Verifying helper function creation...';

  -- Check each expected function
  FOREACH function_name IN ARRAY expected_functions
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_proc p
      JOIN pg_namespace n ON p.pronamespace = n.oid
      WHERE n.nspname = 'public'
        AND p.proname = function_name
    ) THEN
      missing_functions := array_append(missing_functions, function_name);
    END IF;
  END LOOP;

  -- Report results
  IF array_length(missing_functions, 1) > 0 THEN
    RAISE WARNING 'Missing functions: %', array_to_string(missing_functions, ', ');
  ELSE
    RAISE NOTICE '✓ All expected helper functions created successfully';
  END IF;
END $$;

-- =============================================================================
-- PART 3: TEST QUERIES WITH EXPLAIN PLANS
-- =============================================================================

-- Test 1: Email notifications expression index
EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT id, email
FROM profiles
WHERE (notification_preferences->>'email_notifications')::boolean = true
LIMIT 10;

-- Test 2: Quiet hours expression indexes
EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT id,
  notification_preferences->'quiet_hours'->>'start' AS quiet_start
FROM profiles
WHERE notification_preferences->'quiet_hours'->>'start' IS NOT NULL
LIMIT 10;

-- Test 3: Mute settings partial index
EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT id, email
FROM recipients
WHERE notification_preferences ? 'mute_settings'
  AND (notification_preferences->'mute_settings'->>'mute_until')::TIMESTAMP WITH TIME ZONE > NOW()
LIMIT 10;

-- Test 4: Metadata GIN index containment query
EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT id, type, title
FROM notification_history
WHERE metadata @> '{"type": "email"}'::jsonb
LIMIT 10;

-- =============================================================================
-- PART 4: PERFORMANCE COMPARISON QUERIES
-- =============================================================================

-- Create a temporary table to store performance test results
CREATE TEMP TABLE IF NOT EXISTS jsonb_performance_tests (
  test_name TEXT,
  query_type TEXT,
  execution_time_ms NUMERIC,
  rows_returned INTEGER,
  index_used TEXT,
  timestamp TIMESTAMP DEFAULT NOW()
);

-- Performance Test 1: Email notifications lookup
DO $$
DECLARE
  start_time TIMESTAMP;
  end_time TIMESTAMP;
  execution_time NUMERIC;
  row_count INTEGER;
BEGIN
  start_time := clock_timestamp();

  SELECT COUNT(*) INTO row_count
  FROM profiles
  WHERE (notification_preferences->>'email_notifications')::boolean = true;

  end_time := clock_timestamp();
  execution_time := EXTRACT(EPOCH FROM (end_time - start_time)) * 1000;

  INSERT INTO jsonb_performance_tests (test_name, query_type, execution_time_ms, rows_returned, index_used)
  VALUES ('Email notifications filter', 'Expression index', execution_time, row_count, 'idx_profiles_email_notifications');

  RAISE NOTICE 'Email notifications query: % rows in % ms', row_count, execution_time;
END $$;

-- Performance Test 2: Mute status check
DO $$
DECLARE
  start_time TIMESTAMP;
  end_time TIMESTAMP;
  execution_time NUMERIC;
  row_count INTEGER;
BEGIN
  start_time := clock_timestamp();

  SELECT COUNT(*) INTO row_count
  FROM recipients
  WHERE notification_preferences ? 'mute_settings'
    AND (notification_preferences->'mute_settings'->>'mute_until')::TIMESTAMP WITH TIME ZONE > NOW();

  end_time := clock_timestamp();
  execution_time := EXTRACT(EPOCH FROM (end_time - start_time)) * 1000;

  INSERT INTO jsonb_performance_tests (test_name, query_type, execution_time_ms, rows_returned, index_used)
  VALUES ('Active mute status check', 'Partial index', execution_time, row_count, 'idx_recipients_mute_until');

  RAISE NOTICE 'Mute status query: % rows in % ms', row_count, execution_time;
END $$;

-- Performance Test 3: Metadata containment query
DO $$
DECLARE
  start_time TIMESTAMP;
  end_time TIMESTAMP;
  execution_time NUMERIC;
  row_count INTEGER;
BEGIN
  start_time := clock_timestamp();

  SELECT COUNT(*) INTO row_count
  FROM notification_history
  WHERE metadata @> '{}'::jsonb
  LIMIT 1000;

  end_time := clock_timestamp();
  execution_time := EXTRACT(EPOCH FROM (end_time - start_time)) * 1000;

  INSERT INTO jsonb_performance_tests (test_name, query_type, execution_time_ms, rows_returned, index_used)
  VALUES ('Metadata containment query', 'GIN index', execution_time, row_count, 'idx_notification_history_metadata_gin');

  RAISE NOTICE 'Metadata query: % rows in % ms', row_count, execution_time;
END $$;

-- =============================================================================
-- PART 5: TEST HELPER FUNCTIONS
-- =============================================================================

-- Test helper functions with sample data (if any exists)
DO $$
DECLARE
  test_profile_id UUID;
  test_recipient_id UUID;
  result BOOLEAN;
  channels TEXT[];
BEGIN
  RAISE NOTICE 'Testing helper functions...';

  -- Get a sample profile ID
  SELECT id INTO test_profile_id FROM profiles LIMIT 1;

  IF test_profile_id IS NOT NULL THEN
    -- Test has_email_notifications_enabled
    SELECT has_email_notifications_enabled(test_profile_id) INTO result;
    RAISE NOTICE '✓ has_email_notifications_enabled: %', result;

    -- Test is_in_quiet_hours
    SELECT is_in_quiet_hours(test_profile_id) INTO result;
    RAISE NOTICE '✓ is_in_quiet_hours: %', result;

    -- Test get_active_notification_channels
    SELECT get_active_notification_channels(test_profile_id) INTO channels;
    RAISE NOTICE '✓ get_active_notification_channels: %', channels;
  ELSE
    RAISE NOTICE 'No profiles found for testing';
  END IF;

  -- Get a sample recipient ID
  SELECT id INTO test_recipient_id FROM recipients LIMIT 1;

  IF test_recipient_id IS NOT NULL THEN
    -- Test is_recipient_globally_muted
    SELECT is_recipient_globally_muted(test_recipient_id) INTO result;
    RAISE NOTICE '✓ is_recipient_globally_muted: %', result;
  ELSE
    RAISE NOTICE 'No recipients found for testing';
  END IF;
END $$;

-- =============================================================================
-- PART 6: INDEX SIZE AND USAGE STATISTICS
-- =============================================================================

-- Display index sizes
SELECT
  schemaname,
  tablename,
  indexname,
  pg_size_pretty(pg_relation_size(indexrelid)) AS index_size,
  idx_scan AS number_of_scans,
  idx_tup_read AS tuples_read,
  idx_tup_fetch AS tuples_fetched
FROM pg_stat_user_indexes
WHERE indexname LIKE '%notification%'
   OR indexname LIKE '%metadata%'
   OR indexname LIKE '%quiet_hours%'
   OR indexname LIKE '%mute%'
   OR indexname LIKE '%digest%'
ORDER BY pg_relation_size(indexrelid) DESC;

-- =============================================================================
-- PART 7: GENERATE TEST REPORT
-- =============================================================================

-- Summary report of all tests
DO $$
DECLARE
  total_indexes INTEGER;
  total_functions INTEGER;
  avg_execution_time NUMERIC;
BEGIN
  RAISE NOTICE '==========================================';
  RAISE NOTICE 'JSONB OPTIMIZATION TEST SUMMARY';
  RAISE NOTICE '==========================================';

  -- Count indexes
  SELECT COUNT(*) INTO total_indexes
  FROM pg_indexes
  WHERE indexname LIKE '%notification%'
     OR indexname LIKE '%metadata%'
     OR indexname LIKE '%quiet_hours%'
     OR indexname LIKE '%mute%'
     OR indexname LIKE '%digest%';

  RAISE NOTICE 'Total JSONB-related indexes: %', total_indexes;

  -- Count helper functions
  SELECT COUNT(*) INTO total_functions
  FROM pg_proc p
  JOIN pg_namespace n ON p.pronamespace = n.oid
  WHERE n.nspname = 'public'
    AND p.proname IN (
      'has_email_notifications_enabled',
      'is_in_quiet_hours',
      'get_active_notification_channels',
      'is_recipient_globally_muted',
      'get_bulk_notification_preferences',
      'get_unmuted_recipients_for_group',
      'get_profiles_for_weekly_digest'
    );

  RAISE NOTICE 'Total helper functions: %', total_functions;

  -- Average query performance
  SELECT AVG(execution_time_ms) INTO avg_execution_time
  FROM jsonb_performance_tests;

  IF avg_execution_time IS NOT NULL THEN
    RAISE NOTICE 'Average query execution time: % ms', ROUND(avg_execution_time, 2);
  END IF;

  RAISE NOTICE '==========================================';
  RAISE NOTICE 'Performance test results saved to jsonb_performance_tests table';
  RAISE NOTICE 'Use: SELECT * FROM jsonb_performance_tests ORDER BY execution_time_ms;';
  RAISE NOTICE '==========================================';
END $$;

-- Display performance test results
SELECT
  test_name,
  query_type,
  ROUND(execution_time_ms, 2) AS execution_time_ms,
  rows_returned,
  index_used,
  timestamp
FROM jsonb_performance_tests
ORDER BY execution_time_ms DESC;

-- =============================================================================
-- PART 8: RECOMMENDATIONS
-- =============================================================================

-- Generate recommendations based on test results
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE 'RECOMMENDATIONS:';
  RAISE NOTICE '1. Monitor index usage with: SELECT * FROM v_jsonb_index_usage;';
  RAISE NOTICE '2. Check slow queries with: SELECT * FROM v_jsonb_query_performance;';
  RAISE NOTICE '3. Run ANALYZE periodically to update statistics';
  RAISE NOTICE '4. Review JSONB_QUERY_BEST_PRACTICES.md for query optimization tips';
  RAISE NOTICE '5. Use helper functions for consistent index usage';
  RAISE NOTICE '';
END $$;

-- =============================================================================
-- COMMENTS
-- =============================================================================

COMMENT ON TABLE jsonb_performance_tests IS 'Temporary table storing JSONB query performance test results';
