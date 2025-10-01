/**
 * XSS Prevention Tests
 *
 * Tests for input sanitization and XSS attack prevention
 * Covers CRO-110: Missing Input Sanitization and XSS Prevention
 */

import { describe, test, expect } from '@jest/globals'
import { render, screen } from '@testing-library/react'
import {
  sanitizeHtml,
  sanitizeText,
  sanitizeUrl,
  sanitizeCss,
  escapeHtml,
  sanitizeEmail,
  sanitizeFileName,
  containsXss,
  stripHtml
} from '@/lib/utils/sanitization'
import SafeHtml from '@/components/ui/SafeHtml'
import SafeText from '@/components/ui/SafeText'

describe('XSS Prevention - Sanitization Functions', () => {
  describe('sanitizeHtml', () => {
    test('should remove script tags', () => {
      const malicious = '<p>Hello</p><script>alert("XSS")</script>'
      const sanitized = sanitizeHtml(malicious)

      expect(sanitized).toContain('<p>Hello</p>')
      expect(sanitized).not.toContain('<script>')
      expect(sanitized).not.toContain('alert')
    })

    test('should remove iframe tags', () => {
      const malicious = '<p>Content</p><iframe src="evil.com"></iframe>'
      const sanitized = sanitizeHtml(malicious)

      expect(sanitized).toContain('<p>Content</p>')
      expect(sanitized).not.toContain('<iframe')
    })

    test('should remove onclick handlers', () => {
      const malicious = '<button onclick="alert(\'XSS\')">Click</button>'
      const sanitized = sanitizeHtml(malicious)

      expect(sanitized).not.toContain('onclick')
      expect(sanitized).not.toContain('alert')
    })

    test('should remove onerror handlers', () => {
      const malicious = '<img src="x" onerror="alert(\'XSS\')">'
      const sanitized = sanitizeHtml(malicious)

      expect(sanitized).not.toContain('onerror')
      expect(sanitized).not.toContain('alert')
    })

    test('should allow safe HTML tags', () => {
      const safe = '<p>Hello <strong>world</strong></p><ul><li>Item</li></ul>'
      const sanitized = sanitizeHtml(safe)

      expect(sanitized).toContain('<p>')
      expect(sanitized).toContain('<strong>')
      expect(sanitized).toContain('<ul>')
      expect(sanitized).toContain('<li>')
    })

    test('should remove javascript: URLs', () => {
      const malicious = '<a href="javascript:alert(\'XSS\')">Link</a>'
      const sanitized = sanitizeHtml(malicious)

      expect(sanitized).not.toContain('javascript:')
    })

    test('should remove data: URLs with HTML', () => {
      const malicious = '<img src="data:text/html,<script>alert(\'XSS\')</script>">'
      const sanitized = sanitizeHtml(malicious)

      expect(sanitized).not.toContain('data:text/html')
      expect(sanitized).not.toContain('<script>')
    })

    test('should handle empty input', () => {
      expect(sanitizeHtml('')).toBe('')
    })

    test('should handle null/undefined gracefully', () => {
      expect(sanitizeHtml(null as unknown as string)).toBe('')
      expect(sanitizeHtml(undefined as unknown as string)).toBe('')
    })
  })

  describe('sanitizeText', () => {
    test('should remove HTML tags', () => {
      const input = '<p>Hello</p><script>alert("XSS")</script>'
      const sanitized = sanitizeText(input)

      expect(sanitized).not.toContain('<')
      expect(sanitized).not.toContain('>')
      expect(sanitized).toContain('Hello')
    })

    test('should remove control characters', () => {
      const input = 'Hello\x00\x01\x02World'
      const sanitized = sanitizeText(input)

      expect(sanitized).toBe('HelloWorld')
      expect(sanitized).not.toMatch(/[\x00-\x08]/)
    })

    test('should preserve newlines and tabs', () => {
      const input = 'Line 1\nLine 2\tTabbed'
      const sanitized = sanitizeText(input)

      expect(sanitized).toContain('\n')
      expect(sanitized).toContain('\t')
    })

    test('should remove javascript: patterns', () => {
      const input = 'Click javascript:alert("XSS")'
      const sanitized = sanitizeText(input)

      expect(sanitized).not.toContain('javascript:')
    })
  })

  describe('sanitizeUrl', () => {
    test('should allow https URLs', () => {
      const url = 'https://example.com/path'
      expect(sanitizeUrl(url)).toBe(url)
    })

    test('should allow http URLs', () => {
      const url = 'http://example.com/path'
      expect(sanitizeUrl(url)).toBe(url)
    })

    test('should block javascript: URLs', () => {
      const url = 'javascript:alert("XSS")'
      expect(sanitizeUrl(url)).toBe('')
    })

    test('should block data: URLs', () => {
      const url = 'data:text/html,<script>alert("XSS")</script>'
      expect(sanitizeUrl(url)).toBe('')
    })

    test('should block vbscript: URLs', () => {
      const url = 'vbscript:msgbox("XSS")'
      expect(sanitizeUrl(url)).toBe('')
    })

    test('should allow mailto: URLs', () => {
      const url = 'mailto:user@example.com'
      expect(sanitizeUrl(url)).toBe(url)
    })

    test('should allow relative URLs', () => {
      const url = '/path/to/page'
      expect(sanitizeUrl(url)).toBe(url)
    })

    test('should allow anchor links', () => {
      const url = '#section'
      expect(sanitizeUrl(url)).toBe(url)
    })
  })

  describe('sanitizeCss', () => {
    test('should remove javascript: in CSS', () => {
      const css = 'background: url(javascript:alert("XSS"))'
      const sanitized = sanitizeCss(css)

      expect(sanitized).not.toContain('javascript:')
    })

    test('should remove expression()', () => {
      const css = 'width: expression(alert("XSS"))'
      const sanitized = sanitizeCss(css)

      expect(sanitized).not.toContain('expression(')
    })

    test('should remove @import', () => {
      const css = '@import url("evil.css")'
      const sanitized = sanitizeCss(css)

      expect(sanitized).not.toContain('@import')
    })
  })

  describe('escapeHtml', () => {
    test('should escape HTML special characters', () => {
      const input = '<script>alert("XSS")</script>'
      const escaped = escapeHtml(input)

      expect(escaped).not.toContain('<script>')
      expect(escaped).toContain('&lt;script&gt;')
      expect(escaped).toContain('&quot;')
    })

    test('should escape ampersands', () => {
      const input = 'Tom & Jerry'
      const escaped = escapeHtml(input)

      expect(escaped).toBe('Tom &amp; Jerry')
    })

    test('should escape quotes', () => {
      const input = 'She said "hello"'
      const escaped = escapeHtml(input)

      expect(escaped).toContain('&quot;')
    })
  })

  describe('sanitizeEmail', () => {
    test('should allow valid email addresses', () => {
      const email = 'user@example.com'
      expect(sanitizeEmail(email)).toBe(email)
    })

    test('should normalize to lowercase', () => {
      const email = 'User@EXAMPLE.COM'
      expect(sanitizeEmail(email)).toBe('user@example.com')
    })

    test('should reject emails with javascript:', () => {
      const email = 'javascript:alert@example.com'
      expect(sanitizeEmail(email)).toBe('')
    })

    test('should remove HTML tags from email', () => {
      const email = 'user<script>@example.com'
      expect(sanitizeEmail(email)).toBe('')
    })
  })

  describe('sanitizeFileName', () => {
    test('should allow safe file names', () => {
      const fileName = 'document-2024.pdf'
      expect(sanitizeFileName(fileName)).toBe(fileName)
    })

    test('should remove path separators', () => {
      const fileName = '../../../etc/passwd'
      const sanitized = sanitizeFileName(fileName)

      expect(sanitized).not.toContain('/')
      expect(sanitized).not.toContain('..')
    })

    test('should remove null bytes', () => {
      const fileName = 'file\x00.txt'
      const sanitized = sanitizeFileName(fileName)

      expect(sanitized).not.toContain('\x00')
    })

    test('should replace unsafe characters', () => {
      const fileName = 'file<>:"|?*.txt'
      const sanitized = sanitizeFileName(fileName)

      expect(sanitized).toMatch(/^[a-zA-Z0-9._-]+$/)
    })
  })

  describe('containsXss', () => {
    test('should detect script tags', () => {
      expect(containsXss('<script>alert("XSS")</script>')).toBe(true)
    })

    test('should detect iframe tags', () => {
      expect(containsXss('<iframe src="evil.com"></iframe>')).toBe(true)
    })

    test('should detect javascript: URLs', () => {
      expect(containsXss('javascript:alert("XSS")')).toBe(true)
    })

    test('should detect event handlers', () => {
      expect(containsXss('onclick="alert(\'XSS\')"')).toBe(true)
    })

    test('should return false for safe content', () => {
      expect(containsXss('<p>Hello world</p>')).toBe(false)
      expect(containsXss('Just plain text')).toBe(false)
    })
  })

  describe('stripHtml', () => {
    test('should remove all HTML tags', () => {
      const input = '<p>Hello <strong>world</strong></p>'
      const stripped = stripHtml(input)

      expect(stripped).toBe('Hello world')
      expect(stripped).not.toContain('<')
    })

    test('should decode HTML entities', () => {
      const input = '&lt;script&gt;'
      const stripped = stripHtml(input)

      expect(stripped).toContain('<')
      expect(stripped).toContain('>')
    })
  })
})

