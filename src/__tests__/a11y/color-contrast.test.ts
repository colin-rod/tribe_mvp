/**
 * Color Contrast Audit
 *
 * Tests all color combinations from Tailwind config to ensure
 * they meet WCAG 2.1 AA standards (4.5:1 for normal text, 3:1 for large text)
 */

import { meetsWCAGStandard } from '@/utils/a11y'

// Colors from tailwind.config.js
const colors = {
  primary: {
    50: '#fef7ed',
    100: '#fdedd3',
    200: '#fbd9a6',
    300: '#f8be6e',
    400: '#f59e34',
    500: '#f3841c', // Main brand color
    600: '#e4690f',
    700: '#bd500f',
    800: '#964114',
    900: '#7a3713',
    950: '#421a07',
  },
  neutral: {
    50: '#fafaf9',
    100: '#f5f5f4',
    200: '#e7e5e4',
    300: '#d6d3d1',
    400: '#a8a29e',
    500: '#78716c',
    600: '#57534e',
    700: '#44403c',
    800: '#292524',
    900: '#1c1917',
    950: '#0c0a09',
  },
  error: {
    50: '#fef2f2',
    100: '#fee2e2',
    200: '#fecaca',
    300: '#fca5a5',
    400: '#f87171',
    500: '#ef4444',
    600: '#dc2626',
    700: '#b91c1c',
    800: '#991b1b',
    900: '#7f1d1d',
    950: '#450a0a',
  },
  success: {
    500: '#22c55e',
    600: '#16a34a',
    700: '#15803d',
  },
  warning: {
    500: '#f59e0b',
    600: '#d97706',
  },
}

describe('Color Contrast - WCAG AA Compliance', () => {
  describe('Text on White Background (#ffffff)', () => {
    const white = '#ffffff'

    it('primary-500 on white should meet AA for large text', () => {
      const result = meetsWCAGStandard(colors.primary[500], white, true)
      expect(result.passes).toBe(true)
      expect(result.ratio).toBeGreaterThanOrEqual(3)
    })

    it('primary-600 on white should meet AA for normal text', () => {
      const result = meetsWCAGStandard(colors.primary[600], white, false)
      expect(result.passes).toBe(true)
      expect(result.ratio).toBeGreaterThanOrEqual(4.5)
    })

    it('primary-700 on white should meet AA for normal text', () => {
      const result = meetsWCAGStandard(colors.primary[700], white, false)
      expect(result.passes).toBe(true)
      expect(result.ratio).toBeGreaterThanOrEqual(4.5)
    })

    it('neutral-700 on white should meet AA for normal text', () => {
      const result = meetsWCAGStandard(colors.neutral[700], white, false)
      expect(result.passes).toBe(true)
      expect(result.ratio).toBeGreaterThanOrEqual(4.5)
    })

    it('neutral-900 on white should meet AA for normal text', () => {
      const result = meetsWCAGStandard(colors.neutral[900], white, false)
      expect(result.passes).toBe(true)
      expect(result.ratio).toBeGreaterThanOrEqual(4.5)
    })

    it('error-600 on white should meet AA for normal text', () => {
      const result = meetsWCAGStandard(colors.error[600], white, false)
      expect(result.passes).toBe(true)
      expect(result.ratio).toBeGreaterThanOrEqual(4.5)
    })

    it('success-600 on white should meet AA for normal text', () => {
      const result = meetsWCAGStandard(colors.success[600], white, false)
      expect(result.passes).toBe(true)
      expect(result.ratio).toBeGreaterThanOrEqual(4.5)
    })
  })

  describe('Text on Primary Backgrounds', () => {
    it('white text on primary-500 should meet AA', () => {
      const result = meetsWCAGStandard('#ffffff', colors.primary[500], false)
      expect(result.passes).toBe(true)
      expect(result.ratio).toBeGreaterThanOrEqual(4.5)
    })

    it('white text on primary-600 should meet AA', () => {
      const result = meetsWCAGStandard('#ffffff', colors.primary[600], false)
      expect(result.passes).toBe(true)
      expect(result.ratio).toBeGreaterThanOrEqual(4.5)
    })
  })

  describe('Text on Error Backgrounds', () => {
    it('white text on error-500 should meet AA', () => {
      const result = meetsWCAGStandard('#ffffff', colors.error[500], false)
      expect(result.passes).toBe(true)
      expect(result.ratio).toBeGreaterThanOrEqual(4.5)
    })

    it('error-900 text on error-50 should meet AA', () => {
      const result = meetsWCAGStandard(colors.error[900], colors.error[50], false)
      expect(result.passes).toBe(true)
      expect(result.ratio).toBeGreaterThanOrEqual(4.5)
    })
  })

  describe('Neutral Text Colors', () => {
    const white = '#ffffff'

    it('neutral-500 on white should meet AA for large text', () => {
      const result = meetsWCAGStandard(colors.neutral[500], white, true)
      expect(result.passes).toBe(true)
      expect(result.ratio).toBeGreaterThanOrEqual(3)
    })

    it('neutral-600 on white should meet AA for normal text', () => {
      const result = meetsWCAGStandard(colors.neutral[600], white, false)
      expect(result.passes).toBe(true)
      expect(result.ratio).toBeGreaterThanOrEqual(4.5)
    })
  })

  describe('Focus Indicators', () => {
    it('primary-500 focus ring should meet 3:1 contrast against white', () => {
      const result = meetsWCAGStandard(colors.primary[500], '#ffffff', true)
      expect(result.ratio).toBeGreaterThanOrEqual(3)
    })
  })

  describe('Warning Colors', () => {
    it('white text on warning-600 should meet AA', () => {
      const result = meetsWCAGStandard('#ffffff', colors.warning[600], false)
      expect(result.passes).toBe(true)
      expect(result.ratio).toBeGreaterThanOrEqual(4.5)
    })
  })

  describe('Success Colors', () => {
    it('white text on success-600 should meet AA', () => {
      const result = meetsWCAGStandard('#ffffff', colors.success[600], false)
      expect(result.passes).toBe(true)
      expect(result.ratio).toBeGreaterThanOrEqual(4.5)
    })
  })
})

/**
 * Report all color combinations and their contrast ratios
 * Run this test with --verbose to see detailed output
 */
describe('Color Contrast Report', () => {
  it('should log all primary color combinations', () => {
    const white = '#ffffff'
    console.log('\n📊 Primary Colors on White Background:')

    Object.entries(colors.primary).forEach(([shade, hex]) => {
      const normalText = meetsWCAGStandard(hex, white, false)
      const largeText = meetsWCAGStandard(hex, white, true)

      console.log(
        `  primary-${shade}: ${normalText.ratio}:1 ` +
        `${normalText.passes ? '✓' : '✗'} normal, ` +
        `${largeText.passes ? '✓' : '✗'} large`
      )
    })
  })
})
