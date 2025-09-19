# Email Distribution Testing Guide

Complete step-by-step instructions for testing the CRO-24 Email Distribution System.

## Prerequisites

1. **Environment Setup**
   ```bash
   # Install required dependencies
   npm install

   # Start Supabase locally
   supabase start

   # Deploy functions locally
   supabase functions serve
   ```

2. **Environment Variables**
   Create `.env.local` with:
   ```bash
   SENDGRID_API_KEY=your_actual_api_key
   SENDGRID_FROM_EMAIL=noreply@yourdomain.com
   SENDGRID_FROM_NAME=Tribe
   REPLY_TO_DOMAIN=yourdomain.com
   NEXT_PUBLIC_SITE_URL=http://localhost:3000
   ```

## Phase 1: SendGrid API Testing

### Step 1: Get SendGrid API Key
1. Go to [SendGrid Dashboard](https://app.sendgrid.com/)
2. Navigate to Settings → API Keys
3. Create new API key with "Mail Send" permissions
4. Copy the key and add to your `.env.local`

### Step 2: Test SendGrid Connection
```bash
# Replace YOUR_API_KEY with your actual API key
# Replace test@example.com with your email
curl -X POST "https://api.sendgrid.com/v3/mail/send" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "personalizations": [{"to": [{"email": "test@example.com"}]}],
    "from": {"email": "noreply@yourdomain.com"},
    "subject": "SendGrid Connection Test",
    "content": [{"type": "text/plain", "value": "If you receive this, SendGrid is working!"}]
  }'
```

**Expected Response:**
- Status 202 (Accepted)
- Response body should be empty
- Check your email for the test message

### Step 3: Verify Domain Authentication (Optional but Recommended)
1. In SendGrid Dashboard → Settings → Sender Authentication
2. Authenticate your domain to improve deliverability
3. Set up SPF, DKIM, and DMARC records

## Phase 2: Local Edge Function Testing

### Step 1: Start Supabase Services
```bash
# Start all Supabase services
supabase start

# In another terminal, serve functions
supabase functions serve --env-file .env.local
```

### Step 2: Get Test Data
First, you need valid UUIDs from your database:

```bash
# Get your anon key
supabase status

# Connect to your local DB to get test data
psql postgresql://postgres:postgres@localhost:54322/postgres

# Get sample update and recipient IDs
SELECT id, content FROM updates LIMIT 1;
SELECT id, name, email FROM recipients WHERE email IS NOT NULL LIMIT 2;
```

### Step 3: Test Edge Function
```bash
# Replace with your actual anon key and UUIDs
curl -X POST 'http://localhost:54321/functions/v1/distribute-email' \
  -H 'Authorization: Bearer your-anon-key-here' \
  -H 'Content-Type: application/json' \
  -d '{
    "update_id": "your-update-uuid-here",
    "recipient_ids": ["recipient-uuid-1", "recipient-uuid-2"]
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "total_recipients": 2,
  "successful_sends": 2,
  "results": [
    {"success": true, "recipient_id": "...", "job_id": "..."},
    {"success": true, "recipient_id": "...", "job_id": "..."}
  ]
}
```

## Phase 3: Email Template Testing

### Step 1: Test HTML Rendering
Use our built-in template tester:

```bash
# Run the template test script
node testing/test-email-templates.js
```

This will generate test emails and save them as HTML files you can open in browsers.

### Step 2: Cross-Client Testing
1. **Gmail**: Forward test email to Gmail account
2. **Outlook**: Forward to Outlook.com account
3. **Apple Mail**: Forward to iCloud account
4. **Mobile**: Check on iPhone/Android mail apps

### Step 3: Responsive Design Testing
1. Open generated HTML files in browser
2. Use browser dev tools to test different screen sizes:
   - Desktop: 1200px+
   - Tablet: 768px - 1199px
   - Mobile: 320px - 767px

### Step 4: Image Loading Test
1. Check that all images load correctly
2. Verify alt text for accessibility
3. Test with images disabled

### Step 5: Text-Only Fallback
Most email clients automatically generate this, but you can test:
1. In Gmail: View → Show original → View source
2. Look for the `text/plain` content section

## Phase 4: Spam Score Testing

### Step 1: Use Mail Tester
1. Go to [Mail-Tester.com](https://www.mail-tester.com/)
2. Copy the test email address provided
3. Send a test email to that address using your system
4. Check the spam score (aim for 8+/10)

### Step 2: Common Spam Triggers to Check
- Subject line doesn't contain excessive caps or exclamation marks
- HTML is well-formed and not overly promotional
- Images have proper alt tags
- Sender domain is authenticated
- No suspicious links or content

## Phase 5: Webhook Testing

### Step 1: Test Webhook Endpoint
```bash
# Test the webhook handler
curl -X POST 'http://localhost:54321/functions/v1/sendgrid-webhook' \
  -H 'Content-Type: application/json' \
  -d '[{
    "event": "delivered",
    "timestamp": 1643723400,
    "sg_message_id": "test-message-id",
    "job_id": "your-job-id-here"
  }]'
```

### Step 2: Set Up SendGrid Webhooks
1. In SendGrid Dashboard → Settings → Webhooks
2. Create Event Webhook pointing to your deployed webhook URL
3. Select events: Delivered, Bounced, Blocked, Dropped
4. Test the webhook connection

## Phase 6: End-to-End Testing

### Step 1: Create Test Update
1. Log into your app
2. Create a new update with photos
3. Select recipients

### Step 2: Send and Monitor
1. Send the update
2. Monitor delivery status in real-time
3. Check recipient emails
4. Verify webhook updates in database

### Step 3: Verify Database Updates
```sql
-- Check delivery jobs
SELECT * FROM delivery_jobs ORDER BY created_at DESC LIMIT 10;

-- Check update status
SELECT id, distribution_status, sent_at FROM updates WHERE sent_at IS NOT NULL;
```

## Troubleshooting Common Issues

### SendGrid API Errors
- **401 Unauthorized**: Check API key is correct and has permissions
- **403 Forbidden**: Verify sender email is authenticated
- **429 Rate Limited**: You've hit rate limits, wait and retry

### Edge Function Errors
- **500 Internal Server Error**: Check function logs with `supabase functions logs`
- **Timeout**: Function taking too long, check database queries
- **CORS Issues**: Verify CORS headers in function

### Email Delivery Issues
- **High Bounce Rate**: Check email addresses are valid
- **Low Open Rate**: Improve subject lines and sender reputation
- **Spam Folder**: Authenticate domain and improve content

## Performance Benchmarks

**Target Metrics:**
- Email send success rate: >98%
- Edge function response time: <2 seconds
- Webhook processing time: <500ms
- Email delivery time: <30 seconds
- Spam score: >8/10

## Monitoring Setup

### Step 1: Set Up Logging
```bash
# Monitor function logs
supabase functions logs --follow

# Monitor database activity
tail -f /tmp/supabase/logs/db.log
```

### Step 2: Create Alerts
Set up monitoring for:
- High error rates (>5%)
- Slow response times (>3s)
- Failed deliveries (>2%)
- Webhook failures

## Security Testing

### Step 1: Test Authentication
```bash
# Test without auth (should fail)
curl -X POST 'http://localhost:54321/functions/v1/distribute-email' \
  -H 'Content-Type: application/json' \
  -d '{"update_id": "test"}'
```

### Step 2: Test Input Validation
```bash
# Test with invalid data (should fail gracefully)
curl -X POST 'http://localhost:54321/functions/v1/distribute-email' \
  -H 'Authorization: Bearer your-anon-key' \
  -H 'Content-Type: application/json' \
  -d '{"invalid": "data"}'
```

### Step 3: Test SQL Injection Protection
Try sending malicious UUIDs and verify they're rejected safely.

## Next Steps After Testing

1. **Deploy to Production**
   ```bash
   supabase functions deploy distribute-email
   supabase functions deploy sendgrid-webhook
   ```

2. **Update Environment Variables**
   Set production values in Supabase dashboard

3. **Configure Production Webhooks**
   Point SendGrid webhooks to production URLs

4. **Monitor Performance**
   Set up ongoing monitoring and alerting

---

## Quick Test Checklist

- [ ] SendGrid API connection works
- [ ] Edge function deploys successfully
- [ ] Test emails are received
- [ ] Email templates render correctly
- [ ] Webhooks update delivery status
- [ ] Mobile email apps display correctly
- [ ] Spam score is acceptable (>8/10)
- [ ] Error handling works properly
- [ ] Authentication is enforced
- [ ] Performance meets benchmarks