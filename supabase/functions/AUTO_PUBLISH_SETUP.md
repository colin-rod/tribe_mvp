# Auto-Publish System Setup Guide

This guide covers the setup and deployment of the auto-publish system for Memory Book summaries.

## Overview

The auto-publish system consists of:

1. **Database Helper Functions** - Already created in migration `20251007000001_memory_book_transformation.sql`
   - `get_summaries_for_auto_publish()` - Finds summaries past their deadline
   - `get_summaries_needing_reminders()` - Finds summaries needing 48hr/24hr reminders

2. **Edge Functions** - Serverless functions that run on Supabase
   - `auto-publish-summaries` - Auto-approves and sends summaries past deadline
   - `send-summary-reminders` - Sends reminder notifications to parents

3. **Cron Jobs** - Scheduled execution of Edge Functions
   - Auto-publish runs every 15 minutes
   - Reminders run every hour

## Prerequisites

- Supabase CLI installed (`npm install -g supabase`)
- Supabase project created and linked
- Environment variables configured

## Deployment Steps

### 1. Deploy Edge Functions

Deploy both Edge Functions to your Supabase project:

```bash
# Deploy auto-publish function
supabase functions deploy auto-publish-summaries

# Deploy reminders function
supabase functions deploy send-summary-reminders
```

### 2. Set Environment Variables

The Edge Functions require these environment variables in your Supabase project:

```bash
# Set the service role key (for admin operations)
supabase secrets set SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"

# Set the app URL (for email links)
supabase secrets set APP_URL="https://yourdomain.com"
```

You can find your service role key in:
- Supabase Dashboard → Settings → API → service_role key

### 3. Enable Cron Jobs

Supabase cron jobs are configured in `_cron/cron.yaml`. To enable them:

**Option A: Via Supabase Dashboard**
1. Go to Supabase Dashboard → Database → Cron Jobs
2. Create a new cron job:
   - **Auto-Publish**: Schedule `*/15 * * * *` calling `auto-publish-summaries`
   - **Reminders**: Schedule `0 * * * *` calling `send-summary-reminders`

**Option B: Via pg_cron (Direct SQL)**

Execute this SQL in your Supabase SQL Editor:

```sql
-- Enable pg_cron extension
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Grant permissions
GRANT USAGE ON SCHEMA cron TO postgres;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA cron TO postgres;

-- Schedule auto-publish (every 15 minutes)
SELECT cron.schedule(
  'auto-publish-summaries',
  '*/15 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/auto-publish-summaries',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key'),
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb
  ) AS request_id;
  $$
);

-- Schedule reminders (every hour)
SELECT cron.schedule(
  'send-summary-reminders',
  '0 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/send-summary-reminders',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key'),
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb
  ) AS request_id;
  $$
);
```

**Important**: Replace `YOUR_PROJECT_REF` with your actual Supabase project reference.

### 4. Configure Service Role Key in Database

Store the service role key as a database setting (for cron jobs):

```sql
-- Store service role key
ALTER DATABASE postgres SET app.settings.service_role_key = 'your-service-role-key';
```

### 5. Test the Functions

You can manually test the Edge Functions before enabling cron:

```bash
# Test auto-publish
curl -X POST \
  https://YOUR_PROJECT_REF.supabase.co/functions/v1/auto-publish-summaries \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json"

# Test reminders
curl -X POST \
  https://YOUR_PROJECT_REF.supabase.co/functions/v1/send-summary-reminders \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json"
```

## How It Works

### Auto-Publish Flow

1. **Cron triggers** `auto-publish-summaries` every 15 minutes
2. **Function queries** `get_summaries_for_auto_publish()` to find summaries past deadline
3. **For each summary**:
   - Updates status to `'approved'`
   - Clears `is_new` badge from all memories
   - Calls `send-summary` Edge Function to send emails
4. **Returns** summary of actions taken (success/failure counts)

### Reminder Flow

1. **Cron triggers** `send-summary-reminders` every hour
2. **Function queries** `get_summaries_needing_reminders()` to find summaries approaching deadline
3. **For each summary**:
   - Calculates hours remaining until deadline
   - Determines reminder type (48hr or 24hr) based on `reminder_count`
   - Checks parent notification preferences
   - Sends in-app notification
   - Sends email notification (if enabled)
   - Updates `reminder_count` and `last_reminder_sent_at`
4. **Returns** summary of reminders sent

### Reminder Schedule

