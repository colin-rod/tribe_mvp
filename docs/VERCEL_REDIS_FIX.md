# Vercel Build Error Fix: Redis Connection During Build

## Problem

During Vercel deployment, the build process was failing with Redis connection errors:

```
Error: connect ECONNREFUSED 127.0.0.1:6379
```

This was happening during the "Collecting page data" phase of the Next.js build.

## Root Cause

The `EmailQueueService` class in [src/lib/services/emailQueue.ts](../src/lib/services/emailQueue.ts) was implementing an eager singleton pattern that immediately tried to connect to Redis when the module was imported, rather than waiting until the service was actually used at runtime.

The constructor was being called during module import, which happened during the build process when:
1. Next.js was analyzing pages and collecting static data
2. Redis was not available (it's only needed at runtime, not build time)

## Solution

### 1. Lazy Initialization Pattern

Modified `EmailQueueService` to use lazy initialization:

- Changed all queue-related properties to nullable (`Queue | null`, `Redis | null`, etc.)
- Moved Redis connection logic from constructor to a new `initialize()` method
- Added `ensureInitialized()` method that all public methods call before accessing queues
- Constructor now only initializes the circuit breaker (no external dependencies)

### 2. Build-Time Detection

Added checks to skip Redis initialization during build:

```typescript
// Skip initialization during build time
if (typeof window === 'undefined' && process.env.NODE_ENV !== 'production') {
  const isBuildTime = process.env.NEXT_PHASE === 'phase-production-build'
  if (isBuildTime) {
    logger.warn('Skipping Redis connection during build phase')
    return
  }
}
```

### 3. Graceful Degradation

The service now gracefully handles missing Redis configuration:

```typescript
// Check if Redis URL is configured
if (!env.REDIS_URL) {
  logger.warn('Redis URL not configured, email queue will not be available')
  return
}
```

### 4. Environment Variable Configuration

Added `REDIS_URL` environment variable to Vercel for both production and preview environments:

```bash
vercel env add REDIS_URL production
vercel env add REDIS_URL preview
```

Value: `rediss://default:AUW6AAIncDIyYjdkN2I3NTA2M2U0ODI5OTJjZTQ3YzkzODVmY2E4MHAyMTc4NTA@subtle-stingray-17850.upstash.io:6379`

## Code Changes

### Before

```typescript
export class EmailQueueService {
  private emailQueue: Queue
  private redisConnection: Redis

  private constructor() {
    // Immediately connects to Redis
    this.redisConnection = new Redis(env.REDIS_URL || 'redis://localhost:6379', {...})
    this.emailQueue = new Queue('email-queue', {
      connection: this.redisConnection,
      ...
    })
  }

  static getInstance(): EmailQueueService {
    if (!EmailQueueService.instance) {
      EmailQueueService.instance = new EmailQueueService() // ❌ Connects immediately
    }
    return EmailQueueService.instance
  }
}
```

### After

```typescript
export class EmailQueueService {
  private emailQueue: Queue | null = null
  private redisConnection: Redis | null = null
  private isInitialized = false

  private constructor() {
    // Only initialize circuit breaker (no Redis connection)
    this.circuitBreaker = new CircuitBreaker(...)
  }

  private async initialize() {
    // Skip during build time
    if (isBuildTime) {
      return
    }

    // Check for Redis URL
    if (!env.REDIS_URL) {
      logger.warn('Redis URL not configured')
      return
    }

    // Connect to Redis only when needed
    this.redisConnection = new Redis(env.REDIS_URL, {...})
    this.emailQueue = new Queue('email-queue', {
      connection: this.redisConnection,
      ...
    })
    this.isInitialized = true
  }

  private async ensureInitialized() {
    if (!this.isInitialized) {
      await this.initialize()
    }
    if (!this.emailQueue) {
      throw new Error('Email queue service not available')
    }
  }

  async addEmail(...) {
    await this.ensureInitialized() // ✅ Connects on first use
    // ... rest of method
  }
}
```

## Benefits

1. **Build Phase Compatibility**: No Redis connection attempts during Next.js build
2. **Graceful Degradation**: App can start even if Redis is temporarily unavailable
3. **Lazy Loading**: Redis connection only established when actually needed
4. **Better Error Handling**: Clear error messages when Redis is not available
5. **Production Ready**: Works correctly in all environments (local, preview, production)

## Testing

After deploying:

1. ✅ Build completes successfully without Redis connection errors
2. ✅ SMS service warning is acceptable (Twilio is optional)
3. ✅ Email queue initializes correctly at runtime when needed
4. ✅ Application starts and serves requests normally

## Related Files

- [src/lib/services/emailQueue.ts](../src/lib/services/emailQueue.ts) - Main service file
- [src/lib/services/serverEmailService.ts](../src/lib/services/serverEmailService.ts) - Uses email queue
- [.env](.env) - Redis URL configuration
- [.env.local](.env.local) - Local Redis URL override

## Environment Variables Required

| Variable | Environment | Description |
|----------|-------------|-------------|
| `REDIS_URL` | Production, Preview | Upstash Redis connection string (rediss://...) |

## Notes

- The Upstash Redis instance is configured with TLS (`rediss://` protocol)
- Connection uses default user with provided authentication token
- The email queue service will log warnings if Redis is not configured but won't crash the application
