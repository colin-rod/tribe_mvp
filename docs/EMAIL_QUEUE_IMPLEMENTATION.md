# Email Queue Implementation - CRO-100

## Overview

This document details the implementation of comprehensive error handling, retry logic, and delivery status tracking for the email service as specified in Linear issue CRO-100.

## Features Implemented

### 1. **Email Queue with BullMQ**
- **Technology**: BullMQ with Redis backend
- **Location**: `src/lib/services/emailQueue.ts`
- **Features**:
  - Job-based email processing with persistent queue
  - Automatic retry with exponential backoff
  - Dead letter queue for permanently failed emails
  - Circuit breaker pattern for SendGrid failures
  - Concurrent processing (up to 10 emails simultaneously)
  - Rate limiting (100 jobs per second)

### 2. **Retry Logic with Exponential Backoff**
- **Max Attempts**: 5 retries per email
- **Backoff Strategy**: Exponential with jitter
  - Base delay: 1 second
  - Max delay: 5 minutes
  - Formula: `min(baseDelay * 2^attempt + random(0-1000), maxDelay)`
- **Custom Backoff**: Calculated based on attempt number to prevent thundering herd

### 3. **Error Categorization**
Errors are categorized into retryable and non-retryable types:

#### **Retryable Errors** (will retry):
- `RATE_LIMIT`: SendGrid rate limit exceeded (429)
- `TIMEOUT`: Network timeout or slow response
- `SERVICE_UNAVAILABLE`: SendGrid service issues (500, 502, 503, 504)
- `UNKNOWN`: Unclassified errors (treated as potentially retryable)