- **48-hour reminder**: Sent when `reminder_count = 0` and deadline is within 48-72 hours
- **24-hour reminder**: Sent when `reminder_count = 1` and deadline is within 24-48 hours
- **Max reminders**: 2 per summary (no more reminders after 24hr reminder sent)

## Monitoring

### View Cron Job Status

```sql
-- List all cron jobs
SELECT * FROM cron.job;

-- View cron job execution history
SELECT * FROM cron.job_run_details
ORDER BY start_time DESC
LIMIT 20;
```

### View Edge Function Logs

In Supabase Dashboard:
1. Go to Functions → Select function → Logs
2. Monitor execution, errors, and performance

### Check Auto-Publish Status

```sql
-- Summaries awaiting auto-publish
SELECT * FROM get_summaries_for_auto_publish();

-- Summaries needing reminders
SELECT * FROM get_summaries_needing_reminders();

-- Recent auto-published summaries
SELECT id, title, status, compiled_at, approved_at, auto_publish_hours
FROM summaries
WHERE status = 'approved'
  AND approved_at > compiled_at  -- Auto-approved
ORDER BY approved_at DESC
LIMIT 10;
```

## Troubleshooting

### Function Not Running

1. Check cron job is scheduled: `SELECT * FROM cron.job WHERE jobname LIKE '%publish%'`
2. Check function logs in Supabase Dashboard
3. Verify environment variables are set: `supabase secrets list`
4. Test function manually using curl command above

### Reminders Not Sending

1. Check parent notification preferences:
   ```sql
   SELECT id, email, notification_settings
   FROM profiles
   WHERE id = 'parent-id';
   ```
2. Verify email function is working: `supabase functions logs send-email`
3. Check reminder tracking:
   ```sql
   SELECT id, title, reminder_count, last_reminder_sent_at
   FROM summaries
   WHERE status = 'compiled'
   ORDER BY compiled_at DESC;
   ```

### Summaries Not Auto-Publishing

1. Verify database helper function:
   ```sql
   SELECT * FROM get_summaries_for_auto_publish();
   ```
2. Check summary status and timestamps:
   ```sql
   SELECT id, title, status, compiled_at, auto_publish_hours,
          EXTRACT(EPOCH FROM (NOW() - compiled_at)) / 3600 AS hours_since_compiled
   FROM summaries
   WHERE status = 'compiled'
   ORDER BY compiled_at DESC;
   ```
3. Ensure `send-summary` Edge Function exists and works

## Customization

### Change Auto-Publish Deadline (Per User)

Users can customize their auto-publish window:

```sql
-- Update default auto-publish hours for a user
UPDATE profiles
SET preferences = jsonb_set(
  COALESCE(preferences, '{}'::jsonb),
  '{auto_publish_hours}',
  '72'::jsonb  -- 3 days instead of default 7 days
)
WHERE id = 'user-id';
```

### Change Reminder Schedule

Modify the cron schedule in `_cron/cron.yaml` or update the cron job:

```sql
-- Change reminders to run every 30 minutes
SELECT cron.alter_job(
  job_id := (SELECT jobid FROM cron.job WHERE jobname = 'send-summary-reminders'),
  schedule := '*/30 * * * *'
);
```

## Disabling Auto-Publish

### For All Users (Emergency)

```sql
-- Unschedule cron jobs
SELECT cron.unschedule('auto-publish-summaries');
SELECT cron.unschedule('send-summary-reminders');
```

### For Specific User

```sql
-- Set very long auto-publish window (effectively disables)
UPDATE profiles
SET preferences = jsonb_set(
  COALESCE(preferences, '{}'::jsonb),
  '{auto_publish_hours}',
  '999999'::jsonb
)
WHERE id = 'user-id';
```

## Security Notes

- Edge Functions use `SUPABASE_SERVICE_ROLE_KEY` for admin operations
- RLS policies still apply for user-facing queries
- Cron jobs run with database superuser privileges
- Always validate data before sending emails
- Rate limit email sending to prevent abuse

## Next Steps

After deploying the auto-publish system:

1. Test with a real summary (set `auto_publish_hours` to 1 for quick testing)
2. Monitor logs for first few days
3. Gather user feedback on reminder timing
4. Consider adding:
   - Snooze functionality (extend deadline by X hours)
   - Custom reminder messages per user
   - SMS reminders (in addition to email)
   - Slack/Discord webhook notifications
