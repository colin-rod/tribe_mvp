-- Privacy Settings Migration
-- Migration: 20250928000001_privacy_settings.sql
-- Description: Add privacy settings table and user metadata fields for privacy controls

-- =============================================================================
-- PRIVACY SETTINGS TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS privacy_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,

  -- Profile Visibility Settings
  profile_visibility VARCHAR DEFAULT 'friends'
    CHECK (profile_visibility IN ('public', 'private', 'friends')),

  -- Data Usage Preferences
  data_sharing BOOLEAN DEFAULT false,
  analytics_opt_out BOOLEAN DEFAULT false,
  delete_after_inactivity BOOLEAN DEFAULT false,

  -- Data Management Tracking
  last_export_requested_at TIMESTAMP WITH TIME ZONE,
  last_export_completed_at TIMESTAMP WITH TIME ZONE,
  last_export_download_url TEXT,
  last_export_expires_at TIMESTAMP WITH TIME ZONE,

  -- Deletion Tracking
  deletion_requested_at TIMESTAMP WITH TIME ZONE,
  deletion_scheduled_for TIMESTAMP WITH TIME ZONE,
  deletion_completed_at TIMESTAMP WITH TIME ZONE,

  -- Audit Trail
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS for privacy_settings
ALTER TABLE privacy_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies for privacy_settings
DROP POLICY IF EXISTS "Users can manage their own privacy settings" ON privacy_settings;
CREATE POLICY "Users can manage their own privacy settings" ON privacy_settings
  FOR ALL USING (auth.uid() = user_id);

-- =============================================================================
-- USER METADATA EXTENSIONS
-- =============================================================================

-- Add privacy-related fields to profiles table
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS privacy_settings_id UUID REFERENCES privacy_settings(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS data_retention_policy VARCHAR DEFAULT 'indefinite'
  CHECK (data_retention_policy IN ('indefinite', '1_year', '2_years', '5_years')),
ADD COLUMN IF NOT EXISTS account_deletion_scheduled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS last_activity_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- =============================================================================
-- DATA EXPORT JOBS TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS data_export_jobs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,

  -- Export Details
  export_type VARCHAR DEFAULT 'full'
    CHECK (export_type IN ('full', 'minimal', 'media_only')),
  status VARCHAR DEFAULT 'pending'
    CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'expired')),

  -- File Information
  file_size_bytes BIGINT,
  download_url TEXT,
  expires_at TIMESTAMP WITH TIME ZONE,

  -- Processing Details
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  error_message TEXT,

  -- Audit
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Auto-cleanup expired exports
  CONSTRAINT valid_expiry CHECK (expires_at > created_at)
);

-- Enable RLS for data_export_jobs
ALTER TABLE data_export_jobs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for data_export_jobs
DROP POLICY IF EXISTS "Users can view their own export jobs" ON data_export_jobs;
CREATE POLICY "Users can view their own export jobs" ON data_export_jobs
  FOR ALL USING (auth.uid() = user_id);

