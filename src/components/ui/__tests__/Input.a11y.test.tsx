/**
 * Input Component - Accessibility Tests
 *
 * Tests WCAG 2.1 AA compliance for the Input component
 */

import { render } from '@testing-library/react'
import { axe } from '@/__tests__/setup/axe'
import { Input } from '../Input'

describe('Input Accessibility', () => {
  it('should have no accessibility violations with default props', async () => {
    const { container } = render(<Input placeholder="Enter text" />)
    const results = await axe(container)
    expect(results).toHaveNoViolations()
  })

  it('should have no violations with label', async () => {
    const { container } = render(
      <Input label="Email Address" type="email" />
    )
    const results = await axe(container)
    expect(results).toHaveNoViolations()
  })

  it('should have no violations with error message', async () => {
    const { container } = render(
      <Input
        label="Email"
        errorMessage="Please enter a valid email"
        type="email"
      />
    )
    const results = await axe(container)
    expect(results).toHaveNoViolations()
  })

  it('should have no violations with helper text', async () => {
    const { container } = render(
      <Input
        label="Password"
        helperText="Must be at least 8 characters"
        type="password"
      />
    )
    const results = await axe(container)
    expect(results).toHaveNoViolations()
  })

  it('should properly associate label with input', () => {
    const { getByLabelText } = render(
      <Input label="Username" id="username" />
    )

    const input = getByLabelText('Username')
    expect(input).toBeInTheDocument()
    expect(input).toHaveAttribute('id', 'username')
  })

  it('should have aria-invalid when in error state', () => {
    const { getByRole } = render(
      <Input errorMessage="Error" />
    )

    const input = getByRole('textbox')
    expect(input).toHaveAttribute('aria-invalid', 'true')
  })

  it('should have aria-required when required', () => {
    const { getByRole } = render(
      <Input label="Email" required />
    )

    const input = getByRole('textbox')
    expect(input).toHaveAttribute('aria-required', 'true')
  })

  it('should link error message with aria-describedby', () => {
    const { getByRole, getByText } = render(
      <Input
        id="email"
        label="Email"
        errorMessage="Invalid email"
      />
    )

    const input = getByRole('textbox')
    const errorMessage = getByText('Invalid email')

    expect(input).toHaveAttribute('aria-describedby')
    expect(input.getAttribute('aria-describedby')).toContain(errorMessage.id)
  })

  it('should link helper text with aria-describedby', () => {
    const { getByRole, getByText } = render(
      <Input
        id="password"
        label="Password"
        helperText="At least 8 characters"
      />
    )

    const input = getByRole('textbox')
    const helperText = getByText('At least 8 characters')

    expect(input).toHaveAttribute('aria-describedby')
    expect(input.getAttribute('aria-describedby')).toContain(helperText.id)
  })

  it('should have role="alert" for error messages', () => {
    const { getByRole } = render(
      <Input
        label="Email"
        errorMessage="This field is required"
      />
    )

    const alert = getByRole('alert')
    expect(alert).toHaveTextContent('This field is required')
  })

  it('should meet minimum touch target size', () => {
    const { getByRole } = render(<Input />)
    const input = getByRole('textbox')

    const styles = window.getComputedStyle(input)
    const height = parseInt(styles.height)

    // Minimum 44px for WCAG 2.1 AA
    expect(height).toBeGreaterThanOrEqual(44)
  })

  it('should have accessible password toggle button', () => {
    const { getByRole } = render(
      <Input type="password" showPassword />
    )

    const toggleButton = getByRole('button')
    expect(toggleButton).toHaveAttribute('aria-label')
  })

  describe('Required field indicator', () => {
    it('should hide asterisk from screen readers', () => {
      const { container } = render(
        <Input label="Email" required />
      )

      const asterisk = container.querySelector('[aria-hidden="true"]')
      expect(asterisk).toHaveTextContent('*')
    })

    it('should have screen reader text for required', () => {
      const { container } = render(
        <Input label="Email" required />
      )

      const srText = container.querySelector('.sr-only')
      expect(srText).toHaveTextContent('required')
    })
  })
})
