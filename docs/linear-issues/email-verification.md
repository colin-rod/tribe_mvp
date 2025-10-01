# Email Verification for New Signups

**Priority**: High
**Category**: Authentication
**Effort**: Medium
**Labels**: authentication, security, onboarding

## Description

Implement UI and flow for Supabase's built-in email verification to ensure users have access to their registered email addresses.

## Problem Statement

Supabase Auth handles email verification automatically, but we need to build the frontend pages and user experience around it to guide users through the verification process.

## What Supabase Provides (Built-in)

✅ **Handled by Supabase:**
- Automatic verification email sending on signup
- Secure token generation and validation
- Token expiry (configurable, default 24 hours)
- Single-use token invalidation
- Email delivery via Supabase email service
- `user.email_confirmed_at` field for verification status
- `supabase.auth.resend()` API for resending verification
- Auth callback handling at `/api/auth/callback`

## What We Need to Build

1. **Verification Pending Page** (`/verify-email`)
   - "Check your email" messaging
   - Show user's email address
   - Resend email button (client-side rate limited: 3 per hour)
   - Link back to login
   - Handle auth callback redirect

2. **Verification Success Handling**
   - Handle callback from email link
   - Show success message
   - Auto-redirect to onboarding/dashboard after 3 seconds

3. **Unverified State UI**
   - Middleware to check `user.email_confirmed_at`
   - Block access to protected routes (redirect to `/verify-email`)
   - Verification banner component for unverified users
   - Allow logout without verification

4. **Custom Email Template**
   - Configure in Supabase dashboard (Authentication → Email Templates → Confirm Signup)
   - Branded design with Tribe styling
   - Clear CTA button
   - Expiry information (24 hours)

5. **Client-Side Enhancements**
   - Rate limiting on resend (localStorage tracking: 3 per hour)
   - Loading states during verification
   - Error handling for expired/invalid tokens

## Acceptance Criteria

**Frontend Pages:**
- [ ] `/verify-email` page shows "check your email" message
- [ ] Page displays user's email address
- [ ] Resend email button with loading state
- [ ] Client-side rate limiting (3 resends per hour via localStorage)
- [ ] Link to return to login
- [ ] Auth callback handling redirects to success state
- [ ] Success message shows after email verification
- [ ] Auto-redirect to onboarding after 3 seconds
- [ ] Mobile-responsive UI
- [ ] Accessibility: screen reader support, keyboard navigation, ARIA labels

**Route Protection:**
- [ ] Middleware checks `user.email_confirmed_at`
- [ ] Unverified users redirected to `/verify-email` for protected routes
- [ ] Verification banner component for unverified state
- [ ] Allow logout without requiring verification

**Email Template:**
- [ ] Custom email template configured in Supabase dashboard
- [ ] Branded design with Tribe logo and colors
- [ ] Clear "Verify Email" CTA button
- [ ] 24-hour expiry information
- [ ] Mobile-friendly email design

**Error Handling:**
- [ ] Expired token shows error with resend option
- [ ] Invalid token shows appropriate error message
- [ ] Network failures handled gracefully
- [ ] Rate limit exceeded message

## User Flow

```
1. User signs up with email/password
   ↓
2. Account created (unverified state)
   ↓
3. Verification email sent automatically
   ↓
4. User redirected to "Check Your Email" page
   ↓
5. User clicks link in email
   ↓
6. Token validated, account marked as verified
   ↓
7. Success page shown, auto-redirect to onboarding
   ↓
8. User completes onboarding and accesses app
```

## Code Examples

```typescript
// Middleware: Check verification status and protect routes
export async function middleware(request: NextRequest) {
  const supabase = createServerClient(/* ... */)
  const { data: { user } } = await supabase.auth.getUser()

  const isProtectedRoute = request.nextUrl.pathname.startsWith('/dashboard')

  if (user && !user.email_confirmed_at && isProtectedRoute) {
    return NextResponse.redirect(new URL('/verify-email', request.url))
  }

  return NextResponse.next()
}

// Resend verification email (Supabase handles the token and email sending)
async function resendVerificationEmail(email: string) {
  // Check rate limit in localStorage first (client-side)
  const rateLimitKey = `verify_resend_${email}`
  const attempts = getRateLimitAttempts(rateLimitKey)

  if (attempts >= 3) {
    throw new Error('Rate limit exceeded. Please try again later.')
  }

  const { error } = await supabase.auth.resend({
    type: 'signup',
    email: email,
  })

  if (error) throw error

  // Track attempt
  incrementRateLimitAttempts(rateLimitKey)

  return { success: true }
}
```

## UI Components

1. **Verification Pending Page** (`/verify-email`)
```tsx
<div>
  <h1>Check Your Email</h1>
  <p>We sent a verification link to {user.email}</p>
  <p>Click the link in the email to verify your account.</p>
  <Button onClick={resendEmail}>Resend Email</Button>
  <Link href="/login">Back to Login</Link>
</div>
```

