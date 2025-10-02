/**
 * Visual Regression Testing Helpers
 *
 * Utilities for consistent visual regression testing across components
 */

import type { Page } from '@playwright/test'

export const STORYBOOK_URL = process.env.STORYBOOK_URL || 'http://localhost:6006'

export interface TestStoryOptions {
  waitFor?: string
  timeout?: number
  fullPage?: boolean
  waitForAnimation?: number
}

/**
 * Navigate to a Storybook story and take a screenshot
 * @param page Playwright page instance
 * @param story Story ID (e.g., 'ui-button--default')
 * @param screenshotName Name for the screenshot file
 * @param options Additional options for waiting and screenshot
 */
export async function captureStorySnapshot(
  page: Page,
  story: string,
  screenshotName: string,
  options: TestStoryOptions = {}
) {
  const {
    waitFor,
    timeout = 5000,
    fullPage = false,
    waitForAnimation = 500,
  } = options

  // Navigate to story
  await page.goto(`${STORYBOOK_URL}/iframe.html?id=${story}&viewMode=story`, {
    waitUntil: 'networkidle',
  })

  // Wait for network to be idle
  await page.waitForLoadState('networkidle')

  // Wait for specific element if specified
  if (waitFor) {
    await page.waitForSelector(waitFor, { timeout })
  }

  // Wait for animations to complete
  await page.waitForTimeout(waitForAnimation)

  return page.screenshot({
    fullPage,
    animations: 'disabled',
  })
}

/**
 * Common viewport sizes for responsive testing
 */
export const VIEWPORTS = {
  mobile: { width: 375, height: 667 },
  tablet: { width: 768, height: 1024 },
  desktop: { width: 1920, height: 1080 },
} as const

/**
 * Test a story across multiple viewports
 */
export async function captureResponsiveSnapshots(
  page: Page,
  story: string,
  baseScreenshotName: string,
  options: TestStoryOptions = {}
) {
  const screenshots: Record<string, Buffer> = {}

  for (const [device, viewport] of Object.entries(VIEWPORTS)) {
    await page.setViewportSize(viewport)
    const screenshot = await captureStorySnapshot(
      page,
      story,
      `${baseScreenshotName}-${device}.png`,
      options
    )
    screenshots[device] = screenshot
  }

  return screenshots
}

/**
 * Navigate to story and interact before screenshot
 */
export async function captureInteractionSnapshot(
  page: Page,
  story: string,
  screenshotName: string,
  interaction: (page: Page) => Promise<void>,
  options: TestStoryOptions = {}
) {
  await page.goto(`${STORYBOOK_URL}/iframe.html?id=${story}&viewMode=story`, {
    waitUntil: 'networkidle',
  })

  await page.waitForLoadState('networkidle')

  // Wait for animations
  await page.waitForTimeout(options.waitForAnimation || 500)

  // Perform interaction
  await interaction(page)

  // Wait a bit for interaction effects
  await page.waitForTimeout(300)

  return page.screenshot({
    fullPage: options.fullPage || false,
    animations: 'disabled',
  })
}

/**
 * Component state testing helper
 * Tests hover, focus, active states
 */
export async function captureStateSnapshots(
  page: Page,
  story: string,
  selector: string,
  baseScreenshotName: string
) {
  await page.goto(`${STORYBOOK_URL}/iframe.html?id=${story}&viewMode=story`, {
    waitUntil: 'networkidle',
  })

  await page.waitForLoadState('networkidle')
  await page.waitForTimeout(500)

  const element = page.locator(selector).first()

  // Default state
  const defaultScreenshot = await page.screenshot({
    animations: 'disabled',
  })

  // Hover state
  await element.hover()
  await page.waitForTimeout(100)
  const hoverScreenshot = await page.screenshot({
    animations: 'disabled',
  })

  // Focus state
  await element.focus()
  await page.waitForTimeout(100)
  const focusScreenshot = await page.screenshot({
    animations: 'disabled',
  })

  return {
    default: defaultScreenshot,
    hover: hoverScreenshot,
    focus: focusScreenshot,
  }
}
