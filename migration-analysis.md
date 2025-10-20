# Database Migration Analysis

**Generated:** 10/14/2025, 10:29:19 AM
**Migrations Analyzed:** 38

## Migrations Summary

| Migration | Tables | Functions | Triggers | Policies | Indexes | Views | Drops |
|-----------|--------|-----------|----------|----------|---------|-------|-------|
| 20240916000001_initial_schema.sql | 8 | 4 | 6 | 12 | 25 | 0 | 0 |
| 20240919000001_delivery_jobs_improvements.sql | 0 | 0 | 0 | 1 | 1 | 0 | 0 |
| 20250919121344_remote_schema.sql | 0 | 4 | 0 | 0 | 0 | 0 | 1 |
| 20250921114344_remote_commit.sql | 0 | 4 | 0 | 0 | 0 | 0 | 0 |
| 20250923000001_notification_system.sql | 2 | 5 | 0 | 3 | 14 | 0 | 0 |
| 20250924000000_enable_extensions.sql | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| 20250924000001_template_system.sql | 2 | 6 | 0 | 4 | 13 | 0 | 0 |
| 20250926000001_dashboard_updates_enhancement.sql | 0 | 8 | 3 | 2 | 8 | 0 | 0 |
| 20250926000002_likes_comments_system.sql | 2 | 6 | 3 | 2 | 7 | 0 | 0 |
| 20250926000003_group_management_enhancements.sql | 1 | 5 | 4 | 3 | 10 | 0 | 0 |
| 20250926000004_mute_functionality.sql | 0 | 6 | 2 | 0 | 4 | 2 | 0 |
| 20250926000005_notification_jobs_system.sql | 4 | 5 | 4 | 4 | 11 | 0 | 0 |
| 20250928000001_privacy_settings.sql | 3 | 7 | 1 | 3 | 14 | 0 | 0 |
| 20250929000001_email_rich_text_enhancement.sql | 0 | 6 | 1 | 0 | 4 | 0 | 0 |
| 20250929000002_email_rich_text_enhancement_fixed.sql | 0 | 12 | 1 | 0 | 10 | 0 | 0 |
| 20250929000003_test_email_enhancement.sql | 0 | 4 | 0 | 0 | 0 | 0 | 0 |
| 20250929000004_fix_missing_likes_table.sql | 2 | 2 | 2 | 4 | 7 | 0 | 0 |
| 20250930000001_fix_storage_public_access.sql | 0 | 0 | 0 | 1 | 0 | 0 | 0 |
| 20250930000002_digest_system.sql | 2 | 3 | 3 | 2 | 12 | 0 | 0 |
| 20251001000001_optimize_jsonb_indexes.sql | 0 | 0 | 0 | 0 | 34 | 2 | 2 |
| 20251001000002_optimize_jsonb_query_patterns.sql | 0 | 13 | 0 | 0 | 0 | 0 | 0 |
| 20251001000003_test_jsonb_indexes.sql | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| 20251001000004_add_digest_narratives.sql | 0 | 3 | 2 | 0 | 2 | 0 | 0 |
| 20251002000001_rich_text_support.sql | 0 | 3 | 1 | 0 | 0 | 0 | 0 |
| 20251002125606_invitation_system.sql | 2 | 5 | 0 | 4 | 7 | 0 | 7 |
| 20251005000001_composite_indexes_optimization.sql | 0 | 0 | 0 | 0 | 4 | 0 | 2 |
| 20251005000002_add_children_columns.sql | 0 | 0 | 0 | 0 | 5 | 0 | 0 |
| 20251005000003_add_profiles_columns.sql | 0 | 0 | 0 | 0 | 3 | 0 | 0 |
| 20251006000001_recipient_centric_refactor.sql | 0 | 2 | 0 | 0 | 3 | 3 | 0 |
| 20251006000002_prompt_suggestions_simple.sql | 1 | 4 | 0 | 2 | 2 | 2 | 0 |
| 20251006000003_rls_performance_optimization.sql | 0 | 0 | 0 | 0 | 11 | 0 | 10 |
| 20251007000001_memory_book_transformation.sql | 0 | 4 | 3 | 2 | 14 | 0 | 14 |
| 20251007000002_feedback_screenshots_storage.sql | 0 | 0 | 0 | 2 | 0 | 0 | 0 |
| 20251010000001_fix_notification_jobs_references.sql | 0 | 1 | 0 | 0 | 0 | 0 | 0 |
| 20251010000002_notification_system_complete.sql | 4 | 3 | 0 | 4 | 12 | 0 | 0 |
| 20251011000001_memory_metadata.sql | 1 | 5 | 2 | 1 | 8 | 0 | 11 |
| 20251013000001_full_text_search_optimization.sql | 2 | 7 | 2 | 2 | 5 | 0 | 0 |
| 20251013000002_fix_security_definer_views.sql | 0 | 0 | 0 | 0 | 0 | 2 | 0 |

## Summary of All Objects

- **Tables Created:** 30
- **Functions Created:** 112
- **Triggers Created:** 35
- **Policies Created:** 11
- **Indexes Created:** 28
- **Views Created:** 8
- **Enums Created:** 0
- **Objects Dropped:** 47

## All Tables

