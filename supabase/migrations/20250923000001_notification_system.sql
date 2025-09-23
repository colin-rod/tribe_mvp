-- Notification Management System Migration
-- Migration: 20250923000001_notification_system.sql
-- Description: Complete notification system with history tracking and digest queue

-- =============================================================================
-- UPDATE PROFILES TABLE - Enhanced notification preferences
-- =============================================================================

-- Update existing notification_preferences with comprehensive structure
ALTER TABLE profiles ALTER COLUMN notification_preferences SET DEFAULT '{
  "response_notifications": "immediate",
  "prompt_frequency": "every_3_days",
  "enabled_prompt_types": ["milestone", "activity", "fun"],
  "quiet_hours": {"start": "22:00", "end": "07:00"},
  "delivery_notifications": true,
  "system_notifications": true,
  "weekly_digest": true,
  "weekly_digest_day": "sunday",
  "monthly_summary": false,
  "browser_notifications": true,
  "email_notifications": true,
  "digest_email_time": "09:00"
}'::jsonb;

-- =============================================================================
-- NOTIFICATION HISTORY TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS notification_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  type VARCHAR(50) NOT NULL CHECK (type IN ('response', 'prompt', 'delivery', 'system', 'digest')),
  title VARCHAR(255) NOT NULL,
  content TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  read_at TIMESTAMP WITH TIME ZONE,
  sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  delivery_method VARCHAR(20) NOT NULL CHECK (delivery_method IN ('browser', 'email', 'digest')),
  delivery_status VARCHAR(20) DEFAULT 'sent' CHECK (delivery_status IN ('pending', 'sent', 'delivered', 'failed', 'bounced')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS for notification_history
ALTER TABLE notification_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies for notification_history
DROP POLICY IF EXISTS "Users can view their own notification history" ON notification_history;
CREATE POLICY "Users can view their own notification history" ON notification_history
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update read status of their notifications" ON notification_history;
CREATE POLICY "Users can update read status of their notifications" ON notification_history
  FOR UPDATE USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Indexes for notification_history performance
CREATE INDEX IF NOT EXISTS idx_notification_history_user_id ON notification_history(user_id);
CREATE INDEX IF NOT EXISTS idx_notification_history_type ON notification_history(type);
CREATE INDEX IF NOT EXISTS idx_notification_history_sent_at ON notification_history(sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_notification_history_user_type_sent ON notification_history(user_id, type, sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_notification_history_delivery_status ON notification_history(delivery_status);
CREATE INDEX IF NOT EXISTS idx_notification_history_unread ON notification_history(user_id) WHERE read_at IS NULL;

-- GIN index for metadata JSONB queries
CREATE INDEX IF NOT EXISTS idx_notification_history_metadata ON notification_history USING GIN (metadata);

-- =============================================================================
-- DIGEST QUEUE TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS digest_queue (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  digest_type VARCHAR(20) NOT NULL CHECK (digest_type IN ('daily', 'weekly', 'monthly')),
  content JSONB NOT NULL DEFAULT '{}'::jsonb,
  scheduled_for TIMESTAMP WITH TIME ZONE NOT NULL,
  sent_at TIMESTAMP WITH TIME ZONE,
  delivery_status VARCHAR(20) DEFAULT 'pending' CHECK (delivery_status IN ('pending', 'processing', 'sent', 'failed')),
  retry_count INTEGER DEFAULT 0,
  last_retry_at TIMESTAMP WITH TIME ZONE,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS for digest_queue
ALTER TABLE digest_queue ENABLE ROW LEVEL SECURITY;

-- RLS Policies for digest_queue (admin access only for queue management)
DROP POLICY IF EXISTS "Users can view their own digest queue" ON digest_queue;
CREATE POLICY "Users can view their own digest queue" ON digest_queue
  FOR SELECT USING (auth.uid() = user_id);

-- Indexes for digest_queue performance
CREATE INDEX IF NOT EXISTS idx_digest_queue_user_id ON digest_queue(user_id);
CREATE INDEX IF NOT EXISTS idx_digest_queue_scheduled_for ON digest_queue(scheduled_for);
CREATE INDEX IF NOT EXISTS idx_digest_queue_status ON digest_queue(delivery_status);
CREATE INDEX IF NOT EXISTS idx_digest_queue_pending ON digest_queue(scheduled_for) WHERE delivery_status = 'pending';
CREATE INDEX IF NOT EXISTS idx_digest_queue_retry ON digest_queue(last_retry_at, retry_count) WHERE delivery_status = 'failed';

-- GIN index for content JSONB queries
CREATE INDEX IF NOT EXISTS idx_digest_queue_content ON digest_queue USING GIN (content);

-- =============================================================================
-- NOTIFICATION PREFERENCES FUNCTIONS
-- =============================================================================

-- Function to get user's notification preferences with defaults
CREATE OR REPLACE FUNCTION get_notification_preferences(user_uuid UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    user_prefs JSONB;
    default_prefs JSONB := '{
        "response_notifications": "immediate",
        "prompt_frequency": "every_3_days",
        "enabled_prompt_types": ["milestone", "activity", "fun"],
        "quiet_hours": {"start": "22:00", "end": "07:00"},
        "delivery_notifications": true,
        "system_notifications": true,
        "weekly_digest": true,
        "weekly_digest_day": "sunday",
        "monthly_summary": false,
        "browser_notifications": true,
        "email_notifications": true,
        "digest_email_time": "09:00"
    }'::jsonb;
BEGIN
    SELECT notification_preferences INTO user_prefs
    FROM profiles
    WHERE id = user_uuid;

    -- Merge user preferences with defaults (user prefs override defaults)
    RETURN default_prefs || COALESCE(user_prefs, '{}'::jsonb);
END;
$$;

-- Function to check if user is in quiet hours
CREATE OR REPLACE FUNCTION is_in_quiet_hours(user_uuid UUID, check_time TIMESTAMP WITH TIME ZONE DEFAULT NOW())
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    prefs JSONB;
    quiet_start TIME;
    quiet_end TIME;
    current_time TIME;
BEGIN
    -- Get user preferences
    prefs := get_notification_preferences(user_uuid);

    -- Extract quiet hours
    quiet_start := (prefs->'quiet_hours'->>'start')::TIME;
    quiet_end := (prefs->'quiet_hours'->>'end')::TIME;
    current_time := check_time::TIME;

    -- Handle overnight quiet hours (e.g., 22:00 to 07:00)
    IF quiet_start > quiet_end THEN
        RETURN current_time >= quiet_start OR current_time <= quiet_end;
    ELSE
        -- Handle same-day quiet hours (e.g., 12:00 to 14:00)
        RETURN current_time >= quiet_start AND current_time <= quiet_end;
    END IF;
END;
$$;

-- =============================================================================
-- NOTIFICATION TRIGGERS AND AUTOMATION
-- =============================================================================

-- Trigger to automatically create notification history entries
CREATE OR REPLACE FUNCTION create_notification_history()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    -- This function would be called by application logic
    -- when notifications are sent to create history entries
    RETURN NEW;
END;
$$;

-- Function to schedule digest notifications
CREATE OR REPLACE FUNCTION schedule_digest_for_user(
    user_uuid UUID,
    digest_type_param VARCHAR,
    scheduled_time TIMESTAMP WITH TIME ZONE
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    queue_id UUID;
    user_prefs JSONB;
BEGIN
    -- Get user preferences to check if digest is enabled
    user_prefs := get_notification_preferences(user_uuid);

    -- Check if user has digest enabled
    IF NOT (user_prefs->>'weekly_digest')::BOOLEAN AND digest_type_param = 'weekly' THEN
        RETURN NULL;
    END IF;

    IF NOT (user_prefs->>'monthly_summary')::BOOLEAN AND digest_type_param = 'monthly' THEN
        RETURN NULL;
    END IF;

    -- Insert into digest queue
    INSERT INTO digest_queue (user_id, digest_type, scheduled_for, content)
    VALUES (
        user_uuid,
        digest_type_param,
        scheduled_time,
        jsonb_build_object(
            'preferences', user_prefs,
            'created_at', NOW()
        )
    )
    RETURNING id INTO queue_id;

    RETURN queue_id;
END;
$$;

-- Function to clean up old notification history (for maintenance)
CREATE OR REPLACE FUNCTION cleanup_old_notifications(retention_days INTEGER DEFAULT 90)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM notification_history
    WHERE created_at < NOW() - INTERVAL '1 day' * retention_days;

    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$;

-- =============================================================================
-- INDEXES FOR EXISTING TABLES (if not already present)
-- =============================================================================

-- Improve performance for notification-related queries on profiles
CREATE INDEX IF NOT EXISTS idx_profiles_notification_prefs ON profiles USING GIN (notification_preferences);

-- =============================================================================
-- COMMENTS FOR DOCUMENTATION
-- =============================================================================

COMMENT ON TABLE notification_history IS 'Tracks all notifications sent to users with delivery status and read receipts';
COMMENT ON TABLE digest_queue IS 'Queue for scheduled digest emails with retry logic and status tracking';

COMMENT ON COLUMN notification_history.type IS 'Type of notification: response, prompt, delivery, system, digest';
COMMENT ON COLUMN notification_history.delivery_method IS 'How the notification was delivered: browser, email, digest';
COMMENT ON COLUMN notification_history.metadata IS 'Additional notification data like update_id, response_id, etc.';

COMMENT ON COLUMN digest_queue.content IS 'JSONB containing digest content, user preferences, and metadata';
COMMENT ON COLUMN digest_queue.retry_count IS 'Number of delivery attempts for failed digests';

COMMENT ON FUNCTION get_notification_preferences(UUID) IS 'Returns merged notification preferences with defaults for a user';
COMMENT ON FUNCTION is_in_quiet_hours(UUID, TIMESTAMP WITH TIME ZONE) IS 'Checks if a user is currently in their configured quiet hours';
COMMENT ON FUNCTION schedule_digest_for_user(UUID, VARCHAR, TIMESTAMP WITH TIME ZONE) IS 'Schedules a digest notification for a user';
COMMENT ON FUNCTION cleanup_old_notifications(INTEGER) IS 'Removes notification history older than specified days (default 90)';

-- =============================================================================
-- GRANT PERMISSIONS
-- =============================================================================

-- Grant appropriate permissions for the notification system
GRANT SELECT, INSERT, UPDATE ON notification_history TO authenticated;
GRANT SELECT ON digest_queue TO authenticated;
GRANT EXECUTE ON FUNCTION get_notification_preferences(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION is_in_quiet_hours(UUID, TIMESTAMP WITH TIME ZONE) TO authenticated;