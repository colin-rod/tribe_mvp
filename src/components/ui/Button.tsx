import { cn } from '@/lib/utils'
import { forwardRef } from 'react'

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'primary' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link' | 'success' | 'warning'
  size?: 'xs' | 'sm' | 'default' | 'lg' | 'xl' | 'icon'
  loading?: boolean
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'default', size = 'default', loading = false, leftIcon, rightIcon, children, disabled, ...props }, ref) => {
    const isDisabled = disabled || loading

    const baseClasses = 'inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 relative overflow-hidden'

    const variantClasses = {
      default: 'bg-primary-500 text-white shadow-md hover:bg-primary-600 active:bg-primary-700 hover:shadow-lg',
      primary: 'bg-primary-500 text-white shadow-md hover:bg-primary-600 active:bg-primary-700 hover:shadow-lg',
      destructive: 'bg-error-500 text-white shadow-md hover:bg-error-600 active:bg-error-700 hover:shadow-lg',
      outline: 'border border-primary-300 bg-transparent text-primary-600 hover:bg-primary-50 hover:border-primary-400 active:bg-primary-100',
      secondary: 'bg-neutral-100 text-neutral-900 border border-neutral-200 hover:bg-neutral-200 active:bg-neutral-300',
      ghost: 'bg-transparent text-neutral-700 hover:bg-neutral-100 active:bg-neutral-200',
      link: 'text-primary-600 underline-offset-4 hover:underline hover:text-primary-700 shadow-none',
      success: 'bg-success-500 text-white shadow-md hover:bg-success-600 active:bg-success-700 hover:shadow-lg',
      warning: 'bg-warning-500 text-white shadow-md hover:bg-warning-600 active:bg-warning-700 hover:shadow-lg',
    }

    const sizeClasses = {
      xs: 'h-6 px-2 text-xs',
      sm: 'h-8 px-3 text-sm',
      default: 'h-10 px-4 py-2',
      lg: 'h-12 px-6 text-base',
      xl: 'h-14 px-8 text-lg',
      icon: 'h-10 w-10',
    }

    return (
      <button
        className={cn(
          baseClasses,
          variantClasses[variant],
          sizeClasses[size],
          className
        )}
        ref={ref}
        disabled={isDisabled}
        aria-disabled={isDisabled}
        {...props}
      >
        {loading && (
          <svg
            className={cn(
              'animate-spin mr-2 flex-shrink-0',
              size === 'xs' || size === 'sm' ? 'h-3 w-3' : 'h-4 w-4'
            )}
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        )}
        {!loading && leftIcon && (
          <span className="mr-2 flex-shrink-0">{leftIcon}</span>
        )}
        <span className={cn('flex-1', loading && 'opacity-70')}>
          {children}
        </span>
        {!loading && rightIcon && (
          <span className="ml-2 flex-shrink-0">{rightIcon}</span>
        )}
      </button>
    )
  }
)
Button.displayName = 'Button'

export { Button }