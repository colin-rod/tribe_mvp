-- Create test user in auth.users table first, then create related data

-- Insert into auth.users (this is what Supabase Auth normally does)
INSERT INTO auth.users (
    id,
    email,
    email_confirmed_at,
    created_at,
    updated_at,
    instance_id,
    aud,
    role
) VALUES (
    'c658d0c4-037a-46ce-b671-1b0fb6990765',
    'colin.rods@gmail.com',
    NOW(),
    NOW(),
    NOW(),
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated'
) ON CONFLICT (id) DO NOTHING;

-- Now create the profile (this should work)
INSERT INTO profiles (id, email, name)
VALUES ('c658d0c4-037a-46ce-b671-1b0fb6990765', 'colin.rods@gmail.com', 'Colin Rodrigues')
ON CONFLICT (id) DO NOTHING;

-- Create test child
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

-- Verify everything was created
SELECT 'Test data verification:' as info;
SELECT 'Auth user exists:', COUNT(*) FROM auth.users WHERE id = 'c658d0c4-037a-46ce-b671-1b0fb6990765';
SELECT 'Profile exists:', COUNT(*) FROM profiles WHERE id = 'c658d0c4-037a-46ce-b671-1b0fb6990765';
SELECT 'Child exists:', COUNT(*) FROM children WHERE parent_id = 'c658d0c4-037a-46ce-b671-1b0fb6990765';
SELECT 'Recipient exists:', COUNT(*) FROM recipients WHERE parent_id = 'c658d0c4-037a-46ce-b671-1b0fb6990765';
SELECT 'Update exists:', COUNT(*) FROM updates WHERE id = '550e8400-e29b-41d4-a716-446655444400';