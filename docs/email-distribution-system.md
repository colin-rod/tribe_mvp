# Email Distribution System (CRO-24)

This document describes the implementation of the email distribution system for the Tribe MVP platform, allowing parents to send personalized family updates via email using SendGrid.

## Overview

The email distribution system consists of two main Edge Functions:
1. **distribute-email**: Processes update distribution requests and sends emails
2. **sendgrid-webhook**: Handles delivery status updates from SendGrid

## Architecture

```
Parent creates update → Frontend calls distribute-email → SendGrid sends emails
                                    ↓
Database tracks delivery jobs ← sendgrid-webhook ← SendGrid delivery events
```

## Components

### 1. Edge Functions

#### `/supabase/functions/distribute-email/index.ts`
Main email distribution function that:
- Validates update and recipient data
- Generates personalized email templates
- Sends emails via SendGrid API
- Creates delivery tracking records
- Handles error reporting

#### `/supabase/functions/sendgrid-webhook/index.ts`
Webhook handler that:
- Receives SendGrid delivery events
- Updates delivery job statuses
- Handles bounces and failures
- Supports signature verification

### 2. Shared Utilities

#### `/supabase/functions/_shared/types.ts`
TypeScript interfaces for email distribution system including:
- `DistributeEmailRequest`
- `DistributeEmailResponse`
- `EmailTemplateData`
- `SendGridWebhookEvent`

#### `/supabase/functions/_shared/email-templates.ts`
Email template generation utilities:
- `generateHtmlTemplate()`: Rich HTML email template
- `generateTextTemplate()`: Plain text fallback
- `calculateChildAge()`: Human-readable age calculation
- `getPersonalizedGreeting()`: Relationship-based greetings
- `generateReplyToAddress()`: Unique reply-to addresses

#### `/supabase/functions/_shared/database.ts`
Database interaction utilities:
- `fetchUpdateWithDetails()`: Get update with child/parent info
- `fetchRecipientsWithDetails()`: Get recipient preferences
- `createDeliveryJob()`: Track email delivery
- `updateDeliveryJobStatus()`: Update delivery status

#### `/supabase/functions/_shared/validation.ts`
Request validation and sanitization:
- `validateDistributeEmailRequest()`
- `validateEmail()`
- `sanitizeHtml()`

### 3. Database Schema

#### Updates to delivery_jobs table:
- `external_id`: SendGrid message ID for tracking
- `error_message`: Detailed error information
- New indexes for performance
- RLS policies for security

## API Usage

### Distribute Email

```typescript
POST /functions/v1/distribute-email
Content-Type: application/json
Authorization: Bearer {service_role_key}

{
  "update_id": "uuid",
  "recipient_ids": ["uuid1", "uuid2", ...]
}
```

Response:
```typescript
{
  "success": true,
  "delivery_jobs": [
    {
      "id": "job-uuid",
      "recipient_id": "recipient-uuid",
      "status": "sent",
      "external_id": "sendgrid-message-id"
    }
  ]
}
```

### SendGrid Webhook

```typescript
POST /functions/v1/sendgrid-webhook
Content-Type: application/json
X-Twilio-Email-Event-Webhook-Signature: {signature}
X-Twilio-Email-Event-Webhook-Timestamp: {timestamp}

[
  {
    "email": "recipient@example.com",
    "timestamp": 1234567890,
    "event": "delivered",
    "sg_message_id": "message-id"
  }
]
```

## Environment Variables

### Required
- `SENDGRID_API_KEY`: Your SendGrid API key
- `SENDGRID_FROM_EMAIL`: Verified sender email address
- `REPLY_TO_DOMAIN`: Domain for reply-to addresses (e.g., `tribe.dev`)

### Optional
- `SENDGRID_FROM_NAME`: Display name for emails (default: "Tribe")
- `SENDGRID_WEBHOOK_SECRET`: Secret for webhook signature verification

## Email Templates

### Features
- Responsive HTML design
- Personalized greetings based on relationship
- Milestone celebration badges
- Media galleries for photos (video support deferred post-MVP)
- Reply-to instructions
- Mobile-optimized layout

