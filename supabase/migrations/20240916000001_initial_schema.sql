-- Tribe MVP Initial Database Schema
-- Migration: 20240916000001_initial_schema.sql
-- Description: Complete database schema for private family sharing platform

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =============================================================================
-- PROFILES TABLE (extends auth.users)
-- =============================================================================

CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
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
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS for profiles
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- RLS Policies for profiles
DROP POLICY IF EXISTS "Users can view their own profile" ON profiles;
CREATE POLICY "Users can view their own profile" ON profiles
  FOR ALL USING (auth.uid() = id);

-- =============================================================================
-- CHILDREN TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS children (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  parent_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  name VARCHAR NOT NULL,
  birth_date DATE NOT NULL,
  profile_photo_url VARCHAR,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS for children
ALTER TABLE children ENABLE ROW LEVEL SECURITY;

-- RLS Policies for children
DROP POLICY IF EXISTS "Parents can manage their own children" ON children;
CREATE POLICY "Parents can manage their own children" ON children
  FOR ALL USING (auth.uid() = parent_id);

-- =============================================================================
-- RECIPIENT GROUPS
-- =============================================================================

CREATE TABLE IF NOT EXISTS recipient_groups (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  parent_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  name VARCHAR NOT NULL,
  default_frequency VARCHAR DEFAULT 'weekly_digest'
    CHECK (default_frequency IN ('every_update', 'daily_digest', 'weekly_digest', 'milestones_only')),
  default_channels VARCHAR[] DEFAULT ARRAY['email']::VARCHAR[]
    CHECK (default_channels <@ ARRAY['email', 'sms', 'whatsapp']::VARCHAR[]),
  is_default_group BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS for recipient_groups
ALTER TABLE recipient_groups ENABLE ROW LEVEL SECURITY;

-- RLS Policies for recipient_groups
DROP POLICY IF EXISTS "Parents can manage their own groups" ON recipient_groups;
CREATE POLICY "Parents can manage their own groups" ON recipient_groups
  FOR ALL USING (auth.uid() = parent_id);

-- =============================================================================
-- RECIPIENTS (no accounts required)
-- =============================================================================

CREATE TABLE IF NOT EXISTS recipients (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  parent_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  email VARCHAR,
  phone VARCHAR,
  name VARCHAR NOT NULL,
  relationship VARCHAR NOT NULL
    CHECK (relationship IN ('grandparent', 'parent', 'sibling', 'friend', 'family', 'colleague', 'other')),
  group_id UUID REFERENCES recipient_groups(id) ON DELETE SET NULL,

  -- Communication Preferences
  frequency VARCHAR DEFAULT 'weekly_digest'
    CHECK (frequency IN ('every_update', 'daily_digest', 'weekly_digest', 'milestones_only')),
  preferred_channels VARCHAR[] DEFAULT ARRAY['email']::VARCHAR[]
    CHECK (preferred_channels <@ ARRAY['email', 'sms', 'whatsapp']::VARCHAR[]),
  content_types VARCHAR[] DEFAULT ARRAY['photos', 'text']::VARCHAR[]
    CHECK (content_types <@ ARRAY['photos', 'text', 'milestones']::VARCHAR[]),
  overrides_group_default BOOLEAN DEFAULT false,

  -- Security & Access
  preference_token VARCHAR UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(32), 'base64'),
  is_active BOOLEAN DEFAULT true,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  CONSTRAINT email_or_phone_required CHECK (email IS NOT NULL OR phone IS NOT NULL)
);

-- Enable RLS for recipients
ALTER TABLE recipients ENABLE ROW LEVEL SECURITY;

-- RLS Policies for recipients
DROP POLICY IF EXISTS "Parents can manage their own recipients" ON recipients;
CREATE POLICY "Parents can manage their own recipients" ON recipients
  FOR ALL USING (auth.uid() = parent_id);

-- Function for recipient preference access via token (public access)
CREATE OR REPLACE FUNCTION get_recipient_by_token(token TEXT)
RETURNS TABLE(recipient_data JSON)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT row_to_json(recipients.*)
  FROM recipients
  WHERE preference_token = token AND is_active = true;
END;
$$;

-- =============================================================================
-- UPDATES TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS updates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  parent_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  child_id UUID REFERENCES children(id) ON DELETE CASCADE NOT NULL,

  -- Content
  content TEXT,
  media_urls VARCHAR[],
  milestone_type VARCHAR
    CHECK (milestone_type IN ('first_smile', 'rolling', 'sitting', 'crawling', 'first_steps',
                              'first_words', 'first_tooth', 'walking', 'potty_training',
                              'first_day_school', 'birthday', 'other')),

  -- AI Analysis Results
  ai_analysis JSONB DEFAULT '{}'::jsonb,
  suggested_recipients UUID[],
  confirmed_recipients UUID[],

  -- Distribution Status
  distribution_status VARCHAR DEFAULT 'draft'
    CHECK (distribution_status IN ('draft', 'confirmed', 'sent', 'failed')),

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  scheduled_for TIMESTAMP WITH TIME ZONE,
  sent_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS for updates
ALTER TABLE updates ENABLE ROW LEVEL SECURITY;

-- RLS Policies for updates
DROP POLICY IF EXISTS "Parents can manage their own updates" ON updates;
CREATE POLICY "Parents can manage their own updates" ON updates
  FOR ALL USING (auth.uid() = parent_id);

-- =============================================================================
-- DELIVERY JOBS TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS delivery_jobs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  update_id UUID REFERENCES updates(id) ON DELETE CASCADE NOT NULL,
  recipient_id UUID REFERENCES recipients(id) ON DELETE CASCADE NOT NULL,
  channel VARCHAR NOT NULL CHECK (channel IN ('email', 'sms', 'whatsapp')),

  -- Delivery Status
  status VARCHAR DEFAULT 'queued' CHECK (status IN ('queued', 'sent', 'delivered', 'failed')),
  external_id VARCHAR, -- Twilio SID, SendGrid message ID, etc.
  error_message TEXT,

  -- Timing
  queued_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  sent_at TIMESTAMP WITH TIME ZONE,
  delivered_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS for delivery_jobs
ALTER TABLE delivery_jobs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for delivery_jobs
DROP POLICY IF EXISTS "Parents can view delivery status for their updates" ON delivery_jobs;
CREATE POLICY "Parents can view delivery status for their updates" ON delivery_jobs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM updates
      WHERE updates.id = delivery_jobs.update_id
      AND updates.parent_id = auth.uid()
    )
  );

