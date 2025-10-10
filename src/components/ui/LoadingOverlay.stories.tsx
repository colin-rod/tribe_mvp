import type { Meta, StoryFn, StoryObj } from '@storybook/nextjs-vite'
import { LoadingOverlay, InlineLoadingOverlay } from './LoadingOverlay'

const meta: Meta<typeof LoadingOverlay> = {
  title: 'UI/LoadingOverlay',
  component: LoadingOverlay,
  subcomponents: { InlineLoadingOverlay },
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen'
  },
  argTypes: {
    visible: {
      control: 'boolean',
      description: 'Whether the overlay is visible'
    },
    message: {
      control: 'text',
      description: 'Message to display'
    },
    size: {
      control: 'select',
      options: ['sm', 'md', 'lg'],
      description: 'Spinner size'
    },
    blocking: {
      control: 'boolean',
      description: 'Whether to block interactions'
    },
    opacity: {
      control: { type: 'range', min: 0, max: 100, step: 10 },
      description: 'Opacity of overlay background (0-100)'
    },
    usePortal: {
      control: 'boolean',
      description: 'Use portal to render at document body level'
    }
  },
  decorators: [
    (Story: StoryFn) => (
      <div style={{ height: '400px', position: 'relative' }}>
        <div style={{ padding: '2rem' }}>
          <h2>Sample Content</h2>
          <p>This content will be blocked when the overlay is visible.</p>
          <button>Click me</button>
        </div>
        <Story />
      </div>
    )
  ]
}

export default meta
type Story = StoryObj<typeof LoadingOverlay>

export const Default: Story = {
  args: {
    visible: true
  }
}

export const WithMessage: Story = {
  args: {
    visible: true,
    message: 'Processing your request...'
  }
}

export const LargeSpinner: Story = {
  args: {
    visible: true,
    message: 'Uploading files...',
    size: 'lg'
  }
}

export const SmallSpinner: Story = {
  args: {
    visible: true,
    message: 'Loading...',
    size: 'sm'
  }
}

export const NonBlocking: Story = {
  args: {
    visible: true,
    message: 'Background task running...',
    blocking: false,
    opacity: 50
  }
}

export const HighOpacity: Story = {
  args: {
    visible: true,
    message: 'Processing...',
    opacity: 95
  }
}

export const LowOpacity: Story = {
  args: {
    visible: true,
    message: 'Syncing...',
    opacity: 30
  }
}

export const SavingData: Story = {
  args: {
    visible: true,
    message: 'Saving your changes...'
  }
}

export const UploadingFiles: Story = {
  args: {
    visible: true,
    message: 'Uploading 3 photos...',
    size: 'lg'
  }
}

type InlineStory = StoryObj<typeof InlineLoadingOverlay>

const renderInline: InlineStory['render'] = (args) => (
  <div
    style={{
      position: 'relative',
      height: '300px',
      padding: '2rem',
      border: '1px solid #e5e7eb',
      borderRadius: '8px'
    }}
  >
    <h3>Container Content</h3>
    <p>This content will be overlaid when loading.</p>
    <InlineLoadingOverlay {...args} />
  </div>
)

export const InlineDefault: InlineStory = {
  render: renderInline,
  args: {
    visible: true
  }
}

export const InlineWithMessage: InlineStory = {
  render: renderInline,
  args: {
    visible: true,
    message: 'Loading content...'
  }
}

export const InlineLarge: InlineStory = {
  render: renderInline,
  args: {
    visible: true,
    message: 'Processing...',
    size: 'lg'
  }
}
