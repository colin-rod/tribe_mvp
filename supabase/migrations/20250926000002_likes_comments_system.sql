-- Likes and Comments System Migration
-- Migration: 20250926000002_likes_comments_system.sql
-- Description: Add likes and comments tables for engagement tracking

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
-- 2. COMMENTS TABLE
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

-- Add updated_at trigger for comments
DROP TRIGGER IF EXISTS update_comments_updated_at ON comments;
CREATE TRIGGER update_comments_updated_at BEFORE UPDATE ON comments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- 3. ENGAGEMENT COUNT TRIGGERS
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
-- 4. INITIALIZE ENGAGEMENT COUNTS
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
-- 5. ENGAGEMENT QUERY FUNCTIONS
-- =============================================================================

-- Function to get likes for an update
CREATE OR REPLACE FUNCTION get_update_likes(
  p_update_id UUID,
  p_parent_id UUID
)
RETURNS TABLE(
  id UUID,
  parent_id UUID,
  parent_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Verify the requesting user can access this update
  IF NOT EXISTS (
    SELECT 1 FROM updates
    WHERE id = p_update_id AND parent_id = p_parent_id
  ) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  RETURN QUERY
  SELECT
    l.id,
    l.parent_id,
    p.name as parent_name,
    l.created_at
  FROM likes l
  JOIN profiles p ON l.parent_id = p.id
  WHERE l.update_id = p_update_id
  ORDER BY l.created_at DESC;
END;
$$;

-- Function to get comments for an update
CREATE OR REPLACE FUNCTION get_update_comments(
  p_update_id UUID,
  p_parent_id UUID,
  p_limit INTEGER DEFAULT 50,
  p_offset INTEGER DEFAULT 0
)
RETURNS TABLE(
  id UUID,
  parent_id UUID,
  parent_name TEXT,
  content TEXT,
  created_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Verify the requesting user can access this update
  IF NOT EXISTS (
    SELECT 1 FROM updates
    WHERE id = p_update_id AND parent_id = p_parent_id
  ) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  RETURN QUERY
  SELECT
    c.id,
    c.parent_id,
    p.name as parent_name,
    c.content,
    c.created_at,
    c.updated_at
  FROM comments c
  JOIN profiles p ON c.parent_id = p.id
  WHERE c.update_id = p_update_id
  ORDER BY c.created_at ASC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;

-- Function to toggle like on an update
CREATE OR REPLACE FUNCTION toggle_update_like(
  p_update_id UUID,
  p_parent_id UUID
)
RETURNS TABLE(
  is_liked BOOLEAN,
  like_count INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  existing_like_id UUID;
  new_like_count INTEGER;
  is_now_liked BOOLEAN;
BEGIN
  -- Verify the update exists and user can access it
  IF NOT EXISTS (
    SELECT 1 FROM updates
    WHERE id = p_update_id
    AND (parent_id = p_parent_id OR p_parent_id = auth.uid())
  ) THEN
    RAISE EXCEPTION 'Access denied or update not found';
  END IF;

  -- Check if like already exists
  SELECT id INTO existing_like_id
  FROM likes
  WHERE update_id = p_update_id AND parent_id = p_parent_id;

  IF existing_like_id IS NOT NULL THEN
    -- Remove existing like
    DELETE FROM likes WHERE id = existing_like_id;
    is_now_liked := FALSE;
  ELSE
    -- Add new like
    INSERT INTO likes (update_id, parent_id)
    VALUES (p_update_id, p_parent_id);
    is_now_liked := TRUE;
  END IF;

  -- Get updated like count
  SELECT like_count INTO new_like_count
  FROM updates
  WHERE id = p_update_id;

  RETURN QUERY SELECT is_now_liked, new_like_count;
END;
$$;

-- Function to add comment to an update
CREATE OR REPLACE FUNCTION add_update_comment(
  p_update_id UUID,
  p_parent_id UUID,
  p_content TEXT
)
RETURNS TABLE(
  id UUID,
  content TEXT,
  created_at TIMESTAMP WITH TIME ZONE,
  comment_count INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_comment_id UUID;
  new_comment_count INTEGER;
BEGIN
  -- Verify the update exists and user can access it
  IF NOT EXISTS (
    SELECT 1 FROM updates
    WHERE id = p_update_id
    AND (parent_id = p_parent_id OR p_parent_id = auth.uid())
  ) THEN
    RAISE EXCEPTION 'Access denied or update not found';
  END IF;

  -- Validate content
  IF p_content IS NULL OR length(trim(p_content)) = 0 THEN
    RAISE EXCEPTION 'Comment content cannot be empty';
  END IF;

  IF length(p_content) > 1000 THEN
    RAISE EXCEPTION 'Comment content too long (max 1000 characters)';
  END IF;

  -- Insert comment
  INSERT INTO comments (update_id, parent_id, content)
  VALUES (p_update_id, p_parent_id, trim(p_content))
  RETURNING comments.id INTO new_comment_id;

  -- Get updated comment count
  SELECT comment_count INTO new_comment_count
  FROM updates
  WHERE id = p_update_id;

  -- Return comment details
  RETURN QUERY
  SELECT
    new_comment_id,
    trim(p_content),
    NOW(),
    new_comment_count;
END;
$$;

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

COMMENT ON FUNCTION toggle_update_like IS 'Toggle like status on an update and return current state';
COMMENT ON FUNCTION add_update_comment IS 'Add a comment to an update with validation';
COMMENT ON FUNCTION get_update_likes IS 'Get all likes for a specific update';
COMMENT ON FUNCTION get_update_comments IS 'Get paginated comments for a specific update';