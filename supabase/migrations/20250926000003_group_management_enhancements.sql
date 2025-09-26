-- Group Management Enhancements Migration
-- Adds comprehensive group membership tracking and enhanced notification settings

-- =============================================================================
-- GROUP MEMBERSHIPS TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS group_memberships (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  recipient_id UUID REFERENCES recipients(id) ON DELETE CASCADE NOT NULL,
  group_id UUID REFERENCES recipient_groups(id) ON DELETE CASCADE NOT NULL,

  -- Membership-specific notification settings (override group defaults)
  notification_frequency VARCHAR
    CHECK (notification_frequency IN ('every_update', 'daily_digest', 'weekly_digest', 'milestones_only')),
  preferred_channels VARCHAR[]
    CHECK (preferred_channels <@ ARRAY['email', 'sms', 'whatsapp']::VARCHAR[]),
  content_types VARCHAR[]
    CHECK (content_types <@ ARRAY['photos', 'text', 'milestones']::VARCHAR[]),

  -- Membership metadata
  role VARCHAR DEFAULT 'member' CHECK (role IN ('member', 'admin')),
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_active BOOLEAN DEFAULT true,

  -- Prevent duplicate memberships
  UNIQUE(recipient_id, group_id),

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================================================
-- ENHANCED RECIPIENT GROUPS
-- =============================================================================

-- Add group-level notification settings
ALTER TABLE recipient_groups ADD COLUMN IF NOT EXISTS
  notification_settings JSONB DEFAULT '{
    "email_notifications": true,
    "sms_notifications": false,
    "push_notifications": true,
    "quiet_hours": {"start": "22:00", "end": "07:00"},
    "digest_day": "sunday",
    "batch_updates": true,
    "auto_add_new_recipients": false
  }'::jsonb;

-- Add group visibility and access controls
ALTER TABLE recipient_groups ADD COLUMN IF NOT EXISTS
  access_settings JSONB DEFAULT '{
    "allow_self_removal": true,
    "allow_preference_override": true,
    "require_confirmation": false
  }'::jsonb;

-- =============================================================================
-- ENHANCED RECIPIENTS
-- =============================================================================

-- Add recipient-level group preferences
ALTER TABLE recipients ADD COLUMN IF NOT EXISTS
  group_preferences JSONB DEFAULT '{
    "visible_to_groups": "all",
    "allow_group_invites": true,
    "notification_consolidation": "by_group",
    "max_groups": 10
  }'::jsonb;

-- =============================================================================
-- DATA INTEGRITY FUNCTIONS
-- =============================================================================

-- Function to validate group membership constraints
CREATE OR REPLACE FUNCTION validate_group_membership()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Check if recipient and group belong to same parent
  IF NOT EXISTS (
    SELECT 1
    FROM recipients r
    JOIN recipient_groups rg ON rg.parent_id = r.parent_id
    WHERE r.id = NEW.recipient_id
    AND rg.id = NEW.group_id
  ) THEN
    RAISE EXCEPTION 'Recipient and group must belong to the same parent';
  END IF;

  -- Check recipient's max_groups preference
  DECLARE
    current_group_count INTEGER;
    max_groups INTEGER;
  BEGIN
    SELECT COUNT(*) INTO current_group_count
    FROM group_memberships gm
    WHERE gm.recipient_id = NEW.recipient_id
    AND gm.is_active = true
    AND gm.id != COALESCE(NEW.id, uuid_nil());

    SELECT COALESCE((group_preferences->>'max_groups')::INTEGER, 10) INTO max_groups
    FROM recipients
    WHERE id = NEW.recipient_id;

    IF NEW.is_active AND current_group_count >= max_groups THEN
      RAISE EXCEPTION 'Recipient has reached maximum number of groups (%)', max_groups;
    END IF;
  END;

  RETURN NEW;
END;
$$;

-- Function to maintain recipient group assignments on membership changes
CREATE OR REPLACE FUNCTION sync_recipient_group_assignment()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- When a membership becomes active, update the recipient's primary group_id
  IF TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND NEW.is_active AND NOT OLD.is_active) THEN
    -- Set the group_id on recipients table if not already set
    UPDATE recipients
    SET group_id = NEW.group_id
    WHERE id = NEW.recipient_id
    AND group_id IS NULL;
  END IF;

  -- When membership becomes inactive, potentially reassign primary group
  IF TG_OP = 'UPDATE' AND NOT NEW.is_active AND OLD.is_active THEN
    -- If this was the primary group, find another active group
    DECLARE
      current_primary_group UUID;
      new_primary_group UUID;
    BEGIN
      SELECT group_id INTO current_primary_group
      FROM recipients
      WHERE id = NEW.recipient_id;

      IF current_primary_group = NEW.group_id THEN
        -- Find another active group membership
        SELECT group_id INTO new_primary_group
        FROM group_memberships
        WHERE recipient_id = NEW.recipient_id
        AND is_active = true
        AND group_id != NEW.group_id
        ORDER BY joined_at ASC
        LIMIT 1;

        UPDATE recipients
        SET group_id = new_primary_group
        WHERE id = NEW.recipient_id;
      END IF;
    END;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Function to cascade group deletion properly