- `ai_prompts` (from `20240916000001_initial_schema.sql`)
- `children` (from `20240916000001_initial_schema.sql`)
- `comments` (from `20250926000002_likes_comments_system.sql`)
- `data_deletion_audit` (from `20250928000001_privacy_settings.sql`)
- `data_export_jobs` (from `20250928000001_privacy_settings.sql`)
- `delivery_jobs` (from `20240916000001_initial_schema.sql`)
- `digest_queue` (from `20250923000001_notification_system.sql`)
- `digest_schedules` (from `20250926000005_notification_jobs_system.sql`)
- `digest_updates` (from `20250930000002_digest_system.sql`)
- `digests` (from `20250930000002_digest_system.sql`)
- `for` (from `20251013000001_full_text_search_optimization.sql`)
- `group_memberships` (from `20250926000003_group_management_enhancements.sql`)
- `invitation_redemptions` (from `20251002125606_invitation_system.sql`)
- `invitations` (from `20251002125606_invitation_system.sql`)
- `likes` (from `20250926000002_likes_comments_system.sql`)
- `notification_delivery_logs` (from `20250926000005_notification_jobs_system.sql`)
- `notification_history` (from `20250923000001_notification_system.sql`)
- `notification_jobs` (from `20250926000005_notification_jobs_system.sql`)
- `notification_preferences_cache` (from `20250926000005_notification_jobs_system.sql`)
- `privacy_settings` (from `20250928000001_privacy_settings.sql`)
- `profiles` (from `20240916000001_initial_schema.sql`)
- `prompt_suggestions` (from `20251006000002_prompt_suggestions_simple.sql`)
- `prompt_templates` (from `20250924000001_template_system.sql`)
- `public.search_analytics` (from `20251013000001_full_text_search_optimization.sql`)
- `recipient_groups` (from `20240916000001_initial_schema.sql`)
- `recipients` (from `20240916000001_initial_schema.sql`)
- `responses` (from `20240916000001_initial_schema.sql`)
- `template_analytics` (from `20250924000001_template_system.sql`)
- `updates` (from `20240916000001_initial_schema.sql`)
- `user_metadata_values` (from `20251011000001_memory_metadata.sql`)

## All Functions

