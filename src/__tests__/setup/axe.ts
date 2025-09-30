/**
 * Jest Axe Setup
 *
 * Configures axe-core for automated accessibility testing in Jest.
 * This extends Jest matchers with toHaveNoViolations() for a11y testing.
 */

import { configureAxe, toHaveNoViolations } from 'jest-axe'

// Extend Jest matchers
expect.extend(toHaveNoViolations)

/**
 * Configure axe with project-specific rules
 *
 * You can customize which rules to run, their severity levels,
 * and which elements to exclude from testing.
 */
export const axe = configureAxe({
  rules: {
    // Ensure color contrast meets WCAG AA standards
    'color-contrast': { enabled: true },

    // Ensure labels are associated with form controls
    'label': { enabled: true },

    // Ensure buttons have accessible names
    'button-name': { enabled: true },

    // Ensure images have alt text
    'image-alt': { enabled: true },

    // Ensure ARIA attributes are valid
    'aria-valid-attr': { enabled: true },
    'aria-valid-attr-value': { enabled: true },

    // Ensure interactive elements are keyboard accessible
    'focus-order-semantics': { enabled: true },

    // Ensure landmark regions are used correctly
    'landmark-one-main': { enabled: true },
    'region': { enabled: true },
  },
})

/**
 * Helper function to test a component for accessibility violations
 *
 * @example
 * test('Button has no accessibility violations', async () => {
 *   const { container } = render(<Button>Click me</Button>)
 *   const results = await axeTest(container)
 *   expect(results).toHaveNoViolations()
 * })
 */
export async function axeTest(container: Element) {
  return await axe(container)
}

/**
 * Custom matcher type definitions for TypeScript
 */
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace jest {
    interface Matchers<R> {
      toHaveNoViolations(): R
    }
  }
}

export default axe
