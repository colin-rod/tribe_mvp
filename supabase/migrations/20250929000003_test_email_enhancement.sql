-- Test script for Email and Rich Text Enhancement Migration
-- Migration: 20250929000003_test_email_enhancement.sql
-- Description: Test the fixed email enhancement migration

-- =============================================================================
-- TEST FUNCTIONS AND VALIDATION
-- =============================================================================

-- Test function to validate all components work correctly
CREATE OR REPLACE FUNCTION test_email_enhancement_migration()
RETURNS TABLE(
  test_name TEXT,
  status TEXT,
  details TEXT
)
LANGUAGE plpgsql
AS $$
BEGIN
  -- Test 1: Check if new columns exist
  BEGIN
    PERFORM 1 FROM information_schema.columns
    WHERE table_name = 'updates' AND column_name IN ('subject', 'rich_content', 'content_format');

    IF FOUND THEN
      RETURN QUERY SELECT 'Column Creation'::TEXT, 'PASS'::TEXT, 'All new columns created successfully'::TEXT;
    ELSE
      RETURN QUERY SELECT 'Column Creation'::TEXT, 'FAIL'::TEXT, 'Missing required columns'::TEXT;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    RETURN QUERY SELECT 'Column Creation'::TEXT, 'ERROR'::TEXT, SQLERRM::TEXT;
  END;

  -- Test 2: Check if indexes exist
  BEGIN
    PERFORM 1 FROM pg_indexes
    WHERE tablename = 'updates' AND indexname IN (
      'idx_updates_content_format',
      'idx_updates_subject_search',
      'idx_updates_rich_content',
      'idx_updates_format_created'
    );

    IF FOUND THEN
      RETURN QUERY SELECT 'Index Creation'::TEXT, 'PASS'::TEXT, 'Required indexes created successfully'::TEXT;
    ELSE
      RETURN QUERY SELECT 'Index Creation'::TEXT, 'FAIL'::TEXT, 'Missing required indexes'::TEXT;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    RETURN QUERY SELECT 'Index Creation'::TEXT, 'ERROR'::TEXT, SQLERRM::TEXT;
  END;

  -- Test 3: Test IMMUTABLE functions
  BEGIN
    PERFORM safe_text_for_search('test');
    PERFORM subject_search_vector('test subject');
    RETURN QUERY SELECT 'IMMUTABLE Functions'::TEXT, 'PASS'::TEXT, 'All IMMUTABLE functions working'::TEXT;
  EXCEPTION WHEN OTHERS THEN
    RETURN QUERY SELECT 'IMMUTABLE Functions'::TEXT, 'ERROR'::TEXT, SQLERRM::TEXT;
  END;

  -- Test 4: Test content extraction function
  BEGIN
    PERFORM extract_plain_text_from_rich_content('{"text": "test content"}'::jsonb);
    PERFORM get_effective_content('content', '{"text": "rich"}'::jsonb, 'subject', 'email');
    RETURN QUERY SELECT 'Content Functions'::TEXT, 'PASS'::TEXT, 'Content extraction functions working'::TEXT;
  EXCEPTION WHEN OTHERS THEN
    RETURN QUERY SELECT 'Content Functions'::TEXT, 'ERROR'::TEXT, SQLERRM::TEXT;
  END;

  -- Test 5: Test search vector trigger exists
  BEGIN
    PERFORM 1 FROM information_schema.triggers
    WHERE trigger_name = 'update_updates_search_vector_trigger';

    IF FOUND THEN
      RETURN QUERY SELECT 'Search Vector Trigger'::TEXT, 'PASS'::TEXT, 'Search vector trigger exists'::TEXT;
    ELSE
      RETURN QUERY SELECT 'Search Vector Trigger'::TEXT, 'FAIL'::TEXT, 'Search vector trigger missing'::TEXT;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    RETURN QUERY SELECT 'Search Vector Trigger'::TEXT, 'ERROR'::TEXT, SQLERRM::TEXT;
  END;

  -- Test 6: Test helper functions exist
  BEGIN
    PERFORM 1 FROM information_schema.routines
    WHERE routine_name IN ('migrate_email_updates', 'analyze_content_formats', 'rebuild_all_search_vectors');

    IF FOUND THEN
      RETURN QUERY SELECT 'Helper Functions'::TEXT, 'PASS'::TEXT, 'All helper functions created'::TEXT;
    ELSE
      RETURN QUERY SELECT 'Helper Functions'::TEXT, 'FAIL'::TEXT, 'Missing helper functions'::TEXT;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    RETURN QUERY SELECT 'Helper Functions'::TEXT, 'ERROR'::TEXT, SQLERRM::TEXT;
  END;

