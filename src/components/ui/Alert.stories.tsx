import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { HeartIcon, BellIcon } from '@heroicons/react/24/outline'
import type { ComponentType } from 'react'

import { Alert } from './Alert'

const meta = {
  title: 'UI/Alert',
  component: Alert,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: 'A flexible alert component for displaying important messages, notifications, and status updates. Features multiple variants, dismissible options, and accessibility support.',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: { type: 'select' },
      options: ['default', 'info', 'success', 'warning', 'error'],
      description: 'Visual variant of the alert',
    },
    title: {
      control: { type: 'text' },
      description: 'Optional title for the alert',
    },
    dismissible: {
      control: { type: 'boolean' },
      description: 'Whether the alert can be dismissed',
    },
    icon: {
      control: { type: 'boolean' },
      description: 'Custom icon (demo purposes)',
      mapping: {
        true: <HeartIcon className="w-5 h-5" />,
        false: undefined,
      },
    },
    children: {
      control: { type: 'text' },
      description: 'Alert content',
    },
  },
  args: {},
  decorators: [
    (StoryComponent: ComponentType) => (
      <div className="w-96">
        <StoryComponent />
      </div>
    ),
  ],
} satisfies Meta<typeof Alert>

export default meta
type Story = StoryObj<typeof meta>

// Basic Variants
export const Default: Story = {
  args: {
    children: 'This is a default alert with standard styling.',
  },
}

export const Info: Story = {
  args: {
    variant: 'info',
    children: 'This is an informational message for the user.',
  },
}

export const Success: Story = {
  args: {
    variant: 'success',
    children: 'Operation completed successfully!',
  },
}

export const Warning: Story = {
  args: {
    variant: 'warning',
    children: 'Please review this important information.',
  },
}

export const Error: Story = {
  args: {
    variant: 'error',
    children: 'An error occurred. Please try again.',
  },
}

// With Titles
export const WithTitles: Story = {
  render: () => (
    <div className="space-y-4 w-96">
      <Alert variant="info" title="New Feature Available">
        We&apos;ve added a new way to share updates with your family.
      </Alert>
      <Alert variant="success" title="Update Sent">
        Your baby update has been successfully shared with 5 family members.
      </Alert>
      <Alert variant="warning" title="Storage Almost Full">
        You&apos;re using 90% of your media storage. Consider upgrading your plan.
      </Alert>
      <Alert variant="error" title="Connection Failed">
        Unable to connect to the server. Check your internet connection.
      </Alert>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Alerts with titles for better message organization.',
      },
    },
  },
}

// All Variants
export const AllVariants: Story = {
  render: () => (
    <div className="space-y-4 w-96">
      <Alert variant="default">
        Default alert message
      </Alert>
      <Alert variant="info">
        Information alert message
      </Alert>
      <Alert variant="success">
        Success alert message
      </Alert>
      <Alert variant="warning">
        Warning alert message
      </Alert>
      <Alert variant="error">
        Error alert message
      </Alert>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'All available alert variants side by side.',
      },
    },
  },
}

// Dismissible Alerts
export const Dismissible: Story = {
  args: {
    variant: 'info',
    title: 'Welcome!',
    dismissible: true,
    children: 'This alert can be dismissed by clicking the X button.',
  },
}

export const DismissibleVariants: Story = {
  render: () => (
    <div className="space-y-4 w-96">
      <Alert variant="info" dismissible title="New Feature">
        Check out our latest update sharing features.
      </Alert>
      <Alert variant="success" dismissible title="Update Sent">
        Your update was shared successfully.
      </Alert>
      <Alert variant="warning" dismissible title="Storage Warning">
        You&apos;re running low on storage space.
      </Alert>
      <Alert variant="error" dismissible title="Upload Failed">
        Failed to upload image. Please try again.
      </Alert>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'All alert variants with dismissible functionality.',
      },
    },
  },
}

// Custom Icons
export const CustomIcon: Story = {
  args: {
    variant: 'info',
    title: 'New Like',
    icon: <HeartIcon className="w-5 h-5" />,
    children: 'Someone liked your baby update!',
  },
}

