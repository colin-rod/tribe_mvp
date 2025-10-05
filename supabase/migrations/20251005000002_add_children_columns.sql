-- Migration: 20251005000002_add_children_columns.sql
-- Description: Add missing columns to children table for code compatibility
-- Issue: TypeScript errors - code expects these columns
--
-- IMPORTANT: Execute this migration via Supabase SQL Editor
-- Do NOT run via CLI or automated migration tools

-- Add columns to children table
ALTER TABLE children
  ADD COLUMN IF NOT EXISTS title VARCHAR,
  ADD COLUMN IF NOT EXISTS status VARCHAR DEFAULT 'active'
    CHECK (status IN ('active', 'inactive', 'archived')),
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS group_id UUID REFERENCES recipient_groups(id),
  ADD COLUMN IF NOT EXISTS recipient_id UUID REFERENCES recipients(id),
  ADD COLUMN IF NOT EXISTS delivery_method VARCHAR
    CHECK (delivery_method IN ('email', 'sms', 'whatsapp'));

-- Add helpful comments
COMMENT ON COLUMN children.title IS 'Optional title/label for the child profile';
COMMENT ON COLUMN children.status IS 'Status of the child profile (active, inactive, archived)';
COMMENT ON COLUMN children.is_active IS 'Whether the child profile is active';
COMMENT ON COLUMN children.group_id IS 'Optional link to a recipient group for this child';
COMMENT ON COLUMN children.recipient_id IS 'Optional link to a specific recipient for this child';
COMMENT ON COLUMN children.delivery_method IS 'Preferred delivery method for updates about this child';

-- Create index on status and is_active for faster queries
CREATE INDEX IF NOT EXISTS idx_children_status ON children(status) WHERE status IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_children_is_active ON children(is_active);
CREATE INDEX IF NOT EXISTS idx_children_group_id ON children(group_id) WHERE group_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_children_recipient_id ON children(recipient_id) WHERE recipient_id IS NOT NULL;
