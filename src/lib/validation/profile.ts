import { z } from 'zod'

// Personal information schema
export const personalInfoSchema = z.object({
  name: z.string()
    .min(1, 'Name is required')
    .max(100, 'Name must be less than 100 characters')
    .regex(/^[a-zA-Z\s'-]+$/, 'Name can only contain letters, spaces, hyphens, and apostrophes'),

  email: z.string()
    .min(1, 'Email is required')
    .email('Please enter a valid email address'),

  profile_photo: z.instanceof(File)
    .optional()
    .refine((file) => {
      if (!file) return true
      return file.size <= 5 * 1024 * 1024 // 5MB limit
    }, 'File size must be less than 5MB')
    .refine((file) => {
      if (!file) return true
      return ['image/jpeg', 'image/png', 'image/webp'].includes(file.type)
    }, 'File must be a JPEG, PNG, or WebP image')
})

// Security settings schema
export const securitySchema = z.object({
  currentPassword: z.string()
    .min(1, 'Current password is required'),

  newPassword: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number')
    .regex(/[^a-zA-Z0-9]/, 'Password must contain at least one special character'),

  confirmPassword: z.string()
    .min(1, 'Please confirm your password')
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword']
})

// Password strength calculation
export function calculatePasswordStrength(password: string): {
  score: number
  label: string
  color: string
} {
  if (!password) {
    return { score: 0, label: 'No password', color: 'bg-gray-300' }
  }

  let score = 0

  // Length check
  if (password.length >= 8) score += 1
  if (password.length >= 12) score += 1

  // Character variety checks
  if (/[a-z]/.test(password)) score += 1
  if (/[A-Z]/.test(password)) score += 1
  if (/[0-9]/.test(password)) score += 1
  if (/[^a-zA-Z0-9]/.test(password)) score += 1

  // Common patterns (negative points)
  if (/(.)\1{2,}/.test(password)) score -= 1 // repeated characters
  if (/123|abc|qwe/i.test(password)) score -= 1 // common sequences

  // Ensure score is within bounds
  score = Math.max(0, Math.min(5, score))

  const labels = [
    { label: 'Very Weak', color: 'bg-red-500' },
    { label: 'Weak', color: 'bg-orange-500' },
    { label: 'Fair', color: 'bg-yellow-500' },
    { label: 'Good', color: 'bg-blue-500' },
    { label: 'Strong', color: 'bg-green-500' },
    { label: 'Very Strong', color: 'bg-green-600' }
  ]

  return {
    score,
    label: labels[score].label,
    color: labels[score].color
  }
}

// Notification preferences schema (for form validation)
export const notificationPreferencesSchema = z.object({
  emailNotifications: z.boolean(),
  pushNotifications: z.boolean(),
  responseNotifications: z.boolean(),
  weeklyDigest: z.boolean(),
  marketingEmails: z.boolean()
})

// Complete notification preferences schema (for database operations)
export const completeNotificationPreferencesSchema = z.object({
  response_notifications: z.enum(['immediate', 'hourly', 'daily_digest', 'off']),
  prompt_frequency: z.enum(['daily', 'every_3_days', 'weekly', 'off']),
  enabled_prompt_types: z.array(z.string()),
  quiet_hours: z.object({
    start: z.string(),
    end: z.string()
  }),
  delivery_notifications: z.boolean(),
  system_notifications: z.boolean(),
  weekly_digest: z.boolean(),
  weekly_digest_day: z.string(),
  monthly_summary: z.boolean(),
  browser_notifications: z.boolean(),
  email_notifications: z.boolean(),
  digest_email_time: z.string()
})

// Export types
export type PersonalInfoFormData = z.infer<typeof personalInfoSchema>
export type SecurityFormData = z.infer<typeof securitySchema>
export type NotificationPreferencesData = z.infer<typeof notificationPreferencesSchema>
export type CompleteNotificationPreferences = z.infer<typeof completeNotificationPreferencesSchema>

// Validation helpers
export function validateEmail(email: string): string | null {
  if (!email || email.trim().length === 0) {
    return 'Email is required'
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(email)) {
    return 'Please enter a valid email address'
  }

  return null
}

export function validateName(name: string): string | null {
  if (!name || name.trim().length === 0) {
    return 'Name is required'
  }

  if (name.length > 100) {
    return 'Name must be less than 100 characters'
  }

  if (!/^[a-zA-Z\s'-]+$/.test(name)) {
    return 'Name can only contain letters, spaces, hyphens, and apostrophes'
  }

  return null
}

export function validatePassword(password: string): string | null {
  if (!password || password.length === 0) {
    return 'Password is required'
  }

  if (password.length < 8) {
    return 'Password must be at least 8 characters'
  }

  if (!/[a-z]/.test(password)) {
    return 'Password must contain at least one lowercase letter'
  }

  if (!/[A-Z]/.test(password)) {
    return 'Password must contain at least one uppercase letter'
  }

  if (!/[0-9]/.test(password)) {
    return 'Password must contain at least one number'
  }

  if (!/[^a-zA-Z0-9]/.test(password)) {
    return 'Password must contain at least one special character'
  }

  return null
}