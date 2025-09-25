import { cn } from '@/lib/utils'
import { forwardRef } from 'react'

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'info'
  size?: 'sm' | 'md' | 'lg'
  dot?: boolean
  outline?: boolean
}

const Badge = forwardRef<HTMLDivElement, BadgeProps>(
  ({ className, variant = 'default', size = 'md', dot = false, outline = false, children, ...props }, ref) => {
    const baseClasses = 'inline-flex items-center font-medium rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2'

    const sizeClasses = {
      sm: 'px-2 py-0.5 text-xs',
      md: 'px-2.5 py-0.5 text-xs',
      lg: 'px-3 py-1 text-sm',
    }

    const variantClasses = {
      default: outline
        ? 'bg-transparent border border-neutral-300 text-neutral-700 hover:bg-neutral-50'
        : 'bg-neutral-100 text-neutral-800 hover:bg-neutral-200',
      primary: outline
        ? 'bg-transparent border border-primary-300 text-primary-700 hover:bg-primary-50'
        : 'bg-primary-100 text-primary-800 hover:bg-primary-200',
      secondary: outline
        ? 'bg-transparent border border-neutral-300 text-neutral-700 hover:bg-neutral-50'
        : 'bg-neutral-100 text-neutral-800 hover:bg-neutral-200',
      success: outline
        ? 'bg-transparent border border-success-300 text-success-700 hover:bg-success-50'
        : 'bg-success-100 text-success-800 hover:bg-success-200',
      warning: outline
        ? 'bg-transparent border border-warning-300 text-warning-700 hover:bg-warning-50'
        : 'bg-warning-100 text-warning-800 hover:bg-warning-200',
      error: outline
        ? 'bg-transparent border border-error-300 text-error-700 hover:bg-error-50'
        : 'bg-error-100 text-error-800 hover:bg-error-200',
      info: outline
        ? 'bg-transparent border border-info-300 text-info-700 hover:bg-info-50'
        : 'bg-info-100 text-info-800 hover:bg-info-200',
    }

    const dotColorClasses = {
      default: 'bg-neutral-500',
      primary: 'bg-primary-500',
      secondary: 'bg-neutral-500',
      success: 'bg-success-500',
      warning: 'bg-warning-500',
      error: 'bg-error-500',
      info: 'bg-info-500',
    }

    return (
      <div
        className={cn(
          baseClasses,
          sizeClasses[size],
          variantClasses[variant],
          className
        )}
        ref={ref}
        {...props}
      >
        {dot && (
          <div className={cn(
            'w-2 h-2 rounded-full mr-1.5',
            dotColorClasses[variant]
          )} />
        )}
        {children}
      </div>
    )
  }
)
Badge.displayName = 'Badge'

export { Badge }