import { cn } from '@/lib/utils'
import { forwardRef } from 'react'

export interface AlertProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'info' | 'success' | 'warning' | 'error'
  title?: string
  icon?: React.ReactNode
  dismissible?: boolean
  onDismiss?: () => void
}

const Alert = forwardRef<HTMLDivElement, AlertProps>(
  ({ className, variant = 'default', title, icon, dismissible = false, onDismiss, children, ...props }, ref) => {
    const baseClasses = 'relative p-4 rounded-lg border-l-4 transition-all duration-200'

    const variantClasses = {
      default: 'bg-neutral-50 border-neutral-400 text-neutral-700',
      info: 'bg-info-50 border-info-400 text-info-700',
      success: 'bg-success-50 border-success-400 text-success-700',
      warning: 'bg-warning-50 border-warning-400 text-warning-700',
      error: 'bg-error-50 border-error-400 text-error-700',
    }

    const iconColors = {
      default: 'text-neutral-500',
      info: 'text-info-500',
      success: 'text-success-500',
      warning: 'text-warning-500',
      error: 'text-error-500',
    }

    const defaultIcons = {
      default: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      info: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      success: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      warning: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      ),
      error: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    }

    const displayIcon = icon !== null ? (icon || defaultIcons[variant]) : null

    return (
      <div
        className={cn(
          baseClasses,
          variantClasses[variant],
          className
        )}
        ref={ref}
        role="alert"
        {...props}
      >
        <div className="flex">
          {displayIcon && (
            <div className={cn('flex-shrink-0 mr-3', iconColors[variant])}>
              {displayIcon}
            </div>
          )}

          <div className="flex-1">
            {title && (
              <h4 className="text-sm font-medium mb-1">
                {title}
              </h4>
            )}

            <div className="text-sm">
              {children}
            </div>
          </div>

          {dismissible && (
            <button
              onClick={onDismiss}
              className={cn(
                'flex-shrink-0 ml-3 transition-colors duration-200 hover:opacity-70',
                iconColors[variant]
              )}
              aria-label="Dismiss alert"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </div>
    )
  }
)
Alert.displayName = 'Alert'

export { Alert }