# Database Connection Pooling Guide

## Overview

This document provides comprehensive guidance on configuring and managing database connection pooling for the Tribe MVP application. Proper connection pool configuration is critical for:

- **Performance**: Efficient connection reuse reduces latency
- **Scalability**: Handle more concurrent users without connection exhaustion
- **Reliability**: Prevent cascading failures through connection limits
- **Cost Optimization**: Stay within Supabase connection limits

## Table of Contents

1. [Architecture](#architecture)
2. [Configuration](#configuration)
3. [Production Deployment](#production-deployment)
4. [Monitoring](#monitoring)
5. [Troubleshooting](#troubleshooting)
6. [Best Practices](#best-practices)

## Architecture

### Supabase Connection Pooling

Supabase uses **PgBouncer** for connection pooling, which provides two connection modes:

#### Transaction Mode (Port 6543) - Recommended

- **Use Case**: Most application workloads
- **Benefits**:
  - Better connection reuse
  - Higher concurrency
  - Lower memory footprint
- **Limitations**:
  - No prepared statements across transactions
  - No session-level temporary tables
  - No LISTEN/NOTIFY

```typescript
// Connection string for transaction mode
postgresql://postgres:password@db.project.supabase.co:6543/postgres?pgbouncer=true
```

#### Session Mode (Port 5432) - Direct Connection

- **Use Case**: Features requiring persistent sessions
- **Benefits**:
  - Full PostgreSQL feature support
  - Prepared statements
  - Session variables
- **Limitations**:
  - Lower connection capacity
  - Higher memory usage

```typescript
// Connection string for session mode
postgresql://postgres:password@db.project.supabase.co:5432/postgres
```

### Application Connection Pool

Our application implements an additional connection pool layer:

```
┌─────────────────────────────────────────────────┐
│          Application Layer                       │
│  ┌─────────────────────────────────────────┐   │
│  │   Connection Pool Manager                │   │
│  │   - Pool size configuration              │   │
│  │   - Connection lifecycle management      │   │
│  │   - Health monitoring                    │   │
│  └─────────────────────────────────────────┘   │
└─────────────────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────┐
│         Supabase PgBouncer                       │
│  ┌─────────────────────────────────────────┐   │
│  │   Connection Pool                        │   │
│  │   - Transaction/Session mode             │   │
│  │   - Connection queuing                   │   │
│  └─────────────────────────────────────────┘   │
└─────────────────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────┐
│         PostgreSQL Database                      │
└─────────────────────────────────────────────────┘
```

## Configuration

### Environment Variables

Copy `.env.connection-pool.example` to your `.env.local`:

```bash
cp .env.connection-pool.example .env.local
```

### Development Configuration

Recommended settings for local development:

```env
DATABASE_POOL_MAX=10
DATABASE_POOL_MIN=2
DATABASE_CONNECTION_TIMEOUT=5000
DATABASE_IDLE_TIMEOUT=10000
DATABASE_MAX_LIFETIME=600000
DATABASE_STATEMENT_TIMEOUT=60000
DATABASE_LOG_SLOW_QUERIES=true
DATABASE_SLOW_QUERY_THRESHOLD=2000
```

### Production Configuration

Recommended settings for production:

```env
DATABASE_POOL_MAX=20
DATABASE_POOL_MIN=5
DATABASE_CONNECTION_TIMEOUT=10000
DATABASE_IDLE_TIMEOUT=30000
DATABASE_MAX_LIFETIME=1800000
DATABASE_STATEMENT_TIMEOUT=30000
DATABASE_LOG_SLOW_QUERIES=true
DATABASE_SLOW_QUERY_THRESHOLD=1000
```

### Configuration Parameters

| Parameter | Description | Development | Production |
|-----------|-------------|-------------|------------|
| `DATABASE_POOL_MAX` | Maximum connections | 10 | 20-50 |
| `DATABASE_POOL_MIN` | Minimum idle connections | 2 | 5-10 |
| `DATABASE_CONNECTION_TIMEOUT` | Connection wait timeout (ms) | 5000 | 10000 |
| `DATABASE_IDLE_TIMEOUT` | Idle connection timeout (ms) | 10000 | 30000 |
| `DATABASE_MAX_LIFETIME` | Connection lifetime (ms) | 600000 | 1800000 |
| `DATABASE_STATEMENT_TIMEOUT` | Query timeout (ms) | 60000 | 30000 |
| `DATABASE_LOG_SLOW_QUERIES` | Enable slow query logging | true | true |
| `DATABASE_SLOW_QUERY_THRESHOLD` | Slow query threshold (ms) | 2000 | 1000 |

## Production Deployment

### Step 1: Configure Supabase

1. **Navigate to Supabase Dashboard**
   - Go to your project settings
   - Click on "Database" → "Connection String"

2. **Get Database Password**
   ```
   Settings → Database → Connection String → [Show]
   ```

3. **Note Connection Limits**
   - Free Tier: 60 concurrent connections
   - Pro Tier: 200 concurrent connections
   - Enterprise: Custom limits

### Step 2: Configure Environment Variables

#### Vercel

```bash
# Set production environment variables
vercel env add DATABASE_POOL_MAX production
vercel env add DATABASE_POOL_MIN production
vercel env add DATABASE_CONNECTION_TIMEOUT production
vercel env add DATABASE_IDLE_TIMEOUT production
vercel env add DATABASE_MAX_LIFETIME production
vercel env add DATABASE_STATEMENT_TIMEOUT production
vercel env add SUPABASE_DB_PASSWORD production
```

#### Railway

1. Navigate to your project
2. Click "Variables"
3. Add each environment variable

#### Docker

```yaml
# docker-compose.yml
services:
  app:
    environment:
      - DATABASE_POOL_MAX=20
      - DATABASE_POOL_MIN=5
      - DATABASE_CONNECTION_TIMEOUT=10000
      - DATABASE_IDLE_TIMEOUT=30000
      - DATABASE_MAX_LIFETIME=1800000
      - DATABASE_STATEMENT_TIMEOUT=30000
      - SUPABASE_DB_PASSWORD=${SUPABASE_DB_PASSWORD}
```

### Step 3: Test Configuration

Deploy to staging environment first:

```bash
# Run health check
curl https://your-staging-url.vercel.app/api/health

# Monitor logs for connection pool messages
vercel logs
```

### Step 4: Production Deployment

```bash
# Deploy to production
vercel --prod

# Monitor connection pool metrics
# Check application logs for:
# - "Connection pool configuration loaded"
# - "High connection pool utilization" warnings
```

## Monitoring

### Application Monitoring

The application provides built-in connection pool monitoring:

```typescript
import { poolMonitor } from '@/lib/supabase/connection-pool'

// Get current statistics
const stats = poolMonitor.getCurrentStats()

// Get metrics for dashboards
const metrics = poolMonitor.getMetrics()
```

### Key Metrics to Monitor

1. **Pool Utilization**
   - Target: < 70% average
   - Warning: > 80%
   - Critical: > 90%

2. **Active Connections**
   - Monitor peak usage
   - Compare against max pool size

3. **Waiting Requests**
   - Should be 0 under normal load
   - Any value > 0 indicates pool exhaustion

4. **Slow Queries**
   - Monitor query execution times
   - Identify optimization opportunities

### Monitoring Dashboard Example

```typescript
// Example API endpoint for monitoring
export async function GET() {
  const metrics = poolMonitor.getMetrics()

  return Response.json({
    pool: {
      current: metrics.current,
      utilization: {
        current: metrics.current?.utilizationPercent,
        average: metrics.averageUtilization,
        max: metrics.maxUtilization
      }
    },
    health: metrics.averageUtilization < 70 ? 'healthy' : 'warning'
  })
}
```

### Supabase Dashboard Monitoring

1. Navigate to **Database** → **Database Usage**
2. Monitor:
   - Active connections graph
   - Connection spikes
   - Connection limit proximity

## Troubleshooting

### Connection Pool Exhausted

**Symptoms:**
- Requests timing out
- "Too many connections" errors
- High latency spikes

**Solutions:**

1. **Increase Pool Size** (Short-term)
   ```env
   DATABASE_POOL_MAX=30  # Increase gradually
   ```

2. **Find Connection Leaks** (Long-term)
   ```typescript
   // Always close connections properly
   try {
     const { data } = await supabase.from('table').select('*')
   } finally {
     // Connection automatically returned to pool
   }
   ```

3. **Optimize Query Performance**
   - Add database indexes
   - Reduce query complexity
   - Implement caching

### Slow Query Performance

**Symptoms:**
- Queries exceeding `DATABASE_STATEMENT_TIMEOUT`
- Slow page loads
- Timeout errors

**Solutions:**

1. **Enable Slow Query Logging**
   ```env
   DATABASE_LOG_SLOW_QUERIES=true
   DATABASE_SLOW_QUERY_THRESHOLD=1000
   ```

2. **Analyze Slow Queries**
   ```typescript
   // Check application logs for slow query warnings
   // Look for patterns in slow queries
   ```

3. **Optimize Queries**
   - Add indexes on frequently queried columns
   - Use `select()` to fetch only needed columns
   - Implement pagination for large result sets
   - Consider materialized views for complex queries

### Connection Timeouts

**Symptoms:**
- "Connection timeout" errors
- Requests failing randomly

**Solutions:**

1. **Increase Timeout**
   ```env
   DATABASE_CONNECTION_TIMEOUT=15000  # Increase to 15 seconds
   ```

2. **Check Network Latency**
   - Verify hosting provider network connectivity
   - Consider edge functions for better latency

3. **Verify Supabase Status**
   - Check https://status.supabase.com
   - Review Supabase dashboard for issues

### High Connection Utilization

**Symptoms:**
- Utilization consistently > 80%
- Connection pool warnings in logs

**Solutions:**

1. **Horizontal Scaling**
   - Increase `DATABASE_POOL_MAX` if within limits
   - Distribute load across multiple instances

2. **Implement Connection Pooling at Edge**
   - Use Supabase Edge Functions
   - Deploy to multiple regions

3. **Optimize Connection Usage**
   - Implement request coalescing
   - Use connection pooling for background jobs
   - Batch operations where possible

## Best Practices

### 1. Connection Management

✅ **Do:**
- Use transaction mode (port 6543) for most operations
- Set appropriate timeouts
- Monitor connection pool metrics
- Implement retry logic with exponential backoff

❌ **Don't:**
- Keep connections open longer than necessary
- Ignore connection pool warnings
- Set pool size too high (causes memory issues)
- Forget to handle connection errors

### 2. Query Optimization

✅ **Do:**
- Use indexes on frequently queried columns
- Fetch only required columns with `select()`
- Implement pagination for large datasets
- Use `.explain()` to analyze query performance

❌ **Don't:**
- Use `SELECT *` unnecessarily
- Ignore slow query warnings
- Make N+1 queries (use joins or batch operations)
- Run long-running queries without timeouts

### 3. Error Handling

```typescript
import { executeWithResilience } from '@/lib/supabase/connection-resilience'

// Implement retry logic with circuit breaker
const result = await executeWithResilience(
  async () => {
    const { data, error } = await supabase
      .from('updates')
      .select('*')
      .limit(10)

    if (error) throw error
    return data
  },
  {
    maxAttempts: 3,
    initialDelayMs: 1000,
    backoffMultiplier: 2
  }
)
```

### 4. Monitoring and Alerting

Set up alerts for:
- Pool utilization > 80%
- Connection timeout rate > 1%
- Slow query count > 10/minute
- Circuit breaker state changes

### 5. Capacity Planning

**Estimate Required Connections:**

```
connections_needed = (concurrent_users * avg_requests_per_user * avg_query_time) / 1000
```

Example:
- 100 concurrent users
- 5 requests per user per second
- Average query time: 50ms

```
connections_needed = (100 * 5 * 50) / 1000 = 25 connections
```

Add 20% buffer: `25 * 1.2 = 30 connections`

### 6. Load Testing

Before production deployment:

```bash
# Use artillery for load testing
npm install -g artillery

# Run load test
artillery run load-test.yml
```

Example load test configuration:

```yaml
# load-test.yml
config:
  target: 'https://your-app.vercel.app'
  phases:
    - duration: 60
      arrivalRate: 10
      name: "Warm up"
    - duration: 300
      arrivalRate: 50
      name: "Sustained load"
scenarios:
  - flow:
      - get:
          url: "/api/updates"
      - think: 2
```

## Supabase-Specific Recommendations

### Free Tier (60 connections)

```env
DATABASE_POOL_MAX=15
DATABASE_POOL_MIN=3
```

Reserve connections for:
- Application: 15
- Background jobs: 5
- Admin: 3
- Buffer: 37

### Pro Tier (200 connections)

```env
DATABASE_POOL_MAX=50
DATABASE_POOL_MIN=10
```

Reserve connections for:
- Application: 50
- Background jobs: 20
- Admin: 5
- Buffer: 125

### Connection String Format

**Transaction Mode (Pooled):**
```
postgresql://postgres:[PASSWORD]@db.[PROJECT_REF].supabase.co:6543/postgres?pgbouncer=true&pool_mode=transaction
```

**Session Mode (Direct):**
```
postgresql://postgres:[PASSWORD]@db.[PROJECT_REF].supabase.co:5432/postgres
```

## Additional Resources

- [Supabase Connection Pooling Docs](https://supabase.com/docs/guides/database/connecting-to-postgres#connection-pooler)
- [PgBouncer Documentation](https://www.pgbouncer.org/config.html)
- [PostgreSQL Connection Pooling Best Practices](https://www.postgresql.org/docs/current/runtime-config-connection.html)

## Support

For issues or questions:
1. Check application logs for connection pool warnings
2. Review Supabase dashboard for connection metrics
3. Consult this documentation
4. Contact team for assistance

---

**Last Updated:** 2025-01-01
**Version:** 1.0.0