- `add_update_comment` (from `20250926000002_likes_comments_system.sql`)
- `analyze_content_formats` (from `20250929000002_email_rich_text_enhancement_fixed.sql`)
- `analyze_jsonb_query_performance` (from `20251001000002_optimize_jsonb_query_patterns.sql`)
- `bulk_mute_operation` (from `20250926000004_mute_functionality.sql`)
- `bulk_update_group_members` (from `20250926000003_group_management_enhancements.sql`)
- `bulk_update_metadata` (from `20251011000001_memory_metadata.sql`)
- `cleanup_expired_exports` (from `20250928000001_privacy_settings.sql`)
- `cleanup_expired_invitations` (from `20251002125606_invitation_system.sql`)
- `cleanup_expired_mutes` (from `20250926000004_mute_functionality.sql`)
- `cleanup_notification_data` (from `20250926000005_notification_jobs_system.sql`)
- `cleanup_old_analytics` (from `20250926000001_dashboard_updates_enhancement.sql`)
- `cleanup_old_notifications` (from `20250923000001_notification_system.sql`)
- `cleanup_sample_email_data` (from `20250929000003_test_email_enhancement.sql`)
- `create_default_groups_for_user` (from `20240916000001_initial_schema.sql`)
- `create_default_privacy_settings` (from `20250928000001_privacy_settings.sql`)
- `create_digest_jobs` (from `20250926000005_notification_jobs_system.sql`)
- `create_notification_history` (from `20250923000001_notification_system.sql`)
- `create_sample_email_data` (from `20250929000003_test_email_enhancement.sql`)
- `create_template_from_community_prompt` (from `20250924000001_template_system.sql`)
- `delete_user_data` (from `20250928000001_privacy_settings.sql`)
- `enqueue_notification_job` (from `20250926000005_notification_jobs_system.sql`)
- `extract_plain_text_from_rich_content` (from `20250929000001_email_rich_text_enhancement.sql`)
- `find_jobs_by_content` (from `20251001000002_optimize_jsonb_query_patterns.sql`)
- `find_notifications_by_metadata` (from `20251001000002_optimize_jsonb_query_patterns.sql`)
- `for` (from `20251006000002_prompt_suggestions_simple.sql`)
- `get_active_notification_channels` (from `20251001000002_optimize_jsonb_query_patterns.sql`)
- `get_active_recipients_for_group` (from `20251001000002_optimize_jsonb_query_patterns.sql`)
- `get_bulk_notification_preferences` (from `20251001000002_optimize_jsonb_query_patterns.sql`)
- `get_dashboard_stats` (from `20250926000001_dashboard_updates_enhancement.sql`)
- `get_dashboard_updates` (from `20250926000001_dashboard_updates_enhancement.sql`)
- `get_effective_content` (from `20250929000001_email_rich_text_enhancement.sql`)
- `get_effective_notification_settings` (from `20250926000003_group_management_enhancements.sql`)
- `get_inactive_users` (from `20250928000001_privacy_settings.sql`)
- `get_metadata_autocomplete` (from `20251011000001_memory_metadata.sql`)
- `get_mute_settings` (from `20250926000004_mute_functionality.sql`)
- `get_narrative_preview` (from `20251001000004_add_digest_narratives.sql`)
- `get_notification_preferences` (from `20250923000001_notification_system.sql`)
- `get_profiles_for_weekly_digest` (from `20251001000002_optimize_jsonb_query_patterns.sql`)
- `get_random_prompt_suggestion` (from `20251006000002_prompt_suggestions_simple.sql`)
- `get_recent_template_ids` (from `20250924000001_template_system.sql`)
- `get_recipient_by_token` (from `20240916000001_initial_schema.sql`)
- `get_summaries_for_auto_publish` (from `20251007000001_memory_book_transformation.sql`)
- `get_summaries_needing_reminders` (from `20251007000001_memory_book_transformation.sql`)
- `get_templates_by_filters` (from `20250924000001_template_system.sql`)
- `get_timeline_updates` (from `20250926000001_dashboard_updates_enhancement.sql`)
- `get_update_comments` (from `20250926000002_likes_comments_system.sql`)
- `get_update_likes` (from `20250926000002_likes_comments_system.sql`)
- `get_updates_by_format` (from `20250929000002_email_rich_text_enhancement_fixed.sql`)
- `get_user_export_data` (from `20250928000001_privacy_settings.sql`)
- `get_user_metadata_values` (from `20251011000001_memory_metadata.sql`)
- `handle_group_deletion` (from `20250926000003_group_management_enhancements.sql`)
- `has_email_notifications_enabled` (from `20251001000002_optimize_jsonb_query_patterns.sql`)
- `increment_invitation_use_count` (from `20251002125606_invitation_system.sql`)
- `increment_template_usage` (from `20250924000001_template_system.sql`)
- `increment_update_view_count` (from `20250926000001_dashboard_updates_enhancement.sql`)
- `invalidate_notification_cache` (from `20250926000005_notification_jobs_system.sql`)
- `is_in_quiet_hours` (from `20250923000001_notification_system.sql`)
- `is_recipient_active` (from `20251001000002_optimize_jsonb_query_patterns.sql`)
- `is_recipient_muted` (from `20250926000004_mute_functionality.sql`)
- `mark_invitation_used` (from `20251002125606_invitation_system.sql`)
- `migrate_email_updates` (from `20250929000001_email_rich_text_enhancement.sql`)
- `notify_engagement_update` (from `20250926000001_dashboard_updates_enhancement.sql`)
- `public.create_default_groups_for_user` (from `20250919121344_remote_schema.sql`)
- `public.extract_plain_text_from_html` (from `20251002000001_rich_text_support.sql`)
- `public.get_recipient_by_token` (from `20250919121344_remote_schema.sql`)
- `public.get_search_statistics` (from `20251013000001_full_text_search_optimization.sql`)
- `public.handle_new_user` (from `20240916000001_initial_schema.sql`)
- `public.rebuild_search_vectors` (from `20251013000001_full_text_search_optimization.sql`)
- `public.search_comments` (from `20251013000001_full_text_search_optimization.sql`)
- `public.search_memories` (from `20251013000001_full_text_search_optimization.sql`)
- `public.search_memories_with_highlights` (from `20251013000001_full_text_search_optimization.sql`)
- `public.update_comments_search_vector` (from `20251013000001_full_text_search_optimization.sql`)
- `public.update_updated_at_column` (from `20250919121344_remote_schema.sql`)
- `public.update_updates_search_vector` (from `20251002000001_rich_text_support.sql`)
- `public.validate_rich_text_length` (from `20251002000001_rich_text_support.sql`)
- `rebuild_all_search_vectors` (from `20250929000002_email_rich_text_enhancement_fixed.sql`)
- `recalculate_template_effectiveness` (from `20250924000001_template_system.sql`)
- `refresh_notification_cache` (from `20250926000005_notification_jobs_system.sql`)
- `revoke_invitation` (from `20251002125606_invitation_system.sql`)
- `safe_text_for_search` (from `20250929000002_email_rich_text_enhancement_fixed.sql`)
- `schedule_digest_for_user` (from `20250923000001_notification_system.sql`)
- `search_memories_by_metadata` (from `20251011000001_memory_metadata.sql`)
- `search_updates_with_content` (from `20250929000002_email_rich_text_enhancement_fixed.sql`)
- `should_deliver_notification` (from `20250926000004_mute_functionality.sql`)
- `should_send_to_recipient` (from `20251006000001_recipient_centric_refactor.sql`)
- `subject_search_vector` (from `20250929000002_email_rich_text_enhancement_fixed.sql`)
- `suggest_jsonb_indexes` (from `20251001000002_optimize_jsonb_query_patterns.sql`)
- `sync_recipient_group_assignment` (from `20250926000003_group_management_enhancements.sql`)
- `test_email_enhancement_migration` (from `20250929000003_test_email_enhancement.sql`)
- `to` (from `20251006000001_recipient_centric_refactor.sql`)
- `toggle_update_like` (from `20250926000002_likes_comments_system.sql`)
- `track_metadata_usage` (from `20251011000001_memory_metadata.sql`)
- `track_prompt_clicked` (from `20251006000002_prompt_suggestions_simple.sql`)
- `track_prompt_shown` (from `20251006000002_prompt_suggestions_simple.sql`)
- `track_update_edit` (from `20250930000002_digest_system.sql`)
- `trigger_cleanup_expired_mutes` (from `20250926000004_mute_functionality.sql`)
- `update_comment_counts` (from `20250926000002_likes_comments_system.sql`)
- `update_digest_stats` (from `20250930000002_digest_system.sql`)
- `update_digest_updated_at` (from `20250930000002_digest_system.sql`)
- `update_engagement_counts` (from `20250926000001_dashboard_updates_enhancement.sql`)
- `update_like_counts` (from `20250926000002_likes_comments_system.sql`)
- `update_privacy_settings` (from `20250928000001_privacy_settings.sql`)
- `update_summary_stats` (from `20251007000001_memory_book_transformation.sql`)
- `update_summary_updated_at` (from `20251007000001_memory_book_transformation.sql`)
- `update_template_effectiveness` (from `20250924000001_template_system.sql`)
- `update_updated_at_column` (from `20240916000001_initial_schema.sql`)
- `update_updates_search_vector` (from `20250926000001_dashboard_updates_enhancement.sql`)
- `validate_group_membership` (from `20250926000003_group_management_enhancements.sql`)
- `validate_invitation_token` (from `20251002125606_invitation_system.sql`)
- `validate_migration` (from `20250929000003_test_email_enhancement.sql`)
- `validate_narrative_data` (from `20251001000004_add_digest_narratives.sql`)
- `validate_parent_narrative` (from `20251001000004_add_digest_narratives.sql`)

