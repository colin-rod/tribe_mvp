-- Check Row Level Security policies that might be blocking the Edge Function

-- Check if RLS is enabled on relevant tables
SELECT
    schemaname,
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
    AND tablename IN ('updates', 'children', 'profiles', 'recipients');

-- Check RLS policies on updates table
SELECT
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE schemaname = 'public'
    AND tablename IN ('updates', 'children', 'profiles', 'recipients')
ORDER BY tablename, policyname;

-- Test direct access to the update as service role would see it
-- This simulates what the Edge Function should see
SET ROLE service_role;
SELECT
    id,
    content,
    parent_id,
    child_id
FROM updates
WHERE id = '421c157f-f4b6-435c-9317-36fa20a22270';
RESET ROLE;

-- Check if we can access the related child and parent records
SELECT 'Child record:' as type, id, name FROM children
WHERE id = (SELECT child_id FROM updates WHERE id = '421c157f-f4b6-435c-9317-36fa20a22270')
UNION ALL
SELECT 'Parent record:' as type, id, name FROM profiles
WHERE id = (SELECT parent_id FROM updates WHERE id = '421c157f-f4b6-435c-9317-36fa20a22270');