CREATE OR REPLACE FUNCTION handle_group_deletion()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Don't allow deletion of default groups that still have members
  IF OLD.is_default_group THEN
    DECLARE
      member_count INTEGER;
    BEGIN
      SELECT COUNT(*) INTO member_count
      FROM group_memberships
      WHERE group_id = OLD.id
      AND is_active = true;

      IF member_count > 0 THEN
        RAISE EXCEPTION 'Cannot delete default group "%" with % active members', OLD.name, member_count;
      END IF;
    END;
  END IF;

  -- Deactivate all memberships instead of deleting
  UPDATE group_memberships
  SET is_active = false
  WHERE group_id = OLD.id;

  -- Reassign recipients to default group if available
  DECLARE
    default_group_id UUID;
  BEGIN
    SELECT id INTO default_group_id
    FROM recipient_groups
    WHERE parent_id = OLD.parent_id
    AND is_default_group = true
    AND name = 'Friends'
    LIMIT 1;

    IF default_group_id IS NOT NULL THEN
      UPDATE recipients
      SET group_id = default_group_id
      WHERE group_id = OLD.id;
    END IF;
  END;

  RETURN OLD;
END;
$$;

-- =============================================================================
-- TRIGGERS
-- =============================================================================

-- Trigger for group membership validation
DROP TRIGGER IF EXISTS validate_group_membership_trigger ON group_memberships;
CREATE TRIGGER validate_group_membership_trigger
  BEFORE INSERT OR UPDATE ON group_memberships
  FOR EACH ROW EXECUTE FUNCTION validate_group_membership();

-- Trigger for recipient group assignment sync
DROP TRIGGER IF EXISTS sync_recipient_group_assignment_trigger ON group_memberships;
CREATE TRIGGER sync_recipient_group_assignment_trigger
  AFTER INSERT OR UPDATE ON group_memberships
  FOR EACH ROW EXECUTE FUNCTION sync_recipient_group_assignment();

-- Trigger for updated_at maintenance
DROP TRIGGER IF EXISTS update_group_memberships_updated_at ON group_memberships;
CREATE TRIGGER update_group_memberships_updated_at
  BEFORE UPDATE ON group_memberships
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Trigger for group deletion handling
DROP TRIGGER IF EXISTS handle_group_deletion_trigger ON recipient_groups;
CREATE TRIGGER handle_group_deletion_trigger
  BEFORE DELETE ON recipient_groups
  FOR EACH ROW EXECUTE FUNCTION handle_group_deletion();

-- =============================================================================
-- PERFORMANCE INDEXES
-- =============================================================================

-- Group memberships indexes
CREATE INDEX IF NOT EXISTS idx_group_memberships_recipient_id ON group_memberships(recipient_id);
CREATE INDEX IF NOT EXISTS idx_group_memberships_group_id ON group_memberships(group_id);
CREATE INDEX IF NOT EXISTS idx_group_memberships_active ON group_memberships(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_group_memberships_role ON group_memberships(role);
CREATE INDEX IF NOT EXISTS idx_group_memberships_joined_at ON group_memberships(joined_at);

-- Enhanced recipient groups indexes
CREATE INDEX IF NOT EXISTS idx_recipient_groups_notification_settings
  ON recipient_groups USING GIN(notification_settings);
CREATE INDEX IF NOT EXISTS idx_recipient_groups_access_settings
  ON recipient_groups USING GIN(access_settings);

-- Enhanced recipients indexes
CREATE INDEX IF NOT EXISTS idx_recipients_group_preferences
  ON recipients USING GIN(group_preferences);

-- Composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_group_memberships_recipient_active
  ON group_memberships(recipient_id, is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_group_memberships_group_active
  ON group_memberships(group_id, is_active) WHERE is_active = true;

-- =============================================================================
-- ROW LEVEL SECURITY POLICIES
-- =============================================================================

-- Enable RLS for group_memberships
ALTER TABLE group_memberships ENABLE ROW LEVEL SECURITY;

-- Parents can manage group memberships for their recipients
DROP POLICY IF EXISTS "Parents can manage group memberships for their recipients" ON group_memberships;
CREATE POLICY "Parents can manage group memberships for their recipients" ON group_memberships
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM recipients r
      JOIN recipient_groups rg ON rg.id = group_memberships.group_id
      WHERE r.id = group_memberships.recipient_id
      AND r.parent_id = auth.uid()
      AND rg.parent_id = auth.uid()
    )
  );

