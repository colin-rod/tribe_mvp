-- Migration: 20251013000001_full_text_search_optimization.sql
-- Description: Optimize full-text search with ranking, comments support, and performance enhancements
-- Issue: CRO-127 - Suboptimal Full-Text Search Implementation
--
-- IMPORTANT: Execute this migration via Supabase SQL Editor
-- Do NOT run via CLI or automated migration tools

-- ============================================================================
-- PART 1: Add full-text search support to comments table
-- ============================================================================

-- Add search_vector column to comments table
ALTER TABLE public.comments
ADD COLUMN IF NOT EXISTS search_vector tsvector;

-- Create GIN index for fast full-text search on comments
CREATE INDEX IF NOT EXISTS idx_comments_search_vector
ON public.comments
USING gin(search_vector);

-- Create function to update comment search vectors
CREATE OR REPLACE FUNCTION public.update_comments_search_vector()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Update search vector with comment content
  NEW.search_vector := to_tsvector('english', COALESCE(NEW.content, ''));
  RETURN NEW;
END;
$$;

-- Create trigger to automatically update search vector on comments
DROP TRIGGER IF EXISTS comments_search_vector_update ON public.comments;

CREATE TRIGGER comments_search_vector_update
  BEFORE INSERT OR UPDATE OF content
  ON public.comments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_comments_search_vector();

-- Backfill existing comments with search vectors
UPDATE public.comments
SET search_vector = to_tsvector('english', COALESCE(content, ''))
WHERE search_vector IS NULL;

COMMENT ON COLUMN public.comments.search_vector IS 'Full-text search vector for comment content';

-- ============================================================================
-- PART 2: Create optimized search functions with ranking
-- ============================================================================

