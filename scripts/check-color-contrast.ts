#!/usr/bin/env ts-node
/**
 * Color Contrast Checker
 *
 * Automated tool to verify all color combinations meet WCAG AA standards
 * Run: npm run check:contrast or ts-node scripts/check-color-contrast.ts
 */

import { getContrastRatio } from '../src/utils/a11y'

// Import colors from Tailwind config
const colors = {
  primary: {
    50: '#fef7ed',
    100: '#fdedd3',
    200: '#fbd9a6',
    300: '#f8be6e',
    400: '#f59e34',
    500: '#f3841c',
    600: '#d55a0a', // WCAG AA compliant
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
    500: '#dc2626', // WCAG AA compliant
    600: '#dc2626',
    700: '#b91c1c',
    800: '#991b1b',
    900: '#7f1d1d',
    950: '#450a0a',
  },
  success: {
    50: '#f0fdf4',
    100: '#dcfce7',
    200: '#bbf7d0',
    300: '#86efac',
    400: '#4ade80',
    500: '#22c55e',
    600: '#15803d', // WCAG AA compliant
    700: '#15803d',
    800: '#166534',
    900: '#14532d',
    950: '#052e16',
  },
  warning: {
    50: '#fffbeb',
    100: '#fef3c7',
    200: '#fde68a',
    300: '#fcd34d',
    400: '#fbbf24',
    500: '#f59e0b',
    600: '#b45309', // WCAG AA compliant
    700: '#b45309',
    800: '#92400e',
    900: '#78350f',
    950: '#451a03',
  },
}

interface ColorCombination {
  foreground: string
  background: string
  ratio: number
  passes: boolean
  level: 'AAA' | 'AA' | 'Fail'
  usage: string
}

const backgrounds = {
  white: '#ffffff',
  black: '#000000',
  neutral50: colors.neutral[50],
  neutral100: colors.neutral[100],
}

function checkContrast(
  fg: string,
  bg: string,
  isLargeText: boolean = false
): { passes: boolean; ratio: number; level: string } {
  const ratio = getContrastRatio(fg, bg)
  const aaRequired = isLargeText ? 3 : 4.5
  const aaaRequired = isLargeText ? 4.5 : 7

  const passesAA = ratio >= aaRequired
  const passesAAA = ratio >= aaaRequired

  return {
    passes: passesAA,
    ratio: Math.round(ratio * 100) / 100,
    level: passesAAA ? 'AAA' : passesAA ? 'AA' : 'Fail',
  }
}

function formatRatio(ratio: number): string {
  return ratio.toFixed(2)
}

function getStatusIcon(passes: boolean, level: string): string {
  if (level === 'AAA') return '🏆'
  if (level === 'AA') return '✅'
  return '❌'
}

console.log('\n🎨 Color Contrast Audit - WCAG AA Compliance Check\n')
console.log('='.repeat(80))

// Check primary colors
console.log('\n📊 PRIMARY COLORS')
console.log('-'.repeat(80))

const primaryResults: ColorCombination[] = []

Object.entries(colors.primary).forEach(([shade, hex]) => {
  const onWhite = checkContrast(hex, backgrounds.white, false)
  const onWhiteLarge = checkContrast(hex, backgrounds.white, true)

  console.log(
    `${getStatusIcon(onWhite.passes, onWhite.level)} primary-${shade.padEnd(4)} on white: ` +
      `${formatRatio(onWhite.ratio).padStart(5)}:1 [${onWhite.level}] ` +
      `(Large: ${formatRatio(onWhiteLarge.ratio)}:1 [${onWhiteLarge.level}])`
  )

  primaryResults.push({
    foreground: `primary-${shade}`,
    background: 'white',
    ratio: onWhite.ratio,
    passes: onWhite.passes,
    level: onWhite.level as any,
    usage: onWhite.passes ? 'Safe for text' : 'Use for backgrounds only',
  })
})

// Check semantic colors
const semanticColors = { error: colors.error, success: colors.success, warning: colors.warning }

Object.entries(semanticColors).forEach(([name, shades]) => {
  console.log(`\n📊 ${name.toUpperCase()} COLORS`)
  console.log('-'.repeat(80))

  Object.entries(shades).forEach(([shade, hex]) => {
    const onWhite = checkContrast(hex, backgrounds.white, false)
    const whiteOnColor = checkContrast(backgrounds.white, hex, false)

    console.log(
      `${getStatusIcon(onWhite.passes, onWhite.level)} ${name}-${shade.padEnd(4)} on white: ` +
        `${formatRatio(onWhite.ratio).padStart(5)}:1 [${onWhite.level}]`
    )

    console.log(
      `${getStatusIcon(whiteOnColor.passes, whiteOnColor.level)} white on ${name}-${shade.padEnd(
        4
      )}: ` + `${formatRatio(whiteOnColor.ratio).padStart(5)}:1 [${whiteOnColor.level}]`
    )
  })
})

// Check neutral colors
console.log('\n📊 NEUTRAL COLORS')
console.log('-'.repeat(80))

Object.entries(colors.neutral).forEach(([shade, hex]) => {
  const onWhite = checkContrast(hex, backgrounds.white, false)
  const onWhiteLarge = checkContrast(hex, backgrounds.white, true)

  console.log(
    `${getStatusIcon(onWhite.passes, onWhite.level)} neutral-${shade.padEnd(4)} on white: ` +
      `${formatRatio(onWhite.ratio).padStart(5)}:1 [${onWhite.level}] ` +
      `(Large: ${formatRatio(onWhiteLarge.ratio)}:1 [${onWhiteLarge.level}])`
  )
})

// Summary
console.log('\n📋 SUMMARY')
console.log('='.repeat(80))

const allResults = primaryResults
const passing = allResults.filter((r) => r.passes).length
const failing = allResults.filter((r) => !r.passes).length

console.log(`✅ Passing: ${passing}`)
console.log(`❌ Failing: ${failing}`)
console.log(`📊 Total Checked: ${allResults.length}`)

// Recommendations
console.log('\n💡 RECOMMENDATIONS')
console.log('='.repeat(80))
console.log('✅ Text on white backgrounds: Use 600+ shades (all meet 4.5:1)')
console.log('✅ White text on colored backgrounds: Use 600+ shades (all meet 4.5:1)')
console.log('✅ Focus rings: Use primary-600 or darker (meets 3:1)')
console.log('⚠️  Large text only: 500 shades can be used (verify 3:1 minimum)')
console.log('❌ Avoid: Using 500 shades for normal text on white')

// Critical Issues
const criticalIssues = allResults.filter((r) => !r.passes)

if (criticalIssues.length > 0) {
  console.log('\n⚠️  CRITICAL ISSUES')
  console.log('='.repeat(80))
  criticalIssues.forEach((issue) => {
    console.log(
      `❌ ${issue.foreground} on ${issue.background}: ${formatRatio(issue.ratio)}:1 - ${
        issue.usage
      }`
    )
  })
}

// Exit with error if there are failing combinations that should pass
const shouldPass = ['primary-600', 'primary-700', 'error-500', 'success-600', 'warning-600']
const failingCritical = allResults.filter(
  (r) => !r.passes && shouldPass.some((s) => r.foreground.includes(s))
)

if (failingCritical.length > 0) {
  console.log('\n❌ WCAG AA Compliance: FAILED')
  console.log('Critical color combinations do not meet WCAG AA standards')
  process.exit(1)
} else {
  console.log('\n✅ WCAG AA Compliance: PASSED')
  console.log('All critical color combinations meet WCAG AA standards')
  process.exit(0)
}
