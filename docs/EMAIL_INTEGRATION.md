# Email Integration with SendGrid

This document describes the SendGrid email service integration implemented in the Tribe MVP notification system.

## Overview

The Tribe MVP uses SendGrid for reliable email delivery across different notification types:
- **Response notifications**: When someone responds to an update
- **Prompt notifications**: When someone requests an update
- **Digest notifications**: Daily/weekly summaries of updates
- **System notifications**: Account and system-related messages
- **Preference invitations**: Onboarding emails for new recipients

## Architecture

### Core Components

1. **EmailService** (`/src/lib/services/emailService.ts`)
   - Main email service class using SendGrid Web API v3
   - Handles template generation and email delivery
   - Provides test email functionality
   - Manages error handling and delivery status tracking

2. **NotificationService** (`/src/lib/services/notificationService.ts`)
   - Integrates with EmailService for notification delivery
   - Tracks notification history in Supabase
   - Handles bulk email operations
   - Manages delivery status and error tracking

3. **Recipients Module** (`/src/lib/recipients.ts`)
   - Sends preference invitation emails to new recipients
   - Retrieves sender information for email personalization

4. **Preference Links** (`/src/lib/preference-links.ts`)
   - Sends preference setup emails with magic links
   - Handles preference invitation workflow

## Configuration

### Environment Variables

Required environment variables in `.env.local`:

```bash
# SendGrid Configuration
SENDGRID_API_KEY=your-sendgrid-api-key
SENDGRID_FROM_EMAIL=updates@tribeupdate.com
SENDGRID_FROM_NAME=Tribe
REPLY_TO_DOMAIN=tribeupdate.com

# Optional: Email webhook configuration
WEBHOOK_SECRET=your-webhook-secret
MEMORY_EMAIL=memory@tribeupdate.com
INBOUND_EMAIL_DOMAIN=tribeupdate.com
```

### SendGrid Setup

1. **API Key**: Create a SendGrid API key with "Mail Send" permissions
2. **Domain Authentication**: Set up domain authentication for `tribeupdate.com`
3. **From Address**: Verify `updates@tribeupdate.com` as a sender
4. **Reply-To**: Configure reply-to handling for the domain

## Email Templates

### Template Types

All email templates are HTML/text responsive designs with consistent branding:

#### 1. Response Notifications
- **Purpose**: Notify when someone responds to an update
- **Data**: `senderName`, `updateContent`, `babyName`, `replyUrl`
- **Subject**: "{senderName} responded to your update about {babyName}"

#### 2. Prompt Notifications
- **Purpose**: Request updates from parents
- **Data**: `promptText`, `babyName`, `responseUrl`
- **Subject**: "Update request about {babyName}"

#### 3. Digest Notifications
- **Purpose**: Daily/weekly update summaries
- **Data**: `updates[]`, `period`, `unreadCount`, `digestUrl`
- **Subject**: "Your {period} update digest ({unreadCount} new updates)"

#### 4. System Notifications
- **Purpose**: Account and system messages
- **Data**: `title`, `content`, `actionUrl`, `actionText`
- **Subject**: "{title} - Tribe"

#### 5. Preference Invitations
- **Purpose**: Onboard new recipients
- **Data**: `recipientName`, `senderName`, `preferenceUrl`, `babyName`
- **Subject**: "{senderName} wants to share {babyName} updates with you"

### Template Features

- **Responsive Design**: Mobile-optimized layouts
- **Consistent Branding**: Tribe colors and typography
- **Accessibility**: Proper contrast and semantic HTML
- **Plain Text Fallback**: Text versions for all templates
- **Unsubscribe Links**: Standard unsubscribe handling
- **Tracking**: SendGrid categories and custom arguments

## Usage Examples

### Basic Email Sending

```typescript
import { emailService } from '@/lib/services/emailService'

// Send a test email
const result = await emailService.sendTestEmail('user@example.com', 'system')

// Send a templated email
const result = await emailService.sendTemplatedEmail(
  'user@example.com',
  'response',
  {
    senderName: 'Alice',
    updateContent: 'Baby took first steps!',
    babyName: 'Emma',
    replyUrl: 'https://tribe.example.com/response/123'
  }
)
```

### Using NotificationService

```typescript
import { notificationService } from '@/lib/services/notificationService'

// Send notification with history tracking
await notificationService.sendEmailNotification(
  'user-id-123',
  'user@example.com',
  'response',
  {
    senderName: 'Alice',
    updateContent: 'Baby is doing great!',
    babyName: 'Emma'
  }
)

// Send bulk notifications
const recipients = [
  { userId: 'user1', userEmail: 'user1@example.com', type: 'digest', templateData: {...} },
  { userId: 'user2', userEmail: 'user2@example.com', type: 'digest', templateData: {...} }
]

const results = await notificationService.sendBulkEmailNotifications(recipients)
```

### Sending Preference Invitations