2. **Verification Banner**
```tsx
<Banner type="warning">
  Please verify your email address.
  <Button onClick={resendEmail}>Resend Email</Button>
</Banner>
```

3. **Success Page**
```tsx
<div>
  <CheckCircleIcon />
  <h1>Email Verified!</h1>
  <p>Redirecting you to get started...</p>
</div>
```

## Email Template Configuration

Configure in Supabase Dashboard: **Authentication → Email Templates → Confirm Signup**

**Subject:** Verify Your Tribe Account

**Body Template:**
```html
<h2>Welcome to Tribe!</h2>
<p>Thanks for joining Tribe. To get started, please verify your email address.</p>
<p><a href="{{ .ConfirmationURL }}" style="display: inline-block; padding: 12px 24px; background-color: #4F46E5; color: white; text-decoration: none; border-radius: 6px;">Verify Email</a></p>
<p>This link will expire in 24 hours.</p>
<p>Didn't create an account? You can safely ignore this email.</p>
<p>— The Tribe Team</p>
```

**Supabase Configuration Steps:**

1. **Enable Email Confirmation** (Authentication → Settings)
   - ✅ Enable "Confirm email" under Email Auth
   - Set confirmation URL: `{{ .SiteURL }}/api/auth/callback`

2. **Set Token Expiry** (Authentication → Settings)
   - Default: 86400 seconds (24 hours)
   - Adjust if needed

3. **Customize Email Template** (Authentication → Email Templates)
   - Select "Confirm Signup" template
   - Add Tribe branding and styling
   - Test email delivery

## Security Considerations

✅ **Handled by Supabase:**
- Secure token generation and storage
- Single-use, time-limited tokens (24 hours)
- HTTPS-only verification links
- Token validation and invalidation

**Our Responsibility:**
- Client-side rate limiting on resend (3 per hour)
- Middleware route protection for unverified users
- No sensitive data displayed in UI
- Secure localStorage usage for rate limiting

## Testing Checklist

**Supabase Integration:**
- [ ] Signup triggers verification email (automatic via Supabase)
- [ ] Email is delivered successfully
- [ ] Email contains working verification link
- [ ] Clicking link verifies account (sets `email_confirmed_at`)
- [ ] Token validation works (handled by Supabase)
- [ ] Expired token returns error from Supabase

**Frontend:**
- [ ] `/verify-email` page displays correctly
- [ ] User's email address shown on page
- [ ] Resend button works
- [ ] Client-side rate limiting triggers after 3 resends
- [ ] Loading states show during API calls
- [ ] Success message displays after verification
- [ ] Auto-redirect to onboarding after 3 seconds
- [ ] Mobile-responsive UI
- [ ] Keyboard navigation works
- [ ] Screen reader support works

**Route Protection:**
- [ ] Middleware checks `user.email_confirmed_at`
- [ ] Unverified users redirected from protected routes
- [ ] Verified users can access dashboard
- [ ] Verification banner shows for unverified users
- [ ] Logout works without verification

**Email Template:**
- [ ] Email displays with Tribe branding
- [ ] CTA button is clickable
- [ ] Email renders correctly on mobile devices

## Edge Cases

1. **User changes email before verification**
   - ✅ Supabase automatically invalidates old token
   - ✅ Supabase sends new verification email
   - ✅ Supabase resets `email_confirmed_at` to null
   - **Our task:** Update UI to show new email address

2. **User tries to login before verification**
   - ✅ Supabase allows login
   - **Our task:** Middleware redirects to `/verify-email`
   - **Our task:** Show verification banner

3. **Token expired**
   - ✅ Supabase returns error on expired token
   - **Our task:** Show error message with resend button
   - **Our task:** Handle gracefully in UI

4. **Email delivery fails**
   - ✅ Supabase handles retry logic
   - **Our task:** Show error to user if API fails
   - **Our task:** Provide manual resend option

## Dependencies

- Supabase Auth (email confirmation feature - already configured)
- localStorage for client-side rate limiting tracking
- Next.js middleware for route protection

## Files to Create/Modify

**New Files:**
- `/src/app/verify-email/page.tsx` - Verification pending/success page
- `/src/components/auth/VerificationBanner.tsx` - Banner for unverified users
- `/src/components/auth/ResendVerificationButton.tsx` - Resend button with rate limiting
- `/src/lib/auth/email-verification.ts` - Client utilities and rate limiting
- `/src/lib/utils/rate-limit.ts` - localStorage-based rate limiting helper
- `/src/__tests__/auth/email-verification.test.ts` - Tests

**Modified Files:**
- `/src/middleware.ts` - Add verification check for protected routes
- `/src/app/layout.tsx` - Add verification banner for unverified users (optional)

## Estimated Effort

- Supabase email template configuration: 0.5 hours
- Verification page UI: 2 hours
- Middleware route protection: 1 hour
- Verification banner component: 1 hour
- Client-side rate limiting: 1.5 hours
- Auth callback handling: 1 hour
- Testing: 2 hours
- **Total: 9 hours** (~1.5 days)
