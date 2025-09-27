'use client'

import React from 'react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/Button'
import {
  ExclamationTriangleIcon,
  ArrowPathIcon,
  BugAntIcon,
  HomeIcon
} from '@heroicons/react/24/outline'
import { createLogger } from '@/lib/logger'

const logger = createLogger('ErrorBoundary')

interface ErrorBoundaryProps {
  children: React.ReactNode
  fallback?: React.ComponentType<ErrorFallbackProps>
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void
  isolate?: boolean
  className?: string
}

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
  errorId: string
}

interface ErrorFallbackProps {
  error: Error | null
  errorId: string
  retry: () => void
  isolate?: boolean
  className?: string
}

/**
 * Default error fallback component with user-friendly messaging
 */
const DefaultErrorFallback: React.FC<ErrorFallbackProps> = ({
  error,
  errorId,
  retry,
  isolate = false,
  className
}) => {
  const isDev = process.env.NODE_ENV === 'development'

  const handleReportError = () => {
    // In a real app, this would send error reports to your error tracking service
    logger.info('Error reported', { errorId, error })

    // You could integrate with services like Sentry, LogRocket, etc.
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('event', 'exception', {
        event_category: 'error',
        event_label: error?.message || 'Unknown error',
        custom_parameter: errorId
      })
    }
  }

  const handleGoHome = () => {
    window.location.href = '/'
  }

  return (
    <div className={cn(
      'flex flex-col items-center justify-center',
      isolate ? 'p-8 bg-red-50 border border-red-200 rounded-lg' : 'min-h-[400px] p-12',
      className
    )}>
      {/* Error icon */}
      <div className={cn(
        'rounded-full flex items-center justify-center mb-6',
        isolate ? 'w-12 h-12 bg-red-100' : 'w-16 h-16 bg-red-100'
      )}>
        <ExclamationTriangleIcon className={cn(
          'text-red-600',
          isolate ? 'w-6 h-6' : 'w-8 h-8'
        )} />
      </div>

      {/* Error message */}
      <div className="text-center max-w-md mx-auto mb-8">
        <h2 className={cn(
          'font-semibold text-neutral-900 mb-3',
          isolate ? 'text-lg' : 'text-xl'
        )}>
          {isolate ? 'Something went wrong here' : 'Oops! Something went wrong'}
        </h2>

        <p className={cn(
          'text-neutral-600 leading-relaxed',
          isolate ? 'text-sm' : 'text-base'
        )}>
          {isolate
            ? 'This section encountered an error. You can try refreshing this part or continue using the rest of the app.'
            : 'We encountered an unexpected error. Don\'t worry, your data is safe. Please try refreshing the page.'
          }
        </p>

        {/* Error details for development */}
        {isDev && error && (
          <details className="mt-4 text-left">
            <summary className="cursor-pointer text-sm font-medium text-red-700 hover:text-red-800">
              Technical Details (Development Mode)
            </summary>
            <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-xs font-mono text-red-800 whitespace-pre-wrap">
                {error.message}
              </p>
              {error.stack && (
                <details className="mt-2">
                  <summary className="text-xs text-red-700 cursor-pointer">
                    Stack Trace
                  </summary>
                  <pre className="mt-1 text-xs text-red-700 whitespace-pre-wrap overflow-x-auto">
                    {error.stack}
                  </pre>
                </details>
              )}
            </div>
          </details>
        )}
      </div>

      {/* Action buttons */}
      <div className="flex flex-col sm:flex-row gap-3">
        <Button
          onClick={retry}
          className="flex items-center space-x-2"
          size={isolate ? 'sm' : 'default'}
        >
          <ArrowPathIcon className="w-4 h-4" />
          <span>Try again</span>
        </Button>

        {!isolate && (
          <>
            <Button
              variant="outline"
              onClick={handleGoHome}
              className="flex items-center space-x-2"
            >
              <HomeIcon className="w-4 h-4" />
              <span>Go home</span>
            </Button>

            <Button
              variant="ghost"
              onClick={handleReportError}
              size="sm"
              className="flex items-center space-x-2 text-neutral-600"
            >
              <BugAntIcon className="w-4 h-4" />
              <span>Report issue</span>
            </Button>
          </>
        )}
      </div>

      {/* Error ID for support */}
      <div className="mt-6 text-xs text-neutral-400">
        Error ID: {errorId}
      </div>
    </div>
  )
}

/**
 * Enhanced error boundary with retry capability and error reporting
 */
export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  private retryCount = 0
  private readonly maxRetries = 3

  constructor(props: ErrorBoundaryProps) {
    super(props)

    this.state = {
      hasError: false,
      error: null,
      errorId: ''
    }
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    // Generate a unique error ID for tracking
    const errorId = `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    return {
      hasError: true,
      error,
      errorId
    }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log error details
    logger.error('Error Boundary caught an error', {
      error,
      errorInfo,
      errorId: this.state.errorId,
      retryCount: this.retryCount
    })

    // Call the optional error handler
    if (this.props.onError) {
      this.props.onError(error, errorInfo)
    }

    // Report to error tracking service in production
    if (process.env.NODE_ENV === 'production') {
      // You would integrate with your error tracking service here
      // e.g., Sentry.captureException(error, { extra: errorInfo })
    }
  }

  retry = () => {
    if (this.retryCount < this.maxRetries) {
      this.retryCount++
      this.setState({
        hasError: false,
        error: null,
        errorId: ''
      })
    } else {
      // Max retries reached, force page reload
      window.location.reload()
    }
  }

  render() {
    if (this.state.hasError) {
      const FallbackComponent = this.props.fallback || DefaultErrorFallback

      return (
        <FallbackComponent
          error={this.state.error}
          errorId={this.state.errorId}
          retry={this.retry}
          isolate={this.props.isolate}
          className={this.props.className}
        />
      )
    }

    return this.props.children
  }
}

/**
 * Hook version of error boundary for functional components
 */
export const useErrorHandler = () => {
  const [error, setError] = React.useState<Error | null>(null)

  const resetError = React.useCallback(() => {
    setError(null)
  }, [])

  const captureError = React.useCallback((error: Error) => {
    logger.error('Error captured', { error })
    setError(error)
  }, [])

  React.useEffect(() => {
    if (error) {
      throw error
    }
  }, [error])

  return { captureError, resetError }
}

/**
 * HOC for wrapping components with error boundary
 */
export const withErrorBoundary = <P extends object>(
  Component: React.ComponentType<P>,
  errorBoundaryProps?: Omit<ErrorBoundaryProps, 'children'>
) => {
  const WrappedComponent = React.forwardRef<unknown, P>((props, ref) => {
    const componentProps = ref ? { ...props, ref } : props
    return (
      <ErrorBoundary {...errorBoundaryProps}>
        <Component {...componentProps as P} />
      </ErrorBoundary>
    )
  })

  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`

  return WrappedComponent
}

export default ErrorBoundary
