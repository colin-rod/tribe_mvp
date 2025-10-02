# Visual Regression Tests

Automated visual regression tests for the Tribe MVP design system components.

## Quick Start

```bash
# Install Playwright browsers (first time only)
npx playwright install

# Run visual tests
npm run test:visual

# Update baseline screenshots (after intentional visual changes)
npm run test:visual:update

# Run tests with interactive UI
npm run test:visual:ui
```

## Test Files

- `ui-components.spec.ts` - Tests for all UI components (Button, Alert, Badge, etc.)
- `child-card.spec.ts` - Tests for ChildCard component
- `update-card.spec.ts` - Tests for UpdateCard component
- `helpers.ts` - Shared testing utilities

## Writing Tests

### Basic Test

```typescript
import { test, expect } from '@playwright/test'

test('should match snapshot', async ({ page }) => {
  await page.goto('http://localhost:6006/iframe.html?id=ui-button--default')
  await page.waitForLoadState('networkidle')
  await expect(page).toHaveScreenshot('button-default.png')
})
```

### Using Helpers

```typescript
import { captureStorySnapshot } from './helpers'

test('should match snapshot', async ({ page }) => {
  await captureStorySnapshot(
    page,
    'ui-button--default',
    'button-default.png'
  )
})
```

## Viewing Results

```bash
# Open HTML report
npm run test:visual:report

# Check test-results/ directory for screenshots
ls test-results/
```

## Documentation

For complete documentation, see [docs/VISUAL_REGRESSION_TESTING.md](../../docs/VISUAL_REGRESSION_TESTING.md)

## CI/CD

Visual tests run automatically on every PR and push to main/development branches.

Test artifacts (reports and screenshots) are uploaded to GitHub Actions for review.
