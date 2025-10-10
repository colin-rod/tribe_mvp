-- Fix Notification Jobs Table References
-- Migration: 20251010000001_fix_notification_jobs_references.sql
-- Description: Fix foreign key references in notification_jobs table from child_updates to memories
-- Issue: CRO-102 - Background Job Processing System
--
-- IMPORTANT: Execute this migration via Supabase SQL Editor
-- Do NOT run via CLI or automated migration tools

-- Drop the existing foreign key constraint if it exists
DO $$
BEGIN
    -- Check if the constraint exists on child_updates (incorrect reference)
    IF EXISTS (
        SELECT 1
        FROM information_schema.table_constraints
        WHERE constraint_name = 'notification_jobs_update_id_fkey'
        AND table_name = 'notification_jobs'
    ) THEN
        -- Drop the incorrect foreign key
        ALTER TABLE notification_jobs
        DROP CONSTRAINT IF EXISTS notification_jobs_update_id_fkey;

        RAISE NOTICE 'Dropped incorrect foreign key constraint';
    END IF;
END $$;

-- Add the correct foreign key constraint to memories table
-- Allow NULL for update_id since digest notifications don't have a specific update
ALTER TABLE notification_jobs
ALTER COLUMN update_id DROP NOT NULL;

-- Add correct foreign key to memories table
ALTER TABLE notification_jobs
ADD CONSTRAINT notification_jobs_update_id_fkey
FOREIGN KEY (update_id)
REFERENCES memories(id)
ON DELETE CASCADE;

-- Update the digest creation function to use correct table name
CREATE OR REPLACE FUNCTION create_digest_jobs()
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
  digest_record RECORD;
  update_count INTEGER;
  digest_content JSONB;
  job_count INTEGER := 0;
BEGIN
  -- Find digests that are due
  FOR digest_record IN
    SELECT ds.*, r.preference_token, rg.name as group_name
    FROM digest_schedules ds
    JOIN recipients r ON r.id = ds.recipient_id
    JOIN recipient_groups rg ON rg.id = ds.group_id
    WHERE ds.is_active = true
    AND ds.next_digest_scheduled <= NOW()
    AND NOT is_recipient_muted(ds.recipient_id, ds.group_id)
  LOOP
    -- Count pending updates for this recipient/group since last digest
    -- FIXED: Changed from child_updates to memories
    SELECT COUNT(*) INTO update_count
    FROM memories m
    WHERE m.child_id IN (
      -- Get all children for the parent who owns this group
      SELECT c.id FROM children c
      WHERE c.parent_id = (
        SELECT parent_id FROM recipient_groups WHERE id = digest_record.group_id
      )
    )
    AND m.created_at > COALESCE(digest_record.last_digest_sent, digest_record.created_at)
    AND m.created_at <= NOW()
    AND m.distribution_status = 'ready'; -- Only count ready memories

    -- Only create digest if there are updates
    IF update_count > 0 THEN
      -- Build digest content
      digest_content := json_build_object(
        'type', 'digest',
        'frequency', digest_record.frequency,
        'group_name', digest_record.group_name,
        'update_count', update_count,
        'recipient_token', digest_record.preference_token,
        'digest_settings', digest_record.digest_settings
      );

      -- Create digest job (update_id can be NULL for digests)
      PERFORM enqueue_notification_job(
        digest_record.recipient_id,
        digest_record.group_id,
        NULL, -- No specific update for digests
        'digest',
        'normal',
        'email', -- Digests are typically email-only
        digest_content,
        0
      );

      -- Update digest schedule
      UPDATE digest_schedules
      SET
        last_digest_sent = NOW(),
        next_digest_scheduled = CASE
          WHEN frequency = 'daily' THEN
            (DATE(NOW()) + INTERVAL '1 day' + delivery_time::INTERVAL) AT TIME ZONE timezone
          WHEN frequency = 'weekly' THEN
            (DATE(NOW()) + INTERVAL '7 days' + delivery_time::INTERVAL) AT TIME ZONE timezone
          WHEN frequency = 'monthly' THEN
            (DATE(NOW()) + INTERVAL '1 month' + delivery_time::INTERVAL) AT TIME ZONE timezone
        END
      WHERE id = digest_record.id;

      job_count := job_count + 1;
    END IF;
  END LOOP;

  RETURN job_count;
END;
$$;

-- Add helpful comment
COMMENT ON TABLE notification_jobs IS 'Background job queue for notifications. update_id references memories table (formerly child_updates).';

-- Verify the fix
DO $$
DECLARE
    fk_exists BOOLEAN;
BEGIN
    -- Check if foreign key now correctly references memories
    SELECT EXISTS (
        SELECT 1
        FROM information_schema.referential_constraints rc
        JOIN information_schema.key_column_usage kcu
        ON rc.constraint_name = kcu.constraint_name
        WHERE rc.constraint_name = 'notification_jobs_update_id_fkey'
        AND kcu.table_name = 'notification_jobs'
        AND kcu.column_name = 'update_id'
        AND EXISTS (
            SELECT 1
            FROM information_schema.key_column_usage kcu2
            WHERE kcu2.constraint_name = rc.unique_constraint_name
            AND kcu2.table_name = 'memories'
        )
    ) INTO fk_exists;

    IF fk_exists THEN
        RAISE NOTICE '✓ Foreign key constraint correctly references memories table';
    ELSE
        RAISE WARNING '✗ Foreign key constraint may not be correctly configured';
    END IF;
END $$;
