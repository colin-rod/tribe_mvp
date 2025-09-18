-- Verify Functions Exist and Work Properly
-- Run this in Supabase SQL Editor to check function status

-- Check what functions actually exist
SELECT
    routine_name,
    routine_type,
    routine_schema,
    specific_name
FROM information_schema.routines
WHERE routine_schema = 'public'
    AND routine_name IN ('handle_new_user', 'create_default_groups_for_user');

-- Check function definitions to see if they're complete
SELECT
    routine_name,
    LEFT(routine_definition, 200) as definition_start
FROM information_schema.routines
WHERE routine_schema = 'public'
    AND routine_name = 'create_default_groups_for_user';

-- Test if we can call the function manually (this will show if it exists)
DO $$
BEGIN
    -- Test calling create_default_groups_for_user with a dummy UUID
    -- This will error if the function doesn't exist or has wrong signature
    BEGIN
        PERFORM create_default_groups_for_user('00000000-0000-0000-0000-000000000000'::UUID);
        RAISE NOTICE 'Function create_default_groups_for_user exists and is callable';
    EXCEPTION
        WHEN undefined_function THEN
            RAISE NOTICE 'Function create_default_groups_for_user does NOT exist';
        WHEN OTHERS THEN
            RAISE NOTICE 'Function exists but had error: %', SQLERRM;
    END;
END $$;

-- Check if tables exist that the function needs
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
    AND table_name IN ('profiles', 'recipient_groups');

-- Check actual table structure for recipient_groups
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public'
    AND table_name = 'recipient_groups'
ORDER BY ordinal_position;