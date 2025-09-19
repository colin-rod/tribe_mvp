-- Debug the update query to see what's failing

-- First, check if the update exists at all
SELECT
    id,
    content,
    parent_id,
    child_id,
    milestone_type,
    media_urls
FROM updates
WHERE id = '421c157f-f4b6-435c-9317-36fa20a22270';

-- Check if the child exists
SELECT
    id,
    name,
    birth_date,
    profile_photo_url,
    parent_id
FROM children
WHERE id = (
    SELECT child_id
    FROM updates
    WHERE id = '421c157f-f4b6-435c-9317-36fa20a22270'
);

-- Check if the parent profile exists
SELECT
    id,
    name,
    email
FROM profiles
WHERE id = (
    SELECT parent_id
    FROM updates
    WHERE id = '421c157f-f4b6-435c-9317-36fa20a22270'
);

-- Test the exact query that the Edge Function is using
-- This should match the fetchUpdateWithDetails function
SELECT
    u.id,
    u.content,
    u.milestone_type,
    u.media_urls,
    u.created_at,
    row_to_json(c.*) as child,
    row_to_json(p.*) as parent
FROM updates u
LEFT JOIN children c ON u.child_id = c.id
LEFT JOIN profiles p ON u.parent_id = p.id
WHERE u.id = '421c157f-f4b6-435c-9317-36fa20a22270';

-- Alternative query using JSON objects (closer to what Supabase expects)
SELECT
    u.id,
    u.content,
    u.milestone_type,
    u.media_urls,
    u.created_at,
    json_build_object(
        'id', c.id,
        'name', c.name,
        'birth_date', c.birth_date,
        'profile_photo_url', c.profile_photo_url
    ) as child,
    json_build_object(
        'id', p.id,
        'name', p.name,
        'email', p.email
    ) as parent
FROM updates u
LEFT JOIN children c ON u.child_id = c.id
LEFT JOIN profiles p ON u.parent_id = p.id
WHERE u.id = '421c157f-f4b6-435c-9317-36fa20a22270';