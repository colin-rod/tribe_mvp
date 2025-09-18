-- Test User Creation Process Manually
-- Run this to simulate what happens when a user is created

-- Test 1: Check if we can call the function directly
DO $$
DECLARE
    test_user_id UUID := 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'::UUID;
BEGIN
    -- Test the create_default_groups_for_user function
    RAISE NOTICE 'Testing create_default_groups_for_user function...';

    -- Clean up any existing test data first
    DELETE FROM recipient_groups WHERE parent_id = test_user_id;

    -- Call the function
    PERFORM public.create_default_groups_for_user(test_user_id);

    -- Check if groups were created
    IF EXISTS (SELECT 1 FROM recipient_groups WHERE parent_id = test_user_id) THEN
        RAISE NOTICE 'SUCCESS: Default groups were created!';
    ELSE
        RAISE NOTICE 'FAILED: No groups were created';
    END IF;

    -- Show what was created
    FOR rec IN (
        SELECT name, default_frequency, is_default_group
        FROM recipient_groups
        WHERE parent_id = test_user_id
    ) LOOP
        RAISE NOTICE 'Created group: % (frequency: %, default: %)',
            rec.name, rec.default_frequency, rec.is_default_group;
    END LOOP;

    -- Clean up test data
    DELETE FROM recipient_groups WHERE parent_id = test_user_id;

EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'ERROR in function test: %', SQLERRM;
END $$;

-- Test 2: Show current functions in database
SELECT
    routine_name,
    routine_schema,
    routine_type,
    security_type,
    routine_body
FROM information_schema.routines
WHERE routine_schema = 'public'
    AND routine_name IN ('create_default_groups_for_user', 'handle_new_user')
ORDER BY routine_name;