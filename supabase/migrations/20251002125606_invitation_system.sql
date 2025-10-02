-- Migration: 20251002125606_invitation_system.sql
-- Description: Invitation system supporting single-use and unlimited reusable links
-- Issue: CRO-242 - Invitation System (Single-use + Reusable Links)
--
-- IMPORTANT: Execute this migration via Supabase SQL Editor
-- Do NOT run via CLI or automated migration tools

-- =============================================================================
-- INVITATIONS TABLE
-- =============================================================================
-- Supports two types of invitations:
-- 1. Single-use: Sent to specific person via email/SMS/WhatsApp, expires after use
-- 2. Reusable: Public shareable link with unlimited uses (until revoked)
-- =============================================================================

CREATE TABLE IF NOT EXISTS invitations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  parent_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,

  -- Invitation Type
  invitation_type VARCHAR NOT NULL CHECK (invitation_type IN ('single_use', 'reusable')),

  -- Unique token for the invitation link
  token VARCHAR UNIQUE NOT NULL,

  -- Status tracking
  status VARCHAR NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'revoked', 'used')),
  -- Note: 'used' status only applies to single_use invitations

  -- Communication channel (single_use specific)
  channel VARCHAR CHECK (channel IN ('email', 'sms', 'whatsapp', 'link')),
  -- 'link' channel indicates it's a reusable link

  -- Single-use recipient contact (nullable for reusable links)
  recipient_email VARCHAR,
  recipient_phone VARCHAR,

  -- Expiration (only for single_use, nullable for reusable)
  expires_at TIMESTAMP WITH TIME ZONE,

  -- Group assignment - recipients who join via this invitation auto-join this group
  group_id UUID REFERENCES recipient_groups(id) ON DELETE SET NULL,

  -- Custom message from parent to include in invitation
  custom_message TEXT,

  -- Usage tracking (mainly for analytics on reusable links)
  use_count INTEGER DEFAULT 0,

  -- Additional metadata (QR code settings, branding, etc.)
  metadata JSONB DEFAULT '{}'::jsonb,

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================================================
-- INVITATION REDEMPTIONS TABLE
-- =============================================================================
-- Tracks each time an invitation is redeemed (used to join)
-- For single_use: Should have max 1 row per invitation_id
-- For reusable: Can have unlimited rows (one per recipient who joins)
-- =============================================================================

CREATE TABLE IF NOT EXISTS invitation_redemptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Which invitation was used
  invitation_id UUID REFERENCES invitations(id) ON DELETE CASCADE NOT NULL,

  -- Which recipient was created from this redemption
  recipient_id UUID REFERENCES recipients(id) ON DELETE CASCADE NOT NULL,

  -- When was it redeemed
  redeemed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Optional analytics/security tracking
  ip_address VARCHAR,
  user_agent TEXT
);

-- =============================================================================
-- INDEXES
-- =============================================================================

-- Fast token lookups (critical for public invitation validation)
CREATE INDEX IF NOT EXISTS idx_invitations_token ON invitations(token);

-- Find all invitations for a parent
CREATE INDEX IF NOT EXISTS idx_invitations_parent_id ON invitations(parent_id);

-- Filter by status and type
CREATE INDEX IF NOT EXISTS idx_invitations_status ON invitations(status);
CREATE INDEX IF NOT EXISTS idx_invitations_type ON invitations(invitation_type);

-- Find expired invitations (for cleanup jobs)
CREATE INDEX IF NOT EXISTS idx_invitations_expires_at ON invitations(expires_at)
  WHERE expires_at IS NOT NULL AND status = 'active';

-- Quick lookup of redemptions by invitation
CREATE INDEX IF NOT EXISTS idx_invitation_redemptions_invitation_id
  ON invitation_redemptions(invitation_id);

-- Find which invitation created a recipient
CREATE INDEX IF NOT EXISTS idx_invitation_redemptions_recipient_id
  ON invitation_redemptions(recipient_id);

-- =============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =============================================================================

-- Enable RLS on both tables
ALTER TABLE invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE invitation_redemptions ENABLE ROW LEVEL SECURITY;

