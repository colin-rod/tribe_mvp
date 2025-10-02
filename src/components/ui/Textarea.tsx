import { cn } from '@/lib/utils'
import { forwardRef, useId } from 'react'

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  variant?: 'default' | 'error' | 'success'
  label?: string
  helperText?: string
  errorMessage?: string
  resize?: 'none' | 'vertical' | 'horizontal' | 'both'
  showCharCount?: boolean
  maxLength?: number
  /** Description text for additional context */
  description?: string
}

const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({
    className,
    variant = 'default',
    label,
    helperText,
    errorMessage,
    resize = 'vertical',
    showCharCount = false,
    maxLength,
    disabled,
    value,
    description,
    id,
    ...props
  }, ref) => {
    // Generate unique IDs for accessibility associations
    const generatedId = useId()
    const textareaId = id || generatedId
    const helperId = `${textareaId}-helper`
    const errorId = `${textareaId}-error`
    const descriptionId = `${textareaId}-description`

    const isError = variant === 'error' || !!errorMessage
    const isSuccess = variant === 'success'

    const baseClasses = 'flex min-h-[80px] w-full rounded-md border px-3 py-2 text-sm transition-colors duration-200 placeholder:text-neutral-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-50'

    const variantClasses = {
      default: 'border-neutral-300 bg-white focus-visible:ring-primary-500',
      error: 'border-error-300 bg-error-50 focus-visible:ring-error-500 text-error-900',
      success: 'border-success-300 bg-success-50 focus-visible:ring-success-500 text-success-900',
    }

    const resizeClasses = {
      none: 'resize-none',
      vertical: 'resize-y',
      horizontal: 'resize-x',
      both: 'resize',
    }

    const currentVariant = isError ? 'error' : isSuccess ? 'success' : 'default'
    const currentLength = typeof value === 'string' ? value.length : 0

    // Build comprehensive aria-describedby string
    const ariaDescribedBy = [
      errorMessage ? errorId : null,
      description ? descriptionId : null,
      helperText ? helperId : null,
    ].filter(Boolean).join(' ') || undefined

    return (
      <div className="w-full">
        {label && (
          <div className="mb-2">
            <label
              htmlFor={textareaId}
              className={cn(
                'block text-sm font-medium text-neutral-700',
                disabled && 'opacity-50'
              )}
            >
              {label}
              {props.required && (
                <>
                  <span className="text-error-500 ml-1" aria-hidden="true">*</span>
                  <span className="sr-only"> (required)</span>
                </>
              )}
            </label>
            {description && (
              <p
                id={descriptionId}
                className="mt-1 text-sm text-neutral-600"
              >
                {description}
              </p>
            )}
          </div>
        )}

        <div className="relative">
          <textarea
            id={textareaId}
            className={cn(
              baseClasses,
              variantClasses[currentVariant],
              resizeClasses[resize],
              className
            )}
            ref={ref}
            disabled={disabled}
            maxLength={maxLength}
            aria-invalid={isError}
            aria-describedby={ariaDescribedBy}
            aria-required={props.required}
            value={value}
            {...props}
          />
        </div>

        <div className="flex items-center justify-between mt-2">
          <div className="flex-1">
            {errorMessage && (
              <p
                className="text-sm text-error-600 flex items-start gap-1"
                id={errorId}
                role="alert"
                aria-live="polite"
              >
                {errorMessage}
              </p>
            )}
            {helperText && !errorMessage && (
              <p
                className="text-sm text-neutral-500"
                id={helperId}
              >
                {helperText}
              </p>
            )}
          </div>

          {showCharCount && maxLength && (
            <div
              className={cn(
                'text-xs ml-2 flex-shrink-0',
                currentLength > maxLength * 0.9 ? 'text-warning-600' :
                currentLength === maxLength ? 'text-error-600' : 'text-neutral-500'
              )}
              aria-label={`${currentLength} of ${maxLength} characters used`}
            >
              {currentLength}/{maxLength}
            </div>
          )}
        </div>
      </div>
    )
  }
)
Textarea.displayName = 'Textarea'

export { Textarea }