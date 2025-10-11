import { render, screen, fireEvent, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { IconOptionSelector, type IconOption } from '../IconOptionSelector'

// Mock icon component
const MockIcon = () => <svg data-testid="mock-icon" />

describe('IconOptionSelector', () => {
  const mockOptions: IconOption[] = [
    { value: 'option1', label: 'Option 1', description: 'First option', icon: <MockIcon /> },
    { value: 'option2', label: 'Option 2', description: 'Second option', icon: <MockIcon /> },
    { value: 'option3', label: 'Option 3', description: 'Third option', icon: <MockIcon /> },
  ]

  describe('Single Select Mode', () => {
    it('renders all options', () => {
      render(
        <IconOptionSelector
          options={mockOptions}
          value="option1"
          onChange={() => {}}
          mode="single"
        />
      )

      expect(screen.getByText('Option 1')).toBeInTheDocument()
      expect(screen.getByText('Option 2')).toBeInTheDocument()
      expect(screen.getByText('Option 3')).toBeInTheDocument()
    })

    it('shows selected state correctly', () => {
      render(
        <IconOptionSelector
          options={mockOptions}
          value="option2"
          onChange={() => {}}
          mode="single"
        />
      )

      const option2 = screen.getByRole('radio', { name: /option 2/i })
      expect(option2).toHaveAttribute('aria-checked', 'true')
    })

    it('calls onChange when option is clicked', async () => {
      const handleChange = jest.fn()
      const user = userEvent.setup()

      render(
        <IconOptionSelector
          options={mockOptions}
          value="option1"
          onChange={handleChange}
          mode="single"
        />
      )

      await user.click(screen.getByRole('radio', { name: /option 2/i }))
      expect(handleChange).toHaveBeenCalledWith('option2')
    })

    it('renders with radiogroup role', () => {
      render(
        <IconOptionSelector
          options={mockOptions}
          value="option1"
          onChange={() => {}}
          mode="single"
          ariaLabel="Test selector"
        />
      )

      expect(screen.getByRole('radiogroup', { name: 'Test selector' })).toBeInTheDocument()
    })
  })

  describe('Multi Select Mode', () => {
    it('renders with group role', () => {
      render(
        <IconOptionSelector
          options={mockOptions}
          value={['option1']}
          onChange={() => {}}
          mode="multi"
          ariaLabel="Test selector"
        />
      )

      expect(screen.getByRole('group', { name: 'Test selector' })).toBeInTheDocument()
    })

    it('shows multiple selected states correctly', () => {
      render(
        <IconOptionSelector
          options={mockOptions}
          value={['option1', 'option3']}
          onChange={() => {}}
          mode="multi"
        />
      )

      const option1 = screen.getByRole('checkbox', { name: /option 1/i })
      const option2 = screen.getByRole('checkbox', { name: /option 2/i })
      const option3 = screen.getByRole('checkbox', { name: /option 3/i })

      expect(option1).toHaveAttribute('aria-checked', 'true')
      expect(option2).toHaveAttribute('aria-checked', 'false')
      expect(option3).toHaveAttribute('aria-checked', 'true')
    })

    it('toggles selection when clicked', async () => {
      const handleChange = jest.fn()
      const user = userEvent.setup()

      render(
        <IconOptionSelector
          options={mockOptions}
          value={['option1']}
          onChange={handleChange}
          mode="multi"
        />
      )

      // Click to add option2
      await user.click(screen.getByRole('checkbox', { name: /option 2/i }))
      expect(handleChange).toHaveBeenCalledWith(['option1', 'option2'])

      // Click to remove option1
      handleChange.mockClear()
      await user.click(screen.getByRole('checkbox', { name: /option 1/i }))
      expect(handleChange).toHaveBeenCalledWith([])
    })
  })

  describe('Icons and Emojis', () => {
    it('renders icons when provided', () => {
      render(
        <IconOptionSelector
          options={mockOptions}
          value="option1"
          onChange={() => {}}
          mode="single"
        />
      )

      const icons = screen.getAllByTestId('mock-icon')
      expect(icons).toHaveLength(3)
    })

    it('renders emojis when provided', () => {
      const emojiOptions: IconOption[] = [
        { value: 'opt1', label: 'Opt 1', emoji: '📸' },
        { value: 'opt2', label: 'Opt 2', emoji: '📝' },
      ]

      render(
        <IconOptionSelector
          options={emojiOptions}
          value="opt1"
          onChange={() => {}}
          mode="single"
        />
      )

      expect(screen.getByText('📸')).toBeInTheDocument()
      expect(screen.getByText('📝')).toBeInTheDocument()
    })
  })

  describe('Descriptions', () => {
    it('shows descriptions by default', () => {
      render(
        <IconOptionSelector
          options={mockOptions}
          value="option1"
          onChange={() => {}}
          mode="single"
        />
      )

      expect(screen.getByText('First option')).toBeInTheDocument()
      expect(screen.getByText('Second option')).toBeInTheDocument()
      expect(screen.getByText('Third option')).toBeInTheDocument()
    })

    it('hides descriptions when showDescription is false', () => {
      render(
        <IconOptionSelector
          options={mockOptions}
          value="option1"
          onChange={() => {}}
          mode="single"
          showDescription={false}
        />
      )

      expect(screen.queryByText('First option')).not.toBeInTheDocument()
      expect(screen.queryByText('Second option')).not.toBeInTheDocument()
      expect(screen.queryByText('Third option')).not.toBeInTheDocument()
    })
  })

  describe('Disabled State', () => {
    it('disables all options when disabled prop is true', () => {
      render(
        <IconOptionSelector
          options={mockOptions}
          value="option1"
          onChange={() => {}}
          mode="single"
          disabled
        />
      )

      const buttons = screen.getAllByRole('radio')
      buttons.forEach(button => {
        expect(button).toBeDisabled()
        expect(button).toHaveAttribute('aria-disabled', 'true')
      })
    })

    it('disables individual options when option.disabled is true', () => {
      const optionsWithDisabled: IconOption[] = [
        { value: 'option1', label: 'Option 1', icon: <MockIcon /> },
        { value: 'option2', label: 'Option 2', icon: <MockIcon />, disabled: true },
        { value: 'option3', label: 'Option 3', icon: <MockIcon /> },
      ]

      render(
        <IconOptionSelector
          options={optionsWithDisabled}
          value="option1"
          onChange={() => {}}
          mode="single"
        />
      )

      const option2 = screen.getByRole('radio', { name: /option 2/i })
      expect(option2).toBeDisabled()
    })

    it('does not call onChange when disabled option is clicked', async () => {
      const handleChange = jest.fn()
      const user = userEvent.setup()

      const optionsWithDisabled: IconOption[] = [
        { value: 'option1', label: 'Option 1', icon: <MockIcon /> },
        { value: 'option2', label: 'Option 2', icon: <MockIcon />, disabled: true },
      ]

      render(
        <IconOptionSelector
          options={optionsWithDisabled}
          value="option1"
          onChange={handleChange}
          mode="single"
        />
      )

      await user.click(screen.getByRole('radio', { name: /option 2/i }))
      expect(handleChange).not.toHaveBeenCalled()
    })
  })

  describe('Keyboard Navigation', () => {
    it('supports Enter key to select option', async () => {
      const handleChange = jest.fn()
      const user = userEvent.setup()

      render(
        <IconOptionSelector
          options={mockOptions}
          value="option1"
          onChange={handleChange}
          mode="single"
        />
      )

      const option2 = screen.getByRole('radio', { name: /option 2/i })
      option2.focus()
      await user.keyboard('{Enter}')

      expect(handleChange).toHaveBeenCalledWith('option2')
    })

    it('supports Space key to select option', async () => {
      const handleChange = jest.fn()
      const user = userEvent.setup()

      render(
        <IconOptionSelector
          options={mockOptions}
          value="option1"
          onChange={handleChange}
          mode="single"
        />
      )

      const option2 = screen.getByRole('radio', { name: /option 2/i })
      option2.focus()
      await user.keyboard(' ')

      expect(handleChange).toHaveBeenCalledWith('option2')
    })

    it('sets correct tabIndex (first option is 0, others are -1)', () => {
      render(
        <IconOptionSelector
          options={mockOptions}
          value="option1"
          onChange={() => {}}
          mode="single"
        />
      )

      const buttons = screen.getAllByRole('radio')
      expect(buttons[0]).toHaveAttribute('tabindex', '0')
      expect(buttons[1]).toHaveAttribute('tabindex', '-1')
      expect(buttons[2]).toHaveAttribute('tabindex', '-1')
    })
  })

  describe('Badges', () => {
    it('renders badges when provided', () => {
      const badges = {
        option2: <span data-testid="badge">Default</span>,
      }

      render(
        <IconOptionSelector
          options={mockOptions}
          value="option1"
          onChange={() => {}}
          mode="single"
          badges={badges}
        />
      )

      expect(screen.getByTestId('badge')).toBeInTheDocument()
      expect(screen.getByText('Default')).toBeInTheDocument()
    })
  })

  describe('Selection Indicator', () => {
    it('shows checkmark indicator on selected option', () => {
      render(
        <IconOptionSelector
          options={mockOptions}
          value="option2"
          onChange={() => {}}
          mode="single"
        />
      )

      const option2Button = screen.getByRole('radio', { name: /option 2/i })
      // Check that the selected option has the proper styling classes
      expect(option2Button).toHaveClass('border-primary-600', 'bg-primary-50')

      // Check for the checkmark indicator div within the button
      const checkmarkContainer = option2Button.querySelector('.absolute.top-2.right-2')
      expect(checkmarkContainer).toBeInTheDocument()
    })
  })

  describe('Accessibility', () => {
    it('has proper ARIA attributes for single select', () => {
      render(
        <IconOptionSelector
          options={mockOptions}
          value="option1"
          onChange={() => {}}
          mode="single"
          ariaLabel="Test selector"
        />
      )

      const radiogroup = screen.getByRole('radiogroup')
      expect(radiogroup).toHaveAttribute('aria-label', 'Test selector')

      const radios = screen.getAllByRole('radio')
      radios.forEach(radio => {
        expect(radio).toHaveAttribute('aria-checked')
      })
    })

    it('has proper ARIA attributes for multi select', () => {
      render(
        <IconOptionSelector
          options={mockOptions}
          value={['option1']}
          onChange={() => {}}
          mode="multi"
          ariaLabel="Test selector"
        />
      )

      const group = screen.getByRole('group')
      expect(group).toHaveAttribute('aria-label', 'Test selector')

      const checkboxes = screen.getAllByRole('checkbox')
      checkboxes.forEach(checkbox => {
        expect(checkbox).toHaveAttribute('aria-checked')
      })
    })
  })

  describe('Grid Layout', () => {
    it('applies correct grid classes', () => {
      const { container } = render(
        <IconOptionSelector
          options={mockOptions}
          value="option1"
          onChange={() => {}}
          mode="single"
          columns={{ mobile: 1, tablet: 2, desktop: 3 }}
        />
      )

      const grid = container.querySelector('.grid')
      expect(grid).toHaveClass('grid-cols-1')
      expect(grid).toHaveClass('sm:grid-cols-2')
      expect(grid).toHaveClass('lg:grid-cols-3')
    })
  })

  describe('Size Variants', () => {
    it('applies small size classes', () => {
      render(
        <IconOptionSelector
          options={mockOptions}
          value="option1"
          onChange={() => {}}
          mode="single"
          size="sm"
        />
      )

      const button = screen.getByRole('radio', { name: /option 1/i })
      expect(button).toHaveClass('p-3')
    })

    it('applies medium size classes', () => {
      render(
        <IconOptionSelector
          options={mockOptions}
          value="option1"
          onChange={() => {}}
          mode="single"
          size="md"
        />
      )

      const button = screen.getByRole('radio', { name: /option 1/i })
      expect(button).toHaveClass('p-4')
    })

    it('applies large size classes', () => {
      render(
        <IconOptionSelector
          options={mockOptions}
          value="option1"
          onChange={() => {}}
          mode="single"
          size="lg"
        />
      )

      const button = screen.getByRole('radio', { name: /option 1/i })
      expect(button).toHaveClass('p-5')
    })
  })
})
