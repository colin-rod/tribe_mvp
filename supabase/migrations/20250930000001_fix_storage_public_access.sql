-- Migration: Fix Storage Bucket Public Access for Email Attachments
-- Date: 2025-09-30
-- Description: Make media bucket public and add public read policy for storage objects
-- This fixes the 400 error when loading email attachments from storage

-- =============================================================================
-- UPDATE MEDIA BUCKET TO PUBLIC
-- =============================================================================

-- Update the media bucket to be public
-- This allows public read access to all files in the bucket without authentication
UPDATE storage.buckets
SET public = true
WHERE name = 'media';

-- =============================================================================
-- ADD PUBLIC READ POLICY FOR STORAGE OBJECTS
-- =============================================================================

-- Drop the old restrictive policy if it exists
DROP POLICY IF EXISTS "Parents can view their own media" ON storage.objects;

-- Create a new public read policy that allows anyone to view media files
-- This is necessary for:
-- 1. Email attachments to be displayed in the dashboard
-- 2. Next.js image optimization to fetch the images
-- 3. Recipients to view shared media in emails
CREATE POLICY "Public can view all media files"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'media');

-- Keep the existing upload policies restricted to authenticated users
-- These policies already exist from the initial schema:
-- - "Parents can upload media for their updates" (INSERT)
-- - "Parents can update their own media" (UPDATE)
-- - "Parents can delete their own media" (DELETE)

-- =============================================================================
-- VERIFY STORAGE SETUP
-- =============================================================================

-- This query can be used to verify the storage setup after migration
-- Run manually if needed:
--
-- SELECT
--     b.name as bucket_name,
--     b.public as is_public,
--     p.name as policy_name,
--     p.action as policy_action
-- FROM storage.buckets b
-- LEFT JOIN storage.policies p ON p.bucket_id = b.id
-- WHERE b.name = 'media'
-- ORDER BY p.action;