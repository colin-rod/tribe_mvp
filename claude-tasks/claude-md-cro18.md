# CRO-18: Supabase Project Setup & Database Schema

## Issue URL
https://linear.app/crod/issue/CRO-18/phase-11-supabase-project-setup-database-schema

## Agents Required
- `supabase-developer` (Primary)
- `database-designer` (Supporting)

## Objective
Set up initial Supabase project with complete database schema and Row Level Security policies for the Tribe MVP.

## Context
Building a private family sharing platform that intelligently distributes baby updates to recipients via their preferred channels (email, SMS, WhatsApp). This is the foundational database and backend setup.

## Domain & Environment
- Development domain: www.colinrodrigues.com
- Using Supabase for backend (Auth, Database, Storage, Edge Functions)
- PostgreSQL with Row Level Security
- Next.js 15 frontend (to be built in subsequent issues)

## Tasks

### 1. Create Supabase Project
- [ ] Create new Supabase project named "tribe-mvp"
- [ ] Set up in appropriate region (US East for development)
- [ ] Generate and document all API keys
- [ ] Configure project settings

### 2. Database Schema Implementation
- [ ] Run complete SQL migration for all tables
- [ ] Set up Row Level Security (RLS) policies
- [ ] Create database functions for user management
- [ ] Add proper indexes for performance
- [ ] Test database operations

### 3. Storage Configuration
- [ ] Create 'media' storage bucket
- [ ] Set up storage policies for user file access
- [ ] Configure file upload permissions
- [ ] Test file upload/access

### 4. Authentication Setup
- [ ] Configure email authentication
- [ ] Set up authentication redirects for www.colinrodrigues.com
- [ ] Test user registration and login flows
- [ ] Configure user profile creation trigger

### 5. Environment Variables
- [ ] Document all required environment variables
- [ ] Create .env.local.example file
- [ ] Provide setup instructions

## Database Schema

