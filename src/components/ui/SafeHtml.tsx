'use client'

import { memo, useMemo, createElement } from 'react'
import { sanitizeHtml } from '@/lib/utils/sanitization'
import { cn } from '@/lib/utils'

interface SafeHtmlProps {
  /** HTML content to sanitize and render */
  html: string
  /** Element type to render */
  as?: keyof React.JSX.IntrinsicElements
  /** Additional CSS classes */
  className?: string
  /** Accessible label for screen readers */
  'aria-label'?: string
  /** Whether to apply prose styling for rich text */
  prose?: boolean
}

/**
 * SafeHtml - A secure component for rendering user-generated HTML content
 *
 * This component:
 * - Sanitizes HTML using DOMPurify to prevent XSS attacks
 * - Removes dangerous tags (script, iframe, etc.)
 * - Strips malicious attributes (onclick, onerror, etc.)
 * - Allows only safe URL schemes (http, https, mailto)
 * - Provides semantic HTML structure
 *
 * Usage:
 * ```tsx
 * <SafeHtml html={userContent} prose />
 * ```
 *
 * @example
 * // Basic usage
 * <SafeHtml html="<p>Hello <strong>world</strong></p>" />
 *
 * @example
 * // With prose styling
 * <SafeHtml
 *   html={richContent}
 *   prose
 *   className="my-4"
 * />
 *
 * @example
 * // As a specific element
 * <SafeHtml
 *   html={content}
 *   as="article"
 *   aria-label="User comment"
 * />
 */
const SafeHtml = memo<SafeHtmlProps>(function SafeHtml({
  html,
  as: Component = 'div',
  className,
  'aria-label': ariaLabel,
  prose = false
}) {
  // Memoize sanitization to avoid re-running on every render
  const sanitizedHtml = useMemo(() => {
    if (!html) return ''
    return sanitizeHtml(html)
  }, [html])

  // Don't render if content is empty after sanitization
  if (!sanitizedHtml) {
    return null
  }

  return createElement(Component, {
    className: cn(
      prose && 'prose prose-sm max-w-none',
      className
    ),
    dangerouslySetInnerHTML: { __html: sanitizedHtml },
    'aria-label': ariaLabel
  })
})

SafeHtml.displayName = 'SafeHtml'

export default SafeHtml
