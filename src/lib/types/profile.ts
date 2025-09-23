export interface ProfileTab {
  id: string
  label: string
  description: string
  icon: 'user' | 'cog' | 'shield' | 'bell' | 'lock'
}

export interface ProfileFormData {
  name: string
  bio?: string
  timezone: string
  language: string
  dateFormat: string
  avatar?: string
}

export interface AccountFormData {
  email: string
  timezone: string
  autoSave: boolean
  emailDigest: boolean
}

export interface SecurityFormData {
  currentPassword: string
  newPassword: string
  confirmPassword: string
  twoFactorEnabled: boolean
}

export interface NotificationFormData {
  emailNotifications: boolean
  pushNotifications: boolean
  smsNotifications: boolean
  updateReminders: boolean
  responseNotifications: boolean
  weeklyDigest: boolean
  marketingEmails: boolean
}

export interface NotificationPreferences {
  response_notifications: 'immediate' | 'hourly' | 'daily_digest' | 'off'
  prompt_frequency: 'daily' | 'every_3_days' | 'weekly' | 'off'
  enabled_prompt_types: string[]
  quiet_hours: { start: string, end: string }
  delivery_notifications: boolean
  system_notifications: boolean
  weekly_digest: boolean
  weekly_digest_day: string
  monthly_summary: boolean
  browser_notifications: boolean
  email_notifications: boolean
  digest_email_time: string
}

export interface DigestPreferences {
  enabled: boolean
  frequency: 'daily' | 'weekly' | 'monthly'
  delivery_day?: string
  delivery_time: string
  content_types: string[]
  include_metrics: boolean
  include_responses: boolean
  include_prompts: boolean
}

export interface QuietHours {
  enabled: boolean
  start: string
  end: string
  timezone: string
  weekdays_only?: boolean
  holiday_mode?: boolean
}

export interface PrivacyFormData {
  profileVisibility: 'public' | 'private' | 'friends'
  dataSharing: boolean
  analyticsOptOut: boolean
  deleteAfterInactivity: boolean
}

export interface PasswordStrength {
  score: 0 | 1 | 2 | 3 | 4
  feedback: string[]
  warning?: string
}

export interface FormValidationResult {
  isValid: boolean
  errors: Record<string, string>
}

export interface FormState {
  loading: boolean
  success: boolean
  error: string | null
  lastSaved?: Date
}