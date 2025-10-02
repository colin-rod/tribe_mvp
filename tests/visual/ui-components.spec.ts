import { test, expect } from '@playwright/test'

/**
 * Visual Regression Tests for UI Components
 *
 * These tests capture screenshots of all component variants and states
 * to detect unintended visual changes.
 *
 * To update baselines after intentional changes:
 * npm run test:visual:update
 */

const STORYBOOK_URL = process.env.STORYBOOK_URL || 'http://localhost:6006'

/**
 * Helper function to navigate to a story and take a screenshot
 */
async function testStory(
  page: any,
  story: string,
  screenshotName: string,
  options: { waitFor?: string; timeout?: number } = {}
) {
  await page.goto(`${STORYBOOK_URL}/iframe.html?id=${story}&viewMode=story`, {
    waitUntil: 'networkidle',
  })

  // Wait for fonts and images to load
  await page.waitForLoadState('networkidle')

  // Optional additional wait for specific element
  if (options.waitFor) {
    await page.waitForSelector(options.waitFor, {
      timeout: options.timeout || 5000
    })
  }

  // Small delay to ensure animations are complete
  await page.waitForTimeout(500)

  // Take screenshot
  await expect(page).toHaveScreenshot(screenshotName, {
    fullPage: false,
    animations: 'disabled',
  })
}

test.describe('Button Component Visual Regression', () => {
  test('should match snapshot for all button variants', async ({ page }) => {
    await testStory(
      page,
      'ui-button--all-variants',
      'button-all-variants.png'
    )
  })

  test('should match snapshot for button sizes', async ({ page }) => {
    await testStory(
      page,
      'ui-button--sizes',
      'button-sizes.png'
    )
  })

  test('should match snapshot for default button', async ({ page }) => {
    await testStory(
      page,
      'ui-button--default',
      'button-default.png'
    )
  })

  test('should match snapshot for primary button', async ({ page }) => {
    await testStory(
      page,
      'ui-button--primary',
      'button-primary.png'
    )
  })

  test('should match snapshot for destructive button', async ({ page }) => {
    await testStory(
      page,
      'ui-button--destructive',
      'button-destructive.png'
    )
  })

  test('should match snapshot for loading button', async ({ page }) => {
    await testStory(
      page,
      'ui-button--loading',
      'button-loading.png'
    )
  })

  test('should match snapshot for disabled button', async ({ page }) => {
    await testStory(
      page,
      'ui-button--disabled',
      'button-disabled.png'
    )
  })

  test('should match snapshot for button with left icon', async ({ page }) => {
    await testStory(
      page,
      'ui-button--with-left-icon',
      'button-with-left-icon.png'
    )
  })

  test('should match snapshot for button with right icon', async ({ page }) => {
    await testStory(
      page,
      'ui-button--with-right-icon',
      'button-with-right-icon.png'
    )
  })
})

test.describe('Alert Component Visual Regression', () => {
  test('should match snapshot for all alert variants', async ({ page }) => {
    await testStory(
      page,
      'ui-alert--all-variants',
      'alert-all-variants.png'
    )
  })

  test('should match snapshot for default alert', async ({ page }) => {
    await testStory(
      page,
      'ui-alert--default',
      'alert-default.png'
    )
  })

  test('should match snapshot for info alert', async ({ page }) => {
    await testStory(
      page,
      'ui-alert--info',
      'alert-info.png'
    )
  })

  test('should match snapshot for success alert', async ({ page }) => {
    await testStory(
      page,
      'ui-alert--success',
      'alert-success.png'
    )
  })

  test('should match snapshot for warning alert', async ({ page }) => {
    await testStory(
      page,
      'ui-alert--warning',
      'alert-warning.png'
    )
  })

  test('should match snapshot for error alert', async ({ page }) => {
    await testStory(
      page,
      'ui-alert--error',
      'alert-error.png'
    )
  })

  test('should match snapshot for alerts with titles', async ({ page }) => {
    await testStory(
      page,
      'ui-alert--with-titles',
      'alert-with-titles.png'
    )
  })

  test('should match snapshot for dismissible alert', async ({ page }) => {
    await testStory(
      page,
      'ui-alert--dismissible',
      'alert-dismissible.png'
    )
  })

  test('should match snapshot for alert with custom icon', async ({ page }) => {
    await testStory(
      page,
      'ui-alert--custom-icon',
      'alert-custom-icon.png'
    )
  })
})

test.describe('Badge Component Visual Regression', () => {
  test('should match snapshot for default badge', async ({ page }) => {
    await testStory(
      page,
      'ui-badge--default',
      'badge-default.png'
    )
  })

  test('should match snapshot for all badge variants', async ({ page }) => {
    await testStory(
      page,
      'ui-badge--all-variants',
      'badge-all-variants.png'
    )
  })
})

test.describe('Card Component Visual Regression', () => {
  test('should match snapshot for basic card', async ({ page }) => {
    await testStory(
      page,
      'ui-card--basic',
      'card-basic.png'
    )
  })

  test('should match snapshot for card with header', async ({ page }) => {
    await testStory(
      page,
      'ui-card--with-header',
      'card-with-header.png'
    )
  })

  test('should match snapshot for card with footer', async ({ page }) => {
    await testStory(
      page,
      'ui-card--with-footer',
      'card-with-footer.png'
    )
  })
})

test.describe('Input Component Visual Regression', () => {
  test('should match snapshot for default input', async ({ page }) => {
    await testStory(
      page,
      'ui-input--default',
      'input-default.png'
    )
  })

  test('should match snapshot for input with label', async ({ page }) => {
    await testStory(
      page,
      'ui-input--with-label',
      'input-with-label.png'
    )
  })

  test('should match snapshot for disabled input', async ({ page }) => {
    await testStory(
      page,
      'ui-input--disabled',
      'input-disabled.png'
    )
  })

  test('should match snapshot for input with error', async ({ page }) => {
    await testStory(
      page,
      'ui-input--with-error',
      'input-with-error.png'
    )
  })
})

test.describe('Textarea Component Visual Regression', () => {
  test('should match snapshot for default textarea', async ({ page }) => {
    await testStory(
      page,
      'ui-textarea--default',
      'textarea-default.png'
    )
  })

  test('should match snapshot for textarea with label', async ({ page }) => {
    await testStory(
      page,
      'ui-textarea--with-label',
      'textarea-with-label.png'
    )
  })

  test('should match snapshot for disabled textarea', async ({ page }) => {
    await testStory(
      page,
      'ui-textarea--disabled',
      'textarea-disabled.png'
    )
  })
})

test.describe('LoadingSpinner Component Visual Regression', () => {
  test('should match snapshot for default spinner', async ({ page }) => {
    await testStory(
      page,
      'ui-loadingspinner--default',
      'loading-spinner-default.png'
    )
  })

  test('should match snapshot for all spinner sizes', async ({ page }) => {
    await testStory(
      page,
      'ui-loadingspinner--all-sizes',
      'loading-spinner-sizes.png'
    )
  })
})
