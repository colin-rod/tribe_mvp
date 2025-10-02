# Visual Regression Testing Guide

This guide explains how to use and maintain the visual regression testing system for the Tribe MVP design system.

## Overview

Visual regression testing automatically detects unintended visual changes to UI components by comparing screenshots before and after code changes. This ensures design consistency across the application.

## Table of Contents

- [Quick Start](#quick-start)
- [Architecture](#architecture)
- [Writing Visual Tests](#writing-visual-tests)
- [Running Tests](#running-tests)
- [Approving Changes](#approving-changes)
- [CI/CD Integration](#cicd-integration)
- [Best Practices](#best-practices)
- [Troubleshooting](#troubleshooting)

## Quick Start

### Prerequisites

- Node.js 18+ installed
- Storybook stories created for your components
- Playwright installed (already included in dev dependencies)

### Initial Setup

1. **Install Playwright browsers** (first time only):
   ```bash
   npx playwright install
   ```

2. **Generate baseline screenshots**:
   ```bash
   npm run test:visual:update
   ```

3. **Run visual tests**:
   ```bash
   npm run test:visual
   ```

## Architecture

### Technology Stack

- **Playwright**: Browser automation and screenshot testing
- **Storybook**: Component isolation and story management
- **GitHub Actions**: CI/CD automation

### Directory Structure

```
tribe_mvp/
├── tests/
│   └── visual/
│       ├── ui-components.spec.ts      # UI component tests
│       ├── child-card.spec.ts         # ChildCard tests
│       ├── update-card.spec.ts        # UpdateCard tests
│       └── helpers.ts                 # Testing utilities
├── playwright.config.ts               # Playwright configuration
└── .github/
    └── workflows/
        └── ci.yml                     # CI/CD with visual tests
```

### How It Works

1. **Storybook** runs and serves component stories
2. **Playwright** navigates to each story
3. Screenshots are captured and compared to baselines
4. Visual differences are flagged as test failures
5. Developers review and approve intentional changes

## Writing Visual Tests

### Basic Test Structure

```typescript
import { test, expect } from '@playwright/test'

test.describe('Component Visual Regression', () => {
  test('should match snapshot for component variant', async ({ page }) => {
    // Navigate to story
    await page.goto('http://localhost:6006/iframe.html?id=ui-button--default')

    // Wait for content to load
    await page.waitForLoadState('networkidle')

    // Take screenshot and compare
    await expect(page).toHaveScreenshot('button-default.png')
  })
})
```

### Using Helper Functions

We provide helper functions in `tests/visual/helpers.ts`:

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

### Testing Component States

Test all component states:

```typescript
test.describe('Button States', () => {
  test('default state', async ({ page }) => {
    await testStory(page, 'ui-button--default', 'button-default.png')
  })

  test('hover state', async ({ page }) => {
    await testStory(page, 'ui-button--hover', 'button-hover.png')
  })

  test('disabled state', async ({ page }) => {
    await testStory(page, 'ui-button--disabled', 'button-disabled.png')
  })

  test('loading state', async ({ page }) => {
    await testStory(page, 'ui-button--loading', 'button-loading.png')
  })
})
```

### Responsive Testing

Test across different viewports:

```typescript
import { VIEWPORTS } from './helpers'

test('should be responsive', async ({ page }) => {
  for (const [device, viewport] of Object.entries(VIEWPORTS)) {
    await page.setViewportSize(viewport)
    await testStory(
      page,
      'ui-button--default',
      `button-default-${device}.png`
    )
  }
})
```

## Running Tests

### Local Development

```bash
# Run all visual tests
npm run test:visual

# Run with UI mode (recommended for development)
npm run test:visual:ui

# Run in debug mode
npm run test:visual:debug

# Run specific test file
npx playwright test tests/visual/ui-components.spec.ts

# Run tests for specific component
npx playwright test --grep "Button"
```

### Viewing Results

```bash
# Open test report
npm run test:visual:report

# View screenshots in test-results/
ls test-results/
```

## Approving Changes

### When Tests Fail

Visual tests fail when screenshots don't match baselines. This can happen for two reasons:

1. **Unintended change**: A bug or unexpected visual regression
2. **Intentional change**: A design update or feature enhancement

### Reviewing Changes

1. **View the differences**:
   ```bash
   npm run test:visual:report
   ```

2. **Examine the visual diff**:
   - Open the HTML report
   - Click on failed tests
   - Compare actual vs. expected screenshots
   - Look at the difference highlight

3. **Make a decision**:
   - ❌ **Reject**: Fix the code causing unintended changes
   - ✅ **Accept**: Update baselines for intentional changes

### Updating Baselines

If changes are intentional:

```bash
# Update all baselines
npm run test:visual:update

# Update specific test
npx playwright test tests/visual/ui-components.spec.ts --update-snapshots

# Update only failing tests
npx playwright test --update-snapshots --grep "Button"
```

**⚠️ Important**: Always review changes carefully before updating baselines!

### Workflow for Approving Changes

1. Make design changes to component
2. Run visual tests: `npm run test:visual`
3. Review failures in report: `npm run test:visual:report`
4. If intentional, update baselines: `npm run test:visual:update`
5. Commit updated screenshots to git
6. Create PR with visual changes documented

## CI/CD Integration

### GitHub Actions Workflow

Visual regression tests run automatically on:
- Every push to `main` or `development`
- Every pull request

### Viewing CI Results

1. Navigate to **Actions** tab on GitHub
2. Select the workflow run
3. Download artifacts:
   - `playwright-report`: HTML test report
   - `visual-test-results`: Screenshots and diffs

### Handling Failures in CI

If visual tests fail in CI:

1. Download test artifacts from GitHub Actions
2. Review the HTML report locally
3. Fix issues or update baselines
4. Push changes to branch

### Baseline Management in CI

- Baselines are stored in git at `tests/visual/**/*.png`
- CI compares against committed baselines
- Update baselines locally and commit to git
- Never update baselines directly in CI

## Best Practices

### Component Story Guidelines

1. **Create comprehensive stories**: Cover all variants and states
2. **Use consistent naming**: Follow Storybook naming conventions
3. **Isolate components**: Avoid external dependencies in stories
4. **Document props**: Use argTypes for better documentation

### Visual Test Guidelines

1. **Test all variants**: Each component variant needs a test
2. **Test interactive states**: Hover, focus, active, disabled
3. **Test edge cases**: Empty states, long content, error states
4. **Use meaningful names**: Screenshot names should be descriptive

### Performance Optimization

1. **Disable animations**: Set `animations: 'disabled'` in config
2. **Wait for stability**: Use `waitForLoadState('networkidle')`
3. **Parallelize tests**: Configure workers in `playwright.config.ts`
4. **Use specific viewports**: Don't test every viewport for every component

### Maintenance

1. **Review regularly**: Check for outdated baselines
2. **Clean up**: Remove tests for deleted components
3. **Update dependencies**: Keep Playwright up to date
4. **Monitor flakiness**: Investigate unstable tests

## Troubleshooting

### Common Issues

#### Tests are flaky

**Symptoms**: Tests pass/fail randomly

**Solutions**:
- Increase wait times in test configuration
- Disable animations more aggressively
- Check for dynamic content (dates, random IDs)
- Ensure fonts are loaded before screenshots

```typescript
// Add more wait time
await page.waitForLoadState('networkidle')
await page.waitForTimeout(1000) // Wait for fonts
```

#### Screenshots differ across machines

**Symptoms**: Tests pass locally but fail in CI (or vice versa)

**Solutions**:
- Generate baselines in CI environment
- Use consistent font rendering settings
- Disable sub-pixel antialiasing
- Check for environment-specific content

```typescript
// In playwright.config.ts
expect: {
  toHaveScreenshot: {
    maxDiffPixels: 100,
    threshold: 0.2,
  },
}
```

#### Storybook not starting

**Symptoms**: Tests timeout waiting for Storybook

**Solutions**:
- Check Storybook builds successfully: `npm run build-storybook`
- Increase timeout in `playwright.config.ts`
- Verify port 6006 is available
- Check for build errors in Storybook

```bash
# Test Storybook manually
npm run storybook
# Visit http://localhost:6006
```

#### Large baseline files

**Symptoms**: Git repository grows large

**Solutions**:
- Use Git LFS for screenshot storage
- Compress PNG files
- Test only critical viewports
- Consider external screenshot storage service

### Getting Help

- Review [Playwright documentation](https://playwright.dev)
- Check existing test examples in `tests/visual/`
- Ask in team chat or create an issue
- Review test reports for detailed error information

## Reference

### Available npm Scripts

```bash
npm run test:visual          # Run all visual tests
npm run test:visual:ui       # Run tests with UI mode
npm run test:visual:update   # Update baseline screenshots
npm run test:visual:debug    # Run tests in debug mode
npm run test:visual:report   # Open HTML test report
```

### Configuration Files

- `playwright.config.ts`: Main Playwright configuration
- `tests/visual/helpers.ts`: Shared testing utilities
- `.github/workflows/ci.yml`: CI/CD integration

### Key Metrics

- **Coverage**: All UI components should have visual tests
- **Stability**: <5% flaky test rate acceptable
- **Performance**: Visual tests should run in <10 minutes

---

**Last Updated**: October 2025
**Issue**: [CRO-161](https://linear.app/tribe/issue/CRO-161) - Testing: Implement Visual Regression Testing for Design System
