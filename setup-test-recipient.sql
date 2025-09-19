-- Set up test recipient with colin.rods@gmail.com

-- Update existing recipient or create new one
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
    'Colin Test Recipient',
    'colin.rods@gmail.com',
    'friend',
    ARRAY['email'],
    true
) ON CONFLICT (id) DO UPDATE SET
    email = 'colin.rods@gmail.com',
    name = 'Colin Test Recipient',
    preferred_channels = ARRAY['email'],
    is_active = true;

-- Verify the recipient
SELECT 'Recipient setup:' as info;
SELECT id, name, email, preferred_channels FROM recipients WHERE id = '7a1b7f77-4317-43aa-a952-619986c20b28';