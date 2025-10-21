export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      ai_prompts: {
        Row: {
          acted_on_at: string | null
          child_id: string | null
          created_at: string | null
          id: string
          parent_id: string
          prompt_data: Json | null
          prompt_text: string
          prompt_type: string
          sent_at: string | null
          status: string | null
          substituted_variables: Json | null
          template_id: string | null
        }
        Insert: {
          acted_on_at?: string | null
          child_id?: string | null
          created_at?: string | null
          id?: string
          parent_id: string
          prompt_data?: Json | null
          prompt_text: string
          prompt_type: string
          sent_at?: string | null
          status?: string | null
          substituted_variables?: Json | null
          template_id?: string | null
        }
        Update: {
          acted_on_at?: string | null
          child_id?: string | null
          created_at?: string | null
          id?: string
          parent_id?: string
          prompt_data?: Json | null
          prompt_text?: string
          prompt_type?: string
          sent_at?: string | null
          status?: string | null
          substituted_variables?: Json | null
          template_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_prompts_child_id_fkey"
            columns: ["child_id"]
            isOneToOne: false
            referencedRelation: "children"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_prompts_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_prompts_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "prompt_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      children: {
        Row: {
          birth_date: string
          created_at: string | null
          delivery_method: string | null
          group_id: string | null
          id: string
          is_active: boolean | null
          name: string
          parent_id: string
          profile_photo_url: string | null
          recipient_id: string | null
          status: string | null
          title: string | null
          updated_at: string | null
        }
        Insert: {
          birth_date: string
          created_at?: string | null
          delivery_method?: string | null
          group_id?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          parent_id: string
          profile_photo_url?: string | null
          recipient_id?: string | null
          status?: string | null
          title?: string | null
          updated_at?: string | null
        }
        Update: {
          birth_date?: string
          created_at?: string | null
          delivery_method?: string | null
          group_id?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          parent_id?: string
          profile_photo_url?: string | null
          recipient_id?: string | null
          status?: string | null
          title?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "children_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "recipient_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "children_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "children_recipient_id_fkey"
            columns: ["recipient_id"]
            isOneToOne: false
            referencedRelation: "recipient_preferences"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "children_recipient_id_fkey"
            columns: ["recipient_id"]
            isOneToOne: false
            referencedRelation: "recipients"
            referencedColumns: ["id"]
          },
        ]
      }
      comments: {
        Row: {
          content: string
          created_at: string | null
          id: string
          parent_id: string
          update_id: string
          updated_at: string | null
        }
        Insert: {
          content: string
          created_at?: string | null
          id?: string
          parent_id: string
          update_id: string
          updated_at?: string | null
        }
        Update: {
          content?: string
          created_at?: string | null
          id?: string
          parent_id?: string
          update_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "comments_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comments_update_id_fkey"
            columns: ["update_id"]
            isOneToOne: false
            referencedRelation: "memories"
            referencedColumns: ["id"]
          },
        ]
      }
      delivery_jobs: {
        Row: {
          channel: string
          delivered_at: string | null
          error_message: string | null
          external_id: string | null
          id: string
          queued_at: string | null
          recipient_id: string
          sent_at: string | null
          status: string | null
          update_id: string
        }
        Insert: {
          channel: string
          delivered_at?: string | null
          error_message?: string | null
          external_id?: string | null
          id?: string
          queued_at?: string | null
          recipient_id: string
          sent_at?: string | null
          status?: string | null
          update_id: string
        }
        Update: {
          channel?: string
          delivered_at?: string | null
          error_message?: string | null
          external_id?: string | null
          id?: string
          queued_at?: string | null
          recipient_id?: string
          sent_at?: string | null
          status?: string | null
          update_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "delivery_jobs_recipient_id_fkey"
            columns: ["recipient_id"]
            isOneToOne: false
            referencedRelation: "recipient_preferences"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "delivery_jobs_recipient_id_fkey"
            columns: ["recipient_id"]
            isOneToOne: false
            referencedRelation: "recipients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "delivery_jobs_update_id_fkey"
            columns: ["update_id"]
            isOneToOne: false
            referencedRelation: "memories"
            referencedColumns: ["id"]
          },
        ]
      }
      digest_queue: {
        Row: {
          content: Json
          created_at: string | null
          delivery_status: string | null
          digest_type: string
          error_message: string | null
          id: string
          last_retry_at: string | null
          retry_count: number | null
          scheduled_for: string
          sent_at: string | null
          user_id: string
        }
        Insert: {
          content?: Json
          created_at?: string | null
          delivery_status?: string | null
          digest_type: string
          error_message?: string | null
          id?: string
          last_retry_at?: string | null
          retry_count?: number | null
          scheduled_for: string
          sent_at?: string | null
          user_id: string
        }
        Update: {
          content?: Json
          created_at?: string | null
          delivery_status?: string | null
          digest_type?: string
          error_message?: string | null
          id?: string
          last_retry_at?: string | null
          retry_count?: number | null
          scheduled_for?: string
          sent_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "digest_queue_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      digest_schedules: {
        Row: {
          created_at: string | null
          delivery_day: number | null
          delivery_time: string
          digest_settings: Json | null
          frequency: string
          group_id: string
          id: string
          include_content_types: string[] | null
          is_active: boolean | null
          last_digest_sent: string | null
          max_updates_per_digest: number | null
          next_digest_scheduled: string | null
          recipient_id: string
          timezone: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          delivery_day?: number | null
          delivery_time?: string
          digest_settings?: Json | null
          frequency: string
          group_id: string
          id?: string
          include_content_types?: string[] | null
          is_active?: boolean | null
          last_digest_sent?: string | null
          max_updates_per_digest?: number | null
          next_digest_scheduled?: string | null
          recipient_id: string
          timezone?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          delivery_day?: number | null
          delivery_time?: string
          digest_settings?: Json | null
          frequency?: string
          group_id?: string
          id?: string
          include_content_types?: string[] | null
          is_active?: boolean | null
          last_digest_sent?: string | null
          max_updates_per_digest?: number | null
          next_digest_scheduled?: string | null
          recipient_id?: string
          timezone?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "digest_schedules_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "recipient_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "digest_schedules_recipient_id_fkey"
            columns: ["recipient_id"]
            isOneToOne: false
            referencedRelation: "recipient_preferences"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "digest_schedules_recipient_id_fkey"
            columns: ["recipient_id"]
            isOneToOne: false
            referencedRelation: "recipients"
            referencedColumns: ["id"]
          },
        ]
      }
      invitation_redemptions: {
        Row: {
          id: string
          invitation_id: string
          ip_address: string | null
          recipient_id: string
          redeemed_at: string | null
          user_agent: string | null
        }
        Insert: {
          id?: string
          invitation_id: string
          ip_address?: string | null
          recipient_id: string
          redeemed_at?: string | null
          user_agent?: string | null
        }
        Update: {
          id?: string
          invitation_id?: string
          ip_address?: string | null
          recipient_id?: string
          redeemed_at?: string | null
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invitation_redemptions_invitation_id_fkey"
            columns: ["invitation_id"]
            isOneToOne: false
            referencedRelation: "invitations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invitation_redemptions_recipient_id_fkey"
            columns: ["recipient_id"]
            isOneToOne: false
            referencedRelation: "recipient_preferences"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invitation_redemptions_recipient_id_fkey"
            columns: ["recipient_id"]
            isOneToOne: false
            referencedRelation: "recipients"
            referencedColumns: ["id"]
          },
        ]
      }
      invitations: {
        Row: {
          channel: string | null
          created_at: string | null
          custom_message: string | null
          expires_at: string | null
          group_id: string | null
          id: string
          invitation_type: string
          metadata: Json | null
          parent_id: string
          recipient_email: string | null
          recipient_phone: string | null
          status: string
          token: string
          updated_at: string | null
          use_count: number | null
        }
        Insert: {
          channel?: string | null
          created_at?: string | null
          custom_message?: string | null
          expires_at?: string | null
          group_id?: string | null
          id?: string
          invitation_type: string
          metadata?: Json | null
          parent_id: string
          recipient_email?: string | null
          recipient_phone?: string | null
          status?: string
          token: string
          updated_at?: string | null
          use_count?: number | null
        }
        Update: {
          channel?: string | null
          created_at?: string | null
          custom_message?: string | null
          expires_at?: string | null
          group_id?: string | null
          id?: string
          invitation_type?: string
          metadata?: Json | null
          parent_id?: string
          recipient_email?: string | null
          recipient_phone?: string | null
          status?: string
          token?: string
          updated_at?: string | null
          use_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "invitations_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "recipient_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invitations_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      likes: {
        Row: {
          created_at: string | null
          id: string
          parent_id: string
          update_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          parent_id: string
          update_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          parent_id?: string
          update_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "likes_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "likes_update_id_fkey"
            columns: ["update_id"]
            isOneToOne: false
            referencedRelation: "memories"
            referencedColumns: ["id"]
          },
        ]
      }
      memories: {
        Row: {
          ai_analysis: Json | null
          ai_suggested_importance: string | null
          capture_channel: string | null
          child_id: string
          comment_count: number | null
          confirmed_recipients: string[] | null
          content: string | null
          content_format: string | null
          created_at: string | null
          distribution_status: string | null
          id: string
          importance_level: string | null
          importance_overridden: boolean | null
          is_new: boolean | null
          like_count: number | null
          marked_ready_at: string | null
          media_urls: string[] | null
          metadata: Json | null
          milestone_type: string | null
          parent_id: string
          response_count: number | null
          rich_content: Json | null
          scheduled_for: string | null
          search_vector: unknown | null
          sent_at: string | null
          subject: string | null
          suggested_recipients: string[] | null
          summary_id: string | null
          updated_at: string | null
          view_count: number | null
        }
        Insert: {
          ai_analysis?: Json | null
          ai_suggested_importance?: string | null
          capture_channel?: string | null
          child_id: string
          comment_count?: number | null
          confirmed_recipients?: string[] | null
          content?: string | null
          content_format?: string | null
          created_at?: string | null
          distribution_status?: string | null
          id?: string
          importance_level?: string | null
          importance_overridden?: boolean | null
          is_new?: boolean | null
          like_count?: number | null
          marked_ready_at?: string | null
          media_urls?: string[] | null
          metadata?: Json | null
          milestone_type?: string | null
          parent_id: string
          response_count?: number | null
          rich_content?: Json | null
          scheduled_for?: string | null
          search_vector?: unknown | null
          sent_at?: string | null
          subject?: string | null
          suggested_recipients?: string[] | null
          summary_id?: string | null
          updated_at?: string | null
          view_count?: number | null
        }
        Update: {
          ai_analysis?: Json | null
          ai_suggested_importance?: string | null
          capture_channel?: string | null
          child_id?: string
          comment_count?: number | null
          confirmed_recipients?: string[] | null
          content?: string | null
          content_format?: string | null
          created_at?: string | null
          distribution_status?: string | null
          id?: string
          importance_level?: string | null
          importance_overridden?: boolean | null
          is_new?: boolean | null
          like_count?: number | null
          marked_ready_at?: string | null
          media_urls?: string[] | null
          metadata?: Json | null
          milestone_type?: string | null
          parent_id?: string
          response_count?: number | null
          rich_content?: Json | null
          scheduled_for?: string | null
          search_vector?: unknown | null
          sent_at?: string | null
          subject?: string | null
          suggested_recipients?: string[] | null
          summary_id?: string | null
          updated_at?: string | null
          view_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "updates_child_id_fkey"
            columns: ["child_id"]
            isOneToOne: false
            referencedRelation: "children"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "updates_digest_id_fkey"
            columns: ["summary_id"]
            isOneToOne: false
            referencedRelation: "summaries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "updates_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_delivery_logs: {
        Row: {
          created_at: string | null
          delivery_duration_ms: number | null
          delivery_method: string
          delivery_time: string | null
          error_code: string | null
          error_message: string | null
          group_id: string
          id: string
          job_id: string | null
          provider_message_id: string | null
          provider_response: Json | null
          recipient_id: string
          status: string
        }
        Insert: {
          created_at?: string | null
          delivery_duration_ms?: number | null
          delivery_method: string
          delivery_time?: string | null
          error_code?: string | null
          error_message?: string | null
          group_id: string
          id?: string
          job_id?: string | null
          provider_message_id?: string | null
          provider_response?: Json | null
          recipient_id: string
          status: string
        }
        Update: {
          created_at?: string | null
          delivery_duration_ms?: number | null
          delivery_method?: string
          delivery_time?: string | null
          error_code?: string | null
          error_message?: string | null
          group_id?: string
          id?: string
          job_id?: string | null
          provider_message_id?: string | null
          provider_response?: Json | null
          recipient_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_delivery_logs_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "recipient_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notification_delivery_logs_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "notification_jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notification_delivery_logs_recipient_id_fkey"
            columns: ["recipient_id"]
            isOneToOne: false
            referencedRelation: "recipient_preferences"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notification_delivery_logs_recipient_id_fkey"
            columns: ["recipient_id"]
            isOneToOne: false
            referencedRelation: "recipients"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_history: {
        Row: {
          content: string | null
          created_at: string | null
          delivery_method: string
          delivery_status: string | null
          id: string
          metadata: Json | null
          read_at: string | null
          sent_at: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          content?: string | null
          created_at?: string | null
          delivery_method: string
          delivery_status?: string | null
          id?: string
          metadata?: Json | null
          read_at?: string | null
          sent_at?: string | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          content?: string | null
          created_at?: string | null
          delivery_method?: string
          delivery_status?: string | null
          id?: string
          metadata?: Json | null
          read_at?: string | null
          sent_at?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_history_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_jobs: {
        Row: {
          content: Json
          created_at: string | null
          delivery_method: string
          failure_reason: string | null
          group_id: string
          id: string
          max_retries: number | null
          message_id: string | null
          metadata: Json | null
          notification_type: string
          processed_at: string | null
          recipient_id: string
          retry_count: number | null
          scheduled_for: string
          status: string
          update_id: string | null
          updated_at: string | null
          urgency_level: string
        }
        Insert: {
          content?: Json
          created_at?: string | null
          delivery_method: string
          failure_reason?: string | null
          group_id: string
          id?: string
          max_retries?: number | null
          message_id?: string | null
          metadata?: Json | null
          notification_type?: string
          processed_at?: string | null
          recipient_id: string
          retry_count?: number | null
          scheduled_for?: string
          status?: string
          update_id?: string | null
          updated_at?: string | null
          urgency_level?: string
        }
        Update: {
          content?: Json
          created_at?: string | null
          delivery_method?: string
          failure_reason?: string | null
          group_id?: string
          id?: string
          max_retries?: number | null
          message_id?: string | null
          metadata?: Json | null
          notification_type?: string
          processed_at?: string | null
          recipient_id?: string
          retry_count?: number | null
          scheduled_for?: string
          status?: string
          update_id?: string | null
          updated_at?: string | null
          urgency_level?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_jobs_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "recipient_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notification_jobs_recipient_id_fkey"
            columns: ["recipient_id"]
            isOneToOne: false
            referencedRelation: "recipient_preferences"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notification_jobs_recipient_id_fkey"
            columns: ["recipient_id"]
            isOneToOne: false
            referencedRelation: "recipients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notification_jobs_update_id_fkey"
            columns: ["update_id"]
            isOneToOne: false
            referencedRelation: "memories"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_preferences_cache: {
        Row: {
          cache_expires_at: string
          cache_version: number | null
          created_at: string | null
          effective_channels: string[]
          effective_content_types: string[]
          effective_frequency: string
          group_id: string
          id: string
          is_muted: boolean | null
          muted_until: string | null
          recipient_id: string
          source: string
          updated_at: string | null
        }
        Insert: {
          cache_expires_at: string
          cache_version?: number | null
          created_at?: string | null
          effective_channels: string[]
          effective_content_types: string[]
          effective_frequency: string
          group_id: string
          id?: string
          is_muted?: boolean | null
          muted_until?: string | null
          recipient_id: string
          source: string
          updated_at?: string | null
        }
        Update: {
          cache_expires_at?: string
          cache_version?: number | null
          created_at?: string | null
          effective_channels?: string[]
          effective_content_types?: string[]
          effective_frequency?: string
          group_id?: string
          id?: string
          is_muted?: boolean | null
          muted_until?: string | null
          recipient_id?: string
          source?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notification_preferences_cache_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "recipient_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notification_preferences_cache_recipient_id_fkey"
            columns: ["recipient_id"]
            isOneToOne: false
            referencedRelation: "recipient_preferences"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notification_preferences_cache_recipient_id_fkey"
            columns: ["recipient_id"]
            isOneToOne: false
            referencedRelation: "recipients"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string | null
          email: string
          group_id: string | null
          id: string
          name: string
          notification_preferences: Json | null
          onboarding_completed: boolean | null
          onboarding_skipped: boolean | null
          onboarding_step: number | null
          status: string | null
          title: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          email: string
          group_id?: string | null
          id: string
          name: string
          notification_preferences?: Json | null
          onboarding_completed?: boolean | null
          onboarding_skipped?: boolean | null
          onboarding_step?: number | null
          status?: string | null
          title?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string
          group_id?: string | null
          id?: string
          name?: string
          notification_preferences?: Json | null
          onboarding_completed?: boolean | null
          onboarding_skipped?: boolean | null
          onboarding_step?: number | null
          status?: string | null
          title?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "recipient_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      prompt_suggestions: {
        Row: {
          category: string
          created_at: string | null
          display_weight: number | null
          id: string
          is_active: boolean | null
          prompt_text: string
          times_clicked: number | null
          times_shown: number | null
          updated_at: string | null
        }
        Insert: {
          category: string
          created_at?: string | null
          display_weight?: number | null
          id?: string
          is_active?: boolean | null
          prompt_text: string
          times_clicked?: number | null
          times_shown?: number | null
          updated_at?: string | null
        }
        Update: {
          category?: string
          created_at?: string | null
          display_weight?: number | null
          id?: string
          is_active?: boolean | null
          prompt_text?: string
          times_clicked?: number | null
          times_shown?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      prompt_templates: {
        Row: {
          age_range_max: number | null
          age_range_min: number | null
          category: string | null
          community_prompt_id: string | null
          created_at: string | null
          created_by: string | null
          effectiveness_score: number | null
          id: string
          is_community_contributed: boolean | null
          prompt_type: string
          tags: string[] | null
          template_text: string
          updated_at: string | null
          usage_count: number | null
          variables: Json
        }
        Insert: {
          age_range_max?: number | null
          age_range_min?: number | null
          category?: string | null
          community_prompt_id?: string | null
          created_at?: string | null
          created_by?: string | null
          effectiveness_score?: number | null
          id?: string
          is_community_contributed?: boolean | null
          prompt_type: string
          tags?: string[] | null
          template_text: string
          updated_at?: string | null
          usage_count?: number | null
          variables?: Json
        }
        Update: {
          age_range_max?: number | null
          age_range_min?: number | null
          category?: string | null
          community_prompt_id?: string | null
          created_at?: string | null
          created_by?: string | null
          effectiveness_score?: number | null
          id?: string
          is_community_contributed?: boolean | null
          prompt_type?: string
          tags?: string[] | null
          template_text?: string
          updated_at?: string | null
          usage_count?: number | null
          variables?: Json
        }
        Relationships: [
          {
            foreignKeyName: "prompt_templates_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      recipient_groups: {
        Row: {
          created_at: string | null
          default_channels: string[] | null
          default_frequency: string | null
          id: string
          is_default_group: boolean | null
          name: string
          parent_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          default_channels?: string[] | null
          default_frequency?: string | null
          id?: string
          is_default_group?: boolean | null
          name: string
          parent_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          default_channels?: string[] | null
          default_frequency?: string | null
          id?: string
          is_default_group?: boolean | null
          name?: string
          parent_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "recipient_groups_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      recipients: {
        Row: {
          content_types: string[] | null
          created_at: string | null
          digest_preferences: Json | null
          email: string | null
          email_normalized: string | null
          frequency: string | null
          group_id: string | null
          id: string
          importance_threshold: string | null
          is_active: boolean | null
          name: string
          overrides_group_default: boolean | null
          parent_id: string
          phone: string | null
          phone_sanitized: string | null
          preference_token: string
          preferred_channels: string[] | null
          relationship: string
          updated_at: string | null
        }
        Insert: {
          content_types?: string[] | null
          created_at?: string | null
          digest_preferences?: Json | null
          email?: string | null
          email_normalized?: never
          frequency?: string | null
          group_id?: string | null
          id?: string
          importance_threshold?: string | null
          is_active?: boolean | null
          name: string
          overrides_group_default?: boolean | null
          parent_id: string
          phone?: string | null
          phone_sanitized?: never
          preference_token?: string
          preferred_channels?: string[] | null
          relationship: string
          updated_at?: string | null
        }
        Update: {
          content_types?: string[] | null
          created_at?: string | null
          digest_preferences?: Json | null
          email?: string | null
          email_normalized?: never
          frequency?: string | null
          group_id?: string | null
          id?: string
          importance_threshold?: string | null
          is_active?: boolean | null
          name?: string
          overrides_group_default?: boolean | null
          parent_id?: string
          phone?: string | null
          phone_sanitized?: never
          preference_token?: string
          preferred_channels?: string[] | null
          relationship?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "recipients_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "recipient_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recipients_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      responses: {
        Row: {
          channel: string
          content: string | null
          external_id: string | null
          id: string
          media_urls: string[] | null
          parent_notified: boolean | null
          received_at: string | null
          recipient_id: string
          update_id: string
        }
        Insert: {
          channel: string
          content?: string | null
          external_id?: string | null
          id?: string
          media_urls?: string[] | null
          parent_notified?: boolean | null
          received_at?: string | null
          recipient_id: string
          update_id: string
        }
        Update: {
          channel?: string
          content?: string | null
          external_id?: string | null
          id?: string
          media_urls?: string[] | null
          parent_notified?: boolean | null
          received_at?: string | null
          recipient_id?: string
          update_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "responses_recipient_id_fkey"
            columns: ["recipient_id"]
            isOneToOne: false
            referencedRelation: "recipient_preferences"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "responses_recipient_id_fkey"
            columns: ["recipient_id"]
            isOneToOne: false
            referencedRelation: "recipients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "responses_update_id_fkey"
            columns: ["update_id"]
            isOneToOne: false
            referencedRelation: "memories"
            referencedColumns: ["id"]
          },
        ]
      }
      summaries: {
        Row: {
          ai_compilation_data: Json | null
          approved_at: string | null
          auto_publish_hours: number | null
          compiled_at: string | null
          created_at: string | null
          date_range_end: string
          date_range_start: string
          digest_date: string
          failed_count: number | null
          id: string
          last_reminder_sent_at: string | null
          parent_id: string
          parent_narrative: Json | null
          recipient_breakdown: Json | null
          reminder_count: number | null
          sent_at: string | null
          sent_count: number | null
          status: string | null
          title: string
          total_recipients: number | null
          total_updates: number | null
          updated_at: string | null
        }
        Insert: {
          ai_compilation_data?: Json | null
          approved_at?: string | null
          auto_publish_hours?: number | null
          compiled_at?: string | null
          created_at?: string | null
          date_range_end: string
          date_range_start: string
          digest_date: string
          failed_count?: number | null
          id?: string
          last_reminder_sent_at?: string | null
          parent_id: string
          parent_narrative?: Json | null
          recipient_breakdown?: Json | null
          reminder_count?: number | null
          sent_at?: string | null
          sent_count?: number | null
          status?: string | null
          title: string
          total_recipients?: number | null
          total_updates?: number | null
          updated_at?: string | null
        }
        Update: {
          ai_compilation_data?: Json | null
          approved_at?: string | null
          auto_publish_hours?: number | null
          compiled_at?: string | null
          created_at?: string | null
          date_range_end?: string
          date_range_start?: string
          digest_date?: string
          failed_count?: number | null
          id?: string
          last_reminder_sent_at?: string | null
          parent_id?: string
          parent_narrative?: Json | null
          recipient_breakdown?: Json | null
          reminder_count?: number | null
          sent_at?: string | null
          sent_count?: number | null
          status?: string | null
          title?: string
          total_recipients?: number | null
          total_updates?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "digests_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      summary_memories: {
        Row: {
          ai_rationale: Json | null
          created_at: string | null
          custom_caption: string | null
          custom_subject: string | null
          display_order: number
          id: string
          included: boolean | null
          memory_id: string
          narrative_data: Json | null
          photo_count: number | null
          recipient_id: string
          render_style: string | null
          summary_id: string
          updated_at: string | null
        }
        Insert: {
          ai_rationale?: Json | null
          created_at?: string | null
          custom_caption?: string | null
          custom_subject?: string | null
          display_order?: number
          id?: string
          included?: boolean | null
          memory_id: string
          narrative_data?: Json | null
          photo_count?: number | null
          recipient_id: string
          render_style?: string | null
          summary_id: string
          updated_at?: string | null
        }
        Update: {
          ai_rationale?: Json | null
          created_at?: string | null
          custom_caption?: string | null
          custom_subject?: string | null
          display_order?: number
          id?: string
          included?: boolean | null
          memory_id?: string
          narrative_data?: Json | null
          photo_count?: number | null
          recipient_id?: string
          render_style?: string | null
          summary_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "digest_updates_digest_id_fkey"
            columns: ["summary_id"]
            isOneToOne: false
            referencedRelation: "summaries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "digest_updates_recipient_id_fkey"
            columns: ["recipient_id"]
            isOneToOne: false
            referencedRelation: "recipient_preferences"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "digest_updates_recipient_id_fkey"
            columns: ["recipient_id"]
            isOneToOne: false
            referencedRelation: "recipients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "digest_updates_update_id_fkey"
            columns: ["memory_id"]
            isOneToOne: false
            referencedRelation: "memories"
            referencedColumns: ["id"]
          },
        ]
      }
      template_analytics: {
        Row: {
          action_taken: boolean | null
          action_type: string | null
          child_age_months: number | null
          created_at: string | null
          day_of_week: string | null
          engagement_score: number | null
          id: string
          prompt_id: string | null
          template_id: string
          time_of_day: string | null
          time_to_action: unknown | null
          user_id: string
        }
        Insert: {
          action_taken?: boolean | null
          action_type?: string | null
          child_age_months?: number | null
          created_at?: string | null
          day_of_week?: string | null
          engagement_score?: number | null
          id?: string
          prompt_id?: string | null
          template_id: string
          time_of_day?: string | null
          time_to_action?: unknown | null
          user_id: string
        }
        Update: {
          action_taken?: boolean | null
          action_type?: string | null
          child_age_months?: number | null
          created_at?: string | null
          day_of_week?: string | null
          engagement_score?: number | null
          id?: string
          prompt_id?: string | null
          template_id?: string
          time_of_day?: string | null
          time_to_action?: unknown | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "template_analytics_prompt_id_fkey"
            columns: ["prompt_id"]
            isOneToOne: false
            referencedRelation: "ai_prompts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "template_analytics_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "prompt_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "template_analytics_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_metadata_values: {
        Row: {
          category: string
          created_at: string | null
          id: string
          last_used_at: string | null
          usage_count: number | null
          user_id: string
          value: string
        }
        Insert: {
          category: string
          created_at?: string | null
          id?: string
          last_used_at?: string | null
          usage_count?: number | null
          user_id: string
          value: string
        }
        Update: {
          category?: string
          created_at?: string | null
          id?: string
          last_used_at?: string | null
          usage_count?: number | null
          user_id?: string
          value?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_metadata_values_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      prompt_analytics: {
        Row: {
          category: string | null
          click_through_rate: number | null
          created_at: string | null
          display_weight: number | null
          id: string | null
          is_active: boolean | null
          prompt_text: string | null
          times_clicked: number | null
          times_shown: number | null
          updated_at: string | null
        }
        Insert: {
          category?: string | null
          click_through_rate?: never
          created_at?: string | null
          display_weight?: number | null
          id?: string | null
          is_active?: boolean | null
          prompt_text?: string | null
          times_clicked?: number | null
          times_shown?: number | null
          updated_at?: string | null
        }
        Update: {
          category?: string | null
          click_through_rate?: never
          created_at?: string | null
          display_weight?: number | null
          id?: string | null
          is_active?: boolean | null
          prompt_text?: string | null
          times_clicked?: number | null
          times_shown?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      recipient_preferences: {
        Row: {
          content_types: string[] | null
          created_at: string | null
          email: string | null
          frequency: string | null
          group_default_channels: string[] | null
          group_default_frequency: string | null
          group_id: string | null
          group_name: string | null
          id: string | null
          importance_threshold: string | null
          is_active: boolean | null
          name: string | null
          overrides_group_default: boolean | null
          parent_id: string | null
          phone: string | null
          preference_token: string | null
          preferred_channels: string[] | null
          relationship: string | null
        }
        Relationships: [
          {
            foreignKeyName: "recipients_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "recipient_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recipients_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      analyze_content_formats: {
        Args: Record<PropertyKey, never>
        Returns: {
          avg_content_length: number
          content_format: string
          count: number
          has_rich_content_count: number
          has_subject_count: number
        }[]
      }
      bulk_update_metadata: {
        Args: {
          p_category: string
          p_memory_ids: string[]
          p_operation?: string
          p_user_id: string
          p_values: string[]
        }
        Returns: number
      }
      cleanup_expired_invitations: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      cleanup_notification_data: {
        Args: { p_days_to_keep?: number }
        Returns: number
      }
      cleanup_old_notifications: {
        Args: { retention_days?: number }
        Returns: number
      }
      create_default_groups_for_user: {
        Args: { user_id: string }
        Returns: undefined
      }
      create_digest_jobs: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      create_template_from_community_prompt: {
        Args: {
          age_max?: number
          age_min?: number
          community_prompt_id_param: string
          prompt_type_param: string
          template_text_param: string
          variables_param?: Json
        }
        Returns: string
      }
      enqueue_notification_job: {
        Args: {
          p_content?: Json
          p_delivery_method?: string
          p_group_id: string
          p_notification_type?: string
          p_recipient_id: string
          p_schedule_delay_minutes?: number
          p_update_id: string
          p_urgency_level?: string
        }
        Returns: string
      }
      extract_plain_text_from_html: {
        Args: { html_content: string }
        Returns: string
      }
      extract_plain_text_from_rich_content: {
        Args: { rich_content_data: Json }
        Returns: string
      }
      get_effective_content: {
        Args: {
          content_text: string
          format_type: string
          rich_content_data: Json
          subject_text: string
        }
        Returns: string
      }
      get_metadata_autocomplete: {
        Args: {
          p_category: string
          p_limit?: number
          p_query?: string
          p_user_id: string
        }
        Returns: {
          last_used_at: string
          usage_count: number
          value: string
        }[]
      }
      get_narrative_preview: {
        Args: { narrative_json: Json }
        Returns: string
      }
      get_notification_preferences: {
        Args: { user_uuid: string }
        Returns: Json
      }
      get_random_prompt_suggestion: {
        Args: Record<PropertyKey, never>
        Returns: {
          category: string
          id: string
          prompt_text: string
        }[]
      }
      get_recent_template_ids: {
        Args: { child_uuid: string; days_back?: number }
        Returns: string[]
      }
      get_recipient_by_token: {
        Args: { token: string }
        Returns: {
          recipient_data: Json
        }[]
      }
      get_summaries_for_auto_publish: {
        Args: Record<PropertyKey, never>
        Returns: {
          auto_publish_hours: number
          compiled_at: string
          hours_since_compiled: number
          parent_id: string
          summary_id: string
        }[]
      }
      get_summaries_needing_reminders: {
        Args: Record<PropertyKey, never>
        Returns: {
          hours_until_auto_publish: number
          last_reminder_hours_ago: number
          parent_id: string
          summary_id: string
        }[]
      }
      get_templates_by_filters: {
        Args: {
          age_months?: number
          enabled_types?: string[]
          exclude_template_ids?: string[]
          limit_count?: number
        }
        Returns: {
          age_range_max: number
          age_range_min: number
          category: string
          effectiveness_score: number
          id: string
          is_community_contributed: boolean
          prompt_type: string
          tags: string[]
          template_text: string
          usage_count: number
          variables: Json
        }[]
      }
      get_user_metadata_values: {
        Args: { p_category: string; p_user_id: string }
        Returns: {
          memory_count: number
          value: string
        }[]
      }
      gtrgm_compress: {
        Args: { "": unknown }
        Returns: unknown
      }
      gtrgm_decompress: {
        Args: { "": unknown }
        Returns: unknown
      }
      gtrgm_in: {
        Args: { "": unknown }
        Returns: unknown
      }
      gtrgm_options: {
        Args: { "": unknown }
        Returns: undefined
      }
      gtrgm_out: {
        Args: { "": unknown }
        Returns: unknown
      }
      increment_invitation_use_count: {
        Args: { invitation_id_param: string }
        Returns: undefined
      }
      increment_template_usage: {
        Args: { template_uuid: string }
        Returns: undefined
      }
      is_in_quiet_hours: {
        Args: { check_time?: string; user_uuid: string }
        Returns: boolean
      }
      mark_invitation_used: {
        Args: { invitation_id_param: string }
        Returns: undefined
      }
      migrate_email_updates: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      recalculate_template_effectiveness: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      revoke_invitation: {
        Args: { invitation_id_param: string; parent_id_param: string }
        Returns: boolean
      }
      safe_text_for_search: {
        Args: { input_text: string }
        Returns: string
      }
      schedule_digest_for_user: {
        Args: {
          digest_type_param: string
          scheduled_time: string
          user_uuid: string
        }
        Returns: string
      }
      search_memories_by_metadata: {
        Args: {
          p_dates?: string[]
          p_locations?: string[]
          p_match_type?: string
          p_milestones?: string[]
          p_people?: string[]
          p_user_id: string
        }
        Returns: {
          content: string
          created_at: string
          memory_id: string
          metadata: Json
        }[]
      }
      set_limit: {
        Args: { "": number }
        Returns: number
      }
      should_send_to_recipient: {
        Args: { recipient_threshold: string; update_importance: string }
        Returns: boolean
      }
      show_limit: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      show_trgm: {
        Args: { "": string }
        Returns: string[]
      }
      subject_search_vector: {
        Args: { subject_text: string }
        Returns: unknown
      }
      track_prompt_clicked: {
        Args: { prompt_id: string }
        Returns: undefined
      }
      track_prompt_shown: {
        Args: { prompt_id: string }
        Returns: undefined
      }
      update_template_effectiveness: {
        Args: { new_score: number; template_uuid: string }
        Returns: undefined
      }
      validate_invitation_token: {
        Args: { token_param: string }
        Returns: {
          channel: string
          custom_message: string
          expires_at: string
          group_id: string
          invitation_id: string
          invitation_type: string
          is_valid: boolean
          parent_id: string
          recipient_email: string
          recipient_phone: string
          status: string
          use_count: number
          validation_message: string
        }[]
      }
      validate_rich_text_length: {
        Args: { html_content: string; max_length?: number }
        Returns: boolean
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
