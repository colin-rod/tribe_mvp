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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
}