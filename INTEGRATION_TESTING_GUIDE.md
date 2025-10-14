# Email Webhook Integration Testing Guide

This guide covers comprehensive integration testing for the email-to-memory system and response webhooks using the production environment.

## Prerequisites

- ✅ Production webhook deployed: `https://advbcfkisejskhskrmqw.supabase.co/functions/v1/email-webhook`
- ✅ Test data created in production database
- ✅ RLS temporarily disabled for testing (re-enable after testing)
- ✅ JWT verification disabled for webhook testing

## Test Data Setup

Ensure these records exist in your production database:

```sql
-- User: e2c5d9f4-32a9-4013-bdec-d65aaf1e6bf2 (parent@example.com)
-- Child: 550e8400-e29b-41d4-a716-446655440002 (Emma)
-- Recipient: 550e8400-e29b-41d4-a716-446655440003 (grandma@example.com)
-- Test Update: 550e8400-e29b-41d4-a716-446655440000
```

## Testing Categories

### Category 1: Email-to-Memory System Tests

#### Test 1.1: Basic Memory Email (Happy Path)
```bash
curl -X POST 'https://advbcfkisejskhskrmqw.supabase.co/functions/v1/email-webhook' \
  -H 'Content-Type: application/x-www-form-urlencoded' \
  -d 'to=memory@tribeupdate.com' \
  -d 'from=parent@example.com' \
  -d 'subject=Emma took her first steps!' \
  -d 'text=She walked from the couch to the coffee table! So proud!' \
  -d 'SPF=pass'
```

**Expected Result:**
```json
{
  "success": true,
  "type": "memory",
  "entity_id": "uuid-of-new-update"
}
```

**Verify:** New update created with `distribution_status: 'draft'`

#### Test 1.2: Memory Email with Child Specification
```bash
curl -X POST 'https://advbcfkisejskhskrmqw.supabase.co/functions/v1/email-webhook' \
  -H 'Content-Type: application/x-www-form-urlencoded' \
  -d 'to=memory@tribeupdate.com' \
  -d 'from=parent@example.com' \
  -d 'subject=Memory for Emma: First day at daycare' \
  -d 'text=Emma had a great first day! She made friends and loved the playground.' \
  -d 'SPF=pass'
```

**Expected Result:** Success with Emma correctly identified as child

#### Test 1.3: Memory Email with HTML Content
```bash
curl -X POST 'https://advbcfkisejskhskrmqw.supabase.co/functions/v1/email-webhook' \
  -H 'Content-Type: application/x-www-form-urlencoded' \
  -d 'to=memory@tribeupdate.com' \
  -d 'from=parent@example.com' \
  -d 'subject=HTML Test' \
  -d 'text=' \
  -d 'html=<p>This is <strong>bold text</strong> and <em>italic</em>. <script>alert("xss")</script></p>' \
  -d 'SPF=pass'
```

**Expected Result:** Success with HTML tags stripped but content preserved

#### Test 1.4: Memory Email with Attachments (Simulated)
```bash
curl -X POST 'https://advbcfkisejskhskrmqw.supabase.co/functions/v1/email-webhook' \
  -H 'Content-Type: application/x-www-form-urlencoded' \
  -d 'to=memory@tribeupdate.com' \
  -d 'from=parent@example.com' \
  -d 'subject=Photos from today' \
  -d 'text=Check out these cute photos!' \
  -d 'attachments=2' \
  -d 'attachment-info={"photo1.jpg":{"filename":"photo1.jpg","type":"image/jpeg","content":"dGVzdGRhdGE="},"photo2.jpg":{"filename":"photo2.jpg","type":"image/jpeg","content":"dGVzdGRhdGE="}}' \
  -d 'SPF=pass'
```

**Expected Result:** Success with attachment processing logged

#### Test 1.5: Content Cleaning Test
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

**Expected Result:** Success with signatures and quoted text removed

### Category 2: Edge Cases and Error Conditions

#### Test 2.1: Unknown Sender
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

#### Test 2.2: SPF Authentication Failure
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

