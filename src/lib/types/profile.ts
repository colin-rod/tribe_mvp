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

// Type mappings between database schema and form data
export interface NotificationPreferencesMapping {
  // Map camelCase form data to snake_case database fields
  emailNotifications: 'email_notifications'
  pushNotifications: 'browser_notifications'
  responseNotifications: 'delivery_notifications'
  weeklyDigest: 'weekly_digest'
  marketingEmails: 'system_notifications'
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

// Unified notification preference types for better type safety
export type NotificationResponseTiming = 'immediate' | 'hourly' | 'daily_digest' | 'off'
export type NotificationPromptFrequency = 'daily' | 'every_3_days' | 'weekly' | 'off'
export type NotificationDeliveryMethod = 'browser' | 'email' | 'digest'
export type NotificationStatus = 'pending' | 'sent' | 'delivered' | 'failed' | 'bounced'
export type NotificationDigestType = 'daily' | 'weekly' | 'monthly'

// Type conversion utilities
export const convertFormToPreferences = (formData: NotificationFormData): Partial<NotificationPreferences> => ({
  email_notifications: formData.emailNotifications,
  browser_notifications: formData.pushNotifications,
  delivery_notifications: formData.responseNotifications,
  weekly_digest: formData.weeklyDigest,
  system_notifications: formData.marketingEmails
})

export const convertPreferencesToForm = (preferences: NotificationPreferences): NotificationFormData => ({
  emailNotifications: preferences.email_notifications ?? true,
  pushNotifications: preferences.browser_notifications ?? false,
  smsNotifications: false, // Not implemented yet
  updateReminders: preferences.delivery_notifications ?? true,
  responseNotifications: preferences.delivery_notifications ?? true,
  weeklyDigest: preferences.weekly_digest ?? true,
  marketingEmails: preferences.system_notifications ?? false
})

// Safely convert partial form data to complete NotificationFormData
export const safeConvertToFormData = (formData: Partial<NotificationFormData>): NotificationFormData => ({
  emailNotifications: formData.emailNotifications ?? true,
  pushNotifications: formData.pushNotifications ?? false,
  smsNotifications: formData.smsNotifications ?? false,
  updateReminders: formData.updateReminders ?? true,
  responseNotifications: formData.responseNotifications ?? true,
  weeklyDigest: formData.weeklyDigest ?? true,
  marketingEmails: formData.marketingEmails ?? false
})