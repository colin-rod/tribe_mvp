import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogClose, DialogBody } from './Dialog'
import { Button } from './Button'

const meta = {
  title: 'UI/Dialog',
  component: Dialog,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: 'A modal dialog component with backdrop, keyboard support (Esc to close), and focus management. Built with accessibility in mind.',
      },
    },
  },
  tags: ['autodocs'],
} satisfies Meta<typeof Dialog>

export default meta
type Story = StoryObj

// Interactive wrapper component for stories
const DialogDemo = ({
  title,
  description,
  content,
  maxWidth = '2xl' as const,
  showCloseButton = true
}: {
  title: string
  description?: string
  content: React.ReactNode
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl' | '5xl' | 'full'
  showCloseButton?: boolean
}) => {
  const [open, setOpen] = useState(false)

  return (
    <>
      <Button onClick={() => setOpen(true)}>Open Dialog</Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent maxWidth={maxWidth}>
          <DialogHeader>
            <div className="flex-1">
              <DialogTitle>{title}</DialogTitle>
              {description && <DialogDescription>{description}</DialogDescription>}
            </div>
            {showCloseButton && <DialogClose onClick={() => setOpen(false)} />}
          </DialogHeader>
          <DialogBody>
            {content}
          </DialogBody>
        </DialogContent>
      </Dialog>
    </>
  )
}

// Basic Dialog
export const Default: Story = {
  render: () => (
    <DialogDemo
      title="Welcome to Tribe MVP"
      description="Share your precious moments with family"
      content={
        <div className="space-y-4">
          <p className="text-gray-600">
            Tribe MVP helps you capture and share your baby&apos;s milestones with the people who matter most.
          </p>
          <div className="flex gap-3 justify-end">
            <Button variant="outline">Learn More</Button>
            <Button>Get Started</Button>
          </div>
        </div>
      }
    />
  ),
}

// Small Dialog
export const SmallSize: Story = {
  render: () => (
    <DialogDemo
      maxWidth="sm"
      title="Quick Action"
      content={
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            This is a small dialog for simple confirmations or quick actions.
          </p>
          <div className="flex gap-2 justify-end">
            <Button size="sm" variant="outline">Cancel</Button>
            <Button size="sm">Confirm</Button>
          </div>
        </div>
      }
    />
  ),
  parameters: {
    docs: {
      description: {
        story: 'Small dialog (max-width: 384px) for simple confirmations and quick actions.',
      },
    },
  },
}

// Large Dialog
export const LargeSize: Story = {
  render: () => (
    <DialogDemo
      maxWidth="4xl"
      title="Create New Memory"
      description="Share a special moment with your family"
      content={
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Memory Title
            </label>
            <input
              type="text"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              placeholder="First steps, birthday party..."
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              rows={4}
              placeholder="Tell your story..."
            />
          </div>
          <div className="flex gap-3 justify-end">
            <Button variant="outline">Save as Draft</Button>
            <Button>Share Memory</Button>
          </div>
        </div>
      }
    />
  ),
  parameters: {
    docs: {
      description: {
        story: 'Large dialog (max-width: 896px) for forms and complex content.',
      },
    },
  },
}

// Confirmation Dialog
export const Confirmation: Story = {
  render: () => (
    <DialogDemo
      maxWidth="md"
      title="Delete Memory"
      description="This action cannot be undone."
      content={
        <div className="space-y-4">
          <p className="text-gray-600">
            Are you sure you want to delete this memory? This will permanently remove it and all associated photos.
          </p>
          <div className="flex gap-3 justify-end">
            <Button variant="outline">Cancel</Button>
            <Button variant="destructive">Delete Memory</Button>
          </div>
        </div>
      }
    />
  ),
  parameters: {
    docs: {
      description: {
        story: 'Confirmation dialog for destructive actions with clear warning.',
      },
    },
  },
}

// Form Dialog
export const FormDialog: Story = {
  render: () => (
    <DialogDemo
      maxWidth="lg"
      title="Add Family Member"
      description="Invite someone to join your family group"
      content={
        <form className="space-y-4">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
              Full Name
            </label>
            <input
              id="name"
              type="text"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              placeholder="John Doe"
            />
          </div>
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              Email Address
            </label>
            <input
              id="email"
              type="email"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              placeholder="john@example.com"
            />
          </div>
          <div>
            <label htmlFor="relationship" className="block text-sm font-medium text-gray-700 mb-1">
              Relationship
            </label>
            <select
              id="relationship"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option>Grandparent</option>
              <option>Aunt/Uncle</option>
              <option>Friend</option>
              <option>Other</option>
            </select>
          </div>
          <div className="flex gap-3 justify-end pt-2">
            <Button type="button" variant="outline">Cancel</Button>
            <Button type="submit">Send Invitation</Button>
          </div>
        </form>
      }
    />
  ),
  parameters: {
    docs: {
      description: {
        story: 'Dialog containing a form with multiple inputs and proper labels.',
      },
    },
  },
}

