# Upstash Redis Setup for Rate Limiting

This guide walks through setting up Upstash Redis for rate limiting the AI analysis edge function.

## Prerequisites

- Supabase project with Edge Functions enabled
- Upstash account (free tier available)
- Supabase CLI installed

## Step 1: Create Upstash Redis Database

### 1.1 Sign Up for Upstash

1. Go to [upstash.com](https://upstash.com)
2. Sign up with GitHub, Google, or email
3. Verify your email

### 1.2 Create Redis Database

1. Click "Create Database" in the dashboard
2. Configure your database:

   **Name**: `tribe-mvp-rate-limiting`

   **Type**: Regional (faster) or Global (multi-region)
   - Regional: Lower latency, single region
   - Global: Higher latency, replicated globally

   **Region**: Choose closest to your Supabase region
   - US East (N. Virginia) - `us-east-1`
   - EU West (Ireland) - `eu-west-1`
   - Asia Pacific (Singapore) - `ap-southeast-1`

   **Pricing**: Free tier (10,000 requests/day)

3. Click "Create"

### 1.3 Get Connection Credentials

After creation, you'll see the database dashboard:

1. Navigate to the "REST API" tab
2. Copy these values:
   - **UPSTASH_REDIS_REST_URL**: `https://your-db-name.upstash.io`
   - **UPSTASH_REDIS_REST_TOKEN**: `AXXXxxxx...`

## Step 2: Configure Supabase Secrets

### 2.1 Set Secrets via CLI

```bash
# Navigate to your project directory
cd /path/to/tribe_mvp

# Set Upstash Redis credentials
supabase secrets set UPSTASH_REDIS_REST_URL=https://your-db-name.upstash.io
supabase secrets set UPSTASH_REDIS_REST_TOKEN=AXXXxxxx...

# Verify secrets are set
supabase secrets list
```

### 2.2 Set Secrets via Dashboard

Alternatively, use the Supabase Dashboard:

1. Go to your Supabase project
2. Navigate to **Settings** → **Edge Functions**
3. Scroll to **Secrets**
4. Add two secrets:
   - Key: `UPSTASH_REDIS_REST_URL`, Value: `https://...`
   - Key: `UPSTASH_REDIS_REST_TOKEN`, Value: `AXXXxxxx...`

## Step 3: Deploy Edge Function

```bash
# Deploy the ai-analyze-update function
supabase functions deploy ai-analyze-update

# The rate limiter will automatically initialize on first request
```

## Step 4: Verify Setup

### 4.1 Check Function Logs

```bash
# Stream function logs
supabase functions logs ai-analyze-update --follow
```

Look for:
```
✓ Rate limiter initialized successfully
✓ Rate limit check passed for parent xxx: 9/10 remaining
```

### 4.2 Test Rate Limiting

Run the test script:

```bash
cd supabase/functions/ai-analyze-update
./test-rate-limit.sh
```

Expected output:
- Requests 1-10: ✓ Success (200)
- Requests 11+: ✗ Rate Limited (429)

### 4.3 Manual Test

```bash
# Test with curl
curl -X POST http://localhost:54321/functions/v1/ai-analyze-update \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -d '{
    "update_id": "550e8400-e29b-41d4-a716-446655440000",
    "content": "Emma took her first steps!",
    "child_age_months": 12,
    "parent_id": "test-parent-123"
  }'
```

Check response headers:
```
X-RateLimit-Limit: 10
X-RateLimit-Remaining: 9
X-RateLimit-Reset: 1709236800000
```

## Step 5: Monitor Redis Usage

### 5.1 Upstash Dashboard

1. Go to [console.upstash.com](https://console.upstash.com)
2. Select your database
3. View metrics:
   - **Requests**: Total requests per time period
   - **Data Size**: Storage used (should be minimal)
   - **Throughput**: Requests per second

### 5.2 Redis CLI

Upstash provides a built-in CLI in the dashboard:

```redis
# View all rate limit keys
KEYS rate_limit:*

# Check a specific parent's rate limit
ZCARD ai_analysis:parent-uuid-here

# View entries in sorted set
ZRANGE ai_analysis:parent-uuid-here 0 -1 WITHSCORES

# Manually reset a parent's rate limit (testing only)
DEL ai_analysis:parent-uuid-here
```

## Configuration

### Rate Limit Tiers

Edit `supabase/functions/_shared/rate-limiter.ts`:

```typescript
export const RATE_LIMITS = {
  // Standard: 10 requests per minute
  AI_ANALYSIS: {
    limit: 10,
    window: 60,
    prefix: 'ai_analysis',
  },

  // Strict: 5 requests per minute
  AI_ANALYSIS_STRICT: {
    limit: 5,
    window: 60,
    prefix: 'ai_analysis_strict',
  },

  // Global IP limit: 50 requests per minute
  GLOBAL_IP: {
    limit: 50,
    window: 60,
    prefix: 'global_ip',
  },
}
```

### Switch Rate Limit Tier

In `supabase/functions/ai-analyze-update/index.ts`:

```typescript
// Use stricter rate limit
const rateLimitResult = await rateLimiter.limit(
  requestData.parent_id,
  RATE_LIMITS.AI_ANALYSIS_STRICT // Change this
)
```

## Cost Estimation

### Free Tier Limits

Upstash Free Tier includes:
- **10,000 commands/day**
- **256 MB data**
- **TLS support**
- **REST API access**

### Usage Calculation

Each rate limit check uses ~4 Redis commands:
1. `ZADD` - Add request
2. `ZREMRANGEBYSCORE` - Remove old entries
3. `ZCARD` - Count entries
4. `EXPIRE` - Set TTL

**Daily capacity**: 10,000 / 4 = ~2,500 AI analysis requests/day

### Paid Tier Pricing

If you exceed free tier:
- **Pay-as-you-go**: $0.20 per 100,000 commands
- **Pro Plan**: $10/month for 1M commands/day

For 100,000 AI analyses/month:
- Commands: 400,000
- Cost: $0.80/month (pay-as-you-go)

## Troubleshooting

### Rate Limiter Not Initializing

**Error**: `Missing Upstash Redis credentials`

**Solution**:
1. Verify secrets are set: `supabase secrets list`
2. Redeploy function: `supabase functions deploy ai-analyze-update`
3. Check environment variables in function logs

### Rate Limiting Not Working

**Symptom**: All requests succeed, none are rate limited

**Debugging**:

```bash
# Check Redis connection
supabase functions invoke ai-analyze-update --data '{"update_id":"test","content":"test","child_age_months":6,"parent_id":"test"}'

# View function logs
supabase functions logs ai-analyze-update --follow
```

Look for:
- `Rate limiter initialization failed` - Check credentials
- `Rate limit check passed` - Rate limiter is working
- `Rate limiter error` - Check Redis connectivity

### Redis Connection Timeout

**Error**: `Request timeout`

**Possible causes**:
1. **Upstash region mismatch**: Use region closest to Supabase
2. **Network issues**: Check Upstash status page
3. **TLS issues**: Ensure using `https://` URL

**Solution**:
- Create new database in same region as Supabase
- Check [status.upstash.com](https://status.upstash.com)

### Rate Limit Too Strict/Lenient

**Adjust limits** in `_shared/rate-limiter.ts`:

```typescript
AI_ANALYSIS: {
  limit: 20,      // Increase/decrease
  window: 60,     // Keep at 60s
  prefix: 'ai_analysis',
}
```

**Deploy changes**:
```bash
supabase functions deploy ai-analyze-update
```

### Testing Rate Limit Reset

**Manual reset** via Redis CLI in Upstash dashboard:

```redis
# Reset specific parent
DEL ai_analysis:parent-uuid

# Reset all rate limits (testing only!)
KEYS ai_analysis:*
# Then delete each key individually
```

## Security Considerations

### 1. Credential Security

✅ **Do**:
- Use Supabase secrets management
- Rotate tokens periodically
- Use different Redis databases for dev/staging/prod

❌ **Don't**:
- Commit credentials to git
- Share credentials in chat/email
- Use same Redis for multiple projects

### 2. Data Privacy

- Redis only stores:
  - Rate limit counters
  - Timestamps
  - Request IDs
- **No user data** or update content
- Keys auto-expire after window

### 3. Fail-Safe Behavior

Rate limiter fails **open** (allows requests) if:
- Redis is unavailable
- Connection timeout
- Credentials invalid

This ensures availability over strict rate limiting.

## Best Practices

### 1. Monitoring

Set up alerts in Upstash dashboard:
- Daily request count > 8,000 (80% of free tier)
- Error rate > 5%
- Latency > 200ms

### 2. Testing

Test rate limiting in **staging** before production:
```bash
# Use separate Redis database for staging
supabase secrets set UPSTASH_REDIS_REST_URL=https://staging-db.upstash.io --env staging
```

### 3. Documentation

Update rate limit documentation when changing limits:
- Update README.md
- Notify frontend team
- Update API documentation

### 4. Graceful Degradation

Frontend should handle 429 responses:

```typescript
try {
  const response = await fetch('/ai-analyze-update', { ... })

  if (response.status === 429) {
    const data = await response.json()
    showToast(`Too many requests. Try again in ${data.retry_after}s`)
    return
  }
} catch (error) {
  // Handle error
}
```

## Additional Resources

- [Upstash Docs](https://upstash.com/docs/redis/overall/getstarted)
- [Supabase Edge Functions](https://supabase.com/docs/guides/functions)
- [Redis Sorted Sets](https://redis.io/docs/data-types/sorted-sets/)
- [Rate Limiting Algorithms](https://upstash.com/blog/upstash-ratelimit)

## Support

If you encounter issues:

1. **Upstash**: [support@upstash.com](mailto:support@upstash.com)
2. **Supabase**: [Discord](https://discord.supabase.com)
3. **This project**: Open GitHub issue

## Next Steps

After setup:

1. ✅ Test rate limiting with test script
2. ✅ Monitor Redis usage for 1 week
3. ✅ Adjust limits based on actual usage
4. ✅ Set up monitoring alerts
5. ✅ Document rate limits in API docs
6. ✅ Update frontend to handle 429 responses
