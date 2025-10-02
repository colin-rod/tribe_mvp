/**
 * Form Validation Utilities
 *
 * Provides common validation rules, helper functions, and patterns
 * for standardized form validation across the application.
 */

import { z } from 'zod'

// ============================================================================
// Common Validation Rules
// ============================================================================

/**
 * Email validation with comprehensive pattern matching
 */
export const emailValidation = z
  .string()
  .min(1, 'Email is required')
  .email('Please enter a valid email address')
  .max(254, 'Email address is too long')

/**
 * Password validation with security requirements
 */
export const passwordValidation = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(128, 'Password is too long')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number')
  .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character')

/**
 * Phone number validation (flexible format)
 */
export const phoneValidation = z
  .string()
  .min(1, 'Phone number is required')
  .regex(
    /^[\+]?[(]?[0-9]{1,4}[)]?[-\s\.]?[(]?[0-9]{1,4}[)]?[-\s\.]?[0-9]{1,9}$/,
    'Please enter a valid phone number'
  )

/**
 * URL validation
 */
export const urlValidation = z
  .string()
  .url('Please enter a valid URL')
  .max(2048, 'URL is too long')

/**
 * Required text field with length constraints
 */
export const textRequired = (fieldName = 'This field', minLength = 1, maxLength = 255) =>
  z
    .string()
    .min(minLength, `${fieldName} must be at least ${minLength} character${minLength === 1 ? '' : 's'}`)
    .max(maxLength, `${fieldName} must not exceed ${maxLength} characters`)
    .trim()

/**
 * Optional text field with length constraints
 */
export const textOptional = (maxLength = 255) =>
  z
    .string()
    .max(maxLength, `Text must not exceed ${maxLength} characters`)
    .trim()
    .optional()

/**
 * Numeric validation with min/max
 */
export const numericRange = (min: number, max: number, fieldName = 'Value') =>
  z
    .number({
      required_error: `${fieldName} is required`,
      invalid_type_error: `${fieldName} must be a number`,
    })
    .min(min, `${fieldName} must be at least ${min}`)
    .max(max, `${fieldName} must not exceed ${max}`)

/**
 * Date validation (must be in the past)
 */
export const dateInPast = (fieldName = 'Date') =>
  z
    .date({
      required_error: `${fieldName} is required`,
      invalid_type_error: `${fieldName} must be a valid date`,
    })
    .max(new Date(), `${fieldName} must be in the past`)

/**
 * Date validation (must be in the future)
 */
export const dateInFuture = (fieldName = 'Date') =>
  z
    .date({
      required_error: `${fieldName} is required`,
      invalid_type_error: `${fieldName} must be a valid date`,
    })
    .min(new Date(), `${fieldName} must be in the future`)

// ============================================================================
// Custom Validation Functions
// ============================================================================

/**
 * Validates that two fields match (e.g., password confirmation)
 */
export function createMatchValidator<T extends Record<string, unknown>>(
  field1: keyof T,
  field2: keyof T,
  errorMessage = 'Fields do not match'
) {
  return (data: T) => {
    if (data[field1] !== data[field2]) {
      return {
        isValid: false,
        error: errorMessage,
        field: field2,
      }
    }
    return { isValid: true }
  }
}

/**
 * Validates checkbox/terms acceptance
 */
export const acceptTerms = z
  .boolean()
  .refine((val) => val === true, {
    message: 'You must accept the terms and conditions',
  })

/**
 * File size validation (in bytes)
 */
export const fileSizeValidation = (maxSizeInMB: number) => {
  const maxSizeInBytes = maxSizeInMB * 1024 * 1024
  return z
    .instanceof(File)
    .refine(
      (file) => file.size <= maxSizeInBytes,
      `File size must be less than ${maxSizeInMB}MB`
    )
}

/**
 * File type validation
 */
export const fileTypeValidation = (allowedTypes: string[]) => {
  return z
    .instanceof(File)
    .refine(
      (file) => allowedTypes.includes(file.type),
      `File must be one of: ${allowedTypes.join(', ')}`
    )
}

// ============================================================================
// Validation Error Formatting
// ============================================================================

/**
 * Formats Zod errors into a user-friendly structure
 */
export function formatZodErrors(error: z.ZodError): Record<string, string> {
  const formattedErrors: Record<string, string> = {}

  error.errors.forEach((err) => {
    const path = err.path.join('.')
    formattedErrors[path] = err.message
  })

  return formattedErrors
}

