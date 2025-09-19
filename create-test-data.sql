-- Create test data for email distribution testing

-- First, check what exists
SELECT 'Current counts:' as info;
SELECT 'Updates: ' || COUNT(*) FROM updates
UNION ALL
SELECT 'Recipients: ' || COUNT(*) FROM recipients
UNION ALL
SELECT 'Profiles: ' || COUNT(*) FROM profiles
UNION ALL
SELECT 'Children: ' || COUNT(*) FROM children;

-- Get existing profile and child IDs if they exist
SELECT 'Existing profiles:' as info;
SELECT id, name FROM profiles LIMIT 3;

SELECT 'Existing children:' as info;
SELECT id, name, parent_id FROM children LIMIT 3;

-- Create test profile if none exists
INSERT INTO profiles (id, email, name)
VALUES ('c658d0c4-037a-46ce-b671-1b0fb6990765', 'colin.rods@gmail.com', 'Colin Rodrigues')
ON CONFLICT (id) DO NOTHING;

-- Create test child if none exists
INSERT INTO children (id, parent_id, name, birth_date)
VALUES ('8847807d-dff4-4bee-9bd5-e62fbf123456', 'c658d0c4-037a-46ce-b671-1b0fb6990765', 'Emma', '2023-03-15')
ON CONFLICT (id) DO NOTHING;

-- Create test recipient
INSERT INTO recipients (
    id,
    parent_id,
    name,
    email,
    relationship,
    preferred_channels,
    is_active
) VALUES (
    '7a1b7f77-4317-43aa-a952-619986c20b28',
    'c658d0c4-037a-46ce-b671-1b0fb6990765',
    'Test Grandma',
    'colin.rods@gmail.com',
    'grandparent',
    ARRAY['email'],
    true
) ON CONFLICT (id) DO NOTHING;

-- Create test update
INSERT INTO updates (
    id,
    parent_id,
    child_id,
    content,
    milestone_type,
    distribution_status
) VALUES (
    '550e8400-e29b-41d4-a716-446655444400',
    'c658d0c4-037a-46ce-b671-1b0fb6990765',
    '8847807d-dff4-4bee-9bd5-e62fbf123456',
    'Emma took her first steps today! She was so excited and kept giggling as she walked from the couch to her toy box.',
    'first_steps',
    'draft'
) ON CONFLICT (id) DO NOTHING;

-- Verify the data was created
SELECT 'Test data created successfully!' as result;
SELECT 'Update:', id, content FROM updates WHERE id = '550e8400-e29b-41d4-a716-446655444400';
SELECT 'Recipient:', id, name, email FROM recipients WHERE id = '7a1b7f77-4317-43aa-a952-619986c20b28';