-- =============================================================================
-- RESPONSES TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS responses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  update_id UUID REFERENCES updates(id) ON DELETE CASCADE NOT NULL,
  recipient_id UUID REFERENCES recipients(id) ON DELETE CASCADE NOT NULL,

  -- Response metadata
  channel VARCHAR NOT NULL CHECK (channel IN ('email', 'whatsapp', 'sms')),
  external_id VARCHAR, -- for threading/reply matching

  -- Response content
  content TEXT,
  media_urls VARCHAR[],

  -- Notification status
  parent_notified BOOLEAN DEFAULT false,
  received_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS for responses
ALTER TABLE responses ENABLE ROW LEVEL SECURITY;

-- RLS Policies for responses
DROP POLICY IF EXISTS "Parents can view responses to their updates" ON responses;
CREATE POLICY "Parents can view responses to their updates" ON responses
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM updates
      WHERE updates.id = responses.update_id
      AND updates.parent_id = auth.uid()
    )
  );

-- =============================================================================
-- AI PROMPTS TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS ai_prompts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  parent_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  child_id UUID REFERENCES children(id) ON DELETE CASCADE,

  -- Prompt details
  prompt_type VARCHAR NOT NULL CHECK (prompt_type IN ('milestone', 'activity', 'fun', 'seasonal')),
  prompt_text TEXT NOT NULL,
  prompt_data JSONB DEFAULT '{}'::jsonb,

  -- Prompt status
  status VARCHAR DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'acted_on', 'dismissed')),
  sent_at TIMESTAMP WITH TIME ZONE,
  acted_on_at TIMESTAMP WITH TIME ZONE,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS for ai_prompts
ALTER TABLE ai_prompts ENABLE ROW LEVEL SECURITY;

-- RLS Policies for ai_prompts
DROP POLICY IF EXISTS "Parents can view their own prompts" ON ai_prompts;
CREATE POLICY "Parents can view their own prompts" ON ai_prompts
  FOR ALL USING (auth.uid() = parent_id);

-- =============================================================================
-- HELPER FUNCTIONS
-- =============================================================================

-- Function to create default groups for new users
CREATE OR REPLACE FUNCTION create_default_groups_for_user(user_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO recipient_groups (parent_id, name, default_frequency, default_channels, is_default_group)
  VALUES
    (user_id, 'Close Family', 'daily_digest', ARRAY['email']::VARCHAR[], true),
    (user_id, 'Extended Family', 'weekly_digest', ARRAY['email']::VARCHAR[], false),
    (user_id, 'Friends', 'weekly_digest', ARRAY['email']::VARCHAR[], false);
END;
$$;

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- =============================================================================
-- TRIGGERS FOR updated_at
-- =============================================================================

DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_children_updated_at ON children;
CREATE TRIGGER update_children_updated_at BEFORE UPDATE ON children
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_recipient_groups_updated_at ON recipient_groups;
CREATE TRIGGER update_recipient_groups_updated_at BEFORE UPDATE ON recipient_groups
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_recipients_updated_at ON recipients;
CREATE TRIGGER update_recipients_updated_at BEFORE UPDATE ON recipients
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_updates_updated_at ON updates;
CREATE TRIGGER update_updates_updated_at BEFORE UPDATE ON updates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- USER CREATION TRIGGERS
-- =============================================================================

-- Function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Insert profile for new user
  INSERT INTO public.profiles (id, email, name)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1))
  );

  -- Create default recipient groups
  PERFORM create_default_groups_for_user(new.id);

  RETURN new;
