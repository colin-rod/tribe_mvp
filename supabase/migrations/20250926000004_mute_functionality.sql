-- Mute Functionality Enhancement Migration
-- Adds comprehensive mute and snooze capabilities for recipients

-- =============================================================================
-- ADD MUTE COLUMNS TO GROUP MEMBERSHIPS
-- =============================================================================

-- Add mute_until timestamp for temporary mutes
ALTER TABLE group_memberships ADD COLUMN IF NOT EXISTS
  mute_until TIMESTAMP WITH TIME ZONE;

-- Add mute_settings for detailed mute configuration
ALTER TABLE group_memberships ADD COLUMN IF NOT EXISTS
  mute_settings JSONB DEFAULT NULL;

-- =============================================================================
-- ADD NOTIFICATION PREFERENCES TO RECIPIENTS
-- =============================================================================

-- Add notification_preferences for global settings
ALTER TABLE recipients ADD COLUMN IF NOT EXISTS
  notification_preferences JSONB DEFAULT '{
    "email_enabled": true,
    "sms_enabled": false,
    "push_enabled": true,
    "quiet_hours": {"start": "22:00", "end": "07:00"},
    "digest_frequency": "weekly"
  }'::jsonb;

-- =============================================================================
-- MUTE MANAGEMENT FUNCTIONS
-- =============================================================================

