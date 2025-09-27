import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { fn } from '@storybook/addon-actions'

import { Textarea } from './Textarea'

const meta = {
  title: 'UI/Textarea',
  component: Textarea,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: 'A flexible textarea component with validation states, character counting, resizing options, and comprehensive accessibility features.',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: { type: 'select' },
      options: ['default', 'error', 'success'],
      description: 'Visual state of the textarea',
    },
    resize: {
      control: { type: 'select' },
      options: ['none', 'vertical', 'horizontal', 'both'],
      description: 'Resize behavior of the textarea',
    },
    disabled: {
      control: { type: 'boolean' },
      description: 'Disable the textarea',
    },
    required: {
      control: { type: 'boolean' },
      description: 'Mark textarea as required',
    },
    showCharCount: {
      control: { type: 'boolean' },
      description: 'Show character count (requires maxLength)',
    },
    label: {
      control: { type: 'text' },
      description: 'Textarea label text',
    },
    placeholder: {
      control: { type: 'text' },
      description: 'Placeholder text',
    },
    helperText: {
      control: { type: 'text' },
      description: 'Helper text displayed below textarea',
    },
    errorMessage: {
      control: { type: 'text' },
      description: 'Error message (overrides helperText)',
    },
    rows: {
      control: { type: 'number', min: 1, max: 20 },
      description: 'Number of visible text lines',
    },
    maxLength: {
      control: { type: 'number' },
      description: 'Maximum character limit',
    },
  },
  args: {
    onChange: fn(),
    onFocus: fn(),
    onBlur: fn(),
  },
  decorators: [
    (Story) => (
      <div className="w-96">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof Textarea>

export default meta
type Story = StoryObj<typeof meta>

// Basic States
export const Default: Story = {
  args: {
    placeholder: 'Enter your message...',
    rows: 4,
  },
}

export const WithLabel: Story = {
  args: {
    label: 'Message',
    placeholder: 'Type your message here...',
    rows: 4,
    id: 'message',
  },
}

export const Required: Story = {
  args: {
    label: 'Feedback',
    placeholder: 'Please share your thoughts...',
    required: true,
    rows: 4,
    id: 'feedback',
  },
}

// Character Counting
export const WithCharCount: Story = {
  args: {
    label: 'Bio',
    placeholder: 'Tell us about yourself...',
    helperText: 'Keep it concise and engaging',
    showCharCount: true,
    maxLength: 150,
    rows: 4,
    id: 'bio',
  },
}

// Real-world Examples
export const BabyUpdate: Story = {
  args: {
    label: 'Update Description',
    placeholder: 'Share what happened today...',
    helperText: 'Describe milestones, activities, or special moments',
    showCharCount: true,
    maxLength: 500,
    rows: 5,
    required: true,
    id: 'update-description',
  },
}