## All Policies

- `"Anyone` (from `20251002125606_invitation_system.sql`)
- `"Authenticated` (from `20251007000002_feedback_screenshots_storage.sql`)
- `"No` (from `20251006000002_prompt_suggestions_simple.sql`)
- `"Only` (from `20250924000001_template_system.sql`)
- `"Parents` (from `20240916000001_initial_schema.sql`)
- `"Public` (from `20250930000001_fix_storage_public_access.sql`)
- `"Recipients` (from `20250926000003_group_management_enhancements.sql`)
- `"Service` (from `20240919000001_delivery_jobs_improvements.sql`)
- `"System` (from `20250924000001_template_system.sql`)
- `"Templates` (from `20250924000001_template_system.sql`)
- `"Users` (from `20240916000001_initial_schema.sql`)

## All Triggers

- `comments_search_vector_update` (from `20251013000001_full_text_search_optimization.sql`)
- `for` (from `20250926000004_mute_functionality.sql`)
- `handle_group_deletion_trigger` (from `20250926000003_group_management_enhancements.sql`)
- `invalidate_cache_on_membership_change` (from `20250926000005_notification_jobs_system.sql`)
- `notify_engagement_update_trigger` (from `20250926000001_dashboard_updates_enhancement.sql`)
- `on_auth_user_created` (from `20240916000001_initial_schema.sql`)
- `periodic_mute_cleanup` (from `20250926000004_mute_functionality.sql`)
- `sync_recipient_group_assignment_trigger` (from `20250926000003_group_management_enhancements.sql`)
- `to` (from `20251011000001_memory_metadata.sql`)
- `trigger_track_metadata_usage` (from `20251011000001_memory_metadata.sql`)
- `trigger_track_update_edit` (from `20250930000002_digest_system.sql`)
- `trigger_update_digest_stats` (from `20250930000002_digest_system.sql`)
- `trigger_update_digest_updated_at` (from `20250930000002_digest_system.sql`)
- `trigger_update_summary_stats` (from `20251007000001_memory_book_transformation.sql`)
- `trigger_update_summary_updated_at` (from `20251007000001_memory_book_transformation.sql`)
- `update_children_updated_at` (from `20240916000001_initial_schema.sql`)
- `update_comment_counts_trigger` (from `20250926000002_likes_comments_system.sql`)
- `update_comments_updated_at` (from `20250926000002_likes_comments_system.sql`)
- `update_digest_schedules_updated_at` (from `20250926000005_notification_jobs_system.sql`)
- `update_group_memberships_updated_at` (from `20250926000003_group_management_enhancements.sql`)
- `update_like_counts_trigger` (from `20250926000002_likes_comments_system.sql`)
- `update_notification_cache_updated_at` (from `20250926000005_notification_jobs_system.sql`)
- `update_notification_jobs_updated_at` (from `20250926000005_notification_jobs_system.sql`)
- `update_privacy_settings_updated_at` (from `20250928000001_privacy_settings.sql`)
- `update_profiles_updated_at` (from `20240916000001_initial_schema.sql`)
- `update_recipient_groups_updated_at` (from `20240916000001_initial_schema.sql`)
- `update_recipients_updated_at` (from `20240916000001_initial_schema.sql`)
- `update_response_engagement_trigger` (from `20250926000001_dashboard_updates_enhancement.sql`)
- `update_updates_search_vector_trigger` (from `20250926000001_dashboard_updates_enhancement.sql`)
- `update_updates_updated_at` (from `20240916000001_initial_schema.sql`)
- `updates_search_vector_update` (from `20251002000001_rich_text_support.sql`)
- `validate_digest_parent_narrative` (from `20251001000004_add_digest_narratives.sql`)
- `validate_digest_update_narrative` (from `20251001000004_add_digest_narratives.sql`)
- `validate_group_membership_trigger` (from `20250926000003_group_management_enhancements.sql`)
- `with` (from `20251007000001_memory_book_transformation.sql`)

## All Views

- `currently_muted_recipients` (from `20250926000004_mute_functionality.sql`)
- `for` (from `20251006000001_recipient_centric_refactor.sql`)
- `mute_analytics` (from `20250926000004_mute_functionality.sql`)
- `prompt_analytics` (from `20251006000002_prompt_suggestions_simple.sql`)
- `recipient_preferences` (from `20251006000001_recipient_centric_refactor.sql`)
- `that` (from `20251006000001_recipient_centric_refactor.sql`)
- `v_jsonb_index_usage` (from `20251001000001_optimize_jsonb_indexes.sql`)
- `v_jsonb_query_performance` (from `20251001000001_optimize_jsonb_indexes.sql`)

## All Indexes

