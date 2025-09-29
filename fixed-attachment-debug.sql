-- Fixed Simple Attachment Debug SQL
-- Check recent updates and their attachment processing

-- 1. Check recent email updates
SELECT
    id,
    subject,
    content,
    content_format,
    media_urls,
    array_length(media_urls, 1) as media_count,
    created_at
FROM updates
WHERE content_format = 'email'
  AND created_at > NOW() - INTERVAL '1 day'
ORDER BY created_at DESC
LIMIT 10;

-- 2. Check for updates with HTML that contains images (fixed JSONB casting)
SELECT
    id,
    subject,
    (rich_content->>'html') as html_content,
    media_urls,
    created_at
FROM updates
WHERE (rich_content->>'html') LIKE '%<img%'
  AND created_at > NOW() - INTERVAL '1 day'
ORDER BY created_at DESC;

-- 3. Check for updates that mention images but have no media_urls (fixed JSONB casting)
SELECT
    id,
    subject,
    content,
    (rich_content->>'html') as html_content,
    media_urls,
    created_at
FROM updates
WHERE (
    content LIKE '%[image:%'
    OR (rich_content->>'html') LIKE '%<img%'
    OR (rich_content->>'html') LIKE '%cid:%'
  )
  AND (media_urls IS NULL OR array_length(media_urls, 1) = 0)
  AND created_at > NOW() - INTERVAL '1 day'
ORDER BY created_at DESC;

-- 4. Summary of recent email updates (fixed JSONB casting)
SELECT
    COUNT(*) as total_email_updates,
    COUNT(CASE WHEN media_urls IS NOT NULL AND array_length(media_urls, 1) > 0 THEN 1 END) as with_media_urls,
    COUNT(CASE WHEN (rich_content->>'html') LIKE '%<img%' THEN 1 END) as with_html_images,
    COUNT(CASE WHEN content LIKE '%[image:%' THEN 1 END) as with_image_text,
    COUNT(CASE WHEN (rich_content->>'html') LIKE '%cid:%' THEN 1 END) as with_cid_references
FROM updates
WHERE content_format = 'email'
  AND created_at > NOW() - INTERVAL '1 day';