```typescript
import { sendPreferenceLink } from '@/lib/preference-links'

// Send preference setup email
await sendPreferenceLink(
  'newuser@example.com',
  'John Doe',
  'preference-token-123',
  'Sarah Smith'
)
```

## Testing

### Test Scripts

Two test scripts are available for validation:

#### 1. Basic Email Test
```bash
# Test system notification
npm run test:email your-email@example.com system

# Test preference invitation
npm run test:email your-email@example.com preference

# Test response notification
npm run test:email your-email@example.com response
```

#### 2. Integration Test
```bash
# Test all email types
node scripts/test-notification-service.js your-email@example.com
```

### Manual Testing

```typescript
// Check email service status
import { emailService } from '@/lib/services/emailService'

const status = emailService.getStatus()
console.log('Email service status:', status)
// { configured: true, apiKey: true, fromEmail: true }

// Send test email
const result = await emailService.sendTestEmail('test@example.com')
console.log('Test result:', result)
// { success: true, messageId: 'abc123', statusCode: 202 }
```

## Error Handling

### Error Types

1. **Configuration Errors**: Missing API key or from email
2. **SendGrid API Errors**: Rate limits, invalid recipients, etc.
3. **Template Errors**: Missing template data or invalid types
4. **Network Errors**: Connection timeouts or service unavailability

### Error Response Format

```typescript
interface EmailDeliveryResult {
  success: boolean
  messageId?: string
  error?: string
  statusCode?: number
}
```

### Error Logging

All email errors are logged with:
- Recipient email address
- Template type and data
- SendGrid error details
- Fallback manual sharing links

## Delivery Tracking

### SendGrid Integration

- **Message IDs**: Track individual email delivery
- **Categories**: Organize emails by type (`tribe-response`, `tribe-digest`, etc.)
- **Custom Arguments**: Include metadata for analytics
- **Webhooks**: Future enhancement for delivery status updates

### Database Tracking

All email notifications are tracked in the `notification_history` table:

```sql
CREATE TABLE notification_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id),
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  content TEXT,
  metadata JSONB DEFAULT '{}',
  delivery_method TEXT NOT NULL,
  delivery_status TEXT NOT NULL,
  read_at TIMESTAMP WITH TIME ZONE,
  sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## Performance Considerations

### Batch Processing

- **Bulk Emails**: Process in batches of 10 to avoid overwhelming SendGrid
- **Rate Limiting**: 100ms delay between batches
- **Error Isolation**: Individual email failures don't affect the batch

### Template Optimization

- **Inline CSS**: Minimized for better email client compatibility
- **Image Optimization**: External images with fallbacks
- **Text Alternatives**: Always include plain text versions

## Security

### Content Security

- **Input Sanitization**: All template data is properly escaped
- **XSS Prevention**: HTML content is sanitized
- **Token Security**: Preference tokens are cryptographically secure

### API Security

- **API Key Management**: SendGrid API key stored securely
- **Domain Authentication**: SPF/DKIM records configured
- **Rate Limiting**: Built-in protection against abuse

## Monitoring

### Key Metrics

- **Delivery Rate**: Percentage of emails successfully sent
- **Open Rate**: Tracked via SendGrid (optional)
- **Error Rate**: Failed delivery percentage
- **Template Performance**: Usage statistics by type

### Alerts

Configure monitoring for:
- API key expiration
- High error rates
- Delivery failures
- Rate limit exceeded

## Future Enhancements

### Planned Features

1. **Webhook Integration**: Real-time delivery status updates
2. **Template Management**: Dynamic template editing
3. **A/B Testing**: Template variation testing
4. **Advanced Analytics**: Detailed engagement metrics
5. **Internationalization**: Multi-language template support

### Optimization Opportunities

1. **Template Caching**: Cache compiled templates
2. **Batch Optimization**: Larger batch sizes for digest emails
3. **Priority Queuing**: Prioritize certain notification types
4. **Retry Logic**: Automatic retry for failed deliveries

## Troubleshooting

### Common Issues

1. **"API key not configured"**
   - Check `SENDGRID_API_KEY` in environment variables
   - Verify API key has "Mail Send" permissions

2. **"From email not verified"**
   - Verify sender email in SendGrid dashboard
   - Check domain authentication setup

3. **"Template data missing"**
   - Ensure all required template data is provided
   - Check template data structure matches interface

4. **"Rate limit exceeded"**
   - Reduce batch sizes
   - Increase delays between requests
   - Check SendGrid plan limits

### Debug Commands

```bash
# Check configuration
node -e "console.log(require('./src/lib/services/emailService').emailService.getStatus())"

# Test basic connectivity
npm run test:email your-email@example.com system

# Test all templates
node scripts/test-notification-service.js your-email@example.com
```

## Support

For issues with the email integration:

1. Check the troubleshooting section above
2. Verify SendGrid configuration and API limits
3. Review application logs for specific error messages
4. Test with the provided scripts to isolate issues

## License

This email integration is part of the Tribe MVP project and follows the same license terms.