- `IF` (from `20240916000001_initial_schema.sql`)
- `idx_digest_updates_digest_id` (from `20250930000002_digest_system.sql`)
- `idx_digest_updates_included` (from `20250930000002_digest_system.sql`)
- `idx_digest_updates_recipient_id` (from `20250930000002_digest_system.sql`)
- `idx_digest_updates_update_id` (from `20250930000002_digest_system.sql`)
- `idx_digests_created_at` (from `20250930000002_digest_system.sql`)
- `idx_digests_digest_date` (from `20250930000002_digest_system.sql`)
- `idx_digests_parent_id` (from `20250930000002_digest_system.sql`)
- `idx_digests_status` (from `20250930000002_digest_system.sql`)
- `idx_memories_capture_channel` (from `20251007000001_memory_book_transformation.sql`)
- `idx_memories_is_new` (from `20251007000001_memory_book_transformation.sql`)
- `idx_memories_parent_status_created` (from `20251007000001_memory_book_transformation.sql`)
- `idx_memories_status` (from `20251007000001_memory_book_transformation.sql`)
- `idx_memories_summary_id` (from `20251007000001_memory_book_transformation.sql`)
- `idx_name` (from `20251006000003_rls_performance_optimization.sql`)
- `idx_summaries_auto_publish` (from `20251007000001_memory_book_transformation.sql`)
- `idx_summaries_created_at` (from `20251007000001_memory_book_transformation.sql`)
- `idx_summaries_digest_date` (from `20251007000001_memory_book_transformation.sql`)
- `idx_summaries_parent_id` (from `20251007000001_memory_book_transformation.sql`)
- `idx_summaries_status` (from `20251007000001_memory_book_transformation.sql`)
- `idx_summary_memories_included` (from `20251007000001_memory_book_transformation.sql`)
- `idx_summary_memories_memory_id` (from `20251007000001_memory_book_transformation.sql`)
- `idx_summary_memories_recipient_id` (from `20251007000001_memory_book_transformation.sql`)
- `idx_summary_memories_summary_id` (from `20251007000001_memory_book_transformation.sql`)
- `idx_user_metadata_values_usage` (from `20251011000001_memory_metadata.sql`)
- `idx_user_metadata_values_user_category` (from `20251011000001_memory_metadata.sql`)
- `idx_user_metadata_values_value_trgm` (from `20251011000001_memory_metadata.sql`)
- `on` (from `20251005000002_add_children_columns.sql`)

## All Enums


## Dropped Objects

- **INDEX** `"public"."idx_delivery_jobs_external_id"` (dropped in `20250919121344_remote_schema.sql`)
- **INDEX** `idx_profiles_notification_prefs` (dropped in `20251001000001_optimize_jsonb_indexes.sql`)
- **INDEX** `idx_notification_history_metadata` (dropped in `20251001000001_optimize_jsonb_indexes.sql`)
- **FUNCTION** `cleanup_expired_invitations` (dropped in `20251002125606_invitation_system.sql`)
- **FUNCTION** `revoke_invitation` (dropped in `20251002125606_invitation_system.sql`)
- **FUNCTION** `increment_invitation_use_count` (dropped in `20251002125606_invitation_system.sql`)
- **FUNCTION** `mark_invitation_used` (dropped in `20251002125606_invitation_system.sql`)
- **FUNCTION** `validate_invitation_token` (dropped in `20251002125606_invitation_system.sql`)
- **TABLE** `invitation_redemptions` (dropped in `20251002125606_invitation_system.sql`)
- **TABLE** `invitations` (dropped in `20251002125606_invitation_system.sql`)
- **INDEX** `idx_updates_parent_id` (dropped in `20251005000001_composite_indexes_optimization.sql`)
- **INDEX** `idx_updates_created_at` (dropped in `20251005000001_composite_indexes_optimization.sql`)
- **INDEX** `idx_delivery_jobs_update_id_lookup` (dropped in `20251006000003_rls_performance_optimization.sql`)
- **INDEX** `idx_updates_id_parent_id` (dropped in `20251006000003_rls_performance_optimization.sql`)
- **INDEX** `idx_likes_update_id_lookup` (dropped in `20251006000003_rls_performance_optimization.sql`)
- **INDEX** `idx_comments_update_id_lookup` (dropped in `20251006000003_rls_performance_optimization.sql`)
- **INDEX** `idx_responses_update_id_lookup` (dropped in `20251006000003_rls_performance_optimization.sql`)
- **INDEX** `idx_digest_updates_digest_id_lookup` (dropped in `20251006000003_rls_performance_optimization.sql`)
- **INDEX** `idx_digests_id_parent_id` (dropped in `20251006000003_rls_performance_optimization.sql`)
- **INDEX** `idx_invitation_redemptions_invitation_id_lookup` (dropped in `20251006000003_rls_performance_optimization.sql`)
- **INDEX** `idx_invitations_id_parent_id` (dropped in `20251006000003_rls_performance_optimization.sql`)
- **INDEX** `idx_notification_history_user_id_unread` (dropped in `20251006000003_rls_performance_optimization.sql`)
- **INDEX** `idx_updates_digest_id` (dropped in `20251007000001_memory_book_transformation.sql`)
- **INDEX** `idx_updates_parent_status_created` (dropped in `20251007000001_memory_book_transformation.sql`)
- **INDEX** `idx_updates_status` (dropped in `20251007000001_memory_book_transformation.sql`)
- **INDEX** `idx_digest_updates_digest_id` (dropped in `20251007000001_memory_book_transformation.sql`)
- **INDEX** `idx_digest_updates_update_id` (dropped in `20251007000001_memory_book_transformation.sql`)
- **INDEX** `idx_digest_updates_recipient_id` (dropped in `20251007000001_memory_book_transformation.sql`)
- **INDEX** `idx_digest_updates_included` (dropped in `20251007000001_memory_book_transformation.sql`)
- **INDEX** `idx_digests_parent_id` (dropped in `20251007000001_memory_book_transformation.sql`)
- **INDEX** `idx_digests_status` (dropped in `20251007000001_memory_book_transformation.sql`)
- **INDEX** `idx_digests_digest_date` (dropped in `20251007000001_memory_book_transformation.sql`)
- **INDEX** `idx_digests_created_at` (dropped in `20251007000001_memory_book_transformation.sql`)
- **FUNCTION** `update_digest_stats` (dropped in `20251007000001_memory_book_transformation.sql`)
- **FUNCTION** `track_update_edit` (dropped in `20251007000001_memory_book_transformation.sql`)
- **FUNCTION** `update_digest_updated_at` (dropped in `20251007000001_memory_book_transformation.sql`)
- **FUNCTION** `track_metadata_usage` (dropped in `20251011000001_memory_metadata.sql`)
- **FUNCTION** `bulk_update_metadata` (dropped in `20251011000001_memory_metadata.sql`)
- **FUNCTION** `search_memories_by_metadata` (dropped in `20251011000001_memory_metadata.sql`)
- **FUNCTION** `get_user_metadata_values` (dropped in `20251011000001_memory_metadata.sql`)
- **FUNCTION** `get_metadata_autocomplete` (dropped in `20251011000001_memory_metadata.sql`)
- **TABLE** `user_metadata_values` (dropped in `20251011000001_memory_metadata.sql`)
- **INDEX** `idx_memories_metadata_dates` (dropped in `20251011000001_memory_metadata.sql`)
- **INDEX** `idx_memories_metadata_people` (dropped in `20251011000001_memory_metadata.sql`)
- **INDEX** `idx_memories_metadata_locations` (dropped in `20251011000001_memory_metadata.sql`)
- **INDEX** `idx_memories_metadata_milestones` (dropped in `20251011000001_memory_metadata.sql`)
- **INDEX** `idx_memories_metadata_gin` (dropped in `20251011000001_memory_metadata.sql`)