// Scrollable Content
export const ScrollableContent: Story = {
  render: () => (
    <DialogDemo
      maxWidth="2xl"
      title="Terms and Conditions"
      description="Please read and accept our terms"
      content={
        <div className="space-y-4">
          <div className="prose prose-sm max-w-none">
            <h3>1. Introduction</h3>
            <p>
              Welcome to Tribe MVP. By using our service, you agree to these terms and conditions.
              Please read them carefully before using our platform.
            </p>
            <h3>2. User Accounts</h3>
            <p>
              You are responsible for maintaining the confidentiality of your account and password.
              You agree to accept responsibility for all activities that occur under your account.
            </p>
            <h3>3. Content Guidelines</h3>
            <p>
              Users must not upload inappropriate content. All photos and updates should be
              family-friendly and appropriate for all ages.
            </p>
            <h3>4. Privacy Policy</h3>
            <p>
              We respect your privacy and handle your data in accordance with our Privacy Policy.
              Your memories are private by default and only shared with people you choose.
            </p>
            <h3>5. Data Security</h3>
            <p>
              We implement industry-standard security measures to protect your data. However,
              no method of transmission over the internet is 100% secure.
            </p>
            <h3>6. Termination</h3>
            <p>
              We reserve the right to terminate accounts that violate these terms or engage in
              inappropriate behavior on the platform.
            </p>
          </div>
          <div className="flex gap-3 justify-end pt-4 border-t">
            <Button variant="outline">Decline</Button>
            <Button>Accept Terms</Button>
          </div>
        </div>
      }
    />
  ),
  parameters: {
    docs: {
      description: {
        story: 'Dialog with scrollable content that exceeds the maximum viewport height.',
      },
    },
  },
}

// No Close Button
export const NoCloseButton: Story = {
  render: () => (
    <DialogDemo
      maxWidth="md"
      title="Processing Payment"
      description="Please wait while we process your payment"
      showCloseButton={false}
      content={
        <div className="space-y-4 py-8">
          <div className="flex justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500" />
          </div>
          <p className="text-center text-gray-600">
            This may take a few moments. Please do not close this window.
          </p>
        </div>
      }
    />
  ),
  parameters: {
    docs: {
      description: {
        story: 'Dialog without close button for processes that must complete (note: Esc key still works).',
      },
    },
  },
}

// Success Dialog
export const SuccessMessage: Story = {
  render: () => (
    <DialogDemo
      maxWidth="md"
      title="Memory Shared Successfully!"
      content={
        <div className="space-y-4">
          <div className="flex justify-center">
            <div className="rounded-full bg-success-100 p-3">
              <svg className="h-8 w-8 text-success-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
          </div>
          <p className="text-center text-gray-600">
            Your memory has been shared with 12 family members. They&apos;ll receive a notification and can view it in their feed.
          </p>
          <div className="flex justify-center">
            <Button>View Memory</Button>
          </div>
        </div>
      }
    />
  ),
  parameters: {
    docs: {
      description: {
        story: 'Success confirmation dialog with visual feedback.',
      },
    },
  },
}

// Error Dialog
export const ErrorMessage: Story = {
  render: () => (
    <DialogDemo
      maxWidth="md"
      title="Upload Failed"
      content={
        <div className="space-y-4">
          <div className="flex justify-center">
            <div className="rounded-full bg-error-100 p-3">
              <svg className="h-8 w-8 text-error-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
          </div>
          <div className="text-center">
            <p className="text-gray-600 mb-2">
              We couldn&apos;t upload your photos. Please check your connection and try again.
            </p>
            <p className="text-sm text-gray-500">
              Error code: IMG_UPLOAD_001
            </p>
          </div>
          <div className="flex gap-3 justify-center">
            <Button variant="outline">Cancel</Button>
            <Button>Try Again</Button>
          </div>
        </div>
      }
    />
  ),
  parameters: {
    docs: {
      description: {
        story: 'Error dialog with visual feedback and actionable options.',
      },
    },
  },
}
