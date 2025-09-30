/**
 * SkipLink Component
 *
 * Provides keyboard users a way to skip directly to main content,
 * bypassing repetitive navigation elements. Required for WCAG 2.1 AA compliance.
 *
 * The link is visually hidden until focused via keyboard navigation,
 * then appears at the top of the page.
 *
 * @example
 * <SkipLink href="#main-content">Skip to main content</SkipLink>
 */

import { cn } from '@/lib/utils'

export interface SkipLinkProps {
  href: string
  children: React.ReactNode
  className?: string
}

export function SkipLink({ href, children, className }: SkipLinkProps) {
  return (
    <a
      href={href}
      className={cn(
        // Screen reader only by default
        'sr-only-focusable',
        // Visible styling when focused
        'fixed top-4 left-4 z-[9999]',
        'bg-primary-600 text-white',
        'px-6 py-3 rounded-md',
        'text-sm font-medium',
        'shadow-lg',
        'focus:outline-none focus:ring-4 focus:ring-primary-300',
        'transition-all duration-200',
        className
      )}
    >
      {children}
    </a>
  )
}

/**
 * SkipLinks Component
 *
 * Container for multiple skip links. Place at the top of your layout.
 *
 * @example
 * <SkipLinks>
 *   <SkipLink href="#main-content">Skip to main content</SkipLink>
 *   <SkipLink href="#navigation">Skip to navigation</SkipLink>
 * </SkipLinks>
 */

export interface SkipLinksProps {
  children: React.ReactNode
  className?: string
}

export function SkipLinks({ children, className }: SkipLinksProps) {
  return (
    <div
      className={cn('flex flex-col gap-2', className)}
      role="navigation"
      aria-label="Skip links"
    >
      {children}
    </div>
  )
}

// Default export for convenience
export default SkipLink
