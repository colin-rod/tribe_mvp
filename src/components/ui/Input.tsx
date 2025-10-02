import { cn } from '@/lib/utils'
import { forwardRef, useState, useId } from 'react'

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  variant?: 'default' | 'error' | 'success'
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
  label?: string
  helperText?: string
  errorMessage?: string
  showPassword?: boolean
  /** Description text for additional context */
  description?: string
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({
    className,
    type,
    variant = 'default',
    leftIcon,
    rightIcon,
    label,
    helperText,
    errorMessage,
    showPassword,
    disabled,
    id,
    description,
    ...props
  }, ref) => {
    const [isPasswordVisible, setIsPasswordVisible] = useState(false)
    // Generate unique IDs for accessibility associations
    const generatedId = useId()
    const inputId = id || generatedId
    const helperId = `${inputId}-helper`
    const errorId = `${inputId}-error`
    const descriptionId = `${inputId}-description`

    const isError = variant === 'error' || !!errorMessage
    const isSuccess = variant === 'success'
    const isPassword = type === 'password'
    const inputType = isPassword && showPassword && isPasswordVisible ? 'text' : type

    const baseClasses = 'flex h-11 w-full rounded-md border px-3 py-2 text-sm transition-colors duration-200 file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-neutral-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-50 min-touch-target'

    const variantClasses = {
      default: 'border-neutral-300 bg-white focus-visible:ring-primary-500',
      error: 'border-error-300 bg-error-50 focus-visible:ring-error-500 text-error-900',
      success: 'border-success-300 bg-success-50 focus-visible:ring-success-500 text-success-900',
    }

    const currentVariant = isError ? 'error' : isSuccess ? 'success' : 'default'

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
              htmlFor={inputId}
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
          {leftIcon && (
            <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-neutral-400 pointer-events-none">
              {leftIcon}
            </div>
          )}

          <input
            type={inputType}
            id={inputId}
            className={cn(
              baseClasses,
              variantClasses[currentVariant],
              leftIcon && 'pl-10',
              (rightIcon || (isPassword && showPassword)) && 'pr-14',
              className
            )}
            ref={ref}
            disabled={disabled}
            onFocus={(e) => {
              props.onFocus?.(e)
            }}
            onBlur={(e) => {
              props.onBlur?.(e)
            }}
            aria-invalid={isError}
            aria-describedby={ariaDescribedBy}
            aria-required={props.required}
            {...props}
          />

          {(rightIcon || (isPassword && showPassword)) && (
            <div className="absolute right-1 top-1/2 transform -translate-y-1/2">
              {isPassword && showPassword ? (
                <button
                  type="button"
                  className="text-neutral-400 hover:text-neutral-600 transition-colors min-touch-target p-2 rounded-md hover:bg-neutral-50 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-1"
                  onClick={() => setIsPasswordVisible(!isPasswordVisible)}
                  tabIndex={-1}
                  aria-label={isPasswordVisible ? 'Hide password' : 'Show password'}
                >
                  {isPasswordVisible ? (
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L6.5 6.5m3.378 3.378a3 3 0 004.243-4.242M12 3c.974 0 1.913.178 2.786.51" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3l18 18" />
                    </svg>
                  ) : (
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              ) : rightIcon ? (
                <div className="text-neutral-400 pr-2">
                  {rightIcon}
                </div>
              ) : null}
            </div>
          )}
        </div>

        {errorMessage && (
          <p
            className="mt-2 text-sm text-error-600"
            id={errorId}
            role="alert"
            aria-live="polite"
          >
            {errorMessage}
          </p>
        )}
        {helperText && !errorMessage && (
          <p
            className="mt-2 text-sm text-neutral-500"
            id={helperId}
          >
            {helperText}
          </p>
        )}
      </div>
    )
  }
)
Input.displayName = 'Input'

export { Input }
