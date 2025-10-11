import type { Meta, StoryObj, Decorator } from '@storybook/nextjs-vite'
import { ProgressBar, CircularProgress } from './ProgressBar'

const paddedDecorator: Decorator = (Story) => (
  <div style={{ maxWidth: 480, padding: '2rem' }}>
    <Story />
  </div>
)

const meta: Meta<typeof ProgressBar> = {
  title: 'UI/ProgressBar',
  component: ProgressBar,
  subcomponents: { CircularProgress },
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
  },
  decorators: [paddedDecorator]
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

type CircularStory = StoryObj<typeof CircularProgress>

const renderCircular: CircularStory['render'] = (args) => (
  <div style={{ display: 'flex', justifyContent: 'center', padding: '2rem' }}>
    <CircularProgress {...args} />
  </div>
)

export const CircularDefault: CircularStory = {
  render: renderCircular,
  args: {
    value: 50
  }
}

export const CircularWithLabel: CircularStory = {
  render: renderCircular,
  args: {
    value: 75,
    showLabel: true,
    size: 64
  }
}

export const CircularIndeterminate: CircularStory = {
  render: renderCircular,
  args: {
    indeterminate: true,
    size: 48
  }
}

export const CircularSuccess: CircularStory = {
  render: renderCircular,
  args: {
    value: 100,
    variant: 'success',
    showLabel: true,
    size: 80
  }
}