-- Recipients can view their own group memberships via token
DROP POLICY IF EXISTS "Recipients can view their own group memberships via token" ON group_memberships;
CREATE POLICY "Recipients can view their own group memberships via token" ON group_memberships
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM recipients r
      WHERE r.id = group_memberships.recipient_id
      AND r.preference_token = current_setting('app.preference_token', true)
      AND r.is_active = true
    )
  );

-- Recipients can update their own group membership settings via token
DROP POLICY IF EXISTS "Recipients can update their group membership settings via token" ON group_memberships;
CREATE POLICY "Recipients can update their group membership settings via token" ON group_memberships
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM recipients r
      WHERE r.id = group_memberships.recipient_id
      AND r.preference_token = current_setting('app.preference_token', true)
      AND r.is_active = true
    )
  );

-- =============================================================================
-- MIGRATION DATA - Create memberships for existing recipients
-- =============================================================================

-- Create group memberships for all existing recipients
INSERT INTO group_memberships (recipient_id, group_id, role, is_active)
SELECT
  r.id as recipient_id,
  r.group_id,
  'member' as role,
  true as is_active
FROM recipients r
WHERE r.group_id IS NOT NULL
AND r.is_active = true
ON CONFLICT (recipient_id, group_id) DO NOTHING;

-- =============================================================================
-- HELPER FUNCTIONS FOR GROUP MANAGEMENT
-- =============================================================================

-- Function to get effective notification settings for a recipient in a group
CREATE OR REPLACE FUNCTION get_effective_notification_settings(
  p_recipient_id UUID,
  p_group_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  group_settings JSONB;
  member_settings JSONB;
  effective_settings JSONB;
BEGIN
  -- Get group default settings
  SELECT notification_settings INTO group_settings
  FROM recipient_groups
  WHERE id = p_group_id;

  -- Get member-specific settings
  SELECT json_build_object(
    'notification_frequency', notification_frequency,
    'preferred_channels', preferred_channels,
    'content_types', content_types
  ) INTO member_settings
  FROM group_memberships
  WHERE recipient_id = p_recipient_id
  AND group_id = p_group_id
  AND is_active = true;

  -- Merge settings with member overrides taking precedence
  effective_settings = group_settings;

  IF member_settings->>'notification_frequency' IS NOT NULL THEN
    effective_settings = effective_settings || json_build_object('frequency', member_settings->>'notification_frequency');
  END IF;

  IF member_settings->>'preferred_channels' IS NOT NULL THEN
    effective_settings = effective_settings || json_build_object('channels', member_settings->'preferred_channels');
  END IF;

  IF member_settings->>'content_types' IS NOT NULL THEN
    effective_settings = effective_settings || json_build_object('content_types', member_settings->'content_types');
  END IF;

  RETURN effective_settings;
END;
$$;

-- Function to bulk update group member settings
CREATE OR REPLACE FUNCTION bulk_update_group_members(
  p_group_id UUID,
  p_settings JSONB,
  p_apply_to_all BOOLEAN DEFAULT false
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  updated_count INTEGER := 0;
BEGIN
  -- Update group members based on whether to apply to all or just those without overrides
  IF p_apply_to_all THEN
    UPDATE group_memberships
    SET
      notification_frequency = COALESCE(p_settings->>'frequency', notification_frequency),
      preferred_channels = COALESCE(
        ARRAY(SELECT jsonb_array_elements_text(p_settings->'channels')),
        preferred_channels
      ),
      content_types = COALESCE(
        ARRAY(SELECT jsonb_array_elements_text(p_settings->'content_types')),
        content_types
      ),
      updated_at = NOW()
    WHERE group_id = p_group_id
    AND is_active = true;
  ELSE
    UPDATE group_memberships
    SET
      notification_frequency = COALESCE(p_settings->>'frequency', notification_frequency),
      preferred_channels = COALESCE(
        ARRAY(SELECT jsonb_array_elements_text(p_settings->'channels')),
        preferred_channels
      ),
      content_types = COALESCE(
        ARRAY(SELECT jsonb_array_elements_text(p_settings->'content_types')),
        content_types
      ),
      updated_at = NOW()
    WHERE group_id = p_group_id
    AND is_active = true
    AND notification_frequency IS NULL; -- Only update members without custom settings
  END IF;

  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RETURN updated_count;
END;
$$;