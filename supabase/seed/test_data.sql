-- Test Data for Tribe MVP
-- Run this after initial migration to create test data for development

-- NOTE: This should only be run in development environments
-- DO NOT run in production

-- =============================================================================
-- TEST USER DATA
-- =============================================================================

-- Create test users in auth.users first (required for profiles foreign key)
-- Note: In production, users are created through Supabase Auth
-- For development/testing, we create them directly in auth.users

-- Test Parent 1: Colin Rodrigues
INSERT INTO auth.users (
  id,
  instance_id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  raw_app_meta_data,
  raw_user_meta_data,
  is_super_admin,
  confirmation_token,
  recovery_token,
  email_change_token_new,
  email_change
) VALUES (
  '550e8400-e29b-41d4-a716-446655440001'::uuid,
  '00000000-0000-0000-0000-000000000000'::uuid,
  'authenticated',
  'authenticated',
  'colin@colinrodrigues.com',
  '$2a$10$abcdefghijklmnopqrstuvwxyz', -- dummy encrypted password
  now(),
  now(),
  now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{"name":"Colin Rodrigues"}'::jsonb,
  false,
  '',
  '',
  '',
  ''
) ON CONFLICT (id) DO NOTHING;

-- Test Parent 2: Jane Smith
INSERT INTO auth.users (
  id,
  instance_id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  raw_app_meta_data,
  raw_user_meta_data,
  is_super_admin,
  confirmation_token,
  recovery_token,
  email_change_token_new,
  email_change
) VALUES (
  '550e8400-e29b-41d4-a716-446655440002'::uuid,
  '00000000-0000-0000-0000-000000000000'::uuid,
  'authenticated',
  'authenticated',
  'jane@example.com',
  '$2a$10$abcdefghijklmnopqrstuvwxyz', -- dummy encrypted password
  now(),
  now(),
  now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{"name":"Jane Smith"}'::jsonb,
  false,
  '',
  '',
  '',
  ''
) ON CONFLICT (id) DO NOTHING;

