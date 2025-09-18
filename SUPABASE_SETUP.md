# Tribe MVP Supabase Setup Guide

## Overview
This guide walks through setting up the Supabase backend for Tribe MVP - a private family sharing platform for smart baby update distribution.

## Prerequisites
- [ ] Supabase account (https://supabase.com)
- [ ] Node.js 18+ installed
- [ ] Supabase CLI installed (`npm install -g supabase`)

## Step 1: Create Supabase Project

### 1.1 Create New Project
1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Click "New Project"
3. **Organization**: Select your organization
4. **Project Name**: `tribe-mvp`
5. **Database Password**: Generate a strong password (save this!)
6. **Region**: US East (Ohio) - us-east-1
7. Click "Create new project"

### 1.2 Wait for Project Setup
- Project creation takes 2-3 minutes
- You'll see a progress indicator in the dashboard

## Step 2: Configure Project Settings

### 2.1 Get API Keys
1. Navigate to **Settings > API**
2. Copy these values for your `.env` file:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon/public key** → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **service_role key** → `SUPABASE_SERVICE_ROLE_KEY`

### 2.2 Configure Authentication
1. Navigate to **Authentication > Settings**
2. **Site URL**: `http://localhost:3000` (for development)
3. **Redirect URLs**: Add `https://www.colinrodrigues.com/**`
4. **Enable email confirmations**: Disabled (for development)
5. **Enable email change confirmations**: Enabled
6. **Enable secure email change**: Enabled

### 2.3 Email Templates (Optional)
Navigate to **Authentication > Email Templates** to customize:
- Confirm signup
- Reset password
- Email change confirmation

## Step 3: Database Setup

### 3.1 Run Migration
```bash
# From project root
supabase db reset --linked

# Or apply migration directly in Supabase Dashboard
# Navigate to SQL Editor and run the contents of:
# supabase/migrations/20240916000001_initial_schema.sql
```

### 3.2 Verify Tables Created
Check **Database > Tables** for:
- ✅ `profiles` (with RLS enabled)
- ✅ `children` (with RLS enabled)
- ✅ `recipient_groups` (with RLS enabled)
- ✅ `recipients` (with RLS enabled)
- ✅ `updates` (with RLS enabled)
- ✅ `delivery_jobs` (with RLS enabled)
- ✅ `responses` (with RLS enabled)
- ✅ `ai_prompts` (with RLS enabled)

### 3.3 Verify Functions Created
Check **Database > Functions** for:
- ✅ `handle_new_user()` - Auto-create profile on signup
- ✅ `create_default_groups_for_user()` - Create default recipient groups
- ✅ `get_recipient_by_token()` - Public access to recipient preferences
- ✅ `update_updated_at_column()` - Timestamp trigger function

## Step 4: Storage Configuration

### 4.1 Verify Media Bucket
1. Navigate to **Storage > Buckets**
2. Verify `media` bucket exists with:
   - **Public**: No (private bucket)
   - **File size limit**: 50 MB
   - **Allowed MIME types**: Images and videos

### 4.2 Test Storage Policies
Storage policies should allow:
- Parents can upload files to their folder (`/{user_id}/...`)
- Parents can only view their own files
- Parents can delete their own files

## Step 5: Environment Configuration

### 5.1 Update .env File
```bash
# Copy .env.example to .env
cp .env.example .env

# Edit .env with your actual Supabase values:
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...
```

### 5.2 Generate NextAuth Secret
```bash
# Generate a secure secret
openssl rand -base64 32

# Add to .env
NEXTAUTH_SECRET=your-generated-secret
```

## Step 6: Testing & Validation

### 6.1 Test User Registration
1. Navigate to **Authentication > Users**
2. Click "Create a new user"
3. **Email**: `test@colinrodrigues.com`
4. **Password**: Generate temporary password
5. **Auto Confirm User**: Yes
6. Click "Create user"

### 6.2 Verify Auto-Profile Creation
1. Navigate to **Database > Table Editor > profiles**
2. Verify test user profile was auto-created
3. Check default recipient groups were created

### 6.3 Test RLS Policies
```sql
-- Test in SQL Editor with different auth.uid() contexts
-- Should only return data for the authenticated user

-- Test profile access
SELECT * FROM profiles WHERE id = auth.uid();

-- Test children access (should be empty for new user)
SELECT * FROM children WHERE parent_id = auth.uid();

-- Test recipient groups (should show 3 default groups)
SELECT * FROM recipient_groups WHERE parent_id = auth.uid();
```

### 6.4 Test Storage Upload
1. Navigate to **Storage > media bucket**
2. Try uploading a test image
3. Verify file appears in correct user folder structure

## Step 7: Real-time Setup

### 7.1 Verify Real-time Tables
Navigate to **Database > Replication** and verify these tables are enabled:
- ✅ profiles
- ✅ children
- ✅ recipient_groups
- ✅ recipients
- ✅ updates
- ✅ responses
- ✅ ai_prompts
- ✅ delivery_jobs

## Step 8: Production Configuration

### 8.1 Custom Domain (Later)
For production deployment:
1. **Authentication > Settings**
2. **Site URL**: `https://www.colinrodrigues.com`
3. **Redirect URLs**: Update for production domain

### 8.2 Environment-Specific Settings
```bash
# Production .env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXTAUTH_URL=https://www.colinrodrigues.com
NODE_ENV=production
```

## Troubleshooting

### Common Issues

**1. Migration Fails**
```bash
# Check migration status
supabase migration list

# Fix and re-run
supabase db reset --linked
```

**2. RLS Policies Not Working**
- Verify user is authenticated (`auth.uid()` returns value)
- Check policy conditions match your use case
- Test policies in SQL Editor with `SET role authenticated;`

**3. Storage Upload Fails**
- Check MIME type is in allowed list
- Verify file size under 50MB limit
- Check storage policies match folder structure

**4. Trigger Not Firing**
```sql
-- Test trigger manually
SELECT handle_new_user();

-- Check if trigger exists
SELECT * FROM pg_trigger WHERE tgname = 'on_auth_user_created';
```

## Success Checklist

- [ ] ✅ Supabase project created with name "tribe-mvp"
- [ ] ✅ API keys copied to `.env` file
- [ ] ✅ Database schema deployed (8 tables + functions)
- [ ] ✅ All RLS policies enabled and working
- [ ] ✅ Storage bucket created with proper policies
- [ ] ✅ Test user can be created successfully
- [ ] ✅ Profile auto-creation trigger works
- [ ] ✅ Default groups function creates 3 groups
- [ ] ✅ Real-time subscriptions enabled
- [ ] ✅ Environment variables documented

## Next Steps

After completing this setup:
1. **CRO-20**: Next.js frontend integration
2. **Authentication flows**: Login/signup pages
3. **Dashboard development**: User profile management
4. **Child management**: Add/edit children profiles
5. **Recipient management**: Invite and manage recipients

## Support Resources

- [Supabase Documentation](https://supabase.com/docs)
- [Supabase Discord](https://discord.supabase.com)
- [Row Level Security Guide](https://supabase.com/docs/guides/auth/row-level-security)
- [Storage Guide](https://supabase.com/docs/guides/storage)