# AI Analyze Update Edge Function

This edge function analyzes baby/child update content using OpenAI's GPT-4 to provide intelligent recipient suggestions and content insights.

## Features

- **AI-Powered Analysis**: Uses GPT-4o-mini to analyze update content, tone, and importance
- **Smart Recipient Suggestions**: Recommends appropriate recipients based on content and relationship types
- **Rate Limiting**: Protects against abuse with Redis-backed rate limiting
- **Sliding Window Algorithm**: Accurate rate limiting using Redis sorted sets

## Rate Limiting

### Configuration

The function implements rate limiting by `parent_id` to prevent abuse:

- **Limit**: 10 requests per minute per parent
- **Window**: 60 seconds (sliding window)
- **Implementation**: Upstash Redis with sorted sets

### Rate Limit Headers

All responses include rate limit information:

```
X-RateLimit-Limit: 10
X-RateLimit-Remaining: 7
X-RateLimit-Reset: 1709236800000
```

### Rate Limit Response (429)

When rate limit is exceeded:

```json
{
  "success": false,
  "error": "Rate limit exceeded",
  "message": "Too many AI analysis requests. Please try again in 45 seconds.",
  "retry_after": 45,
  "limit": 10,
  "remaining": 0,
  "reset": 1709236800000
}
```

Headers:
```
Status: 429 Too Many Requests
Retry-After: 45
X-RateLimit-Limit: 10
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 1709236800000
```

## Environment Variables

### Required

```bash
# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# OpenAI
OPENAI_API_KEY=sk-your-openai-api-key

# Upstash Redis (for rate limiting)
UPSTASH_REDIS_REST_URL=https://your-redis.upstash.io
UPSTASH_REDIS_REST_TOKEN=your-redis-token
```

### Setup Upstash Redis

