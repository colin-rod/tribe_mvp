import { sanitizeHtml, sanitizeText, stripHtml, sanitizeUrl } from '@/lib/utils/sanitization'

describe('Sanitization Utilities Tests', () => {
  describe('sanitizeHtml', () => {
    it('should allow safe HTML tags', () => {
      const html = '<p>Hello <strong>World</strong></p>'
      const result = sanitizeHtml(html)
      expect(result).toContain('<p>')
      expect(result).toContain('<strong>')
      expect(result).toContain('Hello')
      expect(result).toContain('World')
    })

    it('should remove script tags', () => {
      const html = '<p>Safe text</p><script>alert("XSS")</script>'
      const result = sanitizeHtml(html)
      expect(result).toContain('Safe text')
      expect(result).not.toContain('<script>')
      expect(result).not.toContain('alert')
    })

    it('should remove event handlers', () => {
      const html = '<div onclick="alert(\'XSS\')">Click me</div>'
      const result = sanitizeHtml(html)
      expect(result).toContain('Click me')
      expect(result).not.toContain('onclick')
      expect(result).not.toContain('alert')
    })

    it('should remove javascript: URLs', () => {
      const html = '<a href="javascript:alert(\'XSS\')">Link</a>'
      const result = sanitizeHtml(html)
      expect(result).toContain('Link')
      expect(result).not.toContain('javascript:')
    })

    it('should remove data: URIs from src attributes', () => {
      const html = '<img src="data:text/html,<script>alert(\'XSS\')</script>">'
      const result = sanitizeHtml(html)
      expect(result).not.toContain('data:')
    })

    it('should allow safe HTTPS URLs', () => {
      const html = '<a href="https://example.com">Link</a>'
      const result = sanitizeHtml(html)
      expect(result).toContain('https://example.com')
      expect(result).toContain('Link')
    })

    it('should allow mailto: URLs', () => {
      const html = '<a href="mailto:test@example.com">Email</a>'
      const result = sanitizeHtml(html)
      expect(result).toContain('mailto:test@example.com')
      expect(result).toContain('Email')
    })

    it('should sanitize nested malicious content', () => {
      const html = '<div><p><script>alert("nested")</script>Safe</p></div>'
      const result = sanitizeHtml(html)
      expect(result).toContain('Safe')
      expect(result).not.toContain('<script>')
    })

    it('should preserve text formatting tags', () => {
      const html = '<p>Text with <b>bold</b>, <i>italic</i>, and <u>underline</u></p>'
      const result = sanitizeHtml(html)
      expect(result).toContain('<b>bold</b>')
      expect(result).toContain('<i>italic</i>')
      expect(result).toContain('<u>underline</u>')
    })

    it('should allow lists and structure', () => {
      const html = '<ul><li>Item 1</li><li>Item 2</li></ul>'
      const result = sanitizeHtml(html)
      expect(result).toContain('<ul>')
      expect(result).toContain('<li>')
      expect(result).toContain('Item 1')
      expect(result).toContain('Item 2')
    })

    it('should handle empty input', () => {
      expect(sanitizeHtml('')).toBe('')
    })

    it('should handle plain text', () => {
      const text = 'Just plain text'
      const result = sanitizeHtml(text)
      expect(result).toBe('Just plain text')
    })
  })

  describe('sanitizeText', () => {
    it('should trim whitespace', () => {
      expect(sanitizeText('  Hello  ')).toBe('Hello')
    })

    it('should remove HTML tags', () => {
      expect(sanitizeText('<p>Hello</p>')).toBe('Hello')
    })

    it('should remove control characters', () => {
      const text = 'Hello\x00\x01\x02World'
      const result = sanitizeText(text)
      expect(result).toBe('HelloWorld')
    })

    it('should remove javascript: URLs', () => {
      expect(sanitizeText('javascript:alert(1)')).not.toContain('javascript:')
    })

    it('should remove event handlers', () => {
      expect(sanitizeText('onclick=alert(1)')).not.toContain('onclick=')
    })

    it('should handle empty string', () => {
      expect(sanitizeText('')).toBe('')
    })

    it('should preserve emojis and unicode', () => {
      const result = sanitizeText('Hello 👋 World')
      expect(result).toContain('Hello')
      expect(result).toContain('World')
    })
  })

  describe('stripHtml', () => {
    it('should remove all HTML tags', () => {
      const html = '<p>Hello <strong>World</strong></p>'
      expect(stripHtml(html)).toBe('Hello World')
    })

    it('should remove script tags and content', () => {
      const html = '<p>Safe</p><script>alert("XSS")</script><p>Text</p>'
      const result = stripHtml(html)
      expect(result).toContain('Safe')
      expect(result).toContain('Text')
      expect(result).not.toContain('script')
      expect(result).not.toContain('alert')
    })

    it('should handle nested tags', () => {
      const html = '<div><p><span>Nested</span> text</p></div>'
      expect(stripHtml(html)).toBe('Nested text')
    })

    it('should preserve spacing between elements', () => {
      const html = '<p>First</p><p>Second</p>'
      const result = stripHtml(html)
      expect(result).toContain('First')
      expect(result).toContain('Second')
    })

    it('should decode HTML entities', () => {
      const html = '&lt;div&gt;&amp;&nbsp;&quot;'
      const result = stripHtml(html)
      expect(result).toContain('<')
      expect(result).toContain('>')
      expect(result).toContain('&')
    })

    it('should handle empty input', () => {
      expect(stripHtml('')).toBe('')
    })

    it('should handle plain text', () => {
      expect(stripHtml('Plain text')).toBe('Plain text')
    })
  })

  describe('sanitizeUrl', () => {
    it('should allow HTTPS URLs', () => {
      const url = 'https://example.com/path?query=value'
      expect(sanitizeUrl(url)).toBe(url)
    })

    it('should allow HTTP URLs', () => {
      const url = 'http://example.com'
      expect(sanitizeUrl(url)).toBe(url)
    })

    it('should block javascript: URLs', () => {
      const url = 'javascript:alert("XSS")'
      expect(sanitizeUrl(url)).toBe('')
    })

    it('should block data: URIs', () => {
      const url = 'data:text/html,<script>alert("XSS")</script>'
      expect(sanitizeUrl(url)).toBe('')
    })

    it('should block vbscript: URLs', () => {
      const url = 'vbscript:msgbox("XSS")'
      expect(sanitizeUrl(url)).toBe('')
    })

    it('should allow relative URLs', () => {
      expect(sanitizeUrl('/path/to/page')).toBe('/path/to/page')
      expect(sanitizeUrl('./relative')).toBe('./relative')
      expect(sanitizeUrl('../parent')).toBe('../parent')
    })

    it('should allow mailto: URLs', () => {
      const url = 'mailto:test@example.com'
      expect(sanitizeUrl(url)).toBe(url)
    })

    it('should allow tel: URLs', () => {
      const url = 'tel:+1234567890'
      expect(sanitizeUrl(url)).toBe(url)
    })

    it('should allow fragment identifiers', () => {
      expect(sanitizeUrl('#section')).toBe('#section')
    })

    it('should handle empty input', () => {
      expect(sanitizeUrl('')).toBe('')
    })

    it('should handle malformed URLs', () => {
      expect(sanitizeUrl('not a url')).toBe('')
    })

    it('should be case-insensitive for dangerous protocols', () => {
      expect(sanitizeUrl('JavaScript:alert(1)')).toBe('')
      expect(sanitizeUrl('JAVASCRIPT:alert(1)')).toBe('')
      expect(sanitizeUrl('JaVaScRiPt:alert(1)')).toBe('')
    })
  })


  describe('Edge Cases and Security', () => {
    it('should handle null bytes in HTML', () => {
      const html = '<p>Hello\x00World</p>'
      const result = sanitizeHtml(html)
      expect(result).not.toContain('\x00')
    })

    it('should handle unicode in URLs', () => {
      const url = 'https://example.com/文档'
      expect(sanitizeUrl(url)).toBeTruthy()
    })

    it('should handle extremely long inputs', () => {
      const longHtml = '<p>' + 'A'.repeat(10000) + '</p>'
      const result = sanitizeHtml(longHtml)
      expect(result).toBeTruthy()
    })

    it('should handle mixed content attacks', () => {
      const html = '<p>Safe</p><iframe src="javascript:alert(1)"></iframe>'
      const result = sanitizeHtml(html)
      expect(result).not.toContain('iframe')
      expect(result).not.toContain('javascript')
    })

    it('should handle obfuscated XSS attempts', () => {
      const attempts = [
        '<img src=x onerror=alert(1)>',
        '<svg onload=alert(1)>',
        '<body onload=alert(1)>',
        '<iframe src="data:text/html,<script>alert(1)</script>">',
        '<object data="javascript:alert(1)">'
      ]

      attempts.forEach(attempt => {
        const result = sanitizeHtml(attempt)
        expect(result).not.toContain('alert')
        expect(result).not.toContain('onload')
        expect(result).not.toContain('onerror')
      })
    })
  })

  describe('Performance and Consistency', () => {
    it('should be idempotent for sanitizeHtml', () => {
      const html = '<p>Hello <strong>World</strong></p>'
      const first = sanitizeHtml(html)
      const second = sanitizeHtml(first)
      expect(first).toBe(second)
    })

    it('should be idempotent for sanitizeText', () => {
      const text = '  Hello  World  '
      const first = sanitizeText(text)
      const second = sanitizeText(first)
      expect(first).toBe(second)
    })

    it('should be idempotent for sanitizeUrl', () => {
      const url = 'https://example.com'
      const first = sanitizeUrl(url)
      const second = sanitizeUrl(first)
      expect(first).toBe(second)
    })
  })
})