END;
$$;

-- Drop existing trigger if exists, then create new one
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =============================================================================
-- PERFORMANCE INDEXES
-- =============================================================================

-- Profiles indexes
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);

-- Children indexes
CREATE INDEX IF NOT EXISTS idx_children_parent_id ON children(parent_id);
CREATE INDEX IF NOT EXISTS idx_children_birth_date ON children(birth_date);

-- Recipients indexes
CREATE INDEX IF NOT EXISTS idx_recipients_parent_id ON recipients(parent_id);
CREATE INDEX IF NOT EXISTS idx_recipients_group_id ON recipients(group_id);
CREATE INDEX IF NOT EXISTS idx_recipients_token ON recipients(preference_token);
CREATE INDEX IF NOT EXISTS idx_recipients_email ON recipients(email);
CREATE INDEX IF NOT EXISTS idx_recipients_phone ON recipients(phone);

-- Recipient groups indexes
CREATE INDEX IF NOT EXISTS idx_recipient_groups_parent_id ON recipient_groups(parent_id);

-- Updates indexes
CREATE INDEX IF NOT EXISTS idx_updates_parent_id ON updates(parent_id);
CREATE INDEX IF NOT EXISTS idx_updates_child_id ON updates(child_id);
CREATE INDEX IF NOT EXISTS idx_updates_status ON updates(distribution_status);
CREATE INDEX IF NOT EXISTS idx_updates_scheduled_for ON updates(scheduled_for);
CREATE INDEX IF NOT EXISTS idx_updates_created_at ON updates(created_at);

-- Delivery jobs indexes
CREATE INDEX IF NOT EXISTS idx_delivery_jobs_update_id ON delivery_jobs(update_id);
CREATE INDEX IF NOT EXISTS idx_delivery_jobs_recipient_id ON delivery_jobs(recipient_id);
CREATE INDEX IF NOT EXISTS idx_delivery_jobs_status ON delivery_jobs(status);
CREATE INDEX IF NOT EXISTS idx_delivery_jobs_queued_at ON delivery_jobs(queued_at);

-- Responses indexes
CREATE INDEX IF NOT EXISTS idx_responses_update_id ON responses(update_id);
CREATE INDEX IF NOT EXISTS idx_responses_recipient_id ON responses(recipient_id);
CREATE INDEX IF NOT EXISTS idx_responses_received_at ON responses(received_at);

-- AI prompts indexes
CREATE INDEX IF NOT EXISTS idx_ai_prompts_parent_id ON ai_prompts(parent_id);
CREATE INDEX IF NOT EXISTS idx_ai_prompts_child_id ON ai_prompts(child_id);
CREATE INDEX IF NOT EXISTS idx_ai_prompts_status ON ai_prompts(status);
CREATE INDEX IF NOT EXISTS idx_ai_prompts_type ON ai_prompts(prompt_type);

-- =============================================================================
-- STORAGE BUCKET SETUP
-- =============================================================================

-- Create media bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'media',
  'media',
  false,
  52428800, -- 50MB limit
  ARRAY[
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'video/mp4',
    'video/quicktime',
    'video/x-msvideo'
  ]
)
ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- STORAGE POLICIES
-- =============================================================================

-- Policy for uploading media files
DROP POLICY IF EXISTS "Parents can upload media for their updates" ON storage.objects;
CREATE POLICY "Parents can upload media for their updates" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'media' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- Policy for viewing media files
DROP POLICY IF EXISTS "Parents can view their own media" ON storage.objects;
CREATE POLICY "Parents can view their own media" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'media' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- Policy for updating media files
DROP POLICY IF EXISTS "Parents can update their own media" ON storage.objects;
CREATE POLICY "Parents can update their own media" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'media' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- Policy for deleting media files
DROP POLICY IF EXISTS "Parents can delete their own media" ON storage.objects;
CREATE POLICY "Parents can delete their own media" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'media' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- =============================================================================
-- REAL-TIME SUBSCRIPTIONS
-- =============================================================================

-- Enable real-time for key tables (idempotent)
DO $$
BEGIN
    -- Add tables to realtime publication if not already added
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables
        WHERE pubname = 'supabase_realtime' AND tablename = 'profiles'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE profiles;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables
        WHERE pubname = 'supabase_realtime' AND tablename = 'children'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE children;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables
        WHERE pubname = 'supabase_realtime' AND tablename = 'recipient_groups'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE recipient_groups;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables
        WHERE pubname = 'supabase_realtime' AND tablename = 'recipients'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE recipients;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables
        WHERE pubname = 'supabase_realtime' AND tablename = 'updates'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE updates;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables
        WHERE pubname = 'supabase_realtime' AND tablename = 'responses'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE responses;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables
        WHERE pubname = 'supabase_realtime' AND tablename = 'ai_prompts'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE ai_prompts;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables
        WHERE pubname = 'supabase_realtime' AND tablename = 'delivery_jobs'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE delivery_jobs;
    END IF;
END $$;