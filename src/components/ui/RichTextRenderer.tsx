'use client'

import { memo } from 'react'
import { cn } from '@/lib/utils'
import type { ContentFormat } from '@/lib/validation/update'
import { extractPlainText, getContentFormatDisplayLabel, getContentFormatColorClass } from '@/lib/utils/update-formatting'
import SafeHtml from '@/components/ui/SafeHtml'
import SafeText from '@/components/ui/SafeText'

interface RichTextRendererProps {
  /** Main content text (fallback for all formats) */
  content: string
  /** Optional subject line (primarily for email format) */
  subject?: string
  /** Rich content data stored as JSONB */
  richContent?: Record<string, unknown>
  /** Content format indicating how to render the content */
  contentFormat?: ContentFormat
  /** Whether to show subject as a separate header */
  showSubject?: boolean
  /** Whether to show content format indicator */
  showFormatIndicator?: boolean
  /** Preview mode - shows truncated content */
  preview?: boolean
  /** Maximum length for preview mode */
  previewLength?: number
  /** Additional CSS classes */
  className?: string
}

/**
 * RichTextRenderer - A reusable component for rendering different content formats
 *
 * Handles:
 * - Plain text content (existing behavior)
 * - Rich text from JSONB (HTML format with basic styling)
 * - Email format with subject display (subject as title/header)
 * - Fallback handling for all content types
 */
const RichTextRenderer = memo<RichTextRendererProps>(function RichTextRenderer({
  content,
  subject,
  richContent,
  contentFormat = 'plain',
  showSubject = true,
  showFormatIndicator = false,
  preview = false,
  previewLength = 150,
  className
}) {
  // Extract plain text for preview mode or fallback
  const plainText = extractPlainText(content, richContent, contentFormat)

  // Determine if we should show the subject
  const hasSubject = showSubject && subject && contentFormat === 'email'

  // Handle preview mode
  if (preview) {
    const previewText = plainText.length > previewLength
      ? plainText.substring(0, previewLength) + '...'
      : plainText

    return (
      <div className={cn('space-y-2', className)}>
        {hasSubject && (
          <div className="font-semibold text-gray-900 line-clamp-1">
            {subject}
          </div>
        )}
        <div className="text-gray-700 line-clamp-3">
          {previewText}
        </div>
        {showFormatIndicator && contentFormat !== 'plain' && (
          <span className={cn(
            'inline-flex items-center px-2 py-1 rounded-full text-xs font-medium',
            getContentFormatColorClass(contentFormat)
          )}>
            {getContentFormatDisplayLabel(contentFormat)}
          </span>
        )}
      </div>
    )
  }

  // Render based on content format
  const renderContent = () => {
    switch (contentFormat) {
      case 'email':
        return (
          <div className="space-y-3">
            {hasSubject && (
              <h3 className="text-lg font-semibold text-gray-900 border-b border-gray-200 pb-2">
                {subject}
              </h3>
            )}
            <div className="prose prose-sm max-w-none">
              {renderTextContent()}
            </div>
          </div>
        )

      case 'rich':
        return (
          <div className="prose prose-sm max-w-none">
            {renderRichContent()}
          </div>
        )

      case 'sms':
      case 'whatsapp':
        return (
          <div className="bg-gray-50 rounded-lg p-3 border-l-4 border-blue-500">
            <div className="whitespace-pre-wrap text-gray-900">
              {renderTextContent()}
            </div>
          </div>
        )

      case 'plain':
      default:
        return (
          <div className="whitespace-pre-wrap text-gray-900 leading-relaxed">
            {renderTextContent()}
          </div>
        )
    }
  }

  // Render plain text content safely
  const renderTextContent = () => {
    const textContent = content || plainText
    return <SafeText text={textContent} preserveWhitespace />
  }

  // Render rich content based on format with proper sanitization
  const renderRichContent = () => {
    if (!richContent) {
      return renderTextContent()
    }

    // Handle Quill Delta format
    if (richContent.ops && Array.isArray(richContent.ops)) {
      return (
        <div>
          {(richContent.ops as Array<{ insert?: string; attributes?: Record<string, unknown> }>).map((op, index) => {
            if (!op.insert) return null

            const text = op.insert
            const attrs = op.attributes || {}

            // Use SafeText for each text segment
            let element = <SafeText key={index} text={text} />

            // Apply basic formatting with safe text
            if (attrs.bold) {
              element = <strong key={index}><SafeText text={text} /></strong>
            }
            if (attrs.italic) {
              element = <em key={index}>{element}</em>
            }
            if (attrs.underline) {
              element = <u key={index}>{element}</u>
            }

            return element
          })}
        </div>
      )
    }

    // Handle HTML content with SafeHtml component
    if (typeof richContent.html === 'string') {
      return <SafeHtml html={richContent.html} />
    }

    // Handle plain text in rich content
    if (typeof richContent.text === 'string') {
      return <SafeText text={richContent.text} preserveWhitespace as="div" />
    }

    // Fallback to main content
    return renderTextContent()
  }

  return (
    <div className={cn('rich-text-content', className)}>
      {renderContent()}

      {showFormatIndicator && contentFormat !== 'plain' && !preview && (
        <div className="mt-3 pt-3 border-t border-gray-100">
          <span className={cn(
            'inline-flex items-center px-2 py-1 rounded-full text-xs font-medium',
            getContentFormatColorClass(contentFormat)
          )}>
            {getContentFormatDisplayLabel(contentFormat)}
          </span>
        </div>
      )}
    </div>
  )
})

RichTextRenderer.displayName = 'RichTextRenderer'

export default RichTextRenderer