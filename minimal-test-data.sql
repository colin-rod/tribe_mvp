-- Minimal test data using UUIDs from your production dashboard

-- Create auth user first (required for foreign key)
INSERT INTO auth.users (
    id,
    instance_id,
    aud,
    role,
    email,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at,
    email_confirmed_at
) VALUES (
    'c658d0c4-037a-46ce-b671-1b0fb6990765',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'colin.rods@gmail.com',
    '{"provider":"email","providers":["email"]}',
    '{}',
    NOW(),
    NOW(),
    NOW()
) ON CONFLICT (id) DO NOTHING;

-- Create profile
INSERT INTO profiles (id, email, name, onboarding_completed)
VALUES (
    'c658d0c4-037a-46ce-b671-1b0fb6990765',
    'colin.rods@gmail.com',
    'Colin Rodrigues',
    true
) ON CONFLICT (id) DO NOTHING;

-- Create child
INSERT INTO children (id, parent_id, name, birth_date)
VALUES (
    '8847807d-dff4-4bee-9bd5-e62fbf000001',
    'c658d0c4-037a-46ce-b671-1b0fb6990765',
    'Emma',
    '2023-03-15'
) ON CONFLICT (id) DO NOTHING;

-- Create recipient
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

-- Create update using UUID from dashboard
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
    '8847807d-dff4-4bee-9bd5-e62fbf000001',
    'Emma took her first steps today! She was so excited and kept giggling as she walked from the couch to her toy box.',
    'first_steps',
    'draft'
) ON CONFLICT (id) DO NOTHING;

-- Verify data was created
SELECT 'Data verification:';
SELECT 'Updates: ' || COUNT(*) FROM updates;
SELECT 'Recipients: ' || COUNT(*) FROM recipients;
SELECT 'Profiles: ' || COUNT(*) FROM profiles;
SELECT 'Auth users: ' || COUNT(*) FROM auth.users;