# Security Guidelines & Authorization Patterns

This document outlines the security patterns and authorization mechanisms implemented in the Tribe MVP application to prevent security vulnerabilities, particularly Insecure Direct Object References (IDOR).

## Overview

The application implements a comprehensive authorization system that ensures:
- ✅ All API routes require proper authentication
- ✅ User ID from JWT tokens is used to filter all database queries
- ✅ Resource ownership validation prevents unauthorized access
- ✅ Rate limiting prevents abuse
- ✅ Comprehensive logging for security auditing

## Authorization Middleware

### Core Functions

Located in `/src/lib/middleware/authorization.ts`:

#### `requireAuth(request: NextRequest)`
- Validates JWT authentication
- Extracts authenticated user information
- Returns user object or 401 error response

#### `verifyResourceOwnership(userId, resourceType, resourceId)`
- Ensures the authenticated user owns the requested resource
- Supports: `update`, `child`, `recipient`, `notification`
- Prevents horizontal privilege escalation

#### `verifyNotificationPermissions(userId, recipientEmails)`
- Validates user can send notifications to specified recipients
- Cross-references with user's recipient list
- Case-insensitive email matching

#### `checkRateLimit(userId, maxRequests, windowMinutes)`
- Per-user rate limiting
- Configurable limits per endpoint
- Prevents abuse and DoS attacks

## Secure API Patterns

### 1. Authentication-First Pattern

```typescript
export const GET = withAuth(async (request: NextRequest, user: AuthenticatedUser) => {
  // user is guaranteed to be authenticated
  // Proceed with authorized operations
})
```

### 2. Resource Ownership Validation

```typescript
// ✅ CORRECT: Always filter by user ID
const { data } = await supabase
  .from('updates')
  .select('*')
  .eq('parent_id', user.id)  // Critical: Always include user filter
  .eq('id', updateId)

// ❌ INCORRECT: Missing user filter - IDOR vulnerability
const { data } = await supabase
  .from('updates')
  .select('*')
  .eq('id', updateId)  // Any user could access any update
```

### 3. Notification Authorization

```typescript
// Verify user can send to recipients
const { allowed, ownedEmails } = await verifyNotificationPermissions(user.id, [email])
if (!allowed) {
  return NextResponse.json({ error: 'Unauthorized recipient' }, { status: 403 })
}
```

## Database Security Patterns

### Row Level Security (RLS)

All tables implement RLS policies that ensure users can only access their own data:

```sql
-- Example RLS policy for updates table
CREATE POLICY "Users can only access own updates" ON updates
  FOR ALL USING (auth.uid() = parent_id);

-- Example RLS policy for children table
CREATE POLICY "Users can only access own children" ON children
  FOR ALL USING (auth.uid() = parent_id);

-- Example RLS policy for recipients table
CREATE POLICY "Users can only access own recipients" ON recipients
  FOR ALL USING (auth.uid() = user_id);
```

### Safe Query Patterns

#### ✅ Secure Patterns

```typescript
// Always include user ID in WHERE conditions
await supabase
  .from('updates')
  .select('*')
  .eq('parent_id', user.id)

// Use authenticated user ID for inserts
await supabase
  .from('children')
  .insert({
    parent_id: user.id,  // Always set to authenticated user
    name: childData.name
  })

// Join with ownership verification
await supabase
  .from('responses')
  .select(`
    *,
    updates!inner(parent_id)
  `)
  .eq('updates.parent_id', user.id)
```

#### ❌ Vulnerable Patterns to Avoid

```typescript
// Direct access without user filtering
await supabase
  .from('updates')
  .select('*')
  .eq('id', updateId)  // IDOR vulnerability

// Using request data for user ID
await supabase
  .from('updates')
  .insert({
    parent_id: requestData.userId,  // User could specify any ID
    content: requestData.content
  })

// Missing ownership verification in updates
await supabase
  .from('updates')
  .update({ content: newContent })
  .eq('id', updateId)  // Could update anyone's record
```

## Rate Limiting

### Per-Endpoint Limits

- **Email sending**: 50 emails per 10 minutes
- **Bulk emails**: 100 emails per hour
- **Test emails**: 20 emails per 5 minutes
- **General API**: 100 requests per minute

### Implementation

```typescript
// Check rate limit before processing
if (!checkRateLimit(user.id, 50, 10)) {
  return NextResponse.json(
    { error: 'Rate limit exceeded. Please try again later.' },
    { status: 429 }
  )
}
```

## Security Testing

### Running Security Tests

```bash
# Run authorization tests
npm test -- __tests__/api/authorization

# Run all security-related tests
npm test -- --grep="security|authorization|auth"
```

### Manual Security Testing

1. **Authentication Bypass**: Try accessing APIs without auth tokens
2. **IDOR Testing**: Attempt to access resources with different user IDs
3. **Privilege Escalation**: Try to modify data belonging to other users
4. **Rate Limit Testing**: Exceed configured rate limits

## Security Monitoring

### Audit Logging

All security events are logged with structured data:

```typescript
logger.warn('Unauthorized access attempt', {
  userId,
  requestedResource: resourceId,
  resourceType,
  actualOwner,
  timestamp: new Date().toISOString()
})
```

### Key Security Events

- Authentication failures
- Authorization violations
- Rate limit exceeded
- Resource access attempts
- Bulk operation attempts

## Developer Guidelines

### Code Review Checklist

- [ ] All API routes use `requireAuth()` or `withAuth()`
- [ ] Database queries include user ID filters
- [ ] Resource ownership is verified before access
- [ ] Rate limiting is implemented appropriately
- [ ] Security logging is in place
- [ ] Tests cover authorization scenarios

### Security Best Practices

1. **Never trust client data**: Always validate and authorize
2. **Filter by user ID**: Include user context in all queries
3. **Validate ownership**: Check resource ownership before access
4. **Log security events**: Maintain audit trails
5. **Test authorization**: Include negative test cases
6. **Regular security reviews**: Audit new code for vulnerabilities

## Emergency Response

### Security Incident Response

1. **Immediate**: Block suspicious IP addresses if needed
2. **Investigation**: Check audit logs for scope of breach
3. **Notification**: Inform affected users if data was accessed
4. **Remediation**: Fix vulnerabilities and deploy patches
5. **Review**: Conduct post-incident review and improve security

### Security Contact

For security vulnerabilities or questions:
- Create issue with `security` label
- Follow responsible disclosure practices
- Provide clear reproduction steps

## Compliance Notes

This authorization system helps meet compliance requirements for:
- **GDPR**: User consent and data access controls
- **SOC 2**: Access controls and audit logging
- **HIPAA**: Patient data protection (if applicable)
- **General Data Protection**: User privacy and security

## Changelog

### 2024-12-XX - Initial Security Implementation
- Added comprehensive authorization middleware
- Fixed IDOR vulnerabilities in email APIs
- Implemented rate limiting
- Added security test suite
- Created security documentation

---

**Remember**: Security is an ongoing process. Regularly review and update these patterns as the application evolves.