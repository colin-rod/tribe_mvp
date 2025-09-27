import type { Meta, StoryObj } from '@storybook/nextjs'
import { fn } from '@storybook/test'
import { HeartIcon, UserIcon, CalendarIcon } from '@heroicons/react/24/outline'

import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from './Card'
import { Button } from './Button'

const meta = {
  title: 'UI/Card',
  component: Card,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: 'A flexible card component with customizable variants, padding, and interactive states. Includes sub-components for structured content layout.',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: { type: 'select' },
      options: ['default', 'elevated', 'outlined', 'ghost'],
      description: 'Visual style variant of the card',
    },
    padding: {
      control: { type: 'select' },
      options: ['none', 'sm', 'md', 'lg', 'xl'],
      description: 'Internal padding of the card',
    },
    hover: {
      control: { type: 'boolean' },
      description: 'Enable hover effects',
    },
    interactive: {
      control: { type: 'boolean' },
      description: 'Make the card interactive (adds cursor pointer and keyboard support)',
    },
  },
  args: {
    onClick: fn(),
  },
} satisfies Meta<typeof Card>

export default meta
type Story = StoryObj<typeof meta>

// Basic Card Variants
export const Default: Story = {
  args: {
    variant: 'default',
    children: (
      <div className="p-6">
        <h3 className="text-lg font-semibold">Default Card</h3>
        <p className="text-gray-600 mt-2">This is a default card with standard styling.</p>
      </div>
    ),
  },
}

export const Elevated: Story = {
  args: {
    variant: 'elevated',
    children: (
      <div className="p-6">
        <h3 className="text-lg font-semibold">Elevated Card</h3>
        <p className="text-gray-600 mt-2">This card has enhanced shadow for emphasis.</p>
      </div>
    ),
  },
}

export const Outlined: Story = {
  args: {
    variant: 'outlined',
    children: (
      <div className="p-6">
        <h3 className="text-lg font-semibold">Outlined Card</h3>
        <p className="text-gray-600 mt-2">This card has a prominent border.</p>
      </div>
    ),
  },
}

export const Ghost: Story = {
  args: {
    variant: 'ghost',
    children: (
      <div className="p-6">
        <h3 className="text-lg font-semibold">Ghost Card</h3>
        <p className="text-gray-600 mt-2">This card has no background or border.</p>
      </div>
    ),
  },
}

// Padding Variants
export const PaddingVariants: Story = {
  render: () => (
    <div className="space-y-4 max-w-md">
      <Card padding="sm">
        <h4 className="font-medium">Small Padding</h4>
        <p className="text-sm text-gray-600">Compact card content.</p>
      </Card>
      <Card padding="md">
        <h4 className="font-medium">Medium Padding</h4>
        <p className="text-sm text-gray-600">Standard card content spacing.</p>
      </Card>
      <Card padding="lg">
        <h4 className="font-medium">Large Padding</h4>
        <p className="text-sm text-gray-600">Spacious card content.</p>
      </Card>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Different padding options for various content densities.',
      },
    },
  },
}

// Interactive States
export const Interactive: Story = {
  args: {
    interactive: true,
    children: (
      <div className="p-6">
        <h3 className="text-lg font-semibold">Interactive Card</h3>
        <p className="text-gray-600 mt-2">Click me! I have hover effects and keyboard support.</p>
      </div>
    ),
  },
}

export const WithHover: Story = {
  args: {
    hover: true,
    children: (
      <div className="p-6">
        <h3 className="text-lg font-semibold">Hover Card</h3>
        <p className="text-gray-600 mt-2">Hover over me to see the effect.</p>
      </div>
    ),
  },
}

// Structured Card with Sub-components
export const FullStructured: Story = {
  render: () => (
    <Card className="max-w-md">
      <CardHeader>
        <CardTitle>Update from Emma</CardTitle>
        <CardDescription>Shared 2 hours ago</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-gray-700">
          Emma took her first steps today! She was so excited and kept walking back and forth
          between the couch and coffee table. We managed to capture it on video.
        </p>
        <div className="flex items-center gap-4 mt-4 text-sm text-gray-500">
          <div className="flex items-center gap-1">
            <UserIcon className="h-4 w-4" />
            <span>5 recipients</span>
          </div>
          <div className="flex items-center gap-1">
            <CalendarIcon className="h-4 w-4" />
            <span>Dec 25, 2024</span>
          </div>
        </div>
      </CardContent>
      <CardFooter className="gap-2">
        <Button variant="outline" size="sm">
          <HeartIcon className="h-4 w-4 mr-2" />
          Like
        </Button>
        <Button variant="ghost" size="sm">Reply</Button>
      </CardFooter>
    </Card>
  ),
  parameters: {
    docs: {
      description: {
        story: 'A complete card example using all sub-components, representing a typical baby update card.',
      },
    },
  },
}

// Card Grid Layout
export const CardGrid: Story = {
  render: () => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-4xl">
      <Card>
        <CardHeader>
          <CardTitle>First Steps</CardTitle>
          <CardDescription>{"Emma's milestone"}</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-600">
            Emma took her first independent steps today at 11 months old!
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>New Words</CardTitle>
          <CardDescription>Language development</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-600">
            {"She's now saying \"mama\", \"dada\", and \"more\" consistently."}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Sleep Schedule</CardTitle>
          <CardDescription>Routine update</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-600">
            Finally sleeping through the night! 7 PM to 6 AM consistently.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Favorite Foods</CardTitle>
          <CardDescription>Eating habits</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-600">
            {"Loves bananas, avocado, and anything we're eating at the table."}
          </p>
        </CardContent>
      </Card>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Example of multiple cards in a responsive grid layout.',
      },
    },
  },
}

// Real-world Examples
export const ProfileCard: Story = {
  render: () => (
    <Card className="max-w-sm" interactive>
      <CardContent className="pt-6">
        <div className="flex items-center space-x-4">
          <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center">
            <UserIcon className="h-6 w-6 text-gray-500" />
          </div>
          <div>
            <h4 className="font-semibold">Sarah Johnson</h4>
            <p className="text-sm text-gray-600">{"Emma's Mom"}</p>
          </div>
        </div>
        <div className="mt-4 space-y-2">
          <div className="text-sm">
            <span className="text-gray-500">Updates shared:</span>
            <span className="font-medium ml-2">247</span>
          </div>
          <div className="text-sm">
            <span className="text-gray-500">Family members:</span>
            <span className="font-medium ml-2">12</span>
          </div>
        </div>
      </CardContent>
      <CardFooter>
        <Button size="sm" className="w-full">View Profile</Button>
      </CardFooter>
    </Card>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Example profile card with user information and statistics.',
      },
    },
  },
}

// Minimal Card
export const Minimal: Story = {
  args: {
    variant: 'ghost',
    padding: 'sm',
    children: (
      <>
        <h4 className="font-medium text-gray-900">Quick Note</h4>
        <p className="text-sm text-gray-600 mt-1">Simple card with minimal styling.</p>
      </>
    ),
  },
}
