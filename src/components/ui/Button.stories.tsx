import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { fn } from '@storybook/addon-actions'
import { HeartIcon, PlusIcon } from '@heroicons/react/24/outline'

import { Button } from './Button'

const meta = {
  title: 'UI/Button',
  component: Button,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: 'A flexible button component with multiple variants, sizes, and states. Supports loading states, icons, and accessibility features.',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: { type: 'select' },
      options: ['default', 'destructive', 'outline', 'secondary', 'ghost', 'link', 'success', 'warning'],
      description: 'Visual style variant of the button',
    },
    size: {
      control: { type: 'select' },
      options: ['xs', 'sm', 'default', 'lg', 'xl', 'icon'],
      description: 'Size variant of the button',
    },
    loading: {
      control: { type: 'boolean' },
      description: 'Shows loading spinner and disables interaction',
    },
    disabled: {
      control: { type: 'boolean' },
      description: 'Disables the button',
    },
    leftIcon: {
      control: { type: 'boolean' },
      description: 'Show left icon (demo purposes)',
      mapping: {
        true: <PlusIcon className="h-4 w-4" />,
        false: undefined,
      },
    },
    rightIcon: {
      control: { type: 'boolean' },
      description: 'Show right icon (demo purposes)',
      mapping: {
        true: <HeartIcon className="h-4 w-4" />,
        false: undefined,
      },
    },
    children: {
      control: { type: 'text' },
      description: 'Button content',
    },
  },
  args: {
    onClick: fn(),
    children: 'Button'
  },
} satisfies Meta<typeof Button>

export default meta
type Story = StoryObj<typeof meta>

// Primary Stories
export const Default: Story = {
  args: {
    variant: 'default',
    children: 'Default Button',
  },
}

export const Destructive: Story = {
  args: {
    variant: 'destructive',
    children: 'Delete Account',
  },
}

export const Outline: Story = {
  args: {
    variant: 'outline',
    children: 'Outline Button',
  },
}

export const Secondary: Story = {
  args: {
    variant: 'secondary',
    children: 'Secondary Button',
  },
}

export const Ghost: Story = {
  args: {
    variant: 'ghost',
    children: 'Ghost Button',
  },
}

export const Link: Story = {
  args: {
    variant: 'link',
    children: 'Link Button',
  },
}

export const Success: Story = {
  args: {
    variant: 'success',
    children: 'Success Button',
  },
}

export const Warning: Story = {
  args: {
    variant: 'warning',
    children: 'Warning Button',
  },
}

// Size Variants
export const Sizes: Story = {
  render: () => (
    <div className="flex items-end gap-4">
      <Button size="xs">Extra Small</Button>
      <Button size="sm">Small</Button>
      <Button size="default">Default</Button>
      <Button size="lg">Large</Button>
      <Button size="xl">Extra Large</Button>
      <Button size="icon">
        <PlusIcon className="h-4 w-4" />
      </Button>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Available size variants from extra small to extra large, plus an icon-only variant.',
      },
    },
  },
}

// All Variants
export const AllVariants: Story = {
  render: () => (
    <div className="grid grid-cols-2 gap-4 max-w-md">
      <Button variant="default">Default</Button>
      <Button variant="destructive">Destructive</Button>
      <Button variant="outline">Outline</Button>
      <Button variant="secondary">Secondary</Button>
      <Button variant="ghost">Ghost</Button>
      <Button variant="link">Link</Button>
      <Button variant="success">Success</Button>
      <Button variant="warning">Warning</Button>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'All available button variants side by side.',
      },
    },
  },
}

// State Stories
export const Loading: Story = {
  args: {
    loading: true,
    children: 'Submitting...',
  },
}

export const Disabled: Story = {
  args: {
    disabled: true,
    children: 'Disabled Button',
  },
}

export const WithLeftIcon: Story = {
  args: {
    leftIcon: <PlusIcon className="h-4 w-4" />,
    children: 'Add Item',
  },
}

export const WithRightIcon: Story = {
  args: {
    rightIcon: <HeartIcon className="h-4 w-4" />,
    children: 'Like',
  },
}

export const WithBothIcons: Story = {
  args: {
    leftIcon: <PlusIcon className="h-4 w-4" />,
    rightIcon: <HeartIcon className="h-4 w-4" />,
    children: 'Add to Favorites',
  },
}

// Real-world Examples
export const CallToAction: Story = {
  args: {
    variant: 'default',
    size: 'lg',
    children: 'Get Started Today',
  },
  parameters: {
    docs: {
      description: {
        story: 'Example of a primary call-to-action button.',
      },
    },
  },
}

export const FormSubmit: Story = {
  render: () => (
    <div className="flex gap-3">
      <Button variant="outline">Cancel</Button>
      <Button variant="default" loading>
        Saving Changes...
      </Button>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Example of form action buttons with loading state.',
      },
    },
  },
}

export const IconButton: Story = {
  args: {
    variant: 'outline',
    size: 'icon',
    children: <PlusIcon className="h-4 w-4" />,
    'aria-label': 'Add new item',
  },
  parameters: {
    docs: {
      description: {
        story: 'Icon-only button with proper accessibility attributes.',
      },
    },
  },
}