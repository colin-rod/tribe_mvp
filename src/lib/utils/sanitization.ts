/**
 * Client-safe sanitization utilities for React components
 *
 * This module provides sanitization functions that work in both
 * server and client environments, with proper XSS prevention.
 */

import DOMPurify from 'dompurify'

/**
 * Browser-safe HTML sanitization
 * Works in both browser and Node.js (with jsdom) environments
 */
export function sanitizeHtml(html: string): string {
  if (typeof window === 'undefined') {
    // Server-side: import jsdom dynamically
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { JSDOM } = require('jsdom')
      const dom = new JSDOM('')
      // Type assertion to bypass strict WindowLike interface requirements
      const purify = DOMPurify(dom.window as Parameters<typeof DOMPurify>[0])

      // Add hook to remove data: URIs
      purify.addHook('afterSanitizeAttributes', (node) => {
        // Remove data: URIs from src and href attributes
        if (node.hasAttribute('src')) {
          const src = node.getAttribute('src')
          if (src && src.toLowerCase().startsWith('data:')) {
            node.removeAttribute('src')
          }
        }
        if (node.hasAttribute('href')) {
          const href = node.getAttribute('href')
          if (href && href.toLowerCase().startsWith('data:')) {
            node.removeAttribute('href')
          }
        }
      })

      const result = purify.sanitize(html, getSanitizeConfig())
      purify.removeHooks('afterSanitizeAttributes')
      return result
    } catch (error) {
      console.error('Server-side sanitization failed:', error)
      // Fallback: strip all HTML
      return stripHtml(html)
    }
  }

  // Client-side: use window directly
  // Add hook to remove data: URIs
  DOMPurify.addHook('afterSanitizeAttributes', (node) => {
    // Remove data: URIs from src and href attributes
    if (node.hasAttribute('src')) {
      const src = node.getAttribute('src')
      if (src && src.toLowerCase().startsWith('data:')) {
        node.removeAttribute('src')
      }
    }
    if (node.hasAttribute('href')) {
      const href = node.getAttribute('href')
      if (href && href.toLowerCase().startsWith('data:')) {
        node.removeAttribute('href')
      }
    }
  })

  const result = DOMPurify.sanitize(html, getSanitizeConfig())
  DOMPurify.removeHooks('afterSanitizeAttributes')
  return result
}

/**
 * DOMPurify configuration for safe HTML rendering
 */
