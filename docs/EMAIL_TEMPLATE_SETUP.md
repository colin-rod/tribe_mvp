# Email Template Configuration for Password Reset

**Related Issue**: CRO-262 - Password Reset Flow

This guide explains how to configure the custom password reset email template in Supabase.

## Overview

The password reset functionality uses Supabase's built-in email system. While the backend code is already configured, you need to customize the email template in the Supabase Dashboard to match your brand.

## Configuration Steps

### 1. Access Supabase Dashboard

1. Navigate to your Supabase project dashboard
2. Go to **Authentication** → **Email Templates**
3. Find the **Reset Password** template

### 2. Configure the Template

#### Subject Line
```
Reset Your Tribe Password
```

#### Email Body HTML

```html
<h2>Reset Your Password</h2>
<p>Hi there,</p>
<p>We received a request to reset your Tribe password.</p>

<!-- Reset Password Button -->
<p style="margin: 24px 0;">
  <a href="{{ .ConfirmationURL }}"
     style="display: inline-block;
            padding: 12px 24px;
            background-color: #4F46E5;
            color: white;
            text-decoration: none;
            border-radius: 6px;
            font-weight: 600;">
    Reset Password
  </a>
</p>

<p style="color: #6B7280; font-size: 14px;">
  This link will expire in 6 hours.
</p>

<p style="margin-top: 24px;">
  If you didn't request this, you can safely ignore this email. Your password won't change.
</p>

<!-- Support Information -->
<hr style="border: none; border-top: 1px solid #E5E7EB; margin: 24px 0;">

<p style="color: #6B7280; font-size: 12px;">
  Need help? Contact us at <a href="mailto:support@tribe-app.com" style="color: #4F46E5;">support@tribe-app.com</a>
</p>

<p style="color: #6B7280; font-size: 12px;">
  — The Tribe Team
</p>
```

#### Redirect URL

Set the redirect URL to:
```
{{ .SiteURL }}/reset-password
```

This ensures users are sent to your custom reset password page after clicking the link in the email.

### 3. Template Variables

Supabase provides these template variables:

- `{{ .ConfirmationURL }}` - The secure password reset link with token
- `{{ .SiteURL }}` - Your site's base URL (from project settings)
- `{{ .Token }}` - The reset token (included in ConfirmationURL)
- `{{ .TokenHash }}` - Hashed version of the token

### 4. Customization Options

You can further customize the template:

1. **Branding**:
   - Add your logo at the top
   - Use your brand colors instead of `#4F46E5` (indigo)
   - Match your brand's typography

2. **Content**:
   - Adjust the tone to match your brand voice
   - Add additional security tips
   - Include social media links

3. **Styling**:
   - Add more sophisticated CSS
   - Use responsive design for mobile
   - Add inline styles for better email client compatibility

### 5. Testing the Email

After configuration:

1. Visit `http://localhost:3000/forgot-password` (or your production URL)
2. Enter a registered email address
3. Check your email inbox (and spam folder)
4. Verify:
   - Email is delivered
   - Branding looks correct
   - Reset button works
   - Link redirects to `/reset-password`

## Token Expiry Configuration

The token expiry time (default 6 hours) can be configured in:

**Authentication** → **Settings** → **Email Auth** → **Password Recovery**

Adjust the "Password Recovery Token Expiry" setting as needed.

## Rate Limiting

### Server-Side (Supabase)
Supabase automatically handles rate limiting at the authentication level to prevent abuse.

### Client-Side (Implemented)
The application implements additional client-side rate limiting:
- Maximum 3 requests per hour per browser
- Tracked via localStorage
- User-friendly countdown display

## Email Provider Configuration

Supabase uses its default email provider, but for production you should:

1. Configure a custom SMTP provider
2. Navigate to **Settings** → **Auth** → **SMTP Settings**
3. Add your email service credentials (SendGrid, AWS SES, etc.)
4. Verify sender email address

## Security Considerations

✅ **What's Handled:**
- Token generation and storage (Supabase)
- Token expiry (configurable)
- Single-use token invalidation (Supabase)
- HTTPS enforcement (Supabase)
- Rate limiting at auth level (Supabase)

✅ **What's Implemented:**
- User enumeration prevention (same response for valid/invalid emails)
- Client-side rate limiting (3 per hour)
- Input validation and sanitization
- Strong password requirements

## Related Files

The following files implement the password reset functionality:

- `/src/app/forgot-password/page.tsx` - Request reset page
- `/src/app/reset-password/page.tsx` - Reset password page
- `/src/components/auth/ForgotPasswordForm.tsx` - Request form component
- `/src/components/auth/ResetPasswordForm.tsx` - Reset form component
- `/src/lib/auth/password-reset.ts` - Client utilities and rate limiting
- `/src/lib/validation/password.ts` - Password validation utilities

## Troubleshooting

### Emails Not Being Delivered

1. Check Supabase email logs: **Authentication** → **Logs**
2. Verify email service quota hasn't been exceeded
3. Check spam folder
4. Verify SMTP configuration (if using custom provider)

### Reset Link Not Working

1. Verify redirect URL is set to `{{ .SiteURL }}/reset-password`
2. Check token hasn't expired (6 hour default)
3. Ensure token hasn't been used already (single-use)
4. Verify NEXT_PUBLIC_SITE_URL environment variable is correct

### Rate Limiting Issues

1. Client-side: Clear localStorage to reset rate limit
2. Server-side: Contact Supabase support if needed

## Support

For issues with:
- **Email delivery**: Check Supabase documentation
- **Template configuration**: See Supabase Auth documentation
- **Application functionality**: Review the related files listed above
