/**
 * Button Component - Accessibility Tests
 *
 * Tests WCAG 2.1 AA compliance for the Button component
 */

import { render } from '@testing-library/react'
import { axe } from '@/__tests__/setup/axe'
import { Button } from '../Button'

describe('Button Accessibility', () => {
  it('should have no accessibility violations with default props', async () => {
    const { container } = render(<Button>Click me</Button>)
    const results = await axe(container)
    expect(results).toHaveNoViolations()
  })

  it('should have no violations when loading', async () => {
    const { container } = render(<Button loading>Loading</Button>)
    const results = await axe(container)
    expect(results).toHaveNoViolations()
  })

  it('should have no violations when disabled', async () => {
    const { container } = render(<Button disabled>Disabled</Button>)
    const results = await axe(container)
    expect(results).toHaveNoViolations()
  })

  it('should have no violations with icon only (requires aria-label)', async () => {
    const { container } = render(
      <Button size="icon" aria-label="Close">
        <span>×</span>
      </Button>
    )
    const results = await axe(container)
    expect(results).toHaveNoViolations()
  })

  it('should meet minimum touch target size (44x44px)', () => {
    const { getByRole } = render(<Button size="xs">Small</Button>)
    const button = getByRole('button')

    const styles = window.getComputedStyle(button)
    const height = parseInt(styles.height)

    // 11 * 4px = 44px (WCAG 2.1 AA minimum)
    expect(height).toBeGreaterThanOrEqual(44)
  })

  it('should have aria-busy when loading', () => {
    const { getByRole } = render(<Button loading>Loading</Button>)
    const button = getByRole('button')

    expect(button).toHaveAttribute('aria-busy', 'true')
  })

  it('should have aria-disabled when disabled', () => {
    const { getByRole } = render(<Button disabled>Disabled</Button>)
    const button = getByRole('button')

    expect(button).toHaveAttribute('aria-disabled', 'true')
    expect(button).toBeDisabled()
  })

  describe('Variants', () => {
    const variants = ['default', 'primary', 'destructive', 'outline', 'secondary', 'ghost', 'success', 'warning'] as const

    variants.forEach((variant) => {
      it(`should have no violations with variant="${variant}"`, async () => {
        const { container } = render(
          <Button variant={variant}>Button</Button>
        )
        const results = await axe(container)
        expect(results).toHaveNoViolations()
      })
    })
  })

  describe('Sizes', () => {
    const sizes = ['xs', 'sm', 'default', 'lg', 'xl', 'icon'] as const

    sizes.forEach((size) => {
      it(`should have no violations with size="${size}"`, async () => {
        const { container } = render(
          <Button size={size} aria-label={size === 'icon' ? 'Icon button' : undefined}>
            {size === 'icon' ? '✓' : 'Button'}
          </Button>
        )
        const results = await axe(container)
        expect(results).toHaveNoViolations()
      })
    })
  })
})
