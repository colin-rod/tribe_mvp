-- Ensure recipient email/phone uniqueness per parent via normalized columns
-- Migration: 20251015000001_recipient_contact_uniqueness.sql
--
-- This migration deduplicates existing recipient contacts and introduces
-- normalized generated columns plus unique indexes scoped by parent_id to
-- prevent future duplicates. Deduplication keeps the earliest recipient record
-- (by created_at, then id) for each parent + email or parent + phone pair and
-- clears the conflicting email/phone on later duplicates. This preserves
-- dependent foreign-key relationships while allowing parents to re-enter a
-- secondary contact method manually if desired.
--
-- Steps:
--   1. Backfill: for duplicate emails we null out the email on later rows; for
--      duplicate phone numbers (normalized by digits only) we null out the
--      phone on later rows. The data change is documented here so operators can
--      audit the approach used.
--   2. Schema: add generated columns for lower(email) and sanitized phone
--      digits, using NULLIF to treat empty strings as NULL.
--   3. Constraints: create partial unique indexes on (parent_id,
--      email_normalized) and (parent_id, phone_sanitized) for non-null values.
--
-- The deduplication strategy keeps the recipient with the earliest
-- created_at (and stable id) to minimize disruption to dependent tables. Any
-- later duplicates simply lose the conflicting email or phone value; they are
-- still available for manual cleanup if desired.

BEGIN;

-- ============================================================================
-- Step 1: Deduplicate conflicting emails (case-insensitive)
-- ============================================================================
WITH ranked_emails AS (
  SELECT
    id,
    parent_id,
    lower(email) AS email_normalized,
    ROW_NUMBER() OVER (
      PARTITION BY parent_id, lower(email)
      ORDER BY created_at, id
    ) AS row_rank
  FROM recipients
  WHERE email IS NOT NULL
)
UPDATE recipients r
SET email = NULL,
    updated_at = NOW()
FROM ranked_emails re
WHERE r.id = re.id
  AND re.email_normalized IS NOT NULL
  AND re.row_rank > 1;
-- ============================================================================
-- Step 1b: Deduplicate conflicting phone numbers (digits only)
-- ============================================================================
WITH ranked_phones AS (
  SELECT
    id,
    parent_id,
    NULLIF(regexp_replace(phone, '\\D', '', 'g'), '') AS phone_sanitized,
    ROW_NUMBER() OVER (
      PARTITION BY parent_id, NULLIF(regexp_replace(phone, '\\D', '', 'g'), '')
      ORDER BY created_at, id
    ) AS row_rank
  FROM recipients
  WHERE phone IS NOT NULL
)
UPDATE recipients r
SET phone = NULL,
    updated_at = NOW()
FROM ranked_phones rp
WHERE r.id = rp.id
  AND rp.phone_sanitized IS NOT NULL
  AND rp.row_rank > 1;
-- ============================================================================
-- Step 2: Add generated columns for normalized values
-- ============================================================================
ALTER TABLE recipients
  ADD COLUMN IF NOT EXISTS email_normalized TEXT
    GENERATED ALWAYS AS (lower(email)) STORED,
  ADD COLUMN IF NOT EXISTS phone_sanitized TEXT
    GENERATED ALWAYS AS (NULLIF(regexp_replace(phone, '\\D', '', 'g'), '')) STORED;

-- ============================================================================
-- Step 3: Enforce uniqueness via partial indexes
-- ============================================================================
CREATE UNIQUE INDEX IF NOT EXISTS idx_recipients_parent_email_unique
  ON recipients(parent_id, email_normalized)
  WHERE email_normalized IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_recipients_parent_phone_unique
  ON recipients(parent_id, phone_sanitized)
  WHERE phone_sanitized IS NOT NULL;

COMMIT;
