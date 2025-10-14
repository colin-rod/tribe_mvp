# Email Webhook System Testing Guide

This comprehensive guide will help you test all aspects of the email webhook system, including happy paths, edge cases, and error conditions.

## Prerequisites

Before testing, ensure you have:
- [ ] Supabase project deployed with functions (`supabase functions deploy email-webhook`)
- [ ] Test data in your production database (profiles, children, recipients)
- [ ] SendGrid configuration (for production testing)

## Test Environment Setup

### 1. Production Webhook URL
```
Production Webhook: https://advbcfkisejskhskrmqw.supabase.co/functions/v1/email-webhook
```

### 2. Create Test Data in Production Database

Run this SQL in your Supabase SQL Editor:

```sql
-- Test user should already exist in auth.users with ID: e2c5d9f4-32a9-4013-bdec-d65aaf1e6bf2
-- If not, create user via Supabase Auth first

-- Create test child
INSERT INTO children (id, parent_id, name, birth_date)
VALUES ('550e8400-e29b-41d4-a716-446655440002', 'e2c5d9f4-32a9-4013-bdec-d65aaf1e6bf2', 'Emma', '2020-01-15')
ON CONFLICT (id) DO NOTHING;

-- Create test recipient
INSERT INTO recipients (id, parent_id, email, name, relationship, preference_token, is_active)
VALUES ('550e8400-e29b-41d4-a716-446655440003', 'e2c5d9f4-32a9-4013-bdec-d65aaf1e6bf2', 'grandma@example.com', 'Grandma', 'grandparent', gen_random_uuid(), true)
ON CONFLICT (id) DO NOTHING;

-- Create test update for response testing
INSERT INTO updates (id, parent_id, child_id, content, distribution_status)
VALUES ('550e8400-e29b-41d4-a716-446655440000', 'e2c5d9f4-32a9-4013-bdec-d65aaf1e6bf2', '550e8400-e29b-41d4-a716-446655440002', 'Test update for responses', 'sent')
ON CONFLICT (id) DO NOTHING;
```

## Testing Framework

### 1. Basic Connectivity Test
```bash
# Test webhook endpoint is accessible
curl -X OPTIONS 'https://advbcfkisejskhskrmqw.supabase.co/functions/v1/email-webhook' -v

# Should return 200 with CORS headers
```

### 2. Quick Test
```bash
# Test basic functionality
curl -X POST 'https://advbcfkisejskhskrmqw.supabase.co/functions/v1/email-webhook' \
  -H 'Content-Type: application/x-www-form-urlencoded' \
  -d 'to=memory@tribeupdate.com' \
  -d 'from=parent@example.com' \
  -d 'subject=Emma took her first steps!' \
  -d 'text=She walked from the couch to the coffee table! So proud!' \
  -d 'SPF=pass'

# Expected: Success with new update created
```

## Manual Test Cases

### Test Category 1: Email-to-Memory System

#### Test 1.1: Happy Path - Basic Memory Email
```bash
curl -X POST 'https://advbcfkisejskhskrmqw.supabase.co/functions/v1/email-webhook' \
  -H 'Content-Type: application/x-www-form-urlencoded' \
  -d 'to=memory@tribeupdate.com' \
  -d 'from=parent@example.com' \
  -d 'subject=Emma took her first steps!' \
  -d 'text=She walked from the couch to the coffee table! So proud!' \
  -d 'html=<p>She walked from the couch to the coffee table!</p>' \
  -d 'attachments=0' \
  -d 'envelope={"from":["parent@example.com"],"to":["memory@tribeupdate.com"]}' \
  -d 'SPF=pass'
```

**Expected Result:**
```json
{
  "success": true,
  "type": "memory",
  "entity_id": "new-update-uuid"
}
```

**Verify in Database:**
```sql
SELECT * FROM updates WHERE created_via = 'email' ORDER BY created_at DESC LIMIT 1;
-- Should show new update with content and draft status
```

