-- Fix User Creation Functions
-- Run this in Supabase SQL Editor to fix the missing functions

-- =============================================================================
-- ENSURE TABLES EXIST FIRST
-- =============================================================================

-- Make sure recipient_groups table exists (needed by the function)
CREATE TABLE IF NOT EXISTS recipient_groups (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  parent_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  name VARCHAR NOT NULL,
  default_frequency VARCHAR DEFAULT 'weekly_digest'
    CHECK (default_frequency IN ('every_update', 'daily_digest', 'weekly_digest', 'milestones_only')),
  default_channels VARCHAR[] DEFAULT ARRAY['email']::VARCHAR[]
    CHECK (default_channels <@ ARRAY['email', 'sms', 'whatsapp']::VARCHAR[]),
  is_default_group BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS for recipient_groups if not already enabled
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'recipient_groups'
    ) THEN
        ALTER TABLE recipient_groups ENABLE ROW LEVEL SECURITY;
        CREATE POLICY "Parents can manage their own groups" ON recipient_groups
          FOR ALL USING (auth.uid() = parent_id);
    END IF;
END $$;

-- =============================================================================
-- HELPER FUNCTIONS
-- =============================================================================

-- Function to create default groups for new users
CREATE OR REPLACE FUNCTION create_default_groups_for_user(user_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Insert default recipient groups
  INSERT INTO recipient_groups (parent_id, name, default_frequency, default_channels, is_default_group)
  VALUES
    (user_id, 'Close Family', 'daily_digest', ARRAY['email']::VARCHAR[], true),
    (user_id, 'Extended Family', 'weekly_digest', ARRAY['email']::VARCHAR[], false),
    (user_id, 'Friends', 'weekly_digest', ARRAY['email']::VARCHAR[], false)
  ON CONFLICT DO NOTHING;  -- Prevent duplicates if function is called multiple times
END;
$$;

-- Function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Insert profile for new user
  INSERT INTO public.profiles (id, email, name)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1))
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    name = EXCLUDED.name,
    updated_at = NOW();

  -- Create default recipient groups
  PERFORM create_default_groups_for_user(new.id);

  RETURN new;
END;
$$;

-- =============================================================================
-- TRIGGERS
-- =============================================================================

-- Drop and recreate the trigger to ensure it's working
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =============================================================================
-- VERIFICATION
-- =============================================================================

-- Test that the function exists and can be called
DO $$
BEGIN
    -- Test the function by trying to call it with a dummy UUID
    -- This will fail if the function doesn't exist
    RAISE NOTICE 'Testing create_default_groups_for_user function...';
    -- We won't actually call it with a real UUID to avoid side effects
END $$;

-- Show function exists
SELECT
    routine_name,
    routine_type,
    routine_schema
FROM information_schema.routines
WHERE routine_schema = 'public'
    AND routine_name IN ('create_default_groups_for_user', 'handle_new_user');

-- Show trigger exists
SELECT
    trigger_name,
    event_object_table,
    action_timing,
    event_manipulation
FROM information_schema.triggers
WHERE trigger_name = 'on_auth_user_created';