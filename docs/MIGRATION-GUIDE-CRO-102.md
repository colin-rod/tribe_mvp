# Migration Guide: CRO-102 Background Job Processing System

## Overview

This guide walks you through deploying the background job processing system to your Supabase database.

## Prerequisites

- Supabase project with existing Tribe MVP schema
- Access to Supabase SQL Editor
- Redis instance provisioned (Upstash recommended)

## Migration Steps

### Step 1: Run Database Migration

**Via Supabase SQL Editor (Recommended):**

1. Open your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Click **New Query**
4. Copy the contents of: `supabase/migrations/20251010000002_notification_system_complete.sql`
5. Paste into the SQL Editor
6. Click **Run** (or press Cmd/Ctrl + Enter)

**Expected Output:**
```
NOTICE:  ✓ All notification system tables created successfully
NOTICE:  ✓ Foreign key correctly references memories table
NOTICE:  ✓ Notification system migration complete!
NOTICE:  Next step: Start the notification worker with: npm run worker
```

**What This Migration Does:**
- ✅ Creates `notification_jobs` table (job queue)
- ✅ Creates `notification_delivery_logs` table (audit log)
- ✅ Creates `digest_schedules` table (recurring digest config)
- ✅ Creates `notification_preferences_cache` table (performance cache)
- ✅ Creates database functions (`enqueue_notification_job`, `create_digest_jobs`, `cleanup_notification_data`)
- ✅ Sets up indexes for query performance
- ✅ Configures Row Level Security policies
- ✅ Verifies everything is correct

### Step 2: Configure Environment Variables

Add Redis URL to your environment:

**Local Development (.env.local):**
```bash
REDIS_URL=redis://localhost:6379
```

**Production (Vercel/Railway/etc.):**
```bash
REDIS_URL=redis://default:password@region.upstash.io:6379
```

**Get Free Redis from Upstash:**
1. Sign up at https://upstash.com
2. Create new Redis database
3. Copy connection string
4. Add to environment variables

### Step 3: Deploy Application

**Option A: Vercel**
```bash
# Add environment variable
vercel env add REDIS_URL production

# Deploy
vercel --prod
```

**Option B: Manual Deployment**
```bash
# Build
npm run build

# Set environment
export REDIS_URL="redis://..."

# Start app
npm start
```

### Step 4: Start Notification Worker

The notification worker processes background jobs. It must run alongside your main application.

**Development (Local):**
```bash
# Terminal 1: Next.js app
npm run dev

# Terminal 2: Notification worker
npm run worker:dev
```

**Production Option 1: PM2 (Recommended)**
```bash
# Install PM2
npm install -g pm2

# Start app
pm2 start npm --name "tribe-app" -- start

# Start worker
pm2 start npm --name "tribe-worker" -- run worker

# Save configuration
pm2 save

# Setup auto-restart on reboot
pm2 startup
```

**Production Option 2: Docker**
```dockerfile
# Dockerfile
FROM node:18-alpine

WORKDIR /app
COPY package*.json ./
RUN npm ci --production
COPY . .

# Build Next.js
RUN npm run build

# Expose ports
EXPOSE 3000

# Start both app and worker
CMD ["sh", "-c", "npm start & npm run worker"]
```

**Production Option 3: Separate Processes**
```bash
# Process 1: Next.js (port 3000)
npm start

# Process 2: Worker
npm run worker
```

### Step 5: Verify Setup

**Check Health:**
```bash
curl https://your-app.vercel.app/api/health

# Should return:
{
  "status": "healthy",
  "redis": {
    "configured": true,
    "connected": true,
    "circuitBreaker": "closed"
  }
}
```

**Check Redis-Specific Health:**
```bash
curl https://your-app.vercel.app/api/health/redis

# Should return queue metrics
```

**Create Test Job:**
```sql
-- Via Supabase SQL Editor
SELECT enqueue_notification_job(
  '<recipient-uuid>'::uuid,
  '<group-uuid>'::uuid,
  '<memory-uuid>'::uuid,
  'immediate',
  'normal',
  'email',
  '{"subject": "Test Notification", "body": "Hello from the notification system!"}'::jsonb,
  0
);
```

**Check Worker Logs:**
```bash
# If using PM2
pm2 logs tribe-worker

# Should see:
# "Found 1 pending notification jobs"
# "Queued notification job: {jobId}"
# "Processing notification job: {jobId}"
# "Notification job completed: {jobId}"
```

