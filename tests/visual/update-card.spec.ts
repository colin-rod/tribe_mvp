import { test, expect } from '@playwright/test'

/**
 * Visual Regression Tests for UpdateCard Component
 *
 * Tests all variants and states of the UpdateCard component
 */

const STORYBOOK_URL = process.env.STORYBOOK_URL || 'http://localhost:6006'

async function testStory(
  page: any,
  story: string,
  screenshotName: string,
  options: { waitFor?: string; timeout?: number } = {}
) {
  await page.goto(`${STORYBOOK_URL}/iframe.html?id=${story}&viewMode=story`, {
    waitUntil: 'networkidle',
  })

  await page.waitForLoadState('networkidle')

  if (options.waitFor) {
    await page.waitForSelector(options.waitFor, {
      timeout: options.timeout || 5000
    })
  }

  await page.waitForTimeout(500)

  await expect(page).toHaveScreenshot(screenshotName, {
    fullPage: false,
    animations: 'disabled',
  })
}

test.describe('UpdateCard Component Visual Regression', () => {
  test('should match snapshot for basic update card', async ({ page }) => {
    await testStory(
      page,
      'components-updates-updatecard--basic',
      'update-card-basic.png'
    )
  })

  test('should match snapshot for update card with media', async ({ page }) => {
    await testStory(
      page,
      'components-updates-updatecard--with-media',
      'update-card-with-media.png'
    )
  })

  test('should match snapshot for update card with rich text', async ({ page }) => {
    await testStory(
      page,
      'components-updates-updatecard--with-rich-text',
      'update-card-with-rich-text.png'
    )
  })
})