#### Test 2.3: Empty Content
```bash
curl -X POST 'https://advbcfkisejskhskrmqw.supabase.co/functions/v1/email-webhook' \
  -H 'Content-Type: application/x-www-form-urlencoded' \
  -d 'to=memory@tribeupdate.com' \
  -d 'from=parent@example.com' \
  -d 'subject=' \
  -d 'text=' \
  -d 'SPF=pass'
```

**Expected Result:**
```json
{
  "success": false,
  "error": "No content or media found",
  "type": "memory"
}
```

#### Test 2.4: Missing Required Fields
```bash
curl -X POST 'https://advbcfkisejskhskrmqw.supabase.co/functions/v1/email-webhook' \
  -H 'Content-Type: application/x-www-form-urlencoded' \
  -d 'subject=Missing to and from'
```

**Expected Result:**
```json
{
  "error": "Missing required email fields"
}
```

#### Test 2.5: Invalid HTTP Method
```bash
curl -X GET 'https://advbcfkisejskhskrmqw.supabase.co/functions/v1/email-webhook'
```

**Expected Result:** 405 Method Not Allowed

#### Test 2.6: Unknown Email Address Format
```bash
curl -X POST 'https://advbcfkisejskhskrmqw.supabase.co/functions/v1/email-webhook' \
  -H 'Content-Type: application/x-www-form-urlencoded' \
  -d 'to=unknown@tribeupdate.com' \
  -d 'from=parent@example.com' \
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

### Category 3: Email Response System Tests

#### Test 3.1: Response to Update (Happy Path)
```bash
curl -X POST 'https://advbcfkisejskhskrmqw.supabase.co/functions/v1/email-webhook' \
  -H 'Content-Type: application/x-www-form-urlencoded' \
  -d 'to=update-550e8400-e29b-41d4-a716-446655440000@tribeupdate.com' \
  -d 'from=grandma@example.com' \
  -d 'subject=Re: Emma'\''s First Steps' \
  -d 'text=So wonderful! Can'\''t wait to see her walk more!' \
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

#### Test 3.2: Response with HTML Content
```bash
curl -X POST 'https://advbcfkisejskhskrmqw.supabase.co/functions/v1/email-webhook' \
  -H 'Content-Type: application/x-www-form-urlencoded' \
  -d 'to=update-550e8400-e29b-41d4-a716-446655440000@tribeupdate.com' \
  -d 'from=grandma@example.com' \
  -d 'subject=Re: Emma'\''s Update' \
  -d 'html=<p>What a <strong>wonderful</strong> milestone! 🎉</p>' \
  -d 'SPF=pass'
```

**Expected Result:** Success with HTML content cleaned

#### Test 3.3: Response with Attachments
```bash
curl -X POST 'https://advbcfkisejskhskrmqw.supabase.co/functions/v1/email-webhook' \
  -H 'Content-Type: application/x-www-form-urlencoded' \
  -d 'to=update-550e8400-e29b-41d4-a716-446655440000@tribeupdate.com' \
  -d 'from=grandma@example.com' \
  -d 'subject=Re: With photos' \
  -d 'text=Here are some photos in response!' \
  -d 'attachments=1' \
  -d 'attachment-info={"response.jpg":{"filename":"response.jpg","type":"image/jpeg","content":"dGVzdGRhdGE="}}' \
  -d 'SPF=pass'
```

**Expected Result:** Success with attachment processing

#### Test 3.4: Response to Non-existent Update
```bash
curl -X POST 'https://advbcfkisejskhskrmqw.supabase.co/functions/v1/email-webhook' \
  -H 'Content-Type: application/x-www-form-urlencoded' \
  -d 'to=update-99999999-9999-9999-9999-999999999999@tribeupdate.com' \
  -d 'from=grandma@example.com' \
  -d 'subject=Re: Non-existent' \
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

#### Test 3.5: Response from Unknown Recipient
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

#### Test 3.6: Duplicate Response (Same Message ID)
```bash
# First response
curl -X POST 'https://advbcfkisejskhskrmqw.supabase.co/functions/v1/email-webhook' \
  -H 'Content-Type: application/x-www-form-urlencoded' \
  -d 'to=update-550e8400-e29b-41d4-a716-446655440000@tribeupdate.com' \
  -d 'from=grandma@example.com' \
  -d 'subject=Re: Duplicate test' \
  -d 'text=First response' \
  -d 'Message-ID=<duplicate-test@example.com>' \
  -d 'SPF=pass'

