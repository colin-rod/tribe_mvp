import type { Meta, StoryObj } from '@storybook/nextjs-vite'

import UpdateCard from './UpdateCard'
import type { UpdateCardData } from '@/lib/types/dashboard'

// Mock data for stories
const mockChild = {
  id: 'child-1',
  name: 'Emma',
  age: '11 months',
  avatar: undefined,
}

const baseUpdate: UpdateCardData = {
  id: 'update-1',
  parent_id: 'parent-1',
  child_id: 'child-1',
  content: 'Emma took her first independent steps today! She was so excited and kept walking back and forth between the couch and coffee table. We managed to capture it on video and she seemed so proud of herself.',
  contentPreview: 'Emma took her first independent steps today! She was so excited and kept walking back and forth...',
  child: mockChild,
  createdAt: new Date('2024-12-25T14:30:00Z'),
  timeAgo: '2 hours ago',
  responseCount: 5,
  hasUnreadResponses: true,
  lastResponseAt: new Date('2024-12-25T15:45:00Z'),
  distributionStatus: 'sent',
  media_urls: ['https://example.com/video.mp4'],
  milestone_type: 'first_steps',
  ai_analysis: { confidence: 0.95, tags: ['walking', 'milestone'] },
  suggested_recipients: ['grandma@example.com', 'grandpa@example.com'],
  confirmed_recipients: ['grandma@example.com', 'grandpa@example.com'],
  scheduled_for: undefined,
  sent_at: '2024-12-25T14:30:00Z'
}

const meta = {
  title: 'Components/UpdateCard',
  component: UpdateCard,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: 'A card component for displaying baby update previews in the dashboard. Features child information, content preview, response counts, and distribution status.',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    update: {
      description: 'Update data to display',
    },
    onClick: {
      description: 'Function called when the card is clicked',
      action: 'clicked',
    },
    className: {
      control: { type: 'text' },
      description: 'Additional CSS classes',
    },
  },
  args: {
    update: baseUpdate,
    onClick: (_updateId: string) => { /* Story action */ },
  },
  decorators: [
    (Story) => (
      <div className="max-w-md">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof UpdateCard>

export default meta
type Story = StoryObj<typeof meta>

// Basic States
export const Default: Story = {
  args: {
    update: baseUpdate,
  },
}

export const NoResponses: Story = {
  args: {
    update: {
      ...baseUpdate,
      responseCount: 0,
      hasUnreadResponses: false,
      lastResponseAt: undefined,
    },
  },
}

export const SingleResponse: Story = {
  args: {
    update: {
      ...baseUpdate,
      responseCount: 1,
      hasUnreadResponses: false,
    },
  },
}

export const ManyResponses: Story = {
  args: {
    update: {
      ...baseUpdate,
      responseCount: 23,
      hasUnreadResponses: true,
    },
  },
}

// Distribution Status Variants
export const DraftStatus: Story = {
  args: {
    update: {
      ...baseUpdate,
      distributionStatus: 'draft',
      timeAgo: 'Draft',
      responseCount: 0,
      hasUnreadResponses: false,
    },
  },
}

export const ScheduledStatus: Story = {
  args: {
    update: {
      ...baseUpdate,
      distributionStatus: 'scheduled',
      timeAgo: 'Scheduled for 3:00 PM',
      responseCount: 0,
      hasUnreadResponses: false,
    },
  },
}

export const SendingStatus: Story = {
  args: {
    update: {
      ...baseUpdate,
      distributionStatus: 'sending',
      timeAgo: 'Just now',
      responseCount: 0,
      hasUnreadResponses: false,
    },
  },
}

export const FailedStatus: Story = {
  args: {
    update: {
      ...baseUpdate,
      distributionStatus: 'failed',
      timeAgo: '1 hour ago',
      responseCount: 0,
      hasUnreadResponses: false,
    },
  },
}

// Different Children
export const DifferentChild: Story = {
  args: {
    update: {
      ...baseUpdate,
      id: 'update-2',
      child: {
        id: 'child-2',
        name: 'Oliver',
        age: '2 years',
        avatar: undefined,
      },
      contentPreview: 'Oliver said his first full sentence today: "I want more cookies please!" We were so proud...',
      content: 'Oliver said his first full sentence today: "I want more cookies please!" We were so proud of his manners.',
      responseCount: 8,
      hasUnreadResponses: false,
    },
  },
}

export const YoungerChild: Story = {
  args: {
    update: {
      ...baseUpdate,
      id: 'update-3',
      child: {
        id: 'child-3',
        name: 'Sophia',
        age: '3 months',
        avatar: undefined,
      },
      contentPreview: 'Sophia slept through the night for the first time! 8 hours straight from 10 PM to 6 AM...',
      content: 'Sophia slept through the night for the first time! 8 hours straight from 10 PM to 6 AM. We finally got some rest!',
      responseCount: 12,
      hasUnreadResponses: true,
    },
  },
}

// Content Variations
export const ShortContent: Story = {
  args: {
    update: {
      ...baseUpdate,
      contentPreview: 'First smile! 😊',
      content: 'First smile! 😊',
      responseCount: 15,
    },
  },
}

export const LongContent: Story = {
  args: {
    update: {
      ...baseUpdate,
      contentPreview: 'Today was such an amazing day at the park with Emma. She discovered the swings for the first time and absolutely loved them. She kept giggling and asking for "more, more!" every time we tried to stop. Then we went to the playground where she...',
      content: 'Today was such an amazing day at the park with Emma. She discovered the swings for the first time and absolutely loved them. She kept giggling and asking for "more, more!" every time we tried to stop. Then we went to the playground where she climbed up the small slide all by herself. It was incredible to watch her independence growing.',
      responseCount: 7,
    },
  },
}

// Time Variations
export const RecentUpdate: Story = {
  args: {
    update: {
      ...baseUpdate,
      timeAgo: '5 minutes ago',
      hasUnreadResponses: false,
      responseCount: 1,
    },
  },
}

export const OldUpdate: Story = {
  args: {
    update: {
      ...baseUpdate,
      timeAgo: '2 weeks ago',
      hasUnreadResponses: false,
      responseCount: 18,
    },
  },
}

// Card List Example
export const CardList: Story = {
  args: {
    onClick: () => {},
  },
  render: () => (
    <div className="space-y-4 max-w-md">
      <UpdateCard
        update={{
          ...baseUpdate,
          id: 'update-1',
          contentPreview: 'Emma took her first independent steps today! She was so excited...',
          timeAgo: '2 hours ago',
          responseCount: 5,
          hasUnreadResponses: true,
        }}
        onClick={() => {}}
      />
      <UpdateCard
        update={{
          ...baseUpdate,
          id: 'update-2',
          child: {
            id: 'child-2',
            name: 'Oliver',
            age: '2 years',
            avatar: undefined,
          },
          contentPreview: 'Oliver said his first full sentence today: "I want more cookies please!"',
          timeAgo: '5 hours ago',
          responseCount: 8,
          hasUnreadResponses: false,
        }}
        onClick={() => {}}
      />
      <UpdateCard
        update={{
          ...baseUpdate,
          id: 'update-3',
          contentPreview: 'Tummy time fun with new toys. She\'s getting so strong!',
          timeAgo: '1 day ago',
          responseCount: 3,
          hasUnreadResponses: false,
          distributionStatus: 'sent',
        }}
        onClick={() => {}}
      />
      <UpdateCard
        update={{
          ...baseUpdate,
          id: 'update-4',
          contentPreview: 'First solid food attempt - bananas were a hit! 🍌',
          timeAgo: 'Draft',
          responseCount: 0,
          hasUnreadResponses: false,
          distributionStatus: 'draft',
        }}
        onClick={() => {}}
      />
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Multiple update cards in a list format, showing various states and content.',
      },
    },
  },
}

