-- Migration: 20251005000003_add_profiles_columns.sql
-- Description: Add missing columns to profiles table for code compatibility
-- Issue: TypeScript errors - code expects these columns
--
-- IMPORTANT: Execute this migration via Supabase SQL Editor
-- Do NOT run via CLI or automated migration tools

-- Add columns to profiles table
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS title VARCHAR,
  ADD COLUMN IF NOT EXISTS status VARCHAR DEFAULT 'active'
    CHECK (status IN ('active', 'inactive', 'suspended', 'deleted')),
  ADD COLUMN IF NOT EXISTS group_id UUID REFERENCES recipient_groups(id);

-- Add helpful comments
COMMENT ON COLUMN profiles.title IS 'Optional title/prefix for the user (Mr., Mrs., Dr., etc.)';
COMMENT ON COLUMN profiles.status IS 'Status of the user account (active, inactive, suspended, deleted)';
COMMENT ON COLUMN profiles.group_id IS 'Optional default recipient group for this user';

-- Create index on status for faster queries
CREATE INDEX IF NOT EXISTS idx_profiles_status ON profiles(status) WHERE status IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_profiles_group_id ON profiles(group_id) WHERE group_id IS NOT NULL;

-- Set default values for existing rows
UPDATE profiles SET status = 'active' WHERE status IS NULL;