export const CustomIconVariants: Story = {
  render: () => (
    <div className="space-y-4 w-96">
      <Alert variant="info" icon={<BellIcon className="w-5 h-5" />} title="Notification">
        You have 3 new notifications
      </Alert>
      <Alert variant="success" icon={<HeartIcon className="w-5 h-5" />} title="Liked">
        Your update received 5 likes
      </Alert>
      <Alert variant="warning" icon={<BellIcon className="w-5 h-5" />} title="Reminder">
        Don&apos;t forget to share today&apos;s milestone
      </Alert>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Alerts with custom icons instead of default variant icons.',
      },
    },
  },
}

// No Icon
export const NoIcon: Story = {
  args: {
    variant: 'info',
    title: 'Simple Message',
    icon: null,
    children: 'This alert has no icon for a cleaner look.',
  },
}

// Real-world Examples
export const BabyUpdateExamples: Story = {
  render: () => (
    <div className="space-y-4 w-96">
      <Alert variant="success" title="Update Shared" dismissible>
        Your baby update &ldquo;First Steps!&rdquo; has been sent to 8 family members.
      </Alert>
      <Alert variant="info" title="New Response">
        Grandma commented on your recent photo: &ldquo;So adorable! 😍&rdquo;
      </Alert>
      <Alert variant="warning" title="Photo Quality">
        The uploaded photo is quite large. Consider compressing for faster sharing.
      </Alert>
      <Alert variant="error" title="Upload Failed" dismissible>
        Failed to upload video. File size must be under 50MB.
      </Alert>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Real-world examples from a baby update sharing app.',
      },
    },
  },
}

export const NotificationExamples: Story = {
  render: () => (
    <div className="space-y-4 w-96">
      <Alert variant="info" icon={<BellIcon className="w-5 h-5" />} dismissible>
        You have 3 new family responses to review.
      </Alert>
      <Alert variant="success" icon={<HeartIcon className="w-5 h-5" />} title="Milestone Celebrated">
        Your &ldquo;First Word&rdquo; update received 12 reactions from family!
      </Alert>
      <Alert variant="warning" title="Quiet Hours Active">
        Notifications are paused until 8:00 AM to respect family sleep schedules.
      </Alert>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Examples of notification-style alerts with relevant icons.',
      },
    },
  },
}

// Long Content
export const LongContent: Story = {
  args: {
    variant: 'info',
    title: 'Privacy Update',
    dismissible: true,
    children: 'We&apos;ve updated our privacy policy to better protect your family&apos;s data. The changes include enhanced encryption for photos and videos, improved control over who can see your updates, and new options for automatically deleting old content. Please review the changes in your account settings.',
  },
}

// Multi-line Content
export const MultilineContent: Story = {
  render: () => (
    <div className="w-96">
      <Alert variant="warning" title="Account Verification Required" dismissible>
        <div>
          <p>Your account needs to be verified to continue sharing updates.</p>
          <ul className="list-disc list-inside mt-2 space-y-1">
            <li>Check your email for a verification link</li>
            <li>Click the link to verify your account</li>
            <li>Return here to continue sharing</li>
          </ul>
        </div>
      </Alert>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Alert with structured content including lists and multiple paragraphs.',
      },
    },
  },
}

// Inline Actions
export const WithActions: Story = {
  render: () => (
    <div className="space-y-4 w-96">
      <Alert variant="info" title="New Family Member">
        <div>
          <p className="mb-3">Sarah Johnson wants to join your family updates.</p>
          <div className="flex gap-2">
            <button className="px-3 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600">
              Accept
            </button>
            <button className="px-3 py-1 text-xs bg-gray-200 text-gray-700 rounded hover:bg-gray-300">
              Decline
            </button>
          </div>
        </div>
      </Alert>
      <Alert variant="warning" title="Storage Full">
        <div>
          <p className="mb-3">You&apos;ve reached your storage limit. Upgrade to continue sharing.</p>
          <button className="px-3 py-1 text-xs bg-orange-500 text-white rounded hover:bg-orange-600">
            Upgrade Plan
          </button>
        </div>
      </Alert>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Alerts with embedded action buttons for user interaction.',
      },
    },
  },
}
