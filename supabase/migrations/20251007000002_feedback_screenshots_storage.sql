-- Migration: Feedback Screenshots Storage Bucket
-- Date: 2025-10-07
-- Description: Create RLS policies for feedback screenshots storage bucket
-- Issue: Feedback screenshot attachment feature
--
-- IMPORTANT: The storage bucket must be created manually FIRST via Supabase Dashboard
--
-- Manual Steps Required BEFORE running this migration:
-- 1. Go to Storage in Supabase Dashboard
-- 2. Click "New bucket"
-- 3. Bucket name: feedback-screenshots
-- 4. Public bucket: Yes (checked)
-- 5. File size limit: 5 MB
-- 6. Allowed MIME types: image/png, image/jpeg, image/jpg, image/webp
-- 7. Click "Create bucket"
-- 8. THEN run this migration to set up the RLS policies

-- =============================================================================
-- 1. VERIFY BUCKET EXISTS
-- =============================================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM storage.buckets WHERE id = 'feedback-screenshots'
  ) THEN
    RAISE EXCEPTION 'ERROR: feedback-screenshots bucket does not exist. Please create it via Supabase Dashboard first (see migration header for instructions).';
  ELSE
    RAISE NOTICE 'SUCCESS: feedback-screenshots bucket found, proceeding with policy creation.';
  END IF;
END $$;

-- =============================================================================
-- 2. CONFIGURE BUCKET POLICIES
-- =============================================================================

-- Drop existing policies if they exist (for idempotency)
DROP POLICY IF EXISTS "Authenticated users can upload feedback screenshots" ON storage.objects;
DROP POLICY IF EXISTS "Anonymous users can upload feedback screenshots" ON storage.objects;
DROP POLICY IF EXISTS "Public read access to feedback screenshots" ON storage.objects;

-- Allow authenticated users to upload screenshots
CREATE POLICY "Authenticated users can upload feedback screenshots"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'feedback-screenshots'
);

-- Allow anonymous users to upload screenshots (for anonymous feedback)
CREATE POLICY "Anonymous users can upload feedback screenshots"
ON storage.objects
FOR INSERT
TO anon
WITH CHECK (
  bucket_id = 'feedback-screenshots'
);

-- Allow public read access to screenshots
CREATE POLICY "Public read access to feedback screenshots"
ON storage.objects
FOR SELECT
TO public
USING (
  bucket_id = 'feedback-screenshots'
);

-- =============================================================================
-- 3. VERIFICATION
-- =============================================================================

DO $$
DECLARE
  policy_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies
  WHERE tablename = 'objects'
  AND policyname LIKE '%feedback screenshots%';

  IF policy_count = 3 THEN
    RAISE NOTICE 'SUCCESS: All 3 RLS policies created successfully for feedback-screenshots bucket.';
  ELSE
    RAISE WARNING 'WARNING: Expected 3 policies, but found %. Please verify policy creation.', policy_count;
  END IF;
END $$;

-- =============================================================================
-- 4. CLEANUP POLICY (OPTIONAL)
-- =============================================================================

-- Note: You may want to add a scheduled cleanup job to delete old screenshots
-- after a certain period (e.g., 90 days). This can be done via a cron job
-- or Edge Function scheduled trigger.
--
-- Example cleanup query (DO NOT RUN IN MIGRATION):
-- DELETE FROM storage.objects
-- WHERE bucket_id = 'feedback-screenshots'
-- AND created_at < NOW() - INTERVAL '90 days';