## Migration Timeline

### 20240916000001_initial_schema.sql

**Tables:**
- profiles
- children
- recipient_groups
- recipients
- updates
- delivery_jobs
- responses
- ai_prompts

**Functions:**
- get_recipient_by_token
- create_default_groups_for_user
- update_updated_at_column
- public.handle_new_user

**Triggers:**
- update_profiles_updated_at
- update_children_updated_at
- update_recipient_groups_updated_at
- update_recipients_updated_at
- update_updates_updated_at
- on_auth_user_created

**Policies:**
- "Users
- "Parents
- "Parents
- "Parents
- "Parents
- "Parents
- "Parents
- "Parents
- "Parents
- "Parents
- "Parents
- "Parents

**Indexes:**
- IF
- IF
- IF
- IF
- IF
- IF
- IF
- IF
- IF
- IF
- IF
- IF
- IF
- IF
- IF
- IF
- IF
- IF
- IF
- IF
- IF
- IF
- IF
- IF
- IF

### 20240919000001_delivery_jobs_improvements.sql

**Policies:**
- "Service

**Indexes:**
- IF

### 20250919121344_remote_schema.sql

**Functions:**
- public.create_default_groups_for_user
- public.get_recipient_by_token
- public.handle_new_user
- public.update_updated_at_column

**Dropped:**
- INDEX: "public"."idx_delivery_jobs_external_id"

### 20250921114344_remote_commit.sql

**Functions:**
- public.create_default_groups_for_user
- public.get_recipient_by_token
- public.handle_new_user
- public.update_updated_at_column

### 20250923000001_notification_system.sql

**Tables:**
- notification_history
- digest_queue

**Functions:**
- get_notification_preferences
- is_in_quiet_hours
- create_notification_history
- schedule_digest_for_user
- cleanup_old_notifications

**Policies:**
- "Users
- "Users
- "Users

**Indexes:**
- IF
- IF
- IF
- IF
- IF
- IF
- IF
- IF
- IF
- IF
- IF
- IF
- IF
- IF

### 20250924000000_enable_extensions.sql

### 20250924000001_template_system.sql

**Tables:**
- prompt_templates
- template_analytics

**Functions:**
- increment_template_usage
- update_template_effectiveness
- get_templates_by_filters
- get_recent_template_ids
- create_template_from_community_prompt
- recalculate_template_effectiveness

**Policies:**
- "Templates
- "Only
- "Users
- "System

**Indexes:**
- IF
- IF
- IF
- IF
- IF
- IF
- IF
- IF
- IF
- IF
- IF
- IF
- IF

### 20250926000001_dashboard_updates_enhancement.sql

**Functions:**
- update_updates_search_vector
- update_engagement_counts
- get_dashboard_updates
- get_dashboard_stats
- get_timeline_updates
- increment_update_view_count
- notify_engagement_update
- cleanup_old_analytics

**Triggers:**
- update_updates_search_vector_trigger
- update_response_engagement_trigger
- notify_engagement_update_trigger

**Policies:**
- "Parents
- "Parents

**Indexes:**
- IF
- IF
- IF
- IF
- IF
- IF
- IF
- IF

### 20250926000002_likes_comments_system.sql

**Tables:**
- likes
- comments

**Functions:**
- update_like_counts
- update_comment_counts
- get_update_likes
- get_update_comments
- toggle_update_like
- add_update_comment

**Triggers:**
- update_comments_updated_at
- update_like_counts_trigger
- update_comment_counts_trigger

**Policies:**
- "Parents
- "Parents

**Indexes:**
- IF
- IF
- IF
- IF
- IF
- IF
- IF

### 20250926000003_group_management_enhancements.sql

**Tables:**
- group_memberships

**Functions:**
- validate_group_membership
- sync_recipient_group_assignment
- handle_group_deletion
- get_effective_notification_settings
- bulk_update_group_members

**Triggers:**
- validate_group_membership_trigger
- sync_recipient_group_assignment_trigger
- update_group_memberships_updated_at
- handle_group_deletion_trigger

**Policies:**
- "Parents
- "Recipients
- "Recipients

**Indexes:**
- IF
- IF
- IF
- IF
- IF
- IF
- IF
- IF
- IF
- IF

### 20250926000004_mute_functionality.sql

**Functions:**
- is_recipient_muted
- get_mute_settings
- cleanup_expired_mutes
- bulk_mute_operation
- should_deliver_notification
- trigger_cleanup_expired_mutes

**Triggers:**
- for
- periodic_mute_cleanup

**Indexes:**
- IF
- IF
- IF
- IF