### Personalization
- Greeting varies by relationship (grandparent, parent, sibling, friend, etc.)
- Child age calculation (e.g., "8 months old", "2 years and 3 months old")
- Milestone-specific formatting and badges
- Unique reply-to addresses per update

### Subject Lines
- Regular updates: "Update about {child_name}"
- Milestones: "🎉 {child_name}'s {milestone}!"

## Reply-to System

### Reply Address Format
`update-{update_id}@{reply_to_domain}`

### Implementation
- Each update gets a unique reply-to address
- Incoming replies can be tracked back to specific updates
- Future enhancement: Process reply content for responses

## Delivery Tracking

### Status Flow
1. `queued`: Delivery job created
2. `sent`: Email sent to SendGrid
3. `delivered`: SendGrid confirmed delivery
4. `failed`: Delivery failed (bounce, block, etc.)

### Real-time Updates
- Delivery jobs table has realtime enabled
- Frontend can subscribe to status changes
- Parents can see delivery progress in real-time

## Error Handling

### SendGrid API Errors
- Rate limiting retry logic
- Invalid email handling
- API quota management

### Database Errors
- Transaction rollback on failures
- Graceful degradation
- Comprehensive error logging

### Webhook Errors
- Signature verification
- Duplicate event handling
- Invalid event type handling

## Security

### Authentication
- Service role key required for distribute-email
- Webhook signature verification (optional)
- RLS policies protect data access

### Input Validation
- Email address validation
- HTML sanitization
- Request size limits
- SQL injection prevention

### Privacy
- No sensitive data in email headers
- Secure reply-to addresses
- Recipient preference enforcement

## Testing

### Test Script
Run the test suite:
```bash
node scripts/test-email-distribution.js
```

### Manual Testing
1. Create test update and recipients
2. Call distribute-email function
3. Verify delivery jobs created
4. Simulate webhook events
5. Check status updates

### Required Test Data
- Valid update with child and parent info
- Active recipients with email addresses
- Email in recipient's preferred channels

## Monitoring

### Key Metrics
- Delivery success rate
- Email open rates (via SendGrid)
- Bounce rates
- Error rates by type

### Logging
- Comprehensive error logging
- Performance metrics
- Webhook event tracking
- Email send confirmation

## Future Enhancements

### Reply Processing
- Parse reply email content
- Create response records
- Notify parents of replies
- Thread conversations

### Delivery Optimization
- Batch sending for performance
- Send time optimization
- Recipient timezone handling
- Frequency capping

### Template Improvements
- Multiple template designs
- Seasonal themes
- Interactive elements
- Better media handling

### Analytics
- Engagement tracking
- Delivery analytics dashboard
- Recipient behavior insights
- A/B testing framework

## Troubleshooting

### Common Issues
1. **SendGrid API errors**: Check API key and sender verification
2. **No emails sent**: Verify recipients have email in preferred channels
3. **Webhook not working**: Check endpoint URL and signature secret
4. **Template issues**: Validate HTML and test with sample data

### Debug Mode
Enable debug logging by setting environment variables:
```bash
DEBUG=true
LOG_LEVEL=debug
```

### Health Checks
- Verify Edge Functions are deployed
- Test SendGrid API connectivity
- Check webhook endpoint availability
- Validate database permissions

## Production Deployment

### Prerequisites
1. SendGrid account with API key
2. Verified sender email address
3. Webhook endpoint configured
4. Environment variables set

### Deployment Steps
1. Deploy Edge Functions to Supabase
2. Run database migrations
3. Configure SendGrid webhook URL
4. Test with sample data
5. Monitor delivery metrics

### Configuration
```bash
# Set in Supabase dashboard or CLI
supabase secrets set SENDGRID_API_KEY=your_api_key
supabase secrets set SENDGRID_FROM_EMAIL=noreply@yourdomain.com
supabase secrets set REPLY_TO_DOMAIN=yourdomain.com
supabase secrets set SENDGRID_WEBHOOK_PUBLIC_KEY=your_event_webhook_public_key
```

> Tip: Only set `SENDGRID_WEBHOOK_RELAXED_VALIDATION=true` for local testing scenarios where the webhook key is unavailable. Production deployments must keep this flag `false` and supply the real public key.

This implementation provides a robust, scalable email distribution system with comprehensive tracking, personalization, and error handling for the Tribe MVP platform.