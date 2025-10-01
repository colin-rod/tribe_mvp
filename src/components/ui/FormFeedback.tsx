import { cn } from '@/lib/utils'
import {
  CheckCircleIcon,
  ExclamationCircleIcon,
  InformationCircleIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline'

export type FeedbackType = 'error' | 'success' | 'warning' | 'info'

interface FormFeedbackProps {
  type: FeedbackType
  message: string
  title?: string
  className?: string
  dismissible?: boolean
  onDismiss?: () => void
  actions?: React.ReactNode
}

const feedbackStyles = {
  error: {
    container: 'bg-error-50 border-error-200 text-error-900',
    icon: 'text-error-400',
    title: 'text-error-900',
    message: 'text-error-700',
    Icon: ExclamationCircleIcon,
  },
  success: {
    container: 'bg-success-50 border-success-200 text-success-900',
    icon: 'text-success-400',
    title: 'text-success-900',
    message: 'text-success-700',
    Icon: CheckCircleIcon,
  },
  warning: {
    container: 'bg-warning-50 border-warning-200 text-warning-900',
    icon: 'text-warning-400',
    title: 'text-warning-900',
    message: 'text-warning-700',
    Icon: ExclamationTriangleIcon,
  },
  info: {
    container: 'bg-info-50 border-info-200 text-info-900',
    icon: 'text-info-400',
    title: 'text-info-900',
    message: 'text-info-700',
    Icon: InformationCircleIcon,
  },
}

export function FormFeedback({
  type,
  message,
  title,
  className,
  dismissible = false,
  onDismiss,
  actions,
}: FormFeedbackProps) {
  const styles = feedbackStyles[type]
  const Icon = styles.Icon

  return (
    <div
      className={cn(
        'rounded-lg border p-4',
        styles.container,
        className
      )}
      role="alert"
      aria-live={type === 'error' ? 'assertive' : 'polite'}
    >
      <div className="flex">
        <div className="flex-shrink-0">
          <Icon className={cn('h-5 w-5', styles.icon)} aria-hidden="true" />
        </div>
        <div className="ml-3 flex-1">
          {title && (
            <h3 className={cn('text-sm font-medium mb-1', styles.title)}>
              {title}
            </h3>
          )}
          <div className={cn('text-sm', styles.message)}>
            {message}
          </div>
          {actions && (
            <div className="mt-3">
              {actions}
            </div>
          )}
        </div>
        {dismissible && onDismiss && (
          <div className="ml-auto pl-3">
            <button
              type="button"
              onClick={onDismiss}
              className={cn(
                'inline-flex rounded-md p-1.5 focus:outline-none focus:ring-2 focus:ring-offset-2 min-touch-target',
                styles.icon,
                'hover:bg-black/5'
              )}
              aria-label="Dismiss"
            >
              <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
              </svg>
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

interface FormFieldErrorProps {
  message?: string
  id?: string
}

export function FormFieldError({ message, id }: FormFieldErrorProps) {
  if (!message) return null

  return (
    <p
      className="mt-2 text-sm text-error-600 flex items-start gap-1"
      id={id}
      role="alert"
    >
      <ExclamationCircleIcon className="h-4 w-4 mt-0.5 flex-shrink-0" aria-hidden="true" />
      <span>{message}</span>
    </p>
  )
}

interface FormFieldHelperProps {
  message: string
  id?: string
}

export function FormFieldHelper({ message, id }: FormFieldHelperProps) {
  return (
    <p className="mt-2 text-sm text-neutral-500" id={id}>
      {message}
    </p>
  )
}

interface FormFieldSuccessProps {
  message: string
  id?: string
}

export function FormFieldSuccess({ message, id }: FormFieldSuccessProps) {
  return (
    <p
      className="mt-2 text-sm text-success-600 flex items-start gap-1"
      id={id}
      role="status"
    >
      <CheckCircleIcon className="h-4 w-4 mt-0.5 flex-shrink-0" aria-hidden="true" />
      <span>{message}</span>
    </p>
  )
}
