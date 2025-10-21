-- Migration: Remove SECURITY DEFINER from monitoring views
-- Date: 2025-10-15
-- Description: Ensure monitoring views run with the privileges of the invoking user instead of the creator.

-- Apply SECURITY INVOKER to monitoring helper views to respect caller permissions
ALTER VIEW IF EXISTS public.v_cursor_pagination_indexes SET (security_invoker = true);
ALTER VIEW IF EXISTS public.v_n_plus_1_prevention SET (security_invoker = true);
ALTER VIEW IF EXISTS public.v_jsonb_index_usage_enhanced SET (security_invoker = true);
ALTER VIEW IF EXISTS public.v_jsonb_query_stats SET (security_invoker = true);