describe('XSS Prevention - React Components', () => {
  describe('SafeHtml Component', () => {
    test('should render sanitized HTML', () => {
      const html = '<p>Hello <strong>world</strong></p>'
      render(<SafeHtml html={html} />)

      expect(screen.getByText(/Hello/)).toBeInTheDocument()
      expect(screen.getByText(/world/)).toBeInTheDocument()
    })

    test('should remove script tags', () => {
      const html = '<p>Safe content</p><script>alert("XSS")</script>'
      const { container } = render(<SafeHtml html={html} />)

      expect(container.textContent).toContain('Safe content')
      expect(container.innerHTML).not.toContain('<script>')
    })

    test('should remove event handlers', () => {
      const html = '<button onclick="alert(\'XSS\')">Click</button>'
      const { container } = render(<SafeHtml html={html} />)

      expect(container.innerHTML).not.toContain('onclick')
    })

    test('should not render when empty', () => {
      const { container } = render(<SafeHtml html="" />)
      expect(container.firstChild).toBeNull()
    })

    test('should apply prose styling when requested', () => {
      const { container } = render(<SafeHtml html="<p>Test</p>" prose />)
      expect(container.firstChild).toHaveClass('prose')
    })
  })

  describe('SafeText Component', () => {
    test('should render sanitized text', () => {
      const text = 'Hello world'
      render(<SafeText text={text} />)

      expect(screen.getByText('Hello world')).toBeInTheDocument()
    })

    test('should escape HTML in text', () => {
      const text = '<script>alert("XSS")</script>'
      const { container } = render(<SafeText text={text} />)

      // Since SafeText renders as text content (not HTML), it won't contain script tags
      expect(container.innerHTML).not.toContain('<script>')
      // Text content is rendered safely without HTML entities showing
      expect(container.textContent).toContain('alert')
      expect(container.textContent).not.toContain('<script>')
    })

    test('should preserve whitespace when requested', () => {
      const text = 'Line 1\nLine 2'
      const { container } = render(<SafeText text={text} preserveWhitespace />)

      expect(container.firstChild).toHaveClass('whitespace-pre-wrap')
    })

    test('should truncate long text', () => {
      const text = 'This is a very long text that should be truncated'
      render(<SafeText text={text} maxLength={20} />)

      const element = screen.getByText(/This is a very long/)
      expect(element.textContent).toContain('...')
      expect(element.textContent?.length).toBeLessThan(text.length)
    })

    test('should not render when empty', () => {
      const { container } = render(<SafeText text="" />)
      expect(container.firstChild).toBeNull()
    })
  })
})

