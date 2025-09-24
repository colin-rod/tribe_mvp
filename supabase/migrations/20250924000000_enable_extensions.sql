-- Enable required extensions for template system
-- Migration: 20250924000000_enable_extensions.sql
-- Description: Enable UUID and other required extensions

-- Enable pgcrypto for UUID generation and crypto functions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

COMMENT ON EXTENSION "pgcrypto" IS 'UUID generation and cryptographic functions for template system';