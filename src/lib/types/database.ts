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
          milestone_type: string | null
          media_urls: string[]
          is_sent: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          parent_id: string
          child_id: string
          content?: string | null
          milestone_type?: string | null
          media_urls?: string[]
          is_sent?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          parent_id?: string
          child_id?: string
          content?: string | null
          milestone_type?: string | null
          media_urls?: string[]
          is_sent?: boolean
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      delivery_status: 'queued' | 'sent' | 'delivered' | 'failed'
      communication_channel: 'email' | 'sms' | 'push'
    }
  }
}