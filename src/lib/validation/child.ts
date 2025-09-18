import { z } from 'zod'

export const addChildSchema = z.object({
  name: z.string()
    .min(1, 'Name is required')
    .max(100, 'Name must be less than 100 characters')
    .regex(/^[a-zA-Z\s'-]+$/, 'Name can only contain letters, spaces, hyphens, and apostrophes'),

  birth_date: z.string()
    .min(1, 'Birth date is required')
    .refine((date) => {
      const birthDate = new Date(date)
      const today = new Date()
      const maxAge = new Date()
      maxAge.setFullYear(today.getFullYear() - 18) // Max 18 years old

      return birthDate <= today && birthDate >= maxAge
    }, 'Birth date must be within the last 18 years'),

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

export const editChildSchema = z.object({
  name: z.string()
    .min(1, 'Name is required')
    .max(100, 'Name must be less than 100 characters')
    .regex(/^[a-zA-Z\s'-]+$/, 'Name can only contain letters, spaces, hyphens, and apostrophes'),

  birth_date: z.string()
    .min(1, 'Birth date is required')
    .refine((date) => {
      const birthDate = new Date(date)
      const today = new Date()
      const maxAge = new Date()
      maxAge.setFullYear(today.getFullYear() - 18) // Max 18 years old

      return birthDate <= today && birthDate >= maxAge
    }, 'Birth date must be within the last 18 years'),

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

export type AddChildFormData = z.infer<typeof addChildSchema>
export type EditChildFormData = z.infer<typeof editChildSchema>

// Date formatting utilities for form inputs
export function formatDateForInput(dateString: string): string {
  const date = new Date(dateString)
  return date.toISOString().split('T')[0]
}

export function formatDateFromInput(inputDate: string): string {
  return inputDate
}

// Validation helpers
export function validateChildName(name: string): string | null {
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

export function validateBirthDate(birthDate: string): string | null {
  if (!birthDate) {
    return 'Birth date is required'
  }

  const birth = new Date(birthDate)
  const today = new Date()
  const maxAge = new Date()
  maxAge.setFullYear(today.getFullYear() - 18)

  if (birth > today) {
    return 'Birth date cannot be in the future'
  }
  if (birth < maxAge) {
    return 'Child must be under 18 years old'
  }

  return null
}