#### Test 1.2: Memory Email with Child Specification
```bash
curl -X POST 'https://advbcfkisejskhskrmqw.supabase.co/functions/v1/email-webhook' \
  -H 'Content-Type: application/x-www-form-urlencoded' \
  -d 'to=memory@tribeupdate.com' \
  -d 'from=parent@example.com' \
  -d 'subject=Memory for Emma: First day at daycare' \
  -d 'text=Emma had a great first day! She made friends and loved the playground.' \
  -d 'attachments=0' \
  -d 'envelope={"from":["parent@example.com"],"to":["memory@tribeupdate.com"]}' \
  -d 'SPF=pass'
```

**Expected Result:** Success with child correctly identified

#### Test 1.3: Memory Email - Unknown Sender
```bash
curl -X POST 'https://advbcfkisejskhskrmqw.supabase.co/functions/v1/email-webhook' \
  -H 'Content-Type: application/x-www-form-urlencoded' \
  -d 'to=memory@tribeupdate.com' \
  -d 'from=unknown@example.com' \
  -d 'subject=Should not work' \
  -d 'text=This should be rejected' \
  -d 'SPF=pass'
```

**Expected Result:**
```json
{
  "success": false,
  "error": "Unknown sender",
  "type": "memory"
}
```

#### Test 1.4: Memory Email - SPF Failure
```bash
curl -X POST 'https://advbcfkisejskhskrmqw.supabase.co/functions/v1/email-webhook' \
  -H 'Content-Type: application/x-www-form-urlencoded' \
  -d 'to=memory@tribeupdate.com' \
  -d 'from=parent@example.com' \
  -d 'subject=Should fail SPF' \
  -d 'text=This should be rejected due to SPF failure' \
  -d 'SPF=fail'
```

**Expected Result:**
```json
{
  "success": false,
  "error": "Sender authentication failed",
  "type": "memory"
}
```

#### Test 1.5: Memory Email - Empty Content
```bash
curl -X POST 'https://advbcfkisejskhskrmqw.supabase.co/functions/v1/email-webhook' \
  -H 'Content-Type: application/x-www-form-urlencoded' \
  -d 'to=memory@tribeupdate.com' \
  -d 'from=parent@example.com' \
  -d 'subject=' \
  -d 'text=' \
  -d 'SPF=pass'
```

**Expected Result:** Should fail with "No content or media found"

### Test Category 2: Email Response System

#### Test 2.1: Happy Path - Response to Update
```bash
curl -X POST 'https://advbcfkisejskhskrmqw.supabase.co/functions/v1/email-webhook' \
  -H 'Content-Type: application/x-www-form-urlencoded' \
  -d 'to=update-550e8400-e29b-41d4-a716-446655440000@tribeupdate.com' \
  -d 'from=grandma@example.com' \
  -d 'subject=Re: Emma'\''s First Steps' \
  -d 'text=So wonderful! Can'\''t wait to see her walk more!' \
  -d 'html=<p>So wonderful! Can'\''t wait to see her walk more!</p>' \
  -d 'attachments=0' \
  -d 'envelope={"from":["grandma@example.com"],"to":["update-550e8400-e29b-41d4-a716-446655440000@tribeupdate.com"]}' \
  -d 'SPF=pass'
```

**Expected Result:**
```json
{
  "success": true,
  "type": "response",
  "entity_id": "new-response-uuid"
}
```

**Verify in Database:**
```sql
SELECT r.*, rec.name, rec.email
FROM responses r
JOIN recipients rec ON r.recipient_id = rec.id
ORDER BY r.received_at DESC LIMIT 1;
```

#### Test 2.2: Response - Non-existent Update
```bash
curl -X POST 'https://advbcfkisejskhskrmqw.supabase.co/functions/v1/email-webhook' \
  -H 'Content-Type: application/x-www-form-urlencoded' \
  -d 'to=update-99999999-9999-9999-9999-999999999999@tribeupdate.com' \
  -d 'from=grandma@example.com' \
  -d 'subject=Re: Non-existent update' \
  -d 'text=This should fail' \
  -d 'SPF=pass'
```

**Expected Result:**
```json
{
  "success": false,
  "error": "Update not found",
  "type": "response"
}
```