**Verify in Database:**
```sql
-- Check job status
SELECT id, status, delivery_method, created_at, processed_at
FROM notification_jobs
ORDER BY created_at DESC
LIMIT 10;

-- Check delivery logs
SELECT id, status, delivery_method, error_message, created_at
FROM notification_delivery_logs
ORDER BY created_at DESC
LIMIT 10;
```

## Troubleshooting

### Migration Fails

**Error: "relation XYZ does not exist"**
- Solution: Ensure all previous migrations have run first
- Run migrations in order from oldest to newest

**Error: "permission denied"**
- Solution: Use service role key, not anon key
- Check RLS policies aren't blocking

### Worker Won't Start

**Error: "Redis URL not configured"**
```bash
# Check environment variable is set
echo $REDIS_URL

# If missing, add to .env.local or environment
```

**Error: "Supabase configuration missing"**
```bash
# Check these are set:
echo $SUPABASE_URL
echo $SUPABASE_SERVICE_ROLE_KEY
```

**Worker starts but no jobs processed:**
- Check worker logs for errors
- Verify Redis connection: `curl http://localhost:3000/api/health/redis`
- Check if jobs exist: `SELECT COUNT(*) FROM notification_jobs WHERE status = 'pending';`

### Jobs Not Sending

**Jobs stuck in "pending":**
- Ensure worker is running: `pm2 list` or check process
- Check worker logs for errors
- Verify `scheduled_for` is in the past

**Jobs fail with error:**
- Check `notification_delivery_logs` for error messages
- Verify SendGrid API key is configured
- Check recipient has valid email address

**No jobs created:**
- Check if `enqueue_notification_job()` returns a UUID
- Verify recipient, group, and memory IDs are valid
- Check RLS policies allow insertion

## Rollback Plan

If you need to rollback this migration:

**Option 1: Drop Tables (Nuclear)**
```sql
-- WARNING: This will delete all notification jobs and logs
DROP TABLE IF EXISTS notification_preferences_cache CASCADE;
DROP TABLE IF EXISTS digest_schedules CASCADE;
DROP TABLE IF EXISTS notification_delivery_logs CASCADE;
DROP TABLE IF EXISTS notification_jobs CASCADE;

DROP FUNCTION IF EXISTS enqueue_notification_job CASCADE;
DROP FUNCTION IF EXISTS create_digest_jobs CASCADE;
DROP FUNCTION IF EXISTS cleanup_notification_data CASCADE;
```

**Option 2: Disable Worker**
```bash
# Stop worker process
pm2 stop tribe-worker

# Or if running manually
# Press Ctrl+C in worker terminal
```

Jobs will remain in database but won't be processed. You can restart the worker later without data loss.

## Monitoring

**Set up alerts for:**
- Worker process down
- Redis connection failures
- High number of failed jobs (>100)
- Large job backlog (>1000 pending)
- Circuit breaker open

**Useful Queries:**
```sql
-- Jobs by status (last 24 hours)
SELECT status, COUNT(*) as count
FROM notification_jobs
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY status;

-- Failed jobs with errors
SELECT id, recipient_id, failure_reason, created_at
FROM notification_jobs
WHERE status = 'failed'
ORDER BY created_at DESC
LIMIT 20;

-- Delivery success rate
SELECT
  COUNT(*) FILTER (WHERE status = 'delivered') * 100.0 / COUNT(*) as success_rate
FROM notification_delivery_logs
WHERE created_at > NOW() - INTERVAL '24 hours';

-- Average processing time
SELECT
  AVG(EXTRACT(EPOCH FROM (processed_at - created_at))) as avg_seconds
FROM notification_jobs
WHERE processed_at IS NOT NULL
AND created_at > NOW() - INTERVAL '24 hours';
```

## Next Steps

After successful migration:

1. **Test end-to-end flow:**
   - Create memory in UI
   - Approve for sending
   - Verify notification job created
   - Check email received

2. **Set up monitoring:**
   - Configure alerts for worker failures
   - Monitor job queue size
   - Track delivery success rate

3. **Optional: Configure recurring digests** (Phase 4)
   - Create digest schedules for recipients
   - Set up Supabase cron job
   - Test digest generation

## Support

- **Documentation**: `docs/CRO-102-Background-Job-Processing.md`
- **Linear Issue**: [CRO-102](https://linear.app/colin-rod/issue/CRO-102)
- **Worker Code**: `src/workers/notificationWorker.ts`
- **Migration File**: `supabase/migrations/20251010000002_notification_system_complete.sql`

---

**Last Updated**: 2025-10-10
**Version**: 1.0
