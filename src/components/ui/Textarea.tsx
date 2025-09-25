import { cn } from '@/lib/utils'
import { forwardRef } from 'react'

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  variant?: 'default' | 'error' | 'success'
  label?: string
  helperText?: string
  errorMessage?: string
  resize?: 'none' | 'vertical' | 'horizontal' | 'both'
  showCharCount?: boolean
  maxLength?: number
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
    ...props
  }, ref) => {
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

    return (
      <div className="w-full">
        {label && (
          <label className={cn(
            'block text-sm font-medium text-neutral-700 mb-2',
            disabled && 'opacity-50'
          )}>
            {label}
            {props.required && <span className="text-error-500 ml-1">*</span>}
          </label>
        )}

        <div className="relative">
          <textarea
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
            aria-describedby={
              errorMessage ? `${props.id}-error` :
              helperText ? `${props.id}-helper` : undefined
            }
            value={value}
            {...props}
          />
        </div>

        <div className="flex items-center justify-between mt-2">
          <div>
            {(helperText || errorMessage) && (
              <p
                className={cn(
                  'text-sm',
                  isError ? 'text-error-600' : 'text-neutral-500'
                )}
                id={errorMessage ? `${props.id}-error` : `${props.id}-helper`}
              >
                {errorMessage || helperText}
              </p>
            )}
          </div>

          {showCharCount && maxLength && (
            <div className={cn(
              'text-xs',
              currentLength > maxLength * 0.9 ? 'text-warning-600' :
              currentLength === maxLength ? 'text-error-600' : 'text-neutral-500'
            )}>
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