function getSanitizeConfig(): DOMPurify.Config {
  return {
    // Allowed tags for rich content
    ALLOWED_TAGS: [
      'p', 'br', 'strong', 'em', 'u', 'b', 'i', 'span', 'div',
      'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
      'ul', 'ol', 'li',
      'a', 'img',
      'blockquote', 'pre', 'code',
      'table', 'thead', 'tbody', 'tr', 'th', 'td'
    ],

    // Allowed attributes
    ALLOWED_ATTR: [
      'href', 'src', 'alt', 'title', 'class', 'id',
      'width', 'height', 'style'
    ],

    // Only allow safe URL schemes (block data: URIs entirely)
    ALLOWED_URI_REGEXP: /^(?:https?:|mailto:|tel:|\/|#)/i,

    // Additional security settings
    SANITIZE_DOM: true,
    KEEP_CONTENT: true,
    IN_PLACE: false,

    // Forbidden tags (explicit deny list)
    FORBID_TAGS: [
      'script', 'iframe', 'object', 'embed', 'form',
      'input', 'textarea', 'select', 'button',
      'link', 'style', 'meta', 'base'
    ],

    // Forbidden attributes (explicit deny list)
    FORBID_ATTR: [
      'onclick', 'onload', 'onerror', 'onmouseover', 'onfocus',
      'onblur', 'onchange', 'onsubmit', 'onreset', 'oninput',
      'onkeydown', 'onkeyup', 'onkeypress', 'onmousedown',
      'onmouseup', 'onmousemove', 'onmouseenter', 'onmouseleave'
    ],

    // Style attribute configuration
    ALLOW_DATA_ATTR: false, // Disable data-* attributes
    WHOLE_DOCUMENT: false,
    RETURN_DOM: false,
    RETURN_DOM_FRAGMENT: false,
    FORCE_BODY: false,

    // Hook to sanitize URLs more strictly
    ADD_URI_SAFE_ATTR: [], // No additional safe attributes for URIs
  }
}

/**
 * Sanitize plain text content
 * Removes control characters and potential XSS vectors
 */
export function sanitizeText(text: string): string {
  if (!text) return ''

  return text
    // Remove null bytes and control characters (except newlines, tabs, carriage returns)
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
    // Remove any HTML tags
    .replace(/<[^>]*>/g, '')
    // Remove any script-like content
    .replace(/javascript:/gi, '')
    .replace(/vbscript:/gi, '')
    .replace(/on\w+\s*=/gi, '')
    // Trim whitespace
    .trim()
}

/**
 * Strip all HTML tags from a string
 * Fallback for when DOMPurify is unavailable
 */
export function stripHtml(html: string): string {
  if (!html) return ''

  return html
    // Remove script tags and their content
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    // Remove style tags and their content
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
    // Remove all other HTML tags
    .replace(/<[^>]*>/g, '')
    // Decode HTML entities
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    // Remove suspicious patterns
    .replace(/javascript:/gi, '')
    .replace(/vbscript:/gi, '')
    .replace(/on\w+\s*=/gi, '')
    .trim()
}

/**
 * Sanitize a URL to prevent javascript: and data: URIs
 */
export function sanitizeUrl(url: string): string {
  if (!url) return ''

  const trimmedUrl = url.trim().toLowerCase()

  // Block dangerous protocols
  const dangerousProtocols = [
    'javascript:',
    'data:',
    'vbscript:',
    'file:',
    'about:'
  ]

  if (dangerousProtocols.some(protocol => trimmedUrl.startsWith(protocol))) {
    return ''
  }

  // Allow only http, https, mailto, tel
  if (!/^(https?:|mailto:|tel:|\/|#)/i.test(trimmedUrl)) {
    return ''
  }

  return url.trim()
}

/**
 * Sanitize CSS to prevent injection attacks
 */
export function sanitizeCss(css: string): string {
  if (!css) return ''

  return css
    // Remove any script-like content
    .replace(/javascript:/gi, '')
    .replace(/vbscript:/gi, '')
    .replace(/<script/gi, '')
    .replace(/<\/script/gi, '')
    // Remove expression() and import
    .replace(/expression\s*\(/gi, '')
    .replace(/@import/gi, '')
    // Remove behavior property (IE specific)
    .replace(/behavior\s*:/gi, '')
    .trim()
}

/**
 * Escape HTML special characters
 * Use this when you need to display user input as plain text
 */
export function escapeHtml(text: string): string {
  if (!text) return ''

  const htmlEscapeMap: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#x27;',
    '/': '&#x2F;'
  }

  return text.replace(/[&<>"'/]/g, (char) => htmlEscapeMap[char] || char)
}

/**
 * Validate and sanitize email addresses
 */
export function sanitizeEmail(email: string): string {
  if (!email) return ''

  // First, remove any suspicious patterns before processing
  let cleaned = email
    .trim()
    .toLowerCase()
    // Remove any HTML tags
    .replace(/<[^>]*>/g, '')
    // Remove suspicious patterns
    .replace(/javascript:/gi, '')
    .replace(/vbscript:/gi, '')
    .replace(/data:/gi, '')

  // If cleaning removed content, it's suspicious - reject it
  if (cleaned !== email.toLowerCase().trim()) {
    return ''
  }

  // Basic email validation
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/

  return emailRegex.test(cleaned) ? cleaned : ''
}

/**
 * Sanitize file names to prevent path traversal
 */
export function sanitizeFileName(fileName: string): string {
  if (!fileName) return ''

  return fileName
    // Remove path separators
    .replace(/[/\\]/g, '')
    // Remove parent directory references
    .replace(/\.\./g, '')
    // Remove null bytes
    .replace(/\x00/g, '')
    // Keep only safe characters
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .trim()
}

/**
 * Check if content contains potential XSS vectors
 */
export function containsXss(content: string): boolean {
  if (!content) return false

  const xssPatterns = [
    /<script[\s\S]*?>[\s\S]*?<\/script>/gi,
    /<iframe[\s\S]*?>[\s\S]*?<\/iframe>/gi,
    /javascript:/gi,
    /vbscript:/gi,
    /on\w+\s*=/gi,
    /data:text\/html/gi,
    /<embed[\s\S]*?>/gi,
    /<object[\s\S]*?>/gi
  ]

  return xssPatterns.some(pattern => pattern.test(content))
}

/**
 * Safe JSON parse with error handling
 */
export function safeJsonParse<T>(json: string, fallback: T): T {
  try {
    return JSON.parse(json) as T
  } catch {
    return fallback
  }
}