#### Test 2.3: Response - Unknown Recipient
```bash
curl -X POST 'https://advbcfkisejskhskrmqw.supabase.co/functions/v1/email-webhook' \
  -H 'Content-Type: application/x-www-form-urlencoded' \
  -d 'to=update-550e8400-e29b-41d4-a716-446655440000@tribeupdate.com' \
  -d 'from=unknown@example.com' \
  -d 'subject=Re: Should fail' \
  -d 'text=Unknown recipient' \
  -d 'SPF=pass'
```

**Expected Result:**
```json
{
  "success": false,
  "error": "Unknown recipient",
  "type": "response"
}
```

### Test Category 3: Content Processing

#### Test 3.1: Email Content Cleaning
```bash
curl -X POST 'https://advbcfkisejskhskrmqw.supabase.co/functions/v1/email-webhook' \
  -H 'Content-Type: application/x-www-form-urlencoded' \
  -d 'to=memory@tribeupdate.com' \
  -d 'from=parent@example.com' \
  -d 'subject=Content cleaning test' \
  -d 'text=This is the actual content.

--
Sent from my iPhone

On Jan 1, 2024, at 12:00 PM, someone@example.com wrote:
> This is quoted content that should be removed' \
  -d 'SPF=pass'
```

**Expected Result:** Success with cleaned content (signatures and quoted text removed)

**Verify:** Check that the created update only contains "This is the actual content."

#### Test 3.2: HTML Content Processing
```bash
curl -X POST 'https://advbcfkisejskhskrmqw.supabase.co/functions/v1/email-webhook' \
  -H 'Content-Type: application/x-www-form-urlencoded' \
  -d 'to=memory@tribeupdate.com' \
  -d 'from=parent@example.com' \
  -d 'subject=HTML test' \
  -d 'text=' \
  -d 'html=<p>This is <strong>HTML content</strong> with <script>alert("xss")</script> tags.</p>' \
  -d 'SPF=pass'
```

**Expected Result:** Success with HTML tags removed but content preserved

### Test Category 4: Attachment Processing

#### Test 4.1: Simulated Image Attachments
```bash
curl -X POST 'https://advbcfkisejskhskrmqw.supabase.co/functions/v1/email-webhook' \
  -H 'Content-Type: application/x-www-form-urlencoded' \
  -d 'to=memory@tribeupdate.com' \
  -d 'from=parent@example.com' \
  -d 'subject=Test with attachments' \
  -d 'text=Photo from today!' \
  -d 'attachments=2' \
  -d 'attachment-info={"photo1.jpg":{"filename":"photo1.jpg","type":"image/jpeg","content":"dGVzdGRhdGE="},"photo2.jpg":{"filename":"photo2.jpg","type":"image/jpeg","content":"dGVzdGRhdGE="}}' \
  -d 'SPF=pass'
```

**Expected Result:** Success with attachment processing logged

#### Test 4.2: Invalid Attachment Types
```bash
curl -X POST 'https://advbcfkisejskhskrmqw.supabase.co/functions/v1/email-webhook' \
  -H 'Content-Type: application/x-www-form-urlencoded' \
  -d 'to=memory@tribeupdate.com' \
  -d 'from=parent@example.com' \
  -d 'subject=Test with invalid attachments' \
  -d 'text=This has invalid attachments' \
  -d 'attachments=1' \
  -d 'attachment-info={"document.pdf":{"filename":"document.pdf","type":"application/pdf","content":"dGVzdGRhdGE="}}' \
  -d 'SPF=pass'
```

**Expected Result:** Success but attachment should be skipped (logged as "Skipping non-media attachment")

### Test Category 5: Error Conditions

#### Test 5.1: Invalid HTTP Method
```bash
curl -X GET 'https://advbcfkisejskhskrmqw.supabase.co/functions/v1/email-webhook' \
  -H 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0'
```

**Expected Result:** 405 Method Not Allowed

#### Test 5.2: Missing Required Fields
```bash
curl -X POST 'https://advbcfkisejskhskrmqw.supabase.co/functions/v1/email-webhook' \
  -H 'Content-Type: application/x-www-form-urlencoded' \
  -d 'subject=Missing to and from'
```

**Expected Result:** 400 Bad Request with "Missing required email fields"