-- Parents can manage their own invitations
DROP POLICY IF EXISTS "Parents can manage their own invitations" ON invitations;
CREATE POLICY "Parents can manage their own invitations" ON invitations
  FOR ALL USING (auth.uid() = parent_id);

-- Public read access via token (for invitation validation and redemption)
DROP POLICY IF EXISTS "Anyone can view active invitations by token" ON invitations;
CREATE POLICY "Anyone can view active invitations by token" ON invitations
  FOR SELECT USING (status = 'active');

-- Parents can view redemptions of their invitations
DROP POLICY IF EXISTS "Parents can view their invitation redemptions" ON invitation_redemptions;
CREATE POLICY "Parents can view their invitation redemptions" ON invitation_redemptions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM invitations
      WHERE invitations.id = invitation_redemptions.invitation_id
        AND invitations.parent_id = auth.uid()
    )
  );

-- System can insert redemptions (via service role)
DROP POLICY IF EXISTS "System can create redemptions" ON invitation_redemptions;
CREATE POLICY "System can create redemptions" ON invitation_redemptions
  FOR INSERT WITH CHECK (true);

-- =============================================================================
-- HELPER FUNCTIONS
-- =============================================================================

-- Function to check if invitation is valid and usable
-- Returns the invitation details if valid, null otherwise
CREATE OR REPLACE FUNCTION validate_invitation_token(token_param TEXT)
RETURNS TABLE(
  invitation_id UUID,
  parent_id UUID,
  invitation_type VARCHAR,
  status VARCHAR,
  channel VARCHAR,
  recipient_email VARCHAR,
  recipient_phone VARCHAR,
  expires_at TIMESTAMP WITH TIME ZONE,
  group_id UUID,
  custom_message TEXT,
  use_count INTEGER,
  is_valid BOOLEAN,
  validation_message TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  inv RECORD;
  is_expired BOOLEAN;
  redemption_count INTEGER;
BEGIN
  -- Find the invitation
  SELECT * INTO inv FROM invitations WHERE token = token_param;

  -- Token not found
  IF inv IS NULL THEN
    RETURN QUERY SELECT
      NULL::UUID, NULL::UUID, NULL::VARCHAR, NULL::VARCHAR, NULL::VARCHAR,
      NULL::VARCHAR, NULL::VARCHAR, NULL::TIMESTAMP WITH TIME ZONE, NULL::UUID,
      NULL::TEXT, NULL::INTEGER, FALSE, 'Invalid invitation token';
    RETURN;
  END IF;

  -- Check if revoked
  IF inv.status = 'revoked' THEN
    RETURN QUERY SELECT
      inv.id, inv.parent_id, inv.invitation_type, inv.status, inv.channel,
      inv.recipient_email, inv.recipient_phone, inv.expires_at, inv.group_id,
      inv.custom_message, inv.use_count, FALSE, 'This invitation has been revoked';
    RETURN;
  END IF;

  -- Check if single_use and already used
  IF inv.invitation_type = 'single_use' AND inv.status = 'used' THEN
    RETURN QUERY SELECT
      inv.id, inv.parent_id, inv.invitation_type, inv.status, inv.channel,
      inv.recipient_email, inv.recipient_phone, inv.expires_at, inv.group_id,
      inv.custom_message, inv.use_count, FALSE, 'This invitation has already been used';
    RETURN;
  END IF;

  -- Check expiration (only for single_use)
  IF inv.invitation_type = 'single_use' AND inv.expires_at IS NOT NULL THEN
    is_expired := inv.expires_at < NOW();
    IF is_expired THEN
      RETURN QUERY SELECT
        inv.id, inv.parent_id, inv.invitation_type, inv.status, inv.channel,
        inv.recipient_email, inv.recipient_phone, inv.expires_at, inv.group_id,
        inv.custom_message, inv.use_count, FALSE, 'This invitation has expired';
      RETURN;
    END IF;
  END IF;

  -- Invitation is valid
  RETURN QUERY SELECT
    inv.id, inv.parent_id, inv.invitation_type, inv.status, inv.channel,
    inv.recipient_email, inv.recipient_phone, inv.expires_at, inv.group_id,
    inv.custom_message, inv.use_count, TRUE, 'Invitation is valid'::TEXT;
END;
$$;

-- Function to mark invitation as used (for single_use)
CREATE OR REPLACE FUNCTION mark_invitation_used(invitation_id_param UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE invitations
  SET
    status = 'used',
    use_count = use_count + 1,
    updated_at = NOW()
  WHERE id = invitation_id_param
    AND invitation_type = 'single_use'
    AND status = 'active';
END;
$$;

-- Function to increment use count (for reusable links)
CREATE OR REPLACE FUNCTION increment_invitation_use_count(invitation_id_param UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE invitations
  SET
    use_count = use_count + 1,
    updated_at = NOW()
  WHERE id = invitation_id_param;
END;
$$;

-- Function to revoke an invitation
CREATE OR REPLACE FUNCTION revoke_invitation(invitation_id_param UUID, parent_id_param UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE invitations
  SET
    status = 'revoked',
    updated_at = NOW()
  WHERE id = invitation_id_param
    AND parent_id = parent_id_param
    AND status = 'active';

  RETURN FOUND;
END;
$$;

-- =============================================================================
-- AUTOMATIC EXPIRATION CLEANUP (Optional - can be run as a scheduled job)
-- =============================================================================

-- Function to mark expired single_use invitations as revoked
-- This can be called periodically (e.g., daily cron job)
CREATE OR REPLACE FUNCTION cleanup_expired_invitations()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  expired_count INTEGER;
BEGIN
  WITH expired AS (
    UPDATE invitations
    SET status = 'revoked', updated_at = NOW()
    WHERE invitation_type = 'single_use'
      AND status = 'active'
      AND expires_at < NOW()
    RETURNING id
  )
  SELECT COUNT(*) INTO expired_count FROM expired;

  RETURN expired_count;
END;
$$;

-- =============================================================================
-- CONSTRAINTS & VALIDATION
-- =============================================================================

-- Ensure single_use invitations have an email OR phone
ALTER TABLE invitations ADD CONSTRAINT check_single_use_contact
  CHECK (
    invitation_type = 'reusable' OR
    (invitation_type = 'single_use' AND (recipient_email IS NOT NULL OR recipient_phone IS NOT NULL))
  );

-- Ensure single_use invitations have a channel
ALTER TABLE invitations ADD CONSTRAINT check_single_use_channel
  CHECK (
    invitation_type = 'reusable' OR
    (invitation_type = 'single_use' AND channel IS NOT NULL AND channel IN ('email', 'sms', 'whatsapp'))
  );

-- Ensure reusable invitations use 'link' channel
ALTER TABLE invitations ADD CONSTRAINT check_reusable_channel
  CHECK (
    invitation_type = 'single_use' OR
    (invitation_type = 'reusable' AND (channel IS NULL OR channel = 'link'))
  );

-- =============================================================================
-- ROLLBACK SCRIPT (if needed)
-- =============================================================================

-- To rollback this migration, execute:
-- DROP FUNCTION IF EXISTS cleanup_expired_invitations();
-- DROP FUNCTION IF EXISTS revoke_invitation(UUID, UUID);
-- DROP FUNCTION IF EXISTS increment_invitation_use_count(UUID);
-- DROP FUNCTION IF EXISTS mark_invitation_used(UUID);
-- DROP FUNCTION IF EXISTS validate_invitation_token(TEXT);
-- DROP TABLE IF EXISTS invitation_redemptions;
-- DROP TABLE IF EXISTS invitations;

-- =============================================================================
-- MIGRATION COMPLETE
-- =============================================================================

-- After executing this migration:
-- 1. Verify tables exist: SELECT * FROM invitations LIMIT 1;
-- 2. Test validation function: SELECT * FROM validate_invitation_token('test');
-- 3. Check indexes: SELECT indexname FROM pg_indexes WHERE tablename IN ('invitations', 'invitation_redemptions');
