import type { Meta, StoryObj } from '@storybook/nextjs'
import { ProgressBar, CircularProgress } from './ProgressBar'

const meta: Meta<typeof ProgressBar> = {
  title: 'UI/ProgressBar',
  component: ProgressBar,
  tags: ['autodocs'],
  argTypes: {
    value: {
      control: { type: 'range', min: 0, max: 100, step: 1 },
      description: 'Progress value between 0 and 100'
    },
    indeterminate: {
      control: 'boolean',
      description: 'Show indeterminate loading animation'
    },
    size: {
      control: 'select',
      options: ['sm', 'md', 'lg'],
      description: 'Size variant'
    },
    variant: {
      control: 'select',
      options: ['primary', 'success', 'warning', 'error'],
      description: 'Color variant'
    },
    showLabel: {
      control: 'boolean',
      description: 'Show percentage label'
    }
  }
}

export default meta
type Story = StoryObj<typeof ProgressBar>

export const Default: Story = {
  args: {
    value: 50
  }
}

export const WithLabel: Story = {
  args: {
    value: 75,
    showLabel: true
  }
}

export const CustomLabel: Story = {
  args: {
    value: 60,
    label: 'Uploading photo...'
  }
}

export const Indeterminate: Story = {
  args: {
    indeterminate: true,
    label: 'Loading...'
  }
}

export const Small: Story = {
  args: {
    value: 45,
    size: 'sm',
    showLabel: true
  }
}

export const Large: Story = {
  args: {
    value: 80,
    size: 'lg',
    showLabel: true
  }
}

export const Success: Story = {
  args: {
    value: 100,
    variant: 'success',
    label: 'Upload complete!'
  }
}

export const Warning: Story = {
  args: {
    value: 65,
    variant: 'warning',
    label: 'Storage almost full'
  }
}

export const Error: Story = {
  args: {
    value: 35,
    variant: 'error',
    label: 'Upload failed - retrying...'
  }
}

export const UploadProgress: Story = {
  args: {
    value: 42,
    variant: 'primary',
    size: 'md',
    label: 'Uploading family-photo.jpg',
    showLabel: true
  }
}

// Circular Progress Stories
const circularMeta: Meta<typeof CircularProgress> = {
  title: 'UI/CircularProgress',
  component: CircularProgress,
  tags: ['autodocs'],
  argTypes: {
    value: {
      control: { type: 'range', min: 0, max: 100, step: 1 }
    },
    indeterminate: {
      control: 'boolean'
    },
    size: {
      control: { type: 'number', min: 20, max: 200, step: 10 }
    },
    strokeWidth: {
      control: { type: 'number', min: 1, max: 10, step: 1 }
    },
    variant: {
      control: 'select',
      options: ['primary', 'success', 'warning', 'error']
    },
    showLabel: {
      control: 'boolean'
    }
  }
}

export const CircularDefault: StoryObj<typeof CircularProgress> = {
  ...circularMeta,
  args: {
    value: 50
  }
}

export const CircularWithLabel: StoryObj<typeof CircularProgress> = {
  ...circularMeta,
  args: {
    value: 75,
    showLabel: true,
    size: 64
  }
}

export const CircularIndeterminate: StoryObj<typeof CircularProgress> = {
  ...circularMeta,
  args: {
    indeterminate: true,
    size: 48
  }
}

export const CircularSuccess: StoryObj<typeof CircularProgress> = {
  ...circularMeta,
  args: {
    value: 100,
    variant: 'success',
    showLabel: true,
    size: 80
  }
}
