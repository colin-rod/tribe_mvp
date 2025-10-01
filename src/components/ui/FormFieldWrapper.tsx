import { useId } from 'react'
import { cn } from '@/lib/utils'
import { FormFieldError, FormFieldHelper, FormFieldSuccess } from './FormFeedback'

interface FormFieldWrapperProps {
  label?: string
  children: React.ReactNode
  error?: string
  helperText?: string
  successMessage?: string
  required?: boolean
  optional?: boolean
  className?: string
  labelClassName?: string
  htmlFor?: string
  description?: string
}

export function FormFieldWrapper({
  label,
  children,
  error,
  helperText,
  successMessage,
  required = false,
  optional = false,
  className,
  labelClassName,
  htmlFor,
  description,
}: FormFieldWrapperProps) {
  const generatedId = useId()
  const fieldId = htmlFor || generatedId
  const helperId = helperText ? `${fieldId}-helper` : undefined
  const errorId = error ? `${fieldId}-error` : undefined
  const successId = successMessage ? `${fieldId}-success` : undefined

  return (
    <div className={cn('space-y-2', className)}>
      {label && (
        <div>
          <label
            htmlFor={fieldId}
            className={cn(
              'block text-sm font-medium text-neutral-900',
              labelClassName
            )}
          >
            {label}
            {required && (
              <>
                <span className="text-error-500 ml-1" aria-hidden="true">*</span>
                <span className="sr-only"> (required)</span>
              </>
            )}
            {optional && !required && (
              <span className="text-neutral-500 text-sm font-normal ml-2">
                (optional)
              </span>
            )}
          </label>
          {description && (
            <p className="mt-1 text-sm text-neutral-600">
              {description}
            </p>
          )}
        </div>
      )}

      <div>
        {children}
      </div>

      {/* Show success message if present (takes priority over helper text) */}
      {successMessage && !error && (
        <FormFieldSuccess message={successMessage} id={successId} />
      )}

      {/* Show error if present */}
      {error && (
        <FormFieldError message={error} id={errorId} />
      )}

      {/* Show helper text only if no error or success message */}
      {helperText && !error && !successMessage && (
        <FormFieldHelper message={helperText} id={helperId} />
      )}
    </div>
  )
}
