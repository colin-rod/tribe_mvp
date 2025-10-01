# Password Reset Flow

**Priority**: Medium
**Category**: Authentication
**Effort**: Medium
**Labels**: authentication, user-experience, security

## Description

Implement UI and custom email template for Supabase's built-in password reset flow.

## Problem Statement

Supabase Auth handles password reset tokens and security automatically. We need to build the frontend pages and customize the email template to match our brand and UX requirements.

## What Supabase Provides (Built-in)

✅ **Handled by Supabase:**
- Secure token generation and storage
- Token expiry (configurable in Supabase dashboard, default 6 hours)
- Single-use token invalidation
- HTTPS enforcement
- Token validation
- Password update API
- Rate limiting at the auth level

## What We Need to Build

1. **Request Reset Page** (`/forgot-password`)
   - Email input form with validation
   - Client-side rate limiting UI (3 per hour per IP)
   - Clear messaging about what happens next
   - Loading states and error handling

2. **Reset Password Page** (`/reset-password`)
   - Handle redirect from email link
   - New password input with strength requirements
   - Password confirmation field
   - Password strength indicator (weak/medium/strong)
   - Show/hide password toggle
   - Handle expired/invalid tokens gracefully
   - Success confirmation UI

3. **Custom Email Template**
   - Customize Supabase email template via dashboard (Authentication → Email Templates → Reset Password)
   - Include brand styling
   - Clear CTA button
   - Expiry information
   - Security notice
   - Support contact

4. **Client-Side Security Enhancements**
   - Client-side rate limiting (3 requests per hour per IP)
   - Same response for valid/invalid emails (prevent user enumeration)
   - Input sanitization and validation

## Acceptance Criteria

**Frontend Pages:**
- [ ] `/forgot-password` page with email input form
- [ ] Form validation and error handling
- [ ] Client-side rate limiting (3 per hour, localStorage tracking)
- [ ] Same response for valid/invalid emails (prevent user enumeration)
- [ ] `/reset-password` page handles token from URL
- [ ] Password strength indicator component
- [ ] Password confirmation validation
- [ ] Show/hide password toggle
- [ ] Loading states during API calls
- [ ] Success confirmation with auto-redirect to login
- [ ] Graceful handling of expired/invalid tokens
- [ ] Mobile-responsive UI
- [ ] Accessibility: keyboard navigation, screen reader support, ARIA labels

**Email Template:**
- [ ] Custom email template configured in Supabase dashboard
- [ ] Branded styling and logo
- [ ] Clear reset password CTA button
- [ ] Expiry information displayed
- [ ] Security notice included
- [ ] Support contact information

**Security:**
- [ ] Input sanitization on email field
- [ ] Password strength validation (min 8 chars, uppercase, lowercase, number)
- [ ] CSRF protection on forms
- [ ] Proper error messages that don't expose system details

## Code Examples

```typescript
// Password reset request
async function requestPasswordReset(email: string) {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/reset-password`,
  })

  // Always return success to prevent user enumeration
  return { success: true }
}

// Password reset with token
async function resetPassword(token: string, newPassword: string) {
  const { error } = await supabase.auth.updateUser({
    password: newPassword
  })

  if (error) throw error
  return { success: true }
}
```

## UI/UX Considerations

- Clear, reassuring messaging throughout the flow
- Visual feedback for each step
- Error messages that are helpful but don't expose security details
- Password strength indicator (weak/medium/strong)
- Show/hide password toggle
- Auto-focus on primary input fields
- Disable submit button while processing
- Show success state before redirect

## Email Template Configuration

Configure in Supabase Dashboard: **Authentication → Email Templates → Reset Password**

**Subject:** Reset Your Tribe Password

**Body Template:**
```html
<h2>Reset Your Password</h2>
<p>Hi there,</p>
<p>We received a request to reset your Tribe password.</p>
<p><a href="{{ .ConfirmationURL }}" style="display: inline-block; padding: 12px 24px; background-color: #4F46E5; color: white; text-decoration: none; border-radius: 6px;">Reset Password</a></p>
<p>This link will expire in 6 hours.</p>
<p>If you didn't request this, you can safely ignore this email. Your password won't change.</p>
<p>Need help? Contact us at support@tribe-app.com</p>
<p>— The Tribe Team</p>
```

**Redirect URL:** `{{ .SiteURL }}/reset-password`

## Testing Checklist

**Frontend:**
- [ ] Request reset with valid email (shows success message)
- [ ] Request reset with invalid email format (validation error)
- [ ] Request reset with non-existent email (same success message - no enumeration)
- [ ] Client-side rate limiting triggers after 3 requests
- [ ] Password strength indicator updates correctly
- [ ] Password mismatch shows error
- [ ] Show/hide password toggle works
- [ ] Loading states display during API calls
- [ ] Success message and redirect after reset
- [ ] Mobile UI is functional and responsive
- [ ] Keyboard navigation works
- [ ] Screen reader announcements work

**Supabase Integration:**
- [ ] Use valid reset link from email
- [ ] Use reset link after expiry (Supabase returns error)
- [ ] Use reset link twice (second use fails via Supabase)
- [ ] Email is delivered via Supabase
- [ ] Email links redirect correctly to `/reset-password`
- [ ] Token extracted from URL correctly
- [ ] Password update API call succeeds

**Email Template:**
- [ ] Email displays with correct branding
- [ ] Reset button is clickable
- [ ] Expiry time is shown
- [ ] Security notice is included

## Dependencies

- Supabase Auth (already configured - handles token generation, validation, email sending)
- Password strength library (e.g., `zxcvbn` or custom implementation)
- localStorage for client-side rate limiting tracking

## Related Issues

- CRO-31: Profile Management UI (authentication flows)

## Files to Create

- `/src/app/forgot-password/page.tsx` - Request reset page
- `/src/app/reset-password/page.tsx` - Reset password page
- `/src/components/auth/ForgotPasswordForm.tsx` - Request form component
- `/src/components/auth/ResetPasswordForm.tsx` - Reset form component
- `/src/components/auth/PasswordStrengthIndicator.tsx` - Password strength UI
- `/src/lib/auth/password-reset.ts` - Client utilities and rate limiting
- `/src/lib/validation/password.ts` - Password strength validation
- `/src/__tests__/auth/password-reset.test.ts` - Tests

## Estimated Effort

- Email template configuration: 0.5 hours
- UI implementation: 4 hours
- Password strength indicator: 1.5 hours
- Client-side rate limiting: 1 hour
- Testing: 2 hours
- **Total: 9 hours** (~1.5 days)
