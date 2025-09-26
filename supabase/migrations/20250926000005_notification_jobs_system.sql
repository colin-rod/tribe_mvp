-- Notification Jobs System Migration
-- Creates a comprehensive notification job queue system for group-based notifications

-- =============================================================================
-- NOTIFICATION JOBS TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS notification_jobs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Job identification
  recipient_id UUID REFERENCES recipients(id) ON DELETE CASCADE NOT NULL,
  group_id UUID REFERENCES recipient_groups(id) ON DELETE CASCADE NOT NULL,
  update_id UUID REFERENCES child_updates(id) ON DELETE CASCADE NOT NULL,

  -- Scheduling
  scheduled_for TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  processed_at TIMESTAMP WITH TIME ZONE,

  -- Job configuration
  notification_type VARCHAR NOT NULL DEFAULT 'immediate'
    CHECK (notification_type IN ('immediate', 'digest', 'milestone')),
  urgency_level VARCHAR NOT NULL DEFAULT 'normal'
    CHECK (urgency_level IN ('normal', 'urgent', 'low')),
  delivery_method VARCHAR NOT NULL
    CHECK (delivery_method IN ('email', 'sms', 'whatsapp', 'push')),

  -- Job status and tracking
  status VARCHAR NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'sent', 'failed', 'skipped', 'cancelled')),

  -- Content and metadata
  content JSONB NOT NULL DEFAULT '{}',
  metadata JSONB DEFAULT '{}',

  -- Delivery tracking
  message_id VARCHAR,
  failure_reason TEXT,
  retry_count INTEGER DEFAULT 0,
  max_retries INTEGER DEFAULT 3,

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================================================
-- NOTIFICATION DELIVERY LOGS
-- =============================================================================

CREATE TABLE IF NOT EXISTS notification_delivery_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Reference to original job
  job_id UUID REFERENCES notification_jobs(id) ON DELETE CASCADE,

  -- Delivery details
  recipient_id UUID REFERENCES recipients(id) ON DELETE CASCADE NOT NULL,
  group_id UUID REFERENCES recipient_groups(id) ON DELETE CASCADE NOT NULL,
  delivery_method VARCHAR NOT NULL,

  -- Status and tracking
  status VARCHAR NOT NULL
    CHECK (status IN ('delivered', 'failed', 'bounced', 'muted', 'blocked')),

  -- Delivery metadata
  provider_message_id VARCHAR,
  provider_response JSONB,
  delivery_time TIMESTAMP WITH TIME ZONE,

  -- Error tracking
  error_code VARCHAR,
  error_message TEXT,

  -- Performance metrics
  delivery_duration_ms INTEGER,

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================================================
-- DIGEST SCHEDULES TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS digest_schedules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Recipient and group
  recipient_id UUID REFERENCES recipients(id) ON DELETE CASCADE NOT NULL,
  group_id UUID REFERENCES recipient_groups(id) ON DELETE CASCADE NOT NULL,

  -- Schedule configuration
  frequency VARCHAR NOT NULL
    CHECK (frequency IN ('daily', 'weekly', 'monthly')),
  delivery_time TIME NOT NULL DEFAULT '08:00:00',
  delivery_day INTEGER, -- Day of week (1-7) for weekly, day of month (1-31) for monthly
  timezone VARCHAR DEFAULT 'UTC',

  -- Content configuration
  max_updates_per_digest INTEGER DEFAULT 10,
  include_content_types VARCHAR[] DEFAULT ARRAY['photos', 'text', 'milestones'],

  -- Status
  is_active BOOLEAN DEFAULT true,
  last_digest_sent TIMESTAMP WITH TIME ZONE,
  next_digest_scheduled TIMESTAMP WITH TIME ZONE,

  -- Metadata
  digest_settings JSONB DEFAULT '{}',

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Unique constraint
  UNIQUE(recipient_id, group_id, frequency)
);

-- =============================================================================
-- NOTIFICATION PREFERENCES CACHE
-- =============================================================================