-- Function to check if recipient is currently muted for a group
CREATE OR REPLACE FUNCTION is_recipient_muted(
  p_recipient_id UUID,
  p_group_id UUID DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  global_mute_until TIMESTAMP WITH TIME ZONE;
  group_mute_until TIMESTAMP WITH TIME ZONE;
  now_ts TIMESTAMP WITH TIME ZONE := NOW();
BEGIN
  -- Check global mute first
  SELECT (notification_preferences->>'mute_settings'->>'mute_until')::TIMESTAMP WITH TIME ZONE
  INTO global_mute_until
  FROM recipients
  WHERE id = p_recipient_id;

  IF global_mute_until IS NOT NULL AND global_mute_until > now_ts THEN
    RETURN TRUE;
  END IF;

  -- Check group-specific mute if group_id provided
  IF p_group_id IS NOT NULL THEN
    SELECT mute_until
    INTO group_mute_until
    FROM group_memberships
    WHERE recipient_id = p_recipient_id
    AND group_id = p_group_id
    AND is_active = true;

    IF group_mute_until IS NOT NULL AND group_mute_until > now_ts THEN
      RETURN TRUE;
    END IF;
  END IF;

  RETURN FALSE;
END;
$$;

-- Function to get effective mute settings for a recipient
CREATE OR REPLACE FUNCTION get_mute_settings(
  p_recipient_id UUID,
  p_group_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  global_settings JSONB;
  group_settings JSONB;
  effective_settings JSONB := '{}';
  now_ts TIMESTAMP WITH TIME ZONE := NOW();
BEGIN
  -- Get global mute settings
  SELECT notification_preferences->'mute_settings'
  INTO global_settings
  FROM recipients
  WHERE id = p_recipient_id;

  -- Check if globally muted
  IF global_settings IS NOT NULL
     AND (global_settings->>'mute_until')::TIMESTAMP WITH TIME ZONE > now_ts THEN
    effective_settings = global_settings || jsonb_build_object('scope', 'global');
  END IF;

  -- Get group-specific mute settings if group provided
  IF p_group_id IS NOT NULL THEN
    SELECT mute_settings, mute_until
    INTO group_settings, group_mute_until
    FROM group_memberships
    WHERE recipient_id = p_recipient_id
    AND group_id = p_group_id
    AND is_active = true;

    -- Group mute overrides global settings for this group
    IF group_settings IS NOT NULL
       AND mute_until IS NOT NULL
       AND mute_until > now_ts THEN
      effective_settings = group_settings || jsonb_build_object(
        'scope', 'group',
        'group_id', p_group_id,
        'mute_until', mute_until
      );
    END IF;
  END IF;

  RETURN effective_settings;
END;
$$;

-- Function to automatically clean up expired mutes
CREATE OR REPLACE FUNCTION cleanup_expired_mutes()
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
  cleanup_count INTEGER := 0;
  now_ts TIMESTAMP WITH TIME ZONE := NOW();
BEGIN
  -- Clean up expired group mutes
  UPDATE group_memberships
  SET mute_until = NULL,
      mute_settings = NULL
  WHERE mute_until IS NOT NULL
  AND mute_until <= now_ts;

  GET DIAGNOSTICS cleanup_count = ROW_COUNT;

  -- Clean up expired global mutes
  UPDATE recipients
  SET notification_preferences = notification_preferences - 'mute_settings'
  WHERE notification_preferences ? 'mute_settings'
  AND (notification_preferences->'mute_settings'->>'mute_until')::TIMESTAMP WITH TIME ZONE <= now_ts;

  RETURN cleanup_count;
END;
$$;

-- Function to apply bulk mute operations
CREATE OR REPLACE FUNCTION bulk_mute_operation(
  p_recipient_ids UUID[],
  p_group_ids UUID[] DEFAULT NULL,
  p_operation VARCHAR DEFAULT 'mute', -- 'mute', 'unmute', 'snooze'
  p_duration_minutes INTEGER DEFAULT NULL,
  p_mute_settings JSONB DEFAULT '{}'::jsonb
)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
  mute_until_ts TIMESTAMP WITH TIME ZONE;
  affected_count INTEGER := 0;
  result JSONB;
BEGIN
  -- Calculate mute until timestamp
  IF p_duration_minutes IS NOT NULL THEN
    mute_until_ts := NOW() + (p_duration_minutes || ' minutes')::INTERVAL;
  END IF;

  -- Enhance mute settings with operation metadata
  p_mute_settings = p_mute_settings || jsonb_build_object(
    'operation', p_operation,
    'applied_at', NOW(),
    'mute_until', mute_until_ts
  );

  IF p_operation = 'mute' OR p_operation = 'snooze' THEN
    IF p_group_ids IS NULL THEN
      -- Global mute for all recipients
      UPDATE recipients
      SET notification_preferences = notification_preferences || jsonb_build_object('mute_settings', p_mute_settings)
      WHERE id = ANY(p_recipient_ids);

      GET DIAGNOSTICS affected_count = ROW_COUNT;
    ELSE
      -- Group-specific mute
      UPDATE group_memberships
      SET mute_until = mute_until_ts,
          mute_settings = p_mute_settings
      WHERE recipient_id = ANY(p_recipient_ids)
      AND group_id = ANY(p_group_ids)
      AND is_active = true;

      GET DIAGNOSTICS affected_count = ROW_COUNT;
    END IF;
  ELSIF p_operation = 'unmute' THEN
    IF p_group_ids IS NULL THEN
      -- Global unmute
      UPDATE recipients
      SET notification_preferences = notification_preferences - 'mute_settings'
      WHERE id = ANY(p_recipient_ids);

      GET DIAGNOSTICS affected_count = ROW_COUNT;
    ELSE
      -- Group-specific unmute
      UPDATE group_memberships
      SET mute_until = NULL,
          mute_settings = NULL
      WHERE recipient_id = ANY(p_recipient_ids)
      AND group_id = ANY(p_group_ids);

      GET DIAGNOSTICS affected_count = ROW_COUNT;
    END IF;
  END IF;

  result = jsonb_build_object(
    'operation', p_operation,
    'affected_count', affected_count,
    'mute_until', mute_until_ts,
    'applied_at', NOW()
  );

  RETURN result;
END;
$$;

-- =============================================================================
-- NOTIFICATION DELIVERY ENHANCEMENT
-- =============================================================================

-- Function to determine if notification should be delivered
CREATE OR REPLACE FUNCTION should_deliver_notification(
  p_recipient_id UUID,
  p_group_id UUID,
  p_notification_type VARCHAR DEFAULT 'update',
  p_urgency_level VARCHAR DEFAULT 'normal'
)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  mute_settings JSONB;
  preserve_urgent BOOLEAN;
BEGIN
  -- Get effective mute settings
  mute_settings = get_mute_settings(p_recipient_id, p_group_id);

  -- If no mute settings, deliver normally
  IF mute_settings = '{}' THEN
    RETURN TRUE;
  END IF;

  -- Check if this recipient/group is currently muted
  IF NOT is_recipient_muted(p_recipient_id, p_group_id) THEN
    RETURN TRUE;
  END IF;

  -- Check if urgent notifications should be preserved
  preserve_urgent = COALESCE((mute_settings->>'preserve_urgent')::BOOLEAN, true);

  -- Deliver urgent notifications even when muted if preserve_urgent is true
  IF preserve_urgent AND (p_urgency_level = 'urgent' OR p_notification_type = 'milestone') THEN
    RETURN TRUE;
  END IF;

  -- Otherwise, don't deliver
  RETURN FALSE;
END;
$$;

-- =============================================================================
-- TRIGGERS AND AUTOMATION
-- =============================================================================

-- Trigger to automatically clean up expired mutes
CREATE OR REPLACE FUNCTION trigger_cleanup_expired_mutes()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Only run cleanup periodically to avoid performance impact
  IF random() < 0.01 THEN -- 1% chance to run cleanup
    PERFORM cleanup_expired_mutes();
  END IF;

  RETURN NULL;
END;
$$;

-- Create trigger for periodic cleanup (runs on group_memberships inserts/updates)
DROP TRIGGER IF EXISTS periodic_mute_cleanup ON group_memberships;
CREATE TRIGGER periodic_mute_cleanup
  AFTER INSERT OR UPDATE ON group_memberships
  FOR EACH STATEMENT
  EXECUTE FUNCTION trigger_cleanup_expired_mutes();

-- =============================================================================
-- INDEXES FOR PERFORMANCE
-- =============================================================================

-- Index for mute_until queries
CREATE INDEX IF NOT EXISTS idx_group_memberships_mute_until
  ON group_memberships(mute_until)
  WHERE mute_until IS NOT NULL;

-- Index for active muted memberships
CREATE INDEX IF NOT EXISTS idx_group_memberships_muted_active
  ON group_memberships(recipient_id, is_active, mute_until)
  WHERE mute_until IS NOT NULL AND is_active = true;

-- Index for notification preferences
CREATE INDEX IF NOT EXISTS idx_recipients_notification_prefs
  ON recipients USING GIN(notification_preferences)
  WHERE notification_preferences ? 'mute_settings';

-- Composite index for mute checks
CREATE INDEX IF NOT EXISTS idx_group_memberships_mute_check
  ON group_memberships(recipient_id, group_id, is_active, mute_until);

-- =============================================================================
-- ROW LEVEL SECURITY UPDATES
-- =============================================================================

-- No additional RLS policies needed since mute functionality
-- uses existing group_memberships and recipients tables

-- =============================================================================
-- HELPER VIEWS
-- =============================================================================

-- View for currently muted recipients
CREATE OR REPLACE VIEW currently_muted_recipients AS
SELECT DISTINCT
  r.id as recipient_id,
  r.name as recipient_name,
  r.email,
  CASE
    WHEN r.notification_preferences ? 'mute_settings'
         AND (r.notification_preferences->'mute_settings'->>'mute_until')::TIMESTAMP WITH TIME ZONE > NOW()
    THEN 'global'
    ELSE 'group'
  END as mute_scope,
  COALESCE(
    (r.notification_preferences->'mute_settings'->>'mute_until')::TIMESTAMP WITH TIME ZONE,
    gm.mute_until
  ) as muted_until,
  COALESCE(
    r.notification_preferences->'mute_settings',
    gm.mute_settings
  ) as mute_settings
FROM recipients r
LEFT JOIN group_memberships gm ON gm.recipient_id = r.id
  AND gm.mute_until > NOW()
  AND gm.is_active = true
WHERE (
  r.notification_preferences ? 'mute_settings'
  AND (r.notification_preferences->'mute_settings'->>'mute_until')::TIMESTAMP WITH TIME ZONE > NOW()
) OR (
  gm.mute_until IS NOT NULL
  AND gm.mute_until > NOW()
);

-- View for mute analytics
CREATE OR REPLACE VIEW mute_analytics AS
SELECT
  'global' as mute_type,
  COUNT(*) as muted_count,
  AVG(
    EXTRACT(EPOCH FROM
      (notification_preferences->'mute_settings'->>'mute_until')::TIMESTAMP WITH TIME ZONE - NOW()
    ) / 3600
  ) as avg_hours_remaining
FROM recipients
WHERE notification_preferences ? 'mute_settings'
AND (notification_preferences->'mute_settings'->>'mute_until')::TIMESTAMP WITH TIME ZONE > NOW()

UNION ALL

SELECT
  'group' as mute_type,
  COUNT(*) as muted_count,
  AVG(EXTRACT(EPOCH FROM mute_until - NOW()) / 3600) as avg_hours_remaining
FROM group_memberships
WHERE mute_until > NOW()
AND is_active = true;