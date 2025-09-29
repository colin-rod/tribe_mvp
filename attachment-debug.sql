-- Attachment Processing Debug SQL
-- Run these queries to diagnose attachment upload issues

-- =============================================================================
-- 1. CHECK SUPABASE STORAGE SETUP
-- =============================================================================

-- Check if the 'media' storage bucket exists
SELECT
    name,
    id,
    created_at,
    updated_at,
    public
FROM storage.buckets
WHERE name = 'media';

-- Check bucket policies for the media bucket
SELECT
    id,
    name,
    definition,
    check_expression
FROM storage.policies
WHERE bucket_id = (SELECT id FROM storage.buckets WHERE name = 'media');

-- Check if there are any files in the email-attachments folder
SELECT
    name,
    bucket_id,
    created_at,
    updated_at,
    last_accessed_at,
    metadata
FROM storage.objects
WHERE name LIKE '%email-attachments%'
ORDER BY created_at DESC
LIMIT 20;

-- =============================================================================
-- 2. RECENT UPDATES WITH ATTACHMENT DATA
-- =============================================================================

-- Check recent updates to see attachment processing results
SELECT
    id,
    parent_id,
    subject,
    content,
    content_format,
    media_urls,
    rich_content,
    created_at
FROM updates
WHERE created_at > NOW() - INTERVAL '1 day'
ORDER BY created_at DESC
LIMIT 10;

-- Count updates by content format to see distribution
SELECT
    content_format,
    COUNT(*) as count,
    COUNT(CASE WHEN media_urls IS NOT NULL AND array_length(media_urls, 1) > 0 THEN 1 END) as with_media,
    COUNT(CASE WHEN rich_content IS NOT NULL THEN 1 END) as with_rich_content
FROM updates
WHERE created_at > NOW() - INTERVAL '7 days'
GROUP BY content_format;

-- =============================================================================
-- 3. STORAGE BUCKET POLICY CREATION (IF NEEDED)
-- =============================================================================

-- Create media bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public, created_at, updated_at)
SELECT 'media', 'media', true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM storage.buckets WHERE name = 'media');

-- Create policy to allow authenticated users to upload to their own folders
DO $$
BEGIN
    -- Allow authenticated users to upload to their own parent_id folder
    IF NOT EXISTS (
        SELECT 1 FROM storage.policies
        WHERE name = 'Users can upload to their own folder'
        AND bucket_id = 'media'
    ) THEN
        INSERT INTO storage.policies (name, bucket_id, definition)
        VALUES (
            'Users can upload to their own folder',
            'media',
            'CREATE POLICY "Users can upload to their own folder" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = ''media'' AND (storage.foldername(name))[1] = auth.uid()::text);'
        );
    END IF;

    -- Allow public read access to media files
    IF NOT EXISTS (
        SELECT 1 FROM storage.policies
        WHERE name = 'Public read access for media'
        AND bucket_id = 'media'
    ) THEN
        INSERT INTO storage.policies (name, bucket_id, definition)
        VALUES (
            'Public read access for media',
            'media',
            'CREATE POLICY "Public read access for media" ON storage.objects FOR SELECT TO public USING (bucket_id = ''media'');'
        );
    END IF;

    -- Allow service role to manage all files (for email webhook)
    IF NOT EXISTS (
        SELECT 1 FROM storage.policies
        WHERE name = 'Service role full access'
        AND bucket_id = 'media'
    ) THEN
        INSERT INTO storage.policies (name, bucket_id, definition)
        VALUES (
            'Service role full access',
            'media',
            'CREATE POLICY "Service role full access" ON storage.objects TO service_role USING (bucket_id = ''media'') WITH CHECK (bucket_id = ''media'');'
        );
    END IF;
END $$;

-- =============================================================================
-- 4. TEST STORAGE PERMISSIONS
-- =============================================================================

-- Test creating a dummy file (this would normally be done by the webhook)
-- You can run this to test if storage upload permissions are working

DO $$
DECLARE
    test_parent_id uuid := 'cfbe351e-f624-4fa5-a1b5-be583bf48b1a'; -- Replace with actual parent ID
    test_result text;
BEGIN
    -- This simulates what the webhook tries to do
    RAISE NOTICE 'Testing storage access for parent_id: %', test_parent_id;

    -- Check if we can theoretically create a file path
    test_result := test_parent_id::text || '/email-attachments/test-file.jpg';
    RAISE NOTICE 'Test file path would be: %', test_result;

    RAISE NOTICE 'Storage bucket exists: %',
        CASE WHEN EXISTS(SELECT 1 FROM storage.buckets WHERE name = 'media')
        THEN 'YES' ELSE 'NO' END;