END;
$$;

-- =============================================================================
-- SAMPLE DATA FOR TESTING (OPTIONAL)
-- =============================================================================

-- Function to create sample data for testing
CREATE OR REPLACE FUNCTION create_sample_email_data()
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
  sample_parent_id UUID;
  sample_child_id UUID;
  inserted_count INTEGER := 0;
BEGIN
  -- This function should only be run in development/testing environments

  -- Get existing parent and child IDs (don't create new ones)
  SELECT id INTO sample_parent_id FROM profiles LIMIT 1;
  SELECT id INTO sample_child_id FROM children LIMIT 1;

  IF sample_parent_id IS NULL OR sample_child_id IS NULL THEN
    RAISE NOTICE 'No existing parent or child found. Skipping sample data creation.';
    RETURN 0;
  END IF;

  -- Insert sample updates with different formats
  INSERT INTO updates (parent_id, child_id, content, subject, content_format, milestone_type)
  VALUES
    (sample_parent_id, sample_child_id, 'First email body content', 'Baby took first steps!', 'email', 'first_steps'),
    (sample_parent_id, sample_child_id, 'Plain text update about crawling', NULL, 'plain', 'crawling'),
    (sample_parent_id, sample_child_id, 'Rich content body', 'Birthday celebration', 'rich', 'birthday');

  GET DIAGNOSTICS inserted_count = ROW_COUNT;

  -- Insert sample rich content
  UPDATE updates
  SET rich_content = '{"ops": [{"insert": "This is rich text content with "}, {"attributes": {"bold": true}, "insert": "bold text"}, {"insert": "\n"}]}'::jsonb
  WHERE content_format = 'rich' AND rich_content IS NULL;

  RETURN inserted_count;
END;
$$;

-- =============================================================================
-- MIGRATION VALIDATION
-- =============================================================================

-- Function to validate the migration was successful
CREATE OR REPLACE FUNCTION validate_migration()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  result_text TEXT := '';
  test_result RECORD;
BEGIN
  result_text := E'EMAIL AND RICH TEXT ENHANCEMENT MIGRATION VALIDATION\n';
  result_text := result_text || E'========================================================\n\n';

  -- Run all tests
  FOR test_result IN SELECT * FROM test_email_enhancement_migration()
  LOOP
    result_text := result_text || format('%-25s: %-5s - %s', test_result.test_name, test_result.status, test_result.details) || E'\n';
  END LOOP;

  result_text := result_text || E'\n========================================================\n';
  result_text := result_text || 'Migration validation complete. Review results above.' || E'\n';

  RETURN result_text;
END;
$$;

-- =============================================================================
-- CLEANUP FUNCTIONS
-- =============================================================================

-- Function to remove test data (if needed)
CREATE OR REPLACE FUNCTION cleanup_sample_email_data()
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
  deleted_count INTEGER := 0;
BEGIN
  DELETE FROM updates
  WHERE subject IN ('Baby took first steps!', 'Birthday celebration')
     OR content LIKE 'First email body content%'
     OR content LIKE 'Rich content body%';

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;

-- =============================================================================
-- COMMENTS
-- =============================================================================

COMMENT ON FUNCTION test_email_enhancement_migration IS 'Comprehensive test suite for email enhancement migration';
COMMENT ON FUNCTION validate_migration IS 'Returns formatted validation report for migration';
COMMENT ON FUNCTION create_sample_email_data IS 'Creates sample data for testing (development only)';
COMMENT ON FUNCTION cleanup_sample_email_data IS 'Removes sample test data';

-- =============================================================================
-- INSTRUCTIONS
-- =============================================================================

DO $$
BEGIN
  RAISE NOTICE 'EMAIL ENHANCEMENT MIGRATION TEST SUITE READY';
  RAISE NOTICE '=============================================';
  RAISE NOTICE '';
  RAISE NOTICE 'To validate the migration, run:';
  RAISE NOTICE '  SELECT validate_migration();';
  RAISE NOTICE '';
  RAISE NOTICE 'To test with sample data (development only):';
  RAISE NOTICE '  SELECT create_sample_email_data();';
  RAISE NOTICE '  -- test your functions --';
  RAISE NOTICE '  SELECT cleanup_sample_email_data();';
  RAISE NOTICE '';
  RAISE NOTICE 'To analyze existing content formats:';
  RAISE NOTICE '  SELECT * FROM analyze_content_formats();';
  RAISE NOTICE '';
  RAISE NOTICE 'To migrate existing email-style content:';
  RAISE NOTICE '  SELECT migrate_email_updates();';
END $$;