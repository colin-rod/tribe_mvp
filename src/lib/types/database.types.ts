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
          id: string
          name: string
          parent_id: string
          profile_photo_url: string | null
          updated_at: string | null
        }
        Insert: {
          birth_date: string
          created_at?: string | null
          id?: string
          name: string
          parent_id: string
          profile_photo_url?: string | null
          updated_at?: string | null
        }
        Update: {
          birth_date?: string
          created_at?: string | null
          id?: string
          name?: string
          parent_id?: string
          profile_photo_url?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "children_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "profiles"
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
            referencedRelation: "updates"
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
            referencedRelation: "recipients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "delivery_jobs_update_id_fkey"
            columns: ["update_id"]
            isOneToOne: false
            referencedRelation: "updates"
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
      digest_updates: {
        Row: {
          ai_rationale: Json | null
          created_at: string | null
          custom_caption: string | null
          custom_subject: string | null
          digest_id: string
          display_order: number
          id: string
          included: boolean | null
          narrative_data: Json | null
          recipient_id: string
          update_id: string
          updated_at: string | null
        }
        Insert: {
          ai_rationale?: Json | null
          created_at?: string | null
          custom_caption?: string | null
          custom_subject?: string | null
          digest_id: string
          display_order?: number
          id?: string
          included?: boolean | null
          narrative_data?: Json | null
          recipient_id: string
          update_id: string
          updated_at?: string | null
        }
        Update: {
          ai_rationale?: Json | null
          created_at?: string | null
          custom_caption?: string | null
          custom_subject?: string | null
          digest_id?: string
          display_order?: number
          id?: string
          included?: boolean | null
          narrative_data?: Json | null
          recipient_id?: string
          update_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "digest_updates_digest_id_fkey"
            columns: ["digest_id"]
            isOneToOne: false
            referencedRelation: "digests"
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
            columns: ["update_id"]
            isOneToOne: false
            referencedRelation: "updates"
            referencedColumns: ["id"]
          },
        ]
      }
      digests: {
        Row: {
          ai_compilation_data: Json | null
          approved_at: string | null
          compiled_at: string | null
          created_at: string | null
          date_range_end: string
          date_range_start: string
          digest_date: string
          failed_count: number | null
          id: string
          parent_id: string
          parent_narrative: Json | null
          recipient_breakdown: Json | null
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
          compiled_at?: string | null
          created_at?: string | null
          date_range_end: string
          date_range_start: string
          digest_date: string
          failed_count?: number | null
          id?: string
          parent_id: string
          parent_narrative?: Json | null
          recipient_breakdown?: Json | null
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
          compiled_at?: string | null
          created_at?: string | null
          date_range_end?: string
          date_range_start?: string
          digest_date?: string
          failed_count?: number | null
          id?: string
          parent_id?: string
          parent_narrative?: Json | null
          recipient_breakdown?: Json | null
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
      memories: {
        Row: {
          id: string
          parent_id: string
          child_id: string
          content: string | null
          media_urls: string[] | null
          milestone_type: string | null
          ai_analysis: Json | null
          suggested_recipients: string[] | null
          confirmed_recipients: string[] | null
          distribution_status: string | null
          created_at: string | null
          updated_at: string | null
          scheduled_for: string | null
          sent_at: string | null
          subject: string | null
          rich_content: Json | null
          content_format: string | null
          like_count: number | null
          comment_count: number | null
          response_count: number | null
          view_count: number | null
          search_vector: unknown | null
          summary_id: string | null
          ai_suggested_importance: string | null
          importance_level: string | null
          importance_overridden: boolean | null
          is_new: boolean | null
          capture_channel: string | null
          marked_ready_at: string | null
        }
        Insert: {
          id?: string
          parent_id: string
          child_id: string
          content?: string | null
          media_urls?: string[] | null
          milestone_type?: string | null
          ai_analysis?: Json | null
          suggested_recipients?: string[] | null
          confirmed_recipients?: string[] | null
          distribution_status?: string | null
          created_at?: string | null
          updated_at?: string | null
          scheduled_for?: string | null
          sent_at?: string | null
          subject?: string | null
          rich_content?: Json | null
          content_format?: string | null
          like_count?: number | null
          comment_count?: number | null
          response_count?: number | null
          view_count?: number | null
          search_vector?: unknown | null
          summary_id?: string | null
          ai_suggested_importance?: string | null
          importance_level?: string | null
          importance_overridden?: boolean | null
          is_new?: boolean | null
          capture_channel?: string | null
          marked_ready_at?: string | null
        }
        Update: {
          id?: string
          parent_id?: string
          child_id?: string
          content?: string | null
          media_urls?: string[] | null
          milestone_type?: string | null
          ai_analysis?: Json | null
          suggested_recipients?: string[] | null
          confirmed_recipients?: string[] | null
          distribution_status?: string | null
          created_at?: string | null
          updated_at?: string | null
          scheduled_for?: string | null
          sent_at?: string | null
          subject?: string | null
          rich_content?: Json | null
          content_format?: string | null
          like_count?: number | null
          comment_count?: number | null
          response_count?: number | null
          view_count?: number | null
          search_vector?: unknown | null
          summary_id?: string | null
          ai_suggested_importance?: string | null
          importance_level?: string | null
          importance_overridden?: boolean | null
          is_new?: boolean | null
          capture_channel?: string | null
          marked_ready_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "memories_child_id_fkey"
            columns: ["child_id"]
            isOneToOne: false
            referencedRelation: "children"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "memories_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "memories_summary_id_fkey"
            columns: ["summary_id"]
            isOneToOne: false
            referencedRelation: "summaries"
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
            referencedRelation: "updates"
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
      profiles: {
        Row: {
          created_at: string | null
          email: string
          id: string
          name: string
          notification_preferences: Json | null
          onboarding_completed: boolean | null
          onboarding_skipped: boolean | null
          onboarding_step: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          email: string
          id: string
          name: string
          notification_preferences?: Json | null
          onboarding_completed?: boolean | null
          onboarding_skipped?: boolean | null
          onboarding_step?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string
          id?: string
          name?: string
          notification_preferences?: Json | null
          onboarding_completed?: boolean | null
          onboarding_skipped?: boolean | null
          onboarding_step?: number | null
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
          frequency: string | null
          group_id: string | null
          id: string
          is_active: boolean | null
          name: string
          overrides_group_default: boolean | null
          parent_id: string
          phone: string | null
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
          frequency?: string | null
          group_id?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          overrides_group_default?: boolean | null
          parent_id: string
          phone?: string | null
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
          frequency?: string | null
          group_id?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          overrides_group_default?: boolean | null
          parent_id?: string
          phone?: string | null
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
            referencedRelation: "recipients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "responses_update_id_fkey"
            columns: ["update_id"]
            isOneToOne: false
            referencedRelation: "updates"
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
      summaries: {
        Row: {
          id: string
          parent_id: string
          title: string
          digest_date: string
          date_range_start: string
          date_range_end: string
          status: string | null
          ai_compilation_data: Json | null
          recipient_breakdown: Json | null
          total_updates: number | null
          total_recipients: number | null
          sent_count: number | null
          failed_count: number | null
          compiled_at: string | null
          approved_at: string | null
          sent_at: string | null
          created_at: string | null
          updated_at: string | null
          parent_narrative: Json | null
          auto_publish_hours: number | null
          last_reminder_sent_at: string | null
          reminder_count: number | null
        }
        Insert: {
          id?: string
          parent_id: string
          title: string
          digest_date: string
          date_range_start: string
          date_range_end: string
          status?: string | null
          ai_compilation_data?: Json | null
          recipient_breakdown?: Json | null
          total_updates?: number | null
          total_recipients?: number | null
          sent_count?: number | null
          failed_count?: number | null
          compiled_at?: string | null
          approved_at?: string | null
          sent_at?: string | null
          created_at?: string | null
          updated_at?: string | null
          parent_narrative?: Json | null
          auto_publish_hours?: number | null
          last_reminder_sent_at?: string | null
          reminder_count?: number | null
        }
        Update: {
          id?: string
          parent_id?: string
          title?: string
          digest_date?: string
          date_range_start?: string
          date_range_end?: string
          status?: string | null
          ai_compilation_data?: Json | null
          recipient_breakdown?: Json | null
          total_updates?: number | null
          total_recipients?: number | null
          sent_count?: number | null
          failed_count?: number | null
          compiled_at?: string | null
          approved_at?: string | null
          sent_at?: string | null
          created_at?: string | null
          updated_at?: string | null
          parent_narrative?: Json | null
          auto_publish_hours?: number | null
          last_reminder_sent_at?: string | null
          reminder_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "summaries_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      updates: {
        Row: {
          ai_analysis: Json | null
          child_id: string
          comment_count: number | null
          confirmed_recipients: string[] | null
          content: string | null
          content_format: string | null
          created_at: string | null
          digest_id: string | null
          distribution_status: string | null
          edit_count: number | null
          id: string
          last_edited_at: string | null
          like_count: number | null
          media_urls: string[] | null
          milestone_type: string | null
          parent_id: string
          response_count: number | null
          rich_content: Json | null
          scheduled_for: string | null
          search_vector: unknown | null
          sent_at: string | null
          subject: string | null
          suggested_recipients: string[] | null
          updated_at: string | null
          version: number | null
          view_count: number | null
        }
        Insert: {
          ai_analysis?: Json | null
          child_id: string
          comment_count?: number | null
          confirmed_recipients?: string[] | null
          content?: string | null
          content_format?: string | null
          created_at?: string | null
          digest_id?: string | null
          distribution_status?: string | null
          edit_count?: number | null
          id?: string
          last_edited_at?: string | null
          like_count?: number | null
          media_urls?: string[] | null
          milestone_type?: string | null
          parent_id: string
          response_count?: number | null
          rich_content?: Json | null
          scheduled_for?: string | null
          search_vector?: unknown | null
          sent_at?: string | null
          subject?: string | null
          suggested_recipients?: string[] | null
          updated_at?: string | null
          version?: number | null
          view_count?: number | null
        }
        Update: {
          ai_analysis?: Json | null
          child_id?: string
          comment_count?: number | null
          confirmed_recipients?: string[] | null
          content?: string | null
          content_format?: string | null
          created_at?: string | null
          digest_id?: string | null
          distribution_status?: string | null
          edit_count?: number | null
          id?: string
          last_edited_at?: string | null
          like_count?: number | null
          media_urls?: string[] | null
          milestone_type?: string | null
          parent_id?: string
          response_count?: number | null
          rich_content?: Json | null
          scheduled_for?: string | null
          search_vector?: unknown | null
          sent_at?: string | null
          subject?: string | null
          suggested_recipients?: string[] | null
          updated_at?: string | null
          version?: number | null
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
            columns: ["digest_id"]
            isOneToOne: false
            referencedRelation: "digests"
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
    }
    Views: {
      [_ in never]: never
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
      cleanup_expired_invitations: {
        Args: Record<PropertyKey, never>
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
      get_narrative_preview: {
        Args: { narrative_json: Json }
        Returns: string
      }
      get_notification_preferences: {
        Args: { user_uuid: string }
        Returns: Json
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
      subject_search_vector: {
        Args: { subject_text: string }
        Returns: unknown
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
