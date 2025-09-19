-- SQL queries to get test data for email distribution testing

-- Get recipient UUIDs with email addresses
SELECT
    id as recipient_uuid,
    name,
    email,
    relationship,
    preferred_channels
FROM recipients
WHERE email IS NOT NULL
    AND is_active = true
    AND 'email' = ANY(preferred_channels)
ORDER BY created_at DESC
LIMIT 5;

-- Get update UUIDs with complete data
SELECT
    u.id as update_uuid,
    u.content,
    u.milestone_type,
    u.media_urls,
    u.distribution_status,
    c.name as child_name,
    c.birth_date,
    p.name as parent_name
FROM updates u
JOIN children c ON u.child_id = c.id
JOIN profiles p ON u.user_id = p.id
WHERE u.content IS NOT NULL
ORDER BY u.created_at DESC
LIMIT 5;

-- Get a specific update with its recipients for testing
SELECT
    u.id as update_uuid,
    u.content,
    array_agg(r.id) as recipient_uuids,
    array_agg(r.name) as recipient_names,
    array_agg(r.email) as recipient_emails
FROM updates u
JOIN children c ON u.child_id = c.id
JOIN recipients r ON r.user_id = u.user_id
WHERE r.email IS NOT NULL
    AND r.is_active = true
    AND 'email' = ANY(r.preferred_channels)
    AND u.content IS NOT NULL
GROUP BY u.id, u.content
ORDER BY u.created_at DESC
LIMIT 3;

-- Simple test data query (for quick copy-paste)
SELECT
    'UPDATE_ID: ' || u.id as update_info,
    'RECIPIENT_IDS: [' || string_agg('"' || r.id || '"', ', ') || ']' as recipient_info
FROM updates u
JOIN children c ON u.child_id = c.id
JOIN recipients r ON r.user_id = u.user_id
WHERE r.email IS NOT NULL
    AND r.is_active = true
    AND 'email' = ANY(r.preferred_channels)
    AND u.content IS NOT NULL
GROUP BY u.id
ORDER BY u.created_at DESC
LIMIT 1;