END $$;

-- =============================================================================
-- 5. CHECK FOR ATTACHMENT PROCESSING ERRORS
-- =============================================================================

-- Look for updates that should have attachments but don't
SELECT
    id,
    subject,
    content,
    rich_content->'html' as html_content,
    media_urls,
    created_at
FROM updates
WHERE created_at > NOW() - INTERVAL '1 day'
  AND content_format = 'email'
  AND (
    content LIKE '%[image:%'
    OR rich_content->'html'::text LIKE '%<img%'
    OR rich_content->'html'::text LIKE '%cid:%'
  )
  AND (media_urls IS NULL OR array_length(media_urls, 1) = 0);

-- =============================================================================
-- 6. ANALYZE RICH CONTENT FOR INLINE IMAGES
-- =============================================================================

-- Find updates with HTML content that contains cid: references
SELECT
    id,
    subject,
    rich_content->'html' as html_with_cids,
    media_urls,
    created_at
FROM updates
WHERE rich_content->'html'::text LIKE '%cid:%'
ORDER BY created_at DESC
LIMIT 5;

-- Extract all CID references from recent HTML content
WITH cid_analysis AS (
    SELECT
        id,
        subject,
        regexp_matches(rich_content->'html'::text, 'src="cid:([^"]+)"', 'g') as cid_match,
        media_urls
    FROM updates
    WHERE rich_content->'html'::text LIKE '%cid:%'
      AND created_at > NOW() - INTERVAL '1 day'
)
SELECT
    id,
    subject,
    cid_match[1] as content_id,
    media_urls,
    CASE WHEN media_urls IS NULL OR array_length(media_urls, 1) = 0
         THEN '❌ No media URLs'
         ELSE '✅ Has media URLs'
    END as status
FROM cid_analysis;

-- =============================================================================
-- 7. SUMMARY REPORT
-- =============================================================================

-- Generate a summary report
DO $$
DECLARE
    bucket_exists boolean;
    recent_updates_count integer;
    updates_with_media integer;
    updates_with_cids integer;
    updates_missing_media integer;
BEGIN
    -- Check bucket
    SELECT EXISTS(SELECT 1 FROM storage.buckets WHERE name = 'media') INTO bucket_exists;

    -- Count recent updates
    SELECT COUNT(*) INTO recent_updates_count
    FROM updates
    WHERE created_at > NOW() - INTERVAL '1 day' AND content_format = 'email';

    -- Count updates with media
    SELECT COUNT(*) INTO updates_with_media
    FROM updates
    WHERE created_at > NOW() - INTERVAL '1 day'
      AND content_format = 'email'
      AND media_urls IS NOT NULL
      AND array_length(media_urls, 1) > 0;

    -- Count updates with CID references
    SELECT COUNT(*) INTO updates_with_cids
    FROM updates
    WHERE created_at > NOW() - INTERVAL '1 day'
      AND rich_content->'html'::text LIKE '%cid:%';

    -- Count updates that should have media but don't
    SELECT COUNT(*) INTO updates_missing_media
    FROM updates
    WHERE created_at > NOW() - INTERVAL '1 day'
      AND content_format = 'email'
      AND (
        content LIKE '%[image:%'
        OR rich_content->'html'::text LIKE '%<img%'
        OR rich_content->'html'::text LIKE '%cid:%'
      )
      AND (media_urls IS NULL OR array_length(media_urls, 1) = 0);

    RAISE NOTICE '=== ATTACHMENT PROCESSING SUMMARY ===';
    RAISE NOTICE 'Storage bucket "media" exists: %', CASE WHEN bucket_exists THEN 'YES' ELSE 'NO' END;
    RAISE NOTICE 'Recent email updates (24h): %', recent_updates_count;
    RAISE NOTICE 'Updates with media URLs: %', updates_with_media;
    RAISE NOTICE 'Updates with CID references: %', updates_with_cids;
    RAISE NOTICE 'Updates missing expected media: %', updates_missing_media;
    RAISE NOTICE '';

    IF updates_missing_media > 0 THEN
        RAISE NOTICE '❌ ISSUE: % updates appear to have images but no media_urls', updates_missing_media;
    END IF;

    IF NOT bucket_exists THEN
        RAISE NOTICE '❌ ISSUE: Media storage bucket does not exist';
    END IF;

    IF recent_updates_count = 0 THEN
        RAISE NOTICE '⚠️  WARNING: No recent email updates found for testing';
    END IF;
END $$;