#### **Non-Retryable Errors** (moved to DLQ):
- `INVALID_EMAIL`: Invalid email address format
- `BLOCKED`: Recipient blocked/suppressed
- `BOUNCE`: Hard bounce (email doesn't exist)
- `SPAM`: Marked as spam by recipient

### 4. **Dead Letter Queue (DLQ)**
- **Purpose**: Store permanently failed emails for manual review
- **Features**:
  - Stores original job data with error metadata
  - Never auto-removes failed jobs
  - Provides retry capability via `retryDeadLetterJob(jobId)`
  - Tracks error category, message, and failure timestamp

### 5. **Circuit Breaker Pattern**
Protects against cascading failures when SendGrid is down:
- **States**:
  - `CLOSED`: Normal operation
  - `OPEN`: SendGrid failures detected, requests blocked
  - `HALF-OPEN`: Testing if service recovered

- **Thresholds**:
  - Opens after 5 consecutive failures
  - Closes after 2 consecutive successes in half-open state
  - Timeout: 1 minute before transitioning to half-open

### 6. **SendGrid Webhook Integration**
- **Endpoint**: `/api/webhooks/sendgrid`
- **Location**: `src/app/api/webhooks/sendgrid/route.ts`
- **Security**: ECDSA signature verification with public key
- **Events Tracked**:
  - `delivered`: Successful delivery
  - `bounce`: Hard/soft bounces
  - `blocked`: Recipient blocked
  - `dropped`: Dropped by SendGrid
  - `spam_report`: Marked as spam
  - `unsubscribe`: User unsubscribed
  - `open`: Email opened (if tracking enabled)
  - `click`: Link clicked (if tracking enabled)

### 7. **Enhanced Email Service**
Updated `serverEmailService.ts` to integrate with queue:
- **Auto-Queue**: Uses queue when Redis is available
- **Fallback**: Direct send if queue unavailable
- **Bulk Email Support**: Efficient bulk queuing
- **Monitoring**: Queue metrics and circuit breaker status

## Architecture

```
┌─────────────────┐
│  Email Service  │
│  (singleton)    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐      ┌──────────────┐
│  Email Queue    │◄────►│    Redis     │
│  (BullMQ)       │      │   Backend    │
└────────┬────────┘      └──────────────┘
         │
         ▼
┌─────────────────┐
│ Queue Worker    │
│ (processes jobs)│
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Circuit Breaker │
└────────┬────────┘
         │
         ▼
┌─────────────────┐      ┌──────────────┐
│   SendGrid API  │◄────►│   Webhooks   │
└─────────────────┘      └──────────────┘
```

## Configuration

### Environment Variables

Add to `.env.local`:

```env
# Redis (required for queue functionality)
REDIS_URL=redis://localhost:6379

# SendGrid Webhook Security (required in production)
SENDGRID_WEBHOOK_PUBLIC_KEY=your_public_key_here
SENDGRID_WEBHOOK_RELAXED_VALIDATION=false
```

### Redis Setup

**Local Development:**
```bash
# Using Docker
docker run -d -p 6379:6379 redis:alpine

# Using Homebrew (macOS)
brew install redis
brew services start redis
```

**Production:**
- Use managed Redis service (Redis Cloud, AWS ElastiCache, etc.)
- Set `REDIS_URL` environment variable

### SendGrid Webhook Setup

1. **Get Public Key** from SendGrid:
   - Go to SendGrid Dashboard → Settings → Mail Settings → Event Webhook
   - Copy the public key

2. **Configure Webhook URL**:
   - URL: `https://yourdomain.com/api/webhooks/sendgrid`
   - Select events to track
   - Enable signature verification

3. **Set Environment Variables**:
   ```env
   SENDGRID_WEBHOOK_PUBLIC_KEY=your_public_key_here
   SENDGRID_WEBHOOK_RELAXED_VALIDATION=false
   ```

   For local development without a public key you can temporarily set `SENDGRID_WEBHOOK_RELAXED_VALIDATION=true`, but this must remain `false` in production environments.

## Usage

### Basic Email Sending
The service automatically uses the queue when Redis is available:

```typescript
import { serverEmailService } from '@/lib/services/serverEmailService'

// Automatically queued if Redis available, otherwise sends directly
const result = await serverEmailService.sendEmail({
  to: 'user@example.com',
  subject: 'Test Email',
  html: '<p>Hello World</p>',
  text: 'Hello World'
})

// Returns { success: true, messageId: '...', statusCode: 202 } if queued
```

### Bulk Email Sending
```typescript
const emails = [
  { to: 'user1@example.com', subject: 'Test 1', html: '...', text: '...' },
  { to: 'user2@example.com', subject: 'Test 2', html: '...', text: '...' }
]

const results = await serverEmailService.sendBulkEmails(emails)
```

### Monitoring Queue Metrics
```typescript
const metrics = await serverEmailService.getQueueMetrics()

console.log(metrics)
// {
//   emailQueue: {
//     waiting: 5,
//     active: 2,
//     completed: 100,
//     failed: 3,
//     delayed: 1
//   },
//   deadLetterQueue: {
//     count: 2
//   },
//   circuitBreaker: {
//     state: 'closed'
//   }
// }
```

### Retrying Failed Emails
```typescript
// Retry an email from dead letter queue
const job = await serverEmailService.retryFailedEmail('job-id-123')
```

### Checking Service Status
```typescript
const status = serverEmailService.getStatus()

console.log(status)
// {
//   configured: true,
//   apiKey: true,
//   fromEmail: true,
//   environmentValid: true,
//   queueEnabled: true,
//   circuitBreakerState: 'closed'
// }
```

## Error Handling Flow

```
Email Request
     │
     ▼
[Validate Email]
     │
     ▼
[Queue Available?] ─No─→ [Send Directly]
     │                          │
    Yes                         ▼
     │                    [Circuit Breaker]
     ▼                          │
[Add to Queue]                  ▼
     │                    [SendGrid API]
     ▼                          │
[Queue Worker]                  ▼
     │                    [Success/Failure]
     ▼
[Circuit Breaker]
     │
     ▼
[SendGrid API]
     │
     ▼
[Error?] ─No─→ [Success]
     │
    Yes
     │
     ▼
[Categorize Error]
     │
     ▼
[Retryable?] ─Yes─→ [Calculate Backoff] ─→ [Retry]
     │                                           │
     No                                          ▼
     │                                    [Max Attempts?] ─No─→ [Back to Retry]
     ▼                                           │
[Move to DLQ]                                   Yes
                                                 │
                                                 ▼
                                          [Move to DLQ]
```

## Testing

### Queue Functionality
```bash
# Ensure Redis is running
docker run -d -p 6379:6379 redis:alpine

# Run tests
npm test
```

### Webhook Testing
```bash
# Use SendGrid's test event feature or send test POST request
curl -X POST http://localhost:3000/api/webhooks/sendgrid \
  -H "Content-Type: application/json" \
  -d '[{"email":"test@example.com","event":"delivered","smtp-id":"<test@example.com>"}]'
```

## Monitoring & Operations

### Key Metrics to Monitor
1. **Queue Depth**: Number of waiting jobs
2. **Processing Rate**: Jobs completed per minute
3. **Failure Rate**: Percentage of failed jobs
4. **DLQ Size**: Number of permanently failed emails
5. **Circuit Breaker State**: Open/Closed/Half-Open
6. **Retry Count**: Average retries per email

### Operational Procedures

#### Handling High Queue Depth
```typescript
// Scale workers by increasing concurrency
// In emailQueue.ts, adjust:
concurrency: 20 // Increase from 10
```

#### Clearing Dead Letter Queue
```typescript
// Review failed emails
const metrics = await emailQueue.getQueueMetrics()
console.log(`DLQ has ${metrics.deadLetterQueue.count} failed emails`)

// Retry specific email
await emailService.retryFailedEmail('job-id')
```

#### Manual Circuit Breaker Reset
```typescript
const emailQueue = getEmailQueue()
emailQueue.resetCircuitBreaker()
```

## Performance Characteristics

### Queue Performance
- **Throughput**: ~100 emails/second (with rate limiting)
- **Concurrency**: 10 parallel workers (configurable)
- **Max Retries**: 5 attempts per email
- **Max Backoff**: 5 minutes between retries

### Resource Usage
- **Redis Memory**: ~1KB per queued job
- **Worker Memory**: ~50MB per worker process
- **Network**: SendGrid API rate limits apply

## Troubleshooting

### Queue Not Starting
1. Check Redis connection: `redis-cli ping`
2. Verify `REDIS_URL` environment variable
3. Check logs for connection errors

### Emails Not Being Processed
1. Check queue metrics for stuck jobs
2. Verify circuit breaker state (should be `closed`)
3. Check SendGrid API status
4. Review worker logs for errors

### High DLQ Count
1. Review error categories in DLQ jobs
2. Check for invalid email addresses
3. Verify SendGrid configuration
4. Review bounce/spam patterns

### Webhook Not Receiving Events
1. Verify webhook URL in SendGrid dashboard
2. Check signature verification (public key)
3. Review webhook endpoint logs
4. Test with SendGrid's test event feature

## Files Modified/Created

### New Files
- `src/lib/services/emailQueue.ts` - Email queue service with BullMQ
- `src/app/api/webhooks/sendgrid/route.ts` - SendGrid webhook handler
- `docs/EMAIL_QUEUE_IMPLEMENTATION.md` - This documentation

### Modified Files
- `src/lib/services/serverEmailService.ts` - Integrated with queue
- `src/lib/env.ts` - Added Redis and webhook configuration
- `package.json` - Added bullmq and ioredis dependencies

## Dependencies Added
- `bullmq@^5.59.0` - Job queue management
- `ioredis@^5.8.0` - Redis client

## Future Enhancements

1. **Database Integration**
   - Store email delivery status in database
   - Track email engagement metrics
   - Maintain email audit log

2. **Advanced Monitoring**
   - Prometheus metrics export
   - Grafana dashboards
   - Email delivery analytics

3. **Smart Retry Logic**
   - ML-based retry prediction
   - Time-based retry scheduling
   - Recipient-specific retry strategies

4. **Enhanced Security**
   - Email content encryption
   - PII detection and redaction
   - Advanced spam prevention

## Acceptance Criteria Status

- ✅ Implement retry logic with exponential backoff
- ✅ Add proper error categorization (bounce, block, spam, etc.)
- ✅ Create dead letter queue for permanently failed emails
- ✅ Add email delivery status webhooks from SendGrid
- ✅ Implement circuit breaker pattern for SendGrid failures
- ✅ Use job queue (BullMQ) for reliable email processing with retries

## References

- [BullMQ Documentation](https://docs.bullmq.io/)
- [SendGrid Event Webhook](https://docs.sendgrid.com/for-developers/tracking-events/event)
- [Circuit Breaker Pattern](https://microservices.io/patterns/reliability/circuit-breaker.html)
- [Exponential Backoff](https://en.wikipedia.org/wiki/Exponential_backoff)
