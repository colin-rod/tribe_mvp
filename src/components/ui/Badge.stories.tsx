import type { Meta, StoryObj } from '@storybook/nextjs-vite'

import { Badge } from './Badge'

const meta = {
  title: 'UI/Badge',
  component: Badge,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: 'A versatile badge component for displaying status, labels, and notifications. Features multiple variants, sizes, and styling options including dots and outlines.',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: { type: 'select' },
      options: ['default', 'primary', 'secondary', 'success', 'warning', 'error', 'info'],
      description: 'Visual variant of the badge',
    },
    size: {
      control: { type: 'select' },
      options: ['sm', 'md', 'lg'],
      description: 'Size variant of the badge',
    },
    dot: {
      control: { type: 'boolean' },
      description: 'Show a colored dot indicator',
    },
    outline: {
      control: { type: 'boolean' },
      description: 'Use outline style instead of filled',
    },
    children: {
      control: { type: 'text' },
      description: 'Badge content',
    },
  },
} satisfies Meta<typeof Badge>

export default meta
type Story = StoryObj<typeof meta>

// Basic Variants
export const Default: Story = {
  args: {
    children: 'Default',
  },
}

export const Primary: Story = {
  args: {
    variant: 'primary',
    children: 'Primary',
  },
}

export const Secondary: Story = {
  args: {
    variant: 'secondary',
    children: 'Secondary',
  },
}

export const Success: Story = {
  args: {
    variant: 'success',
    children: 'Success',
  },
}

export const Warning: Story = {
  args: {
    variant: 'warning',
    children: 'Warning',
  },
}

export const Error: Story = {
  args: {
    variant: 'error',
    children: 'Error',
  },
}

export const Info: Story = {
  args: {
    variant: 'info',
    children: 'Info',
  },
}

// All Variants
export const AllVariants: Story = {
  render: () => (
    <div className="flex flex-wrap gap-2">
      <Badge variant="default">Default</Badge>
      <Badge variant="primary">Primary</Badge>
      <Badge variant="secondary">Secondary</Badge>
      <Badge variant="success">Success</Badge>
      <Badge variant="warning">Warning</Badge>
      <Badge variant="error">Error</Badge>
      <Badge variant="info">Info</Badge>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'All available badge variants side by side.',
      },
    },
  },
}

// Sizes
export const Sizes: Story = {
  render: () => (
    <div className="flex items-center gap-4">
      <div className="text-center">
        <Badge size="sm">Small</Badge>
        <p className="text-xs text-gray-500 mt-2">sm</p>
      </div>
      <div className="text-center">
        <Badge size="md">Medium</Badge>
        <p className="text-xs text-gray-500 mt-2">md</p>
      </div>
      <div className="text-center">
        <Badge size="lg">Large</Badge>
        <p className="text-xs text-gray-500 mt-2">lg</p>
      </div>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Available size variants for different use cases.',
      },
    },
  },
}

// With Dots
export const WithDots: Story = {
  render: () => (
    <div className="flex flex-wrap gap-2">
      <Badge variant="default" dot>Online</Badge>
      <Badge variant="primary" dot>Active</Badge>
      <Badge variant="success" dot>Connected</Badge>
      <Badge variant="warning" dot>Pending</Badge>
      <Badge variant="error" dot>Offline</Badge>
      <Badge variant="info" dot>Processing</Badge>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Badges with colored dot indicators for status representation.',
      },
    },
  },
}

// Outline Style
export const Outline: Story = {
  render: () => (
    <div className="flex flex-wrap gap-2">
      <Badge variant="default" outline>Default</Badge>
      <Badge variant="primary" outline>Primary</Badge>
      <Badge variant="success" outline>Success</Badge>
      <Badge variant="warning" outline>Warning</Badge>
      <Badge variant="error" outline>Error</Badge>
      <Badge variant="info" outline>Info</Badge>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Outline style badges with transparent backgrounds.',
      },
    },
  },
}

// Outline with Dots
export const OutlineWithDots: Story = {
  render: () => (
    <div className="flex flex-wrap gap-2">
      <Badge variant="default" outline dot>Online</Badge>
      <Badge variant="primary" outline dot>Active</Badge>
      <Badge variant="success" outline dot>Connected</Badge>
      <Badge variant="warning" outline dot>Pending</Badge>
      <Badge variant="error" outline dot>Offline</Badge>
      <Badge variant="info" outline dot>Processing</Badge>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Outline badges combined with dot indicators.',
      },
    },
  },
}

