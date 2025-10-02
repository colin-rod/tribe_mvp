import { test, expect } from '@playwright/test'

/**
 * Visual Regression Tests for ChildCard Component
 *
 * Tests all variants and states of the ChildCard component
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

test.describe('ChildCard Component Visual Regression', () => {
  test('should match snapshot for default child card', async ({ page }) => {
    await testStory(
      page,
      'components-children-childcard--default',
      'child-card-default.png'
    )
  })

  test('should match snapshot for child card with image', async ({ page }) => {
    await testStory(
      page,
      'components-children-childcard--with-image',
      'child-card-with-image.png'
    )
  })

  test('should match snapshot for child card without image', async ({ page }) => {
    await testStory(
      page,
      'components-children-childcard--without-image',
      'child-card-without-image.png'
    )
  })
})