#### Test 5.3: Unknown Email Address Format
```bash
curl -X POST 'https://advbcfkisejskhskrmqw.supabase.co/functions/v1/email-webhook' \
  -H 'Content-Type: application/x-www-form-urlencoded' \
  -d 'to=unknown@tribeupdate.com' \
  -d 'from=someone@example.com' \
  -d 'subject=Unknown email type' \
  -d 'text=This should be unhandled' \
  -d 'SPF=pass'
```

**Expected Result:**
```json
{
  "success": false,
  "error": "Unhandled email address: unknown@tribeupdate.com",
  "type": "unknown"
}
```

## Integration Testing

### Test Frontend Components

#### Test 1: EmailToMemoryGuide Component
1. Add the component to a test page
2. Verify email address display and copy functionality
3. Check responsive design on mobile
4. Test different domain configurations

#### Test 2: ResponseThread Component
1. Create a test update with some responses
2. Verify real-time updates when new responses are added
3. Test with updates that have no responses
4. Test media display in responses

### Test with Real Email (Production-like)

If you have SendGrid Inbound Parse configured:

#### Test 1: Real Memory Email
1. Send actual email to `memory@yourdomain.com`
2. Check SendGrid logs for webhook delivery
3. Verify update creation in database
4. Check Supabase function logs

#### Test 2: Real Response Email
1. Send actual response to a real update email address
2. Verify response creation
3. Test with photo attachments
4. Check notification processing

## Monitoring and Debugging

### Database Queries for Verification
```sql
-- Check recent memory emails
SELECT u.*, p.email as sender, c.name as child_name
FROM updates u
JOIN profiles p ON u.parent_id = p.id
JOIN children c ON u.child_id = c.id
WHERE u.created_via = 'email'
ORDER BY u.created_at DESC;

-- Check recent responses
SELECT r.*, rec.name as recipient_name, rec.email as recipient_email, u.content as update_content
FROM responses r
JOIN recipients rec ON r.recipient_id = rec.id
JOIN updates u ON r.update_id = u.id
ORDER BY r.received_at DESC;

-- Check for failed processing
SELECT * FROM delivery_jobs WHERE status = 'failed';
```

### Log Analysis
```bash
# View function logs in real-time
supabase functions logs email-webhook --follow

# Look for these log patterns:
# - "Received email:" - Successful webhook receipt
# - "Processing memory email from:" - Memory email processing
# - "Created update from email:" - Successful update creation
# - "Created response from email:" - Successful response creation
# - Error messages for debugging failures
```

## Performance Testing

### Load Testing
```bash
# Test multiple concurrent requests
for i in {1..10}; do
  curl -X POST 'https://advbcfkisejskhskrmqw.supabase.co/functions/v1/email-webhook' \
    -H 'Content-Type: application/x-www-form-urlencoded' \
      -d "to=memory@tribeupdate.com" \
    -d "from=parent@example.com" \
    -d "subject=Load test $i" \
    -d "text=Testing concurrent processing" \
    -d "SPF=pass" &
done
wait
```

## Success Criteria

After running all tests, you should have:
- [ ] ✅ All memory email scenarios working correctly
- [ ] ✅ All response email scenarios working correctly
- [ ] ✅ Proper error handling for edge cases
- [ ] ✅ Content cleaning working as expected
- [ ] ✅ Security validations functioning
- [ ] ✅ Database records created correctly
- [ ] ✅ Frontend components displaying data
- [ ] ✅ Real-time updates working
- [ ] ✅ Attachment processing (simulated)
- [ ] ✅ Comprehensive logging for debugging

## Troubleshooting Common Issues

### Issue: Webhook not receiving requests
- Check Supabase function deployment status
- Verify URL in SendGrid configuration
- Check network connectivity and firewall settings

### Issue: Database errors
- Verify test data exists in database
- Check RLS policies allow service role access
- Confirm environment variables are set correctly

### Issue: Email content not processed correctly
- Check email parsing logic in logs
- Verify content cleaning functions
- Test with different email client formats

### Issue: Attachments not working
- Confirm storage bucket exists and has correct permissions
- Check file size limits
- Verify base64 decoding logic

This comprehensive testing guide should help you verify that all aspects of your email webhook system are working correctly before going to production.