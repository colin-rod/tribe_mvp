'use client'

/**
 * Form Validation Context
 *
 * Provides a centralized validation context for forms with:
 * - Real-time validation feedback
 * - Accessibility announcements
 * - Consistent error handling
 * - Field-level and form-level validation
 */

import React, { createContext, useContext, useState, useCallback, useRef } from 'react'
import { z } from 'zod'
import { formatZodErrors, debounce } from '@/lib/validation/form-utils'

// ============================================================================
// Types
// ============================================================================

export interface ValidationError {
  message: string
  type?: string
}

export interface FormValidationState {
  errors: Record<string, string>
  touched: Record<string, boolean>
  isValidating: boolean
  isSubmitting: boolean
}

export interface FormValidationContextValue<T extends Record<string, unknown>> {
  // State
  values: T
  errors: Record<string, string>
  touched: Record<string, boolean>
  isValidating: boolean
  isSubmitting: boolean
  isValid: boolean

  // Actions
  setFieldValue: (field: keyof T, value: unknown) => void
  setFieldError: (field: keyof T, error: string) => void
  clearFieldError: (field: keyof T) => void
  setFieldTouched: (field: keyof T, isTouched?: boolean) => void
  validateField: (field: keyof T) => Promise<boolean>
  validateForm: () => Promise<boolean>
  resetForm: (newValues?: Partial<T>) => void
  submitForm: () => Promise<void>

  // Helpers
  getFieldError: (field: keyof T) => string | undefined
  hasFieldError: (field: keyof T) => boolean
  isFieldTouched: (field: keyof T) => boolean
  getFieldProps: (field: keyof T) => FieldProps
}

export interface FieldProps {
  value: unknown
  error?: string
  touched: boolean
  onChange: (value: unknown) => void
  onBlur: () => void
}

export interface FormValidationProviderProps<T extends Record<string, unknown>> {
  children: React.ReactNode
  initialValues: T
  validationSchema?: z.ZodSchema<T>
  onSubmit: (values: T) => Promise<void> | void
  validateOnChange?: boolean
  validateOnBlur?: boolean
  validateDebounceMs?: number
}

// ============================================================================
// Context
// ============================================================================

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const FormValidationContext = createContext<FormValidationContextValue<any> | null>(null)

// ============================================================================
// Provider
// ============================================================================