/**
 * Gets the first error message from a Zod error
 */
export function getFirstError(error: z.ZodError): string {
  return error.errors[0]?.message || 'Validation error occurred'
}

/**
 * Checks if a specific field has an error
 */
export function hasFieldError(
  errors: Record<string, string>,
  fieldName: string
): boolean {
  return fieldName in errors
}

/**
 * Gets error message for a specific field
 */
export function getFieldError(
  errors: Record<string, string>,
  fieldName: string
): string | undefined {
  return errors[fieldName]
}

// ============================================================================
// Accessibility Helpers
// ============================================================================

/**
 * Generates ARIA attributes for form fields
 */
export function getFieldAriaAttributes(
  fieldId: string,
  error?: string,
  helperText?: string,
  isRequired = false
) {
  const ariaDescribedBy: string[] = []

  if (error) {
    ariaDescribedBy.push(`${fieldId}-error`)
  }
  if (helperText && !error) {
    ariaDescribedBy.push(`${fieldId}-helper`)
  }

  return {
    'aria-invalid': error ? true : undefined,
    'aria-describedby': ariaDescribedBy.length > 0 ? ariaDescribedBy.join(' ') : undefined,
    'aria-required': isRequired ? true : undefined,
  }
}

/**
 * Generates unique IDs for form field associations
 */
export function generateFieldIds(baseId: string) {
  return {
    fieldId: baseId,
    labelId: `${baseId}-label`,
    errorId: `${baseId}-error`,
    helperId: `${baseId}-helper`,
    descriptionId: `${baseId}-description`,
  }
}

// ============================================================================
// Common Validation Patterns
// ============================================================================

/**
 * Login form validation schema
 */
export const loginFormSchema = z.object({
  email: emailValidation,
  password: z.string().min(1, 'Password is required'),
})

/**
 * Registration form validation schema
 */
export const registrationFormSchema = z.object({
  email: emailValidation,
  password: passwordValidation,
  confirmPassword: z.string().min(1, 'Please confirm your password'),
  acceptTerms: acceptTerms,
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
})

/**
 * Profile update validation schema
 */
export const profileFormSchema = z.object({
  firstName: textRequired('First name', 1, 50),
  lastName: textRequired('Last name', 1, 50),
  email: emailValidation,
  phone: phoneValidation.optional(),
  bio: textOptional(500),
})

/**
 * Contact form validation schema
 */
export const contactFormSchema = z.object({
  name: textRequired('Name', 2, 100),
  email: emailValidation,
  subject: textRequired('Subject', 5, 200),
  message: textRequired('Message', 10, 2000),
})

// ============================================================================
// Real-time Validation Helpers
// ============================================================================

/**
 * Debounce function for real-time validation
 */
export function debounce<T extends (...args: never[]) => void>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null

  return (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout)
    timeout = setTimeout(() => func(...args), wait)
  }
}

/**
 * Validates a single field asynchronously
 */
export async function validateField<T extends z.ZodTypeAny>(
  schema: T,
  value: unknown
): Promise<{ isValid: boolean; error?: string }> {
  try {
    await schema.parseAsync(value)
    return { isValid: true }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        isValid: false,
        error: error.errors[0]?.message || 'Validation error',
      }
    }
    throw error
  }
}

// ============================================================================
// Form State Helpers
// ============================================================================

export interface FormState<T> {
  values: T
  errors: Record<string, string>
  touched: Record<string, boolean>
  isSubmitting: boolean
  isValidating: boolean
}

/**
 * Checks if form is valid (no errors and all required fields touched)
 */
export function isFormValid<T>(
  state: FormState<T>,
  requiredFields: (keyof T)[]
): boolean {
  const hasNoErrors = Object.keys(state.errors).length === 0
  const allRequiredTouched = requiredFields.every(
    (field) => state.touched[field as string] === true
  )

  return hasNoErrors && allRequiredTouched && !state.isSubmitting
}

/**
 * Marks all fields as touched (useful for form submission)
 */
export function touchAllFields<T extends Record<string, unknown>>(
  values: T
): Record<string, boolean> {
  const touched: Record<string, boolean> = {}
  Object.keys(values).forEach((key) => {
    touched[key] = true
  })
  return touched
}