-- =============================================================================
-- DATA DELETION AUDIT TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS data_deletion_audit (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL, -- Don't reference auth.users since user might be deleted

  -- Deletion Details
  deletion_type VARCHAR NOT NULL
    CHECK (deletion_type IN ('user_requested', 'inactivity_cleanup', 'gdpr_compliance', 'account_closure')),

  -- What was deleted
  deleted_tables TEXT[], -- Track which tables had data removed
  deleted_records_count INTEGER DEFAULT 0,
  deleted_files_count INTEGER DEFAULT 0,
  deleted_storage_bytes BIGINT DEFAULT 0,

  -- Retention Information
  retained_data TEXT[], -- What data was kept for legal/business reasons
  retention_period VARCHAR, -- How long retained data will be kept

  -- Audit Trail
  requested_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  approved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  executed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Notes
  notes TEXT,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS for data_deletion_audit
ALTER TABLE data_deletion_audit ENABLE ROW LEVEL SECURITY;

-- RLS Policies for data_deletion_audit
DROP POLICY IF EXISTS "Users can view their own deletion audit" ON data_deletion_audit;
CREATE POLICY "Users can view their own deletion audit" ON data_deletion_audit
  FOR SELECT USING (auth.uid() = user_id OR auth.uid() = requested_by);

-- =============================================================================
-- FUNCTIONS FOR PRIVACY OPERATIONS
-- =============================================================================

-- Function to create default privacy settings for new users
CREATE OR REPLACE FUNCTION create_default_privacy_settings(user_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  privacy_id UUID;
BEGIN
  INSERT INTO privacy_settings (user_id, profile_visibility, data_sharing, analytics_opt_out, delete_after_inactivity)
  VALUES (user_id, 'friends', false, false, false)
  RETURNING id INTO privacy_id;

  -- Link privacy settings to profile
  UPDATE profiles
  SET privacy_settings_id = privacy_id,
      last_activity_at = NOW()
  WHERE id = user_id;

  RETURN privacy_id;
END;
$$;

-- Function to update privacy settings
CREATE OR REPLACE FUNCTION update_privacy_settings(
  user_id UUID,
  profile_visibility_new VARCHAR DEFAULT NULL,
  data_sharing_new BOOLEAN DEFAULT NULL,
  analytics_opt_out_new BOOLEAN DEFAULT NULL,
  delete_after_inactivity_new BOOLEAN DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Create privacy settings if they don't exist
  INSERT INTO privacy_settings (user_id)
  VALUES (user_id)
  ON CONFLICT (user_id) DO NOTHING;

  -- Update the settings
  UPDATE privacy_settings
  SET
    profile_visibility = COALESCE(profile_visibility_new, profile_visibility),
    data_sharing = COALESCE(data_sharing_new, data_sharing),
    analytics_opt_out = COALESCE(analytics_opt_out_new, analytics_opt_out),
    delete_after_inactivity = COALESCE(delete_after_inactivity_new, delete_after_inactivity),
    updated_at = NOW()
  WHERE user_id = update_privacy_settings.user_id;

  -- Update last activity
  UPDATE profiles
  SET last_activity_at = NOW()
  WHERE id = user_id;

  RETURN FOUND;
END;
$$;

-- Function to get comprehensive user data for export
CREATE OR REPLACE FUNCTION get_user_export_data(user_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'profile', (
      SELECT json_build_object(
        'id', p.id,
        'email', p.email,
        'name', p.name,
        'created_at', p.created_at,
        'updated_at', p.updated_at,
        'notification_preferences', p.notification_preferences,
        'onboarding_completed', p.onboarding_completed,
        'last_activity_at', p.last_activity_at
      )
      FROM profiles p WHERE p.id = user_id
    ),
    'privacy_settings', (
      SELECT json_build_object(
        'profile_visibility', ps.profile_visibility,
        'data_sharing', ps.data_sharing,
        'analytics_opt_out', ps.analytics_opt_out,
        'delete_after_inactivity', ps.delete_after_inactivity,
        'created_at', ps.created_at,
        'updated_at', ps.updated_at
      )
      FROM privacy_settings ps WHERE ps.user_id = get_user_export_data.user_id
    ),
    'children', (
      SELECT COALESCE(json_agg(
        json_build_object(
          'id', c.id,
          'name', c.name,
          'birth_date', c.birth_date,
          'profile_photo_url', c.profile_photo_url,
          'created_at', c.created_at,
          'updated_at', c.updated_at
        )
      ), '[]'::json)
      FROM children c WHERE c.parent_id = user_id
    ),
    'recipient_groups', (
      SELECT COALESCE(json_agg(
        json_build_object(
          'id', rg.id,
          'name', rg.name,
          'default_frequency', rg.default_frequency,
          'default_channels', rg.default_channels,
          'is_default_group', rg.is_default_group,
          'created_at', rg.created_at,
          'updated_at', rg.updated_at
        )
      ), '[]'::json)
      FROM recipient_groups rg WHERE rg.parent_id = user_id
    ),
    'recipients', (
      SELECT COALESCE(json_agg(
        json_build_object(
          'id', r.id,
          'email', r.email,
          'phone', r.phone,
          'name', r.name,
          'relationship', r.relationship,
          'frequency', r.frequency,
          'preferred_channels', r.preferred_channels,
          'content_types', r.content_types,
          'is_active', r.is_active,
          'created_at', r.created_at,
          'updated_at', r.updated_at
        )
      ), '[]'::json)
      FROM recipients r WHERE r.parent_id = user_id
    ),
    'updates', (
      SELECT COALESCE(json_agg(
        json_build_object(
          'id', u.id,
          'child_id', u.child_id,
          'content', u.content,
          'media_urls', u.media_urls,
          'milestone_type', u.milestone_type,
          'ai_analysis', u.ai_analysis,
          'distribution_status', u.distribution_status,
          'created_at', u.created_at,
          'updated_at', u.updated_at,
          'scheduled_for', u.scheduled_for,
          'sent_at', u.sent_at
        )
      ), '[]'::json)
      FROM updates u WHERE u.parent_id = user_id
    ),
    'responses', (
      SELECT COALESCE(json_agg(
        json_build_object(
          'id', resp.id,
          'update_id', resp.update_id,
          'recipient_id', resp.recipient_id,
          'channel', resp.channel,
          'content', resp.content,
          'media_urls', resp.media_urls,
          'received_at', resp.received_at
        )
      ), '[]'::json)
      FROM responses resp
      JOIN updates u ON resp.update_id = u.id
      WHERE u.parent_id = user_id
    ),
    'ai_prompts', (
      SELECT COALESCE(json_agg(
        json_build_object(
          'id', ap.id,
          'child_id', ap.child_id,
          'prompt_type', ap.prompt_type,
          'prompt_text', ap.prompt_text,
          'prompt_data', ap.prompt_data,
          'status', ap.status,
          'created_at', ap.created_at,
          'sent_at', ap.sent_at,
          'acted_on_at', ap.acted_on_at
        )
      ), '[]'::json)
      FROM ai_prompts ap WHERE ap.parent_id = user_id
    ),
    'export_metadata', json_build_object(
      'exported_at', NOW(),
      'export_version', '1.0',
      'user_id', user_id
    )
  ) INTO result;

  RETURN result;
END;
$$;

-- Function to safely delete user data while maintaining referential integrity
CREATE OR REPLACE FUNCTION delete_user_data(
  user_id UUID,
  deletion_type VARCHAR DEFAULT 'user_requested',
  keep_audit_trail BOOLEAN DEFAULT true
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  deletion_summary JSON;
  deleted_tables TEXT[] := ARRAY[]::TEXT[];
  total_records INTEGER := 0;
  record_count INTEGER;
BEGIN
  -- Start building deletion summary
  deletion_summary := json_build_object('user_id', user_id, 'deletion_type', deletion_type);

  -- Delete AI prompts
  DELETE FROM ai_prompts WHERE parent_id = user_id;
  GET DIAGNOSTICS record_count = ROW_COUNT;
  IF record_count > 0 THEN
    deleted_tables := array_append(deleted_tables, 'ai_prompts');
    total_records := total_records + record_count;
  END IF;

  -- Delete responses (cascade will handle via updates deletion)
  DELETE FROM responses WHERE update_id IN (
    SELECT id FROM updates WHERE parent_id = user_id
  );
  GET DIAGNOSTICS record_count = ROW_COUNT;
  IF record_count > 0 THEN
    deleted_tables := array_append(deleted_tables, 'responses');
    total_records := total_records + record_count;
  END IF;

  -- Delete delivery jobs (cascade will handle via updates deletion)
  DELETE FROM delivery_jobs WHERE update_id IN (
    SELECT id FROM updates WHERE parent_id = user_id
  );
  GET DIAGNOSTICS record_count = ROW_COUNT;
  IF record_count > 0 THEN
    deleted_tables := array_append(deleted_tables, 'delivery_jobs');
    total_records := total_records + record_count;
  END IF;

  -- Delete updates
  DELETE FROM updates WHERE parent_id = user_id;
  GET DIAGNOSTICS record_count = ROW_COUNT;
  IF record_count > 0 THEN
    deleted_tables := array_append(deleted_tables, 'updates');
    total_records := total_records + record_count;
  END IF;

  -- Delete recipients
  DELETE FROM recipients WHERE parent_id = user_id;
  GET DIAGNOSTICS record_count = ROW_COUNT;
  IF record_count > 0 THEN
    deleted_tables := array_append(deleted_tables, 'recipients');
    total_records := total_records + record_count;
  END IF;

  -- Delete recipient groups
  DELETE FROM recipient_groups WHERE parent_id = user_id;
  GET DIAGNOSTICS record_count = ROW_COUNT;
  IF record_count > 0 THEN
    deleted_tables := array_append(deleted_tables, 'recipient_groups');
    total_records := total_records + record_count;
  END IF;

  -- Delete children
  DELETE FROM children WHERE parent_id = user_id;
  GET DIAGNOSTICS record_count = ROW_COUNT;
  IF record_count > 0 THEN
    deleted_tables := array_append(deleted_tables, 'children');
    total_records := total_records + record_count;
  END IF;

  -- Delete data export jobs
  DELETE FROM data_export_jobs WHERE data_export_jobs.user_id = delete_user_data.user_id;
  GET DIAGNOSTICS record_count = ROW_COUNT;
  IF record_count > 0 THEN
    deleted_tables := array_append(deleted_tables, 'data_export_jobs');
    total_records := total_records + record_count;
  END IF;

  -- Delete privacy settings
  DELETE FROM privacy_settings WHERE privacy_settings.user_id = delete_user_data.user_id;
  GET DIAGNOSTICS record_count = ROW_COUNT;
  IF record_count > 0 THEN
    deleted_tables := array_append(deleted_tables, 'privacy_settings');
    total_records := total_records + record_count;
  END IF;

  -- Reset profile data but keep the record for auth purposes
  UPDATE profiles
  SET
    name = 'Deleted User',
    notification_preferences = '{}'::jsonb,
    onboarding_completed = false,
    onboarding_step = 0,
    privacy_settings_id = NULL,
    account_deletion_scheduled = true,
    updated_at = NOW()
  WHERE id = user_id;
  GET DIAGNOSTICS record_count = ROW_COUNT;
  IF record_count > 0 THEN
    deleted_tables := array_append(deleted_tables, 'profiles (anonymized)');
    total_records := total_records + record_count;
  END IF;

  -- Create audit trail if requested
  IF keep_audit_trail THEN
    INSERT INTO data_deletion_audit (
      user_id,
      deletion_type,
      deleted_tables,
      deleted_records_count,
      requested_by,
      notes
    ) VALUES (
      user_id,
      deletion_type,
      deleted_tables,
      total_records,
      user_id,
      'User data deletion completed successfully'
    );
  END IF;

  -- Build final summary
  deletion_summary := deletion_summary || json_build_object(
    'deleted_tables', deleted_tables,
    'total_records_deleted', total_records,
    'completed_at', NOW(),
    'audit_trail_created', keep_audit_trail
  );

  RETURN deletion_summary;
END;
$$;

-- =============================================================================
-- TRIGGERS FOR UPDATED_AT
-- =============================================================================

DROP TRIGGER IF EXISTS update_privacy_settings_updated_at ON privacy_settings;
CREATE TRIGGER update_privacy_settings_updated_at BEFORE UPDATE ON privacy_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- UPDATE USER CREATION FUNCTION
-- =============================================================================

-- Update the handle_new_user function to include privacy settings
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
  );

  -- Create default recipient groups
  PERFORM create_default_groups_for_user(new.id);

  -- Create default privacy settings
  PERFORM create_default_privacy_settings(new.id);

  RETURN new;
END;
$$;

-- =============================================================================
-- INDEXES FOR PERFORMANCE
-- =============================================================================

-- Privacy settings indexes
CREATE INDEX IF NOT EXISTS idx_privacy_settings_user_id ON privacy_settings(user_id);
CREATE INDEX IF NOT EXISTS idx_privacy_settings_profile_visibility ON privacy_settings(profile_visibility);
CREATE INDEX IF NOT EXISTS idx_privacy_settings_data_sharing ON privacy_settings(data_sharing);
CREATE INDEX IF NOT EXISTS idx_privacy_settings_analytics_opt_out ON privacy_settings(analytics_opt_out);
CREATE INDEX IF NOT EXISTS idx_privacy_settings_delete_after_inactivity ON privacy_settings(delete_after_inactivity);

-- Data export jobs indexes
CREATE INDEX IF NOT EXISTS idx_data_export_jobs_user_id ON data_export_jobs(user_id);
CREATE INDEX IF NOT EXISTS idx_data_export_jobs_status ON data_export_jobs(status);
CREATE INDEX IF NOT EXISTS idx_data_export_jobs_expires_at ON data_export_jobs(expires_at);
CREATE INDEX IF NOT EXISTS idx_data_export_jobs_created_at ON data_export_jobs(created_at);

-- Data deletion audit indexes
CREATE INDEX IF NOT EXISTS idx_data_deletion_audit_user_id ON data_deletion_audit(user_id);
CREATE INDEX IF NOT EXISTS idx_data_deletion_audit_deletion_type ON data_deletion_audit(deletion_type);
CREATE INDEX IF NOT EXISTS idx_data_deletion_audit_executed_at ON data_deletion_audit(executed_at);

-- Profiles activity tracking
CREATE INDEX IF NOT EXISTS idx_profiles_last_activity_at ON profiles(last_activity_at);
CREATE INDEX IF NOT EXISTS idx_profiles_account_deletion_scheduled ON profiles(account_deletion_scheduled);

-- =============================================================================
-- CLEANUP FUNCTIONS
-- =============================================================================

-- Function to cleanup expired export jobs
CREATE OR REPLACE FUNCTION cleanup_expired_exports()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  cleanup_count INTEGER;
BEGIN
  DELETE FROM data_export_jobs
  WHERE status = 'completed'
    AND expires_at < NOW();

  GET DIAGNOSTICS cleanup_count = ROW_COUNT;

  RETURN cleanup_count;
END;
$$;

-- Function to identify inactive users for potential deletion
CREATE OR REPLACE FUNCTION get_inactive_users(inactive_months INTEGER DEFAULT 24)
RETURNS TABLE(
  user_id UUID,
  email VARCHAR,
  last_activity_at TIMESTAMP WITH TIME ZONE,
  months_inactive NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id,
    p.email,
    p.last_activity_at,
    EXTRACT(EPOCH FROM (NOW() - p.last_activity_at)) / (30.44 * 24 * 3600) as months_inactive
  FROM profiles p
  JOIN privacy_settings ps ON ps.user_id = p.id
  WHERE ps.delete_after_inactivity = true
    AND p.last_activity_at < (NOW() - INTERVAL '1 month' * inactive_months)
    AND p.account_deletion_scheduled = false
  ORDER BY p.last_activity_at ASC;
END;
$$;