describe('XSS Prevention - Common Attack Vectors', () => {
  test('should prevent XSS via img onerror', () => {
    const attack = '<img src=x onerror="alert(\'XSS\')">'
    const sanitized = sanitizeHtml(attack)

    expect(sanitized).not.toContain('onerror')
    expect(sanitized).not.toContain('alert')
  })

  test('should prevent XSS via svg onload', () => {
    const attack = '<svg onload="alert(\'XSS\')">'
    const sanitized = sanitizeHtml(attack)

    expect(sanitized).not.toContain('onload')
  })

  test('should prevent XSS via javascript: protocol', () => {
    const attack = '<a href="javascript:alert(\'XSS\')">Click</a>'
    const sanitized = sanitizeHtml(attack)

    expect(sanitized).not.toContain('javascript:')
  })

  test('should prevent XSS via data: URI', () => {
    const attack = '<a href="data:text/html,<script>alert(\'XSS\')</script>">Click</a>'
    const sanitized = sanitizeHtml(attack)

    expect(sanitized).not.toContain('data:text/html')
  })

  test('should prevent XSS via HTML entities', () => {
    const attack = '&lt;script&gt;alert("XSS")&lt;/script&gt;'
    const sanitized = sanitizeText(attack)

    expect(sanitized).not.toContain('<script>')
  })

  test('should prevent XSS via unicode encoding', () => {
    const attack = '\u003cscript\u003ealert("XSS")\u003c/script\u003e'
    const sanitized = sanitizeText(attack)

    expect(sanitized).not.toContain('script')
  })

  test('should prevent stored XSS in user names', () => {
    const maliciousName = '<script>alert("XSS")</script>John'
    const sanitized = sanitizeText(maliciousName)

    expect(sanitized).not.toContain('<script>')
    expect(sanitized).toContain('John')
  })

  test('should prevent stored XSS in comments', () => {
    const maliciousComment = 'Nice post! <img src=x onerror=alert("XSS")>'
    const sanitized = sanitizeHtml(maliciousComment)

    expect(sanitized).not.toContain('onerror')
    expect(sanitized).toContain('Nice post!')
  })
})