// Real-world Examples
export const MilestoneUpdate: Story = {
  args: {
    update: {
      ...baseUpdate,
      contentPreview: '🎉 First tooth is coming in! Emma has been a bit fussy but we can see the little white spot...',
      content: '🎉 First tooth is coming in! Emma has been a bit fussy but we can see the little white spot on her bottom gum. She\'s been chewing on everything!',
      responseCount: 12,
      hasUnreadResponses: true,
      timeAgo: '1 hour ago',
    },
  },
}

export const DailyActivity: Story = {
  args: {
    update: {
      ...baseUpdate,
      contentPreview: 'Morning routine: breakfast (oatmeal with bananas), playtime, and a good nap. She\'s such a good eater!',
      responseCount: 3,
      hasUnreadResponses: false,
      timeAgo: '3 hours ago',
    },
  },
}

export const PhotShareUpdate: Story = {
  args: {
    update: {
      ...baseUpdate,
      contentPreview: 'Bath time giggles! 🛁 Emma loves splashing in the water. Check out these adorable photos...',
      responseCount: 9,
      hasUnreadResponses: true,
      timeAgo: '30 minutes ago',
    },
  },
}

// Accessibility Focus
export const AccessibilityExample: Story = {
  args: {
    update: baseUpdate,
  },
  parameters: {
    docs: {
      description: {
        story: 'This card demonstrates proper accessibility features including keyboard navigation, ARIA labels, and screen reader support. Try tabbing to the card and pressing Enter or Space.',
      },
    },
    a11y: {
      config: {
        rules: [
          {
            id: 'color-contrast',
            enabled: true,
          },
          {
            id: 'keyboard-navigation',
            enabled: true,
          },
        ],
      },
    },
  },
}

// Hover and Interactive States
export const InteractiveStates: Story = {
  args: {
    onClick: () => {},
  },
  render: () => (
    <div className="space-y-8 max-w-md">
      <div>
        <h3 className="text-sm font-medium text-gray-700 mb-2">Normal State</h3>
        <UpdateCard update={baseUpdate} onClick={() => {}} />
      </div>

      <div>
        <h3 className="text-sm font-medium text-gray-700 mb-2">Hover State (hover over card)</h3>
        <UpdateCard
          update={baseUpdate}
          onClick={() => {}}
          className="hover:shadow-md hover:border-gray-300 hover:bg-gray-50"
        />
      </div>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Different visual states of the update card during user interaction.',
      },
    },
  },
}