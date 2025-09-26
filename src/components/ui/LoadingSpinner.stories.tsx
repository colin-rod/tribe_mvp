import type { Meta, StoryObj } from '@storybook/nextjs'

import { LoadingSpinner } from './LoadingSpinner'

const meta = {
  title: 'UI/LoadingSpinner',
  component: LoadingSpinner,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: 'A simple, accessible loading spinner component with multiple size variants. Features proper ARIA labels and screen reader support.',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    size: {
      control: { type: 'select' },
      options: ['sm', 'md', 'lg'],
      description: 'Size variant of the spinner',
    },
    className: {
      control: { type: 'text' },
      description: 'Additional CSS classes',
    },
  },
} satisfies Meta<typeof LoadingSpinner>

export default meta
type Story = StoryObj<typeof meta>

// Basic Sizes
export const Small: Story = {
  args: {
    size: 'sm',
  },
}

export const Medium: Story = {
  args: {
    size: 'md',
  },
}

export const Large: Story = {
  args: {
    size: 'lg',
  },
}

// All Sizes Together
export const AllSizes: Story = {
  render: () => (
    <div className="flex items-center gap-8">
      <div className="text-center">
        <LoadingSpinner size="sm" />
        <p className="text-xs text-gray-500 mt-2">Small</p>
      </div>
      <div className="text-center">
        <LoadingSpinner size="md" />
        <p className="text-xs text-gray-500 mt-2">Medium</p>
      </div>
      <div className="text-center">
        <LoadingSpinner size="lg" />
        <p className="text-xs text-gray-500 mt-2">Large</p>
      </div>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'All available spinner sizes side by side for comparison.',
      },
    },
  },
}

// Color Variants
export const ColorVariants: Story = {
  render: () => (
    <div className="flex items-center gap-8">
      <div className="text-center">
        <LoadingSpinner size="md" className="text-gray-400" />
        <p className="text-xs text-gray-500 mt-2">Gray</p>
      </div>
      <div className="text-center">
        <LoadingSpinner size="md" className="text-blue-500" />
        <p className="text-xs text-gray-500 mt-2">Blue</p>
      </div>
      <div className="text-center">
        <LoadingSpinner size="md" className="text-green-500" />
        <p className="text-xs text-gray-500 mt-2">Green</p>
      </div>
      <div className="text-center">
        <LoadingSpinner size="md" className="text-red-500" />
        <p className="text-xs text-gray-500 mt-2">Red</p>
      </div>
      <div className="text-center">
        <LoadingSpinner size="md" className="text-purple-500" />
        <p className="text-xs text-gray-500 mt-2">Purple</p>
      </div>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Spinners can inherit different colors using Tailwind color utilities.',
      },
    },
  },
}

// In Context Examples
export const InButton: Story = {
  render: () => (
    <div className="flex gap-4">
      <button
        className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-md"
        disabled
      >
        <LoadingSpinner size="sm" />
        <span>Loading...</span>
      </button>
      <button
        className="flex items-center justify-center gap-2 px-6 py-3 bg-green-500 text-white rounded-md"
        disabled
      >
        <LoadingSpinner size="md" />
        <span>Submitting</span>
      </button>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Examples of loading spinners within button components.',
      },
    },
  },
}

export const InCard: Story = {
  render: () => (
    <div className="max-w-sm p-6 bg-white border border-gray-200 rounded-lg shadow-sm">
      <div className="text-center">
        <LoadingSpinner size="lg" className="mx-auto mb-4 text-gray-400" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Loading Updates</h3>
        <p className="text-sm text-gray-600">
          Please wait while we fetch your recent baby updates...
        </p>
      </div>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Example of a loading spinner in a card layout.',
      },
    },
  },
}

export const FullPageLoader: Story = {
  render: () => (
    <div className="flex flex-col items-center justify-center min-h-[200px] bg-gray-50 rounded-lg">
      <LoadingSpinner size="lg" className="text-blue-500 mb-4" />
      <h2 className="text-xl font-semibold text-gray-900 mb-2">Loading Application</h2>
      <p className="text-gray-600">Setting up your family dashboard...</p>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Example of a full-page loading state with spinner and text.',
      },
    },
  },
}

// Different Backgrounds
export const OnDarkBackground: Story = {
  render: () => (
    <div className="flex items-center gap-8 p-8 bg-gray-900 rounded-lg">
      <div className="text-center">
        <LoadingSpinner size="sm" className="text-white" />
        <p className="text-xs text-gray-300 mt-2">Small</p>
      </div>
      <div className="text-center">
        <LoadingSpinner size="md" className="text-white" />
        <p className="text-xs text-gray-300 mt-2">Medium</p>
      </div>
      <div className="text-center">
        <LoadingSpinner size="lg" className="text-white" />
        <p className="text-xs text-gray-300 mt-2">Large</p>
      </div>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Spinners on dark backgrounds with appropriate color contrast.',
      },
    },
    backgrounds: { default: 'dark' },
  },
}

export const OnColoredBackground: Story = {
  render: () => (
    <div className="flex items-center gap-8 p-8 bg-blue-500 rounded-lg">
      <div className="text-center">
        <LoadingSpinner size="sm" className="text-white" />
        <p className="text-xs text-blue-100 mt-2">Small</p>
      </div>
      <div className="text-center">
        <LoadingSpinner size="md" className="text-white" />
        <p className="text-xs text-blue-100 mt-2">Medium</p>
      </div>
      <div className="text-center">
        <LoadingSpinner size="lg" className="text-white" />
        <p className="text-xs text-blue-100 mt-2">Large</p>
      </div>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Spinners on colored backgrounds maintaining good visibility.',
      },
    },
  },
}

// Inline Usage
export const InlineSpinner: Story = {
  render: () => (
    <div className="max-w-md space-y-4">
      <p className="text-gray-700">
        Your update is being processed{' '}
        <LoadingSpinner size="sm" className="inline-block ml-2" />
      </p>
      <p className="text-gray-700 flex items-center">
        Sending notifications to family members
        <LoadingSpinner size="sm" className="ml-2" />
      </p>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Examples of inline spinners within text content.',
      },
    },
  },
}