**Views:**
- currently_muted_recipients
- mute_analytics

### 20250926000005_notification_jobs_system.sql

**Tables:**
- notification_jobs
- notification_delivery_logs
- digest_schedules
- notification_preferences_cache

**Functions:**
- enqueue_notification_job
- create_digest_jobs
- cleanup_notification_data
- refresh_notification_cache
- invalidate_notification_cache

**Triggers:**
- update_notification_jobs_updated_at
- update_digest_schedules_updated_at
- update_notification_cache_updated_at
- invalidate_cache_on_membership_change

**Policies:**
- "Parents
- "Parents
- "Parents
- "System

**Indexes:**
- IF
- IF
- IF
- IF
- IF
- IF
- IF
- IF
- IF
- IF
- IF

### 20250928000001_privacy_settings.sql

**Tables:**
- privacy_settings
- data_export_jobs
- data_deletion_audit

**Functions:**
- create_default_privacy_settings
- update_privacy_settings
- get_user_export_data
- delete_user_data
- public.handle_new_user
- cleanup_expired_exports
- get_inactive_users

**Triggers:**
- update_privacy_settings_updated_at

**Policies:**
- "Users
- "Users
- "Users

**Indexes:**
- IF
- IF
- IF
- IF
- IF
- IF
- IF
- IF
- IF
- IF
- IF
- IF
- IF
- IF

### 20250929000001_email_rich_text_enhancement.sql

**Functions:**
- update_updates_search_vector
- extract_plain_text_from_rich_content
- get_effective_content
- get_dashboard_updates
- get_timeline_updates
- migrate_email_updates

**Triggers:**
- update_updates_search_vector_trigger

**Indexes:**
- IF
- IF
- IF
- IF

### 20250929000002_email_rich_text_enhancement_fixed.sql

**Functions:**
- safe_text_for_search
- subject_search_vector
- update_updates_search_vector
- extract_plain_text_from_rich_content
- get_effective_content
- search_updates_with_content
- get_dashboard_updates
- get_timeline_updates
- migrate_email_updates
- analyze_content_formats
- rebuild_all_search_vectors
- get_updates_by_format

**Triggers:**
- update_updates_search_vector_trigger

**Indexes:**
- IF
- IF
- IF
- IF
- IF
- IF
- IF
- IF
- IF
- IF

### 20250929000003_test_email_enhancement.sql

**Functions:**
- test_email_enhancement_migration
- create_sample_email_data
- validate_migration
- cleanup_sample_email_data

### 20250929000004_fix_missing_likes_table.sql

**Tables:**
- likes
- comments

**Functions:**
- update_like_counts
- update_comment_counts

**Triggers:**
- update_like_counts_trigger
- update_comment_counts_trigger

**Policies:**
- "Parents
- "Parents
- "Parents
- "Parents

**Indexes:**
- IF
- IF
- IF
- IF
- IF
- IF
- IF

### 20250930000001_fix_storage_public_access.sql

**Policies:**
- "Public

### 20250930000002_digest_system.sql

**Tables:**
- digests
- digest_updates

**Functions:**
- update_digest_stats
- track_update_edit
- update_digest_updated_at

**Triggers:**
- trigger_update_digest_stats
- trigger_track_update_edit
- trigger_update_digest_updated_at

**Policies:**
- "Parents
- "Parents

**Indexes:**
- idx_digests_parent_id
- idx_digests_status
- idx_digests_digest_date
- idx_digests_created_at
- idx_digest_updates_digest_id
- idx_digest_updates_update_id
- idx_digest_updates_recipient_id
- idx_digest_updates_included
- IF
- IF
- IF
- IF

### 20251001000001_optimize_jsonb_indexes.sql

**Indexes:**
- IF
- IF
- IF
- IF
- IF
- IF
- IF
- IF
- IF
- IF
- IF
- IF
- IF
- IF
- IF
- IF
- IF
- IF
- IF
- IF
- IF
- IF
- IF
- IF
- IF
- IF
- IF
- IF
- IF
- IF
- IF
- IF
- IF
- IF

**Views:**
- v_jsonb_index_usage
- v_jsonb_query_performance

**Dropped:**
- INDEX: idx_profiles_notification_prefs
- INDEX: idx_notification_history_metadata

### 20251001000002_optimize_jsonb_query_patterns.sql

**Functions:**
- has_email_notifications_enabled
- is_in_quiet_hours
- get_active_notification_channels
- is_recipient_active
- is_recipient_muted
- cleanup_expired_mutes
- get_bulk_notification_preferences
- get_active_recipients_for_group
- get_profiles_for_weekly_digest
- find_notifications_by_metadata
- find_jobs_by_content
- analyze_jsonb_query_performance
- suggest_jsonb_indexes

### 20251001000003_test_jsonb_indexes.sql

### 20251001000004_add_digest_narratives.sql

**Functions:**
- validate_narrative_data
- validate_parent_narrative
- get_narrative_preview

**Triggers:**
- validate_digest_update_narrative
- validate_digest_parent_narrative

**Indexes:**
- IF
- IF

### 20251002000001_rich_text_support.sql

**Functions:**
- public.extract_plain_text_from_html
- public.validate_rich_text_length
- public.update_updates_search_vector

**Triggers:**
- updates_search_vector_update

### 20251002125606_invitation_system.sql

**Tables:**
- invitations
- invitation_redemptions

**Functions:**
- validate_invitation_token
- mark_invitation_used
- increment_invitation_use_count
- revoke_invitation
- cleanup_expired_invitations

**Policies:**
- "Parents
- "Anyone
- "Parents
- "System

**Indexes:**
- IF
- IF
- IF
- IF
- IF
- IF
- IF