CREATE TABLE IF NOT EXISTS notification_preferences_cache (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Cache key
  recipient_id UUID REFERENCES recipients(id) ON DELETE CASCADE NOT NULL,
  group_id UUID REFERENCES recipient_groups(id) ON DELETE CASCADE NOT NULL,

  -- Cached effective settings
  effective_frequency VARCHAR NOT NULL,
  effective_channels VARCHAR[] NOT NULL,
  effective_content_types VARCHAR[] NOT NULL,

  -- Cache metadata
  source VARCHAR NOT NULL
    CHECK (source IN ('member_override', 'group_default', 'system_default')),

  -- Mute status
  is_muted BOOLEAN DEFAULT false,
  muted_until TIMESTAMP WITH TIME ZONE,

  -- Cache control
  cache_expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  cache_version INTEGER DEFAULT 1,

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Unique constraint
  UNIQUE(recipient_id, group_id)
);

-- =============================================================================
-- NOTIFICATION QUEUE MANAGEMENT FUNCTIONS
-- =============================================================================

-- Function to enqueue notification jobs
CREATE OR REPLACE FUNCTION enqueue_notification_job(
  p_recipient_id UUID,
  p_group_id UUID,
  p_update_id UUID,
  p_notification_type VARCHAR DEFAULT 'immediate',
  p_urgency_level VARCHAR DEFAULT 'normal',
  p_delivery_method VARCHAR DEFAULT 'email',
  p_content JSONB DEFAULT '{}',
  p_schedule_delay_minutes INTEGER DEFAULT 0
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  job_id UUID;
  scheduled_time TIMESTAMP WITH TIME ZONE;
BEGIN
  -- Calculate scheduled time
  scheduled_time := NOW() + (p_schedule_delay_minutes || ' minutes')::INTERVAL;

  -- Create the job
  INSERT INTO notification_jobs (
    recipient_id,
    group_id,
    update_id,
    notification_type,
    urgency_level,
    delivery_method,
    content,
    scheduled_for
  ) VALUES (
    p_recipient_id,
    p_group_id,
    p_update_id,
    p_notification_type,
    p_urgency_level,
    p_delivery_method,
    p_content,
    scheduled_time
  ) RETURNING id INTO job_id;

  RETURN job_id;
END;
$$;

-- Function to process digest notifications
CREATE OR REPLACE FUNCTION create_digest_jobs()
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
  digest_record RECORD;
  update_count INTEGER;
  digest_content JSONB;
  job_count INTEGER := 0;
BEGIN
  -- Find digests that are due
  FOR digest_record IN
    SELECT ds.*, r.preference_token, rg.name as group_name
    FROM digest_schedules ds
    JOIN recipients r ON r.id = ds.recipient_id
    JOIN recipient_groups rg ON rg.id = ds.group_id
    WHERE ds.is_active = true
    AND ds.next_digest_scheduled <= NOW()
    AND NOT is_recipient_muted(ds.recipient_id, ds.group_id)
  LOOP
    -- Count pending updates for this recipient/group since last digest
    SELECT COUNT(*) INTO update_count
    FROM child_updates cu
    WHERE cu.group_id = digest_record.group_id
    AND cu.created_at > COALESCE(digest_record.last_digest_sent, digest_record.created_at)
    AND cu.created_at <= NOW();

    -- Only create digest if there are updates
    IF update_count > 0 THEN
      -- Build digest content
      digest_content := json_build_object(
        'type', 'digest',
        'frequency', digest_record.frequency,
        'group_name', digest_record.group_name,
        'update_count', update_count,
        'recipient_token', digest_record.preference_token,
        'digest_settings', digest_record.digest_settings
      );

      -- Create digest job
      PERFORM enqueue_notification_job(
        digest_record.recipient_id,
        digest_record.group_id,
        NULL, -- No specific update for digests
        'digest',
        'normal',
        'email', -- Digests are typically email-only
        digest_content,
        0
      );

      -- Update digest schedule
      UPDATE digest_schedules
      SET
        last_digest_sent = NOW(),
        next_digest_scheduled = CASE
          WHEN frequency = 'daily' THEN
            (DATE(NOW()) + INTERVAL '1 day' + delivery_time::INTERVAL) AT TIME ZONE timezone
          WHEN frequency = 'weekly' THEN
            (DATE(NOW()) + INTERVAL '7 days' + delivery_time::INTERVAL) AT TIME ZONE timezone
          WHEN frequency = 'monthly' THEN
            (DATE(NOW()) + INTERVAL '1 month' + delivery_time::INTERVAL) AT TIME ZONE timezone
        END
      WHERE id = digest_record.id;

      job_count := job_count + 1;
    END IF;
  END LOOP;

  RETURN job_count;
END;
$$;

-- Function to clean up old jobs and logs
CREATE OR REPLACE FUNCTION cleanup_notification_data(
  p_days_to_keep INTEGER DEFAULT 30
)
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
  cleanup_count INTEGER := 0;
  cutoff_date TIMESTAMP WITH TIME ZONE;
BEGIN
  cutoff_date := NOW() - (p_days_to_keep || ' days')::INTERVAL;

  -- Clean up old completed jobs
  DELETE FROM notification_jobs
  WHERE status IN ('sent', 'failed', 'skipped')
  AND processed_at < cutoff_date;

  GET DIAGNOSTICS cleanup_count = ROW_COUNT;

  -- Clean up old delivery logs
  DELETE FROM notification_delivery_logs
  WHERE created_at < cutoff_date;

  -- Clean up expired cache entries
  DELETE FROM notification_preferences_cache
  WHERE cache_expires_at < NOW();

  RETURN cleanup_count;
END;
$$;

-- Function to refresh notification preferences cache
CREATE OR REPLACE FUNCTION refresh_notification_cache(
  p_recipient_id UUID,
  p_group_id UUID DEFAULT NULL
)
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
  cache_record RECORD;
  effective_settings JSONB;
  cache_count INTEGER := 0;
BEGIN
  -- If specific group provided, update just that cache entry
  IF p_group_id IS NOT NULL THEN
    effective_settings := get_effective_notification_settings(p_recipient_id, p_group_id);

    INSERT INTO notification_preferences_cache (
      recipient_id,
      group_id,
      effective_frequency,
      effective_channels,
      effective_content_types,
      source,
      is_muted,
      muted_until,
      cache_expires_at
    ) VALUES (
      p_recipient_id,
      p_group_id,
      effective_settings->>'frequency',
      ARRAY(SELECT jsonb_array_elements_text(effective_settings->'channels')),
      ARRAY(SELECT jsonb_array_elements_text(effective_settings->'content_types')),
      effective_settings->>'source',
      is_recipient_muted(p_recipient_id, p_group_id),
      (SELECT mute_until FROM group_memberships
       WHERE recipient_id = p_recipient_id AND group_id = p_group_id),
      NOW() + INTERVAL '1 hour'
    ) ON CONFLICT (recipient_id, group_id)
    DO UPDATE SET
      effective_frequency = EXCLUDED.effective_frequency,
      effective_channels = EXCLUDED.effective_channels,
      effective_content_types = EXCLUDED.effective_content_types,
      source = EXCLUDED.source,
      is_muted = EXCLUDED.is_muted,
      muted_until = EXCLUDED.muted_until,
      cache_expires_at = EXCLUDED.cache_expires_at,
      updated_at = NOW();

    cache_count := 1;
  ELSE
    -- Update cache for all groups this recipient belongs to
    FOR cache_record IN
      SELECT gm.group_id
      FROM group_memberships gm
      WHERE gm.recipient_id = p_recipient_id
      AND gm.is_active = true
    LOOP
      PERFORM refresh_notification_cache(p_recipient_id, cache_record.group_id);
      cache_count := cache_count + 1;
    END LOOP;
  END IF;

  RETURN cache_count;
END;
$$;

-- =============================================================================
-- PERFORMANCE INDEXES
-- =============================================================================

-- Notification jobs indexes
CREATE INDEX IF NOT EXISTS idx_notification_jobs_status_scheduled
  ON notification_jobs(status, scheduled_for) WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_notification_jobs_recipient_group
  ON notification_jobs(recipient_id, group_id);

CREATE INDEX IF NOT EXISTS idx_notification_jobs_update_id
  ON notification_jobs(update_id);

CREATE INDEX IF NOT EXISTS idx_notification_jobs_delivery_method
  ON notification_jobs(delivery_method, status);

-- Delivery logs indexes
CREATE INDEX IF NOT EXISTS idx_delivery_logs_job_id
  ON notification_delivery_logs(job_id);

CREATE INDEX IF NOT EXISTS idx_delivery_logs_recipient_group
  ON notification_delivery_logs(recipient_id, group_id);

CREATE INDEX IF NOT EXISTS idx_delivery_logs_status_created
  ON notification_delivery_logs(status, created_at);

-- Digest schedules indexes
CREATE INDEX IF NOT EXISTS idx_digest_schedules_next_scheduled
  ON digest_schedules(next_digest_scheduled, is_active) WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_digest_schedules_recipient_group
  ON digest_schedules(recipient_id, group_id);

-- Cache indexes
CREATE INDEX IF NOT EXISTS idx_notification_cache_expires
  ON notification_preferences_cache(cache_expires_at);

CREATE INDEX IF NOT EXISTS idx_notification_cache_muted
  ON notification_preferences_cache(is_muted, muted_until) WHERE is_muted = true;

-- =============================================================================
-- TRIGGERS FOR AUTOMATION
-- =============================================================================

-- Trigger to update updated_at timestamps
CREATE TRIGGER update_notification_jobs_updated_at
  BEFORE UPDATE ON notification_jobs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_digest_schedules_updated_at
  BEFORE UPDATE ON digest_schedules
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_notification_cache_updated_at
  BEFORE UPDATE ON notification_preferences_cache
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Trigger to invalidate cache when group membership settings change
CREATE OR REPLACE FUNCTION invalidate_notification_cache()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Delete cache entries for affected recipient/group combinations
  IF TG_OP = 'UPDATE' THEN
    DELETE FROM notification_preferences_cache
    WHERE recipient_id = NEW.recipient_id
    AND group_id = NEW.group_id;
  ELSIF TG_OP = 'DELETE' THEN
    DELETE FROM notification_preferences_cache
    WHERE recipient_id = OLD.recipient_id
    AND group_id = OLD.group_id;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER invalidate_cache_on_membership_change
  AFTER UPDATE OR DELETE ON group_memberships
  FOR EACH ROW EXECUTE FUNCTION invalidate_notification_cache();

-- =============================================================================
-- ROW LEVEL SECURITY
-- =============================================================================

-- Enable RLS on all tables
ALTER TABLE notification_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_delivery_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE digest_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_preferences_cache ENABLE ROW LEVEL SECURITY;

-- Policies for notification_jobs
DROP POLICY IF EXISTS "Parents can manage notification jobs for their recipients" ON notification_jobs;
CREATE POLICY "Parents can manage notification jobs for their recipients" ON notification_jobs
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM recipients r
      WHERE r.id = notification_jobs.recipient_id
      AND r.parent_id = auth.uid()
    )
  );

-- Policies for delivery logs
DROP POLICY IF EXISTS "Parents can view delivery logs for their recipients" ON notification_delivery_logs;
CREATE POLICY "Parents can view delivery logs for their recipients" ON notification_delivery_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM recipients r
      WHERE r.id = notification_delivery_logs.recipient_id
      AND r.parent_id = auth.uid()
    )
  );

-- Policies for digest schedules
DROP POLICY IF EXISTS "Parents can manage digest schedules for their recipients" ON digest_schedules;
CREATE POLICY "Parents can manage digest schedules for their recipients" ON digest_schedules
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM recipients r
      WHERE r.id = digest_schedules.recipient_id
      AND r.parent_id = auth.uid()
    )
  );

-- Policies for cache (internal use only, no direct user access)
DROP POLICY IF EXISTS "System can manage notification cache" ON notification_preferences_cache;
CREATE POLICY "System can manage notification cache" ON notification_preferences_cache
  FOR ALL USING (true); -- Internal system use only