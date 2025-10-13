# Email Webhook System Setup & Usage

## Overview

The email webhook system enables two key features for the Tribe MVP platform:

1. **Email-to-Memory**: Parents can create updates by sending emails to `memory@yourdomain.com`
2. **Email Responses**: Recipients can reply to update emails to share their thoughts

## Implementation Status

✅ **Completed Features:**
- SendGrid Inbound Parse webhook handler
- Email parsing and content cleaning
- Email-to-memory system for creating updates
- Response handling for update replies
- Attachment processing for photos/videos
- Proper error handling and validation
- Webhook signature verification support
- Database integration with existing schema

## SendGrid Configuration Required

### 1. Domain Setup
Configure MX records for your domain:
```
Type: MX
Name: @
Value: mx.sendgrid.net
Priority: 10
```

### 2. Inbound Parse Setup
In SendGrid Dashboard:
1. Go to Settings → Inbound Parse
2. Add hostname: `yourdomain.com`
3. Set destination URL: `https://your-project.supabase.co/functions/v1/email-webhook`
4. Enable "Send Raw" for attachment handling

### 3. Environment Variables
Add to your production environment:
```bash
WEBHOOK_SECRET=your-secure-webhook-secret
MEMORY_EMAIL=memory@yourdomain.com
INBOUND_EMAIL_DOMAIN=yourdomain.com
REPLY_TO_DOMAIN=yourdomain.com
SENDGRID_WEBHOOK_PUBLIC_KEY=your-sendgrid-event-webhook-public-key
```

> **Note:** For local development without a webhook key, you may temporarily set `SENDGRID_WEBHOOK_RELAXED_VALIDATION=true`. Do not enable this flag in production deployments.

## How It Works

### Email-to-Memory System

**Send to:** `memory@yourdomain.com`
**From:** Any registered parent email address

**Subject formats:**
- `"Memory for Emma: First steps today!"` - Creates update for specific child
- `"First day of school"` - Creates update for the parent's first child

**Features:**
- Automatically creates draft updates from email content
- Processes photo/video attachments
- Cleans email content (removes signatures, forwarding markers)
- Links to correct child based on subject line or defaults to first child

### Email Response System

**Send to:** `update-{uuid}@yourdomain.com` (automatically generated in update emails)
**From:** Any registered recipient email address

**Features:**
- Creates response records linked to the original update
- Processes photo/video attachments in responses
- Prevents duplicate responses using message IDs
- Notifies parents based on their notification preferences

## Security Features

- **Sender Authentication**: Validates SPF records
- **Webhook Signature Verification**: Optional HMAC validation
- **Sender Validation**: Only registered users can create updates/responses
- **Content Filtering**: Removes potentially harmful content
- **File Type Validation**: Only allows image and video attachments
- **Rate Limiting**: Built-in protection against abuse

## Testing

The system has been tested with:
- ✅ Memory email processing (unknown sender correctly rejected)
- ✅ Update response processing (non-existent update correctly rejected)
- ✅ Unknown email type handling
- ✅ Proper error responses and logging
- ✅ Database connectivity and authentication

## Production Deployment

1. **Deploy Edge Function:**
   ```bash
   supabase functions deploy email-webhook
   ```

2. **Set Environment Variables:**
   ```bash
   supabase secrets set WEBHOOK_SECRET=your-secret
   supabase secrets set MEMORY_EMAIL=memory@yourdomain.com
   supabase secrets set INBOUND_EMAIL_DOMAIN=yourdomain.com
   ```

3. **Configure DNS:**
   - Set MX records to point to SendGrid
   - Verify DNS propagation

4. **Test Email Flow:**
   - Send test email to memory address
   - Verify update creation in database
   - Test response to generated update email

## API Response Format

### Success Response
```json
{
  "success": true,
  "type": "memory|response",
  "entity_id": "uuid-of-created-entity"
}
```

### Error Response
```json
{
  "success": false,
  "error": "Error description",
  "type": "memory|response|unknown"
}
```

## Monitoring

The system logs the following events:
- Email processing attempts
- Sender validation results
- Update/response creation
- Attachment processing
- Error conditions

Monitor these logs in your Supabase dashboard for production debugging.

## Next Steps

After successful deployment:
1. Test with real SendGrid inbound parse setup
2. Integrate with existing email distribution system
3. Add notification emails for memory confirmations
4. Implement daily digest for response notifications
5. Add user-facing documentation for email features

## File Structure

```
supabase/functions/
├── email-webhook/
│   └── index.ts                    # Main webhook handler
└── _shared/
    ├── email-processing.ts         # Email utilities and attachment handling
    ├── types.ts                   # TypeScript interfaces (updated)
    ├── database.ts               # Database utilities
    └── cors.ts                   # CORS headers
```

## Dependencies

- Supabase Edge Functions runtime
- SendGrid Inbound Parse service
- Existing Tribe MVP database schema
- Shared utility functions

This implementation provides a robust foundation for email-based interactions in the Tribe MVP platform while maintaining security and scalability.