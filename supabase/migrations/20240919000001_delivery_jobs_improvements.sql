-- Tribe MVP Delivery Jobs Improvements
-- Migration: 20240919000001_delivery_jobs_improvements.sql
-- Description: Add missing indexes and improve delivery jobs table for email distribution

-- Add index on external_id for fast webhook lookups
CREATE INDEX IF NOT EXISTS idx_delivery_jobs_external_id ON delivery_jobs(external_id);

-- Add RLS policy for service role to update delivery jobs
DROP POLICY IF EXISTS "Service role can update delivery jobs" ON delivery_jobs;
CREATE POLICY "Service role can update delivery jobs" ON delivery_jobs
  FOR UPDATE USING (true); -- Service role has full access

-- Grant necessary permissions for Edge Functions
GRANT SELECT, INSERT, UPDATE ON delivery_jobs TO service_role;
GRANT SELECT ON updates TO service_role;
GRANT SELECT ON recipients TO service_role;
GRANT SELECT ON children TO service_role;
GRANT SELECT ON profiles TO service_role;