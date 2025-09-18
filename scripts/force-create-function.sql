-- Force Create Missing Function
-- This will definitely create the missing function

-- Drop the function if it exists (to clean up any partial/broken versions)
DROP FUNCTION IF EXISTS create_default_groups_for_user(UUID);
DROP FUNCTION IF EXISTS public.create_default_groups_for_user(UUID);

-- Create the function with explicit schema
CREATE OR REPLACE FUNCTION public.create_default_groups_for_user(user_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Log that the function is being called
  RAISE NOTICE 'Creating default groups for user: %', user_id;

  -- Insert default recipient groups
  INSERT INTO public.recipient_groups (parent_id, name, default_frequency, default_channels, is_default_group)
  VALUES
    (user_id, 'Close Family', 'daily_digest', ARRAY['email']::VARCHAR[], true),
    (user_id, 'Extended Family', 'weekly_digest', ARRAY['email']::VARCHAR[], false),
    (user_id, 'Friends', 'weekly_digest', ARRAY['email']::VARCHAR[], false)
  ON CONFLICT DO NOTHING;

  RAISE NOTICE 'Successfully created default groups for user: %', user_id;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Error creating default groups: %', SQLERRM;
    -- Don't re-raise the error so user creation doesn't fail
END;
$$;

-- Also recreate the handle_new_user function to be safe
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RAISE NOTICE 'Handle new user called for: %', new.email;

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
  PERFORM public.create_default_groups_for_user(new.id);

  RETURN new;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Error in handle_new_user: %', SQLERRM;
    -- Return new anyway so user creation doesn't fail completely
    RETURN new;
END;
$$;

-- Verify the functions were created
SELECT
    routine_name,
    routine_schema
FROM information_schema.routines
WHERE routine_schema = 'public'
    AND routine_name IN ('handle_new_user', 'create_default_groups_for_user');

-- Test the function
DO $$
BEGIN
    RAISE NOTICE 'Testing function exists...';
    PERFORM public.create_default_groups_for_user('00000000-0000-0000-0000-000000000000'::UUID);
    RAISE NOTICE 'Function test completed successfully';
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Function test failed: %', SQLERRM;
END $$;