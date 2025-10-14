import Link, { type LinkProps } from 'next/link'
import { cn } from '@/lib/utils'
import { forwardRef } from 'react'
import type {
  AnchorHTMLAttributes,
  ButtonHTMLAttributes,
  ReactNode,
} from 'react'

type ButtonVariant =
  | 'default'
  | 'primary'
  | 'destructive'
  | 'outline'
  | 'secondary'
  | 'ghost'
  | 'link'
  | 'success'
  | 'warning'
  | 'tertiary'
  | 'destructiveOutline'

type ButtonSize = 'xs' | 'sm' | 'default' | 'lg' | 'xl' | 'icon'

interface BaseButtonProps {
  variant?: ButtonVariant
  size?: ButtonSize
  leftIcon?: ReactNode
  rightIcon?: ReactNode
}

const baseClasses =
  'inline-flex flex-row items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 relative overflow-hidden'

const variantClasses: Record<ButtonVariant, string> = {
  default:
    'bg-primary-500 text-white shadow-md hover:bg-primary-600 active:bg-primary-700 hover:shadow-lg',
  primary:
    'bg-primary-500 text-white shadow-md hover:bg-primary-600 active:bg-primary-700 hover:shadow-lg',
  destructive:
    'bg-error-500 text-white shadow-md hover:bg-error-600 active:bg-error-700 hover:shadow-lg',
  outline:
    'border border-primary-300 bg-transparent text-primary-600 hover:bg-primary-50 hover:border-primary-400 active:bg-primary-100',
  secondary:
    'bg-neutral-100 text-neutral-900 border border-neutral-200 hover:bg-neutral-200 active:bg-neutral-300',
  ghost: 'bg-transparent text-neutral-700 hover:bg-neutral-100 active:bg-neutral-200',
  link: 'text-primary-600 underline-offset-4 hover:underline hover:text-primary-700 shadow-none',
  success:
    'bg-success-500 text-white shadow-md hover:bg-success-600 active:bg-success-700 hover:shadow-lg',
  warning:
    'bg-warning-500 text-white shadow-md hover:bg-warning-600 active:bg-warning-700 hover:shadow-lg',
  tertiary: 'bg-transparent text-neutral-700 border border-neutral-200 hover:bg-neutral-50',
  destructiveOutline:
    'bg-transparent text-error-600 border border-error-300 hover:bg-error-50',
}

const sizeClasses: Record<ButtonSize, string> = {
  xs: 'h-11 px-3 text-xs', // WCAG 2.1 AA: Minimum 44px (11*4 = 44px) touch target
  sm: 'h-11 px-4 text-sm', // WCAG 2.1 AA: Minimum 44px touch target
  default: 'h-11 px-4 py-2', // WCAG 2.1 AA compliant
  lg: 'h-12 px-6 text-base',
  xl: 'h-14 px-8 text-lg',
  icon: 'h-11 w-11', // WCAG 2.1 AA: Minimum 44px (11*4 = 44px) touch target
}

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    BaseButtonProps {
  loading?: boolean
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = 'default',
      size = 'default',
      loading = false,
      leftIcon,
      rightIcon,
      children,
      disabled,
      ...props
    },
    ref
  ) => {
    const isDisabled = disabled || loading

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
        aria-busy={loading}
        {...props}
      >
        {loading && (
          <>
            <svg
              className={cn(
                'animate-spin flex-shrink-0',
                size === 'xs' || size === 'sm' ? 'h-3 w-3' : 'h-4 w-4'
              )}
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              aria-hidden="true"
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
            <span className="sr-only">Loading...</span>
          </>
        )}
        {!loading && leftIcon && (
          <span className="inline-flex items-center justify-center flex-shrink-0 pr-2">
            {leftIcon}
          </span>
        )}
        <span className={cn('inline-flex items-center', loading && 'opacity-70')}>
          {children}
        </span>
        {!loading && rightIcon && (
          <span className="inline-flex items-center justify-center flex-shrink-0 pl-2">
            {rightIcon}
          </span>
        )}
      </button>
    )
  }
)
Button.displayName = 'Button'

type AnchorProps = Omit<
  AnchorHTMLAttributes<HTMLAnchorElement>,
  keyof LinkProps
>

export interface ButtonLinkProps
  extends LinkProps,
    AnchorProps,
    BaseButtonProps {}

const ButtonLink = forwardRef<HTMLAnchorElement, ButtonLinkProps>(
  (
    { className, variant = 'default', size = 'default', leftIcon, rightIcon, children, ...props },
    ref
  ) => (
    <Link
      ref={ref}
      className={cn(
        baseClasses,
        variantClasses[variant],
        sizeClasses[size],
        className
      )}
      {...props}
    >
      {leftIcon && (
        <span className="inline-flex items-center justify-center flex-shrink-0 pr-2">
          {leftIcon}
        </span>
      )}
      <span className="inline-flex items-center">{children}</span>
      {rightIcon && (
        <span className="inline-flex items-center justify-center flex-shrink-0 pl-2">
          {rightIcon}
        </span>
      )}
    </Link>
  )
)
ButtonLink.displayName = 'ButtonLink'

export { Button, ButtonLink }