describe('XSS Prevention - Edge Cases', () => {
  test('should handle malformed HTML', () => {
    const malformed = '<p>Unclosed tag<script>alert("XSS")'
    const sanitized = sanitizeHtml(malformed)

    expect(sanitized).not.toContain('<script>')
  })

  test('should handle case variations', () => {
    const attacks = [
      '<SCRIPT>alert("XSS")</SCRIPT>',
      '<ScRiPt>alert("XSS")</ScRiPt>',
      '<sCrIpT>alert("XSS")</ScRiPt>'
    ]

    attacks.forEach(attack => {
      const sanitized = sanitizeHtml(attack)
      expect(sanitized).not.toContain('alert')
      expect(sanitized.toLowerCase()).not.toContain('<script')
    })
  })

  test('should handle nested tags', () => {
    const nested = '<div><p><span><script>alert("XSS")</script></span></p></div>'
    const sanitized = sanitizeHtml(nested)

    expect(sanitized).not.toContain('<script>')
  })

  test('should handle very long input', () => {
    const longInput = '<p>' + 'A'.repeat(10000) + '</p><script>alert("XSS")</script>'
    const sanitized = sanitizeHtml(longInput)

    expect(sanitized).not.toContain('<script>')
    expect(sanitized.length).toBeGreaterThan(0)
  })
})
