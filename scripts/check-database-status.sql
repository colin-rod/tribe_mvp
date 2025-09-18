-- Database Status Check for Tribe MVP
-- Run this in Supabase SQL Editor to check what's been created

-- Check if tables exist
SELECT
    'Tables' as object_type,
    string_agg(table_name, ', ') as objects
FROM information_schema.tables
WHERE table_schema = 'public'
    AND table_name IN ('profiles', 'children', 'recipient_groups', 'recipients', 'updates', 'delivery_jobs', 'responses', 'ai_prompts')

UNION ALL

-- Check if functions exist
SELECT
    'Functions' as object_type,
    string_agg(routine_name, ', ') as objects
FROM information_schema.routines
WHERE routine_schema = 'public'
    AND routine_name IN ('handle_new_user', 'create_default_groups_for_user', 'get_recipient_by_token', 'update_updated_at_column')

UNION ALL

-- Check if triggers exist
SELECT
    'Triggers' as object_type,
    string_agg(trigger_name, ', ') as objects
FROM information_schema.triggers
WHERE trigger_schema = 'public'
    AND trigger_name IN ('on_auth_user_created', 'update_profiles_updated_at', 'update_children_updated_at')

UNION ALL

-- Check if storage bucket exists
SELECT
    'Storage Buckets' as object_type,
    string_agg(name, ', ') as objects
FROM storage.buckets
WHERE name = 'media';

-- Detailed function check
SELECT
    routine_name as function_name,
    routine_definition as definition
FROM information_schema.routines
WHERE routine_schema = 'public'
    AND routine_name = 'create_default_groups_for_user';

-- Check if auth trigger exists
SELECT
    trigger_name,
    event_object_table,
    action_statement
FROM information_schema.triggers
WHERE trigger_name = 'on_auth_user_created';