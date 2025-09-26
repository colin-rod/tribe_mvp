-- Helper functions for group-based notification system integration
-- These functions support the group management feature's notification requirements

-- =============================================================================
-- GET NOTIFICATION RECIPIENTS WITH GROUP CONTEXT
-- =============================================================================

CREATE OR REPLACE FUNCTION get_notification_recipients_with_groups(
  p_parent_id UUID,
  p_content_type VARCHAR DEFAULT NULL,
  p_target_groups UUID[] DEFAULT NULL
)
RETURNS TABLE(
  id UUID,
  name VARCHAR,
  email VARCHAR,
  phone VARCHAR,
  relationship VARCHAR,
  group_memberships JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    r.id,
    r.name,
    r.email,
    r.phone,
    r.relationship,
    COALESCE(
      json_agg(
        json_build_object(
          'group_id', gm.group_id,
          'notification_frequency', gm.notification_frequency,
          'preferred_channels', gm.preferred_channels,
          'content_types', gm.content_types,
          'role', gm.role,
          'joined_at', gm.joined_at,
          'recipient_groups', json_build_object(
            'id', rg.id,
            'name', rg.name,
            'default_frequency', rg.default_frequency,
            'default_channels', rg.default_channels,
            'notification_settings', rg.notification_settings
          )
        )
        ORDER BY gm.joined_at DESC
      ) FILTER (WHERE gm.id IS NOT NULL),
      '[]'::json
    )::jsonb as group_memberships
  FROM recipients r
  LEFT JOIN group_memberships gm ON r.id = gm.recipient_id AND gm.is_active = true
  LEFT JOIN recipient_groups rg ON gm.group_id = rg.id
  WHERE r.parent_id = p_parent_id
    AND r.is_active = true
    AND (p_target_groups IS NULL OR gm.group_id = ANY(p_target_groups))
    AND (
      p_content_type IS NULL
      OR gm.content_types IS NULL
      OR p_content_type = ANY(gm.content_types)
      OR (gm.content_types IS NULL AND p_content_type = ANY(rg.default_channels))
    )
  GROUP BY r.id, r.name, r.email, r.phone, r.relationship
  HAVING COUNT(gm.id) > 0 OR p_target_groups IS NULL;
END;
$$;

-- =============================================================================
-- GET USER GROUP STATISTICS
-- =============================================================================

CREATE OR REPLACE FUNCTION get_user_group_statistics(user_id UUID)
RETURNS TABLE(
  total_groups INTEGER,
  total_members INTEGER,
  avg_group_size NUMERIC,
  largest_group_size INTEGER,
  most_active_group VARCHAR
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  group_stats RECORD;
  largest_group RECORD;
  most_active RECORD;
BEGIN
  -- Get basic group and member counts
  SELECT
    COUNT(DISTINCT rg.id)::INTEGER as group_count,
    COUNT(gm.id)::INTEGER as member_count
  INTO group_stats
  FROM recipient_groups rg
  LEFT JOIN group_memberships gm ON rg.id = gm.group_id AND gm.is_active = true
  WHERE rg.parent_id = user_id;

  -- Get largest group
  SELECT
    rg.name,
    COUNT(gm.id) as member_count
  INTO largest_group
  FROM recipient_groups rg
  LEFT JOIN group_memberships gm ON rg.id = gm.group_id AND gm.is_active = true
  WHERE rg.parent_id = user_id
  GROUP BY rg.id, rg.name
  ORDER BY COUNT(gm.id) DESC
  LIMIT 1;

  -- Get most active group (most recent activity)
  SELECT rg.name
  INTO most_active
  FROM recipient_groups rg
  JOIN group_memberships gm ON rg.id = gm.group_id
  WHERE rg.parent_id = user_id AND gm.is_active = true
  ORDER BY gm.updated_at DESC
  LIMIT 1;

  RETURN QUERY
  SELECT
    group_stats.group_count,
    group_stats.member_count,
    CASE
      WHEN group_stats.group_count > 0
      THEN group_stats.member_count::NUMERIC / group_stats.group_count::NUMERIC
      ELSE 0::NUMERIC
    END,
    COALESCE(largest_group.member_count::INTEGER, 0),
    most_active.name;
END;
$$;

-- =============================================================================
-- OPTIMIZE GROUP MEMBERSHIP QUERIES
-- =============================================================================

CREATE OR REPLACE FUNCTION optimize_group_membership_for_recipient(
  p_recipient_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result JSONB;
  membership_count INTEGER;
  primary_group RECORD;
  settings_summary JSONB;
BEGIN
  -- Count active memberships
  SELECT COUNT(*) INTO membership_count
  FROM group_memberships
  WHERE recipient_id = p_recipient_id AND is_active = true;

  -- Get primary group (first joined or explicitly set)
  SELECT
    gm.*,
    rg.name as group_name,
    rg.default_frequency,
    rg.default_channels
  INTO primary_group
  FROM group_memberships gm
  JOIN recipient_groups rg ON gm.group_id = rg.id
  WHERE gm.recipient_id = p_recipient_id
    AND gm.is_active = true
  ORDER BY
    CASE WHEN rg.is_default_group THEN 0 ELSE 1 END,
    gm.joined_at ASC
  LIMIT 1;

  -- Summarize notification settings across all groups
  SELECT json_build_object(
    'has_custom_frequency', COUNT(*) FILTER (WHERE notification_frequency IS NOT NULL) > 0,
    'has_custom_channels', COUNT(*) FILTER (WHERE preferred_channels IS NOT NULL) > 0,
    'has_custom_content_types', COUNT(*) FILTER (WHERE content_types IS NOT NULL) > 0,
    'most_frequent_setting', (
      SELECT notification_frequency
      FROM group_memberships
      WHERE recipient_id = p_recipient_id
        AND is_active = true
        AND notification_frequency IS NOT NULL
      GROUP BY notification_frequency
      ORDER BY COUNT(*) DESC
      LIMIT 1
    )
  ) INTO settings_summary
  FROM group_memberships
  WHERE recipient_id = p_recipient_id AND is_active = true;

  -- Build result
  result := json_build_object(
    'recipient_id', p_recipient_id,
    'membership_count', membership_count,
    'primary_group', row_to_json(primary_group),
    'settings_summary', settings_summary,
    'optimized_at', NOW()
  );

  RETURN result;
END;
$$;

-- =============================================================================
-- BULK UPDATE GROUP MEMBER SETTINGS
-- =============================================================================

CREATE OR REPLACE FUNCTION bulk_update_group_member_settings(
  p_group_id UUID,
  p_parent_id UUID,
  p_settings JSONB,
  p_apply_to_all BOOLEAN DEFAULT false,
  p_specific_members UUID[] DEFAULT NULL
)
RETURNS TABLE(
  updated_count INTEGER,
  skipped_count INTEGER,
  error_details JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  updated_members INTEGER := 0;
  skipped_members INTEGER := 0;
  errors JSONB := '[]'::jsonb;
  member_record RECORD;
BEGIN
  -- Validate group ownership
  IF NOT EXISTS (
    SELECT 1 FROM recipient_groups
    WHERE id = p_group_id AND parent_id = p_parent_id
  ) THEN
    RAISE EXCEPTION 'Group not found or access denied';
  END IF;

  -- Update strategy based on parameters
  IF p_specific_members IS NOT NULL THEN
    -- Update specific members only
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
      AND recipient_id = ANY(p_specific_members)
      AND is_active = true;

    GET DIAGNOSTICS updated_members = ROW_COUNT;

  ELSIF p_apply_to_all THEN
    -- Update all active members
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
    WHERE group_id = p_group_id AND is_active = true;

    GET DIAGNOSTICS updated_members = ROW_COUNT;

  ELSE
    -- Update only members without custom settings
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
      AND notification_frequency IS NULL; -- Only members using group defaults

    GET DIAGNOSTICS updated_members = ROW_COUNT;

    -- Count skipped members (those with custom settings)
    SELECT COUNT(*) INTO skipped_members
    FROM group_memberships
    WHERE group_id = p_group_id
      AND is_active = true
      AND notification_frequency IS NOT NULL;
  END IF;

  RETURN QUERY
  SELECT
    updated_members,
    skipped_members,
    errors;
END;
$$;

-- =============================================================================
-- VALIDATE GROUP OPERATION PERMISSIONS
-- =============================================================================

CREATE OR REPLACE FUNCTION validate_group_operation_permission(
  p_user_id UUID,
  p_group_id UUID,
  p_operation VARCHAR,
  p_context JSONB DEFAULT '{}'::jsonb
)
RETURNS TABLE(
  allowed BOOLEAN,
  reason VARCHAR,
  additional_info JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  group_record RECORD;
  member_count INTEGER;
  user_group_count INTEGER;
  additional_data JSONB := '{}'::jsonb;
BEGIN
  -- Get group information
  SELECT * INTO group_record
  FROM recipient_groups
  WHERE id = p_group_id;

  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 'Group not found', '{}'::jsonb;
    RETURN;
  END IF;

  -- Check group ownership for most operations
  IF group_record.parent_id != p_user_id AND p_operation != 'view' THEN
    RETURN QUERY SELECT false, 'Access denied: not group owner', '{}'::jsonb;
    RETURN;
  END IF;

  -- Operation-specific validations
  CASE p_operation
    WHEN 'delete' THEN
      -- Check if it's a default group
      IF group_record.is_default_group THEN
        RETURN QUERY SELECT false, 'Cannot delete default groups', '{}'::jsonb;
        RETURN;
      END IF;

      -- Check member count
      SELECT COUNT(*) INTO member_count
      FROM group_memberships
      WHERE group_id = p_group_id AND is_active = true;

      additional_data := json_build_object('member_count', member_count);

    WHEN 'add_members' THEN
      -- Check group size limits
      SELECT COUNT(*) INTO member_count
      FROM group_memberships
      WHERE group_id = p_group_id AND is_active = true;

      IF member_count >= 100 THEN
        RETURN QUERY SELECT false, 'Group has reached maximum size (100 members)',
          json_build_object('current_members', member_count);
        RETURN;
      END IF;

      additional_data := json_build_object('current_members', member_count, 'available_slots', 100 - member_count);

    WHEN 'create' THEN
      -- Check user's group limit
      SELECT COUNT(*) INTO user_group_count
      FROM recipient_groups
      WHERE parent_id = p_user_id;

      IF user_group_count >= 25 THEN
        RETURN QUERY SELECT false, 'User has reached maximum number of groups (25)',
          json_build_object('current_groups', user_group_count);
        RETURN;
      END IF;

      additional_data := json_build_object('current_groups', user_group_count, 'available_slots', 25 - user_group_count);

    ELSE
      -- Default allow for other operations
      NULL;
  END CASE;

  -- If we reach here, operation is allowed
  RETURN QUERY SELECT true, 'Operation allowed', additional_data;
END;
$$;

-- =============================================================================
-- INDEXES FOR PERFORMANCE
-- =============================================================================

-- Compound indexes for common query patterns
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_group_memberships_recipient_group_active
  ON group_memberships(recipient_id, group_id) WHERE is_active = true;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_group_memberships_group_role_active
  ON group_memberships(group_id, role) WHERE is_active = true;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_recipient_groups_parent_default
  ON recipient_groups(parent_id, is_default_group);

-- Partial indexes for notification processing
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_group_memberships_notification_frequency
  ON group_memberships(notification_frequency) WHERE notification_frequency IS NOT NULL AND is_active = true;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_group_memberships_custom_settings
  ON group_memberships(group_id) WHERE (notification_frequency IS NOT NULL OR preferred_channels IS NOT NULL) AND is_active = true;

-- =============================================================================
-- GRANT PERMISSIONS
-- =============================================================================

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION get_notification_recipients_with_groups TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_group_statistics TO authenticated;
GRANT EXECUTE ON FUNCTION optimize_group_membership_for_recipient TO authenticated;
GRANT EXECUTE ON FUNCTION bulk_update_group_member_settings TO authenticated;
GRANT EXECUTE ON FUNCTION validate_group_operation_permission TO authenticated;