**Dropped:**
- FUNCTION: cleanup_expired_invitations
- FUNCTION: revoke_invitation
- FUNCTION: increment_invitation_use_count
- FUNCTION: mark_invitation_used
- FUNCTION: validate_invitation_token
- TABLE: invitation_redemptions
- TABLE: invitations

### 20251005000001_composite_indexes_optimization.sql

**Indexes:**
- IF
- IF
- IF
- IF

**Dropped:**
- INDEX: idx_updates_parent_id
- INDEX: idx_updates_created_at

### 20251005000002_add_children_columns.sql

**Indexes:**
- on
- IF
- IF
- IF
- IF

### 20251005000003_add_profiles_columns.sql

**Indexes:**
- on
- IF
- IF

### 20251006000001_recipient_centric_refactor.sql

**Functions:**
- to
- should_send_to_recipient

**Indexes:**
- IF
- IF
- IF

**Views:**
- for
- that
- recipient_preferences

### 20251006000002_prompt_suggestions_simple.sql

**Tables:**
- prompt_suggestions

**Functions:**
- for
- get_random_prompt_suggestion
- track_prompt_shown
- track_prompt_clicked

**Policies:**
- "Anyone
- "No

**Indexes:**
- IF
- IF

**Views:**
- for
- prompt_analytics

### 20251006000003_rls_performance_optimization.sql

**Indexes:**
- IF
- IF
- IF
- IF
- IF
- IF
- IF
- IF
- IF
- IF
- idx_name

**Dropped:**
- INDEX: idx_delivery_jobs_update_id_lookup
- INDEX: idx_updates_id_parent_id
- INDEX: idx_likes_update_id_lookup
- INDEX: idx_comments_update_id_lookup
- INDEX: idx_responses_update_id_lookup
- INDEX: idx_digest_updates_digest_id_lookup
- INDEX: idx_digests_id_parent_id
- INDEX: idx_invitation_redemptions_invitation_id_lookup
- INDEX: idx_invitations_id_parent_id
- INDEX: idx_notification_history_user_id_unread

### 20251007000001_memory_book_transformation.sql

**Functions:**
- update_summary_stats
- update_summary_updated_at
- get_summaries_for_auto_publish
- get_summaries_needing_reminders

**Triggers:**
- with
- trigger_update_summary_stats
- trigger_update_summary_updated_at

**Policies:**
- "Parents
- "Parents

**Indexes:**
- idx_memories_summary_id
- idx_memories_parent_status_created
- idx_memories_status
- idx_memories_is_new
- idx_memories_capture_channel
- idx_summary_memories_summary_id
- idx_summary_memories_memory_id
- idx_summary_memories_recipient_id
- idx_summary_memories_included
- idx_summaries_parent_id
- idx_summaries_status
- idx_summaries_digest_date
- idx_summaries_created_at
- idx_summaries_auto_publish

**Dropped:**
- INDEX: idx_updates_digest_id
- INDEX: idx_updates_parent_status_created
- INDEX: idx_updates_status
- INDEX: idx_digest_updates_digest_id
- INDEX: idx_digest_updates_update_id
- INDEX: idx_digest_updates_recipient_id
- INDEX: idx_digest_updates_included
- INDEX: idx_digests_parent_id
- INDEX: idx_digests_status
- INDEX: idx_digests_digest_date
- INDEX: idx_digests_created_at
- FUNCTION: update_digest_stats
- FUNCTION: track_update_edit
- FUNCTION: update_digest_updated_at

### 20251007000002_feedback_screenshots_storage.sql

**Policies:**
- "Authenticated
- "Public

### 20251010000001_fix_notification_jobs_references.sql

**Functions:**
- create_digest_jobs

### 20251010000002_notification_system_complete.sql

**Tables:**
- notification_jobs
- notification_delivery_logs
- digest_schedules
- notification_preferences_cache

**Functions:**
- enqueue_notification_job
- create_digest_jobs
- cleanup_notification_data

**Policies:**
- "Parents
- "Parents
- "Parents
- "System

**Indexes:**
- IF
- IF
- IF
- IF
- IF
- IF
- IF
- IF
- IF
- IF
- IF
- IF

### 20251011000001_memory_metadata.sql

**Tables:**
- user_metadata_values

**Functions:**
- get_metadata_autocomplete
- get_user_metadata_values
- track_metadata_usage
- search_memories_by_metadata
- bulk_update_metadata

**Triggers:**
- to
- trigger_track_metadata_usage

**Policies:**
- "Users

**Indexes:**
- IF
- IF
- IF
- IF
- IF
- idx_user_metadata_values_user_category
- idx_user_metadata_values_value_trgm
- idx_user_metadata_values_usage

**Dropped:**
- FUNCTION: track_metadata_usage
- FUNCTION: bulk_update_metadata
- FUNCTION: search_memories_by_metadata
- FUNCTION: get_user_metadata_values
- FUNCTION: get_metadata_autocomplete
- TABLE: user_metadata_values
- INDEX: idx_memories_metadata_dates
- INDEX: idx_memories_metadata_people
- INDEX: idx_memories_metadata_locations
- INDEX: idx_memories_metadata_milestones
- INDEX: idx_memories_metadata_gin

### 20251013000001_full_text_search_optimization.sql

**Tables:**
- for
- public.search_analytics

**Functions:**
- to
- public.update_comments_search_vector
- public.search_memories
- public.search_comments
- public.search_memories_with_highlights
- public.get_search_statistics
- public.rebuild_search_vectors

**Triggers:**
- to
- comments_search_vector_update

**Policies:**
- "Users
- "Users

**Indexes:**
- IF
- IF
- IF
- IF
- IF

### 20251013000002_fix_security_definer_views.sql

**Views:**
- recipient_preferences
- prompt_analytics

