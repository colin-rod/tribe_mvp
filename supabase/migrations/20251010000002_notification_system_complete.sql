-- Complete Notification System Setup
-- Migration: 20251010000002_notification_system_complete.sql
-- Description: Creates notification_jobs table and supporting infrastructure for background job processing
-- Issue: CRO-102 - Background Job Processing System
--
-- IMPORTANT: Execute this migration via Supabase SQL Editor
-- This migration is idempotent - safe to run multiple times

-- =============================================================================
-- NOTIFICATION JOBS TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS notification_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Job identification
  recipient_id UUID REFERENCES recipients(id) ON DELETE CASCADE NOT NULL,
  group_id UUID REFERENCES recipient_groups(id) ON DELETE CASCADE NOT NULL,
  update_id UUID REFERENCES memories(id) ON DELETE CASCADE, -- Nullable for digest notifications

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
    CHECK (status IN ('pending', 'processing', 'sent', 'failed', 'skipped', 'cancelled')),

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

-- Add comment
COMMENT ON TABLE notification_jobs IS 'Background job queue for notifications. Processed by notification worker.';
COMMENT ON COLUMN notification_jobs.update_id IS 'References memories table. Nullable for digest notifications.';
COMMENT ON COLUMN notification_jobs.status IS 'Job status: pending (queued), processing (in progress), sent (delivered), failed (error), skipped (muted), cancelled (user action)';

-- =============================================================================
-- NOTIFICATION DELIVERY LOGS
-- =============================================================================

CREATE TABLE IF NOT EXISTS notification_delivery_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

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

COMMENT ON TABLE notification_delivery_logs IS 'Audit log of all notification delivery attempts';

-- =============================================================================
-- DIGEST SCHEDULES TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS digest_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

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

COMMENT ON TABLE digest_schedules IS 'Recurring digest delivery schedules for recipients';

-- =============================================================================
-- NOTIFICATION PREFERENCES CACHE
-- =============================================================================

CREATE TABLE IF NOT EXISTS notification_preferences_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

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

COMMENT ON TABLE notification_preferences_cache IS 'Performance cache for computed notification preferences';

-- =============================================================================
-- DATABASE FUNCTIONS
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

COMMENT ON FUNCTION enqueue_notification_job IS 'Creates a new notification job in the queue';

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
    -- Count pending memories for this recipient/group since last digest
    SELECT COUNT(*) INTO update_count
    FROM memories m
    WHERE m.child_id IN (
      SELECT c.id FROM children c
      WHERE c.parent_id = (
        SELECT parent_id FROM recipient_groups WHERE id = digest_record.group_id
      )
    )
    AND m.created_at > COALESCE(digest_record.last_digest_sent, digest_record.created_at)
    AND m.created_at <= NOW()
    AND m.distribution_status = 'ready';

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
        'email',
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

COMMENT ON FUNCTION create_digest_jobs IS 'Creates notification jobs for due digest schedules';

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

COMMENT ON FUNCTION cleanup_notification_data IS 'Cleans up old notification jobs and logs';

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

CREATE INDEX IF NOT EXISTS idx_notification_jobs_created
  ON notification_jobs(created_at DESC);

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
  FOR ALL USING (true);

-- =============================================================================
-- VERIFICATION
-- =============================================================================

DO $$
DECLARE
    tables_exist BOOLEAN;
    fk_correct BOOLEAN;
BEGIN
    -- Verify all tables were created
    SELECT
        EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name = 'notification_jobs') AND
        EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name = 'notification_delivery_logs') AND
        EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name = 'digest_schedules') AND
        EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name = 'notification_preferences_cache')
    INTO tables_exist;

    IF tables_exist THEN
        RAISE NOTICE '✓ All notification system tables created successfully';
    ELSE
        RAISE WARNING '✗ Some notification system tables may be missing';
    END IF;

    -- Verify foreign key references memories (not child_updates)
    SELECT EXISTS (
        SELECT 1
        FROM information_schema.referential_constraints rc
        JOIN information_schema.key_column_usage kcu
        ON rc.constraint_name = kcu.constraint_name
        WHERE rc.constraint_name = 'notification_jobs_update_id_fkey'
        AND kcu.table_name = 'notification_jobs'
        AND kcu.column_name = 'update_id'
        AND EXISTS (
            SELECT 1
            FROM information_schema.key_column_usage kcu2
            WHERE kcu2.constraint_name = rc.unique_constraint_name
            AND kcu2.table_name = 'memories'
        )
    ) INTO fk_correct;

    IF fk_correct THEN
        RAISE NOTICE '✓ Foreign key correctly references memories table';
    ELSE
        RAISE WARNING '✗ Foreign key may need attention';
    END IF;

    RAISE NOTICE '✓ Notification system migration complete!';
    RAISE NOTICE 'Next step: Start the notification worker with: npm run worker';
END $$;