```sql
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Profiles table (extends auth.users)
CREATE TABLE profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  email VARCHAR NOT NULL,
  name VARCHAR NOT NULL,
  notification_preferences JSONB DEFAULT '{
    "response_notifications": "immediate",
    "prompt_frequency": "every_3_days",
    "enabled_prompt_types": ["milestone", "activity", "fun"],
    "quiet_hours": {"start": "22:00", "end": "07:00"}
  }'::jsonb,
  onboarding_completed BOOLEAN DEFAULT false,
  onboarding_step INTEGER DEFAULT 0,
  onboarding_skipped BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Enable RLS and policies
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own profile" ON profiles
  FOR ALL USING (auth.uid() = id);

-- Auto-create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, name)
  VALUES (new.id, new.email, COALESCE(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)));
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Children table
CREATE TABLE children (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  parent_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  name VARCHAR NOT NULL,
  birth_date DATE NOT NULL,
  profile_photo_url VARCHAR,
  created_at TIMESTAMP DEFAULT NOW()
);

ALTER TABLE children ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Parents can manage their own children" ON children
  FOR ALL USING (auth.uid() = parent_id);

-- Recipient Groups
CREATE TABLE recipient_groups (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  parent_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  name VARCHAR NOT NULL,
  default_frequency VARCHAR DEFAULT 'weekly_digest' CHECK (default_frequency IN ('every_update', 'daily_digest', 'weekly_digest', 'milestones_only')),
  default_channels VARCHAR[] DEFAULT ARRAY['email'] CHECK (default_channels <@ ARRAY['email', 'sms', 'whatsapp']),
  is_default_group BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW()
);

ALTER TABLE recipient_groups ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Parents can manage their own groups" ON recipient_groups
  FOR ALL USING (auth.uid() = parent_id);

-- Recipients (no accounts required)
CREATE TABLE recipients (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  parent_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  email VARCHAR,
  phone VARCHAR,
  name VARCHAR NOT NULL,
  relationship VARCHAR NOT NULL CHECK (relationship IN ('grandparent', 'parent', 'sibling', 'friend', 'family', 'colleague', 'other')),
  group_id UUID REFERENCES recipient_groups(id),
  
  -- Preferences
  frequency VARCHAR DEFAULT 'weekly_digest' CHECK (frequency IN ('every_update', 'daily_digest', 'weekly_digest', 'milestones_only')),
  preferred_channels VARCHAR[] DEFAULT ARRAY['email'] CHECK (preferred_channels <@ ARRAY['email', 'sms', 'whatsapp']),
  content_types VARCHAR[] DEFAULT ARRAY['photos', 'text'] CHECK (content_types <@ ARRAY['photos', 'text', 'milestones']),
  overrides_group_default BOOLEAN DEFAULT false,
  
  preference_token VARCHAR UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(32), 'base64'),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  
  CONSTRAINT email_or_phone_required CHECK (email IS NOT NULL OR phone IS NOT NULL)
);

ALTER TABLE recipients ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Parents can manage their own recipients" ON recipients
  FOR ALL USING (auth.uid() = parent_id);

-- Function for recipient preference access via token
CREATE OR REPLACE FUNCTION get_recipient_by_token(token TEXT)
RETURNS TABLE(recipient_data JSON) AS $$
BEGIN
  RETURN QUERY
  SELECT row_to_json(recipients.*)
  FROM recipients
  WHERE preference_token = token AND is_active = true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Updates
CREATE TABLE updates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  parent_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  child_id UUID REFERENCES children(id) ON DELETE CASCADE,
  
  content TEXT,
  media_urls VARCHAR[],
  milestone_type VARCHAR CHECK (milestone_type IN ('first_smile', 'rolling', 'sitting', 'crawling', 'first_steps', 'first_words', 'first_tooth', 'walking', 'potty_training', 'first_day_school', 'birthday', 'other')),
  
  -- AI Analysis Results
  ai_analysis JSONB DEFAULT '{}'::jsonb,
  suggested_recipients UUID[],
  confirmed_recipients UUID[],
  
  -- Distribution Status
  distribution_status VARCHAR DEFAULT 'draft' CHECK (distribution_status IN ('draft', 'confirmed', 'sent', 'failed')),
  
  created_at TIMESTAMP DEFAULT NOW(),
  scheduled_for TIMESTAMP,
  sent_at TIMESTAMP
);

ALTER TABLE updates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Parents can manage their own updates" ON updates
  FOR ALL USING (auth.uid() = parent_id);

-- Delivery Jobs
CREATE TABLE delivery_jobs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  update_id UUID REFERENCES updates(id) ON DELETE CASCADE,
  recipient_id UUID REFERENCES recipients(id) ON DELETE CASCADE,
  channel VARCHAR NOT NULL CHECK (channel IN ('email', 'sms', 'whatsapp')),
  
  status VARCHAR DEFAULT 'queued' CHECK (status IN ('queued', 'sent', 'delivered', 'failed')),
  external_id VARCHAR, -- Twilio SID, SendGrid message ID
  error_message TEXT,
  
  queued_at TIMESTAMP DEFAULT NOW(),
  sent_at TIMESTAMP,
  delivered_at TIMESTAMP
);

ALTER TABLE delivery_jobs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Parents can view delivery status for their updates" ON delivery_jobs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM updates 
      WHERE updates.id = delivery_jobs.update_id 
      AND updates.parent_id = auth.uid()
    )
  );

-- Responses
CREATE TABLE responses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  update_id UUID REFERENCES updates(id) ON DELETE CASCADE,
  recipient_id UUID REFERENCES recipients(id) ON DELETE CASCADE,
  
  channel VARCHAR NOT NULL CHECK (channel IN ('email', 'whatsapp', 'sms')),
  external_id VARCHAR, -- for threading
  
  content TEXT,
  media_urls VARCHAR[],
  
  parent_notified BOOLEAN DEFAULT false,
  received_at TIMESTAMP DEFAULT NOW()
);

ALTER TABLE responses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Parents can view responses to their updates" ON responses
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM updates 
      WHERE updates.id = responses.update_id 
      AND updates.parent_id = auth.uid()
    )
  );

-- AI Prompts
CREATE TABLE ai_prompts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  parent_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  child_id UUID REFERENCES children(id),
  
  prompt_type VARCHAR NOT NULL CHECK (prompt_type IN ('milestone', 'activity', 'fun', 'seasonal')),
  prompt_text TEXT NOT NULL,
  prompt_data JSONB DEFAULT '{}'::jsonb,
  
  status VARCHAR DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'acted_on', 'dismissed')),
  sent_at TIMESTAMP,
  acted_on_at TIMESTAMP,
  
  created_at TIMESTAMP DEFAULT NOW()
);

ALTER TABLE ai_prompts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Parents can view their own prompts" ON ai_prompts
  FOR ALL USING (auth.uid() = parent_id);

-- Function to create default groups for new users
CREATE OR REPLACE FUNCTION create_default_groups_for_user(user_id UUID)
RETURNS void AS $$
BEGIN
  INSERT INTO recipient_groups (parent_id, name, default_frequency, default_channels, is_default_group)
  VALUES 
    (user_id, 'Close Family', 'daily_digest', ARRAY['email'], true),
    (user_id, 'Extended Family', 'weekly_digest', ARRAY['email'], true),
    (user_id, 'Friends', 'weekly_digest', ARRAY['email'], true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Indexes for performance
CREATE INDEX idx_recipients_parent_id ON recipients(parent_id);
CREATE INDEX idx_recipients_token ON recipients(preference_token);
CREATE INDEX idx_updates_parent_id ON updates(parent_id);
CREATE INDEX idx_updates_child_id ON updates(child_id);
CREATE INDEX idx_delivery_jobs_update_id ON delivery_jobs(update_id);
CREATE INDEX idx_responses_update_id ON responses(update_id);
CREATE INDEX idx_ai_prompts_parent_id ON ai_prompts(parent_id);

-- Storage setup
INSERT INTO storage.buckets (id, name, public)
VALUES ('media', 'media', false);

-- Storage policies
CREATE POLICY "Parents can upload media for their updates" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'media' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Parents can view their own media" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'media' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Parents can delete their own media" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'media' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- Enable real-time for key tables
ALTER publication supabase_realtime ADD TABLE profiles;
ALTER publication supabase_realtime ADD TABLE children;
ALTER publication supabase_realtime ADD TABLE updates;
ALTER publication supabase_realtime ADD TABLE responses;
ALTER publication supabase_realtime ADD TABLE ai_prompts;
ALTER publication supabase_realtime ADD TABLE delivery_jobs;
```

## Environment Variables Needed
```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# External APIs (for future phases)
OPENAI_API_KEY=your-openai-api-key
SENDGRID_API_KEY=your-sendgrid-api-key
SENDGRID_FROM_EMAIL=updates@colinrodrigues.com
```

## Success Criteria
- [ ] ✅ Database schema deployed successfully
- [ ] ✅ All RLS policies working correctly  
- [ ] ✅ Storage bucket created and accessible
- [ ] ✅ Can create test user via Supabase Dashboard
- [ ] ✅ Environment variables documented
- [ ] ✅ User profile creation trigger works
- [ ] ✅ Default groups function ready for use

## Testing Instructions
1. Create test user via Supabase Dashboard
2. Verify profile auto-creation
3. Test RLS policies with different user contexts  
4. Upload test file to media bucket
5. Verify all table relationships work correctly

## Next Steps
- This issue provides foundation for CRO-20 (Next.js setup)
- Database ready for frontend integration
- Authentication system prepared for app development

## Files to Create/Modify
- `supabase/migrations/001_initial_schema.sql`
- `.env.local.example`
- `README.md` (update with setup instructions)
- Documentation of API keys and setup process