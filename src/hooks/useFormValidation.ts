import { useState, useCallback } from 'react'
import { z } from 'zod'

export interface FieldError {
  message: string
  type?: string
}

export interface FormErrors {
  [key: string]: FieldError | undefined
}

export interface ValidationResult {
  isValid: boolean
  errors: FormErrors
}

export interface UseFormValidationOptions<T> {
  schema?: z.ZodSchema<T>
  mode?: 'onChange' | 'onBlur' | 'onSubmit'
  reValidateMode?: 'onChange' | 'onBlur'
}

export interface UseFormValidationReturn<T> {
  errors: FormErrors
  isValidating: boolean
  isValid: boolean
  validate: (data: T) => Promise<ValidationResult>
  validateField: (name: keyof T, value: unknown) => Promise<boolean>
  setError: (name: keyof T, error: FieldError) => void
  clearError: (name: keyof T) => void
  clearErrors: () => void
  hasError: (name: keyof T) => boolean
  getError: (name: keyof T) => string | undefined
}

export function useFormValidation<T extends Record<string, unknown>>(
  options: UseFormValidationOptions<T> = {}
): UseFormValidationReturn<T> {
  const { schema } = options

  const [errors, setErrors] = useState<FormErrors>({})
  const [isValidating, setIsValidating] = useState(false)

  const validate = useCallback(
    async (data: T): Promise<ValidationResult> => {
      if (!schema) {
        return { isValid: true, errors: {} }
      }

      setIsValidating(true)

      try {
        await schema.parseAsync(data)
        setErrors({})
        return { isValid: true, errors: {} }
      } catch (error) {
        if (error instanceof z.ZodError) {
          const formErrors: FormErrors = {}
          error.errors.forEach((err) => {
            const path = err.path.join('.')
            formErrors[path] = {
              message: err.message,
              type: err.code,
            }
          })
          setErrors(formErrors)
          return { isValid: false, errors: formErrors }
        }
        throw error
      } finally {
        setIsValidating(false)
      }
    },
    [schema]
  )

  const validateField = useCallback(
    async (name: keyof T, value: unknown): Promise<boolean> => {
      if (!schema) {
        return true
      }

      setIsValidating(true)

      try {
        // Create a partial schema for the specific field
        const fieldSchema =
          schema instanceof z.ZodObject
            ? (schema.shape[name as string] as z.ZodSchema | undefined)
            : undefined

        if (!fieldSchema) {
          return true
        }

        await fieldSchema.parseAsync(value)
        setErrors((prev) => {
          const next = { ...prev }
          delete next[name as string]
          return next
        })
        return true
      } catch (error) {
        if (error instanceof z.ZodError) {
          const fieldError = error.errors[0]
          setErrors((prev) => ({
            ...prev,
            [name as string]: {
              message: fieldError.message,
              type: fieldError.code,
            },
          }))
          return false
        }
        throw error
      } finally {
        setIsValidating(false)
      }
    },
    [schema]
  )

  const setError = useCallback((name: keyof T, error: FieldError) => {
    setErrors((prev) => ({
      ...prev,
      [name as string]: error,
    }))
  }, [])

  const clearError = useCallback((name: keyof T) => {
    setErrors((prev) => {
      const next = { ...prev }
      delete next[name as string]
      return next
    })
  }, [])

  const clearErrors = useCallback(() => {
    setErrors({})
  }, [])

  const hasError = useCallback(
    (name: keyof T): boolean => {
      return !!errors[name as string]
    },
    [errors]
  )

  const getError = useCallback(
    (name: keyof T): string | undefined => {
      return errors[name as string]?.message
    },
    [errors]
  )

  const isValid = Object.keys(errors).length === 0

  return {
    errors,
    isValidating,
    isValid,
    validate,
    validateField,
    setError,
    clearError,
    clearErrors,
    hasError,
    getError,
  }
}

// Helper hook for form submission
export interface UseFormSubmitOptions<T> {
  onSubmit: (data: T) => Promise<void> | void
  onSuccess?: () => void
  onError?: (error: Error) => void
  validate?: (data: T) => Promise<ValidationResult>
}

export interface UseFormSubmitReturn {
  isSubmitting: boolean
  submitError: string | null
  handleSubmit: (e: React.FormEvent) => Promise<void>
  clearSubmitError: () => void
}

export function useFormSubmit<T>(
  getData: () => T,
  options: UseFormSubmitOptions<T>
): UseFormSubmitReturn {
  const { onSubmit, onSuccess, onError, validate } = options
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()
      setIsSubmitting(true)
      setSubmitError(null)

      try {
        const data = getData()

        // Validate if validation function provided
        if (validate) {
          const result = await validate(data)
          if (!result.isValid) {
            return
          }
        }

        await onSubmit(data)
        onSuccess?.()
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : 'An error occurred'
        setSubmitError(errorMessage)
        onError?.(error instanceof Error ? error : new Error(errorMessage))
      } finally {
        setIsSubmitting(false)
      }
    },
    [getData, onSubmit, onSuccess, onError, validate]
  )

  const clearSubmitError = useCallback(() => {
    setSubmitError(null)
  }, [])

  return {
    isSubmitting,
    submitError,
    handleSubmit,
    clearSubmitError,
  }
}