# Duplicate response (same Message-ID)
curl -X POST 'https://advbcfkisejskhskrmqw.supabase.co/functions/v1/email-webhook' \
  -H 'Content-Type: application/x-www-form-urlencoded' \
  -d 'to=update-550e8400-e29b-41d4-a716-446655440000@tribeupdate.com' \
  -d 'from=grandma@example.com' \
  -d 'subject=Re: Duplicate test' \
  -d 'text=Duplicate response' \
  -d 'Message-ID=<duplicate-test@example.com>' \
  -d 'SPF=pass'
```

**Expected Result:** Both should return success, but only one response record created

### Category 4: CORS and Pre-flight Tests

#### Test 4.1: CORS Pre-flight Request
```bash
curl -X OPTIONS 'https://advbcfkisejskhskrmqw.supabase.co/functions/v1/email-webhook' -v
```

**Expected Result:** 200 OK with CORS headers

#### Test 4.2: CORS Headers on POST
```bash
curl -X POST 'https://advbcfkisejskhskrmqw.supabase.co/functions/v1/email-webhook' \
  -H 'Content-Type: application/x-www-form-urlencoded' \
  -H 'Origin: https://example.com' \
  -d 'to=memory@tribeupdate.com' \
  -d 'from=parent@example.com' \
  -d 'subject=CORS test' \
  -d 'text=Testing CORS headers' \
  -d 'SPF=pass' \
  -v
```

**Expected Result:** Response includes CORS headers

### Category 5: Performance and Load Tests

#### Test 5.1: Concurrent Requests
```bash
# Run 5 concurrent memory emails
for i in {1..5}; do
  curl -X POST 'https://advbcfkisejskhskrmqw.supabase.co/functions/v1/email-webhook' \
    -H 'Content-Type: application/x-www-form-urlencoded' \
    -d "to=memory@tribeupdate.com" \
    -d "from=parent@example.com" \
    -d "subject=Concurrent test $i" \
    -d "text=Testing concurrent processing $i" \
    -d "SPF=pass" &
done
wait
```

**Expected Result:** All requests succeed, 5 new updates created

#### Test 5.2: Large Content Test
```bash
curl -X POST 'https://advbcfkisejskhskrmqw.supabase.co/functions/v1/email-webhook' \
  -H 'Content-Type: application/x-www-form-urlencoded' \
  -d 'to=memory@tribeupdate.com' \
  -d 'from=parent@example.com' \
  -d 'subject=Large content test' \
  -d 'text='"$(printf 'This is a very long message with lots of content. %.0s' {1..1000})" \
  -d 'SPF=pass'
```

**Expected Result:** Success with large content handled properly

### Category 6: Malformed Data Tests

#### Test 6.1: Invalid JSON in Envelope
```bash
curl -X POST 'https://advbcfkisejskhskrmqw.supabase.co/functions/v1/email-webhook' \
  -H 'Content-Type: application/x-www-form-urlencoded' \
  -d 'to=memory@tribeupdate.com' \
  -d 'from=parent@example.com' \
  -d 'subject=Invalid envelope' \
  -d 'text=Testing invalid envelope JSON' \
  -d 'envelope={invalid json}' \
  -d 'SPF=pass'
```

**Expected Result:** Should handle gracefully without crashing

#### Test 6.2: Very Long Subject Line
```bash
curl -X POST 'https://advbcfkisejskhskrmqw.supabase.co/functions/v1/email-webhook' \
  -H 'Content-Type: application/x-www-form-urlencoded' \
  -d 'to=memory@tribeupdate.com' \
  -d 'from=parent@example.com' \
  -d 'subject='"$(printf 'Very long subject line %.0s' {1..100})" \
  -d 'text=Short content' \
  -d 'SPF=pass'
