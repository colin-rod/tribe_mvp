// Database types for Tribe MVP
// These will be generated from Supabase CLI later

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          email: string
          name: string
          notification_preferences: Record<string, unknown>
          onboarding_completed: boolean
          onboarding_step: number
          onboarding_skipped: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          name: string
          notification_preferences?: Record<string, unknown>
          onboarding_completed?: boolean
          onboarding_step?: number
          onboarding_skipped?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          name?: string
          notification_preferences?: Record<string, unknown>
          onboarding_completed?: boolean
          onboarding_step?: number
          onboarding_skipped?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      children: {
        Row: {
          id: string
          parent_id: string
          name: string
          birth_date: string
          profile_photo_url: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          parent_id: string
          name: string
          birth_date: string
          profile_photo_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          parent_id?: string
          name?: string
          birth_date?: string
          profile_photo_url?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      recipient_groups: {
        Row: {
          id: string
          parent_id: string
          name: string
          default_frequency: string
          default_channels: string[]
          is_default_group: boolean
          created_at: string
        }
        Insert: {
          id?: string
          parent_id: string
          name: string
          default_frequency?: string
          default_channels?: string[]
          is_default_group?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          parent_id?: string
          name?: string
          default_frequency?: string
          default_channels?: string[]
          is_default_group?: boolean
          created_at?: string
        }
      }
      recipients: {
        Row: {
          id: string
          parent_id: string
          email: string | null
          phone: string | null
          name: string
          relationship: string
          group_id: string | null
          frequency: string
          preferred_channels: string[]
          content_types: string[]
          overrides_group_default: boolean
          preference_token: string
          is_active: boolean
          created_at: string
        }
        Insert: {
          id?: string
          parent_id: string
          email?: string | null
          phone?: string | null
          name: string
          relationship: string
          group_id?: string | null
          frequency?: string
          preferred_channels?: string[]
          content_types?: string[]
          overrides_group_default?: boolean
          preference_token: string
          is_active?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          parent_id?: string
          email?: string | null
          phone?: string | null
          name?: string
          relationship?: string
          group_id?: string | null
          frequency?: string
          preferred_channels?: string[]
          content_types?: string[]
          overrides_group_default?: boolean
          preference_token?: string
          is_active?: boolean
          created_at?: string
        }
      }
      updates: {
        Row: {
          id: string
          parent_id: string
          child_id: string
          content: string | null
          media_urls: string[]
          milestone_type: string | null
          ai_analysis: Record<string, unknown>
          suggested_recipients: string[]
          confirmed_recipients: string[]
          distribution_status: 'draft' | 'scheduled' | 'sending' | 'sent' | 'failed'
          like_count: number
          comment_count: number
          response_count: number
          view_count: number
          search_vector: unknown
          created_at: string
          updated_at: string
          scheduled_for: string | null
          sent_at: string | null
        }
        Insert: {
          id?: string
          parent_id: string
          child_id: string
          content?: string | null
          media_urls?: string[]
          milestone_type?: string | null
          ai_analysis?: Record<string, unknown>
          suggested_recipients?: string[]
          confirmed_recipients?: string[]
          distribution_status?: 'draft' | 'scheduled' | 'sending' | 'sent' | 'failed'
          like_count?: number
          comment_count?: number
          response_count?: number
          view_count?: number
          created_at?: string
          updated_at?: string
          scheduled_for?: string | null
          sent_at?: string | null
        }
        Update: {
          id?: string
          parent_id?: string
          child_id?: string
          content?: string | null
          media_urls?: string[]
          milestone_type?: string | null
          ai_analysis?: Record<string, unknown>
          suggested_recipients?: string[]
          confirmed_recipients?: string[]
          distribution_status?: 'draft' | 'scheduled' | 'sending' | 'sent' | 'failed'
          like_count?: number
          comment_count?: number
          response_count?: number
          view_count?: number
          created_at?: string
          updated_at?: string
          scheduled_for?: string | null
          sent_at?: string | null
        }
      }
      likes: {
        Row: {
          id: string
          update_id: string
          parent_id: string
          created_at: string
        }
        Insert: {
          id?: string
          update_id: string
          parent_id: string
          created_at?: string
        }
        Update: {
          id?: string
          update_id?: string
          parent_id?: string
          created_at?: string
        }
      }
      comments: {
        Row: {
          id: string
          update_id: string
          parent_id: string
          content: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          update_id: string
          parent_id: string
          content: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          update_id?: string
          parent_id?: string
          content?: string
          created_at?: string
          updated_at?: string
        }
      }
      delivery_jobs: {
        Row: {
          id: string
          update_id: string
          recipient_id: string
          channel: string
          status: 'queued' | 'sent' | 'delivered' | 'failed'
          external_id: string | null
          error_message: string | null
          sent_at: string | null
          delivered_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          update_id: string
          recipient_id: string
          channel: string
          status?: 'queued' | 'sent' | 'delivered' | 'failed'
          external_id?: string | null
          error_message?: string | null
          sent_at?: string | null
          delivered_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          update_id?: string
          recipient_id?: string
          channel?: string
          status?: 'queued' | 'sent' | 'delivered' | 'failed'
          external_id?: string | null
          error_message?: string | null
          sent_at?: string | null
          delivered_at?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      responses: {
        Row: {
          id: string
          update_id: string
          recipient_id: string
          channel: 'email' | 'whatsapp' | 'sms'
          external_id: string | null
          content: string | null
          media_urls: string[]
          parent_notified: boolean
          received_at: string
        }
        Insert: {
          id?: string
          update_id: string
          recipient_id: string
          channel: 'email' | 'whatsapp' | 'sms'
          external_id?: string | null
          content?: string | null
          media_urls?: string[]
          parent_notified?: boolean
          received_at?: string
        }
        Update: {
          id?: string
          update_id?: string
          recipient_id?: string
          channel?: 'email' | 'whatsapp' | 'sms'
          external_id?: string | null
          content?: string | null
          media_urls?: string[]
          parent_notified?: boolean
          received_at?: string
        }
      }
      group_memberships: {
        Row: {
          id: string
          recipient_id: string
          group_id: string
          notification_frequency: 'every_update' | 'daily_digest' | 'weekly_digest' | 'milestones_only' | null
          preferred_channels: ('email' | 'whatsapp' | 'sms')[] | null
          content_types: string[] | null
          role: 'member' | 'admin'
          joined_at: string
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          recipient_id: string
          group_id: string
          notification_frequency?: 'every_update' | 'daily_digest' | 'weekly_digest' | 'milestones_only' | null
          preferred_channels?: ('email' | 'whatsapp' | 'sms')[] | null
          content_types?: string[] | null
          role?: 'member' | 'admin'
          joined_at?: string
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          recipient_id?: string
          group_id?: string
          notification_frequency?: 'every_update' | 'daily_digest' | 'weekly_digest' | 'milestones_only' | null
          preferred_channels?: ('email' | 'whatsapp' | 'sms')[] | null
          content_types?: string[] | null
          role?: 'member' | 'admin'
          joined_at?: string
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_dashboard_updates: {
        Args: {
          p_parent_id: string
          p_search_query?: string
          p_child_ids?: string[]
          p_milestone_types?: string[]
          p_status_filter?: string
          p_date_from?: string
          p_date_to?: string
          p_limit?: number
          p_offset?: number
          p_cursor_created_at?: string
          p_cursor_id?: string
        }
        Returns: Array<{
          id: string
          parent_id: string
          child_id: string
          child_name: string
          child_avatar_url: string | null
          content: string | null
          media_urls: string[]
          milestone_type: string | null
          like_count: number
          comment_count: number
          response_count: number
          view_count: number
          distribution_status: string
          created_at: string
          updated_at: string
          scheduled_for: string | null
          sent_at: string | null
          ai_analysis: Record<string, unknown>
        }>
      }
      get_dashboard_stats: {
        Args: {
          p_parent_id: string
          p_date_from?: string
          p_date_to?: string
        }
        Returns: Array<{
          total_updates: number
          total_responses: number
          total_views: number
          milestones_count: number
          updates_by_child: Record<string, unknown>
          updates_by_date: Record<string, unknown>
          engagement_stats: Record<string, unknown>
          recent_activity: Record<string, unknown>[]
        }>
      }
      get_timeline_updates: {
        Args: {
          p_parent_id: string
          p_search_query?: string
          p_child_ids?: string[]
          p_date_from?: string
          p_date_to?: string
          p_limit?: number
        }
        Returns: Array<{
          date_group: string
          updates_count: number
          updates: Record<string, unknown>[]
        }>
      }
      toggle_update_like: {
        Args: {
          p_update_id: string
          p_parent_id: string
        }
        Returns: Array<{
          is_liked: boolean
          like_count: number
        }>
      }
      add_update_comment: {
        Args: {
          p_update_id: string
          p_parent_id: string
          p_content: string
        }
        Returns: Array<{
          id: string
          content: string
          created_at: string
          comment_count: number
        }>
      }
      get_update_likes: {
        Args: {
          p_update_id: string
          p_parent_id: string
        }
        Returns: Array<{
          id: string
          parent_id: string
          parent_name: string
          created_at: string
        }>
      }
      get_update_comments: {
        Args: {
          p_update_id: string
          p_parent_id: string
          p_limit?: number
          p_offset?: number
        }
        Returns: Array<{
          id: string
          parent_id: string
          parent_name: string
          content: string
          created_at: string
          updated_at: string
        }>
      }
      increment_update_view_count: {
        Args: {
          p_update_id: string
          p_parent_id: string
        }
        Returns: undefined
      }
      get_effective_notification_settings: {
        Args: {
          p_recipient_id: string
          p_group_id: string
        }
        Returns: Array<{
          frequency: 'every_update' | 'daily_digest' | 'weekly_digest' | 'milestones_only'
          channels: ('email' | 'whatsapp' | 'sms')[]
          content_types: string[]
          source: 'member_override' | 'group_default'
        }>
      }
      get_recipient_memberships: {
        Args: {
          p_recipient_id: string
        }
        Returns: Array<{
          id: string
          group_id: string
          notification_frequency: 'every_update' | 'daily_digest' | 'weekly_digest' | 'milestones_only' | null
          preferred_channels: ('email' | 'whatsapp' | 'sms')[] | null
          content_types: string[] | null
          role: 'member' | 'admin'
          joined_at: string
          is_active: boolean
          created_at: string
          updated_at: string
          recipient_groups: {
            id: string
            name: string
            default_frequency: 'every_update' | 'daily_digest' | 'weekly_digest' | 'milestones_only' | null
            default_channels: ('email' | 'whatsapp' | 'sms')[] | null
            notification_settings: Record<string, unknown> | null
            access_settings: Record<string, unknown> | null
            is_default_group: boolean
            created_at: string | null
          }
        }>
      }
      set_config: {
        Args: {
          parameter: string
          value: string
        }
        Returns: undefined
      }
    }
    Enums: {
      delivery_status: 'queued' | 'sent' | 'delivered' | 'failed'
      communication_channel: 'email' | 'sms' | 'push'
      milestone_type: 'first_smile' | 'rolling' | 'sitting' | 'crawling' | 'first_steps' | 'first_words' | 'first_tooth' | 'walking' | 'potty_training' | 'first_day_school' | 'birthday' | 'other'
      distribution_status: 'draft' | 'scheduled' | 'sending' | 'sent' | 'failed'
    }
  }
}

// Additional types for dashboard functionality
export type UpdateWithChild = Database['public']['Functions']['get_dashboard_updates']['Returns'][0]
export type DashboardStats = Database['public']['Functions']['get_dashboard_stats']['Returns'][0]
export type TimelineUpdate = Database['public']['Functions']['get_timeline_updates']['Returns'][0]
export type UpdateLike = Database['public']['Functions']['get_update_likes']['Returns'][0]
export type UpdateComment = Database['public']['Functions']['get_update_comments']['Returns'][0]

// Enhanced types with relationships
export interface EnhancedUpdate {
  id: string
  parent_id: string
  child_id: string
  child_name: string
  child_avatar_url: string | null
  content: string | null
  media_urls: string[]
  milestone_type: Database['public']['Enums']['milestone_type'] | null
  like_count: number
  comment_count: number
  response_count: number
  view_count: number
  distribution_status: Database['public']['Enums']['distribution_status']
  ai_analysis: Record<string, unknown>
  created_at: string
  updated_at: string
  scheduled_for: string | null
  sent_at: string | null
  is_liked?: boolean
  likes?: UpdateLike[]
  comments?: UpdateComment[]
}

// Dashboard filter types
export interface DashboardFilters {
  search?: string
  childIds?: string[]
  milestoneTypes?: Database['public']['Enums']['milestone_type'][]
  status?: Database['public']['Enums']['distribution_status']
  dateFrom?: string
  dateTo?: string
}

// Pagination types
export interface PaginationParams {
  limit?: number
  offset?: number
  cursorCreatedAt?: string
  cursorId?: string
}

// Dashboard statistics breakdown
export interface ChildUpdateStats {
  count: number
  child_id: string
  avatar_url: string | null
}

export interface EngagementStats {
  avg_responses_per_update: number
  most_popular_milestone: Database['public']['Enums']['milestone_type'] | null
  total_likes: number
  total_comments: number
}

export interface RecentActivity {
  update_id: string
  child_name: string
  content_preview: string
  response_count: number
  created_at: string
}

// Real-time subscription types
export interface EngagementUpdatePayload {
  update_id: string
  parent_id: string
  like_count: number
  response_count: number
  view_count: number
}

// Search and filter utilities
export type SearchableFields = 'content' | 'milestone_type' | 'child_name'
export type SortField = 'created_at' | 'like_count' | 'response_count' | 'view_count'
export type SortDirection = 'asc' | 'desc'

export interface SearchOptions {
  fields?: SearchableFields[]
  sortBy?: SortField
  sortDirection?: SortDirection
}

// Client query options
export interface QueryOptions extends PaginationParams {
  refetchOnMount?: boolean
  refetchOnWindowFocus?: boolean
  staleTime?: number
  cacheTime?: number
}