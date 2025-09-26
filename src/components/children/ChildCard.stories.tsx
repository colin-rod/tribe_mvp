import type { Meta, StoryObj } from '@storybook/nextjs'
import { fn } from '@storybook/test'

import ChildCard from './ChildCard'
import type { Child } from '@/lib/children'

// Mock data for stories
const baseChild: Child = {
  id: 'child-1',
  parent_id: 'parent-1',
  name: 'Emma Johnson',
  birth_date: '2023-12-25',
  profile_photo_url: undefined,
  created_at: '2024-01-15T10:00:00Z',
}

const meta = {
  title: 'Components/ChildCard',
  component: ChildCard,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: 'A card component for displaying child information including photo, name, age, and action buttons. Used in child management interfaces.',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    child: {
      description: 'Child data to display',
    },
    onEdit: {
      description: 'Function called when edit button is clicked',
      action: 'edit clicked',
    },
    onDelete: {
      description: 'Function called when delete button is clicked',
      action: 'delete clicked',
    },
    showActions: {
      control: { type: 'boolean' },
      description: 'Whether to show edit and delete action buttons',
    },
  },
  args: {
    onEdit: fn(),
    onDelete: fn(),
    child: baseChild,
    showActions: true,
  },
  decorators: [
    (Story) => (
      <div className="max-w-sm">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof ChildCard>

export default meta
type Story = StoryObj<typeof meta>

// Basic States
export const Default: Story = {
  args: {
    child: baseChild,
  },
}

export const WithoutActions: Story = {
  args: {
    child: baseChild,
    showActions: false,
  },
}

// Different Ages
export const NewBorn: Story = {
  args: {
    child: {
      ...baseChild,
      id: 'child-2',
      name: 'Oliver Smith',
      birth_date: new Date().toISOString().split('T')[0], // Today's date
    },
  },
}

export const InfantThreeMonths: Story = {
  args: {
    child: {
      ...baseChild,
      id: 'child-3',
      name: 'Sophia Davis',
      birth_date: new Date(Date.now() - 3 * 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 3 months ago
    },
  },
}

export const SixMonthOld: Story = {
  args: {
    child: {
      ...baseChild,
      id: 'child-4',
      name: 'Liam Wilson',
      birth_date: new Date(Date.now() - 6 * 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 6 months ago
    },
  },
}

export const OneYearOld: Story = {
  args: {
    child: {
      ...baseChild,
      id: 'child-5',
      name: 'Ava Brown',
      birth_date: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 1 year ago
    },
  },
}

export const TwoYearOld: Story = {
  args: {
    child: {
      ...baseChild,
      id: 'child-6',
      name: 'Noah Garcia',
      birth_date: new Date(Date.now() - 2 * 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 2 years ago
    },
  },
}

export const ThreeYearOld: Story = {
  args: {
    child: {
      ...baseChild,
      id: 'child-7',
      name: 'Isabella Martinez',
      birth_date: new Date(Date.now() - 3 * 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 3 years ago
    },
  },
}

// Name Variations
export const LongName: Story = {
  args: {
    child: {
      ...baseChild,
      id: 'child-8',
      name: 'Alexander Benjamin Rodriguez-Williams',
      birth_date: '2023-06-15',
    },
  },
}

export const ShortName: Story = {
  args: {
    child: {
      ...baseChild,
      id: 'child-9',
      name: 'Jo',
      birth_date: '2024-01-01',
    },
  },
}

// With Profile Photos
export const WithPhoto: Story = {
  args: {
    child: {
      ...baseChild,
      id: 'child-10',
      name: 'Mia Johnson',
      birth_date: '2023-08-20',
      profile_photo_url: 'https://images.unsplash.com/photo-1514626585111-9aa86183ac98?w=150&h=150&fit=crop&crop=face',
    },
  },
}

export const BrokenPhotoUrl: Story = {
  args: {
    child: {
      ...baseChild,
      id: 'child-11',
      name: 'Ethan Lee',
      birth_date: '2023-05-10',
      profile_photo_url: 'https://broken-image-url.jpg',
    },
  },
  parameters: {
    docs: {
      description: {
        story: 'Shows fallback behavior when profile photo URL is broken or unavailable.',
      },
    },
  },
}

// Multiple Children Grid
export const ChildrenGrid: Story = {
  render: () => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-4xl">
      <ChildCard
        child={{
          id: 'child-1',
          parent_id: 'parent-1',
          name: 'Emma Johnson',
          birth_date: '2023-12-25',
          created_at: '2024-01-15T10:00:00Z',
        }}
        onEdit={fn()}
        onDelete={fn()}
      />
      <ChildCard
        child={{
          id: 'child-2',
          parent_id: 'parent-1',
          name: 'Oliver Smith',
          birth_date: '2022-06-15',
          created_at: '2024-01-15T10:00:00Z',
        }}
        onEdit={fn()}
        onDelete={fn()}
      />
      <ChildCard
        child={{
          id: 'child-3',
          parent_id: 'parent-1',
          name: 'Sophia Davis',
          birth_date: '2024-03-01',
          created_at: '2024-01-15T10:00:00Z',
        }}
        onEdit={fn()}
        onDelete={fn()}
      />
      <ChildCard
        child={{
          id: 'child-4',
          parent_id: 'parent-1',
          name: 'Liam Wilson',
          birth_date: '2021-11-20',
          created_at: '2024-01-15T10:00:00Z',
        }}
        onEdit={fn()}
        onDelete={fn()}
      />
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Multiple child cards in a grid layout, showing various ages and names.',
      },
    },
  },
}

// Interactive Examples
export const InteractiveExample: Story = {
  args: {
    child: baseChild,
  },
  parameters: {
    docs: {
      description: {
        story: 'Click the edit or delete buttons to see the action handlers in the Actions panel.',
      },
    },
  },
}

// Special Birth Dates
export const ChristmasBaby: Story = {
  args: {
    child: {
      ...baseChild,
      id: 'child-12',
      name: 'Holly Christmas',
      birth_date: '2023-12-25',
    },
  },
}

export const NewYearBaby: Story = {
  args: {
    child: {
      ...baseChild,
      id: 'child-13',
      name: 'January Dawn',
      birth_date: '2024-01-01',
    },
  },
}

export const LeapYearBaby: Story = {
  args: {
    child: {
      ...baseChild,
      id: 'child-14',
      name: 'February Leap',
      birth_date: '2024-02-29',
    },
  },
}

// Edge Cases
export const VeryRecentBirth: Story = {
  args: {
    child: {
      ...baseChild,
      id: 'child-15',
      name: 'Yesterday Baby',
      birth_date: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0], // Yesterday
    },
  },
  parameters: {
    docs: {
      description: {
        story: 'Child born very recently (yesterday) to test age calculation.',
      },
    },
  },
}

export const FutureBirthDate: Story = {
  args: {
    child: {
      ...baseChild,
      id: 'child-16',
      name: 'Future Baby',
      birth_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 30 days in future
    },
  },
  parameters: {
    docs: {
      description: {
        story: 'Child with future birth date (due date) to test edge case handling.',
      },
    },
  },
}

// Without Actions (Read-only)
export const ReadOnlyCards: Story = {
  render: () => (
    <div className="space-y-4 max-w-sm">
      <ChildCard
        child={{
          id: 'child-1',
          parent_id: 'parent-1',
          name: 'Emma Johnson',
          birth_date: '2023-12-25',
          created_at: '2024-01-15T10:00:00Z',
        }}
        onEdit={fn()}
        onDelete={fn()}
        showActions={false}
      />
      <ChildCard
        child={{
          id: 'child-2',
          parent_id: 'parent-1',
          name: 'Oliver Smith',
          birth_date: '2022-06-15',
          created_at: '2024-01-15T10:00:00Z',
        }}
        onEdit={fn()}
        onDelete={fn()}
        showActions={false}
      />
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Child cards without action buttons for read-only contexts.',
      },
    },
  },
}

// Hover States
export const HoverExample: Story = {
  args: {
    child: baseChild,
  },
  parameters: {
    docs: {
      description: {
        story: 'Hover over the card to see the shadow transition effect.',
      },
    },
  },
}