-- Create test user profiles (will be created by trigger, but we'll insert manually for testing)
-- Test Parent 1: Colin Rodrigues
INSERT INTO profiles (id, email, name, onboarding_completed, onboarding_step)
VALUES (
  '550e8400-e29b-41d4-a716-446655440001'::uuid,
  'colin@colinrodrigues.com',
  'Colin Rodrigues',
  true,
  5
) ON CONFLICT (id) DO NOTHING;

-- Test Parent 2: Jane Smith (for multi-user testing)
INSERT INTO profiles (id, email, name, onboarding_completed, onboarding_step)
VALUES (
  '550e8400-e29b-41d4-a716-446655440002'::uuid,
  'jane@example.com',
  'Jane Smith',
  false,
  2
) ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- TEST CHILDREN DATA
-- =============================================================================

-- Colin's children
INSERT INTO children (id, parent_id, name, birth_date, profile_photo_url)
VALUES
(
  '550e8400-e29b-41d4-a716-446655441001'::uuid,
  '550e8400-e29b-41d4-a716-446655440001'::uuid,
  'Emma Rodrigues',
  '2023-03-15'::date,
  'https://example.com/photos/emma.jpg'
),
(
  '550e8400-e29b-41d4-a716-446655441002'::uuid,
  '550e8400-e29b-41d4-a716-446655440001'::uuid,
  'Liam Rodrigues',
  '2021-08-22'::date,
  'https://example.com/photos/liam.jpg'
) ON CONFLICT (id) DO NOTHING;

-- Jane's child
INSERT INTO children (id, parent_id, name, birth_date)
VALUES (
  '550e8400-e29b-41d4-a716-446655441003'::uuid,
  '550e8400-e29b-41d4-a716-446655440002'::uuid,
  'Oliver Smith',
  '2023-01-10'::date
) ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- TEST RECIPIENT GROUPS
-- =============================================================================

-- Colin's recipient groups (in addition to defaults created by trigger)
INSERT INTO recipient_groups (id, parent_id, name, default_frequency, default_channels, is_default_group)
VALUES
(
  '550e8400-e29b-41d4-a716-446655442001'::uuid,
  '550e8400-e29b-41d4-a716-446655440001'::uuid,
  'Daily Updates',
  'every_update',
  ARRAY['email', 'sms'],
  false
),
(
  '550e8400-e29b-41d4-a716-446655442002'::uuid,
  '550e8400-e29b-41d4-a716-446655440001'::uuid,
  'Milestone Only',
  'milestones_only',
  ARRAY['email'],
  false
) ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- TEST RECIPIENTS DATA
-- =============================================================================

-- Colin's recipients
INSERT INTO recipients (id, parent_id, email, phone, name, relationship, group_id, frequency, preferred_channels, preference_token)
VALUES
-- Grandparents (daily updates)
(
  '550e8400-e29b-41d4-a716-446655443001'::uuid,
  '550e8400-e29b-41d4-a716-446655440001'::uuid,
  'grandma.mary@email.com',
  '+1234567890',
  'Grandma Mary',
  'grandparent',
  '550e8400-e29b-41d4-a716-446655442001'::uuid,
  'daily_digest',
  ARRAY['email'],
  'token_grandma_mary_001'
),
(
  '550e8400-e29b-41d4-a716-446655443002'::uuid,
  '550e8400-e29b-41d4-a716-446655440001'::uuid,
  'grandpa.john@email.com',
  '+1234567891',
  'Grandpa John',
  'grandparent',
  '550e8400-e29b-41d4-a716-446655442001'::uuid,
  'daily_digest',
  ARRAY['email', 'sms'],
  'token_grandpa_john_002'
),
-- Close family (weekly digest)
(
  '550e8400-e29b-41d4-a716-446655443003'::uuid,
  '550e8400-e29b-41d4-a716-446655440001'::uuid,
  'sarah.rodriguez@email.com',
  '+1234567892',
  'Sarah Rodriguez',
  'sibling',
  NULL, -- No specific group, uses default
  'weekly_digest',
  ARRAY['email'],
  'token_sarah_rodriguez_003'
),
-- Friends (milestone only)
(
  '550e8400-e29b-41d4-a716-446655443004'::uuid,
  '550e8400-e29b-41d4-a716-446655440001'::uuid,
  'best.friend@email.com',
  NULL,
  'Best Friend Amy',
  'friend',
  '550e8400-e29b-41d4-a716-446655442002'::uuid,
  'milestones_only',
  ARRAY['email'],
  'token_best_friend_amy_004'
),
-- Work colleague (weekly)
(
  '550e8400-e29b-41d4-a716-446655443005'::uuid,
  '550e8400-e29b-41d4-a716-446655440001'::uuid,
  'colleague@work.com',
  NULL,
  'Work Colleague Mike',
  'colleague',
  NULL,
  'weekly_digest',
  ARRAY['email'],
  'token_work_colleague_005'
) ON CONFLICT (id) DO NOTHING;

-- Jane's recipients (fewer for testing different scenarios)
INSERT INTO recipients (id, parent_id, email, name, relationship, frequency, preferred_channels, preference_token)
VALUES
(
  '550e8400-e29b-41d4-a716-446655443006'::uuid,
  '550e8400-e29b-41d4-a716-446655440002'::uuid,
  'jane.mom@email.com',
  'Mom',
  'parent',
  'every_update',
  ARRAY['email', 'sms'],
  'token_jane_mom_006'
) ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- TEST UPDATES DATA
-- =============================================================================

-- Recent updates from Colin
INSERT INTO updates (id, parent_id, child_id, content, milestone_type, ai_analysis, confirmed_recipients, distribution_status)
VALUES
(
  '550e8400-e29b-41d4-a716-446655444001'::uuid,
  '550e8400-e29b-41d4-a716-446655440001'::uuid,
  '550e8400-e29b-41d4-a716-446655441001'::uuid, -- Emma
  'Emma took her first steps today! So excited to share this milestone with everyone. She walked from the couch to her toy box - about 8 steps!',
  'first_steps',
  '{"milestone_detected": true, "excitement_level": "high", "suggested_sharing": "immediate"}'::jsonb,
  ARRAY['550e8400-e29b-41d4-a716-446655443001'::uuid, '550e8400-e29b-41d4-a716-446655443002'::uuid, '550e8400-e29b-41d4-a716-446655443003'::uuid]::uuid[],
  'sent'
),
(
  '550e8400-e29b-41d4-a716-446655444002'::uuid,
  '550e8400-e29b-41d4-a716-446655440001'::uuid,
  '550e8400-e29b-41d4-a716-446655441002'::uuid, -- Liam
  'Liam is getting so good at reading! He read his entire bedtime story to Emma tonight. Such a proud big brother moment.',
  NULL,
  '{"activity_type": "reading", "sibling_interaction": true, "sharing_priority": "medium"}'::jsonb,
  ARRAY['550e8400-e29b-41d4-a716-446655443001'::uuid, '550e8400-e29b-41d4-a716-446655443003'::uuid]::uuid[],
  'sent'
),
(
  '550e8400-e29b-41d4-a716-446655444003'::uuid,
  '550e8400-e29b-41d4-a716-446655440001'::uuid,
  '550e8400-e29b-41d4-a716-446655441001'::uuid, -- Emma
  'Emma is experimenting with solid foods. Today she tried mashed sweet potato - messy but she loved it!',
  NULL,
  '{"activity_type": "feeding", "mess_level": "high", "enjoyment": "positive"}'::jsonb,
  ARRAY['550e8400-e29b-41d4-a716-446655443001'::uuid, '550e8400-e29b-41d4-a716-446655443002'::uuid]::uuid[],
  'draft'
) ON CONFLICT (id) DO NOTHING;

-- Draft update (for testing UI)
INSERT INTO updates (id, parent_id, child_id, content, ai_analysis, suggested_recipients, distribution_status)
VALUES (
  '550e8400-e29b-41d4-a716-446655444004'::uuid,
  '550e8400-e29b-41d4-a716-446655440001'::uuid,
  '550e8400-e29b-41d4-a716-446655441002'::uuid, -- Liam
  'Liam built the most amazing castle out of blocks today. Engineering in the making!',
  '{"activity_type": "creative_play", "skill_development": "engineering", "sharing_suggestion": "friends_and_family"}'::jsonb,
  ARRAY['550e8400-e29b-41d4-a716-446655443001'::uuid, '550e8400-e29b-41d4-a716-446655443002'::uuid, '550e8400-e29b-41d4-a716-446655443003'::uuid, '550e8400-e29b-41d4-a716-446655443005'::uuid]::uuid[],
  'draft'
) ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- TEST DELIVERY JOBS
-- =============================================================================

-- Delivery jobs for first update (Emma's first steps)
INSERT INTO delivery_jobs (id, update_id, recipient_id, channel, status, sent_at)
VALUES
(
  '550e8400-e29b-41d4-a716-446655445001'::uuid,
  '550e8400-e29b-41d4-a716-446655444001'::uuid,
  '550e8400-e29b-41d4-a716-446655443001'::uuid, -- Grandma Mary
  'email',
  'delivered',
  NOW() - INTERVAL '2 hours'
),
(
  '550e8400-e29b-41d4-a716-446655445002'::uuid,
  '550e8400-e29b-41d4-a716-446655444001'::uuid,
  '550e8400-e29b-41d4-a716-446655443002'::uuid, -- Grandpa John
  'email',
  'delivered',
  NOW() - INTERVAL '2 hours'
),
(
  '550e8400-e29b-41d4-a716-446655445003'::uuid,
  '550e8400-e29b-41d4-a716-446655444001'::uuid,
  '550e8400-e29b-41d4-a716-446655443002'::uuid, -- Grandpa John
  'sms',
  'sent',
  NOW() - INTERVAL '2 hours'
) ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- TEST RESPONSES
-- =============================================================================

-- Responses to Emma's first steps update
INSERT INTO responses (id, update_id, recipient_id, channel, content, parent_notified)
VALUES
(
  '550e8400-e29b-41d4-a716-446655446001'::uuid,
  '550e8400-e29b-41d4-a716-446655444001'::uuid,
  '550e8400-e29b-41d4-a716-446655443001'::uuid, -- Grandma Mary
  'email',
  'Oh my goodness! I can''t believe she''s walking already! Give her a big hug from Grandma! ❤️',
  true
),
(
  '550e8400-e29b-41d4-a716-446655446002'::uuid,
  '550e8400-e29b-41d4-a716-446655444001'::uuid,
  '550e8400-e29b-41d4-a716-446655443002'::uuid, -- Grandpa John
  'sms',
  'That''s my girl! Can''t wait to see her walk to me next visit 👴👶',
  false
) ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- TEST AI PROMPTS
-- =============================================================================

-- AI prompts for Colin
INSERT INTO ai_prompts (id, parent_id, child_id, prompt_type, prompt_text, prompt_data, status)
VALUES
(
  '550e8400-e29b-41d4-a716-446655447001'::uuid,
  '550e8400-e29b-41d4-a716-446655440001'::uuid,
  '550e8400-e29b-41d4-a716-446655441001'::uuid, -- Emma
  'milestone',
  'Emma is approaching her first birthday! Have you noticed any new words, walking improvements, or favorite activities lately?',
  '{"milestone": "first_birthday", "child_age_months": 9, "expected_developments": ["walking", "first_words", "object_permanence"]}'::jsonb,
  'pending'
),
(
  '550e8400-e29b-41d4-a716-446655447002'::uuid,
  '550e8400-e29b-41d4-a716-446655440001'::uuid,
  '550e8400-e29b-41d4-a716-446655441002'::uuid, -- Liam
  'activity',
  'It''s been a while since you shared updates about Liam! How is his reading progress? Any new favorite books?',
  '{"last_update_days_ago": 5, "suggested_topics": ["reading", "school", "sibling_interaction"]}'::jsonb,
  'sent'
) ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- VERIFICATION QUERIES
-- =============================================================================

-- These queries can be run to verify test data was inserted correctly

/*
-- Count records in each table
SELECT 'profiles' as table_name, COUNT(*) FROM profiles
UNION ALL
SELECT 'children', COUNT(*) FROM children
UNION ALL
SELECT 'recipient_groups', COUNT(*) FROM recipient_groups
UNION ALL
SELECT 'recipients', COUNT(*) FROM recipients
UNION ALL
SELECT 'updates', COUNT(*) FROM updates
UNION ALL
SELECT 'delivery_jobs', COUNT(*) FROM delivery_jobs
UNION ALL
SELECT 'responses', COUNT(*) FROM responses
UNION ALL
SELECT 'ai_prompts', COUNT(*) FROM ai_prompts;

-- Sample data overview
SELECT
  p.name as parent_name,
  c.name as child_name,
  u.content as update_content,
  u.distribution_status
FROM updates u
JOIN profiles p ON u.parent_id = p.id
JOIN children c ON u.child_id = c.id
ORDER BY u.created_at DESC;
*/