export function FormValidationProvider<T extends Record<string, unknown>>({
  children,
  initialValues,
  validationSchema,
  onSubmit,
  validateOnChange = true,
  validateOnBlur = true,
  validateDebounceMs = 300,
}: FormValidationProviderProps<T>) {
  const [values, setValues] = useState<T>(initialValues)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [touched, setTouched] = useState<Record<string, boolean>>({})
  const [isValidating, setIsValidating] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Ref for accessibility announcements
  const announcerRef = useRef<HTMLDivElement>(null)

  // Announce validation errors to screen readers
  const announceError = useCallback((field: string, error: string) => {
    if (announcerRef.current) {
      announcerRef.current.textContent = `${field}: ${error}`
    }
  }, [])

  // Clear accessibility announcement
  const clearAnnouncement = useCallback(() => {
    if (announcerRef.current) {
      announcerRef.current.textContent = ''
    }
  }, [])

  // Debounced field validation
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const debouncedValidateField = useCallback(
    debounce((field: keyof T) => {
      validateField(field)
    }, validateDebounceMs),
    [validateDebounceMs]
  )

  // Set field value
  const setFieldValue = useCallback((field: keyof T, value: unknown) => {
    setValues((prev) => ({ ...prev, [field]: value }))

    if (validateOnChange) {
      debouncedValidateField(field)
    }
  }, [validateOnChange, debouncedValidateField])

  // Set field error
  const setFieldError = useCallback((field: keyof T, error: string) => {
    setErrors((prev) => ({ ...prev, [field as string]: error }))
    announceError(field as string, error)
  }, [announceError])

  // Clear field error
  const clearFieldError = useCallback((field: keyof T) => {
    setErrors((prev) => {
      const next = { ...prev }
      delete next[field as string]
      return next
    })
    clearAnnouncement()
  }, [clearAnnouncement])

  // Set field touched
  const setFieldTouched = useCallback(
    (field: keyof T, isTouched = true) => {
      setTouched((prev) => ({ ...prev, [field as string]: isTouched }))

      if (isTouched && validateOnBlur) {
        validateField(field)
      }
    },
    [validateOnBlur, validateField]
  )

  // Validate single field
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const validateField = useCallback(
    async (field: keyof T): Promise<boolean> => {
      if (!validationSchema) return true

      setIsValidating(true)

      try {
        // Extract field schema if it's a ZodObject
        if (validationSchema instanceof z.ZodObject) {
          const fieldSchema = validationSchema.shape[field as string]
          if (fieldSchema) {
            await fieldSchema.parseAsync(values[field])
          }
        }

        clearFieldError(field)
        return true
      } catch (error) {
        if (error instanceof z.ZodError) {
          const fieldError = error.errors[0]?.message || 'Validation error'
          setFieldError(field, fieldError)
          return false
        }
        throw error
      } finally {
        setIsValidating(false)
      }
    },
    [validationSchema, values, setFieldError, clearFieldError]
  )

  // Validate entire form
  const validateForm = useCallback(async (): Promise<boolean> => {
    if (!validationSchema) return true

    setIsValidating(true)

    try {
      await validationSchema.parseAsync(values)
      setErrors({})
      clearAnnouncement()
      return true
    } catch (error) {
      if (error instanceof z.ZodError) {
        const formErrors = formatZodErrors(error)
        setErrors(formErrors)

        // Announce first error
        const firstError = Object.entries(formErrors)[0]
        if (firstError) {
          announceError(firstError[0], firstError[1])
        }
        return false
      }
      throw error
    } finally {
      setIsValidating(false)
    }
  }, [validationSchema, values, announceError, clearAnnouncement])

  // Reset form
  const resetForm = useCallback((newValues?: Partial<T>) => {
    setValues((prev) => ({ ...prev, ...newValues }))
    setErrors({})
    setTouched({})
    setIsSubmitting(false)
    setIsValidating(false)
    clearAnnouncement()
  }, [clearAnnouncement])

  // Submit form
  const submitForm = useCallback(async () => {
    // Mark all fields as touched
    const allTouched: Record<string, boolean> = {}
    Object.keys(values).forEach((key) => {
      allTouched[key] = true
    })
    setTouched(allTouched)

    // Validate form
    const isValid = await validateForm()
    if (!isValid) {
      return
    }

    setIsSubmitting(true)

    try {
      await onSubmit(values)
      clearAnnouncement()
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Form submission failed'
      announceError('form', errorMessage)
      throw error
    } finally {
      setIsSubmitting(false)
    }
  }, [values, validateForm, onSubmit, announceError, clearAnnouncement])

  // Get field error
  const getFieldError = useCallback(
    (field: keyof T): string | undefined => {
      return errors[field as string]
    },
    [errors]
  )

  // Check if field has error
  const hasFieldError = useCallback(
    (field: keyof T): boolean => {
      return field as string in errors
    },
    [errors]
  )

  // Check if field is touched
  const isFieldTouched = useCallback(
    (field: keyof T): boolean => {
      return touched[field as string] === true
    },
    [touched]
  )

  // Get field props (convenience helper)
  const getFieldProps = useCallback(
    (field: keyof T): FieldProps => {
      return {
        value: values[field],
        error: touched[field as string] ? errors[field as string] : undefined,
        touched: touched[field as string] === true,
        onChange: (value: unknown) => setFieldValue(field, value),
        onBlur: () => setFieldTouched(field, true),
      }
    },
    [values, errors, touched, setFieldValue, setFieldTouched]
  )

  // Check if form is valid
  const isValid = Object.keys(errors).length === 0

  const contextValue: FormValidationContextValue<T> = {
    values,
    errors,
    touched,
    isValidating,
    isSubmitting,
    isValid,
    setFieldValue,
    setFieldError,
    clearFieldError,
    setFieldTouched,
    validateField,
    validateForm,
    resetForm,
    submitForm,
    getFieldError,
    hasFieldError,
    isFieldTouched,
    getFieldProps,
  }

  return (
    <FormValidationContext.Provider value={contextValue}>
      {children}
      {/* Accessibility announcer (hidden from view) */}
      <div
        ref={announcerRef}
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      />
    </FormValidationContext.Provider>
  )
}

// ============================================================================
// Hook
// ============================================================================

export function useFormValidationContext<T extends Record<string, unknown>>(): FormValidationContextValue<T> {
  const context = useContext(FormValidationContext)

  if (!context) {
    throw new Error('useFormValidationContext must be used within FormValidationProvider')
  }

  return context
}

// ============================================================================
// Field-level Hook
// ============================================================================

export interface UseFieldOptions<T extends Record<string, unknown>> {
  name: keyof T
  validate?: (value: unknown) => string | undefined | Promise<string | undefined>
}

export function useField<T extends Record<string, unknown>>(
  options: UseFieldOptions<T>
) {
  const context = useFormValidationContext<T>()
  const { name, validate } = options

  const value = context.values[name]
  const error = context.touched[name as string] ? context.errors[name as string] : undefined
  const touched = context.isFieldTouched(name)

  const handleChange = useCallback(
    (newValue: unknown) => {
      context.setFieldValue(name, newValue)

      // Run custom validation if provided
      if (validate) {
        const customError = validate(newValue)
        if (typeof customError === 'string') {
          context.setFieldError(name, customError)
        } else if (customError instanceof Promise) {
          customError.then((error) => {
            if (error) {
              context.setFieldError(name, error)
            } else {
              context.clearFieldError(name)
            }
          }).catch(() => {
            // Handle validation error silently
          })
        } else {
          context.clearFieldError(name)
        }
      }
    },
    [name, validate, context]
  )

  const handleBlur = useCallback(() => {
    context.setFieldTouched(name, true)
  }, [name, context])

  return {
    value,
    error,
    touched,
    onChange: handleChange,
    onBlur: handleBlur,
    isValidating: context.isValidating,
  }
}