// Size Combinations
export const SizeCombinations: Story = {
  render: () => (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Badge variant="primary" size="sm">New</Badge>
        <Badge variant="success" size="md">Active</Badge>
        <Badge variant="warning" size="lg">Pending Review</Badge>
      </div>
      <div className="flex items-center gap-2">
        <Badge variant="info" size="sm" dot>Live</Badge>
        <Badge variant="success" size="md" dot>Online</Badge>
        <Badge variant="error" size="lg" dot>Disconnected</Badge>
      </div>
      <div className="flex items-center gap-2">
        <Badge variant="primary" size="sm" outline>Beta</Badge>
        <Badge variant="warning" size="md" outline>Draft</Badge>
        <Badge variant="error" size="lg" outline>Deprecated</Badge>
      </div>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Different size combinations with various styles.',
      },
    },
  },
}

// Real-world Examples
export const UpdateStatuses: Story = {
  render: () => (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <span className="text-sm">Update Status:</span>
        <Badge variant="success" dot>Delivered</Badge>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-sm">Message Status:</span>
        <Badge variant="warning" dot>Pending</Badge>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-sm">Connection:</span>
        <Badge variant="error" dot>Failed</Badge>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-sm">Sync Status:</span>
        <Badge variant="info" dot>Syncing</Badge>
      </div>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Real-world usage for update and connection statuses.',
      },
    },
  },
}

export const UserRoles: Story = {
  render: () => (
    <div className="space-y-3">
      <div className="flex items-center justify-between p-3 border rounded-lg">
        <div>
          <p className="font-medium">Sarah Johnson</p>
          <p className="text-sm text-gray-600">sarah@example.com</p>
        </div>
        <Badge variant="primary">Parent</Badge>
      </div>
      <div className="flex items-center justify-between p-3 border rounded-lg">
        <div>
          <p className="font-medium">Mike Johnson</p>
          <p className="text-sm text-gray-600">mike@example.com</p>
        </div>
        <Badge variant="primary">Parent</Badge>
      </div>
      <div className="flex items-center justify-between p-3 border rounded-lg">
        <div>
          <p className="font-medium">Grandma Mary</p>
          <p className="text-sm text-gray-600">mary@example.com</p>
        </div>
        <Badge variant="secondary">Grandparent</Badge>
      </div>
      <div className="flex items-center justify-between p-3 border rounded-lg">
        <div>
          <p className="font-medium">Uncle Tom</p>
          <p className="text-sm text-gray-600">tom@example.com</p>
        </div>
        <Badge variant="info">Family</Badge>
      </div>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Badges used to indicate user roles in a family sharing app.',
      },
    },
  },
}

export const NotificationBadges: Story = {
  render: () => (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <span>Messages</span>
        <Badge variant="error" size="sm">3</Badge>
      </div>
      <div className="flex items-center gap-3">
        <span>Likes</span>
        <Badge variant="success" size="sm">12</Badge>
      </div>
      <div className="flex items-center gap-3">
        <span>Comments</span>
        <Badge variant="info" size="sm">5</Badge>
      </div>
      <div className="flex items-center gap-3">
        <span>Pending Invites</span>
        <Badge variant="warning" size="sm">2</Badge>
      </div>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Badges used for notification counts and indicators.',
      },
    },
  },
}

export const UpdateCategories: Story = {
  render: () => (
    <div className="space-y-3">
      <div className="p-4 border rounded-lg">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-medium">First Steps Today!</h3>
          <Badge variant="success" size="sm">Milestone</Badge>
        </div>
        <p className="text-sm text-gray-600">Emma took her first independent steps...</p>
      </div>
      <div className="p-4 border rounded-lg">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-medium">Tummy Time Fun</h3>
          <Badge variant="info" size="sm">Daily Activity</Badge>
        </div>
        <p className="text-sm text-gray-600">30 minutes of tummy time with toys...</p>
      </div>
      <div className="p-4 border rounded-lg">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-medium">Doctor Visit Update</h3>
          <Badge variant="warning" size="sm" outline>Medical</Badge>
        </div>
        <p className="text-sm text-gray-600">12-month checkup went great...</p>
      </div>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Badges used to categorize different types of baby updates.',
      },
    },
  },
}

// Numbers and Counts
export const NumberBadges: Story = {
  render: () => (
    <div className="flex flex-wrap gap-2">
      <Badge variant="error">1</Badge>
      <Badge variant="warning">5</Badge>
      <Badge variant="info">12</Badge>
      <Badge variant="success">99+</Badge>
      <Badge variant="primary" outline>NEW</Badge>
      <Badge variant="error" size="sm">!</Badge>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Badges displaying numbers, counts, and short indicators.',
      },
    },
  },
}