-- Function to search memories with ranking
CREATE OR REPLACE FUNCTION public.search_memories(
  search_query TEXT,
  user_id UUID,
  result_limit INTEGER DEFAULT 50,
  result_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  subject TEXT,
  content TEXT,
  child_id UUID,
  distribution_status TEXT,
  created_at TIMESTAMPTZ,
  search_rank REAL
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
DECLARE
  query_ts tsquery;
BEGIN
  -- Convert search query to tsquery
  query_ts := to_tsquery('english', search_query);

  -- Search memories with ranking
  RETURN QUERY
  SELECT
    m.id,
    m.subject,
    m.content,
    m.child_id,
    m.distribution_status,
    m.created_at,
    -- Ranking formula:
    -- - Subject matches weighted higher (A weight = 1.0)
    -- - Content matches weighted lower (B weight = 0.4)
    -- - Consider document length normalization (rank_cd uses both)
    ts_rank_cd(m.search_vector, query_ts, 32) AS search_rank
  FROM public.memories m
  WHERE
    m.parent_id = search_memories.user_id
    AND m.search_vector @@ query_ts
  ORDER BY
    search_rank DESC,
    m.created_at DESC
  LIMIT result_limit
  OFFSET result_offset;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.search_memories(TEXT, UUID, INTEGER, INTEGER) TO authenticated;

COMMENT ON FUNCTION public.search_memories IS 'Full-text search for memories with ranking. Uses PostgreSQL FTS with ts_rank_cd for relevance scoring.';

-- Function to search comments with ranking
CREATE OR REPLACE FUNCTION public.search_comments(
  search_query TEXT,
  user_id UUID,
  result_limit INTEGER DEFAULT 50,
  result_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  content TEXT,
  update_id UUID,
  update_subject TEXT,
  created_at TIMESTAMPTZ,
  search_rank REAL
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
DECLARE
  query_ts tsquery;
BEGIN
  -- Convert search query to tsquery
  query_ts := to_tsquery('english', search_query);

  -- Search comments with ranking
  RETURN QUERY
  SELECT
    c.id,
    c.content,
    c.update_id,
    m.subject AS update_subject,
    c.created_at,
    ts_rank(c.search_vector, query_ts) AS search_rank
  FROM public.comments c
  INNER JOIN public.memories m ON c.update_id = m.id
  WHERE
    c.parent_id = search_comments.user_id
    AND c.search_vector @@ query_ts
  ORDER BY
    search_rank DESC,
    c.created_at DESC
  LIMIT result_limit
  OFFSET result_offset;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.search_comments(TEXT, UUID, INTEGER, INTEGER) TO authenticated;

COMMENT ON FUNCTION public.search_comments IS 'Full-text search for comments with ranking. Uses PostgreSQL FTS with ts_rank for relevance scoring.';

-- ============================================================================
-- PART 3: Advanced search with headline (snippet) generation
-- ============================================================================

-- Function to search memories with highlighted snippets
CREATE OR REPLACE FUNCTION public.search_memories_with_highlights(
  search_query TEXT,
  user_id UUID,
  result_limit INTEGER DEFAULT 50,
  result_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  subject TEXT,
  content TEXT,
  subject_highlight TEXT,
  content_highlight TEXT,
  child_id UUID,
  distribution_status TEXT,
  created_at TIMESTAMPTZ,
  search_rank REAL
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
DECLARE
  query_ts tsquery;
BEGIN
  -- Convert search query to tsquery
  query_ts := to_tsquery('english', search_query);

  -- Search memories with highlighted snippets
  RETURN QUERY
  SELECT
    m.id,
    m.subject,
    m.content,
    -- Generate highlighted headline for subject
    ts_headline('english', COALESCE(m.subject, ''), query_ts,
      'StartSel=<mark>, StopSel=</mark>, MaxWords=20, MinWords=10'
    ) AS subject_highlight,
    -- Generate highlighted headline for content
    ts_headline('english', COALESCE(m.content, ''), query_ts,
      'StartSel=<mark>, StopSel=</mark>, MaxWords=50, MinWords=20, MaxFragments=3'
    ) AS content_highlight,
    m.child_id,
    m.distribution_status,
    m.created_at,
    ts_rank_cd(m.search_vector, query_ts, 32) AS search_rank
  FROM public.memories m
  WHERE
    m.parent_id = search_memories_with_highlights.user_id
    AND m.search_vector @@ query_ts
  ORDER BY
    search_rank DESC,
    m.created_at DESC
  LIMIT result_limit
  OFFSET result_offset;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.search_memories_with_highlights(TEXT, UUID, INTEGER, INTEGER) TO authenticated;

COMMENT ON FUNCTION public.search_memories_with_highlights IS 'Full-text search for memories with auto-generated highlighted snippets using ts_headline.';

-- ============================================================================
-- PART 4: Search analytics support
-- ============================================================================

-- Create table for search analytics
CREATE TABLE IF NOT EXISTS public.search_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  query TEXT NOT NULL,
  results_count INTEGER NOT NULL DEFAULT 0,
  execution_time_ms INTEGER,
  search_types TEXT[] DEFAULT '{}',
  clicked_result_id UUID,
  clicked_result_type TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for analytics queries
CREATE INDEX IF NOT EXISTS idx_search_analytics_user_id
ON public.search_analytics(user_id);

CREATE INDEX IF NOT EXISTS idx_search_analytics_created_at
ON public.search_analytics(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_search_analytics_query
ON public.search_analytics USING gin(to_tsvector('english', query));

-- Enable RLS
ALTER TABLE public.search_analytics ENABLE ROW LEVEL SECURITY;

-- RLS policy: Users can only access their own search analytics
CREATE POLICY "Users can view their own search analytics"
ON public.search_analytics
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own search analytics"
ON public.search_analytics
FOR INSERT
WITH CHECK (auth.uid() = user_id);

COMMENT ON TABLE public.search_analytics IS 'Tracks search queries for analytics and improvement. Helps identify popular searches and search performance.';

-- ============================================================================
-- PART 5: Maintenance and monitoring functions
-- ============================================================================

-- Function to get search statistics
CREATE OR REPLACE FUNCTION public.get_search_statistics(
  user_id UUID,
  days_back INTEGER DEFAULT 30
)
RETURNS TABLE (
  total_searches BIGINT,
  unique_queries BIGINT,
  avg_results_count NUMERIC,
  avg_execution_time_ms NUMERIC,
  top_queries TEXT[]
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*) AS total_searches,
    COUNT(DISTINCT query) AS unique_queries,
    AVG(results_count) AS avg_results_count,
    AVG(execution_time_ms) AS avg_execution_time_ms,
    ARRAY_AGG(DISTINCT query ORDER BY COUNT(*) DESC)::TEXT[] AS top_queries
  FROM public.search_analytics
  WHERE
    search_analytics.user_id = get_search_statistics.user_id
    AND created_at >= NOW() - (days_back || ' days')::INTERVAL
  GROUP BY search_analytics.user_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_search_statistics(UUID, INTEGER) TO authenticated;

COMMENT ON FUNCTION public.get_search_statistics IS 'Get search usage statistics for a user over a specified time period.';

-- Function to rebuild search vectors (maintenance)
CREATE OR REPLACE FUNCTION public.rebuild_search_vectors()
RETURNS TABLE (
  table_name TEXT,
  rows_updated BIGINT
)
LANGUAGE plpgsql
AS $$
DECLARE
  memories_count BIGINT;
  comments_count BIGINT;
BEGIN
  -- Rebuild memories search vectors
  UPDATE public.memories m
  SET search_vector = (
    CASE
      WHEN m.content_format = 'rich' THEN
        setweight(to_tsvector('english', COALESCE(m.subject, '')), 'A') ||
        setweight(to_tsvector('english', COALESCE(public.extract_plain_text_from_html(m.content), '')), 'B')
      ELSE
        setweight(to_tsvector('english', COALESCE(m.subject, '')), 'A') ||
        setweight(to_tsvector('english', COALESCE(m.content, '')), 'B')
    END
  );

  GET DIAGNOSTICS memories_count = ROW_COUNT;

  -- Rebuild comments search vectors
  UPDATE public.comments
  SET search_vector = to_tsvector('english', COALESCE(content, ''));

  GET DIAGNOSTICS comments_count = ROW_COUNT;

  -- Return results
  RETURN QUERY
  SELECT 'memories'::TEXT, memories_count
  UNION ALL
  SELECT 'comments'::TEXT, comments_count;
END;
$$;

COMMENT ON FUNCTION public.rebuild_search_vectors IS 'Maintenance function to rebuild all search vectors. Run if search results seem stale or after bulk data changes.';

-- ============================================================================
-- PART 6: Performance optimization
-- ============================================================================

-- Create covering index for common memory searches
CREATE INDEX IF NOT EXISTS idx_memories_search_covering
ON public.memories(parent_id, distribution_status, created_at)
WHERE search_vector IS NOT NULL;

-- Analyze tables to update statistics for query planner
ANALYZE public.memories;
ANALYZE public.comments;
ANALYZE public.search_analytics;

-- ============================================================================
-- Migration Summary
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '=============================================================';
  RAISE NOTICE 'Migration completed successfully!';
  RAISE NOTICE '=============================================================';
  RAISE NOTICE 'Added:';
  RAISE NOTICE '  ✓ Full-text search vectors for comments table';
  RAISE NOTICE '  ✓ GIN indexes for fast text search';
  RAISE NOTICE '  ✓ search_memories() function with ranking';
  RAISE NOTICE '  ✓ search_comments() function with ranking';
  RAISE NOTICE '  ✓ search_memories_with_highlights() for snippets';
  RAISE NOTICE '  ✓ search_analytics table for monitoring';
  RAISE NOTICE '  ✓ get_search_statistics() for analytics';
  RAISE NOTICE '  ✓ rebuild_search_vectors() maintenance function';
  RAISE NOTICE '  ✓ Performance optimizations and covering indexes';
  RAISE NOTICE '';
  RAISE NOTICE 'Usage Examples:';
  RAISE NOTICE '  -- Search memories:';
  RAISE NOTICE '  SELECT * FROM search_memories(''baby first steps'', auth.uid());';
  RAISE NOTICE '';
  RAISE NOTICE '  -- Search with highlights:';
  RAISE NOTICE '  SELECT * FROM search_memories_with_highlights(''birthday party'', auth.uid());';
  RAISE NOTICE '';
  RAISE NOTICE '  -- Get search statistics:';
  RAISE NOTICE '  SELECT * FROM get_search_statistics(auth.uid(), 30);';
  RAISE NOTICE '';
  RAISE NOTICE '  -- Rebuild search vectors (maintenance):';
  RAISE NOTICE '  SELECT * FROM rebuild_search_vectors();';
  RAISE NOTICE '=============================================================';
END $$;
