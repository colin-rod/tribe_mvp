-- Supabase Cron Jobs for Template-Based AI Prompt System
-- Run this SQL in your Supabase SQL Editor to set up automated prompt generation

-- Enable the pg_cron extension (if not already enabled)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- =============================================================================
-- DAILY PROMPT GENERATION JOB
-- =============================================================================

-- Schedule daily prompt generation at 9:00 AM UTC
-- This will generate personalized prompts for active users
SELECT cron.schedule(
    'generate-daily-prompts',
    '0 9 * * *', -- Daily at 9:00 AM UTC
    $$
    SELECT net.http_post(
        url := 'https://advbcfkisejskhskrmqw.supabase.co/functions/v1/generate-prompts',
        body := '{"force_generation": false}'::jsonb,
        headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
        )
    );
    $$
);

-- =============================================================================
-- WEEKLY TEMPLATE EFFECTIVENESS RECALCULATION
-- =============================================================================

-- Recalculate template effectiveness scores every Sunday at 2:00 AM UTC
SELECT cron.schedule(
    'recalculate-template-effectiveness',
    '0 2 * * 0', -- Every Sunday at 2:00 AM UTC
    $$
    SELECT recalculate_template_effectiveness();
    $$
);

-- =============================================================================
-- MONTHLY ANALYTICS CLEANUP
-- =============================================================================

-- Clean up old analytics data (older than 6 months) on the 1st of each month
SELECT cron.schedule(
    'cleanup-old-analytics',
    '0 3 1 * *', -- 1st of each month at 3:00 AM UTC
    $$
    DELETE FROM template_analytics
    WHERE created_at < NOW() - INTERVAL '6 months';
    $$
);

-- =============================================================================
-- HOURLY SYSTEM HEALTH CHECK
-- =============================================================================

-- Basic health check to ensure the system is operational
SELECT cron.schedule(
    'system-health-check',
    '0 * * * *', -- Every hour
    $$
    INSERT INTO notification_history (
        user_id,
        type,
        title,
        content,
        delivery_method,
        delivery_status
    )
    SELECT
        (SELECT id FROM profiles WHERE email LIKE '%@tribe-mvp.com' LIMIT 1),
        'system',
        'Template System Health Check',
        jsonb_build_object(
            'timestamp', NOW(),
            'total_templates', (SELECT COUNT(*) FROM prompt_templates),
            'total_usage_today', (
                SELECT COUNT(*) FROM template_analytics
                WHERE created_at >= CURRENT_DATE
            ),
            'system_status', 'operational'
        )::text,
        'digest',
        'sent'
    WHERE (
        SELECT COUNT(*) FROM notification_history
        WHERE type = 'system'
        AND created_at >= NOW() - INTERVAL '1 hour'
    ) = 0; -- Only if no health check in the last hour
    $$
);

-- =============================================================================
-- VIEW CURRENT CRON JOBS
-- =============================================================================

-- Query to see all scheduled cron jobs
SELECT
    jobid,
    schedule,
    command,
    nodename,
    nodeport,
    database,
    username,
    active,
    jobname
FROM cron.job
WHERE jobname IN (
    'generate-daily-prompts',
    'recalculate-template-effectiveness',
    'cleanup-old-analytics',
    'system-health-check'
)
ORDER BY jobname;

-- =============================================================================
-- CRON JOB MANAGEMENT FUNCTIONS
-- =============================================================================

-- Function to disable prompt generation (for maintenance)
CREATE OR REPLACE FUNCTION disable_prompt_generation()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    PERFORM cron.unschedule('generate-daily-prompts');

    INSERT INTO notification_history (
        user_id,
        type,
        title,
        content,
        delivery_method,
        delivery_status
    )
    SELECT
        (SELECT id FROM profiles WHERE email LIKE '%@tribe-mvp.com' LIMIT 1),
        'system',
        'Prompt Generation Disabled',
        'Daily prompt generation has been disabled for maintenance.',
        'digest',
        'sent';
END;
$$;

