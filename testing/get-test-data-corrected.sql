-- Corrected SQL queries to get test data for email distribution testing
-- Based on actual database schema

-- =============================================================================
-- QUICK TEST DATA (Ready to copy-paste)
-- =============================================================================

-- Get ready-to-use test data for curl command
SELECT
    'UPDATE_ID: ' || u.id as update_info,
    'RECIPIENT_IDS: [' || string_agg('"' || r.id || '"', ', ') || ']' as recipient_info
FROM updates u
JOIN recipients r ON r.parent_id = u.parent_id
WHERE r.email IS NOT NULL
    AND r.is_active = true
    AND 'email' = ANY(r.preferred_channels)
    AND u.content IS NOT NULL
    AND u.distribution_status IN ('draft', 'confirmed')
GROUP BY u.id
ORDER BY u.created_at DESC
LIMIT 1;

-- =============================================================================
-- DETAILED QUERIES
-- =============================================================================

-- Get recipient UUIDs with email addresses
SELECT
    id as recipient_uuid,
    name,
    email,
    relationship,
    preferred_channels,
    parent_id
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
    p.name as parent_name,
    u.parent_id
FROM updates u
JOIN children c ON u.child_id = c.id
JOIN profiles p ON u.parent_id = p.id
WHERE u.content IS NOT NULL
ORDER BY u.created_at DESC
LIMIT 5;

-- Get a specific update with its potential recipients
SELECT
    u.id as update_uuid,
    u.content,
    u.milestone_type,
    c.name as child_name,
    p.name as parent_name,
    array_agg(r.id) as recipient_uuids,
    array_agg(r.name) as recipient_names,
    array_agg(r.email) as recipient_emails,
    array_agg(r.relationship) as relationships
FROM updates u
JOIN children c ON u.child_id = c.id
JOIN profiles p ON u.parent_id = p.id
JOIN recipients r ON r.parent_id = u.parent_id
WHERE r.email IS NOT NULL
    AND r.is_active = true
    AND 'email' = ANY(r.preferred_channels)
    AND u.content IS NOT NULL
GROUP BY u.id, u.content, u.milestone_type, c.name, p.name
ORDER BY u.created_at DESC
LIMIT 3;

-- =============================================================================
-- INDIVIDUAL LOOKUPS
-- =============================================================================

-- Just get any recipient with email
SELECT
    id as recipient_uuid,
    name,
    email
FROM recipients
WHERE email IS NOT NULL
    AND is_active = true
    AND 'email' = ANY(preferred_channels)
LIMIT 1;

-- Just get any update
SELECT
    id as update_uuid,
    content
FROM updates
WHERE content IS NOT NULL
LIMIT 1;

-- =============================================================================
-- CREATE TEST DATA (if none exists)
-- =============================================================================

-- Check if you have any data
SELECT
    'Profiles: ' || COUNT(*) FROM profiles
UNION ALL
SELECT
    'Children: ' || COUNT(*) FROM children
UNION ALL
SELECT
    'Recipients: ' || COUNT(*) FROM recipients
UNION ALL
SELECT
    'Updates: ' || COUNT(*) FROM updates;

-- If you need to create test data, use these INSERTs:
/*
-- Create test recipient (replace the parent_id with actual profile ID)
INSERT INTO recipients (parent_id, name, email, relationship, preferred_channels, is_active)
VALUES (
    (SELECT id FROM profiles LIMIT 1),
    'Test Grandma',
    'colin.rods@gmail.com',
    'grandparent',
    ARRAY['email'],
    true
) RETURNING id;

-- Create test update (replace parent_id and child_id with actual IDs)
INSERT INTO updates (parent_id, child_id, content, milestone_type, distribution_status)
VALUES (
    (SELECT id FROM profiles LIMIT 1),
    (SELECT id FROM children LIMIT 1),
    'Emma took her first steps today! She was so excited and kept giggling as she walked from the couch to her toy box.',
    'first_steps',
    'draft'
) RETURNING id;
*/