```

**Expected Result:** Success with long subject handled

#### Test 6.3: Special Characters in Content
```bash
curl -X POST 'https://advbcfkisejskhskrmqw.supabase.co/functions/v1/email-webhook' \
  -H 'Content-Type: application/x-www-form-urlencoded' \
  -d 'to=memory@tribeupdate.com' \
  -d 'from=parent@example.com' \
  -d 'subject=Special chars: éñ中文🎉' \
  -d 'text=Content with émojis: 👶🍼💕 and unicode: ñáéíóú 中文' \
  -d 'SPF=pass'
```

**Expected Result:** Success with proper Unicode handling

## Database Verification Queries

After running tests, verify results with these queries:

```sql
-- Check recent updates
SELECT
  id,
  content,
  distribution_status,
  created_at,
  (SELECT name FROM children WHERE id = child_id) as child_name,
  (SELECT email FROM profiles WHERE id = parent_id) as parent_email
FROM updates
ORDER BY created_at DESC
LIMIT 10;

-- Check recent responses
SELECT
  r.id,
  r.content,
  r.received_at,
  (SELECT name FROM recipients WHERE id = r.recipient_id) as recipient_name,
  (SELECT email FROM recipients WHERE id = r.recipient_id) as recipient_email,
  u.content as update_content
FROM responses r
JOIN updates u ON r.update_id = u.id
ORDER BY r.received_at DESC
LIMIT 10;

-- Check for any failed delivery jobs
SELECT * FROM delivery_jobs WHERE status = 'failed';

-- Verify test data integrity
SELECT 'profiles' as table_name, count(*) as count FROM profiles
UNION ALL
SELECT 'children', count(*) FROM children
UNION ALL
SELECT 'recipients', count(*) FROM recipients
UNION ALL
SELECT 'updates', count(*) FROM updates
UNION ALL
SELECT 'responses', count(*) FROM responses;
```

## Success Criteria

After running all tests, you should have:

- ✅ All happy path scenarios working correctly
- ✅ Proper error handling for edge cases
- ✅ Security validations functioning (SPF, unknown senders)
- ✅ Content cleaning working as expected
- ✅ Response system working for valid recipients
- ✅ Database records created correctly
- ✅ No crashes or unhandled errors
- ✅ CORS working for web integration
- ✅ Performance acceptable under load
- ✅ Proper handling of malformed data

## Post-Testing Cleanup

After testing is complete:

1. **Re-enable RLS policies:**
```sql
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE children ENABLE ROW LEVEL SECURITY;
ALTER TABLE updates ENABLE ROW LEVEL SECURITY;
ALTER TABLE recipients ENABLE ROW LEVEL SECURITY;
ALTER TABLE responses ENABLE ROW LEVEL SECURITY;
```

2. **Clean up test data** (optional):
```sql
-- Remove test updates created during testing
DELETE FROM updates WHERE parent_id = 'e2c5d9f4-32a9-4013-bdec-d65aaf1e6bf2';

-- Remove test responses
DELETE FROM responses WHERE recipient_id = '550e8400-e29b-41d4-a716-446655440003';
```

3. **Deploy webhook with JWT verification** for production:
```bash
supabase functions deploy email-webhook
```

## Troubleshooting

### Common Issues:

1. **"Unknown sender" errors**: Verify profile exists with correct email
2. **"Update not found" errors**: Check update ID in database
3. **"Unknown recipient" errors**: Verify recipient exists and is active
4. **Content not cleaned properly**: Check email-processing functions
5. **Attachments not processed**: Verify storage configuration

### Logging:

Monitor function logs at: `https://supabase.com/dashboard/project/advbcfkisejskhskrmqw/functions/email-webhook`

Look for these log patterns:
- "Received email:" - Successful webhook receipt
- "Processing memory email from:" - Memory email processing
- "Created update from email:" - Successful update creation
- "Created response from email:" - Successful response creation