-- Function to re-enable prompt generation
CREATE OR REPLACE FUNCTION enable_prompt_generation()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Re-schedule the daily prompt generation
    PERFORM cron.schedule(
        'generate-daily-prompts',
        '0 9 * * *',
        $$
        SELECT net.http_post(
            url := 'https://advbcfkisejskhskrmqw.supabase.co/functions/v1/generate-prompts',
            body := '{"force_generation": false}'::jsonb,
            headers := jsonb_build_object(
                'Content-Type', 'application/json',
                'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
            )
        );
        $$
    );

    INSERT INTO notification_history (
        user_id,
        type,
        title,
        content,
        delivery_method,
        delivery_status
    )
    SELECT
        (SELECT id FROM profiles WHERE email LIKE '%@tribe-mvp.com' LIMIT 1),
        'system',
        'Prompt Generation Enabled',
        'Daily prompt generation has been re-enabled.',
        'digest',
        'sent';
END;
$$;

-- Function to trigger immediate prompt generation (for testing)
CREATE OR REPLACE FUNCTION trigger_prompt_generation()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result jsonb;
BEGIN
    SELECT net.http_post(
        url := 'https://advbcfkisejskhskrmqw.supabase.co/functions/v1/generate-prompts',
        body := '{"force_generation": true}'::jsonb,
        headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
        )
    ) INTO result;

    RETURN result;
END;
$$;

-- =============================================================================
-- CONFIGURATION SETTINGS
-- =============================================================================

-- Set the service role key for HTTP requests (run this with your actual key)
-- ALTER DATABASE postgres SET app.settings.service_role_key = 'your-service-role-key-here';

-- =============================================================================
-- MONITORING QUERIES
-- =============================================================================

-- View cron job execution history
CREATE OR REPLACE VIEW cron_job_history AS
SELECT
    runid,
    jobid,
    database,
    username,
    command,
    status,
    return_message,
    start_time,
    end_time,
    end_time - start_time as duration
FROM cron.job_run_details
ORDER BY start_time DESC;

-- View recent template system activity
CREATE OR REPLACE VIEW template_system_activity AS
SELECT
    'Prompt Generated' as activity_type,
    created_at as timestamp,
    jsonb_build_object(
        'prompt_id', id,
        'template_id', template_id,
        'prompt_type', prompt_type,
        'child_id', child_id
    ) as details
FROM ai_prompts
WHERE created_at >= CURRENT_DATE - INTERVAL '7 days'

UNION ALL

SELECT
    'Template Used' as activity_type,
    created_at as timestamp,
    jsonb_build_object(
        'template_id', template_id,
        'action_type', action_type,
        'user_id', user_id
    ) as details
FROM template_analytics
WHERE created_at >= CURRENT_DATE - INTERVAL '7 days'

ORDER BY timestamp DESC
LIMIT 100;

-- =============================================================================
-- COMMENTS AND DOCUMENTATION
-- =============================================================================

COMMENT ON FUNCTION disable_prompt_generation() IS 'Temporarily disable automated prompt generation for maintenance';
COMMENT ON FUNCTION enable_prompt_generation() IS 'Re-enable automated prompt generation after maintenance';
COMMENT ON FUNCTION trigger_prompt_generation() IS 'Manually trigger prompt generation for testing purposes';

-- =============================================================================
-- SUCCESS MESSAGE
-- =============================================================================

DO $$
BEGIN
    RAISE NOTICE 'Template System Cron Jobs Setup Complete!';
    RAISE NOTICE '=============================================';
    RAISE NOTICE 'Scheduled Jobs:';
    RAISE NOTICE '• Daily Prompt Generation: 9:00 AM UTC';
    RAISE NOTICE '• Weekly Effectiveness Recalculation: Sundays 2:00 AM UTC';
    RAISE NOTICE '• Monthly Analytics Cleanup: 1st of month 3:00 AM UTC';
    RAISE NOTICE '• Hourly Health Checks';
    RAISE NOTICE '';
    RAISE NOTICE 'Management Functions:';
    RAISE NOTICE '• disable_prompt_generation() - Stop automation';
    RAISE NOTICE '• enable_prompt_generation() - Restart automation';
    RAISE NOTICE '• trigger_prompt_generation() - Manual trigger';
    RAISE NOTICE '';
    RAISE NOTICE 'Monitoring:';
    RAISE NOTICE '• Query cron_job_history view for execution logs';
    RAISE NOTICE '• Query template_system_activity view for system activity';
    RAISE NOTICE '';
    RAISE NOTICE 'Don''t forget to set your service role key:';
    RAISE NOTICE 'ALTER DATABASE postgres SET app.settings.service_role_key = ''your-key'';';
END $$;