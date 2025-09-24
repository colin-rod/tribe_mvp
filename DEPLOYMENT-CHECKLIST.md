# Next.js 15 Production Deployment Checklist

## Environment Variables Configuration

### ✅ Required Steps for Production Deployment

1. **Set Environment Variables in Deployment Platform**
   - [ ] `NEXT_PUBLIC_SUPABASE_URL` - Set to your production Supabase URL
   - [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Set to your production anon key
   - [ ] `NEXT_PUBLIC_APP_URL` - Set to your production domain
   - [ ] `SENDGRID_API_KEY` - Set to your SendGrid API key
   - [ ] `SUPABASE_SERVICE_ROLE_KEY` - Set to your service role key (server-only)

2. **Verify Environment Variables**
   ```bash
   # In your deployment platform, ensure all variables are set
   # Variables should NOT have quotes around them in the platform UI
   ```

3. **Clear Build Cache and Rebuild**
   ```bash
   # Force a clean build to ensure env vars are embedded
   npm run build
   ```

4. **Test Environment Variables**
   - [ ] Visit `/api/debug/env` in development to verify variables are loaded
   - [ ] Check browser developer tools → Network → Response for embedded variables
   - [ ] Test Supabase client initialization in browser console

### ⚠️ Common Issues and Solutions

#### Issue: `NEXT_PUBLIC_*` variables showing as `undefined` in production

**Root Causes:**
1. Variables not set in deployment platform before build
2. Variables set after the build was completed
3. Build cache preventing new variables from being embedded
4. Incorrect `next.config.js` configuration overriding default behavior

**Solutions:**
1. Set environment variables in your deployment platform (Vercel, Netlify, etc.)
2. Trigger a new build after setting variables
3. Clear build cache: `rm -rf .next && npm run build`
4. Ensure `next.config.js` doesn't have conflicting `env` or `publicRuntimeConfig` settings

#### Issue: Variables work locally but fail in production

**Root Causes:**
1. `.env.local` overriding production values locally
2. Different variable names between local and production
3. Missing `.env.production` file for production builds

**Solutions:**
1. Check that production environment variables match your local `.env` file
2. Use `.env.production` for production-specific defaults
3. Verify variable names are identical (case-sensitive)

## Next.js 15 Best Practices

### ✅ Environment Variable Guidelines

1. **Use NEXT_PUBLIC_* for client-side variables**
   - Automatically embedded in client bundle at build time
   - No need for `publicRuntimeConfig` or `env` in `next.config.js`

2. **Server-side variables**
   - Do NOT use `NEXT_PUBLIC_*` prefix
   - Access directly in API routes and server components
   - Never expose sensitive data to client

3. **Environment file hierarchy**
   ```
   .env.local (highest priority, never commit)
   .env.production (production environment)
   .env.development (development environment)
   .env (lowest priority, commit this)
   ```

### 🔍 Debugging Tools

1. **Debug API Endpoint**
   - Development: `http://localhost:3000/api/debug/env`
   - Shows which environment variables are available server-side

2. **Client-side Variable Check**
   ```javascript
   // In browser console
   console.log('NEXT_PUBLIC_SUPABASE_URL:', process.env.NEXT_PUBLIC_SUPABASE_URL)
   console.log('Build-time env embedding:', !!process.env.NEXT_PUBLIC_SUPABASE_URL)
   ```

3. **Build-time Verification**
   ```bash
   # Check if variables are embedded in build output
   npm run build
   grep -r "NEXT_PUBLIC_SUPABASE_URL" .next/static/chunks/
   ```

### 🚨 Security Considerations

1. **Never expose sensitive keys to client**
   - ❌ Don't use `NEXT_PUBLIC_` for API keys, secrets, or service role keys
   - ✅ Use `NEXT_PUBLIC_` only for URLs and non-sensitive configuration

2. **Environment variable validation**
   - Validate variables at application startup
   - Use schema validation (Zod) for type safety
   - Provide clear error messages for missing variables

3. **Production debugging**
   - Disable debug endpoints in production
   - Use environment health checks for monitoring
   - Log variable presence, not values

## Platform-Specific Instructions

### Vercel
```bash
# Set environment variables via CLI
vercel env add NEXT_PUBLIC_SUPABASE_URL production
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY production

# Or via dashboard: Vercel Project → Settings → Environment Variables
```

### Netlify
```bash
# Set environment variables via CLI
netlify env:set NEXT_PUBLIC_SUPABASE_URL "your-url"
netlify env:set NEXT_PUBLIC_SUPABASE_ANON_KEY "your-key"

# Or via dashboard: Site Settings → Environment Variables
```

### AWS/Other Platforms
- Set environment variables in your deployment configuration
- Ensure variables are available during the build process
- Trigger new builds after updating variables

## Final Verification

- [ ] All required environment variables set in deployment platform
- [ ] Clean build completed with variables embedded
- [ ] Client-side Supabase initialization working
- [ ] No console errors about missing environment variables
- [ ] Application functionality working as expected

---

**Remember**: `NEXT_PUBLIC_*` variables are embedded at BUILD TIME, not runtime. Always set them before building, and rebuild after changing them.