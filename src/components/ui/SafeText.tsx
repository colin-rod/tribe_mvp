'use client'

import { memo, useMemo, createElement } from 'react'
import { sanitizeText } from '@/lib/utils/sanitization'
import { cn } from '@/lib/utils'

interface SafeTextProps {
  /** Text content to sanitize and render */
  text: string
  /** Element type to render */
  as?: keyof React.JSX.IntrinsicElements
  /** Additional CSS classes */
  className?: string
  /** Whether to preserve whitespace and line breaks */
  preserveWhitespace?: boolean
  /** Maximum length before truncation */
  maxLength?: number
  /** Accessible label for screen readers */
  'aria-label'?: string
}

/**
 * SafeText - A secure component for rendering user-generated text content
 *
 * This component:
 * - Sanitizes text to remove control characters
 * - Escapes HTML entities to prevent XSS
 * - Removes script-like patterns
 * - Preserves readability (newlines, tabs)
 * - Optionally truncates long content
 *
 * Usage:
 * ```tsx
 * <SafeText text={userName} />
 * <SafeText text={userComment} preserveWhitespace />
 * ```
 *
 * @example
 * // Basic usage
 * <SafeText text={user.name} />
 *
 * @example
 * // With whitespace preservation
 * <SafeText
 *   text={userComment}
 *   preserveWhitespace
 *   className="text-gray-700"
 * />
 *
 * @example
 * // With truncation
 * <SafeText
 *   text={longDescription}
 *   maxLength={200}
 *   as="p"
 * />
 */
const SafeText = memo<SafeTextProps>(function SafeText({
  text,
  as: Component = 'span',
  className,
  preserveWhitespace = false,
  maxLength,
  'aria-label': ariaLabel
}) {
  // Memoize sanitization and processing
  const processedText = useMemo(() => {
    if (!text) return ''

    // Sanitize the text
    let sanitized = sanitizeText(text)

    // Truncate if maxLength is specified
    if (maxLength && sanitized.length > maxLength) {
      sanitized = sanitized.substring(0, maxLength) + '...'
    }

    return sanitized
  }, [text, maxLength])

  // Don't render if content is empty after processing
  if (!processedText) {
    return null
  }

  return createElement(Component, {
    className: cn(
      preserveWhitespace && 'whitespace-pre-wrap',
      className
    ),
    'aria-label': ariaLabel
  }, processedText)
})

SafeText.displayName = 'SafeText'

export default SafeText
