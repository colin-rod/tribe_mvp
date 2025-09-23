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