-- Verify User Setup is Complete
-- Run this to check that the new user was set up correctly

-- Check user profiles
SELECT
    id,
    email,
    name,
    onboarding_completed,
    created_at
FROM profiles
ORDER BY created_at DESC
LIMIT 3;

-- Check default recipient groups for the latest user
SELECT
    p.email as user_email,
    rg.name as group_name,
    rg.default_frequency,
    rg.is_default_group,
    rg.created_at
FROM recipient_groups rg
JOIN profiles p ON rg.parent_id = p.id
ORDER BY p.created_at DESC, rg.name
LIMIT 10;

-- Count of groups per user
SELECT
    p.email,
    COUNT(rg.id) as group_count
FROM profiles p
LEFT JOIN recipient_groups rg ON p.id = rg.parent_id
GROUP BY p.id, p.email
ORDER BY p.created_at DESC;