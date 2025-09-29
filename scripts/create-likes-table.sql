-- Create the likes table that's missing from production
-- This is based on the migration 20250926000002_likes_comments_system.sql

-- =============================================================================
-- 1. LIKES TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS likes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  update_id UUID REFERENCES updates(id) ON DELETE CASCADE NOT NULL,
  parent_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS for likes
ALTER TABLE likes ENABLE ROW LEVEL SECURITY;

-- RLS Policies for likes
DROP POLICY IF EXISTS "Parents can manage likes on their own updates" ON likes;
CREATE POLICY "Parents can manage likes on their own updates" ON likes
  FOR ALL USING (
    auth.uid() = parent_id OR
    EXISTS (
      SELECT 1 FROM updates
      WHERE updates.id = likes.update_id
      AND updates.parent_id = auth.uid()
    )
  );

-- Unique constraint to prevent duplicate likes
CREATE UNIQUE INDEX IF NOT EXISTS idx_likes_update_parent_unique ON likes(update_id, parent_id);

-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_likes_update_id ON likes(update_id);
CREATE INDEX IF NOT EXISTS idx_likes_parent_id ON likes(parent_id);
CREATE INDEX IF NOT EXISTS idx_likes_created_at ON likes(created_at DESC);

-- =============================================================================
-- 2. COMMENTS TABLE (if missing)
-- =============================================================================

CREATE TABLE IF NOT EXISTS comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  update_id UUID REFERENCES updates(id) ON DELETE CASCADE NOT NULL,
  parent_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  content TEXT NOT NULL CHECK (length(content) > 0 AND length(content) <= 1000),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS for comments
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for comments
DROP POLICY IF EXISTS "Parents can manage comments on their own updates" ON comments;
CREATE POLICY "Parents can manage comments on their own updates" ON comments
  FOR ALL USING (
    auth.uid() = parent_id OR
    EXISTS (
      SELECT 1 FROM updates
      WHERE updates.id = comments.update_id
      AND updates.parent_id = auth.uid()
    )
  );

-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_comments_update_id ON comments(update_id);
CREATE INDEX IF NOT EXISTS idx_comments_parent_id ON comments(parent_id);
CREATE INDEX IF NOT EXISTS idx_comments_created_at ON comments(created_at DESC);

-- =============================================================================
-- 3. UPDATE ENGAGEMENT COUNT COLUMNS (if missing)
-- =============================================================================

-- Check if engagement columns exist and add them if missing
DO $$
BEGIN
    -- Add like_count column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                  WHERE table_name = 'updates' AND column_name = 'like_count') THEN
        ALTER TABLE updates ADD COLUMN like_count INTEGER DEFAULT 0 NOT NULL;
    END IF;

    -- Add comment_count column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                  WHERE table_name = 'updates' AND column_name = 'comment_count') THEN
        ALTER TABLE updates ADD COLUMN comment_count INTEGER DEFAULT 0 NOT NULL;
    END IF;
END $$;

-- =============================================================================
-- 4. ENGAGEMENT COUNT TRIGGERS
-- =============================================================================

-- Function to update like counts
CREATE OR REPLACE FUNCTION update_like_counts()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE updates
    SET like_count = like_count + 1
    WHERE id = NEW.update_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE updates
    SET like_count = like_count - 1
    WHERE id = OLD.update_id AND like_count > 0;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Function to update comment counts
CREATE OR REPLACE FUNCTION update_comment_counts()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE updates
    SET comment_count = comment_count + 1
    WHERE id = NEW.update_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE updates
    SET comment_count = comment_count - 1
    WHERE id = OLD.update_id AND comment_count > 0;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Triggers for automatic count updates
DROP TRIGGER IF EXISTS update_like_counts_trigger ON likes;
CREATE TRIGGER update_like_counts_trigger
  AFTER INSERT OR DELETE ON likes
  FOR EACH ROW EXECUTE FUNCTION update_like_counts();

DROP TRIGGER IF EXISTS update_comment_counts_trigger ON comments;
CREATE TRIGGER update_comment_counts_trigger
  AFTER INSERT OR DELETE ON comments
  FOR EACH ROW EXECUTE FUNCTION update_comment_counts();

-- =============================================================================
-- 5. INITIALIZE ENGAGEMENT COUNTS
-- =============================================================================

-- Update existing records with correct counts
UPDATE updates
SET like_count = (
  SELECT COUNT(*)
  FROM likes
  WHERE likes.update_id = updates.id
),
comment_count = (
  SELECT COUNT(*)
  FROM comments
  WHERE comments.update_id = updates.id
);

-- =============================================================================
-- 6. REAL-TIME SUBSCRIPTIONS
-- =============================================================================

-- Add likes and comments to real-time publication
DO $$
BEGIN
    -- Add likes table to realtime publication if not already added
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables
        WHERE pubname = 'supabase_realtime' AND tablename = 'likes'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE likes;
    END IF;

    -- Add comments table to realtime publication if not already added
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables
        WHERE pubname = 'supabase_realtime' AND tablename = 'comments'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE comments;
    END IF;
END $$;

-- =============================================================================
-- 7. COMMENTS AND DOCUMENTATION
-- =============================================================================

-- Add comments to tables and functions
COMMENT ON TABLE likes IS 'Stores likes/reactions on updates';
COMMENT ON TABLE comments IS 'Stores comments on updates';