1. Create account at [upstash.com](https://upstash.com)
2. Create a new Redis database (Global or Regional)
3. Copy REST URL and REST Token
4. Add to Supabase Edge Function secrets:

```bash
supabase secrets set UPSTASH_REDIS_REST_URL=https://your-redis.upstash.io
supabase secrets set UPSTASH_REDIS_REST_TOKEN=your-redis-token
```

## Request Format

```typescript
POST /ai-analyze-update

{
  "update_id": "uuid",
  "content": "Emma took her first steps today!",
  "child_age_months": 12,
  "milestone_type": "motor_skills", // optional
  "parent_id": "uuid"
}
```

## Response Format

### Success (200)

```json
{
  "success": true,
  "analysis": {
    "keywords": ["first steps", "walking", "milestone"],
    "emotional_tone": "excited",
    "importance_level": 9,
    "suggested_recipient_types": ["grandparent", "close_family"],
    "suggested_recipients": [],
    "confidence_score": 0.92
  },
  "suggested_recipients": ["uuid1", "uuid2", "uuid3"]
}
```

### Error (500)

```json
{
  "success": false,
  "error": "Error message"
}
```

## Rate Limiting Implementation Details

### Sliding Window Algorithm

The rate limiter uses Redis sorted sets to implement a precise sliding window:

1. **Add Request**: Current timestamp as score and unique ID as member
2. **Remove Old**: Delete entries outside the time window
3. **Count**: Get cardinality of sorted set
4. **Compare**: Check if count exceeds limit
5. **Expire**: Set TTL on the key for automatic cleanup

### Benefits

- ✅ **Accurate**: True sliding window, not fixed buckets
- ✅ **Efficient**: Single Redis pipeline with 4 commands
- ✅ **Scalable**: Stateless, works across multiple function instances
- ✅ **Graceful**: Fails open if Redis is unavailable
- ✅ **Observable**: Returns remaining quota in headers

### Rate Limit Tiers

Configured in `_shared/rate-limiter.ts`:

```typescript
export const RATE_LIMITS = {
  // Standard AI analysis
  AI_ANALYSIS: {
    limit: 10,
    window: 60, // 1 minute
    prefix: 'ai_analysis',
  },
  // Stricter limit for expensive operations
  AI_ANALYSIS_STRICT: {
    limit: 5,
    window: 60,
    prefix: 'ai_analysis_strict',
  },
  // Global IP-based limit
  GLOBAL_IP: {
    limit: 50,
    window: 60,
    prefix: 'global_ip',
  },
}
```

## Testing Rate Limiting

### Manual Testing

```bash
# Test script to trigger rate limit
for i in {1..15}; do
  curl -X POST http://localhost:54321/functions/v1/ai-analyze-update \
    -H "Content-Type: application/json" \
    -d '{
      "update_id": "test-id",
      "content": "Test content",
      "child_age_months": 6,
      "parent_id": "test-parent-123"
    }'
  echo "\nRequest $i"
  sleep 1
done
```

### Expected Behavior

- Requests 1-10: Success (200) with decreasing `X-RateLimit-Remaining`
- Requests 11+: Rate limited (429) with `Retry-After` header
- After 60 seconds: Rate limit resets, requests succeed again

### Reset Rate Limit (Testing)

```typescript
const limiter = new RateLimiter()
await limiter.reset('test-parent-123', 'ai_analysis')
```

## Monitoring

### Key Metrics

- **Request count**: Track `X-RateLimit-Remaining` trends
- **Rate limit hits**: Count 429 responses
- **Reset time**: Monitor `X-RateLimit-Reset` timing
- **Redis latency**: Track Redis operation duration

### Logs

```typescript
// Success
console.log(`Rate limit check passed for parent ${parent_id}: ${remaining}/${limit} remaining`)

// Rate limited
console.warn(`Rate limit exceeded for parent ${parent_id}`)

// Redis error
console.error('Rate limiter error:', error)
```

## Deployment

```bash
# Deploy function
supabase functions deploy ai-analyze-update

# Set secrets
supabase secrets set UPSTASH_REDIS_REST_URL=https://...
supabase secrets set UPSTASH_REDIS_REST_TOKEN=...
supabase secrets set OPENAI_API_KEY=sk-...

# Test function
supabase functions invoke ai-analyze-update --data '{...}'
```

## Cost Optimization

### OpenAI API Costs

- Model: `gpt-4o-mini` (~$0.15 per 1M input tokens)
- Typical request: ~500 tokens = $0.000075
- With rate limiting: Max $0.0075 per user per minute

### Redis Costs

- Upstash: Free tier includes 10,000 requests/day
- Paid: $0.20 per 100,000 requests
- Cost per million requests: ~$2.00

### Total Cost Per 1M Requests

- OpenAI: ~$150
- Redis: ~$2
- **Total: ~$152 per million AI analyses**

Rate limiting reduces cost by preventing abuse while maintaining good UX.

## Security Considerations

1. **Parent ID Validation**: Ensures users can only analyze their own updates
2. **Rate Limiting by Parent**: Prevents single user from exhausting quota
3. **Fail Open**: If Redis is down, requests proceed (availability > strict limiting)
4. **No User Data in Redis**: Only counts and timestamps stored
5. **Automatic Expiry**: Keys auto-expire after window + buffer

## Troubleshooting

### Rate Limiter Not Working

1. Check Upstash credentials are set correctly
2. Verify Redis is accessible from Supabase Edge Functions
3. Check logs for initialization errors
4. Test Redis connection with `status()` method

### Rate Limit Too Strict

Adjust in `_shared/rate-limiter.ts`:
```typescript
AI_ANALYSIS: {
  limit: 20, // Increase limit
  window: 60,
  prefix: 'ai_analysis',
}
```

### Rate Limit Too Lenient

Use stricter tier:
```typescript
const rateLimitResult = await rateLimiter.limit(
  requestData.parent_id,
  RATE_LIMITS.AI_ANALYSIS_STRICT // 5 req/min instead of 10
)
```

## Related Files

- `/supabase/functions/_shared/rate-limiter.ts` - Rate limiting utility
- `/supabase/functions/_shared/cors.ts` - CORS headers
- `/supabase/functions/_shared/types.ts` - Shared types

## References

- [Supabase Edge Functions Docs](https://supabase.com/docs/guides/functions)
- [Upstash Redis Rate Limiting](https://upstash.com/docs/redis/sdks/ratelimit-ts/overview)
- [OpenAI API Docs](https://platform.openai.com/docs/api-reference)
